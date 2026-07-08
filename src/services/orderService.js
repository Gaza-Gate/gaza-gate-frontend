import { apiRequest } from "./authService";

// جلب كل طلبات العميل
export async function getCustomerOrders(token) {
  return apiRequest("/api/order/customer", null, token, "GET");
}

// جلب كل طلبات البائع
export async function getSellerOrders(token) {
  return apiRequest("/api/order/seller", null, token, "GET");
}

// جلب تفاصيل طلب واحد
export async function getOrderById(orderId, token) {
  return apiRequest(`/api/order/${orderId}`, null, token, "GET");
}

// تحديث حالة الطلب
export async function updateOrderStatus(orderId, newStatus, token) {
  return apiRequest(`/api/order/${orderId}/status`, { status: newStatus }, token, "PATCH");
}