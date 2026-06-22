import { create } from 'zustand'
import api from '../api/client'

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('mun_token') || null,
  loading: false,

  setToken: (token) => {
    localStorage.setItem('mun_token', token)
    set({ token })
  },

  fetchMe: async () => {
    set({ loading: true })
    try {
      const res = await api.get('/auth/me')
      set({ user: res.data, loading: false })
    } catch {
      set({ user: null, token: null, loading: false })
      localStorage.removeItem('mun_token')
    }
  },

  logout: () => {
    localStorage.removeItem('mun_token')
    set({ user: null, token: null })
    window.location.href = '/login'
  },

  isRole: (...roles) => {
    const user = get().user
    return user && roles.includes(user.role)
  },
}))

export default useAuthStore