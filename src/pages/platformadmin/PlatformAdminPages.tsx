import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { Club, User } from '../../types'
import { PageHeader, Skeleton, EmptyState, CategoryBadge, StatusBadge, Avatar } from '../../components/ui'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { CheckCircle, XCircle, Users, Building2, Clock, Activity } from 'lucide-react'

// ─── Platform Admin Dashboard ────────────────────────────────────────────────

export function PlatformAdminDashboard() {
  const [stats, setStats] = useState({ users: 0, clubs: 0, pendingClubs: 0, pendingAdmins: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [users, clubs, pendingClubs, pendingAdmins] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('clubs').select('*', { count: 'exact', head: true }).eq('is_approved', true),
          supabase.from('clubs').select('*', { count: 'exact', head: true }).eq('is_approved', false),
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'club_admin').eq('is_approved', false),
        ])
        setStats({
          users: users.count || 0,
          clubs: clubs.count || 0,
          pendingClubs: pendingClubs.count || 0,
          pendingAdmins: pendingAdmins.count || 0,
        })
      } catch {
        // Non-critical — show zeros
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative overflow-hidden" style={{ minHeight: '240px' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-72 h-72 rounded-full blur-3xl opacity-15"
            style={{ background: 'radial-gradient(circle, #C0121F, transparent 70%)' }} />
        </div>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
          <div className="fade-up mb-8">
            <p className="text-xs font-bold text-[#ababab] uppercase tracking-widest mb-1">Platform Administration</p>
            <h1 className="font-serif text-3xl text-white">Control Center</h1>
            <p className="text-white/40 text-sm mt-1">Manage all clubs, admins and users across E-JUST Club Hub</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Users', value: stats.users, icon: <Users size={15} />, color: '#60a5fa' },
              { label: 'Active Clubs', value: stats.clubs, icon: <Building2 size={15} />, color: '#34d399' },
              { label: 'Pending Clubs', value: stats.pendingClubs, icon: <Clock size={15} />, color: '#fbbf24' },
              { label: 'Pending Admins', value: stats.pendingAdmins, icon: <Activity size={15} />, color: '#f87171' },
            ].map((s, i) => (
              <div key={s.label} className={`fade-up-${i + 1} rounded-2xl p-4 border border-white/8`}
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>
                  {s.icon}
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{s.label}</span>
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

      <div className="bg-[#fafafa] dark:bg-[#0f0f0f] min-h-screen">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="font-serif text-xl text-[#0a0a0a] dark:text-[#f0f0f0] mb-4">Navigation</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { href: '/platform-admin/clubs', label: 'Club Queue', desc: 'Approve or reject pending clubs', color: '#fbbf24' },
              { href: '/platform-admin/admins', label: 'Admin Queue', desc: 'Review club admin applications', color: '#f87171' },
              { href: '/platform-admin/all-clubs', label: 'All Clubs', desc: 'View and manage all clubs', color: '#34d399' },
              { href: '/platform-admin/users', label: 'Users', desc: 'Manage all registered users', color: '#60a5fa' },
            ].map(n => (
              <Link key={n.href} to={n.href} className="card-hover p-5 group" style={{ textDecoration: 'none' }}>
                <div className="h-2.5 w-2.5 rounded-full mb-3" style={{ background: n.color }} />
                <div className="font-semibold text-sm text-[#0a0a0a] dark:text-[#f0f0f0] mb-1">{n.label}</div>
                <div className="text-xs text-[#ababab]">{n.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Shared Approval Table ───────────────────────────────────────────────────

function ApprovalTable({ items, onApprove, onReject, type }: {
  items: any[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
  type: 'club' | 'admin'
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null)

  if (items.length === 0) return <EmptyState title={`No pending ${type} applications`} />

  return (
    <>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#111111] border border-[#ebebeb] dark:border-[#252525]"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            {type === 'club'
              ? (
                item.logo_url
                  ? <img src={item.logo_url} alt={item.name} className="h-10 w-10 rounded-xl object-cover shrink-0 border border-[#ebebeb] dark:border-[#252525]" />
                  : <div className="h-10 w-10 rounded-xl shrink-0" style={{ backgroundColor: '#C0121F' }} />
              )
              : <Avatar name={item.full_name} />
            }
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-[#0a0a0a] dark:text-[#f0f0f0]">
                {type === 'club' ? item.name : item.full_name}
              </div>
              <div className="text-xs text-[#ababab] mt-0.5">
                {type === 'club' ? <CategoryBadge category={item.category} /> : item.email}
              </div>
              {type === 'club' && (
                <p className="text-xs text-[#ababab] mt-1 line-clamp-1">{item.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => onApprove(item.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100 transition-colors">
                <CheckCircle size={13} /> Approve
              </button>
              <button onClick={() => setConfirmId(item.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-50 text-[#C0121F] border border-red-200/60 hover:bg-red-100 transition-colors">
                <XCircle size={13} /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        title={type === 'club' ? 'Reject this club?' : 'Reject this admin application?'}
        description={
          type === 'club'
            ? 'This will permanently delete the club application. This cannot be undone.'
            : 'This will revert the user to student role and delete their club application. They will need to re-apply.'
        }
        confirmLabel="Reject"
        danger
        onConfirm={() => { if (confirmId) { onReject(confirmId); setConfirmId(null) } }}
        onCancel={() => setConfirmId(null)}
      />
    </>
  )
}

// ─── Club Approval Queue ─────────────────────────────────────────────────────

export function ClubApprovalQueue() {
  const { toast } = useToast()
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    supabase.from('clubs').select('*').eq('is_approved', false).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) toast('Failed to load clubs', 'error')
        else setClubs((data as Club[]) || [])
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [])

  const approve = async (id: string) => {
    const { error } = await supabase.from('clubs').update({ is_approved: true }).eq('id', id)
    if (error) toast('Failed to approve club', 'error')
    else { toast('Club approved!', 'success'); load() }
  }

  const reject = async (id: string) => {
    const { error } = await supabase.from('clubs').delete().eq('id', id)
    if (error) toast('Failed to reject club', 'error')
    else { toast('Club removed', 'info'); load() }
  }

  return (
    <div className="page-container fade-up">
      <PageHeader title="Club Approval Queue" subtitle="Review new club applications" />
      {loading ? <Skeleton className="h-40" /> : <ApprovalTable items={clubs} onApprove={approve} onReject={reject} type="club" />}
    </div>
  )
}

// ─── Admin Approval Queue ────────────────────────────────────────────────────

export function AdminApprovalQueue() {
  const { toast } = useToast()
  const [admins, setAdmins] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    supabase.from('users').select('*').eq('role', 'club_admin').eq('is_approved', false)
      .then(({ data, error }) => {
        if (error) toast('Failed to load applications', 'error')
        else setAdmins((data as User[]) || [])
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [])

  const approve = async (id: string) => {
    const { data: userData } = await supabase.from('users').select('email').eq('id', id).single()
    if (!userData) { toast('User not found', 'error'); return }

    const { error } = await supabase.from('users').update({ is_approved: true }).eq('id', id)
    if (error) { toast('Failed to approve admin', 'error'); return }

    // Approve their club too
    await supabase.from('clubs').update({ is_approved: true }).eq('admin_id', id)

    // Notify the admin they've been approved
    await supabase.from('notifications').insert({
      user_id: id,
      type: 'application_accepted',
      title: 'Club application approved!',
      body: 'Your club admin application has been approved. You can now manage your club.',
      is_read: false,
    })

    toast('Admin approved!', 'success')
    load()
  }

  // Item 3: reject also deletes the orphaned club row
  const reject = async (id: string) => {
    // Delete the club associated with this admin first
    await supabase.from('clubs').delete().eq('admin_id', id)

    const { error } = await supabase.from('users').update({ is_approved: false, role: 'student' }).eq('id', id)
    if (error) toast('Failed to reject application', 'error')
    else { toast('Application rejected', 'info'); load() }
  }

  return (
    <div className="page-container fade-up">
      <PageHeader title="Admin Approval Queue" subtitle="Review club admin applications" />
      {loading ? <Skeleton className="h-40" /> : <ApprovalTable items={admins} onApprove={approve} onReject={reject} type="admin" />}
    </div>
  )
}

// ─── All Clubs ───────────────────────────────────────────────────────────────

export function AllClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [confirmToggle, setConfirmToggle] = useState<{ id: string; current: boolean } | null>(null)

  const [transferClub, setTransferClub] = useState<Club | null>(null)
  const [clubMembers, setClubMembers] = useState<any[]>([])
  const [selectedNewAdmin, setSelectedNewAdmin] = useState<string>('')
  const [transferring, setTransferring] = useState(false)
  const [confirmTransfer, setConfirmTransfer] = useState(false)

  useEffect(() => {
    supabase.from('clubs').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) toast('Failed to load clubs', 'error')
        else setClubs((data as Club[]) || [])
        setLoading(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const doToggle = async (id: string, current: boolean) => {
    const { error } = await supabase.from('clubs').update({ is_approved: !current }).eq('id', id)
    if (error) toast('Failed to update club', 'error')
    else {
      setClubs(c => c.map(cl => cl.id === id ? { ...cl, is_approved: !current } : cl))
      toast(current ? 'Club deactivated' : 'Club activated', 'info')
    }
    setConfirmToggle(null)
  }

  const openTransfer = async (club: Club) => {
    setTransferClub(club)
    setSelectedNewAdmin('')
    const { data } = await supabase.from('club_members')
      .select('user_id, user:users(id, full_name, email, role)')
      .eq('club_id', club.id)
      .eq('status', 'approved')
    const members = (data || []).map((m: any) => m.user).filter(Boolean)
    setClubMembers(members)
  }

  // Item 4: delete new admin's club_members row after transfer
  // Item 5: notify new admin of promotion
  const doTransfer = async () => {
    if (!transferClub || !selectedNewAdmin) return
    setTransferring(true)
    try {
      const oldAdminId = transferClub.admin_id

      // 1. Promote new admin's role
      const { error: e1 } = await supabase.from('users').update({ role: 'club_admin' }).eq('id', selectedNewAdmin)
      if (e1) throw e1

      // 2. Reassign club ownership
      const { error: e2 } = await supabase.from('clubs').update({ admin_id: selectedNewAdmin }).eq('id', transferClub.id)
      if (e2) throw e2

      // 3. Demote old admin to student
      const { error: e3 } = await supabase.from('users').update({ role: 'student' }).eq('id', oldAdminId)
      if (e3) throw e3

      // 4. Keep old admin as approved member
      await supabase.from('club_members').upsert(
        { club_id: transferClub.id, user_id: oldAdminId, status: 'approved' },
        { onConflict: 'club_id,user_id', ignoreDuplicates: false }
      )

      // 5. Remove the new admin's club_members row (they're now identified by clubs.admin_id)
      await supabase.from('club_members').delete()
        .eq('club_id', transferClub.id).eq('user_id', selectedNewAdmin)

      // 6. Notify new admin of promotion
      await supabase.from('notifications').insert({
        user_id: selectedNewAdmin,
        type: 'application_accepted',
        title: 'You are now the primary admin!',
        body: `You have been made the primary admin of ${transferClub.name}.`,
        is_read: false,
        link: '/admin',
      })

      toast('Ownership transferred', 'success')
      setClubs(c => c.map(cl => cl.id === transferClub.id ? { ...cl, admin_id: selectedNewAdmin } : cl))
      setTransferClub(null)
      setConfirmTransfer(false)
    } catch {
      toast('Failed to transfer ownership', 'error')
    }
    setTransferring(false)
  }

  return (
    <div className="page-container fade-up">
      <PageHeader title="All Clubs" subtitle={`${clubs.length} total clubs`} />
      {loading ? <Skeleton className="h-40" /> : (
        <div className="bg-white dark:bg-[#111111] rounded-2xl border border-[#ebebeb] dark:border-[#252525] overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {clubs.map((c, i) => (
            <div key={c.id} className={`flex items-center gap-4 px-5 py-4 ${i < clubs.length - 1 ? 'border-b border-[#f4f4f4] dark:border-[#1e1e1e]' : ''}`}>
              {c.logo_url
                ? <img src={c.logo_url} alt={c.name} className="h-9 w-9 rounded-xl object-cover shrink-0 border border-[#ebebeb] dark:border-[#252525]" />
                : <div className="h-9 w-9 rounded-xl shrink-0" style={{ backgroundColor: '#C0121F' }} />
              }
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-[#0a0a0a] dark:text-[#f0f0f0]">{c.name}</div>
                <CategoryBadge category={c.category} />
              </div>
              <StatusBadge status={c.is_approved ? 'approved' : 'pending'} />
              <button
                onClick={() => openTransfer(c)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#ebebeb] dark:border-[#252525] text-[#C0121F] hover:bg-[#fdf2f2] dark:hover:bg-[#1a0a0a] transition-colors">
                Transfer
              </button>
              <button
                onClick={() => setConfirmToggle({ id: c.id, current: c.is_approved })}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#ebebeb] dark:border-[#252525] text-[#6b6b6b] dark:text-[#909090] hover:bg-[#f4f4f4] dark:hover:bg-[#181818] transition-colors">
                {c.is_approved ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      )}

      {transferClub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setTransferClub(null)}>
          <div className="bg-white dark:bg-[#111] rounded-2xl border border-[#e8e8e8] dark:border-[#252525] w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}>
            <h2 className="font-serif text-xl text-[#0a0a0a] dark:text-[#f0f0f0] mb-1">Transfer Ownership</h2>
            <p className="text-sm text-[#999] mb-5">
              Reassign primary admin of <strong className="text-[#0a0a0a] dark:text-[#f0f0f0]">{transferClub.name}</strong>.
              The current admin will become a regular member.
            </p>

            {clubMembers.length === 0 ? (
              <p className="text-sm text-[#999]">No approved members found for this club.</p>
            ) : (
              <div className="flex flex-col gap-2 mb-5 max-h-64 overflow-y-auto">
                {clubMembers.map((m: any) => {
                  const isCurrentAdmin = m.id === transferClub.admin_id
                  return (
                    <label key={m.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
                        ${isCurrentAdmin
                          ? 'border-[#e8e8e8] dark:border-[#252525] opacity-50 cursor-not-allowed'
                          : selectedNewAdmin === m.id
                            ? 'border-[#C0121F] bg-[#fdf2f2] dark:bg-[#1a0a0a] cursor-pointer'
                            : 'border-[#e8e8e8] dark:border-[#252525] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] cursor-pointer'}`}>
                      <input type="radio" name="pa-new-admin" value={m.id}
                        checked={selectedNewAdmin === m.id}
                        disabled={isCurrentAdmin}
                        onChange={() => !isCurrentAdmin && setSelectedNewAdmin(m.id)}
                        className="accent-[#C0121F]" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium dark:text-[#f0f0f0]">{m.full_name}</div>
                        <div className="text-xs text-[#999]">{m.email}
                          {m.role === 'co_admin' && <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium">Co-Admin</span>}
                          {isCurrentAdmin && <span className="ml-2 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">Current Admin</span>}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmTransfer(true)}
                disabled={!selectedNewAdmin || transferring}
                className="btn-primary flex-1">
                Transfer
              </button>
              <button onClick={() => setTransferClub(null)} className="btn-ghost flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.current ? 'Deactivate this club?' : 'Activate this club?'}
        description={
          confirmToggle?.current
            ? 'This will hide the club from students and prevent new applications.'
            : 'This will make the club visible and allow students to apply.'
        }
        confirmLabel={confirmToggle?.current ? 'Deactivate' : 'Activate'}
        danger={confirmToggle?.current}
        onConfirm={() => confirmToggle && doToggle(confirmToggle.id, confirmToggle.current)}
        onCancel={() => setConfirmToggle(null)}
      />

      <ConfirmDialog
        open={confirmTransfer}
        title="Confirm ownership transfer?"
        description={`${clubMembers.find(m => m.id === selectedNewAdmin)?.full_name || 'This member'} will become the primary admin of ${transferClub?.name}. The current admin will become a regular member.`}
        confirmLabel={transferring ? 'Transferring...' : 'Yes, Transfer'}
        danger
        onConfirm={doTransfer}
        onCancel={() => setConfirmTransfer(false)}
      />
    </div>
  )
}

// ─── Users Management ────────────────────────────────────────────────────────

export function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    supabase.from('users').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) toast('Failed to load users', 'error')
        else setUsers((data as User[]) || [])
        setLoading(false)
      })
  }, [])

  const roleCls: Record<string, string> = {
    platform_admin: 'bg-purple-50 text-purple-700 border-purple-200/60',
    club_admin: 'bg-amber-50 text-amber-700 border-amber-200/60',
    co_admin: 'bg-amber-50 text-amber-600 border-amber-200/60',
    student: 'bg-[#f4f4f4] text-[#6b6b6b] border-[#ebebeb]',
  }

  return (
    <div className="page-container fade-up">
      <PageHeader title="Users" subtitle={`${users.length} registered users`} />
      {loading ? <Skeleton className="h-40" /> : (
        <div className="bg-white dark:bg-[#111111] rounded-2xl border border-[#ebebeb] dark:border-[#252525] overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {users.map((u, i) => (
            <div key={u.id} className={`flex items-center gap-4 px-5 py-4 ${i < users.length - 1 ? 'border-b border-[#f4f4f4] dark:border-[#1e1e1e]' : ''}`}>
              <Avatar name={u.full_name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-[#0a0a0a] dark:text-[#f0f0f0]">{u.full_name}</div>
                <div className="text-xs text-[#ababab] truncate">{u.email}</div>
              </div>
              <span className={`badge border text-[10px] ${roleCls[u.role] || roleCls.student}`}>
                {u.role.replace('_', ' ')}
              </span>
              <StatusBadge status={u.is_approved ? 'approved' : 'pending'} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
