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
export async function sellerGoogleLogin(googleToken) {
  const res = await api.post("/api/auth/seller/google/login", { token: googleToken });
  return res.data;
}

export async function customerGoogleLogin(googleToken) {
  const res = await api.post("/api/auth/customer/google/login", { token: googleToken });
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
  const res = await api.post(`/api/customer/order/${orderId}/cancel`);
  return res.data?.data?.order || res.data?.order || res.data;
}

export async function createOrder(orderData) {
  const res = await api.post("/api/customer/order", orderData);
  return res.data?.data?.order || res.data?.order || res.data;
}

// ⚠️ المسار "/api/seller/convert" افتراضي - تأكدي من نور (Backend) شو المسار الصحيح بالضبط
export async function convertCustomerToSeller(storeData) {
  const res = await api.post("/api/seller/convert", storeData);
  return res.data;
}

export async function submitProductReview({ productId, orderId, rating, comment }) {
  const res = await api.post("/api/customer/review", { productId, orderId, rating, comment });
  return res.data?.data || res.data;
}

// ── مراسلات العميل ──
export async function getCustomerConversations() {
  const res = await api.get("/api/customer/conversations");
  return res.data;
}

export async function getCustomerMessages(conversationId) {
  const res = await api.get(`/api/customer/conversations/${conversationId}/messages`);
  return res.data;
}

export async function sendCustomerMessage(conversationId, text) {
  const res = await api.post(`/api/customer/conversations/${conversationId}/messages`, { text });
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