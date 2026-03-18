import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Club } from '../types'

export type ClubAdminRole = 'primary' | 'co_admin'

interface UseMyClubResult {
  club: Club | null
  clubId: string | null
  adminRole: ClubAdminRole | null
  isPrimaryAdmin: boolean
  isCoAdmin: boolean
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useMyClub(): UseMyClubResult {
  const { profile } = useAuth()
  const [club, setClub] = useState<Club | null>(null)
  const [adminRole, setAdminRole] = useState<ClubAdminRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!profile) {
      setClub(null); setAdminRole(null); setLoading(false); return
    }
    let cancelled = false
    setLoading(true); setError(null)

    const load = async () => {
      // Primary admin: club where admin_id = me
      if (profile.role === 'club_admin') {
        const { data, error: err } = await supabase
          .from('clubs').select('*').eq('admin_id', profile.id).maybeSingle()
        if (cancelled) return
        if (err) { setError(err.message); setLoading(false); return }
        setClub(data); setAdminRole(data ? 'primary' : null)
        setLoading(false); return
      }

      // Co-admin: role = 'co_admin', find club via club_members
      if (profile.role === 'co_admin') {
        const { data, error: err } = await supabase
          .from('club_members')
          .select('club:clubs(*)')
          .eq('user_id', profile.id)
          .eq('status', 'approved')
          .maybeSingle()
        if (cancelled) return
        if (err) { setError(err.message); setLoading(false); return }
        const c = (data as any)?.club ?? null
        setClub(c); setAdminRole(c ? 'co_admin' : null)
        setLoading(false); return
      }

      // Student or other — no club admin access
      setClub(null); setAdminRole(null); setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [profile, tick])

  return {
    club,
    clubId: club?.id ?? null,
    adminRole,
    isPrimaryAdmin: adminRole === 'primary',
    isCoAdmin: adminRole === 'co_admin',
    loading,
    error,
    refetch: () => setTick(t => t + 1),
  }
}
