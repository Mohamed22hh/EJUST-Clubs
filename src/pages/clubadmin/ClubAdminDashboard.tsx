import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Megaphone, Calendar, Settings, ArrowRight, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useMyClub } from '../../hooks/useMyClub'
import { Skeleton } from '../../components/ui'

export default function ClubAdminDashboard() {
  const { club, clubId, loading: clubLoading, isPrimaryAdmin, isCoAdmin } = useMyClub()
  const [stats, setStats] = useState({ members: 0, pending: 0, events: 0, announcements: 0 })
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    if (!clubId) return
    const load = async () => {
      try {
        const month = new Date(new Date().setDate(1)).toISOString()
        const [mems, pending, events, anns] = await Promise.all([
          supabase.from('club_members').select('*', { count: 'exact', head: true }).eq('club_id', clubId).eq('status', 'approved'),
          supabase.from('club_members').select('*', { count: 'exact', head: true }).eq('club_id', clubId).eq('status', 'pending'),
          supabase.from('events').select('*', { count: 'exact', head: true }).eq('club_id', clubId).gte('event_date', month),
          supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('club_id', clubId),
        ])
        setStats({
          members: mems.count || 0,
          pending: pending.count || 0,
          events: events.count || 0,
          announcements: anns.count || 0,
        })
      } catch {
        // Stats are non-critical; silently clear loading
      } finally {
        setStatsLoading(false)
      }
    }
    load()
  }, [clubId])

  const loading = clubLoading || statsLoading

  const allActions = [
    { to: '/admin/members', icon: <Users size={20} />, label: 'Manage Members', desc: 'Review pending applications and member list', color: '#3b82f6' },
    { to: '/admin/announcements', icon: <Megaphone size={20} />, label: 'Announcements', desc: 'Post and manage club announcements', color: '#C0121F' },
    { to: '/admin/events', icon: <Calendar size={20} />, label: 'Events', desc: 'Create and manage club events', color: '#10b981' },
    { to: '/admin/settings', icon: <Settings size={20} />, label: 'Club Settings', desc: 'Update club info and profile', color: '#8b5cf6', primaryOnly: true },
  ]
  // Co-admins see all actions except Settings
  const actions = allActions.filter(a => !a.primaryOnly || isPrimaryAdmin)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Dark hero with full-bleed logo image */}
      <div className="relative overflow-hidden" style={{ minHeight: '280px' }}>
        {club?.logo_url ? (
          <>
            <img src={club.logo_url} alt={club.name}
              className="absolute inset-0 w-full h-full object-cover opacity-20 blur-xl scale-110 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/60 to-[#0a0a0a]" />
          </>
        ) : (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full blur-3xl opacity-20"
              style={{ background: 'radial-gradient(circle, #C0121F, transparent 70%)' }} />
            <div className="absolute bottom-0 right-1/4 w-60 h-60 rounded-full blur-3xl opacity-10"
              style={{ background: 'radial-gradient(circle, #ff4d57, transparent 70%)' }} />
          </div>
        )}

        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
          {/* Club identity */}
          <div className="flex items-center gap-5 mb-10 fade-up">
            <div className="h-20 w-20 rounded-2xl overflow-hidden shrink-0 border-2 border-white/20 shadow-2xl">
              {club?.logo_url ? (
                <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="text-xs font-bold text-[#ababab] uppercase tracking-widest">Club Dashboard</div>
                {isCoAdmin && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold uppercase tracking-wider">Co-Admin</span>
                )}
              </div>
              <h1 className="font-serif text-3xl text-white">
                {loading ? <span className="opacity-40">Loading...</span> : (club?.name || 'Your Club')}
              </h1>
              {club && <span className="inline-block mt-1 text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/60 capitalize">{club.category}</span>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Members', value: stats.members, icon: <Users size={16} />, color: '#60a5fa' },
              { label: 'Pending', value: stats.pending, icon: <TrendingUp size={16} />, color: '#fbbf24' },
              { label: 'Events (month)', value: stats.events, icon: <Calendar size={16} />, color: '#34d399' },
              { label: 'Announcements', value: stats.announcements, icon: <Megaphone size={16} />, color: '#a78bfa' },
            ].map((s, i) => (
              <div key={s.label} className={`fade-up-${i + 1} rounded-2xl p-4 border border-white/8`}
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>
                  {s.icon}
                  <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">{s.label}</span>
                </div>
                {loading
                  ? <div className="h-8 w-16 rounded-lg bg-white/10 animate-pulse" />
                  : <div className="font-serif text-3xl" style={{ color: s.color }}>{s.value}</div>
                }
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-[#fafafa] dark:bg-[#0f0f0f] min-h-screen">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="font-serif text-xl text-[#0a0a0a] dark:text-[#f0f0f0] mb-5">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {actions.map((a, i) => (
              <Link key={a.to} to={a.to}
                className={`fade-up-${i + 1} group flex flex-col gap-3 p-5 rounded-2xl border border-[#ebebeb] dark:border-[#252525]
                            bg-white dark:bg-[#111111] hover:border-[#d4d4d4] dark:hover:border-[#333]
                            transition-all duration-200 hover:-translate-y-1`}
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
              >
                <div className="h-11 w-11 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                  style={{ background: `${a.color}14`, color: a.color }}>
                  {a.icon}
                </div>
                <div>
                  <div className="font-semibold text-sm text-[#0a0a0a] dark:text-[#f0f0f0] mb-1">{a.label}</div>
                  <div className="text-xs text-[#ababab] leading-relaxed">{a.desc}</div>
                </div>
                <div className="mt-auto flex items-center gap-1 text-xs font-semibold" style={{ color: a.color }}>
                  Open <ArrowRight size={11} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
