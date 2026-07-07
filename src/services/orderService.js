import { refreshAccessToken, saveRefreshedToken, forceLogoutRedirect } from "./authService";

const BASE_URL = import.meta.env.VITE_API_URL || "https://gaza-gate-backend.f9hf.onrender.com";

async function requestJSON(endpoint, body, token, method = "POST", _isRetry = false) {
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) }),
  });

  if (res.status === 401 && !_isRetry && token) {
    try {
      const refreshData = await refreshAccessToken();
      const newToken =
        refreshData?.data?.accessToken || refreshData?.accessToken || refreshData?.token;
      if (!newToken) throw new Error("فشل تجديد الجلسة");
      saveRefreshedToken(newToken);
      return requestJSON(endpoint, body, newToken, method, true);
    } catch {
      forceLogoutRedirect();
      throw new Error("انتهت جلستك، الرجاء تسجيل الدخول مرة أخرى");
    }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data;
}

// جلب كل طلبات العميل
export async function getCustomerOrders(token) {
  return requestJSON("/api/order/customer", null, token, "GET");
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