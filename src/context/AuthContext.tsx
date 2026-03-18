import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { User } from '../types'

// Redirect the user to the correct dashboard for their role.
// Only fires when the role actually changes mid-session (not on initial load).
function redirectForRole(role: string) {
  const path = window.location.pathname
  const isAdminPath = path.startsWith('/admin')
  const isPlatformPath = path.startsWith('/platform-admin')

  if (role === 'platform_admin' && !isPlatformPath) {
    window.location.replace('/platform-admin')
  } else if ((role === 'club_admin' || role === 'co_admin') && !isAdminPath) {
    window.location.replace('/admin')
  } else if (role === 'student' && (isAdminPath || isPlatformPath)) {
    window.location.replace('/dashboard')
  }
}

interface AuthContextType {
  session: Session | null
  supabaseUser: SupabaseUser | null
  profile: User | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  supabaseUser: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const previousRole = useRef<string | null>(null)
  const initialLoadDone = useRef(false)

  const fetchProfile = async (userId: string): Promise<void> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      setProfile(data)
      // If role changed mid-session (not on first load), redirect immediately
      if (initialLoadDone.current && previousRole.current !== null && previousRole.current !== data.role) {
        redirectForRole(data.role)
      }
      previousRole.current = data.role
    } else if (error) {
      // Non-fatal: the user row may not exist yet (e.g. trigger delay) —
      // leave profile as null so ProtectedRoute redirects to login gracefully
      console.warn('fetchProfile failed:', error.message)
    }
  }

  const refreshProfile = async () => {
    if (supabaseUser) await fetchProfile(supabaseUser.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setSupabaseUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          initialLoadDone.current = true
          setLoading(false)
        })
      } else {
        initialLoadDone.current = true
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setSupabaseUser(session?.user ?? null)

      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          setLoading(false)
        })
      } else {
        // SIGNED_OUT or no session
        setProfile(null)
        previousRole.current = null
        if (!initialLoadDone.current) setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    previousRole.current = null
  }

  return (
    <AuthContext.Provider value={{ session, supabaseUser, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
