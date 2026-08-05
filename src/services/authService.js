// src/services/authService.js
//
// ✅ تم التنظيف — يحتوي فقط على دوال المصادقة الأساسية (Auth essentials).
//    أي شيء آخر (orders, cart, wishlist, profile, notifications, conversations)
//    تم نقله إلى services متخصصة:
//      - orderService.js
//      - productService.js
//      - notificationService.js
//      - profileService.js
//      - storeService.js
//      - reviewService.js
//
// الدوال هنا تتعامل فقط مع:
//   - Auth tokens (getAuthToken, getCurrentUser)
//   - Customer/Seller local auth (login, register)
//   - Customer/Seller Google OAuth (login, register, init, complete)
//   - Password recovery (forgot, verify code, reset)
//   - Email verification (verify, resend code)
//   - Logout (logout, logoutAll)

import api from "../utils/api";

// ── Helpers (token + current user) ───────────────────────

/**
 * يرجع الـ access token من localStorage أو sessionStorage
 */
export function getAuthToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

/**
 * يرجع الـ user object من localStorage (لو موجود)
 */
export function getCurrentUser() {
  const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Customer Local Auth ──────────────────────────────────

/**
 * POST /api/auth/customer/local/login
 */
export async function loginCustomer(email, password) {
  const res = await api.post("/api/auth/customer/local/login", { email, password });
  return res.data;
}

/**
 * POST /api/auth/customer/local/register
 */
export async function registerCustomer(formData) {
  const res = await api.post("/api/auth/customer/local/register", formData);
  return res.data;
}

// ── Customer Google Auth ─────────────────────────────────

/**
 * POST /api/auth/customer/google/login
 */
export async function customerGoogleLogin(googleToken) {
  const res = await api.post("/api/auth/customer/google/login", { token: googleToken });
  return res.data;
}

/**
 * POST /api/auth/customer/google/register
 */
export async function customerGoogleRegister(googleIdToken) {
  const res = await api.post("/api/auth/customer/google/register", { token: googleIdToken });
  return res.data;
}

// ── Seller Local Auth ────────────────────────────────────

/**
 * POST /api/auth/seller/local/login
 */
export async function loginSeller(email, password) {
  const res = await api.post("/api/auth/seller/local/login", { email, password });
  return res.data;
}

/**
 * POST /api/auth/seller/local/register
 */
export async function registerSeller(formData) {
  const res = await api.post("/api/auth/seller/local/register", formData);
  return res.data;
}

// ── Seller Google Auth ───────────────────────────────────

/**
 * POST /api/auth/seller/google/login
 */
export async function sellerGoogleLogin(googleToken) {
  const res = await api.post("/api/auth/seller/google/login", { token: googleToken });
  return res.data;
}

/**
 * POST /api/auth/seller/google/register/init
 * (للـ Google OAuth — مرحلة init)
 */
export async function sellerGoogleRegister(googleToken) {
  const res = await api.post("/api/auth/seller/google/register/init", { token: googleToken });
  return res.data;
}

/**
 * POST /api/auth/seller/google/register/complete
 * (للـ Google OAuth — مرحلة complete)
 */
export async function sellerGoogleRegisterComplete(data) {
  const res = await api.post("/api/auth/seller/google/register/complete", data);
  return res.data;
}

// ── Email Verification ───────────────────────────────────

/**
 * POST /api/auth/verify-email
 * (بعد التسجيل، الزبون يدخل الكود اللي وصلة على الإيميل)
 */
export async function verifyEmail(email, code) {
  const res = await api.post("/api/auth/verify-email", { email, code });
  return res.data;
}

/**
 * POST /api/auth/resend-verification-code
 * (إعادة إرسال كود التحقق)
 */
export async function resendVerificationCode(email) {
  const res = await api.post("/api/auth/resend-verification-code", { email });
  return res.data;
}

// ── Password Recovery ────────────────────────────────────

/**
 * POST /api/auth/forgot-password
 * (يبدأ عملية استعادة كلمة المرور — يرسل كود على الإيميل)
 */
export async function forgotPassword(email) {
  const res = await api.post("/api/auth/forgot-password", { email });
  return res.data;
}

/**
 * POST /api/auth/verify-reset-code
 * (يتحقق من كود الاستعادة)
 */
export async function verifyResetCode(email, code) {
  const res = await api.post("/api/auth/verify-reset-code", { email, code });
  return res.data;
}

/**
 * POST /api/auth/reset-password
 * (يغيّر كلمة المرور باستخدام الـ resetToken)
 */
export async function resetPassword(resetToken, newPassword, confirmPassword) {
  const res = await api.post("/api/auth/reset-password", {
    resetToken,
    newPassword,
    confirmPassword,
  });
  return res.data;
}

// ── Password Change (auth-protected — يحتاج توكن) ─────

/**
 * PUT /api/seller/profile/changePassword
 * تغيير كلمة مرور البائع
 * ⚠️ الباك endpoint اسمه للبائع بس — لو الزبون بدو يغير، الباك لازم يدعمه
 *    في endpoint منفصل (مثلاً /api/profile/customer/changePassword)
 */
export async function changePassword(passwordData) {
  const res = await api.put("/api/seller/profile/changePassword", passwordData);
  return res.data;
}

// ── Logout ───────────────────────────────────────────────

/**
 * POST /api/auth/logout
 * تسجيل الخروج من الجهاز الحالي فقط
 */
export async function logout() {
  const res = await api.post("/api/auth/logout");
  return res.data;
}

/**
 * POST /api/auth/logout-all
 * تسجيل الخروج من جميع الأجهزة (إبطال كل التوكنات على السيرفر)
 */
export async function logoutAll() {
  const res = await api.post("/api/auth/logout-all");
  return res.data;
}

// ── Cart (kept here for now — يحتاج refactor لـ cartService.js) ─────

/**
 * POST /api/customer/cart
 * إضافة منتج للسلة
 * ⚠️ التوكن بيُضاف تلقائياً عبر الـ axios interceptor
 * @param {string} productId
 * @param {number} quantity
 */
export async function addToCart(productId, quantity) {
  const res = await api.post("/api/customer/cart", { productId, quantity });
  return res.data?.data?.item || res.data?.item || res.data;
}

// ── Token Refresh (دوال مساعدة لـ useAutoRefreshToken) ─────

/**
 * POST /api/auth/refresh-token
 * تجديد الـ access token (يُرسل refreshToken عبر Cookie تلقائياً بسبب withCredentials)
 * @returns {Promise<string>} الـ accessToken الجديد
 */
export async function refreshAccessToken() {
  const res = await api.post("/api/auth/refresh-token");
  const newToken = res.data?.data?.accessToken;
  if (!newToken) {
    throw new Error("لم يصلنا accessToken جديد من السيرفر");
  }
  return newToken;
}

/**
 * حفظ الـ accessToken الجديد في localStorage أو sessionStorage
 * @param {string} token - الـ accessToken الجديد
 * @param {boolean} remember - true = localStorage, false = sessionStorage
 */
export function saveRefreshedToken(token, remember = true) {
  if (!token) return;
  if (remember) {
    localStorage.setItem("token", token);
  } else {
    sessionStorage.setItem("token", token);
  }
}

// ── Wishlist (kept here per spec — توكن الـ auth لازم يكون موجود) ───

/**
 * GET /api/customer/wishlist?page=1
 * جلب قائمة المفضلة للزبون
 */
export async function getCustomerWishlist(page = 1) {
  const res = await api.get(`/api/customer/wishlist?page=${page}`);
  return res.data?.data || res.data;
}

/**
 * POST /api/customer/wishlist
 * إضافة منتج للمفضلة
 * @param {string} productId - الـ id الخاص بالمنتج
 */
export async function addToWishlist(productId) {
  const res = await api.post("/api/customer/wishlist", { productId });
  return res.data?.data?.item || res.data?.item || res.data;
}

/**
 * DELETE /api/customer/wishlist/:wishlistItemId
 * إزالة منتج من المفضلة
 * ⚠️ الـ :id في الـ endpoint هو wishlistItemId (الـ id الخاص بسجل الـ wishlist) —
 *    مش productId. كل عنصر في الـ wishlist له id مستقل.
 * @param {string} wishlistItemId - الـ id الخاص بسجل الـ wishlist (مش المنتج)
 */
export async function removeFromWishlist(wishlistItemId) {
  const res = await api.delete(`/api/customer/wishlist/${wishlistItemId}`);
  return res.data;
}
