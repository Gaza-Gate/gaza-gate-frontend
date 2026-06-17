const BASE_URL = import.meta.env.VITE_API_URL || "https://gaza-gate-backend.onrender.com";

async function request(endpoint, body, token = null, method = "POST") {
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
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