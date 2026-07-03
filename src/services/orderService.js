import api from '../utils/api';// ⚠️ عدّلي هاد المسار حسب مكان ملف الـ axios (api.js) عندك بالضبط

// جلب كل طلبات البائع
export async function getSellerOrders() {
  const res = await api.get('/api/order/');
  return res.data;
}

// تحديث حالة الطلب (مثلاً: shipped, delivered) - مستخدمة بـ OrdersManagement.jsx
export async function updateOrderStatus(orderId, newStatus) {
  const res = await api.patch(`/api/order/${orderId}/status`, { status: newStatus });
  return res.data;
}