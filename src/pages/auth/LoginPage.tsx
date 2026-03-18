import { useState, FormEvent, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Mail } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  // Show a resend-verification prompt if the user tries to log in before confirming
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const { toast } = useToast()
  const { profile } = useAuth()
  const navigate = useNavigate()

  // Redirect as soon as profile is loaded after a successful sign-in.
  // This fires whether the user just logged in or was already logged in.
  useEffect(() => {
    if (!profile) return
    if (profile.role === 'platform_admin') navigate('/platform-admin', { replace: true })
    else if (profile.role === 'club_admin' || profile.role === 'co_admin') navigate('/admin', { replace: true })
    else navigate('/dashboard', { replace: true })
  }, [profile, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setUnconfirmedEmail(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setLoading(false)
      // Email not confirmed — show a specific, actionable message
      if (error.message.toLowerCase().includes('email not confirmed') ||
          error.message.toLowerCase().includes('not confirmed')) {
        setUnconfirmedEmail(email)
        return
      }
      // Invalid credentials
      if (error.message.toLowerCase().includes('invalid login credentials') ||
          error.message.toLowerCase().includes('invalid credentials')) {
        toast('Incorrect email or password. Please try again.', 'error')
        return
      }
      // Too many attempts
      if (error.message.toLowerCase().includes('too many requests')) {
        toast('Too many login attempts. Please wait a few minutes and try again.', 'error')
        return
      }
      // Fallback
      toast(error.message, 'error')
      return
    }

    // Success — onAuthStateChange fires → fetchProfile → useEffect above redirects.
    // Loading stays true intentionally until the redirect unmounts this page.
    // Safety timeout in case redirect takes >4s (should never happen).
    setTimeout(() => setLoading(false), 4000)
  }

  const handleResendConfirmation = async () => {
    if (!unconfirmedEmail) return
    setResending(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: unconfirmedEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    })
    if (error) toast(error.message, 'error')
    else toast('Confirmation email resent! Check your inbox.', 'success')
    setResending(false)
  }

  return (
    <div className="min-h-screen flex bg-[#fafafa] dark:bg-[#0a0a0a]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        <img src="/campus.jpg" alt="E-JUST Campus" className="w-full h-full object-cover" />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(10,10,10,0.7) 0%, rgba(192,18,31,0.3) 100%)' }} />
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="E-JUST" className="h-9 w-9 object-contain rounded-xl" />
            <span className="font-serif text-white text-lg">Club Hub</span>
          </div>
          <div>
            <h1 className="font-serif text-5xl text-white leading-tight mb-4">
              Your campus,<br /><span className="text-[#ff4d57]">connected.</span>
            </h1>
            <p className="text-white/50 text-base max-w-xs leading-relaxed">
              Join clubs, attend events, and stay in the loop with everything happening at E-JUST.
            </p>
            <div className="mt-8 flex gap-6">
              {[{ n: '20+', l: 'Clubs' }, { n: '500+', l: 'Students' }, { n: '100+', l: 'Events' }].map(s => (
                <div key={s.l}>
                  <div className="font-serif text-2xl text-white">{s.n}</div>
                  <div className="text-xs text-white/40 uppercase tracking-widest font-semibold">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-[48%] flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[380px] fade-up">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img src="/logo.png" alt="E-JUST" className="h-9 w-9 object-contain rounded-xl" />
            <span className="font-serif text-xl text-[#0a0a0a] dark:text-[#f0f0f0]">Club Hub</span>
          </div>

          <div className="mb-8">
            <h2 className="font-serif text-3xl text-[#0a0a0a] dark:text-[#f0f0f0] mb-1.5">Welcome back</h2>
            <p className="text-[#ababab] text-sm">Sign in to your E-JUST Club Hub account</p>
          </div>

          {/* Unconfirmed email banner */}
          {unconfirmedEmail && (
            <div className="mb-5 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/40">
              <div className="flex items-start gap-3">
                <Mail size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">Email not verified</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mb-3 leading-relaxed">
                    Please check your inbox and click the confirmation link before signing in.
                  </p>
                  <button
                    onClick={handleResendConfirmation}
                    disabled={resending}
                    className="text-xs font-semibold text-amber-800 dark:text-amber-300 underline underline-offset-2 hover:no-underline transition-all"
                  >
                    {resending ? 'Sending...' : 'Resend confirmation email'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@ejust.edu.eg"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div>
              <label className="label" style={{ marginBottom: '0.375rem', display: 'block' }}>Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="input" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: '2.75rem' }} required />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ababab] hover:text-[#6b6b6b] transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2"
              style={{ padding: '0.8rem', borderRadius: '0.75rem', fontSize: '0.9375rem' }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">Sign In <ArrowRight size={16} /></span>
              )}
            </button>
          </form>

          <div className="mt-8 space-y-2 text-center">
            <p className="text-sm text-[#ababab]">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#C0121F] font-semibold hover:underline">Create one</Link>
            </p>

          </div>
        </div>
      </div>
    </div>
  )
}
