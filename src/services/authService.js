const BASE_URL = import.meta.env.VITE_API_URL || "https://gaza-gate-backend.onrender.com";

async function request(endpoint, body, token = null, method = "POST") {
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  let res;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("تعذر الاتصال بالسيرفر، تحقق من اتصالك بالإنترنت");
  }

  // 429: تجاوزت عدد المحاولات المسموح
  if (res.status === 429) {
    throw new Error("عدد المحاولات كبير جداً، الرجاء الانتظار دقيقة وإعادة المحاولة");
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  // بعض نقاط النهاية بترجع 200 OK لكن مع status: "fail" بالـ body
  if (!res.ok || data?.status === "fail" || data?.success === false) {
    const message =
      data?.message ||
      data?.data?.message ||
      data?.error ||
      "حدث خطأ، حاول مرة ثانية";
    const err = new Error(message);
    err.code = data?.code || data?.data?.code;
    err.status = res.status;
    err.response = data;
    throw err;
  }

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

export async function sellerGoogleLogin(googleToken) {
  return request("/api/auth/seller/google/login", { token: googleToken }, null, "POST");
}

export async function customerGoogleLogin(googleToken) {
  return request("/api/auth/customer/google/login", { token: googleToken }, null, "POST");
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

export async function sellerGoogleRegister(googleToken) {
  return request("/api/auth/seller/google/register/init", { token: googleToken });
}

export async function sellerGoogleRegisterComplete(data) {
  return request("/api/auth/seller/google/register/complete", data);
}

export async function customerGoogleRegister(googleIdToken) {
  return request("/api/auth/customer/google/register", { token: googleIdToken });
}