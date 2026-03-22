// src/pages/AdminPanel.jsx
// ─────────────────────────────────────────────────────────────
//  EJUST Club Hub — Role Manager Admin Panel
//  ONLY accessible to: ali.120250176@ejust.edu.eg
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'  // adjust if your path differs

// ── Who can access this panel ─────────────────────────────────
const AUTHORIZED_ADMIN_EMAILS = [
  'ali.120250176@ejust.edu.eg',
  // add more admin emails here if needed later
]

// ── Role definitions ──────────────────────────────────────────
// To add a new role: add a new object here, then update the
// Supabase CHECK constraint (see the guide at the bottom of the UI)
const ROLES = [
  { value: 'admin',    label: 'Admin',    icon: '🛡', light: '#fff1f2', color: '#C0121F', border: 'rgba(192,18,31,0.3)' },
  { value: 'member',   label: 'Member',   icon: '👤', light: '#f0fdf4', color: '#15803d', border: 'rgba(34,197,94,0.3)' },
  { value: 'follower', label: 'Follower', icon: '👁', light: '#eff6ff', color: '#1d4ed8', border: 'rgba(59,130,246,0.3)' },
  { value: 'guest',    label: 'Guest',    icon: '🔍', light: '#fffbeb', color: '#b45309', border: 'rgba(245,158,11,0.3)' },
]

export default function AdminPanel() {
  const [session,    setSession]    = useState(null)
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(null)
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState('all')
  const [editingId,  setEditingId]  = useState(null)
  const [toast,      setToast]      = useState(null)
  const [stats,      setStats]      = useState({})

  // ── Auth ────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  const isAuthorized = AUTHORIZED_ADMIN_EMAILS.includes(session?.user?.email)

  // ── Fetch all users ─────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) { notify('Could not load users: ' + error.message, 'error'); setLoading(false); return }

    setUsers(data || [])
    const s = { total: data.length, active: data.filter(u => u.is_active).length }
    ROLES.forEach(r => { s[r.value] = data.filter(u => u.role === r.value).length })
    setStats(s)
    setLoading(false)
  }, [])

  useEffect(() => { if (isAuthorized) fetchUsers() }, [isAuthorized, fetchUsers])

  // ── Update role ─────────────────────────────────────────────
  const updateRole = async (userId, newRole) => {
    setSaving(userId)
    const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId)
    error ? notify('Failed: ' + error.message, 'error') : notify('Role changed to ' + newRole + ' ✓', 'success')
    await fetchUsers()
    setSaving(null)
    setEditingId(null)
  }

  // ── Toggle suspended / active ───────────────────────────────
  const toggleActive = async (userId, current) => {
    setSaving(userId)
    const { error } = await supabase.from('user_roles').update({ is_active: !current }).eq('user_id', userId)
    error ? notify('Failed: ' + error.message, 'error') : notify(!current ? 'Account restored ✓' : 'Account suspended', !current ? 'success' : 'info')
    await fetchUsers()
    setSaving(null)
  }

  // ── Toast ────────────────────────────────────────────────────
  const notify = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  // ── Filtered list ────────────────────────────────────────────
  const filtered = users.filter(u =>
    (filter === 'all' || u.role === filter) &&
    (u.email.toLowerCase().includes(search.toLowerCase()) ||
     (u.full_name || '').toLowerCase().includes(search.toLowerCase()))
  )

  const roleDef = r => ROLES.find(x => x.value === r) || ROLES[2]

  // ── Styles (inline to keep original Tailwind untouched) ──────
  const s = {
    page:    { background: 'var(--bg)', minHeight: '100vh', paddingBottom: '4rem' },
    header:  { background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: '56px', zIndex: 40 },
    card:    { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,.06)' },
    input:   { border: '1.5px solid var(--border)', borderRadius: '.75rem', padding: '.625rem 1rem', fontSize: '.875rem', fontFamily: 'Outfit, sans-serif', outline: 'none', background: 'var(--bg)', color: 'var(--text-primary)', width: '100%' },
    btnPri:  { background: '#C0121F', color: '#fff', border: 'none', borderRadius: '.5rem', padding: '.4rem .875rem', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer' },
    btnGhost:{ border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', borderRadius: '.5rem', padding: '.4rem .875rem', fontSize: '.8rem', cursor: 'pointer' },
    th:      { textAlign: 'left', padding: '.625rem 1rem', fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', fontWeight: 700, borderBottom: '1px solid var(--border)', fontFamily: 'Outfit, sans-serif' },
    td:      { padding: '.75rem 1rem', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', fontSize: '.875rem' },
  }

  // ──────────────────────────────────────────────────────────────
  if (!session) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...s.card, textAlign: 'center', maxWidth: 360, padding: '3rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '.75rem' }}>🔐</div>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.5rem', marginBottom: '.5rem' }}>Admin Access</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '.875rem', marginBottom: '1.5rem' }}>Sign in to continue.</p>
        <a href="/login" style={{ ...s.btnPri, display: 'inline-block', textDecoration: 'none', padding: '.75rem 2rem' }}>Go to Login</a>
      </div>
    </div>
  )

  if (!isAuthorized) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...s.card, textAlign: 'center', maxWidth: 360, padding: '3rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '.75rem' }}>⛔</div>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.5rem', marginBottom: '.5rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>
          Signed in as <strong>{session.user.email}</strong>.<br/>This panel is restricted.
        </p>
      </div>
    </div>
  )

  // ── MAIN PANEL ───────────────────────────────────────────────
  return (
    <div style={s.page}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 999,
          background: 'var(--bg)', border: `1px solid ${toast.type==='success'?'#86efac':toast.type==='error'?'#fca5a5':'var(--border)'}`,
          color: toast.type==='success'?'#15803d':toast.type==='error'?'#C0121F':'var(--text-primary)',
          padding: '.7rem 1.1rem', borderRadius: '.75rem', fontSize: '.85rem', fontWeight: 500,
          boxShadow: '0 4px 20px rgba(0,0,0,.12)', animation: 'fadeUp .3s ease', minWidth: 220
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.5rem' }}>Role Manager</h1>
          <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Authorized as <span style={{ color: '#C0121F', fontWeight: 600 }}>{session.user.email}</span>
          </p>
        </div>
        <button style={s.btnGhost} onClick={fetchUsers} disabled={loading}>
          {loading ? '…' : '↻ Refresh'}
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total',    value: stats.total  || 0 },
            { label: 'Active',   value: stats.active || 0 },
            ...ROLES.map(r => ({ label: r.label + 's', value: stats[r.value] || 0, color: r.color }))
          ].map((st, i) => (
            <div key={i} style={{ ...s.card, padding: '.875rem 1rem' }}>
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.6rem', color: st.color || 'var(--text-primary)' }}>{st.value}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '.06em' }}>{st.label}</div>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
          <input
            style={{ ...s.input, maxWidth: 260 }}
            placeholder="Search name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            {['all', ...ROLES.map(r => r.value)].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={f === filter
                  ? { ...s.btnPri }
                  : { ...s.btnGhost }
                }
              >
                {f === 'all' ? 'All' : ROLES.find(r=>r.value===f)?.icon + ' ' + f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading users…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>No users found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Outfit, sans-serif' }}>
                <thead>
                  <tr>
                    <th style={s.th}>User</th>
                    <th style={s.th}>Current Role</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Joined</th>
                    <th style={s.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(user => {
                    const rd = roleDef(user.role)
                    const isSelf = user.email === session.user.email
                    const busy = saving === user.user_id
                    const editing = editingId === user.user_id

                    return (
                      <tr key={user.user_id} style={{ opacity: user.is_active ? 1 : .45, transition: 'opacity .2s' }}
                        onMouseEnter={e => { e.currentTarget.querySelectorAll('td').forEach(td => td.style.background='var(--bg-soft)') }}
                        onMouseLeave={e => { e.currentTarget.querySelectorAll('td').forEach(td => td.style.background='') }}>

                        {/* User */}
                        <td style={s.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(192,18,31,.1)', border: '1.5px solid rgba(192,18,31,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C0121F', fontWeight: 700, fontSize: '.8rem', flexShrink: 0 }}>
                              {(user.full_name || user.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '.875rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                                {user.full_name || '—'}
                                {isSelf && <span style={{ fontSize: '.65rem', background: 'rgba(192,18,31,.1)', color: '#C0121F', padding: '1px 6px', borderRadius: '9999px', fontWeight: 700 }}>YOU</span>}
                              </div>
                              <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td style={s.td}>
                          {editing ? (
                            <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              {ROLES.map(r => (
                                <button
                                  key={r.value}
                                  disabled={busy}
                                  onClick={() => updateRole(user.user_id, r.value)}
                                  style={{
                                    fontSize: '.75rem', padding: '.3rem .75rem', borderRadius: '9999px',
                                    border: `1.5px solid ${r.border}`,
                                    background: user.role === r.value ? r.light : 'transparent',
                                    color: user.role === r.value ? r.color : 'var(--text-muted)',
                                    cursor: busy ? 'not-allowed' : 'pointer', fontWeight: user.role === r.value ? 700 : 400,
                                    transition: 'all .15s'
                                  }}
                                >
                                  {busy && user.role !== r.value ? '…' : r.icon} {r.label}
                                </button>
                              ))}
                              <button onClick={() => setEditingId(null)} style={{ fontSize: '.8rem', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '.25rem' }}>✕</button>
                            </div>
                          ) : (
                            <span
                              onClick={() => !isSelf && setEditingId(user.user_id)}
                              title={isSelf ? "Can't edit your own role" : "Click to change"}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '.3rem',
                                padding: '.2rem .7rem', borderRadius: '9999px', fontSize: '.75rem', fontWeight: 600,
                                background: rd.light, color: rd.color, border: `1px solid ${rd.border}`,
                                cursor: isSelf ? 'default' : 'pointer', transition: 'all .15s'
                              }}
                            >
                              {rd.icon} {rd.label}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={s.td}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '.3rem', padding: '.2rem .7rem',
                            borderRadius: '9999px', fontSize: '.75rem', fontWeight: 600,
                            background: user.is_active ? '#f0fdf4' : '#fffbeb',
                            color: user.is_active ? '#15803d' : '#b45309',
                            border: `1px solid ${user.is_active ? 'rgba(34,197,94,.3)' : 'rgba(245,158,11,.3)'}`
                          }}>
                            {user.is_active ? '● Active' : '● Suspended'}
                          </span>
                        </td>

                        {/* Joined */}
                        <td style={{ ...s.td, fontSize: '.75rem', color: 'var(--text-muted)' }}>
                          {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>

                        {/* Actions */}
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: '.5rem' }}>
                            {!editing && !isSelf && (
                              <button style={s.btnGhost} onClick={() => setEditingId(user.user_id)}>Change Role</button>
                            )}
                            {!isSelf && (
                              <button
                                disabled={busy}
                                onClick={() => toggleActive(user.user_id, user.is_active)}
                                style={{
                                  ...s.btnGhost,
                                  borderColor: user.is_active ? 'rgba(192,18,31,.3)' : 'rgba(34,197,94,.4)',
                                  color: user.is_active ? '#C0121F' : '#15803d'
                                }}
                              >
                                {busy ? '…' : user.is_active ? 'Suspend' : 'Restore'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* How-to add role guide */}
        <details style={{ ...s.card, marginTop: '1rem', cursor: 'pointer' }}>
          <summary style={{ fontWeight: 600, fontSize: '.875rem', userSelect: 'none' }}>
            ⚙️ How to add a new role type in the future
          </summary>
          <div style={{ marginTop: '1rem', fontSize: '.875rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '.5rem' }}><strong style={{ color: 'var(--text-primary)' }}>Step 1</strong> — Add to the <code style={{ background: 'var(--bg-muted)', padding: '1px 5px', borderRadius: '4px' }}>ROLES</code> array at the top of <code style={{ background: 'var(--bg-muted)', padding: '1px 5px', borderRadius: '4px' }}>AdminPanel.jsx</code>:</p>
            <pre style={{ background: 'var(--bg-muted)', borderRadius: '.5rem', padding: '.875rem', fontSize: '.75rem', overflowX: 'auto', marginBottom: '.875rem' }}>{`{ value: 'organizer', label: 'Organizer', icon: '📋',
  light: '#faf5ff', color: '#7e22ce', border: 'rgba(168,85,247,.3)' }`}</pre>
            <p style={{ marginBottom: '.5rem' }}><strong style={{ color: 'var(--text-primary)' }}>Step 2</strong> — Update Supabase to allow the new value:</p>
            <pre style={{ background: 'var(--bg-muted)', borderRadius: '.5rem', padding: '.875rem', fontSize: '.75rem', overflowX: 'auto', marginBottom: '.875rem' }}>{`ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('admin','member','follower','guest','organizer'));`}</pre>
            <p><strong style={{ color: 'var(--text-primary)' }}>Step 3</strong> — Handle the role in your app routing and dashboards. Done.</p>
          </div>
        </details>

      </div>
    </div>
  )
}
