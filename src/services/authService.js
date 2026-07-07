import api from "../utils/api";

export function getAuthToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

export async function loginSeller(email, password) {
  const res = await api.post("/api/auth/seller/local/login", { email, password });
  return res.data;
}

export async function registerSeller(formData) {
  const res = await api.post("/api/auth/seller/local/register", formData);
  return res.data;
}

export async function forgotPassword(email) {
  const res = await api.post("/api/auth/forgot-password", { email });
  return res.data;
}

// ✅ المسار الصحيح حسب Postman: PUT /api/seller/profile/changePassword
export async function changePassword(passwordData) {
  const res = await api.put("/api/seller/profile/changePassword", passwordData);
  return res.data;
}

export async function updateStoreProfile(profileData) {
  const res = await api.put("/api/seller/profile", profileData);
  return res.data;
}

export async function sellerGoogleLogin(googleToken) {
  const res = await api.post("/api/auth/seller/google/login", { token: googleToken });
  return res.data;
}

export async function customerGoogleLogin(googleToken) {
  const res = await api.post("/api/auth/customer/google", { token: googleToken });
  return res.data;
}

export async function resendVerificationCode(email) {
  const res = await api.post("/api/auth/resend-verification-code", { email });
  return res.data;
}

export async function verifyResetCode(email, code) {
  const res = await api.post("/api/auth/verify-reset-code", { email, code });
  return res.data;
}

export async function resetPassword(resetToken, newPassword, confirmPassword) {
  const res = await api.post("/api/auth/reset-password", { resetToken, newPassword, confirmPassword });
  return res.data;
}

// ✅ محدّثة حسب Postman

// جيب هوية البائع الحالي المخزّنة وقت تسجيل الدخول
export function getCurrentUser() {
  const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function getConversations(page = 1) {
  const res = await api.get(`/api/conversations/?page=${page}`);
  return res.data;
}

export async function getMessages(conversationId, page = 1) {
  const res = await api.get(`/api/conversations/${conversationId}?page=${page}`);
  return res.data;
}

export async function sendMessage(conversationId, text) {
  const res = await api.post(`/api/conversations/${conversationId}/messages`, {
    content: text,
  });
  return res.data;
}

export async function verifyEmail(email, code) {
  const res = await api.post("/api/auth/verify-email", { email, code });
  return res.data;
}

export async function sellerGoogleRegister(googleToken) {
  const res = await api.post("/api/auth/seller/google/register/init", { token: googleToken });
  return res.data;
}

export async function sellerGoogleRegisterComplete(data) {
  const res = await api.post("/api/auth/seller/google/register/complete", data);
  return res.data;
}

// تسجيل الخروج من الجهاز الحالي فقط
export async function logout() {
  const res = await api.post("/api/auth/logout");
  return res.data;
}

// تسجيل الخروج من جميع الأجهزة (إبطال كل التوكنات على السيرفر)
export async function logoutAll() {
  const res = await api.post("/api/auth/logout-all");
  return res.data;
}