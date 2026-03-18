import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Calendar, Bell, BookOpen, ArrowRight, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Club, Event, Announcement } from '../../types'
import { Skeleton, DateBlock, AnnBadge, SectionHeader } from '../../components/ui'

export default function StudentDashboard() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [stats, setStats] = useState({ clubs: 0, events: 0, myClubs: 0, notifications: 0 })
  const [featuredClubs, setFeaturedClubs] = useState<Club[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    const load = async () => {
      try {
        const [clubsCountRes, myClubsRes, eventsRes, annsRes, notifsRes, featuredRes] = await Promise.all([
          supabase.from('clubs').select('*', { count: 'exact', head: true }).eq('is_approved', true),
          supabase.from('club_members').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('status', 'approved'),
          supabase.from('events_with_rsvp_count').select('*, club:clubs(name,logo_url)').gte('event_date', new Date().toISOString()).order('event_date').limit(4),
          supabase.from('announcements').select('*, club:clubs(name), author:users(full_name)').order('created_at', { ascending: false }).limit(4),
          supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('is_read', false),
          supabase.from('clubs_with_member_count').select('*').eq('is_approved', true).limit(6),
        ])
        if (cancelled) return
        setStats({
          clubs: clubsCountRes.count || 0,
          myClubs: myClubsRes.count || 0,
          events: (eventsRes.data || []).length,
          notifications: notifsRes.count || 0,
        })
        setFeaturedClubs((featuredRes.data as Club[]) || [])
        setUpcomingEvents((eventsRes.data as Event[]) || [])
        setAnnouncements((annsRes.data as Announcement[]) || [])
      } catch (err) {
        if (!cancelled) toast('Failed to load dashboard', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const firstName = profile?.full_name?.split(' ')[0]

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a]">
      {/* Top welcome banner */}
      <div className="bg-white dark:bg-[#111111] border-b border-[#ebebeb] dark:border-[#1e1e1e]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="fade-up">
              <p className="text-xs font-semibold text-[#ababab] uppercase tracking-widest mb-1">Student Dashboard</p>
              <h1 className="font-serif text-3xl text-[#0a0a0a] dark:text-[#f0f0f0]">
                Good to see you, {firstName} 👋
              </h1>
              <p className="text-sm text-[#ababab] mt-1">Here's what's happening across E-JUST today.</p>
            </div>
            <Link to="/clubs" className="btn-primary fade-up-1 self-start sm:self-auto">
              Browse Clubs <ArrowRight size={15} />
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-7">
            {[
              { label: 'Available Clubs', value: stats.clubs, icon: <Users size={14} />, href: '/clubs', color: '#3b82f6' },
              { label: 'Upcoming Events', value: stats.events, icon: <Calendar size={14} />, href: '/events', color: '#10b981' },
              { label: 'My Clubs', value: stats.myClubs, icon: <BookOpen size={14} />, href: '/my-clubs', color: '#C0121F' },
              { label: 'Notifications', value: stats.notifications, icon: <Bell size={14} />, href: '/notifications', color: '#f59e0b' },
            ].map((s, i) => (
              <Link key={s.label} to={s.href}
                className={`fade-up-${i + 1} group flex items-center gap-3 p-4 rounded-2xl border border-[#ebebeb] dark:border-[#252525]
                            bg-[#fafafa] dark:bg-[#0f0f0f] hover:border-[#d4d4d4] dark:hover:border-[#333]
                            transition-all duration-200 hover:-translate-y-0.5`}
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                  style={{ background: `${s.color}14`, color: s.color }}>
                  {s.icon}
                </div>
                <div>
                  {loading
                    ? <Skeleton className="h-6 w-10 mb-0.5" />
                    : <div className="font-serif text-2xl leading-none" style={{ color: s.color }}>{s.value}</div>
                  }
                  <div className="text-[11px] text-[#ababab] font-semibold mt-0.5">{s.label}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-5 gap-6">

          {/* Left - Clubs + Announcements */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-[#111111] rounded-2xl border border-[#ebebeb] dark:border-[#252525] p-5"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <SectionHeader title="Featured Clubs"
                action={<Link to="/clubs" className="text-xs font-semibold text-[#C0121F] hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>}
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {loading
                  ? Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)
                  : featuredClubs.map(club => (
                    <Link key={club.id} to={`/clubs/${club.id}`}
                      className="group rounded-xl overflow-hidden border border-[#ebebeb] dark:border-[#252525]
                                 hover:border-[rgba(192,18,31,0.3)] transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <div className="h-20 relative overflow-hidden">
                        {club.logo_url ? (
                          <>
                            <img src={club.logo_url} alt={club.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          </>
                        ) : (
                          <div className="w-full h-full" style={{ backgroundColor: '#C0121F' }}>
                            <div className="absolute inset-0 bg-black/10" />
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-white dark:bg-[#111111]">
                        <div className="font-medium text-xs text-[#0a0a0a] dark:text-[#f0f0f0] line-clamp-1">{club.name}</div>
                        <div className="text-[10px] text-[#ababab] capitalize">{club.category}</div>
                      </div>
                    </Link>
                  ))
                }
              </div>
            </div>

            {/* Announcements */}
            <div className="bg-white dark:bg-[#111111] rounded-2xl border border-[#ebebeb] dark:border-[#252525] p-5"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <SectionHeader title="Latest Announcements"
                action={<Link to="/announcements" className="text-xs font-semibold text-[#C0121F] hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>}
              />
              <div className="space-y-2">
                {loading
                  ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)
                  : announcements.length === 0
                    ? <p className="text-sm text-[#ababab] py-4 text-center">No announcements yet</p>
                    : announcements.map(ann => (
                      <div key={ann.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#fafafa] dark:hover:bg-[#0f0f0f] transition-colors">
                        <AnnBadge category={ann.category} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-[#0a0a0a] dark:text-[#f0f0f0] truncate">{ann.title}</div>
                          <div className="text-xs text-[#ababab] mt-0.5">{ann.club?.name}</div>
                        </div>
                        <div className="text-[10px] text-[#ababab] shrink-0">{new Date(ann.created_at).toLocaleDateString()}</div>
                      </div>
                    ))
                }
              </div>
            </div>
          </div>

          {/* Right - Events */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-[#111111] rounded-2xl border border-[#ebebeb] dark:border-[#252525] p-5 sticky top-20"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <SectionHeader title="Upcoming Events"
                action={<Link to="/events" className="text-xs font-semibold text-[#C0121F] hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>}
              />
              <div className="space-y-3">
                {loading
                  ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-[72px]" />)
                  : upcomingEvents.length === 0
                    ? (
                      <div className="text-center py-8">
                        <Calendar className="mx-auto mb-2 text-[#ebebeb] dark:text-[#252525]" size={28} />
                        <p className="text-sm text-[#ababab]">No upcoming events</p>
                        <Link to="/clubs" className="text-xs text-[#C0121F] font-semibold hover:underline mt-1 inline-block">Join clubs to see events</Link>
                      </div>
                    )
                    : upcomingEvents.map(ev => (
                      <div key={ev.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#ebebeb] dark:border-[#252525] hover:border-[#d4d4d4] dark:hover:border-[#333] transition-all duration-200 group">
                        <DateBlock date={ev.event_date} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-[#0a0a0a] dark:text-[#f0f0f0] truncate group-hover:text-[#C0121F] transition-colors">{ev.title}</div>
                          <div className="text-xs text-[#ababab] mt-0.5 truncate flex items-center gap-1">
                            {ev.club?.logo_url
                              ? <img src={ev.club.logo_url} alt={ev.club.name} className="h-3.5 w-3.5 rounded object-cover inline-block shrink-0" />
                              : <span className="h-3.5 w-3.5 rounded inline-block shrink-0" style={{ backgroundColor: '#C0121F' }} />
                            } {ev.club?.name}
                          </div>
                        </div>
                      </div>
                    ))
                }
              </div>

              {/* Quick links */}
              <div className="mt-5 pt-5 border-t border-[#ebebeb] dark:border-[#1e1e1e] grid grid-cols-2 gap-2">
                <Link to="/my-clubs" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#6b6b6b] dark:text-[#909090] hover:bg-[#f4f4f4] dark:hover:bg-[#181818] transition-colors">
                  <BookOpen size={13} /> My Clubs
                </Link>
                <Link to="/applications" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#6b6b6b] dark:text-[#909090] hover:bg-[#f4f4f4] dark:hover:bg-[#181818] transition-colors">
                  <TrendingUp size={13} /> Applications
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
