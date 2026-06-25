 const BASE_URL = import.meta.env.VITE_API_URL || "https://gaza-gate-backend.onrender.com";

async function requestJSON(endpoint, body, token, method = "POST") {
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data;
}

// جلب كل طلبات البائع
// ⚠️ المسار "/api/order/seller" افتراضي - تأكدي من نور (Backend) شو المسار الصحيح بالضبط
export async function getSellerOrders(token) {
  return requestJSON("/api/order/seller", null, token, "GET");
}

// جلب تفاصيل طلب واحد - رح تحتاجيها بصفحة OrderDetails.jsx
export async function getOrderById(orderId, token) {
  return requestJSON(`/api/order/${orderId}`, null, token, "GET");
}

// تحديث حالة الطلب (مثلاً: shipped, delivered) - رح تحتاجيها بـ OrdersManagement.jsx
export async function updateOrderStatus(orderId, newStatus, token) {
  return requestJSON(`/api/order/${orderId}/status`, { status: newStatus }, token, "PATCH");
}