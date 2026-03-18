import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { PENDING_CLUB_KEY, PendingClubData } from './ClubAdminRegisterPage'

/**
 * Landing page after a user clicks the email confirmation link.
 *
 * Supabase appends #access_token=...&type=signup to the redirect URL.
 * The Supabase JS client detects this hash automatically and fires
 * onAuthStateChange with event = 'SIGNED_IN'.
 *
 * For club admin registrations, this page also commits the pending club
 * data that was stashed in localStorage during registration. This is
 * necessary because:
 *   1. RLS blocks DB writes for unconfirmed users (auth.uid() is null)
 *   2. Storage uploads require an active authenticated session
 *   3. The clubs table has a FK on admin_id → users(id), so the user
 *      row must exist (created by the DB trigger) before inserting the club
 *
 * Flow:
 *   1. User registers → signUp() sends confirmation email + trigger creates user row
 *   2. Pending club data saved to localStorage
 *   3. User clicks link in email → browser opens /auth/confirm#access_token=...
 *   4. Supabase client reads hash, establishes a real session
 *   5. onAuthStateChange fires with 'SIGNED_IN'
 *   6. This page uploads the logo + inserts the club row (now authenticated)
 *   7. User is routed to their dashboard
 */
export default function EmailConfirmPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [statusMsg, setStatusMsg] = useState('Verifying your email…')
  const [errorMsg, setErrorMsg] = useState('')

  /**
   * Commit the pending club application that was stashed in localStorage.
   * Called only after a confirmed session is established.
   */
  const commitPendingClub = async (userId: string): Promise<void> => {
    const raw = localStorage.getItem(PENDING_CLUB_KEY)
    if (!raw) return // not a club admin registration, nothing to do

    let pending: PendingClubData
    try {
      pending = JSON.parse(raw) as PendingClubData
    } catch {
      localStorage.removeItem(PENDING_CLUB_KEY)
      return
    }

    // Security: reject if the payload belongs to a different user or is older than 1 hour
    const ONE_HOUR_MS = 60 * 60 * 1000
    if (pending.user_id && pending.user_id !== userId) {
      console.warn('Pending club payload user_id mismatch — discarding')
      localStorage.removeItem(PENDING_CLUB_KEY)
      return
    }
    if (pending.created_at && Date.now() - pending.created_at > ONE_HOUR_MS) {
      console.warn('Pending club payload expired — discarding')
      localStorage.removeItem(PENDING_CLUB_KEY)
      setStatus('error')
      setErrorMsg('Your registration session expired. Please register again.')
      return
    }

    setStatusMsg('Uploading club logo…')

    // Convert base64 data URL back to a File for upload
    const res = await fetch(pending.logo_data_url)
    const blob = await res.blob()
    const ext = pending.logo_filename.split('.').pop() ?? 'png'
    const logoFile = new File([blob], pending.logo_filename, { type: blob.type })

    const logoPath = `club-logos/${userId}-${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('club-assets')
      .upload(logoPath, logoFile, { upsert: true })

    if (uploadErr) {
      // Non-fatal: club can be created without a logo
      console.warn('Logo upload failed:', uploadErr.message)
    }

    const logoUrl = uploadErr
      ? null
      : supabase.storage.from('club-assets').getPublicUrl(logoPath).data.publicUrl

    setStatusMsg('Saving club application…')

    const { error: clubErr } = await supabase.from('clubs').insert({
      name: pending.club_name,
      description: pending.bio,
      category: pending.category,
      logo_url: logoUrl,
      admin_id: userId,
      is_approved: false,
    })

    // Clean up regardless of outcome
    localStorage.removeItem(PENDING_CLUB_KEY)

    if (clubErr) {
      // Fatal: the user would land on a broken admin dashboard with no club
      throw new Error(`Failed to save club application: ${clubErr.message}`)
    }
  }

  const redirectByRole = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()
    const role = data?.role
    if (role === 'platform_admin') navigate('/platform-admin', { replace: true })
    else if (role === 'club_admin' || role === 'co_admin') navigate('/admin', { replace: true })
    else navigate('/dashboard', { replace: true })
  }

  const handleConfirmedSession = async (userId: string) => {
    setStatus('success')
    setStatusMsg('Setting up your account…')
    try {
      await commitPendingClub(userId)
    } catch (err) {
      setStatus('error')
      setErrorMsg(
        'Your email was confirmed, but we could not save your club application. ' +
        'Please contact support or try registering your club again after signing in.'
      )
      return
    }
    setStatusMsg('All done! Redirecting…')
    setTimeout(() => { redirectByRole(userId) }, 1200)
  }

  useEffect(() => {
    let handled = false

    // Listen for the SIGNED_IN event Supabase fires when it reads the
    // #access_token hash from the confirmation link URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (handled) return
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        handled = true
        handleConfirmedSession(session.user.id)
      }
    })

    // Also handle if a session already exists (user already confirmed in same tab)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (handled) return
      if (session?.user) {
        handled = true
        handleConfirmedSession(session.user.id)
      }
    })

    // Safety timeout — if after 10s there's still no session the link expired
    const timeout = setTimeout(() => {
      if (!handled) {
        setStatus('error')
        setErrorMsg(
          'The confirmation link may have expired or already been used. ' +
          'Please try signing in, or request a new confirmation email from the login page.'
        )
      }
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md text-center fade-up">

        {status === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-[rgba(192,18,31,0.1)] flex items-center justify-center mx-auto mb-6">
              <span className="h-7 w-7 border-2 border-[#C0121F]/30 border-t-[#C0121F] rounded-full animate-spin block" />
            </div>
            <h2 className="font-serif text-2xl text-[#0a0a0a] dark:text-[#f0f0f0] mb-2">Verifying your email…</h2>
            <p className="text-sm text-[#ababab]">Please wait while we confirm your account.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={28} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="font-serif text-2xl text-[#0a0a0a] dark:text-[#f0f0f0] mb-2">Email confirmed!</h2>
            <p className="text-sm text-[#ababab]">{statusMsg}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6">
              <XCircle size={28} className="text-[#C0121F]" />
            </div>
            <h2 className="font-serif text-2xl text-[#0a0a0a] dark:text-[#f0f0f0] mb-2">Verification failed</h2>
            <p className="text-sm text-[#6b6b6b] dark:text-[#909090] mb-8 leading-relaxed max-w-sm mx-auto">
              {errorMsg}
            </p>
            <div className="space-y-3">
              <a
                href="/login"
                className="btn-primary w-full justify-center"
                style={{ borderRadius: '0.75rem', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                Go to Sign In
              </a>
              <a
                href="/register"
                className="btn-ghost w-full justify-center"
                style={{ borderRadius: '0.75rem', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                Create a new account
              </a>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
