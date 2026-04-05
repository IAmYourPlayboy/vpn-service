/**
 * API-клиент — все запросы к бэкенду.
 */

import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Добавляем JWT-токен к каждому запросу
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Если 401 — удаляем токен. Редирект только если не на публичной странице
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      // Не перенаправляем с публичных страниц (лендинг, логин, регистрация)
      const publicPaths = ['/', '/login', '/register']
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// === Авторизация ===

export async function register(email: string, password: string) {
  const { data } = await api.post('/auth/register', { email, password })
  localStorage.setItem('token', data.access_token)
  return data
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password })
  localStorage.setItem('token', data.access_token)
  return data
}

export async function getMe() {
  const { data } = await api.get('/auth/me')
  return data
}

export function logout() {
  localStorage.removeItem('token')
  window.location.href = '/login'
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token')
}

// === Профиль ===

export async function updateProfile(data: { nickname?: string }) {
  const { data: result } = await api.put('/auth/profile', data)
  return result
}

export async function changeEmail(newEmail: string, password: string) {
  const { data } = await api.put('/auth/change-email', { new_email: newEmail, password })
  return data
}

export async function getTelegramLinkToken() {
  const { data } = await api.post('/auth/telegram-link-token')
  return data  // { link: "https://t.me/ANDIGO_VpnBot?start=link_TOKEN" }
}

export async function linkEmail(email: string, password: string) {
  const { data } = await api.post('/auth/link-email', { email, password })
  return data
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const { data } = await api.put('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
  return data
}

// === VPN ===

export async function getVPNConfig() {
  const { data } = await api.get('/vpn/config')
  return data
}

// === Серверы ===

export async function getServers() {
  const { data } = await api.get('/servers')
  return data
}

// === Платежи ===

export async function createPayment(planId: number, provider: string = 'cryptomus') {
  const { data } = await api.post('/payments/create', { plan_id: planId, provider })
  return data
}

export async function getPaymentHistory() {
  const { data } = await api.get('/payments/history')
  return data
}

// === Админка ===

export async function getAdminStats() {
  const { data } = await api.get('/admin/stats')
  return data
}

export async function getAdminUsers(skip = 0, limit = 50) {
  const { data } = await api.get(`/admin/users?skip=${skip}&limit=${limit}`)
  return data
}

export async function banUser(userId: number) {
  const { data } = await api.post(`/admin/users/${userId}/ban`)
  return data
}

export async function unbanUser(userId: number) {
  const { data } = await api.post(`/admin/users/${userId}/unban`)
  return data
}

// Подписки (админ)
export async function getAdminSubscriptions(status?: string, skip = 0, limit = 50) {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) })
  if (status) params.set('status', status)
  const { data } = await api.get(`/admin/subscriptions?${params}`)
  return data
}

// Платежи (админ)
export async function getAdminPayments(status?: string, skip = 0, limit = 50) {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) })
  if (status) params.set('status', status)
  const { data } = await api.get(`/admin/payments?${params}`)
  return data
}

// Тарифы (админ)
export async function getAdminPlans() {
  const { data } = await api.get('/admin/plans')
  return data
}

export async function createAdminPlan(plan: { name: string; price: number; duration_days: number }) {
  const { data } = await api.post('/admin/plans', plan)
  return data
}

export async function updateAdminPlan(id: number, plan: { name?: string; price?: number; duration_days?: number }) {
  const { data } = await api.put(`/admin/plans/${id}`, plan)
  return data
}

export async function toggleAdminPlan(id: number) {
  const { data } = await api.patch(`/admin/plans/${id}/toggle`)
  return data
}

// === Расширенная админка ===

export async function getUserDetails(userId: number) {
  const { data } = await api.get(`/admin/users/${userId}/details`)
  return data
}

export async function toggleVpn(userId: number) {
  const { data } = await api.post(`/admin/users/${userId}/toggle-vpn`)
  return data
}

export async function reissueKey(userId: number) {
  const { data } = await api.post(`/admin/users/${userId}/reissue-key`)
  return data
}

export async function resetPassword(userId: number) {
  const { data } = await api.post(`/admin/users/${userId}/reset-password`)
  return data
}

export async function createUser(userData: { email: string; password: string; role: string; activate_subscription: boolean }) {
  const { data } = await api.post('/admin/users/create', userData)
  return data
}

export async function changeRole(userId: number, role: string) {
  const { data } = await api.put(`/admin/users/${userId}/role`, { role })
  return data
}

// === Удаление записей (owner only) ===

export async function deleteUser(userId: number) {
  const { data } = await api.delete(`/admin/users/${userId}`)
  return data
}

export async function deleteAdminSubscription(subId: number) {
  const { data } = await api.delete(`/admin/subscriptions/${subId}`)
  return data
}

export async function deletePayment(paymentId: number) {
  const { data } = await api.delete(`/admin/payments/${paymentId}`)
  return data
}

export async function deletePlan(planId: number) {
  const { data } = await api.delete(`/admin/plans/${planId}`)
  return data
}

export default api
