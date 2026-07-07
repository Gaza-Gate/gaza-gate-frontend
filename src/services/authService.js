const BASE_URL = import.meta.env.VITE_API_URL || "https://gaza-gate-backend.f9hf.onrender.com";

// ── منطق تجديد التوكن (Refresh Token) — يمنع التكرار المتزامن ──
let refreshPromise = null;

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      let res;
      try {
        res = await fetch(`${BASE_URL}/api/auth/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
      } catch (err) {
        throw new Error("تعذر الاتصال بالسيرفر لتجديد الجلسة");
      }

      let data;
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok || data?.status === "fail" || data?.success === false) {
        throw new Error(data?.message || "انتهت صلاحية الجلسة");
      }

      const newToken = data?.data?.accessToken || data?.accessToken || data?.data?.token || data?.token;
      if (!newToken) throw new Error("لم يتم استلام رمز الدخول الجديد");
      return newToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function saveRefreshedToken(token, remember = true) {
  if (!token) return;
  if (remember) {
    localStorage.setItem("token", token);
    sessionStorage.removeItem("token");
  } else {
    sessionStorage.setItem("token", token);
    localStorage.removeItem("token");
  }
}

export function forceLogoutRedirect() {
  const userType = localStorage.getItem("userType") || sessionStorage.getItem("userType") || "customer";
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("userType");
  sessionStorage.removeItem("token");
  window.location.href = `/login/${userType}`;
}


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
      ...(body && { body: JSON.stringify(body) }),
    });
  } catch (err) {
    console.error("Network error:", err);
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

export async function getCustomerProfile(token) {
  const response = await request("/api/profile/customer", undefined, token, "GET");
  return response.data?.profile || response.profile || response;
}

export async function updateCustomerProfile(profileData, token) {
  return request("/api/profile/customer", profileData, token, "PUT");
}

export async function addCustomerAddress(addressData, token) {
  const response = await request("/api/profile/customer/address", addressData, token, "POST");
  return response.data?.address || response.address || response;
}

export async function updateCustomerAddress(addressId, addressData, token) {
  const response = await request(`/api/profile/customer/address/${addressId}`, addressData, token, "PUT");
  return response.data?.address || response.address || response;
}

export async function deleteCustomerAddress(addressId, token) {
  return request(`/api/profile/customer/address/${addressId}`, undefined, token, "DELETE");
}

export async function getCustomerHomeData(token, page = 1) {
  const response = await request(`/api/customer/home/?page=${page}`, undefined, token, "GET");
  return response.data?.home || response.home || response;
}

export async function getCustomerWishlist(token, page = 1) {
  const response = await request(`/api/customer/wishlist/?page=${page}`, undefined, token, "GET");
  return response.data || response;
}

export async function addToWishlist(productId, token) {
  const response = await request("/api/customer/wishlist/", { productId }, token, "POST");
  return response.data?.item || response.item || response;
}

export async function removeFromWishlist(productId, token) {
  return request(`/api/customer/wishlist/${productId}`, undefined, token, "DELETE");
}

export async function getCustomerCart(token, page = 1) {
  const response = await request(`/api/customer/cart/?page=${page}`, undefined, token, "GET");
  return response.data || response;
}

export async function addToCart(productId, quantity, token) {
  const response = await request("/api/customer/cart/", { productId, quantity }, token, "POST");
  return response.data?.item || response.item || response;
}

export async function updateCartItem(cartItemId, quantity, token) {
  const response = await request(`/api/customer/cart/${cartItemId}`, { quantity }, token, "PUT");
  return response.data?.item || response.item || response;
}

export async function removeCartItem(cartItemId, token) {
  return request(`/api/customer/cart/${cartItemId}`, undefined, token, "DELETE");
}

export async function clearCart(token) {
  return request("/api/customer/cart/", undefined, token, "DELETE");
}

export async function getCustomerOrders(token) {
  const response = await request("/api/customer/order", undefined, token, "GET");
  return response.data?.orders || response.orders || response;
}

export async function getCustomerOrderDetails(orderId, token) {
  const response = await request(`/api/customer/order/${orderId}`, undefined, token, "GET");
  return response.data?.order || response.order || response;
}

export async function cancelCustomerOrder(orderId, token) {
  const response = await request(`/api/customer/order/${orderId}/cancel`, undefined, token, "POST");
  return response.data?.order || response.order || response;
}

export async function createOrder(orderData, token) {
  console.log("Creating order with data:", orderData);
  const response = await request("/api/customer/order", orderData, token, "POST");
  console.log("Order response:", response);
  return response.data?.order || response.order || response;
}

// تحويل حساب مشتري حالي إلى بائع (إنشاء متجر جديد لنفس الحساب)
// ⚠️ المسار "/api/seller/convert" افتراضي - تأكدي من نور (Backend) شو المسار الصحيح بالضبط
export async function convertCustomerToSeller(storeData, token) {
  return request("/api/seller/convert", storeData, token, "POST");
}
// إرسال تقييم لمنتج ضمن طلب معين
export async function submitProductReview({ productId, orderId, rating, comment }, token) {
  const response = await request(
    "/api/customer/review",
    { productId, orderId, rating, comment },
    token,
    "POST"
  );
  return response.data || response;
}


// ── مراسلات العميل ──
export async function getCustomerConversations(token) {
  return request("/api/customer/conversations", undefined, token, "GET");
}

export async function getCustomerMessages(conversationId, token) {
  return request(`/api/customer/conversations/${conversationId}/messages`, undefined, token, "GET");
}

export async function sendCustomerMessage(conversationId, text, token) {
  return request(`/api/customer/conversations/${conversationId}/messages`, { text }, token);
}

// ── تنبيهات العميل ──
export async function getCustomerNotifications(token) {
  return request("/api/customer/notifications", undefined, token, "GET");
}

export async function markCustomerNotificationRead(id, token) {
  return request(`/api/customer/notifications/${id}/read`, undefined, token, "PATCH");
}

export async function markAllCustomerNotificationsRead(token) {
  return request("/api/customer/notifications/read-all", undefined, token, "PATCH");
}

export async function clearAllCustomerNotifications(token) {
  return request("/api/customer/notifications", undefined, token, "DELETE");
}