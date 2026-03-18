import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ArrowRight, Users, Calendar, MessageSquare, Zap } from 'lucide-react'

export default function HomePage() {
  const { profile } = useAuth()

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero */}
      <div className="relative h-screen overflow-hidden">
        <img src="/campus.jpg" alt="E-JUST Campus" className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.5) 50%, rgba(10,10,10,0.95) 100%)'
        }} />

        {/* Decorative red accent */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #C0121F, transparent 70%)' }} />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="fade-up">
            {/* Logo pill */}
            <div className="inline-flex items-center gap-3 mb-8 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
              <img src="/logo.png" alt="E-JUST" className="h-6 w-6 object-contain rounded-lg" />
              <span className="text-white/70 text-sm font-medium">Egypt-Japan University</span>
            </div>

            <h1 className="font-serif text-6xl md:text-8xl text-white mb-5 leading-none tracking-tight">
              EJUST<br />
              <span className="text-[#C0121F]">Club Hub</span>
            </h1>
            <p className="text-white/50 text-lg md:text-xl max-w-sm mx-auto mb-10 leading-relaxed">
              Discover clubs. Attend events. Connect with your campus community.
            </p>

            {profile ? (
              <Link
                to={profile.role === 'platform_admin' ? '/platform-admin' : (profile.role === 'club_admin' || profile.role === 'co_admin') ? '/admin' : '/dashboard'}
                className="btn-primary text-base"
                style={{ padding: '0.875rem 2.5rem', borderRadius: '3rem', fontSize: '1rem' }}
              >
                Go to Dashboard <ArrowRight size={18} />
              </Link>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                <Link to="/register" className="btn-primary"
                  style={{ padding: '0.875rem 2.5rem', borderRadius: '3rem', fontSize: '1rem' }}>
                  Get Started <ArrowRight size={18} />
                </Link>
                <Link to="/login"
                  className="inline-flex items-center gap-2 text-white/70 hover:text-white text-base font-medium transition-colors px-6 py-3">
                  Sign In →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30">
          <div className="w-px h-10 bg-gradient-to-b from-transparent to-white/30 animate-pulse" />
        </div>
      </div>

      {/* Stats strip */}
      <div className="bg-[#0f0f0f] border-y border-[#1e1e1e]">
        <div className="max-w-[1200px] mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '20+', label: 'Active Clubs' },
            { value: '500+', label: 'Students' },
            { value: '100+', label: 'Events/Year' },
            { value: '6', label: 'Categories' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="font-serif text-3xl text-[#C0121F] mb-1">{s.value}</div>
              <div className="text-xs text-white/30 font-semibold uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="bg-[#0a0a0a] py-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16 fade-up">
            <div className="inline-block text-xs font-bold text-[#C0121F] tracking-widest uppercase mb-4 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(192,18,31,0.1)', border: '1px solid rgba(192,18,31,0.2)' }}>
              Platform Features
            </div>
            <h2 className="font-serif text-4xl text-white mb-4">Everything in one place</h2>
            <p className="text-white/40 max-w-sm mx-auto">Built for E-JUST students, clubs, and organizers.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: <Users size={22} />, title: 'Discover Clubs', desc: 'Browse 6 categories — tech, arts, sports and more. Apply instantly.' },
              { icon: <Calendar size={22} />, title: 'Live Events', desc: 'RSVP to workshops, competitions and social gatherings on campus.' },
              { icon: <MessageSquare size={22} />, title: 'Real-time Chat', desc: 'Club messaging with instant delivery powered by Supabase Realtime.' },
              { icon: <Zap size={22} />, title: 'Instant Updates', desc: 'Notifications for applications, events, and club announcements.' },
            ].map((f, i) => (
              <div key={f.title} className={`rounded-2xl p-6 border border-[#1e1e1e] bg-[#111111] fade-up-${i + 1} group hover:border-[#2a2a2a] transition-all duration-200`}>
                <div className="w-10 h-10 rounded-xl bg-[rgba(192,18,31,0.12)] flex items-center justify-center text-[#C0121F] mb-5
                                group-hover:bg-[rgba(192,18,31,0.18)] transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-serif text-lg text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {!profile && (
            <div className="text-center mt-16">
              <Link to="/register" className="btn-primary"
                style={{ padding: '1rem 3rem', borderRadius: '3rem', fontSize: '1rem' }}>
                Join EJUST Club Hub <ArrowRight size={18} />
              </Link>
              <p className="text-white/20 text-sm mt-4">Requires @ejust.edu.eg email for students</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
