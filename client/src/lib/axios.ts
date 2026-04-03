import axios from 'axios'
import { toastError } from '@/lib/toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gad_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('gad_token')

      if (window.location.pathname !== '/login') {
        toastError('Session expired. Please sign in again.')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

export default api
