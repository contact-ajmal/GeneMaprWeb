import axios from 'axios'

const TOKEN_KEY = 'genemapr_token'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — inject JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle errors and 401 redirect
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // 401 Unauthorized — clear token and redirect to login
      if (error.response.status === 401) {
        localStorage.removeItem(TOKEN_KEY)
        // Only redirect if not already on login/register
        const path = window.location.pathname
        if (path !== '/login' && path !== '/register') {
          window.location.href = '/login'
        }
      }

      const message = error.response.data?.detail || error.response.data?.message || 'An error occurred'
      throw new Error(message)
    } else if (error.request) {
      throw new Error('No response from server. Please check your connection.')
    } else {
      throw new Error(error.message || 'An unexpected error occurred')
    }
  }
)

export default apiClient
