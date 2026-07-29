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

// المسار الصحيح حسب Postman: PUT /api/seller/profile/changePassword
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
  const res = await api.post("/api/auth/customer/google/login", { token: googleToken });
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

export async function customerGoogleRegister(googleIdToken) {
  const res = await api.post("/api/auth/customer/google/register", { token: googleIdToken });
  return res.data;
}

export async function getCustomerProfile() {
  const res = await api.get("/api/profile/customer");
  return res.data?.data?.profile || res.data?.profile || res.data;
}

export async function updateCustomerProfile(profileData) {
  const res = await api.put("/api/profile/customer", profileData);
  return res.data;
}

export async function addCustomerAddress(addressData) {
  const res = await api.post("/api/profile/customer/address", addressData);
  return res.data?.data?.address || res.data?.address || res.data;
}

export async function updateCustomerAddress(addressId, addressData) {
  const res = await api.put(`/api/profile/customer/address/${addressId}`, addressData);
  return res.data?.data?.address || res.data?.address || res.data;
}

export async function deleteCustomerAddress(addressId) {
  const res = await api.delete(`/api/profile/customer/address/${addressId}`);
  return res.data;
}

export async function getCustomerHomeData(page = 1) {
  const res = await api.get(`/api/customer/home/?page=${page}`);
  return res.data?.data?.home || res.data?.home || res.data;
}

export async function getCustomerWishlist(page = 1) {
  const res = await api.get(`/api/customer/wishlist/?page=${page}`);
  return res.data?.data || res.data;
}

export async function addToWishlist(productId) {
  const res = await api.post("/api/customer/wishlist/", { productId });
  return res.data?.data?.item || res.data?.item || res.data;
}

export async function removeFromWishlist(productId) {
  const res = await api.delete(`/api/customer/wishlist/${productId}`);
  return res.data;
}

export async function getCustomerCart(page = 1) {
  const res = await api.get(`/api/customer/cart/?page=${page}`);
  return res.data?.data || res.data;
}

export async function addToCart(productId, quantity) {
  const res = await api.post("/api/customer/cart/", { productId, quantity });
  return res.data?.data?.item || res.data?.item || res.data;
}

export async function updateCartItem(cartItemId, quantity) {
  const res = await api.put(`/api/customer/cart/${cartItemId}`, { quantity });
  return res.data?.data?.item || res.data?.item || res.data;
}

export async function removeCartItem(cartItemId) {
  const res = await api.delete(`/api/customer/cart/${cartItemId}`);
  return res.data;
}

export async function clearCart() {
  const res = await api.delete("/api/customer/cart/");
  return res.data;
}

export async function getCustomerOrders() {
  const res = await api.get("/api/customer/order");
  return res.data?.data?.orders || res.data?.orders || res.data;
}

export async function getCustomerOrderDetails(orderId) {
  const res = await api.get(`/api/customer/order/${orderId}`);
  return res.data?.data?.order || res.data?.order || res.data;
}

export async function cancelCustomerOrder(orderId) {
  // PATCH بدون body — مطابق لـ spec الباك
  const res = await api.patch(`/api/customer/order/${orderId}/cancel`);
  return res.data?.data?.order || res.data?.order || res.data;
}

export async function createOrder(orderData) {
  const res = await api.post("/api/customer/order", orderData);
  return res.data?.data?.order || res.data?.order || res.data;
}

// ⚠️ تم نقل becomeSeller / switchRole / becomeCustomer لـ services/roleService.js
//    (مصدر واحد للحقيقة — ممنوع التكرار لأنه يسبب state drift)
//    استخدم imports من "../services/roleService" بدال ذلك.
// ⚠️ تم حذف submitProductReview — استخدم submitReview من "../services/reviewService" بدلاً منها

// ── مراسلات العميل ──
export async function getCustomerConversations() {
  const res = await api.get("/api/conversations/");
  return res.data;
}

export async function getCustomerMessages(conversationId) {
  const res = await api.get(`/api/conversations/${conversationId}`);
  return res.data;
}

export async function sendCustomerMessage(conversationId, text) {
  const res = await api.post(`/api/conversations/${conversationId}/messages`, {
    content: text,
  });
  return res.data;
}

export async function markConversationAsRead(conversationId) {
  // ✅ حسب spec الباك: PATCH /api/conversations/:id/read
  const res = await api.patch(`/api/conversations/${conversationId}/read`);
  return res.data;
}

export async function createConversation(
  sellerId,
  sourceType = "seller",
  sourceId = null,
  options = {}
) {
  const { customerId, productId } = options;
  const currentUser = customerId ? { id: customerId } : getCurrentUser();

  // ✅ الباك بده body كامل حسب الـ spec تبع الـ response
  const payload = {
    sellerId,
    customerId: currentUser?.id,
    sourceType,
    // لو ما في sourceId (مثلاً المتجر بدون منتج) → نفس الـ sellerId
    sourceId: sourceId || sellerId,
    // ✅ الباك بيرجّع activeProductId بالـ response → لازم نمرره حتى لو null
    activeProductId: productId || null,
  };

  const res = await api.post("/api/conversations/", payload);
  return res.data;
}

// ── تنبيهات العميل ──
export async function getCustomerNotifications() {
  const res = await api.get("/api/customer/notifications");
  return res.data;
}

export async function markCustomerNotificationRead(id) {
  const res = await api.patch(`/api/customer/notifications/${id}/read`);
  return res.data;
}

export async function markAllCustomerNotificationsRead() {
  const res = await api.patch("/api/customer/notifications/read-all");
  return res.data;
}

export async function clearAllCustomerNotifications() {
  const res = await api.delete("/api/customer/notifications");
  return res.data;
}
