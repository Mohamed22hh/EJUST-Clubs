import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  const location = useLocation()
  // Auth pages manage their own full-screen layout and don't need top padding
  const isAuthPage = ['/login', '/register', '/register/club-admin'].includes(location.pathname)

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a]">
      <Navbar />
      <main className={isAuthPage ? '' : 'pt-14'}>
        <Outlet />
      </main>
    </div>
  )
}
