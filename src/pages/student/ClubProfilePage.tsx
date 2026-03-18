import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Users, MapPin } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Club, Event, Announcement } from '../../types'
import { Skeleton, CategoryBadge, DateBlock, AnnBadge } from '../../components/ui'

export default function ClubProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const { toast } = useToast()
  const [club, setClub] = useState<Club | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [memberStatus, setMemberStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const load = async () => {
      try {
        const [clubRes, eventsRes, annsRes] = await Promise.all([
          supabase.from('clubs_with_member_count').select('*').eq('id', id).single(),
          supabase.from('events_with_rsvp_count').select('*').eq('club_id', id).gte('event_date', new Date().toISOString()).order('event_date').limit(5),
          supabase.from('announcements').select('*, author:users(full_name)').eq('club_id', id).order('created_at', { ascending: false }).limit(5),
        ])
        if (cancelled) return
        if (clubRes.error) { toast('Club not found', 'error') }
        setClub(clubRes.data)
        setEvents(eventsRes.data || [])
        setAnnouncements(annsRes.data || [])
        if (profile) {
          const { data: mem } = await supabase
            .from('club_members').select('status')
            .eq('club_id', id).eq('user_id', profile.id).maybeSingle()
          if (!cancelled && mem) setMemberStatus(mem.status as 'approved' | 'pending' | 'rejected')
        }
      } catch {
        if (!cancelled) toast('Failed to load club', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoin = async () => {
    if (!profile || !id || actionLoading) return
    setActionLoading(true)
    const { error } = await supabase.from('club_members').insert({ club_id: id, user_id: profile.id, status: 'pending' })
    if (error) toast('Failed to apply', 'error')
    else { toast('Application submitted!', 'success'); setMemberStatus('pending') }
    setActionLoading(false)
  }

  const handleLeave = async () => {
    if (!profile || !id || actionLoading) return
    setActionLoading(true)
    // Item 11: if user is a co_admin, demote them back to student before leaving.
    // Uses a SECURITY DEFINER function to bypass the RLS policy that blocks self role-changes.
    if (profile.role === 'co_admin') {
      await supabase.rpc('demote_self_to_student')
    }
    const { error } = await supabase.from('club_members').delete().eq('club_id', id).eq('user_id', profile.id)
    if (error) toast('Failed to leave club', 'error')
    else { toast('Left club', 'info'); setMemberStatus('none') }
    setActionLoading(false)
  }

  const isAdmin = profile && club && (profile.role === 'club_admin' || profile.role === 'co_admin') && memberStatus === 'approved'

  if (loading) return <div className="page-container"><Skeleton className="h-64 w-full mb-4" /></div>
  if (!club) return <div className="page-container text-center py-20 text-[#999]">Club not found</div>

  return (
    <div className="fade-up">
      {/* Cover */}
      <div className="h-72 w-full relative overflow-hidden">
        {club.logo_url ? (
          <>
            <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full" style={{ backgroundColor: '#C0121F' }}>
            <div className="absolute inset-0 bg-black/25" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl text-white drop-shadow-lg">{club.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <CategoryBadge category={club.category} />
                <span className="text-xs text-white/70 flex items-center gap-1"><Users size={12} /> {club.member_count ?? 0} members</span>
              </div>
            </div>
            <div className="shrink-0">
              {isAdmin ? (
                <span className="text-xs px-3 py-1.5 rounded-full bg-white/20 border border-white/30 text-white font-medium">
                  {profile?.role === 'club_admin' ? 'Primary Admin' : 'Co-Admin'}
                </span>
              ) : memberStatus === 'approved' ? (
                <button onClick={handleLeave} disabled={actionLoading} className="btn-ghost text-xs py-1.5 px-4 bg-white/10 border-white/20 text-white hover:bg-white/20">
                  {actionLoading ? '...' : 'Leave Club'}
                </button>
              ) : memberStatus === 'pending' ? (
                <button disabled className="btn-ghost text-xs py-1.5 px-4 bg-white/10 border-white/20 text-white/60 cursor-not-allowed">Pending</button>
              ) : (
                <button onClick={handleJoin} disabled={actionLoading} className="btn-primary text-xs py-1.5 px-4">
                  {actionLoading ? '...' : 'Join Club'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="page-container">
        <div className="bg-white dark:bg-[#1a1a1a] border border-[#e8e8e8] dark:border-[#2a2a2a] rounded-xl p-4 shadow-sm mb-8">
          <p className="text-sm text-[#555] dark:text-[#a0a0a0]">{club.description}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Events */}
          <div>
            <h2 className="section-title mb-4">Upcoming Events</h2>
            {events.length === 0 ? (
              <p className="text-sm text-[#999]">No upcoming events</p>
            ) : events.map(ev => (
              <div key={ev.id} className="card mb-3 overflow-hidden p-0">
                {ev.image_url && <img src={ev.image_url} alt={ev.title} className="w-full h-32 object-cover" />}
                <div className="flex items-center gap-3 p-3">
                  <DateBlock date={ev.event_date} />
                  <div className="min-w-0">
                    <div className="font-medium text-sm dark:text-[#f5f5f5]">{ev.title}</div>
                    <div className="text-xs text-[#999] flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {ev.location}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Announcements */}
          <div>
            <h2 className="section-title mb-4">Announcements</h2>
            {announcements.length === 0 ? (
              <p className="text-sm text-[#999]">No announcements yet</p>
            ) : announcements.map(ann => (
              <div key={ann.id} className="card mb-3 overflow-hidden p-0">
                {ann.image_url && <img src={ann.image_url} alt={ann.title} className="w-full h-32 object-cover" />}
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <AnnBadge category={ann.category} />
                    <span className="text-xs text-[#999]">{ann.author?.full_name}</span>
                  </div>
                  <div className="font-medium text-sm dark:text-[#f5f5f5]">{ann.title}</div>
                  <p className="text-xs text-[#555] dark:text-[#a0a0a0] mt-1 line-clamp-2">{ann.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
