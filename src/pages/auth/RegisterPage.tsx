import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Check, Mail } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'

const majors = ['Computer Science', 'Engineering', 'Architecture', 'Business', 'Environmental Sciences', 'Mechatronics', 'Energy Engineering', 'Other']

export default function RegisterPage() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', major: '', year: '1' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [resending, setResending] = useState(false)
  const { toast } = useToast()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.email.endsWith('@ejust.edu.eg')) {
      toast('Please use your @ejust.edu.eg email', 'error'); return
    }
    if (form.password.length < 8) {
      toast('Password must be at least 8 characters', 'error'); return
    }
    setLoading(true)

    const { error, data } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        // Pass all profile fields in metadata so the trigger can save them
        // immediately — this avoids needing a separate DB call after signup
        // which would fail because auth.uid() is null before email confirmation
        data: {
          full_name: form.full_name,
          major: form.major,
          year: parseInt(form.year),
        },
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

    // With email confirmation ON, data.session is null here — the user hasn't
    // confirmed yet so auth.uid() is null and RLS blocks any DB writes.
    // The trigger already captured full_name from metadata. major/year will be
    // null until the user updates their profile after confirming — that is fine.

    setLoading(false)
    setConfirmationSent(true)
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

  if (confirmationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] px-4">
        <div className="w-full max-w-md fade-up text-center">
          <div className="w-16 h-16 rounded-2xl bg-[rgba(192,18,31,0.1)] flex items-center justify-center mx-auto mb-6">
            <Mail size={28} className="text-[#C0121F]" />
          </div>
          <h2 className="font-serif text-3xl text-[#0a0a0a] dark:text-[#f0f0f0] mb-2">Check your email</h2>
          <p className="text-[#6b6b6b] dark:text-[#909090] mb-2">We sent a confirmation link to</p>
          <p className="font-semibold text-[#0a0a0a] dark:text-[#f0f0f0] mb-6">{form.email}</p>
          <p className="text-sm text-[#ababab] mb-8 leading-relaxed">
            Click the link in the email to verify your account. You'll be taken directly to your dashboard after verifying.
          </p>
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
          <p className="text-xs text-[#ababab] mt-8">Can't find the email? Check your spam folder.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-[#fafafa] dark:bg-[#0a0a0a]">
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        <img src="/campus.jpg" alt="E-JUST Campus" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(10,10,10,0.7) 0%, rgba(192,18,31,0.25) 100%)' }} />
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="E-JUST" className="h-9 w-9 object-contain rounded-xl" />
            <span className="font-serif text-white text-lg">Club Hub</span>
          </div>
          <div>
            <h1 className="font-serif text-5xl text-white leading-tight mb-4">Join the<br /><span className="text-[#ff4d57]">community.</span></h1>
            <p className="text-white/50 max-w-xs leading-relaxed text-sm">Create your student account and start discovering clubs at Egypt-Japan University.</p>
            <div className="mt-8 space-y-3">
              {['Free for all E-JUST students', 'Access 20+ active clubs', 'Real-time events & announcements'].map(f => (
                <div key={f} className="flex items-center gap-2.5 text-white/60 text-sm">
                  <div className="h-5 w-5 rounded-full bg-[#C0121F]/20 flex items-center justify-center shrink-0">
                    <Check size={10} className="text-[#ff4d57]" />
                  </div>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[48%] flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-[380px] fade-up">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src="/logo.png" alt="E-JUST" className="h-8 w-8 object-contain rounded-xl" />
            <span className="font-serif text-xl dark:text-[#f0f0f0]">Club Hub</span>
          </div>
          <h2 className="font-serif text-3xl text-[#0a0a0a] dark:text-[#f0f0f0] mb-1.5">Create account</h2>
          <p className="text-sm text-[#ababab] mb-8">Use your official @ejust.edu.eg email address</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" placeholder="Your full name" value={form.full_name} onChange={set('full_name')} required />
            </div>
            <div>
              <label className="label">University Email</label>
              <input className="input" type="email" placeholder="you@ejust.edu.eg" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input className="input" type={showPass ? 'text' : 'password'} placeholder="Minimum 8 characters"
                  value={form.password} onChange={set('password')} style={{ paddingRight: '2.75rem' }} minLength={8} required />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ababab] hover:text-[#6b6b6b] transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Major</label>
                <select className="input" value={form.major} onChange={set('major')} required>
                  <option value="">Select major</option>
                  {majors.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Year</label>
                <select className="input" value={form.year} onChange={set('year')}>
                  {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2"
              style={{ padding: '0.8rem', borderRadius: '0.75rem', fontSize: '0.9375rem' }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </span>
              ) : <span className="flex items-center gap-2">Create Account <ArrowRight size={16} /></span>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#ababab]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#C0121F] font-semibold hover:underline">Sign in</Link>
          </p>
          <p className="mt-2 text-center text-sm text-[#ababab]">
            Club organizer?{' '}
            <Link to="/register/club-admin" className="text-[#C0121F] font-semibold hover:underline">Register as admin</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
