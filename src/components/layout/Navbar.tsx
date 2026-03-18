import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Bell, Menu, X, Sun, Moon, LogOut, ChevronDown, Settings } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useDarkMode } from '../../hooks/useDarkMode'
import { supabase } from '../../lib/supabase'

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const { isDark, toggle } = useDarkMode()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  // Fetch unread notification count and subscribe to changes
  useEffect(() => {
    if (!profile) return
    const fetchCount = () => {
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)
        .then(({ count }) => setUnreadCount(count || 0))
    }
    fetchCount()
    const channel = supabase
      .channel(`navbar-notifs-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, fetchCount)
      .subscribe()
    return () => { channel.unsubscribe().then(() => supabase.removeChannel(channel)) }
  }, [profile])

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const studentLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/clubs', label: 'Clubs' },
    { to: '/events', label: 'Events' },
    { to: '/announcements', label: 'Announcements' },
    { to: '/messages', label: 'Messages' },
  ]
  const adminLinks = [
    { to: '/admin', label: 'Overview' },
    { to: '/admin/members', label: 'Members' },
    { to: '/admin/announcements', label: 'Announcements' },
    { to: '/admin/events', label: 'Events' },
    { to: '/messages', label: 'Messages' },
    ...(profile?.role === 'club_admin' ? [{ to: '/admin/settings', label: 'Settings' }] : []),
  ]
  const platformLinks = [
    { to: '/platform-admin', label: 'Overview' },
    { to: '/platform-admin/clubs', label: 'Clubs' },
    { to: '/platform-admin/admins', label: 'Admins' },
    { to: '/platform-admin/users', label: 'Users' },
  ]

  const links = profile?.role === 'club_admin' || profile?.role === 'co_admin' ? adminLinks
    : profile?.role === 'platform_admin' ? platformLinks
    : studentLinks

  // Routes that should only highlight on an exact match (dashboard roots whose
  // path is a prefix of every sub-page, e.g. /admin matches /admin/events).
  const exactOnlyRoutes = new Set(['/admin', '/platform-admin'])

  const isActive = (to: string) => {
    if (exactOnlyRoutes.has(to)) return location.pathname === to
    return location.pathname === to || (to !== '/' && to.length > 1 && location.pathname.startsWith(to + '/'))
  }

  const rolePill: Record<string, string> = {
    student: 'bg-[#f4f4f4] text-[#6b6b6b]',
    co_admin: 'bg-amber-50 text-amber-700',
    club_admin: 'bg-amber-50 text-amber-700',
    platform_admin: 'bg-purple-50 text-purple-700',
  }
  const roleLabel: Record<string, string> = {
    student: 'Student', co_admin: 'Co-Admin', club_admin: 'Club Admin', platform_admin: 'Platform Admin'
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 h-14"
        style={{
          background: isDark ? 'rgba(10,10,10,0.93)' : 'rgba(255,255,255,0.93)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: isDark ? '1px solid #1e1e1e' : '1px solid #ebebeb',
        }}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <img src="/logo.png" alt="E-JUST"
              className="h-8 w-8 object-contain rounded-xl transition-transform duration-200 group-hover:scale-105" />
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-serif text-[15px] text-[#0a0a0a] dark:text-[#f0f0f0]">Club Hub</span>
              <span className="text-[10px] text-[#ababab] font-semibold tracking-widest uppercase">E-JUST</span>
            </div>
          </Link>

          {/* Nav Links */}
          {profile && (
            <div className="hidden md:flex items-center gap-0.5">
              {links.map(link => (
                <Link key={link.to} to={link.to}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                    ${isActive(link.to)
                      ? 'text-[#C0121F] bg-[rgba(192,18,31,0.08)]'
                      : 'text-[#6b6b6b] hover:text-[#0a0a0a] hover:bg-[#f4f4f4] dark:text-[#909090] dark:hover:text-[#f0f0f0] dark:hover:bg-[#181818]'
                    }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right */}
          <div className="flex items-center gap-1">
            <button onClick={toggle}
              className="p-2 rounded-lg text-[#6b6b6b] dark:text-[#909090] hover:bg-[#f4f4f4] dark:hover:bg-[#181818] transition-colors">
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {profile ? (
              <>
                <Link to="/notifications"
                  className="relative p-2 rounded-lg text-[#6b6b6b] dark:text-[#909090] hover:bg-[#f4f4f4] dark:hover:bg-[#181818] transition-colors">
                  <Bell size={15} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-[#C0121F] flex items-center justify-center text-white text-[9px] font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                <div className="relative">
                  <button onClick={() => setUserMenuOpen(v => !v)}
                    className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-xl hover:bg-[#f4f4f4] dark:hover:bg-[#181818] transition-colors">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#C0121F] to-[#7a0b12] flex items-center justify-center text-white text-xs font-bold">
                      {profile.full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-[#1c1c1c] dark:text-[#d8d8d8] max-w-[80px] truncate">
                      {profile.full_name?.split(' ')[0]}
                    </span>
                    <ChevronDown size={12} className={`text-[#ababab] transition-transform duration-150 ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-11 w-56 z-50 rounded-2xl overflow-hidden"
                        style={{
                          background: isDark ? '#141414' : 'white',
                          border: isDark ? '1px solid #252525' : '1px solid #ebebeb',
                          boxShadow: '0 20px 60px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.06)',
                        }}
                      >
                        <div className="px-4 py-3.5 flex items-center gap-3"
                          style={{ borderBottom: isDark ? '1px solid #1e1e1e' : '1px solid #f0f0f0' }}>
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#C0121F] to-[#7a0b12] flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {profile.full_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#0a0a0a] dark:text-[#f0f0f0] truncate">{profile.full_name}</div>
                            <span className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-semibold ${rolePill[profile.role]}`}>
                              {roleLabel[profile.role]}
                            </span>
                          </div>
                        </div>
                        <div className="p-1.5">
                          <Link to="/profile"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-xl text-[#555] dark:text-[#a0a0a0] hover:bg-[#f4f4f4] dark:hover:bg-[#181818] transition-colors font-medium"
                            style={{ textDecoration: 'none' }}>
                            <Settings size={14} /> Profile & Settings
                          </Link>
                          <button onClick={() => { handleSignOut(); setUserMenuOpen(false) }}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-xl text-[#C0121F] hover:bg-[rgba(192,18,31,0.07)] transition-colors font-medium">
                            <LogOut size={14} /> Sign out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button className="md:hidden p-2 rounded-lg text-[#6b6b6b] dark:text-[#909090] hover:bg-[#f4f4f4] dark:hover:bg-[#181818] transition-colors"
                  onClick={() => setMenuOpen(v => !v)}>
                  {menuOpen ? <X size={16} /> : <Menu size={16} />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 ml-1">
                <Link to="/login" className="btn-ghost" style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}>Sign In</Link>
                <Link to="/register" className="btn-primary" style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}>Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && profile && (
        <div className="fixed top-14 left-0 right-0 z-30 md:hidden fade-up"
          style={{
            background: isDark ? 'rgba(10,10,10,0.97)' : 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            borderBottom: isDark ? '1px solid #1e1e1e' : '1px solid #ebebeb',
          }}
        >
          <div className="px-4 py-2 flex flex-col gap-0.5">
            {links.map(link => (
              <Link key={link.to} to={link.to}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${isActive(link.to) ? 'text-[#C0121F] bg-[rgba(192,18,31,0.08)]' : 'text-[#6b6b6b] dark:text-[#909090] hover:bg-[#f4f4f4] dark:hover:bg-[#181818]'}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
