import React, { useEffect, useState, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle, XCircle, MapPin, Pencil, Trash2, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useMyClub } from '../../hooks/useMyClub'
import { useImageUpload } from '../../hooks/useImageUpload'
import { ClubMember, Announcement, Event } from '../../types'
import { PageHeader, Avatar, StatusBadge, Skeleton, EmptyState, AnnBadge, DateBlock } from '../../components/ui'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import ImageUploadField from '../../components/shared/ImageUploadField'

// ─── Members Management ─────────────────────────────────────────────────────

export function AdminMembersPage() {
  const { toast } = useToast()
  const { club, clubId, isPrimaryAdmin, loading: clubLoading } = useMyClub()
  const [members, setMembers] = useState<ClubMember[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'approved' | 'pending' | 'co_admins'>('pending')
  const [confirm, setConfirm] = useState<{ memberId: string; userId: string } | null>(null)
  const [confirmRemoveCo, setConfirmRemoveCo] = useState<{ userId: string; name: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const load = async () => {
    if (!clubId) return
    const { data, error } = await supabase
      .from('club_members').select('*, user:users(*)').eq('club_id', clubId).order('joined_at', { ascending: false })
    if (error) toast('Failed to load members', 'error')
    else setMembers((data as ClubMember[]) || [])
    setLoading(false)
  }

  useEffect(() => { if (clubId) load() }, [clubId]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (memberId: string, userId: string, status: 'approved' | 'rejected') => {
    if (actionLoading || !clubId) return
    setActionLoading(true)

    if (status === 'rejected') {
      // Item 12: delete row instead of setting status=rejected so the student can re-apply
      const { error } = await supabase.from('club_members').delete().eq('id', memberId)
      if (error) { toast('Failed to reject application', 'error'); setActionLoading(false); return }
    } else {
      const { error } = await supabase.from('club_members').update({ status }).eq('id', memberId)
      if (error) { toast('Failed to update status', 'error'); setActionLoading(false); return }
    }

    await supabase.from('notifications').insert({
      user_id: userId,
      type: status === 'approved' ? 'application_accepted' : 'application_rejected',
      title: status === 'approved' ? 'Application Accepted!' : 'Application Status Update',
      body: status === 'approved' ? 'Your club membership was approved' : 'Your application was not accepted at this time',
      is_read: false,
    })
    toast(status === 'approved' ? 'Member approved' : 'Application rejected', status === 'approved' ? 'success' : 'info')
    setConfirm(null); setActionLoading(false); load()
  }

  // Item 9: guard against promoting someone already a co_admin in another club
  const promoteToCoAdmin = async (userId: string) => {
    const { data: existingRole } = await supabase
      .from('users').select('role').eq('id', userId).single()
    if (existingRole?.role === 'co_admin') {
      toast('This member is already a co-admin in another club', 'error')
      return
    }
    const { error } = await supabase.from('users').update({ role: 'co_admin' }).eq('id', userId)
    if (error) toast('Failed to promote member', 'error')
    else { toast('Member promoted to co-admin', 'success'); load() }
  }

  // Item 5: notify on demotion + Item 11 handled in leave flow
  const removeCoAdmin = async (userId: string) => {
    const { error } = await supabase.from('users').update({ role: 'student' }).eq('id', userId)
    if (error) { toast('Failed to demote co-admin', 'error'); return }
    if (club) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'application_rejected',
        title: 'Co-admin role removed',
        body: `You have been removed as co-admin of ${club.name}. You remain a regular member.`,
        is_read: false,
        link: '/my-clubs',
      })
    }
    toast('Co-admin demoted to member', 'success')
    setConfirmRemoveCo(null)
    load()
  }

  const coAdminMembers = members.filter(m => m.user?.role === 'co_admin')
  const displayed = tab === 'co_admins' ? [] : members.filter(m => m.status === tab)
  if (clubLoading || loading) return <div className="page-container"><Skeleton className="h-40" /></div>

  return (
    <div className="page-container fade-up">
      <PageHeader title="Members" />
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['pending', 'approved', ...(isPrimaryAdmin ? ['co_admins'] : [])] as const).map(t => (
          <button key={t} onClick={() => setTab(t as any)}
            className={`px-4 py-1.5 text-sm rounded-full border font-medium capitalize transition-colors
              ${tab === t ? 'bg-[#C0121F] text-white border-[#C0121F]' : 'border-[#e8e8e8] text-[#555] dark:border-[#2a2a2a] dark:text-[#a0a0a0]'}`}>
            {t === 'co_admins' ? `Co-Admins (${coAdminMembers.length})` : `${t} (${members.filter(m => m.status === t).length})`}
          </button>
        ))}
      </div>

      {/* Co-Admins tab — primary admin only */}
      {tab === 'co_admins' && isPrimaryAdmin && (
        <>
          <div className="mb-4 p-3 rounded-xl text-sm text-[#6b6b6b] dark:text-[#909090] bg-[#f9f9f9] dark:bg-[#111] border border-[#e8e8e8] dark:border-[#252525]">
            Co-admins can post announcements, create events, approve/reject members, and chat. Only you can manage settings and promote/demote co-admins.
          </div>
          {coAdminMembers.length === 0 ? (
            <EmptyState title="No co-admins yet" description="Promote an approved member to co-admin from the Approved tab" />
          ) : (
            <div className="card overflow-hidden p-0">
              {coAdminMembers.map((m, i) => (
                <div key={m.id} className={`flex items-center gap-4 p-4 ${i < coAdminMembers.length - 1 ? 'border-b border-[#e8e8e8] dark:border-[#2a2a2a]' : ''}`}>
                  <Avatar name={m.user?.full_name || '?'} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm dark:text-[#f5f5f5]">{m.user?.full_name}</div>
                    <div className="text-xs text-[#999]">{m.user?.email}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">Co-Admin</span>
                  <button onClick={() => setConfirmRemoveCo({ userId: m.user_id, name: m.user?.full_name || '' })}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[#C0121F] transition-colors" title="Demote to member">
                    <XCircle size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Approved / Pending tabs */}
      {tab !== 'co_admins' && (
        displayed.length === 0 ? (
          <EmptyState title={tab === 'pending' ? 'No pending applications' : 'No members yet'} />
        ) : (
          <div className="card overflow-hidden p-0">
            {displayed.map((m, i) => (
              <div key={m.id} className={`flex items-center gap-4 p-4 ${i < displayed.length - 1 ? 'border-b border-[#e8e8e8] dark:border-[#2a2a2a]' : ''}`}>
                <Avatar name={m.user?.full_name || '?'} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm dark:text-[#f5f5f5]">{m.user?.full_name}</div>
                  <div className="text-xs text-[#999]">{m.user?.email} · {m.user?.major}</div>
                </div>
                <StatusBadge status={m.status} />
                {m.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateStatus(m.id, m.user_id, 'approved')}
                      className="text-green-600 hover:text-green-700 p-1 transition-colors" title="Approve">
                      <CheckCircle size={18} />
                    </button>
                    <button onClick={() => setConfirm({ memberId: m.id, userId: m.user_id })}
                      className="text-[#C0121F] hover:text-[#a00f1a] p-1 transition-colors" title="Reject">
                      <XCircle size={18} />
                    </button>
                  </div>
                )}
                {m.status === 'approved' && isPrimaryAdmin && m.user?.role !== 'co_admin' && (
                  <button onClick={() => promoteToCoAdmin(m.user_id)}
                    className="text-xs px-2.5 py-1 rounded-full border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/20 transition-colors font-medium">
                    Make Co-Admin
                  </button>
                )}
                {m.status === 'approved' && m.user?.role === 'co_admin' && (
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">Co-Admin</span>
                )}
              </div>
            ))}
          </div>
        )
      )}

      <ConfirmDialog
        open={!!confirm}
        title="Reject application?"
        description="This will reject the student's membership application. They will be notified."
        confirmLabel="Reject"
        danger
        onConfirm={() => confirm && updateStatus(confirm.memberId, confirm.userId, 'rejected')}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={!!confirmRemoveCo}
        title="Demote co-admin?"
        description={`${confirmRemoveCo?.name} will return to being a regular club member.`}
        confirmLabel="Demote"
        danger
        onConfirm={() => confirmRemoveCo && removeCoAdmin(confirmRemoveCo.userId)}
        onCancel={() => setConfirmRemoveCo(null)}
      />
    </div>
  )
}

// ─── New Announcement ────────────────────────────────────────────────────────

export function NewAnnouncementPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { clubId, loading: clubLoading } = useMyClub()
  const [form, setForm] = useState({ title: '', body: '', category: 'general', tags: '' })
  const [loading, setLoading] = useState(false)
  const imgUpload = useImageUpload()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!clubId) { toast('Club not found', 'error'); return }
    if (!profile?.id) { toast('Not authenticated', 'error'); return }
    setLoading(true)

    let imageUrl: string | null = null
    if (imgUpload.file) {
      const ext = imgUpload.file.name.split('.').pop()
      imageUrl = await imgUpload.upload(`announcements/${clubId}-${Date.now()}.${ext}`)
      if (!imageUrl) { setLoading(false); return }
    }

    const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const { error } = await supabase.from('announcements').insert({
      title: form.title, body: form.body, category: form.category,
      tags: tagsArray, club_id: clubId, author_id: profile.id, image_url: imageUrl,
    })
    if (error) toast('Failed to post announcement', 'error')
    else { toast('Announcement posted!', 'success'); navigate('/admin') }
    setLoading(false)
  }

  if (clubLoading) return <div className="page-container"><Skeleton className="h-40" /></div>

  return (
    <div className="page-container fade-up">
      <PageHeader title="Post Announcement" />
      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Title</label>
            <input className="input" placeholder="Announcement title" value={form.title} onChange={set('title')} required />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={set('category')}>
              {['event', 'recruitment', 'news', 'general'].map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tags <span className="text-[#ababab] font-normal">(comma-separated, e.g. tech, workshop)</span></label>
            <input className="input" placeholder="e.g. workshop, open-to-all, beginner-friendly" value={form.tags} onChange={set('tags')} />
          </div>
          <div>
            <label className="label">Content</label>
            <textarea className="input resize-none h-48" placeholder="Write your announcement..." value={form.body} onChange={set('body')} required />
          </div>

          <ImageUploadField
            preview={imgUpload.preview}
            onFile={imgUpload.setFile}
            onRemove={imgUpload.removeFile}
            label="Cover Image (optional)"
            uploading={imgUpload.uploading}
          />

          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={loading || imgUpload.uploading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {imgUpload.uploading ? 'Uploading...' : 'Posting...'}
                </span>
              ) : 'Post Announcement'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => navigate('/admin')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── New Event ───────────────────────────────────────────────────────────────

export function NewEventPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { clubId, loading: clubLoading } = useMyClub()
  const [form, setForm] = useState({ title: '', description: '', location: '', event_date: '', tags: '' })
  const [loading, setLoading] = useState(false)
  const imgUpload = useImageUpload()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!clubId) { toast('Club not found', 'error'); return }
    if (!profile?.id) { toast('Not authenticated', 'error'); return }
    setLoading(true)

    let imageUrl: string | null = null
    if (imgUpload.file) {
      const ext = imgUpload.file.name.split('.').pop()
      imageUrl = await imgUpload.upload(`events/${clubId}-${Date.now()}.${ext}`)
      if (!imageUrl) { setLoading(false); return }
    }

    const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const { error } = await supabase.from('events').insert({
      title: form.title, description: form.description, location: form.location,
      event_date: form.event_date, tags: tagsArray,
      club_id: clubId, created_by: profile.id, image_url: imageUrl,
    })
    if (error) toast('Failed to create event', 'error')
    else { toast('Event created!', 'success'); navigate('/admin') }
    setLoading(false)
  }

  if (clubLoading) return <div className="page-container"><Skeleton className="h-40" /></div>

  return (
    <div className="page-container fade-up">
      <PageHeader title="Create Event" />
      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Event Title</label>
            <input className="input" placeholder="Workshop: Introduction to React" value={form.title} onChange={set('title')} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date & Time</label>
              <input className="input" type="datetime-local" value={form.event_date} onChange={set('event_date')} required />
            </div>
            <div>
              <label className="label"><MapPin size={12} className="inline" /> Location</label>
              <input className="input" placeholder="Building A, Room 101" value={form.location} onChange={set('location')} required />
            </div>
          </div>
          <div>
            <label className="label">Tags <span className="text-[#ababab] font-normal">(comma-separated)</span></label>
            <input className="input" placeholder="e.g. workshop, beginner-friendly, free" value={form.tags} onChange={set('tags')} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none h-36" placeholder="Event details..." value={form.description} onChange={set('description')} />
          </div>

          <ImageUploadField
            preview={imgUpload.preview}
            onFile={imgUpload.setFile}
            onRemove={imgUpload.removeFile}
            label="Cover Image (optional)"
            uploading={imgUpload.uploading}
          />

          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={loading || imgUpload.uploading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {imgUpload.uploading ? 'Uploading...' : 'Creating...'}
                </span>
              ) : 'Create Event'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => navigate('/admin')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Club Settings ───────────────────────────────────────────────────────────

export function ClubSettingsPage() {
  const { toast } = useToast()
  const { club, clubId, loading, isPrimaryAdmin } = useMyClub()
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const logoUpload = useImageUpload({ maxSizeMB: 2 })

  // Transfer ownership state
  const [members, setMembers] = useState<any[]>([])
  const [selectedNewAdmin, setSelectedNewAdmin] = useState<string>('')
  const [transferring, setTransferring] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [confirmTransfer, setConfirmTransfer] = useState(false)

  useEffect(() => {
    if (club) {
      setName(club.name)
      setDescription(club.description)
      setCategory(club.category)
    }
  }, [club])

  // Load approved members (excluding self) for ownership transfer
  useEffect(() => {
    if (!clubId || !profile) return
    supabase.from('club_members')
      .select('user_id, user:users(id, full_name, email, role)')
      .eq('club_id', clubId)
      .eq('status', 'approved')
      .then(({ data }) => {
        const eligible = (data || [])
          .map((m: any) => m.user)
          .filter((u: any) => u && u.id !== profile.id)
        setMembers(eligible)
      })
  }, [clubId, profile])

  // Existing logo URL (used when no new file is selected)
  const existingLogoUrl = club?.logo_url ?? null
  const displayPreview = logoUpload.preview ?? existingLogoUrl

  const handleTransfer = async () => {
    if (!clubId || !selectedNewAdmin || !profile) return
    setTransferring(true)
    try {
      // 1. Promote new admin to club_admin role
      const { error: e1 } = await supabase.from('users').update({ role: 'club_admin' }).eq('id', selectedNewAdmin)
      if (e1) throw e1
      // 2. Update clubs.admin_id to new admin
      const { error: e2 } = await supabase.from('clubs').update({ admin_id: selectedNewAdmin }).eq('id', clubId)
      if (e2) throw e2
      // 3. Demote old admin (self) back to student
      const { error: e3 } = await supabase.from('users').update({ role: 'student' }).eq('id', profile.id)
      if (e3) throw e3
      // 4. Ensure old admin stays as approved member (they're already in club_members)

      // 5. Remove new admin's club_members row — they're now identified by clubs.admin_id
      await supabase.from('club_members').delete()
        .eq('club_id', clubId).eq('user_id', selectedNewAdmin)

      // 6. Notify new admin of promotion
      if (club) {
        await supabase.from('notifications').insert({
          user_id: selectedNewAdmin,
          type: 'application_accepted',
          title: 'You are now the primary admin!',
          body: `You have been made the primary admin of ${club.name}.`,
          is_read: false,
          link: '/admin',
        })
      }

      toast('Ownership transferred successfully', 'success')
      await refreshProfile()
      navigate('/dashboard')
    } catch {
      toast('Failed to transfer ownership', 'error')
    }
    setTransferring(false)
    setConfirmTransfer(false)
  }

  const handleSave = async () => {
    if (!clubId) return
    setSaving(true)

    let logoUrl = existingLogoUrl
    if (logoUpload.file) {
      const ext = logoUpload.file.name.split('.').pop()
      const uploaded = await logoUpload.upload(`club-logos/${clubId}-${Date.now()}.${ext}`)
      if (!uploaded) { setSaving(false); return }
      logoUrl = uploaded
    } else if (!displayPreview) {
      logoUrl = null
    }

    const { error } = await supabase.from('clubs').update({
      name, description, category, logo_url: logoUrl,
    }).eq('id', clubId)

    if (error) toast('Failed to save settings', 'error')
    else toast('Settings saved!', 'success')
    setSaving(false)
  }

  if (loading) return <div className="page-container"><Skeleton className="h-40" /></div>

  if (!isPrimaryAdmin) return (
    <div className="page-container">
      <div className="card max-w-md p-8 text-center">
        <h2 className="font-serif text-xl mb-2">Primary Admin Only</h2>
        <p className="text-sm text-[#555] dark:text-[#a0a0a0]">Only the primary club admin can change club settings.</p>
      </div>
    </div>
  )

  return (
    <div className="page-container fade-up">
      <PageHeader title="Club Settings" />

      {/* Live preview */}
      <div className="max-w-2xl mb-6">
        <p className="text-xs font-semibold text-[#ababab] uppercase tracking-widest mb-3">Preview</p>
        <div
          className="h-32 rounded-2xl flex items-center justify-center relative overflow-hidden border border-[#ebebeb] dark:border-[#252525]"
          style={{ backgroundColor: '#111111' }}
        >
          {displayPreview
            ? <img src={displayPreview} alt="Club logo" className="w-full h-full object-cover rounded-2xl" />
            : <div className="w-full h-full absolute inset-0 bg-[#C0121F] opacity-30 rounded-2xl" />
          }
        </div>
      </div>

      <div className="card max-w-2xl flex flex-col gap-5">
        <div>
          <label className="label">Club Name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input resize-none h-32" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
            {['technology', 'arts', 'sports', 'business', 'environment', 'other'].map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>

        <ImageUploadField
          preview={displayPreview}
          onFile={logoUpload.setFile}
          onRemove={() => { logoUpload.removeFile() }}
          label="Club Logo Image"
          maxSizeMB={2}
          variant="logo"
          uploading={logoUpload.uploading}
        />

        <button onClick={handleSave} disabled={saving || logoUpload.uploading} className="btn-primary w-fit">
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {logoUpload.uploading ? 'Uploading...' : 'Saving...'}
            </span>
          ) : 'Save Changes'}
        </button>
      </div>

      {/* ── Transfer Ownership ── */}
      <div className="max-w-2xl mt-8">
        <div className="rounded-2xl border border-[#e8e8e8] dark:border-[#252525] overflow-hidden">
          <button
            onClick={() => setShowTransfer(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#fafafa] dark:hover:bg-[#111] transition-colors"
          >
            <div>
              <div className="font-medium text-sm text-[#C0121F]">Transfer Club Ownership</div>
              <div className="text-xs text-[#999] mt-0.5">Hand over primary admin to another member. You'll become a regular member.</div>
            </div>
            <span className="text-[#999] text-lg">{showTransfer ? '−' : '+'}</span>
          </button>

          {showTransfer && (
            <div className="px-5 pb-5 border-t border-[#e8e8e8] dark:border-[#252525]">
              <p className="text-sm text-[#555] dark:text-[#a0a0a0] mt-4 mb-4">
                Select an approved member to become the new primary admin. This action cannot be undone by you — only the platform admin can reverse it.
              </p>

              {members.length === 0 ? (
                <p className="text-sm text-[#999]">No eligible members found. The club needs at least one other approved member.</p>
              ) : (
                <>
                  <div className="flex flex-col gap-2 mb-4">
                    {members.map((m: any) => (
                      <label key={m.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                          ${selectedNewAdmin === m.id
                            ? 'border-[#C0121F] bg-[#fdf2f2] dark:bg-[#1a0a0a]'
                            : 'border-[#e8e8e8] dark:border-[#252525] hover:bg-[#fafafa] dark:hover:bg-[#111]'}`}>
                        <input
                          type="radio"
                          name="new-admin"
                          value={m.id}
                          checked={selectedNewAdmin === m.id}
                          onChange={() => setSelectedNewAdmin(m.id)}
                          className="accent-[#C0121F]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium dark:text-[#f0f0f0]">{m.full_name}</div>
                          <div className="text-xs text-[#999]">{m.email}
                            {m.role === 'co_admin' && <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium">Co-Admin</span>}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={() => setConfirmTransfer(true)}
                    disabled={!selectedNewAdmin || transferring}
                    className="btn-primary w-fit"
                    style={{ background: '#C0121F' }}
                  >
                    Transfer Ownership
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmTransfer}
        title="Transfer club ownership?"
        description={`${members.find((m: any) => m.id === selectedNewAdmin)?.full_name || 'This member'} will become the primary admin. You will become a regular club member and lose admin access.`}
        confirmLabel="Yes, Transfer"
        danger
        onConfirm={handleTransfer}
        onCancel={() => setConfirmTransfer(false)}
      />
    </div>
  )
}

// ─── Announcements List ───────────────────────────────────────────────────────

export function AdminAnnouncementsPage() {
  const { toast } = useToast()
  const { clubId } = useMyClub()
  const navigate = useNavigate()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = async () => {
    if (!clubId) return
    const { data, error } = await supabase.from('announcements').select('*').eq('club_id', clubId).order('created_at', { ascending: false })
    if (error) toast('Failed to load announcements', 'error')
    setAnnouncements((data as Announcement[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    if (clubId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId])

  const handleDelete = async () => {
    if (!deleteId) return
    const { error } = await supabase.from('announcements').delete().eq('id', deleteId)
    if (error) toast('Failed to delete', 'error')
    else { toast('Announcement deleted', 'success'); setAnnouncements(a => a.filter(x => x.id !== deleteId)) }
    setDeleteId(null)
  }

  return (
    <div className="page-container fade-up">
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Announcements" />
        <button onClick={() => navigate('/admin/announcements/new')} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> New
        </button>
      </div>
      {loading ? <Skeleton className="h-40" /> : announcements.length === 0 ? (
        <EmptyState title="No announcements yet" action={<button onClick={() => navigate('/admin/announcements/new')} className="btn-primary">Post First Announcement</button>} />
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map(ann => (
            <div key={ann.id} className="card overflow-hidden p-0 flex flex-row items-stretch">
              {ann.image_url && (
                <img src={ann.image_url} alt={ann.title} className="w-24 h-full object-cover shrink-0" />
              )}
              <div className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <AnnBadge category={ann.category} />
                    <span className="text-[10px] text-[#ababab]">{new Date(ann.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="font-medium text-sm dark:text-[#f5f5f5] truncate">{ann.title}</div>
                  <p className="text-xs text-[#999] line-clamp-1 mt-0.5">{ann.body}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => navigate(`/admin/announcements/${ann.id}/edit`)}
                    className="p-2 rounded-lg hover:bg-[#f4f4f4] dark:hover:bg-[#1e1e1e] text-[#6b6b6b] dark:text-[#909090] transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeleteId(ann.id)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[#C0121F] transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Announcement"
        description="This announcement will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

// ─── Edit Announcement ────────────────────────────────────────────────────────

export function EditAnnouncementPage() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const { clubId } = useMyClub()
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', body: '', category: 'general', tags: '' })
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const imgUpload = useImageUpload()

  useEffect(() => {
    if (!id) return
    supabase.from('announcements').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error) toast('Failed to load announcement', 'error')
        if (data) {
          setForm({ title: data.title, body: data.body, category: data.category, tags: (data.tags || []).join(', ') })
          setExistingImageUrl(data.image_url ?? null)
        }
        setLoading(false)
      })
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!id || !clubId) return
    setSaving(true)

    let imageUrl = existingImageUrl
    if (imgUpload.file) {
      const ext = imgUpload.file.name.split('.').pop()
      const uploaded = await imgUpload.upload(`announcements/${clubId}-${Date.now()}.${ext}`)
      if (!uploaded) { setSaving(false); return }
      imageUrl = uploaded
    } else if (!imgUpload.preview && !existingImageUrl) {
      imageUrl = null
    }

    const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const { error } = await supabase.from('announcements').update({
      title: form.title, body: form.body, category: form.category, tags: tagsArray, image_url: imageUrl
    }).eq('id', id)
    if (error) toast('Failed to update announcement', 'error')
    else { toast('Announcement updated!', 'success'); navigate('/admin/announcements') }
    setSaving(false)
  }

  const displayPreview = imgUpload.preview ?? existingImageUrl

  if (loading) return <div className="page-container"><Skeleton className="h-40" /></div>

  return (
    <div className="page-container fade-up">
      <PageHeader title="Edit Announcement" />
      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={set('title')} required />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={set('category')}>
              {['event', 'recruitment', 'news', 'general'].map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tags <span className="text-[#ababab] font-normal">(comma-separated)</span></label>
            <input className="input" placeholder="e.g. workshop, open-to-all" value={form.tags} onChange={set('tags')} />
          </div>
          <div>
            <label className="label">Content</label>
            <textarea className="input resize-none h-48" value={form.body} onChange={set('body')} required />
          </div>
          <ImageUploadField
            preview={displayPreview}
            onFile={imgUpload.setFile}
            onRemove={() => { imgUpload.removeFile(); setExistingImageUrl(null) }}
            label="Cover Image (optional)"
            uploading={imgUpload.uploading}
          />
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={saving || imgUpload.uploading}>
              {saving ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</span> : 'Save Changes'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => navigate('/admin/announcements')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Events List ──────────────────────────────────────────────────────────────

export function AdminEventsPage() {
  const { toast } = useToast()
  const { clubId } = useMyClub()
  const navigate = useNavigate()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = async () => {
    if (!clubId) return
    const { data, error } = await supabase.from('events').select('*').eq('club_id', clubId).order('event_date', { ascending: false })
    if (error) toast('Failed to load events', 'error')
    setEvents((data as Event[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    if (clubId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId])

  const handleDelete = async () => {
    if (!deleteId) return
    const { error } = await supabase.from('events').delete().eq('id', deleteId)
    if (error) toast('Failed to delete', 'error')
    else { toast('Event deleted', 'success'); setEvents(ev => ev.filter(x => x.id !== deleteId)) }
    setDeleteId(null)
  }

  return (
    <div className="page-container fade-up">
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Events" />
        <button onClick={() => navigate('/admin/events/new')} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> New
        </button>
      </div>
      {loading ? <Skeleton className="h-40" /> : events.length === 0 ? (
        <EmptyState title="No events yet" action={<button onClick={() => navigate('/admin/events/new')} className="btn-primary">Create First Event</button>} />
      ) : (
        <div className="flex flex-col gap-3">
          {events.map(ev => (
            <div key={ev.id} className="card overflow-hidden p-0 flex flex-row items-stretch">
              {ev.image_url && (
                <img src={ev.image_url} alt={ev.title} className="w-24 h-full object-cover shrink-0" />
              )}
              <div className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0">
                <DateBlock date={ev.event_date} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm dark:text-[#f5f5f5] truncate">{ev.title}</div>
                  <div className="text-xs text-[#999] flex items-center gap-1 mt-0.5"><MapPin size={10} /> {ev.location}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => navigate(`/admin/events/${ev.id}/edit`)}
                    className="p-2 rounded-lg hover:bg-[#f4f4f4] dark:hover:bg-[#1e1e1e] text-[#6b6b6b] dark:text-[#909090] transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeleteId(ev.id)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[#C0121F] transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Event"
        description="This event will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

// ─── Edit Event ───────────────────────────────────────────────────────────────

export function EditEventPage() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const { clubId } = useMyClub()
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', description: '', location: '', event_date: '', tags: '' })
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const imgUpload = useImageUpload()

  useEffect(() => {
    if (!id) return
    supabase.from('events').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error) toast('Failed to load event', 'error')
        if (data) {
          const localDate = data.event_date ? new Date(data.event_date).toISOString().slice(0, 16) : ''
          setForm({ title: data.title, description: data.description ?? '', location: data.location ?? '', event_date: localDate, tags: (data.tags || []).join(', ') })
          setExistingImageUrl(data.image_url ?? null)
        }
        setLoading(false)
      })
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!id || !clubId) return
    setSaving(true)

    let imageUrl = existingImageUrl
    if (imgUpload.file) {
      const ext = imgUpload.file.name.split('.').pop()
      const uploaded = await imgUpload.upload(`events/${clubId}-${Date.now()}.${ext}`)
      if (!uploaded) { setSaving(false); return }
      imageUrl = uploaded
    } else if (!imgUpload.preview && !existingImageUrl) {
      imageUrl = null
    }

    const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const { error } = await supabase.from('events').update({
      title: form.title, description: form.description, location: form.location,
      event_date: form.event_date, tags: tagsArray, image_url: imageUrl
    }).eq('id', id)
    if (error) toast('Failed to update event', 'error')
    else { toast('Event updated!', 'success'); navigate('/admin/events') }
    setSaving(false)
  }

  const displayPreview = imgUpload.preview ?? existingImageUrl

  if (loading) return <div className="page-container"><Skeleton className="h-40" /></div>

  return (
    <div className="page-container fade-up">
      <PageHeader title="Edit Event" />
      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Event Title</label>
            <input className="input" value={form.title} onChange={set('title')} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date & Time</label>
              <input className="input" type="datetime-local" value={form.event_date} onChange={set('event_date')} required />
            </div>
            <div>
              <label className="label"><MapPin size={12} className="inline" /> Location</label>
              <input className="input" value={form.location} onChange={set('location')} required />
            </div>
          </div>
          <div>
            <label className="label">Tags <span className="text-[#ababab] font-normal">(comma-separated)</span></label>
            <input className="input" placeholder="e.g. workshop, beginner-friendly" value={form.tags} onChange={set('tags')} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none h-36" value={form.description} onChange={set('description')} />
          </div>
          <ImageUploadField
            preview={displayPreview}
            onFile={imgUpload.setFile}
            onRemove={() => { imgUpload.removeFile(); setExistingImageUrl(null) }}
            label="Cover Image (optional)"
            uploading={imgUpload.uploading}
          />
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={saving || imgUpload.uploading}>
              {saving ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</span> : 'Save Changes'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => navigate('/admin/events')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
