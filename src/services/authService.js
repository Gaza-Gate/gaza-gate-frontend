// ================================================================
//  authService.js
//  All API calls related to authentication live here.
//  To connect your real backend:
//    1. Replace BASE_URL with your actual API URL
//    2. Remove the mock delay / mock response block
//    3. The rest of the code stays the same
// ================================================================
 
const BASE_URL = "https://api.example.com";
 
// ----------------------------------------------------------------
//  Helper: wrap every fetch call with consistent error handling
// ----------------------------------------------------------------
async function request(endpoint, body) {
  // 🔧 If your backend needs extra headers (e.g. API key), add them here:
  const headers = {
    "Content-Type": "application/json",
    // "X-Api-Key": "YOUR_API_KEY_HERE",
  };
 
  // ── MOCK: simulates a network delay (DELETE this block when using real API) ──
  await new Promise((resolve) => setTimeout(resolve, 1200));
 
  if (body.email === "test@test.com" && body.password === "123456") {
    // ── MOCK: successful login response ──
    return {
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.MOCK_TOKEN",
      user: { id: 1, name: "صاحب المتجر", email: body.email },
    };
  } else {
    // ── MOCK: failed login ──
    throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
  }
  // ── END MOCK ──────────────────────────────────────────────────
 
  // ✅ REAL API call (uncomment when ready):
  // const res = await fetch(`${BASE_URL}${endpoint}`, {
  //   method: "POST",
  //   headers,
  //   body: JSON.stringify(body),
  // });
  // const data = await res.json();
  // if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  // return data;
}
 
// ----------------------------------------------------------------
//  loginUser — email + password login
//  Returns: { token: string, user: object }
//
//  After getting `token`, store it and attach it to future requests:
//    localStorage.setItem("token", data.token)
//    Authorization: `Bearer ${token}`   ← add this header to protected routes
// ----------------------------------------------------------------
export async function loginUser(email, password) {
  return request("/auth/login", { email, password });
}
 
// ----------------------------------------------------------------
//  forgotPassword
//  Returns: { message: string }
// ----------------------------------------------------------------
export async function forgotPassword(email) {
  return request("/auth/forgot-password", { email });
}
 
// ----------------------------------------------------------------
//  socialLogin — Google / Facebook / Apple
//  @param provider  "google" | "facebook" | "apple"
//  @param token     access token from the provider's SDK
//  Returns: { token: string, user: object }
// ----------------------------------------------------------------
export async function socialLogin(provider, token) {
  return request("/auth/social", { provider, token });
}