import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, ChevronLeft, MessageSquare, Users, Lock, Plus, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Club, Message, DirectMessage, User } from '../../types'
import { Avatar, EmptyState } from '../../components/ui'

// ─── Types ────────────────────────────────────────────────────────────────────
interface DMThread {
  clubId: string
  club: Club
  otherUserId: string
  otherUserName: string
  lastMessage: string
  lastAt: string
  unreadCount: number
}

interface DMCandidate {
  id: string
  full_name: string
  email: string
  role: string
  clubId: string
  clubName: string
}

// ─── Group Chat Panel ─────────────────────────────────────────────────────────
function GroupChat({ club, profile }: { club: Club; profile: User }) {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([])
    let cancelled = false
    supabase.from('messages').select('*, sender:users(full_name, id)')
      .eq('club_id', club.id).order('created_at')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) toast('Failed to load messages', 'error')
        else setMessages((data as Message[]) || [])
      })
    const channel = supabase.channel(`group:${club.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `club_id=eq.${club.id}` },
        async (payload) => {
          if (cancelled) return
          const { data } = await supabase.from('messages').select('*, sender:users(full_name, id)').eq('id', payload.new.id).single()
          if (data && !cancelled) setMessages(m => [...m, data as Message])
        })
      .subscribe()
    return () => { cancelled = true; channel.unsubscribe().then(() => supabase.removeChannel(channel)) }
  }, [club.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!newMsg.trim() || sending) return
    setSending(true)
    const { error } = await supabase.from('messages').insert({ club_id: club.id, sender_id: profile.id, body: newMsg.trim() })
    if (error) toast('Failed to send message', 'error')
    else setNewMsg('')
    setSending(false)
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-3">
        {messages.length === 0
          ? <EmptyState title="No messages yet" description="Be the first to say something!" />
          : messages.map(msg => {
            const isMe = msg.sender_id === profile?.id
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                {!isMe && <Avatar name={msg.sender?.full_name || '?'} size="sm" />}
                <div className={`max-w-[70%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <span className="text-xs text-[#999] px-1">{msg.sender?.full_name}</span>}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm
                    ${isMe ? 'bg-[#C0121F] text-white rounded-br-sm' : 'bg-white dark:bg-[#1a1a1a] text-[#0f0f0f] dark:text-[#f5f5f5] border border-[#e8e8e8] dark:border-[#2a2a2a] rounded-bl-sm'}`}>
                    {msg.body}
                  </div>
                  <span className="text-[10px] text-[#999] px-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            )
          })}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 bg-white dark:bg-[#0f0f0f] border-t border-[#e8e8e8] dark:border-[#2a2a2a] flex items-center gap-3">
        <input className="input flex-1" placeholder="Type a message…" value={newMsg} onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
        <button onClick={send} disabled={sending || !newMsg.trim()} className="btn-primary py-2 px-3"><Send size={16} /></button>
      </div>
    </>
  )
}

// ─── DM Conversation Panel ────────────────────────────────────────────────────
function DMConversation({ clubId, otherUserId, otherUserName, profile }: {
  clubId: string; otherUserId: string; otherUserName: string; profile: User
}) {
  const { toast } = useToast()
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([])
    let cancelled = false
    supabase.from('direct_messages')
      .select('*, sender:users!sender_id(id,full_name)')
      .eq('club_id', clubId)
      .or(`and(sender_id.eq.${profile.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${profile.id})`)
      .order('created_at')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) toast('Failed to load messages', 'error')
        else setMessages((data as DirectMessage[]) || [])
        supabase.from('direct_messages').update({ is_read: true })
          .eq('club_id', clubId).eq('sender_id', otherUserId).eq('recipient_id', profile.id).eq('is_read', false)
          .then(() => {})
      })
    const channel = supabase.channel(`dm:${clubId}:${[profile.id, otherUserId].sort().join('-')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        async (payload) => {
          if (cancelled) return
          const p = payload.new
          if (p.club_id !== clubId) return
          if (!((p.sender_id === profile.id && p.recipient_id === otherUserId) ||
                (p.sender_id === otherUserId && p.recipient_id === profile.id))) return
          const { data } = await supabase.from('direct_messages').select('*, sender:users!sender_id(id,full_name)').eq('id', p.id).single()
          if (data && !cancelled) setMessages(m => [...m, data as DirectMessage])
        })
      .subscribe()
    return () => { cancelled = true; channel.unsubscribe().then(() => supabase.removeChannel(channel)) }
  }, [clubId, otherUserId, profile.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!newMsg.trim() || sending) return
    setSending(true)
    const body = newMsg.trim()
    const { error } = await supabase.from('direct_messages').insert({
      club_id: clubId, sender_id: profile.id, recipient_id: otherUserId, body
    })
    if (error) {
      toast('Failed to send message', 'error')
    } else {
      setNewMsg('')
      await supabase.from('notifications').insert({
        user_id: otherUserId,
        type: 'new_direct_message',
        title: `New message from ${profile.full_name}`,
        body: body.length > 80 ? body.slice(0, 80) + '…' : body,
        is_read: false,
        link: '/messages',
      })
    }
    setSending(false)
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-3">
        {messages.length === 0
          ? <EmptyState title="No messages yet" description={`Start a private conversation with ${otherUserName}`} />
          : messages.map(msg => {
            const isMe = msg.sender_id === profile?.id
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                {!isMe && <Avatar name={msg.sender?.full_name || '?'} size="sm" />}
                <div className={`max-w-[70%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm
                    ${isMe ? 'bg-[#C0121F] text-white rounded-br-sm' : 'bg-white dark:bg-[#1a1a1a] text-[#0f0f0f] dark:text-[#f5f5f5] border border-[#e8e8e8] dark:border-[#2a2a2a] rounded-bl-sm'}`}>
                    {msg.body}
                  </div>
                  <span className="text-[10px] text-[#999] px-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            )
          })}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 bg-white dark:bg-[#0f0f0f] border-t border-[#e8e8e8] dark:border-[#2a2a2a] flex items-center gap-3">
        <input className="input flex-1" placeholder={`Message ${otherUserName}…`} value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
        <button onClick={send} disabled={sending || !newMsg.trim()} className="btn-primary py-2 px-3"><Send size={16} /></button>
      </div>
    </>
  )
}

// ─── New DM Modal ─────────────────────────────────────────────────────────────
function NewDMModal({ candidates, onSelect, onClose }: {
  candidates: DMCandidate[]
  onSelect: (c: DMCandidate) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const filtered = candidates.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.clubName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="bg-white dark:bg-[#111] rounded-2xl border border-[#e8e8e8] dark:border-[#252525] w-full max-w-sm p-5"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg dark:text-[#f0f0f0]">New Direct Message</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#f4f4f4] dark:hover:bg-[#1e1e1e] text-[#999] transition-colors">
            <X size={16} />
          </button>
        </div>
        <input
          className="input mb-3"
          placeholder="Search by name or club…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {filtered.length === 0
            ? <p className="text-sm text-[#999] text-center py-4">No people found</p>
            : filtered.map(c => (
              <button key={`${c.id}-${c.clubId}`} onClick={() => onSelect(c)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f4f4f4] dark:hover:bg-[#1a1a1a] transition-colors text-left w-full">
                <Avatar name={c.full_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium dark:text-[#f0f0f0] truncate">{c.full_name}</div>
                  <div className="text-xs text-[#999] truncate">
                    {c.clubName}
                    {(c.role === 'club_admin' || c.role === 'co_admin') && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium">
                        {c.role === 'club_admin' ? 'Admin' : 'Co-Admin'}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          }
        </div>
      </div>
    </div>
  )
}

// ─── Main Messages Page ────────────────────────────────────────────────────────
export default function MessagesPage() {
  const { profile } = useAuth()
  const { toast } = useToast()

  const [mainTab, setMainTab] = useState<'group' | 'dm'>('group')
  const [showSidebar, setShowSidebar] = useState(true)

  // Group chat
  const [clubs, setClubs] = useState<Club[]>([])
  const [activeClub, setActiveClub] = useState<Club | null>(null)

  // DM
  const [dmThreads, setDmThreads] = useState<DMThread[]>([])
  const [activeDM, setActiveDM] = useState<DMThread | null>(null)
  const [activeDMTarget, setActiveDMTarget] = useState<{ userId: string; userName: string; clubId: string } | null>(null)

  // New DM modal
  const [showNewDM, setShowNewDM] = useState(false)
  const [dmCandidates, setDmCandidates] = useState<DMCandidate[]>([])

  // Load clubs user belongs to (as member or primary admin)
  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const [memberRes, adminRes] = await Promise.all([
        supabase.from('club_members').select('club:clubs(*)').eq('user_id', profile.id).eq('status', 'approved'),
        supabase.from('clubs').select('*').eq('admin_id', profile.id),
      ])
      const memberClubs = memberRes.data?.map((m: any) => m.club).filter(Boolean) || []
      const adminClubs = adminRes.data || []
      const all: Club[] = [...memberClubs, ...adminClubs]
      const seen = new Set<string>()
      const unique = all.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true })
      setClubs(unique)
      if (unique.length > 0) setActiveClub(unique[0])
    }
    load()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load DM threads
  const loadDMThreads = useCallback(async () => {
    if (!profile) return
    const { data, error } = await supabase.from('direct_messages')
      .select('*, sender:users!sender_id(id,full_name), recipient:users!recipient_id(id,full_name), club:clubs(id,name,logo_url)')
      .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
      .order('created_at', { ascending: false })

    if (error || !data) return
    const threadMap = new Map<string, DMThread>()
    for (const msg of data as any[]) {
      const otherId = msg.sender_id === profile.id ? msg.recipient_id : msg.sender_id
      const otherName = msg.sender_id === profile.id ? msg.recipient?.full_name : msg.sender?.full_name
      const key = `${msg.club_id}:${otherId}`
      if (!threadMap.has(key)) {
        threadMap.set(key, {
          clubId: msg.club_id,
          club: msg.club,
          otherUserId: otherId,
          otherUserName: otherName || 'Unknown',
          lastMessage: msg.body,
          lastAt: msg.created_at,
          unreadCount: (!msg.is_read && msg.recipient_id === profile.id) ? 1 : 0,
        })
      } else if (!msg.is_read && msg.recipient_id === profile.id) {
        const t = threadMap.get(key)!
        threadMap.set(key, { ...t, unreadCount: t.unreadCount + 1 })
      }
    }
    setDmThreads(Array.from(threadMap.values()))
  }, [profile])

  useEffect(() => { loadDMThreads() }, [loadDMThreads])

  // Build DM candidate list based on role
  const openNewDM = useCallback(async () => {
    if (!profile) return
    const candidates: DMCandidate[] = []
    const seen = new Set<string>()

    if (profile.role === 'club_admin' || profile.role === 'co_admin') {
      // Admin/co-admin: can DM any approved member of their club(s)
      for (const club of clubs) {
        const { data } = await supabase.from('club_members')
          .select('user_id, user:users(id, full_name, email, role)')
          .eq('club_id', club.id)
          .eq('status', 'approved')
        for (const m of (data || []) as any[]) {
          const u = m.user
          if (!u || u.id === profile.id) continue
          const key = `${u.id}:${club.id}`
          if (seen.has(key)) continue
          seen.add(key)
          candidates.push({ id: u.id, full_name: u.full_name, email: u.email, role: u.role, clubId: club.id, clubName: club.name })
        }
      }
    } else {
      // Student: can DM the primary admin + co-admins of each club they're in
      for (const club of clubs) {
        // Primary admin
        const { data: clubData } = await supabase.from('clubs')
          .select('admin_id, admin:users!admin_id(id, full_name, email, role)')
          .eq('id', club.id).single()
        if (clubData) {
          const admin = (clubData as any).admin
          if (admin && admin.id !== profile.id) {
            const key = `${admin.id}:${club.id}`
            if (!seen.has(key)) {
              seen.add(key)
              candidates.push({ id: admin.id, full_name: admin.full_name, email: admin.email, role: admin.role, clubId: club.id, clubName: club.name })
            }
          }
        }
        // Co-admins
        const { data: coAdmins } = await supabase.from('club_members')
          .select('user_id, user:users(id, full_name, email, role)')
          .eq('club_id', club.id)
          .eq('status', 'approved')
        for (const m of (coAdmins || []) as any[]) {
          const u = m.user
          if (!u || u.id === profile.id || u.role !== 'co_admin') continue
          const key = `${u.id}:${club.id}`
          if (seen.has(key)) continue
          seen.add(key)
          candidates.push({ id: u.id, full_name: u.full_name, email: u.email, role: u.role, clubId: club.id, clubName: club.name })
        }
      }
    }

    if (candidates.length === 0) {
      toast('No people available to message', 'info')
      return
    }
    setDmCandidates(candidates)
    setShowNewDM(true)
  }, [profile, clubs, toast])

  const selectDMCandidate = (c: DMCandidate) => {
    setActiveDMTarget({ userId: c.id, userName: c.full_name, clubId: c.clubId })
    setActiveDM(null)
    setShowNewDM(false)
    setShowSidebar(false)
  }

  const selectClub = (club: Club) => { setActiveClub(club); setShowSidebar(false) }
  const selectDM = (thread: DMThread) => {
    setActiveDM(thread)
    setActiveDMTarget(null)
    setShowSidebar(false)
  }

  const getChatHeader = () => {
    if (mainTab === 'group' && activeClub) return { name: activeClub.name, sub: 'Group Chat', logo: activeClub.logo_url, icon: <Users size={14} /> }
    if (mainTab === 'dm' && activeDM) return { name: activeDM.otherUserName, sub: `Private · ${activeDM.club?.name || ''}`, logo: null, icon: <Lock size={14} /> }
    if (mainTab === 'dm' && activeDMTarget) return { name: activeDMTarget.userName, sub: 'Private', logo: null, icon: <Lock size={14} /> }
    return null
  }
  const header = getChatHeader()

  return (
    <div className="h-[calc(100vh-56px)] flex overflow-hidden">
      {/* ── Sidebar ── */}
      <div className={`w-full md:w-72 shrink-0 border-r border-[#e8e8e8] dark:border-[#2a2a2a] flex-col bg-white dark:bg-[#0f0f0f] ${showSidebar ? 'flex' : 'hidden'} md:flex`}>
        {/* Tab switcher */}
        <div className="p-3 border-b border-[#e8e8e8] dark:border-[#2a2a2a] flex gap-1">
          <button onClick={() => setMainTab('group')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors
              ${mainTab === 'group' ? 'bg-[#C0121F] text-white' : 'text-[#555] dark:text-[#a0a0a0] hover:bg-[#f4f4f4] dark:hover:bg-[#1a1a1a]'}`}>
            <Users size={13} /> Group Chats
          </button>
          <button onClick={() => setMainTab('dm')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors
              ${mainTab === 'dm' ? 'bg-[#C0121F] text-white' : 'text-[#555] dark:text-[#a0a0a0] hover:bg-[#f4f4f4] dark:hover:bg-[#1a1a1a]'}`}>
            <Lock size={13} /> Direct
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Group clubs list ── */}
          {mainTab === 'group' && (
            clubs.length === 0
              ? <div className="p-4 text-sm text-[#999]">Join clubs to chat</div>
              : clubs.map(c => (
                <button key={c.id} onClick={() => selectClub(c)}
                  className={`w-full text-left hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors border-b border-[#e8e8e8] dark:border-[#2a2a2a] overflow-hidden
                    ${activeClub?.id === c.id ? 'bg-[#fdf2f2] dark:bg-[#1a0a0a]' : ''}`}>
                  <div className="h-14 w-full relative overflow-hidden">
                    {c.logo_url
                      ? <><img src={c.logo_url} alt={c.name} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" /></>
                      : <div className="w-full h-full" style={{ backgroundColor: '#C0121F' }} />
                    }
                    <div className="absolute bottom-1.5 left-2 right-2 flex items-center gap-1.5">
                      <Users size={10} className="text-white/70 shrink-0" />
                      <div className="text-xs font-semibold truncate text-white drop-shadow">{c.name}</div>
                    </div>
                  </div>
                </button>
              ))
          )}

          {/* ── DM tab ── */}
          {mainTab === 'dm' && (
            <>
              {/* New DM button — available to everyone */}
              <div className="p-3 border-b border-[#e8e8e8] dark:border-[#2a2a2a]">
                <button
                  onClick={openNewDM}
                  className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-dashed border-[#d4d4d4] dark:border-[#333] text-sm text-[#555] dark:text-[#a0a0a0] hover:bg-[#f4f4f4] dark:hover:bg-[#1a1a1a] transition-colors font-medium">
                  <Plus size={14} className="text-[#C0121F]" />
                  New direct message
                </button>
              </div>

              {/* Existing DM threads */}
              {dmThreads.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-[#ababab] uppercase tracking-widest px-3 pt-3 pb-1">Recent Conversations</p>
                  {dmThreads.map(t => (
                    <button key={`${t.clubId}:${t.otherUserId}`} onClick={() => selectDM(t)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-3 border-b border-[#e8e8e8] dark:border-[#2a2a2a] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors
                        ${activeDM?.clubId === t.clubId && activeDM?.otherUserId === t.otherUserId ? 'bg-[#fdf2f2] dark:bg-[#1a0a0a]' : ''}`}>
                      <Avatar name={t.otherUserName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold dark:text-[#f0f0f0] truncate">{t.otherUserName}</span>
                          {t.unreadCount > 0 && (
                            <span className="shrink-0 h-4 w-4 rounded-full bg-[#C0121F] flex items-center justify-center text-white text-[9px] font-bold">{t.unreadCount}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#999] truncate">{t.club?.name} · {t.lastMessage}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {dmThreads.length === 0 && (
                <div className="p-4 text-sm text-[#999]">No conversations yet. Start one above.</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Chat Panel ── */}
      <div className={`flex-1 flex-col bg-[#f9f9f9] dark:bg-[#0a0a0a] min-w-0 ${!showSidebar ? 'flex' : 'hidden'} md:flex`}>
        {header ? (
          <>
            <div className="relative h-16 overflow-hidden border-b border-[#e8e8e8] dark:border-[#2a2a2a] shrink-0">
              {header.logo
                ? <><img src={header.logo} alt={header.name} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" /></>
                : <div className="w-full h-full bg-[#0a0a0a]" />
              }
              <div className="absolute inset-0 flex items-center px-4 gap-3">
                <span className="md:hidden p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer" onClick={() => setShowSidebar(true)}>
                  <ChevronLeft size={18} />
                </span>
                <div className="flex items-center gap-2 text-white">
                  {header.icon}
                  <div>
                    <div className="font-semibold text-sm drop-shadow">{header.name}</div>
                    <div className="text-xs text-white/60">{header.sub}</div>
                  </div>
                </div>
              </div>
            </div>

            {mainTab === 'group' && activeClub && <GroupChat club={activeClub} profile={profile!} />}
            {mainTab === 'dm' && activeDM && (
              <DMConversation clubId={activeDM.clubId} otherUserId={activeDM.otherUserId} otherUserName={activeDM.otherUserName} profile={profile!} />
            )}
            {mainTab === 'dm' && activeDMTarget && (
              <DMConversation clubId={activeDMTarget.clubId} otherUserId={activeDMTarget.userId} otherUserName={activeDMTarget.userName} profile={profile!} />
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col">
            <EmptyState
              title={mainTab === 'group' ? 'Select a club to chat' : 'Select a conversation'}
              description={mainTab === 'group' ? 'Join clubs to access their group chats' : 'Choose someone to message privately'}
            />
            <div className="md:hidden pb-8 flex justify-center">
              <button onClick={() => setShowSidebar(true)} className="btn-secondary text-sm">
                View {mainTab === 'group' ? 'Clubs' : 'Conversations'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── New DM Modal ── */}
      {showNewDM && (
        <NewDMModal
          candidates={dmCandidates}
          onSelect={selectDMCandidate}
          onClose={() => setShowNewDM(false)}
        />
      )}
    </div>
  )
}
