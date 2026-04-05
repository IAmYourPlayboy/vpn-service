/**
 * Главный компонент — маршрутизация.
 */

import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import { isAuthenticated } from './api/client'
import { ThemeProvider } from './context/ThemeContext'

// Страницы
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Servers from './pages/Servers'
import Subscription from './pages/Subscription'
import Settings from './pages/Settings'
import Offer from './pages/Offer'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import EarthVariants from './pages/EarthVariants'

// Админка
import AdminOverview from './pages/admin/AdminOverview'
import AdminUsers from './pages/admin/AdminUsers'
import AdminUserDetails from './pages/admin/AdminUserDetails'
import AdminSubscriptions from './pages/admin/AdminSubscriptions'
import AdminPayments from './pages/admin/AdminPayments'
import AdminServers from './pages/admin/AdminServers'
import AdminPlans from './pages/admin/AdminPlans'

// Защищённый маршрут
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
      {/* Публичные */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/offer" element={<Offer />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/earth-test" element={<EarthVariants />} />

      {/* Защищённые — внутри Layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/servers" element={<Servers />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Админка — внутри AdminLayout (проверка is_admin внутри лейаута) */}
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminOverview />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/users/:id" element={<AdminUserDetails />} />
        <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
        <Route path="/admin/payments" element={<AdminPayments />} />
        <Route path="/admin/servers" element={<AdminServers />} />
        <Route path="/admin/plans" element={<AdminPlans />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ThemeProvider>
  )
}
