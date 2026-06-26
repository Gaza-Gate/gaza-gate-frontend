const BASE_URL = import.meta.env.VITE_API_URL || "https://gaza-gate-backend.onrender.com";

async function request(endpoint, body, token = null, method = "POST") {
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.data?.message || data.message || "حدث خطأ، حاول مرة ثانية");
  return data;
}

export function getAuthToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

export async function loginSeller(email, password) {
  return request("/api/auth/seller/local/login", { email, password });
}

export async function registerSeller(formData) {
  return request("/api/auth/seller/local/register", formData);
}

export async function forgotPassword(email) {
  return request("/api/auth/forgot-password", { email });
}

export async function changePassword(passwordData, token) {
  return request("/api/seller/change-password", passwordData, token, "PUT");
}

export async function updateStoreProfile(profileData, token) {
  return request("/api/seller/profile", profileData, token, "PUT");
}

// ── Google Login (للمستخدم الموجود مسبقاً) ──
// الـ backend بده: { token: "<google_id_token>" }
export async function sellerGoogleLogin(googleIdToken) {
  return request("/api/auth/seller/google/login", { token: googleIdToken });
}

export async function customerGoogleLogin(googleIdToken) {
  return request("/api/auth/customer/google/login", { token: googleIdToken });
}

// ── Google Register للـ Seller (خطوتين) ──
// الخطوة 1: إرسال الـ token → يرجع pendingToken
export async function sellerGoogleRegisterInit(googleIdToken) {
  return request("/api/auth/seller/google/register/init", { token: googleIdToken });
}

// الخطوة 2: إكمال التسجيل بـ pendingToken + بيانات المتجر
export async function sellerGoogleRegisterComplete(pendingToken, storeName, storeDescription) {
  return request("/api/auth/seller/google/register/complete", {
    pendingToken,
    storeName,
    storeDescription,
  });
}

// ── Google Register للـ Customer ──
export async function customerGoogleRegister(googleIdToken) {
  return request("/api/auth/customer/google/register", { token: googleIdToken });
}

export async function resendVerificationCode(email) {
  return request("/api/auth/resend-verification-code", { email });
}

export async function verifyResetCode(email, code) {
  return request("/api/auth/verify-reset-code", { email, code });
}

export async function resetPassword(resetToken, newPassword, confirmPassword) {
  return request("/api/auth/reset-password", { resetToken, newPassword, confirmPassword });
}

export async function getConversations(token) {
  return request("/api/seller/conversations", undefined, token, "GET");
}

export async function getMessages(conversationId, token) {
  return request(`/api/seller/conversations/${conversationId}/messages`, undefined, token, "GET");
}

export async function sendMessage(conversationId, text, token) {
  return request(`/api/seller/conversations/${conversationId}/messages`, { text }, token);
}

export async function verifyEmail(email, code) {
  return request("/api/auth/verify-email", { email, code });
}