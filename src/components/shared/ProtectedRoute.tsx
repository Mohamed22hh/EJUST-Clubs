import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { UserRole } from '../../types'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.png" alt="E-JUST" className="h-10 w-10 animate-pulse rounded-xl" />
          <div className="text-sm text-[#999]">Loading...</div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    if (profile.role === 'platform_admin') return <Navigate to="/platform-admin" replace />
    if (profile.role === 'club_admin' || profile.role === 'co_admin') return <Navigate to="/admin" replace />
    return <Navigate to="/dashboard" replace />
  }

  // Club admins must be approved before accessing the admin area
  if ((profile.role === 'club_admin' || profile.role === 'co_admin') && !profile.is_approved && allowedRoles?.includes('club_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center p-8">
          <img src="/logo.png" alt="E-JUST" className="h-12 w-12 mx-auto mb-4 rounded-2xl" />
          <h2 className="font-serif text-xl mb-2">Pending Approval</h2>
          <p className="text-sm text-[#555] dark:text-[#a0a0a0]">
            Your club admin account is awaiting platform admin approval.
            You will be notified once your application has been reviewed.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
