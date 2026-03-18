import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/shared/ProtectedRoute'

// Pages
import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ClubAdminRegisterPage from './pages/auth/ClubAdminRegisterPage'
import EmailConfirmPage from './pages/auth/EmailConfirmPage'

// Student
import StudentDashboard from './pages/student/StudentDashboard'
import ClubsPage from './pages/student/ClubsPage'
import ClubProfilePage from './pages/student/ClubProfilePage'
import EventsPage from './pages/student/EventsPage'
import AnnouncementsPage from './pages/student/AnnouncementsPage'
import MessagesPage from './pages/student/MessagesPage'
import { MyClubsPage, ApplicationsPage, NotificationsPage } from './pages/student/OtherStudentPages'
import ProfileSettingsPage from './pages/student/ProfileSettingsPage'

// Club Admin
import ClubAdminDashboard from './pages/clubadmin/ClubAdminDashboard'
import { AdminMembersPage, NewAnnouncementPage, NewEventPage, ClubSettingsPage, AdminAnnouncementsPage, EditAnnouncementPage, AdminEventsPage, EditEventPage } from './pages/clubadmin/ClubAdminSubPages'

// Platform Admin
import {
  PlatformAdminDashboard, ClubApprovalQueue, AdminApprovalQueue, AllClubsPage, UsersManagementPage
} from './pages/platformadmin/PlatformAdminPages'

export default function AppRouter() {
  return (
    <Routes>
      {/*
        /auth/confirm is OUTSIDE the Layout wrapper so it has no Navbar.
        Supabase appends #access_token=... to this URL after the user clicks
        the confirmation link in their email.
      */}
      <Route path="/auth/confirm" element={<EmailConfirmPage />} />

      {/* All other pages use the Layout (Navbar + Outlet) */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="register/club-admin" element={<ClubAdminRegisterPage />} />

        {/* Student Routes */}
        <Route path="dashboard" element={<ProtectedRoute allowedRoles={['student', 'co_admin']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="clubs" element={<ProtectedRoute><ClubsPage /></ProtectedRoute>} />
        <Route path="clubs/:id" element={<ProtectedRoute><ClubProfilePage /></ProtectedRoute>} />
        <Route path="events" element={<ProtectedRoute allowedRoles={['student', 'co_admin']}><EventsPage /></ProtectedRoute>} />
        <Route path="announcements" element={<ProtectedRoute allowedRoles={['student', 'co_admin']}><AnnouncementsPage /></ProtectedRoute>} />
        <Route path="messages" element={<ProtectedRoute allowedRoles={['student', 'co_admin', 'club_admin']}><MessagesPage /></ProtectedRoute>} />
        <Route path="my-clubs" element={<ProtectedRoute allowedRoles={['student', 'co_admin']}><MyClubsPage /></ProtectedRoute>} />
        <Route path="applications" element={<ProtectedRoute allowedRoles={['student', 'co_admin']}><ApplicationsPage /></ProtectedRoute>} />
        <Route path="notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute><ProfileSettingsPage /></ProtectedRoute>} />

        {/* Club Admin Routes */}
        <Route path="admin" element={<ProtectedRoute allowedRoles={['club_admin', 'co_admin']}><ClubAdminDashboard /></ProtectedRoute>} />
        <Route path="admin/members" element={<ProtectedRoute allowedRoles={['club_admin', 'co_admin']}><AdminMembersPage /></ProtectedRoute>} />
        <Route path="admin/announcements" element={<ProtectedRoute allowedRoles={['club_admin', 'co_admin']}><AdminAnnouncementsPage /></ProtectedRoute>} />
        <Route path="admin/announcements/new" element={<ProtectedRoute allowedRoles={['club_admin', 'co_admin']}><NewAnnouncementPage /></ProtectedRoute>} />
        <Route path="admin/announcements/:id/edit" element={<ProtectedRoute allowedRoles={['club_admin', 'co_admin']}><EditAnnouncementPage /></ProtectedRoute>} />
        <Route path="admin/events" element={<ProtectedRoute allowedRoles={['club_admin', 'co_admin']}><AdminEventsPage /></ProtectedRoute>} />
        <Route path="admin/events/new" element={<ProtectedRoute allowedRoles={['club_admin', 'co_admin']}><NewEventPage /></ProtectedRoute>} />
        <Route path="admin/events/:id/edit" element={<ProtectedRoute allowedRoles={['club_admin', 'co_admin']}><EditEventPage /></ProtectedRoute>} />
        <Route path="admin/settings" element={<ProtectedRoute allowedRoles={['club_admin']}><ClubSettingsPage /></ProtectedRoute>} />

        {/* Platform Admin Routes */}
        <Route path="platform-admin" element={<ProtectedRoute allowedRoles={['platform_admin']}><PlatformAdminDashboard /></ProtectedRoute>} />
        <Route path="platform-admin/clubs" element={<ProtectedRoute allowedRoles={['platform_admin']}><ClubApprovalQueue /></ProtectedRoute>} />
        <Route path="platform-admin/admins" element={<ProtectedRoute allowedRoles={['platform_admin']}><AdminApprovalQueue /></ProtectedRoute>} />
        <Route path="platform-admin/all-clubs" element={<ProtectedRoute allowedRoles={['platform_admin']}><AllClubsPage /></ProtectedRoute>} />
        <Route path="platform-admin/users" element={<ProtectedRoute allowedRoles={['platform_admin']}><UsersManagementPage /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
