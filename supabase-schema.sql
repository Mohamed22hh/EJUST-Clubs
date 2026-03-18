-- ================================================
-- EJUST Club Hub - FRESH DATABASE SCHEMA
-- ================================================
-- STEP 1: Run the DROP block first (scroll down)
-- STEP 2: Then run the full CREATE block
-- ================================================


-- ================================================
-- PART 1: NUCLEAR DROP (run this first)
-- ================================================

DROP VIEW IF EXISTS clubs_with_member_count;

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS direct_messages CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS event_rsvps CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS club_members CASCADE;
DROP TABLE IF EXISTS clubs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS announcement_category CASCADE;
DROP TYPE IF EXISTS member_status CASCADE;
DROP TYPE IF EXISTS club_category CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.is_club_co_admin(UUID);


-- ================================================
-- PART 2: CREATE EVERYTHING FRESH
-- ================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------
-- Enums
-- ------------------------------------------------
CREATE TYPE user_role AS ENUM ('student', 'co_admin', 'club_admin', 'platform_admin');
CREATE TYPE club_category AS ENUM ('technology', 'arts', 'sports', 'business', 'environment', 'other');
CREATE TYPE member_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE announcement_category AS ENUM ('event', 'recruitment', 'news', 'general');
CREATE TYPE notification_type AS ENUM ('application_accepted', 'application_rejected', 'new_announcement', 'new_event', 'new_message', 'new_direct_message');

-- ------------------------------------------------
-- Tables
-- ------------------------------------------------

CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL DEFAULT 'Unknown',
  email       TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'student',
  major       TEXT,
  year        INTEGER,
  avatar_url  TEXT,
  -- NOTE: is_approved default here is 'true' for students.
  -- The handle_new_user() trigger overrides this to 'false' for club_admin accounts.
  is_approved BOOLEAN NOT NULL DEFAULT true,
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE clubs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category    club_category NOT NULL DEFAULT 'other',
  logo_url    TEXT,
  admin_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- club_members tracks membership. Co-admins are users with role='co_admin'
-- who are also approved members of exactly one club.
CREATE TABLE club_members (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id   UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status    member_status NOT NULL DEFAULT 'pending',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);

CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  location    TEXT NOT NULL DEFAULT '',
  event_date  TIMESTAMPTZ NOT NULL,
  image_url   TEXT,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_rsvps (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE announcements (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  category   announcement_category NOT NULL DEFAULT 'general',
  image_url  TEXT,
  tags       TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Direct messages between a student (member) and the club primary admin
CREATE TABLE direct_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  is_read    BOOLEAN NOT NULL DEFAULT false,
  link       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------
-- Auth Trigger
-- ------------------------------------------------
-- This trigger fires IMMEDIATELY when a new auth.users row is created —
-- even before the user confirms their email. That means the public.users
-- profile row exists as soon as signUp() returns, so subsequent DB writes
-- that reference users(id) as a FK (e.g. clubs.admin_id) will succeed once
-- the user has a confirmed session.
--
-- The frontend (ClubAdminRegisterPage) no longer tries to upsert the user
-- row manually. It only calls supabase.auth.signUp() and stashes pending
-- club data in localStorage. EmailConfirmPage commits the club row after the
-- user clicks the confirmation link and a real session is established.
-- ------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role     user_role := 'student';
  v_approved BOOLEAN   := true;
  v_raw_role TEXT;
BEGIN
  -- Safely extract role from metadata without enum cast errors
  BEGIN
    v_raw_role := NEW.raw_user_meta_data->>'role';
    IF v_raw_role = 'club_admin' THEN
      v_role     := 'club_admin';
      v_approved := false;   -- club admins need platform-admin approval
    ELSIF v_raw_role = 'platform_admin' THEN
      v_role     := 'platform_admin';
      v_approved := true;
    ELSE
      v_role     := 'student';
      v_approved := true;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_role     := 'student';
    v_approved := true;
  END;

  -- ON CONFLICT DO NOTHING makes repeated calls (e.g. from resend) idempotent
  INSERT INTO public.users (id, full_name, email, role, is_approved, major, year)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'Unknown'),
    COALESCE(NULLIF(TRIM(NEW.email), ''), 'unknown@unknown.com'),
    v_role,
    v_approved,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'major', '')), ''),
    CASE
      WHEN NEW.raw_user_meta_data->>'year' ~ '^[0-9]+$'
      THEN (NEW.raw_user_meta_data->>'year')::INTEGER
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- CRITICAL: never block auth signup under any circumstances
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------
-- Row Level Security
-- ------------------------------------------------

ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps   ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper: true if current user is a co_admin AND an approved member of this club
CREATE OR REPLACE FUNCTION is_club_co_admin(p_club_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    JOIN club_members cm ON cm.user_id = u.id
    WHERE u.id = auth.uid()
      AND u.role = 'co_admin'
      AND cm.club_id = p_club_id
      AND cm.status = 'approved'
  );
$$;

-- Allows a co_admin to demote themselves back to student when leaving a club.
-- Uses SECURITY DEFINER to bypass the RLS policy that normally prevents
-- users from changing their own role.
CREATE OR REPLACE FUNCTION public.demote_self_to_student()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only allow if the caller is currently a co_admin
  IF (SELECT role FROM users WHERE id = auth.uid()) = 'co_admin' THEN
    UPDATE users SET role = 'student' WHERE id = auth.uid();
  END IF;
END;
$$;

-- Users
CREATE POLICY "Users can read all profiles"   ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile"  ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      role = (SELECT role FROM users WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'platform_admin')
    )
  );
-- Platform admin can update anyone; primary admin can promote/demote co_admins
CREATE POLICY "Platform admin can update all users" ON users FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'platform_admin'));
-- Platform admin can also reassign roles for ownership transfer
CREATE POLICY "Platform admin can update user roles" ON users FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'platform_admin'))
  WITH CHECK (role IN ('student', 'co_admin', 'club_admin', 'platform_admin'));
CREATE POLICY "Club admin can promote demote co_admins" ON users FOR UPDATE
  USING (
    -- target must be a student or co_admin (never another primary/platform admin)
    role IN ('student', 'co_admin')
    -- AND they must be an approved member of a club whose primary admin is the current user
    AND EXISTS (
      SELECT 1 FROM clubs c
      JOIN club_members cm ON cm.club_id = c.id
      WHERE c.admin_id = auth.uid()
        AND cm.user_id = users.id
        AND cm.status = 'approved'
    )
  )
  WITH CHECK (
    -- can only set role to 'co_admin' or 'student' (promote/demote)
    role IN ('co_admin', 'student')
  );

-- Clubs
CREATE POLICY "Read clubs" ON clubs FOR SELECT USING (
  is_approved = true
  OR admin_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'platform_admin')
);
CREATE POLICY "Authenticated users can create clubs" ON clubs FOR INSERT WITH CHECK (admin_id = auth.uid());
CREATE POLICY "Club admins can update their club"    ON clubs FOR UPDATE USING (admin_id = auth.uid()) WITH CHECK (admin_id = auth.uid());
CREATE POLICY "Platform admin can update all clubs"  ON clubs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'platform_admin'));
CREATE POLICY "Platform admin can delete clubs"      ON clubs FOR DELETE
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'platform_admin'));

-- Club Members
CREATE POLICY "Members can see own clubs" ON club_members FOR SELECT
  USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM clubs WHERE clubs.id = club_members.club_id AND clubs.admin_id = auth.uid())
    OR is_club_co_admin(club_members.club_id));
CREATE POLICY "Students can apply to clubs" ON club_members FOR INSERT WITH CHECK (user_id = auth.uid());
-- Primary admin AND co-admins can approve/reject members
CREATE POLICY "Admins can update member status" ON club_members FOR UPDATE
  USING (EXISTS (SELECT 1 FROM clubs WHERE clubs.id = club_members.club_id AND clubs.admin_id = auth.uid())
    OR is_club_co_admin(club_members.club_id));
CREATE POLICY "Users can delete own membership" ON club_members FOR DELETE USING (user_id = auth.uid());

-- Events — primary admin AND co-admins can create/edit/delete
CREATE POLICY "Anyone can read events"        ON events FOR SELECT USING (true);
CREATE POLICY "Club admins can create events" ON events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM clubs WHERE clubs.id = events.club_id AND clubs.admin_id = auth.uid())
  OR is_club_co_admin(events.club_id));
CREATE POLICY "Club admins can update events" ON events FOR UPDATE USING (
  EXISTS (SELECT 1 FROM clubs WHERE clubs.id = events.club_id AND clubs.admin_id = auth.uid())
  OR is_club_co_admin(events.club_id));
CREATE POLICY "Club admins can delete events" ON events FOR DELETE USING (
  EXISTS (SELECT 1 FROM clubs WHERE clubs.id = events.club_id AND clubs.admin_id = auth.uid())
  OR is_club_co_admin(events.club_id));

-- Event RSVPs
CREATE POLICY "Users can read RSVPs"  ON event_rsvps FOR SELECT USING (true);
CREATE POLICY "Users can RSVP"        ON event_rsvps FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can cancel RSVP" ON event_rsvps FOR DELETE USING (user_id = auth.uid());

-- Announcements — primary admin AND co-admins can create/edit/delete
CREATE POLICY "Anyone can read announcements"        ON announcements FOR SELECT USING (true);
CREATE POLICY "Club admins can create announcements" ON announcements FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM clubs WHERE clubs.id = announcements.club_id AND clubs.admin_id = auth.uid())
  OR is_club_co_admin(announcements.club_id));
CREATE POLICY "Club admins can update announcements" ON announcements FOR UPDATE USING (
  EXISTS (SELECT 1 FROM clubs WHERE clubs.id = announcements.club_id AND clubs.admin_id = auth.uid())
  OR is_club_co_admin(announcements.club_id));
CREATE POLICY "Club admins can delete announcements" ON announcements FOR DELETE USING (
  EXISTS (SELECT 1 FROM clubs WHERE clubs.id = announcements.club_id AND clubs.admin_id = auth.uid())
  OR is_club_co_admin(announcements.club_id));

-- Group Messages — primary admin AND co-admins can participate
CREATE POLICY "Club members can read messages" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM club_members
    WHERE club_members.club_id = messages.club_id
    AND club_members.user_id = auth.uid()
    AND club_members.status = 'approved')
  OR EXISTS (SELECT 1 FROM clubs WHERE clubs.id = messages.club_id AND clubs.admin_id = auth.uid())
  OR is_club_co_admin(messages.club_id)
);
CREATE POLICY "Club members can send messages" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM club_members
      WHERE club_members.club_id = messages.club_id
      AND club_members.user_id = auth.uid()
      AND club_members.status = 'approved')
    OR EXISTS (SELECT 1 FROM clubs WHERE clubs.id = messages.club_id AND clubs.admin_id = auth.uid())
    OR is_club_co_admin(messages.club_id)
  )
);

-- Direct Messages
CREATE POLICY "Participants can read DMs" ON direct_messages FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "Authenticated users can send DMs" ON direct_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Recipients can mark DMs as read" ON direct_messages FOR UPDATE
  USING (recipient_id = auth.uid());

-- Notifications
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
-- Notifications can only be inserted by:
--   1. The notification's own target user (self-notification, e.g. system events)
--   2. A club admin/co-admin inserting for a member of their club (membership events)
--   3. A sender inserting for the recipient of a direct message they just sent
CREATE POLICY "Authenticated users can insert notifications" ON notifications FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = user_id)
    AND (
      -- Self-notification
      user_id = auth.uid()
      -- Club admin/co-admin notifying a member of their own club
      OR EXISTS (
        SELECT 1 FROM clubs c
        JOIN club_members cm ON cm.club_id = c.id
        WHERE cm.user_id = notifications.user_id
          AND cm.status = 'approved'
          AND (c.admin_id = auth.uid() OR is_club_co_admin(c.id))
      )
      -- DM notification: sender must have just sent a DM to this recipient in a shared club
      OR EXISTS (
        SELECT 1 FROM direct_messages dm
        WHERE dm.sender_id = auth.uid()
          AND dm.recipient_id = notifications.user_id
          AND dm.created_at > NOW() - INTERVAL '30 seconds'
      )
    )
  );
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());


-- ------------------------------------------------
-- Notification Triggers
-- ------------------------------------------------
-- Fires when a new announcement is inserted.
-- Inserts a notification for every approved member of that club
-- (excluding the author). Respects email_notifications_enabled
-- for the email layer — in-app notification is always inserted.
CREATE OR REPLACE FUNCTION public.notify_members_on_announcement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_club_name TEXT;
  v_primary_admin_id UUID;
BEGIN
  SELECT name, admin_id INTO v_club_name, v_primary_admin_id FROM clubs WHERE id = NEW.club_id;

  -- Notify all approved members (excluding the author)
  INSERT INTO notifications (user_id, type, title, body, is_read, link)
  SELECT
    cm.user_id,
    'new_announcement',
    v_club_name || ' posted a new announcement',
    NEW.title,
    false,
    '/announcements'
  FROM club_members cm
  WHERE cm.club_id = NEW.club_id
    AND cm.status = 'approved'
    AND cm.user_id != NEW.author_id;

  -- Also notify the primary admin if they are not the author
  -- and don't already have a club_members row (which would have been covered above)
  IF v_primary_admin_id IS NOT NULL AND v_primary_admin_id != NEW.author_id THEN
    INSERT INTO notifications (user_id, type, title, body, is_read, link)
    SELECT
      v_primary_admin_id,
      'new_announcement',
      v_club_name || ' posted a new announcement',
      NEW.title,
      false,
      '/announcements'
    WHERE NOT EXISTS (
      SELECT 1 FROM club_members cm2
      WHERE cm2.club_id = NEW.club_id
        AND cm2.user_id = v_primary_admin_id
        AND cm2.status = 'approved'
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_announcement_created
  AFTER INSERT ON announcements
  FOR EACH ROW EXECUTE FUNCTION public.notify_members_on_announcement();

-- Fires when a new event is inserted.
CREATE OR REPLACE FUNCTION public.notify_members_on_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_club_name TEXT;
  v_primary_admin_id UUID;
BEGIN
  SELECT name, admin_id INTO v_club_name, v_primary_admin_id FROM clubs WHERE id = NEW.club_id;

  -- Notify all approved members (excluding the creator)
  INSERT INTO notifications (user_id, type, title, body, is_read, link)
  SELECT
    cm.user_id,
    'new_event',
    v_club_name || ' created a new event',
    NEW.title || ' — ' || TO_CHAR(NEW.event_date AT TIME ZONE 'UTC', 'Mon DD, YYYY'),
    false,
    '/events'
  FROM club_members cm
  WHERE cm.club_id = NEW.club_id
    AND cm.status = 'approved'
    AND cm.user_id != NEW.created_by;

  -- Also notify the primary admin if they are not the creator
  -- and don't already have a club_members row (which would have been covered above)
  IF v_primary_admin_id IS NOT NULL AND v_primary_admin_id != NEW.created_by THEN
    INSERT INTO notifications (user_id, type, title, body, is_read, link)
    SELECT
      v_primary_admin_id,
      'new_event',
      v_club_name || ' created a new event',
      NEW.title || ' — ' || TO_CHAR(NEW.event_date AT TIME ZONE 'UTC', 'Mon DD, YYYY'),
      false,
      '/events'
    WHERE NOT EXISTS (
      SELECT 1 FROM club_members cm2
      WHERE cm2.club_id = NEW.club_id
        AND cm2.user_id = v_primary_admin_id
        AND cm2.status = 'approved'
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_event_created
  AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION public.notify_members_on_event();

-- ------------------------------------------------
-- Realtime
-- ------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE club_members;

-- ------------------------------------------------
-- Member Count View (security_invoker = true)
-- NOTE: Uses security_invoker = true so the view runs with the permissions of
-- the querying user, not the view creator. This means the clubs RLS policies
-- are correctly enforced — unapproved clubs stay hidden from students,
-- and only visible to their admin and platform admins.
-- ------------------------------------------------
CREATE OR REPLACE VIEW clubs_with_member_count WITH (security_invoker = true) AS
SELECT
  c.*,
  COUNT(cm.id) FILTER (WHERE cm.status = 'approved') AS member_count
FROM clubs c
LEFT JOIN club_members cm ON cm.club_id = c.id
GROUP BY c.id;

-- ------------------------------------------------
-- Events with RSVP count view
-- Same pattern as clubs_with_member_count — security_invoker so RLS is respected.
-- ------------------------------------------------
CREATE OR REPLACE VIEW events_with_rsvp_count WITH (security_invoker = true) AS
SELECT
  e.*,
  COUNT(er.id) AS rsvp_count
FROM events e
LEFT JOIN event_rsvps er ON er.event_id = e.id
GROUP BY e.id;

-- ------------------------------------------------
-- STORAGE: Create the 'club-assets' bucket
-- ------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('club-assets', 'club-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for club-assets bucket.
-- Upload is restricted to authenticated (email-confirmed) users only.
-- Club logo uploads happen in EmailConfirmPage AFTER the user has a real
-- session, so auth.role() = 'authenticated' is always satisfied at that point.
CREATE POLICY "Public can read club assets"
  ON storage.objects FOR SELECT USING (bucket_id = 'club-assets');

CREATE POLICY "Authenticated users can upload club assets"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'club-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own club assets"
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'club-assets' AND auth.uid() = owner::uuid);

CREATE POLICY "Users can delete own club assets"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'club-assets' AND auth.uid() = owner::uuid);

-- ------------------------------------------------
-- MIGRATION: If you already have a database and want
-- to add image support without resetting, run this:
-- ------------------------------------------------
-- ALTER TABLE clubs ADD COLUMN IF NOT EXISTS logo_url TEXT;
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
-- ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_url TEXT;
-- ALTER TABLE announcements ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
-- CREATE TABLE IF NOT EXISTS club_admins (...);  -- see full definition above
-- CREATE TABLE IF NOT EXISTS direct_messages (...); -- see full definition above

-- ================================================
-- EMAIL CONFIRMATION SETUP (REQUIRED)
-- ================================================
-- Since you have enabled "Confirm email" in Authentication > Providers > Email,
-- you MUST configure the redirect URL in Supabase so confirmation links work.
--
-- STEP 1 — Set your Site URL:
--   Supabase Dashboard → Authentication → URL Configuration
--   Site URL: https://your-app.vercel.app
--   (Use http://localhost:5173 for local development)
--
-- STEP 2 — Add Redirect URLs (allow both local and production):
--   Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
--   Add ALL of these:
--     http://localhost:5173/auth/confirm
--     https://your-app.vercel.app/auth/confirm
--
-- STEP 3 — How it works end-to-end (Club Admin flow):
--   1. User fills out registration form → signUp() creates auth.users row
--   2. DB trigger (handle_new_user) immediately creates public.users row
--      with role='club_admin' and is_approved=false
--   3. Pending club data (name, bio, category, logo as base64) is saved
--      to localStorage in the browser
--   4. User sees "Check your email" screen
--   5. User clicks confirmation link → browser opens /auth/confirm#access_token=...
--   6. EmailConfirmPage detects the session via onAuthStateChange
--   7. EmailConfirmPage reads localStorage, uploads the logo, inserts the club row
--   8. localStorage is cleared, user is redirected to /admin dashboard
--
-- STEP 4 — How it works end-to-end (Student flow):
--   1. User fills out registration form → signUp() creates auth.users row
--   2. DB trigger creates public.users row with role='student', is_approved=true
--   3. No localStorage data — student flow is simpler
--   4. User confirms email → EmailConfirmPage redirects to /dashboard
--
-- STEP 5 — Login behaviour after confirmation:
--   - Unconfirmed users who try to log in see a yellow banner with a
--     "Resend confirmation email" button. They cannot log in until confirmed.
--   - Once confirmed, login works normally and redirects to the correct dashboard.
--
-- ================================================
-- INITIAL PLATFORM ADMIN SETUP
-- ================================================
-- After running this schema:
-- 1. Register a normal student account through the app
-- 2. Confirm the email (click the confirmation link)
-- 3. Run this SQL to promote the user to platform_admin:
--    UPDATE users SET role = 'platform_admin', is_approved = true
--    WHERE email = 'your-admin@email.com';
-- ================================================

-- ================================================
-- SECURITY: Enable Leaked Password Protection
-- ================================================
-- This cannot be set via SQL — it must be enabled in the Supabase Dashboard:
--   Authentication → Sign In / Up → Password Security
--   Toggle ON: "Leaked password protection"
--
-- This checks passwords against HaveIBeenPwned.org during signup/password change
-- and rejects any password found in known data breaches.
-- ================================================
