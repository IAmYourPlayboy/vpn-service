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

export default api
