import axios from 'axios'

const ENV_API_URL = import.meta.env.VITE_API_URL
const DEFAULT_API_URL = 'https://gaza-gate-backend-f9hf.onrender.com'
const API_BASE_URL = ENV_API_URL || DEFAULT_API_URL
export { API_BASE_URL }

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// ── dev warning: لو الـ frontend على localhost بس الـ API على دومين بعيد ──
if (typeof window !== "undefined" && import.meta.env.DEV) {
  const isLocalFrontend = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  const isRemoteApi = !API_BASE_URL.includes("localhost") && !API_BASE_URL.includes("127.0.0.1")
  if (isLocalFrontend && isRemoteApi) {
    console.warn(
      "%c⚠️ تحذير API",
      "color: #f59e0b; font-weight: bold; font-size: 14px;",
      "\nالـ Frontend شغّال على localhost بس الـ API على دومين بعيد:",
      `\n  Frontend: ${window.location.origin}`,
      `\n  API:      ${API_BASE_URL}`,
      "\nإذا بدك تستخدم باك محلي، عدّل VITE_API_URL في .env.development إلى http://localhost:5000"
    )
  } else {
    console.info(
      "%c🔗 API Base URL",
      "color: #2563eb; font-weight: bold;",
      API_BASE_URL
    )
  }
}

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

  // ✅ إصلاح 400 Bad Request عند إرسال FormData (تقييم بصورة، بروفايل بصورة، ...)
  // السبب: الـ instance عنده Content-Type: application/json كـ default،
  // و axios 1.18.1 (لاحظنا تجريبياً) لما Content-Type ناقص من الـ config
  // بيُطبّق Content-Type: application/x-www-form-urlencoded
  // على الـ FormData، والباك بيرفضه لأنه متوقع multipart/form-data مع boundary.
  //
  // الحل: نُحدد Content-Type صراحة كـ "multipart/form-data" بدون boundary
  // → المتصفح بيُضيف الـ boundary تلقائياً.
  // ملاحظة: ما نمسح Content-Type! نُحدد القيمة الصحيحة.
  //
  // ⚠️ تحديث مهم: سابقاً كنا نمسح Content-Type (delete)
  // لكن axios 1.18.1 بترجم حذف الـ Content-Type إلى "application/x-www-form-urlencoded"
  // للـ FormData، مما سبّب 400 Bad Request من الباك. الآن نضبط القيمة صراحة.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers && typeof config.headers.set === 'function') {
      // AxiosHeaders instance (axios 1.x) — الطريقة الصحيحة
      config.headers.set('Content-Type', 'multipart/form-data')
    } else if (config.headers) {
      // plain object (احتياط)
      config.headers['Content-Type'] = 'multipart/form-data'
    }
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

/**
 * استخراج الـ path من URL كامل (يشيل الـ baseURL والـ query string)
 */
function getPathFromUrl(fullUrl) {
  if (!fullUrl || typeof fullUrl !== "string") return ""
  try {
    // ✅ لو الـ URL كامل (مثلاً https://api.example.com/api/auth/.../login?page=1)
    //    بنعمل URL object وناخد pathname
    if (fullUrl.startsWith("http://") || fullUrl.startsWith("https://")) {
      const urlObj = new URL(fullUrl)
      return urlObj.pathname
    }
    // ✅ لو path فقط — نشيل query string يدوياً
    return fullUrl.split("?")[0]
  } catch {
    return fullUrl.split("?")[0]
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // ✅ استخرج الـ path فقط (بدون baseURL ولا query string)
    //    عشان نتجنب المطابقات الخاطئة لما URL يحتوي على الـ auth path كـ substring
    //    (مثلاً لو في endpoint ثاني فيه "login" بكلمة مشابهة)
    const requestPath = getPathFromUrl(original.url)

    // إذا الطلب الفاشل هو أصلاً طلب تسجيل دخول/تسجيل → رجّعي الخطأ زي ما هو
    // بدون أي محاولة refresh أو تحويل لصفحة تانية
    const isAuthEndpoint = AUTH_ENDPOINTS_NO_REFRESH.some((url) => {
      // ✅ مطابقة exact على الـ path (مع أو بدون trailing slash)
      return requestPath === url || requestPath === url + "/"
    })

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