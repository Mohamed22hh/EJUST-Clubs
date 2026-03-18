import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const APP_URL = Deno.env.get('APP_URL') ?? 'https://ejust-clubs.vercel.app'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')! // auto-provided by Supabase
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const payload = await req.json()

    // Supabase DB webhook payload structure:
    // { type: "INSERT", table: "notifications", schema: "public", record: {...}, old_record: null }
    const record = payload.record ?? payload

    if (!record || !record.type) {
      console.error('Invalid payload:', JSON.stringify(payload))
      return new Response('Invalid payload', { status: 400 })
    }

    // Only handle announcement and event notifications
    if (record.type !== 'new_announcement' && record.type !== 'new_event') {
      return new Response('Not a notification type we handle', { status: 200 })
    }

    if (!record.user_id) {
      return new Response('No user_id in record', { status: 400 })
    }

    // Use service role to bypass RLS and read user email + preferences
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: user, error } = await supabase
      .from('users')
      .select('email, full_name, email_notifications_enabled')
      .eq('id', record.user_id)
      .single()

    if (error || !user) {
      console.error('User not found:', error)
      return new Response('User not found', { status: 200 })
    }

    // Respect opt-out
    if (!user.email_notifications_enabled) {
      return new Response('User opted out', { status: 200 })
    }

    const isAnnouncement = record.type === 'new_announcement'
    const subject = record.title
    const linkLabel = isAnnouncement ? 'View Announcement' : 'View Event'
    const linkUrl = `${APP_URL}${record.link ?? (isAnnouncement ? '/announcements' : '/events')}`
    const emoji = isAnnouncement ? '📢' : '📅'

    const html = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #0a0a0a;">
        <div style="margin-bottom: 24px;">
          <span style="font-size: 28px;">${emoji}</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">${record.title}</h2>
        <p style="font-size: 15px; color: #555; margin: 0 0 24px; line-height: 1.6;">${record.body}</p>
        <a href="${linkUrl}"
          style="display: inline-block; background: #C0121F; color: white; text-decoration: none;
                 padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          ${linkLabel}
        </a>
        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e8e8e8;" />
        <p style="font-size: 12px; color: #ababab; margin: 0;">
          You're receiving this because you're a member of a club on E-JUST Club Hub.<br/>
          To stop receiving emails, update your notification preferences in the app.
        </p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'E-JUST Club Hub <onboarding@resend.dev>',
        to: user.email,
        subject: `${emoji} ${subject}`,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return new Response('Email failed', { status: 500 })
    }

    console.log(`Email sent to ${user.email} for ${record.type}`)
    return new Response('Email sent', { status: 200 })

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response('Internal error', { status: 500 })
  }
})
