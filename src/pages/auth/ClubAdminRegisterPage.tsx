import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { useImageUpload } from '../../hooks/useImageUpload'
import ImageUploadField from '../../components/shared/ImageUploadField'

const categories = ['technology', 'arts', 'sports', 'business', 'environment', 'other']

// Key used to stash pending club data in localStorage so it survives the
// email-confirmation redirect and can be committed in EmailConfirmPage.
export const PENDING_CLUB_KEY = 'ejust_pending_club'

export interface PendingClubData {
  club_name: string
  bio: string
  category: string
  logo_data_url: string   // base64 so it survives page unload
  logo_filename: string
  // Security fields added to prevent tampered payloads
  user_id: string         // bound to the auth user that created this entry
  created_at: number      // unix ms — entries older than 1 hour are rejected
}

export default function ClubAdminRegisterPage() {
  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    club_name: '', bio: '', category: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [resending, setResending] = useState(false)
  const { toast } = useToast()
  const logoUpload = useImageUpload({ maxSizeMB: 2 })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.email.endsWith('@ejust.edu.eg')) { toast('Please use your @ejust.edu.eg university email', 'error'); return }
    if (!form.category) { toast('Please select a club category', 'error'); return }
    if (!logoUpload.file) { toast('Please upload a club logo image', 'error'); return }
    if (form.password.length < 8) { toast('Password must be at least 8 characters', 'error'); return }
    setLoading(true)

    // ── Step 1: Convert logo to base64 so it can survive the email redirect ──
    const logoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read logo file'))
      reader.readAsDataURL(logoUpload.file!)
    }).catch(() => null)

    if (!logoDataUrl) {
      toast('Failed to read logo image. Please try again.', 'error')
      setLoading(false)
      return
    }

    // ── Step 2: Sign up — pass ALL profile fields via metadata so the DB
    //    trigger (handle_new_user) can create the users row immediately with
    //    the correct role. We never touch the DB here directly because the
    //    user is unconfirmed and RLS will block any auth.uid()-based write. ──
    const { error, data } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, role: 'club_admin' },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    if (error) {
      if (error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('already exists')) {
        toast('An account with this email already exists. Please sign in.', 'error')
      } else {
        toast(error.message, 'error')
      }
      setLoading(false)
      return
    }

    // ── Step 3: Stash pending club data in localStorage so EmailConfirmPage
    //    can pick it up after the user clicks the confirmation link and a real
    //    authenticated session is established. ──
    if (data.user) {
      const pending: PendingClubData = {
        club_name: form.club_name,
        bio: form.bio,
        category: form.category,
        logo_data_url: logoDataUrl,
        logo_filename: logoUpload.file!.name,
        user_id: data.user.id,
        created_at: Date.now(),
      }
      localStorage.setItem(PENDING_CLUB_KEY, JSON.stringify(pending))
    }

    setLoading(false)
    setSubmitted(true)
  }

  const handleResend = async () => {
    setResending(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: form.email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    })
    if (error) toast(error.message, 'error')
    else toast('Confirmation email resent!', 'success')
    setResending(false)
  }

  // ── Submitted screen ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] px-4">
        <div className="w-full max-w-md fade-up text-center">
          <div className="w-16 h-16 rounded-2xl bg-[rgba(192,18,31,0.1)] flex items-center justify-center mx-auto mb-6">
            <Mail size={28} className="text-[#C0121F]" />
          </div>
          <h2 className="font-serif text-3xl text-[#0a0a0a] dark:text-[#f0f0f0] mb-2">Application submitted!</h2>
          <p className="text-[#6b6b6b] dark:text-[#909090] mb-2">We sent a confirmation link to</p>
          <p className="font-semibold text-[#0a0a0a] dark:text-[#f0f0f0] mb-4">{form.email}</p>
          <div className="text-sm text-[#ababab] mb-8 leading-relaxed space-y-2">
            <p>
              <span className="font-semibold text-[#0a0a0a] dark:text-[#f0f0f0]">Step 1:</span> Click the link in your email to verify your account.
            </p>
            <p>
              <span className="font-semibold text-[#0a0a0a] dark:text-[#f0f0f0]">Step 2:</span> A platform admin will review your club application.
            </p>
            <p>
              <span className="font-semibold text-[#0a0a0a] dark:text-[#f0f0f0]">Step 3:</span> Once approved, you'll be able to manage your club.
            </p>
          </div>
          <div className="space-y-3">
            <button onClick={handleResend} disabled={resending}
              className="btn-ghost w-full justify-center"
              style={{ borderRadius: '0.75rem', padding: '0.75rem' }}>
              {resending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Resending...
                </span>
              ) : 'Resend confirmation email'}
            </button>
            <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-[#ababab] hover:text-[#C0121F] transition-colors">
              ← Back to sign in
            </Link>
          </div>
          <p className="text-xs text-[#ababab] mt-6">Can't find the email? Check your spam folder.</p>
        </div>
      </div>
    )
  }

  // ── Registration form ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img src="/campus.jpg" alt="E-JUST Campus" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#0f0f0f]/60 flex flex-col items-center justify-center p-12 text-center">
          <img src="/logo.png" alt="E-JUST" className="h-16 w-16 object-contain mb-6 rounded-2xl shadow-xl" />
          <h1 className="font-serif text-4xl text-white mb-3">Start a Club</h1>
          <p className="text-white/70 text-base max-w-xs">
            Register as a club admin to create and manage your student club.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12 bg-white dark:bg-[#0f0f0f] overflow-y-auto">
        <div className="w-full max-w-sm fade-up">
          <h2 className="font-serif text-2xl mb-1 dark:text-[#f5f5f5]">Club Admin Registration</h2>
          <p className="text-sm text-[#999] mb-8">Your application will be reviewed by platform admins</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" placeholder="Your full name" value={form.full_name} onChange={set('full_name')} required />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input className="input" type="email" placeholder="you@ejust.edu.eg" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="Min. 8 characters" value={form.password} onChange={set('password')} minLength={8} required />
            </div>

            <hr className="border-[#e8e8e8] dark:border-[#2a2a2a]" />

            <div>
              <label className="label">Club Name</label>
              <input className="input" placeholder="E-JUST Robotics Club" value={form.club_name} onChange={set('club_name')} required />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={set('category')} required>
                <option value="">Select category</option>
                {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>

            <ImageUploadField
              preview={logoUpload.preview}
              onFile={logoUpload.setFile}
              onRemove={logoUpload.removeFile}
              label="Club Logo"
              required
              maxSizeMB={2}
              variant="logo"
              uploading={logoUpload.uploading}
            />

            <div>
              <label className="label">Club Bio</label>
              <textarea className="input resize-none h-20" placeholder="Describe your club..." value={form.bio} onChange={set('bio')} required />
            </div>

            <button type="submit" className="btn-primary justify-center mt-2" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : 'Submit Application'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#999]">
            <Link to="/login" className="text-[#C0121F] hover:underline">← Back to login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
