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

export async function getConversations() {
  const res = await api.get("/api/seller/conversations");
  return res.data;
}

export async function getMessages(conversationId) {
  const res = await api.get(`/api/seller/conversations/${conversationId}/messages`);
  return res.data;
}

export async function sendMessage(conversationId, text) {
  const res = await api.post(`/api/seller/conversations/${conversationId}/messages`, { text });
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