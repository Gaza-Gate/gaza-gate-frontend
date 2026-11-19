import api from "../utils/api";

/**
 * ════════════════════════════════════════════════════════════
 *  Order Service — طلبات الزبون + البائع (مطابق للـ Postman)
 * ════════════════════════════════════════════════════════════
 *
 *  Customer Endpoints (Authorization: Bearer <customer token>):
 *  ─ GET    /api/customer/order            → getMyOrders
 *  ─ GET    /api/customer/order/:id        → getOrderDetails
 *  ─ POST   /api/customer/order            → createOrder
 *  ─ PATCH  /api/customer/order/:id/cancel → cancelOrder
 *
 *  Seller Endpoints (Authorization: Bearer <seller token>):
 *  ─ GET    /api/order/                    → getSellerOrders
 *  ─ GET    /api/order/:id                 → getSellerOrderDetails
 *  ─ PATCH  /api/order/:id/reject          → rejectOrder
 *  ─ PATCH  /api/order/:id/status          → updateOrderStatus
 *
 *  ⚠️ ملاحظة هامة: الباك بيقرأ السلة من السيرفر مباشرة عند POST.
 *  الـ payload المطلوب لإنشاء طلب:
 *    { "paymentMethod": "cash_on_delivery" }
 *  (لا نرسل items — الباك بياخدهم من السلة المخزنة على السيرفر)
 */

// ════════════════════════════════════════════════════════════
//  Payment method labels (للعرض في الـ UI)
// ════════════════════════════════════════════════════════════
export const PAYMENT_METHOD_LABELS = {
  cash_on_delivery: { ar: "الدفع عند الاستلام", icon: "💵" },
  cash:             { ar: "الدفع عند الاستلام", icon: "💵" },
  card:             { ar: "بطاقة ائتمانية",     icon: "💳" },
  credit_card:      { ar: "بطاقة ائتمانية",     icon: "💳" },
  paypal:           { ar: "باي بال",            icon: "🅿️" },
  bank_transfer:    { ar: "تحويل بنكي",         icon: "🏦" },
};

export function getPaymentMethodLabel(method) {
  if (!method) return { ar: "غير محدد", icon: "❓" };
  return PAYMENT_METHOD_LABELS[method] ?? { ar: method, icon: "💰" };
}

// ════════════════════════════════════════════════════════════
//  Customer APIs
// ════════════════════════════════════════════════════════════

/**
 * GET /api/customer/order
 * جلب كل طلبات الزبون
 *
 * Response shape:
 *   { status: "success", data: { orders: [{ id, orderNumber, status, totalPrice, ... }] } }
 */
export async function getMyOrders() {
  const res = await api.get("/api/customer/order");
  const orders = res.data?.data?.orders ?? res.data?.orders ?? [];
  return Array.isArray(orders) ? orders : [];
}

/**
 * GET /api/customer/order/:id
 * جلب تفاصيل طلب واحد
 *
 * Response shape:
 *   { status: "success", data: { order: { id, orderNumber, status, totalPrice, items: [...], ... } } }
 */
export async function getOrderDetails(orderId) {
  if (!orderId) throw new Error("orderId is required");
  const res = await api.get(`/api/customer/order/${orderId}`);
  return res.data?.data?.order ?? res.data?.order ?? res.data?.data ?? res.data;
}

/**
 * POST /api/customer/order
 * إنشاء طلب جديد من السلة الموجودة على السيرفر
 *
 * @param {Object} orderData
 * @param {"cash_on_delivery" | "card" | "credit_card" | "paypal"} orderData.paymentMethod
 * @returns {Promise<Array<Object>>} مصفوفة الطلبات المُنشأة (طلب لكل بائع)
 *
 * Response shape (201):
 *   { status: "success", data: { orders: [
 *       { id, orderNumber, status: "pending_review", totalPrice, sellerId, itemsCount }
 *   ] } }
 */
export async function createOrder(orderData) {
  if (!orderData || !orderData.paymentMethod) {
    throw new Error("paymentMethod is required");
  }
  const res = await api.post("/api/customer/order", {
    paymentMethod: orderData.paymentMethod,
  });
  const orders = res.data?.data?.orders ?? res.data?.orders ?? [];
  return Array.isArray(orders) ? orders : orders ? [orders] : [];
}

/**
 * PATCH /api/customer/order/:id/cancel
 * إلغاء طلب
 *
 * Response shape (200):
 *   { status: "success", data: { order: { id, orderNumber, status: "cancelled", ... } } }
 */
export async function cancelOrder(orderId) {
  if (!orderId) throw new Error("orderId is required");
  const res = await api.patch(`/api/customer/order/${orderId}/cancel`);
  return res.data?.data?.order ?? res.data?.order ?? res.data;
}

// ════════════════════════════════════════════════════════════
//  Seller APIs
// ════════════════════════════════════════════════════════════

/**
 * GET /api/order/
 * طلبات البائع (للوحة التحكم)
 * يدعم pagination وstatus filter
 */
export async function getSellerOrders({ page = 1, status } = {}) {
  const params = new URLSearchParams();
  if (page) params.append("page", page);
  if (status) params.append("status", status);
  const qs = params.toString();
  const res = await api.get(`/api/order/${qs ? `?${qs}` : ""}`);
  return res.data;
}

/**
 * GET /api/order/:id
 * تفاصيل طلب واحد (لوحة البائع)
 */
export async function getSellerOrderDetails(orderId) {
  if (!orderId) throw new Error("orderId is required");
  const res = await api.get(`/api/order/${orderId}`);
  return res.data?.data?.order ?? res.data?.order ?? res.data?.data ?? res.data;
}

/**
 * PATCH /api/order/:id/reject
 * رفض طلب (البائع)
 */
export async function rejectOrder(orderId, reason) {
  if (!orderId) throw new Error("orderId is required");
  const res = await api.patch(`/api/order/${orderId}/reject`, { reason });
  return res.data?.data?.order ?? res.data?.order ?? res.data;
}

/**
 * PATCH /api/order/:id/status
 * تحديث حالة طلب (البائع)
 */
export async function updateOrderStatus(orderId, status) {
  if (!orderId) throw new Error("orderId is required");
  if (!status) throw new Error("status is required");
  const res = await api.patch(`/api/order/${orderId}/status`, { status });
  return res.data?.data?.order ?? res.data?.order ?? res.data;
}
