import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://gaza-gate-backend.onrender.com",
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// ── Auth endpoints ──
export const authAPI = {
  // Customer
  customerRegister: (data) => api.post('/api/auth/customer/local/register', data),
  customerLogin:    (data) => api.post('/api/auth/customer/local/login', data),
  customerGoogleLogin:    (data) => api.post('/api/auth/customer/google/login', data),
  customerGoogleRegister: (data) => api.post('/api/auth/customer/google/register', data),

  // Seller
  sellerRegister: (data) => api.post('/api/auth/seller/local/register', data),
  sellerLogin:    (data) => api.post('/api/auth/seller/local/login', data),
  sellerGoogleLoginInit:     (data) => api.post('/api/auth/seller/google/register/init', data),
  sellerGoogleRegisterComplete: (data) => api.post('/api/auth/seller/google/register/complete', data),
  sellerGoogleLogin: (data) => api.post('/api/auth/seller/google/login', data),

  // Shared
  verifyEmail:           (data) => api.post('/api/auth/verify-email', data),
  resendCode:            (data) => api.post('/api/auth/resend-verification-code', data),
  forgotPassword:        (data) => api.post('/api/auth/forgot-password', data),
  verifyResetCode:       (data) => api.post('/api/auth/verify-reset-code', data),
  resetPassword:         (data) => api.post('/api/auth/reset-password', data),
  logout:                ()     => api.post('/api/auth/logout'),
  logoutAll:             ()     => api.post('/api/auth/logout-all'),
  refreshToken:          ()     => api.post('/api/auth/refresh-token'),
}

export default api
