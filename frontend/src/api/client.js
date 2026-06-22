import axios from 'axios'

// In dev: Vite proxies /api → backend container
// In prod: VITE_API_URL = https://your-backend.onrender.com
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

const api = axios.create({ baseURL: BASE })

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mun_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mun_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api