export type UserRole = 'student' | 'co_admin' | 'club_admin' | 'platform_admin'
export type ClubCategory = 'technology' | 'arts' | 'sports' | 'business' | 'environment' | 'other'
export type MemberStatus = 'pending' | 'approved' | 'rejected'
export type AnnouncementCategory = 'event' | 'recruitment' | 'news' | 'general'
export type NotificationType = 'application_accepted' | 'application_rejected' | 'new_announcement' | 'new_event' | 'new_message' | 'new_direct_message'

export interface User {
  id: string
  full_name: string
  email: string
  role: UserRole
  major?: string
  year?: number
  avatar_url?: string
  is_approved: boolean
  email_notifications_enabled: boolean
  created_at: string
}

export interface Club {
  id: string
  name: string
  description: string
  category: ClubCategory
  logo_url?: string
  admin_id: string
  is_approved: boolean
  member_count?: number
  created_at: string
}

export interface ClubMember {
  id: string
  club_id: string
  user_id: string
  status: MemberStatus
  joined_at: string
  // Joined relations — typed so we don't need `as any` everywhere
  club?: Club
  user?: Pick<User, 'id' | 'full_name' | 'email' | 'major' | 'avatar_url' | 'role'>
}

export interface Event {
  id: string
  club_id: string
  title: string
  description: string
  location: string
  event_date: string
  image_url?: string
  tags: string[]
  created_by: string
  created_at: string
  rsvp_count?: number
  user_rsvpd?: boolean
  // Joined relation
  club?: Pick<Club, 'id' | 'name' | 'logo_url'>
  author?: Pick<User, 'id' | 'full_name' | 'avatar_url' | 'major'>
}

export interface Announcement {
  id: string
  club_id: string
  author_id: string
  title: string
  body: string
  category: AnnouncementCategory
  image_url?: string
  tags: string[]
  created_at: string
  // Joined relations
  club?: Pick<Club, 'id' | 'name' | 'logo_url'>
  author?: Pick<User, 'id' | 'full_name' | 'avatar_url' | 'major'>
}

export interface Message {
  id: string
  club_id: string
  sender_id: string
  body: string
  created_at: string
  // Joined relation
  sender?: Pick<User, 'id' | 'full_name'>
}

export interface DirectMessage {
  id: string
  club_id: string
  sender_id: string
  recipient_id: string
  body: string
  is_read: boolean
  created_at: string
  sender?: Pick<User, 'id' | 'full_name'>
  recipient?: Pick<User, 'id' | 'full_name'>
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  is_read: boolean
  link?: string
  created_at: string
}

// A DM conversation thread between the current user and one other person in a club context
export interface DMThread {
  club_id: string
  club: Pick<Club, 'id' | 'name' | 'logo_url'>
  other_user: Pick<User, 'id' | 'full_name'>
  last_message: string
  last_at: string
  unread_count: number
}
