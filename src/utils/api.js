import axios from 'axios'
 
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://gaza-gate-backend-f9hf.onrender.com',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// ── 2. عرّفي authAPI أولاً ──
export const authAPI = {
  customerRegister: (data) => api.post('/api/auth/customer/local/register', data),
  customerLogin:    (data) => api.post('/api/auth/customer/local/login', data),
  customerGoogleLogin:    (data) => api.post('/api/auth/customer/google/login', data),
  customerGoogleRegister: (data) => api.post('/api/auth/customer/google/register', data),
  sellerRegister: (data) => api.post('/api/auth/seller/local/register', data),
  sellerLogin:    (data) => api.post('/api/auth/seller/local/login', data),
  sellerGoogleLoginInit:        (data) => api.post('/api/auth/seller/google/register/init', data),
  sellerGoogleRegisterComplete: (data) => api.post('/api/auth/seller/google/register/complete', data),
  sellerGoogleLogin: (data) => api.post('/api/auth/seller/google/login', data),
  verifyEmail:     (data) => api.post('/api/auth/verify-email', data),
  resendCode:      (data) => api.post('/api/auth/resend-verification-code', data),
  forgotPassword:  (data) => api.post('/api/auth/forgot-password', data),
  verifyResetCode: (data) => api.post('/api/auth/verify-reset-code', data),
  resetPassword:   (data) => api.post('/api/auth/reset-password', data),
  logout:          ()     => api.post('/api/auth/logout'),
  logoutAll:       ()     => api.post('/api/auth/logout-all'),
  refreshToken:    ()     => api.post('/api/auth/refresh-token'),
}

// ── 3. Request interceptor — يحط التوكن في كل request ──
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── 4. Response interceptor — الريفريش ──
let refreshPromise = null

// الطلبات يلي لازم ما نعمل الها أي refresh أو redirect تلقائي
// لأنه فشلها الطبيعي هو "بيانات دخول غلط" مش "جلسة منتهية"
const AUTH_ENDPOINTS_NO_REFRESH = [
  '/api/auth/customer/local/login',
  '/api/auth/customer/local/register',
  '/api/auth/seller/local/login',
  '/api/auth/seller/local/register',
  '/api/auth/customer/google/login',
  '/api/auth/customer/google/register',
  '/api/auth/seller/google/login',
  '/api/auth/seller/google/register/init',
  '/api/auth/seller/google/register/complete',
  '/api/auth/refresh-token',
]

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // إذا الطلب الفاشل هو أصلاً طلب تسجيل دخول/تسجيل → رجّعي الخطأ زي ما هو
    // بدون أي محاولة refresh أو تحويل لصفحة تانية
    const isAuthEndpoint = AUTH_ENDPOINTS_NO_REFRESH.some((url) =>
      original.url?.includes(url)
    )

    if (isAuthEndpoint) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      // منع الـ race condition
      if (!refreshPromise) {
        refreshPromise = authAPI.refreshToken().finally(() => {
          refreshPromise = null
        })
      }

      try {
        const res = await refreshPromise
        const newToken = res.data.data.accessToken
        localStorage.setItem('token', newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        const userType = localStorage.getItem('userType') || 'customer'
        localStorage.clear()
        window.location.href = `/login/${userType}`
      }
    }

    return Promise.reject(error)
  }
)
// ── 5. export ──
export default api