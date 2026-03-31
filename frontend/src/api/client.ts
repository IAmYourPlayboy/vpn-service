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

// Если 401 — разлогиниваем
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
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

export async function createPayment(planId: number) {
  const { data } = await api.post('/payments/create', { plan_id: planId })
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

export default api
