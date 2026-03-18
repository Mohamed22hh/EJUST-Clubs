import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { ClubMember, Notification } from '../../types'
import { PageHeader, StatusBadge, Skeleton, EmptyState } from '../../components/ui'
import { Bell, CheckCheck } from 'lucide-react'

// ── My Clubs Page ─────────────────────────────────────────────────────────────
export function MyClubsPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [memberships, setMemberships] = useState<ClubMember[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'approved' | 'pending'>('approved')

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    supabase.from('club_members').select('*, club:clubs(*)').eq('user_id', profile.id)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) toast('Failed to load clubs', 'error')
        setMemberships((data as ClubMember[]) || [])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const displayed = memberships.filter(m => m.status === tab)

  return (
    <div className="page-container fade-up">
      <PageHeader title="My Clubs" />
      <div className="flex gap-2 mb-6">
        {(['approved', 'pending'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded-full border font-medium capitalize transition-colors
              ${tab === t ? 'bg-[#C0121F] text-white border-[#C0121F]' : 'border-[#e8e8e8] text-[#555] dark:border-[#2a2a2a] dark:text-[#a0a0a0]'}`}>
            {t === 'approved' ? 'Joined' : 'Pending'}
            <span className="ml-1.5 text-xs opacity-70">({memberships.filter(m => m.status === t).length})</span>
          </button>
        ))}
      </div>
      {loading ? <Skeleton className="h-40" /> : displayed.length === 0 ? (
        <EmptyState
          title={tab === 'approved' ? 'No clubs joined' : 'No pending applications'}
          description={tab === 'approved' ? 'Browse clubs and apply to join' : 'All applications processed'}
          action={tab === 'approved' ? <Link to="/clubs" className="btn-primary">Browse Clubs</Link> : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {displayed.map(m => (
            <Link key={m.id} to={`/clubs/${m.club_id}`}
              className="group card overflow-hidden p-0 flex flex-row items-stretch hover:-translate-y-0.5 transition-all duration-200">
              <div className="w-20 shrink-0 relative overflow-hidden">
                {m.club?.logo_url ? (
                  <img src={m.club.logo_url} alt={m.club.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full" style={{ backgroundColor: '#C0121F' }} />
                )}
                <div className="absolute inset-0 bg-black/10" />
              </div>
              <div className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="font-medium dark:text-[#f5f5f5] truncate">{m.club?.name}</div>
                  <div className="text-xs text-[#999] capitalize">{m.club?.category}</div>
                </div>
                <StatusBadge status={m.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Applications Page ─────────────────────────────────────────────────────────
export function ApplicationsPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [memberships, setMemberships] = useState<ClubMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    supabase.from('club_members').select('*, club:clubs(*)')
      .eq('user_id', profile.id).order('joined_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) toast('Failed to load applications', 'error')
        setMemberships((data as ClubMember[]) || [])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page-container fade-up">
      <PageHeader title="Applications" subtitle="Track your club application status" />
      {loading ? <Skeleton className="h-40" /> : memberships.length === 0 ? (
        <EmptyState title="No applications yet" action={<Link to="/clubs" className="btn-primary">Browse Clubs</Link>} />
      ) : (
        <div className="flex flex-col gap-3">
          {memberships.map(m => (
            <div key={m.id} className="card overflow-hidden p-0 flex flex-row items-stretch">
              <div className="w-20 shrink-0 relative overflow-hidden">
                {m.club?.logo_url ? (
                  <img src={m.club.logo_url} alt={m.club.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" style={{ backgroundColor: '#C0121F' }} />
                )}
                <div className="absolute inset-0 bg-black/10" />
              </div>
              <div className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="font-medium dark:text-[#f5f5f5] truncate">{m.club?.name}</div>
                  <div className="text-xs text-[#999]">Applied {new Date(m.joined_at).toLocaleDateString()}</div>
                </div>
                <StatusBadge status={m.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Notifications Page ────────────────────────────────────────────────────────
export function NotificationsPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    if (!profile) return
    supabase.from('notifications').select('*')
      .eq('user_id', profile.id).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) toast('Failed to load notifications', 'error')
        setNotifications((data as Notification[]) || [])
        setLoading(false)
      })
  }

  useEffect(() => {
    if (!profile) return
    load()
    const sub = supabase.channel(`notifications-page-${profile.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        () => load()
      ).subscribe()
    return () => { sub.unsubscribe().then(() => supabase.removeChannel(sub)) }
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const markAllRead = async () => {
    if (!profile) return
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id)
    if (error) toast('Failed to mark as read', 'error')
    else setNotifications(n => n.map(notif => ({ ...notif, is_read: true })))
  }

  return (
    <div className="page-container fade-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl dark:text-[#f5f5f5]">Notifications</h1>
          <p className="text-sm text-[#999] mt-1">{notifications.filter(n => !n.is_read).length} unread</p>
        </div>
        <button onClick={markAllRead} className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5">
          <CheckCheck size={14} /> Mark all read
        </button>
      </div>
      {loading ? <Skeleton className="h-40" /> : notifications.length === 0 ? (
        <EmptyState icon={<Bell />} title="No notifications" />
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map(n => (
            <div key={n.id} className={`card flex items-start gap-3 ${!n.is_read ? 'border-[#C0121F]/30' : ''}`}>
              <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${!n.is_read ? 'bg-[#C0121F]' : 'bg-[#e8e8e8]'}`} />
              <div className="flex-1">
                <div className="font-medium text-sm dark:text-[#f5f5f5]">{n.title}</div>
                <div className="text-xs text-[#555] dark:text-[#a0a0a0]">{n.body}</div>
                <div className="text-xs text-[#999] mt-1">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
