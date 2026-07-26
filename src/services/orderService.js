import api from "../utils/api";

/**
 * ════════════════════════════════════════════════════════════
 *  Order Service — نقطة الربط الموحدة للطلبات
 *  Base URL من VITE_API_URL
 * ════════════════════════════════════════════════════════════
 *
 *  Endpoints المؤكدة من الباك (من Postman):
 *  ─ GET    /api/customer/order                      → getMyOrders
 *  ─ GET    /api/customer/order/:id                  → getOrderDetails
 *  ─ PATCH  /api/customer/order/:id/cancel           → cancelOrder
 *           (⚠️ PATCH وليس POST — مهم!)
 *
 *  شكل الـ response لـ GET /:id:
 *  {
 *    "status": "success",
 *    "data": {
 *      "order": {
 *        "id": "uuid",
 *        "orderNumber": "ORD-158204846",
 *        "status": "pending_review" | "approved" | "preparing" | "shipped" | "completed" | "cancelled" | "rejected",
 *        "totalPrice": 2400,
 *        "paymentMethod": "cash_on_delivery" | "card" | ...,
 *        "createdAt": "ISO",
 *        "updatedAt": "ISO",
 *        "canCancel": true,           ← من الباك
 *        "seller": { "id", "storeName" },
 *        "items": [
 *          {
 *            "id": "item-uuid",
 *            "productId": "product-uuid",   // ⚠️ تأكد من الباك أنه يُعاد
 *            "productName": "...",
 *            "unitPrice": 600,
 *            "quantity": 4,
 *            "lineTotal": 2400,
 *            "primaryImage": "url"
 *          }
 *        ]
 *      }
 *    }
 *  }
 */

/**
 * ترجمة paymentMethod للإنجليزية/العربية
 */
export const PAYMENT_METHOD_LABELS = {
  cash_on_delivery: { ar: "الدفع عند الاستلام", icon: "💵" },
  cash:             { ar: "الدفع عند الاستلام", icon: "💵" },
  card:             { ar: "بطاقة ائتمانية",     icon: "💳" },
  credit_card:      { ar: "بطاقة ائتمانية",     icon: "💳" },
  visa:             { ar: "فيزا",              icon: "💳" },
  mastercard:       { ar: "ماستركارد",          icon: "💳" },
  paypal:           { ar: "باي بال",            icon: "🅿️" },
  bank_transfer:    { ar: "تحويل بنكي",         icon: "🏦" },
};

export function getPaymentMethodLabel(method) {
  if (!method) return { ar: "غير محدد", icon: "❓" };
  return PAYMENT_METHOD_LABELS[method] ?? { ar: method, icon: "💰" };
}

/**
 * تطبيع عنصر طلب قادم من الباك
 */
function normalizeOrder(raw) {
  if (!raw) return null;
  return {
    ...raw,
    // تأكيد الحقول المهمة
    id: raw.id,
    orderNumber: raw.orderNumber ?? raw.id,
    status: (raw.status || "").toLowerCase(),
    totalPrice: Number(raw.totalPrice ?? 0),
    items: Array.isArray(raw.items) ? raw.items.map(normalizeOrderItem) : [],
    seller: raw.seller ?? null,
    canCancel: Boolean(raw.canCancel),
  };
}

function normalizeOrderItem(raw) {
  // ⚠️ انتبه — id هو معرّف سطر الطلب (orderItem) وليس productId
  // الباك يرجع items[].id = orderItem id و items[].productId = product id الحقيقي
  // (عدّلنا fallback — ما بنرجع raw.id لأنه مش نفس الشي)
  const productId =
    raw.productId ??
    raw.product_id ??
    raw.product?.id ??
    raw.product?.productId ??
    null;

  if (!productId) {
    console.warn(
      "[orderService] ⚠️ order item بدون productId:",
      { itemId: raw.id, keys: Object.keys(raw) }
    );
  }

  return {
    ...raw,
    id: raw.id, // ← هاد orderItem id (نمرّره للباك كـ orderItemId)
    productId, // ← هاد product id الحقيقي (نمرّره للباك كـ productId)
    productName: raw.productName ?? "منتج",
    unitPrice: Number(raw.unitPrice ?? 0),
    quantity: Number(raw.quantity ?? 1),
    lineTotal: Number(raw.lineTotal ?? raw.unitPrice ?? 0),
    primaryImage: raw.primaryImage ?? null,
  };
}

/**
 * GET /api/customer/order
 * جلب كل طلبات الزبون
 */
export async function getMyOrders() {
  const res = await api.get("/api/customer/order");
  // الـ response قد يكون array مباشرة، أو { orders: [...] }، أو { data: { orders: [...] } }
  let orders = res.data?.data?.orders
    ?? res.data?.orders
    ?? res.data?.data
    ?? res.data;
  if (!Array.isArray(orders)) orders = [];
  return orders.map(normalizeOrder);
}

/**
 * GET /api/customer/order/:id
 * جلب تفاصيل طلب واحد
 */
export async function getOrderDetails(orderId) {
  if (!orderId) throw new Error("orderId is required");
  const res = await api.get(`/api/customer/order/${orderId}`);
  const order = res.data?.data?.order ?? res.data?.order ?? res.data?.data ?? res.data;
  return normalizeOrder(order);
}

/**
 * PATCH /api/customer/order/:id/cancel
 * إلغاء طلب
 *
 * مطابق لـ API الباك بالضبط:
 *   URL:    /api/customer/order/:id/cancel
 *   Method: PATCH  ← تعمدتاً PATCH وليس POST
 *   Body:   لا يوجد
 *   Response: { status: "success", data: { order: { id, orderNumber, status: "cancelled" } } }
 *
 * @param {string} orderId
 * @returns {Promise<{id, orderNumber, status, canCancel: false}>}
 *          الحقول المُرجعة من الباك فقط (بدون defaults تلغي البيانات الأصلية)
 */
export async function cancelOrder(orderId) {
  if (!orderId) throw new Error("orderId is required");

  // PATCH بدون body — مطابق للـ spec
  const res = await api.patch(`/api/customer/order/${orderId}/cancel`);
  // response: { status: "success", data: { order: { id, orderNumber, status: "cancelled" } } }
  const orderData = res.data?.data?.order ?? res.data?.order ?? res.data ?? {};

  // ⚠️ نُرجع فقط الحقول الموجودة فعلياً من الباك
  // بدون defaults (totalPrice: 0, items: []) عشان ما نمسح بيانات الطلب الأصلية
  return {
    id: orderData.id,
    orderNumber: orderData.orderNumber,
    status: (orderData.status || "cancelled").toLowerCase(),
    canCancel: false, // بعد الإلغاء دائماً false
  };
}

/**
 * GET /api/seller/order
 * طلبات البائع (لوحة التحكم) — للـ seller Dashboard + OrdersManagement
 * يدعم pagination وstatus filter
 */
export async function getSellerOrders(token, { page = 1, status } = {}) {
  const params = new URLSearchParams({ page });
  if (status) params.append("status", status);
  const res = await api.get(`/api/seller/order?${params}`);
  return res.data;
}

/**
 * GET /api/seller/order/:id
 * تفاصيل طلب واحد (لوحة البائع)
 */
export async function getSellerOrderDetails(orderId) {
  if (!orderId) throw new Error("orderId is required");
  const res = await api.get(`/api/seller/order/${orderId}`);
  return res.data?.data?.order ?? res.data?.order ?? res.data;
}

// ════════════════════════════════════════════════════════
//  Re-exports للتوافق العكسي مع authService.js
// ════════════════════════════════════════════════════════

/** @deprecated استخدم getMyOrders من orderService */
export const getCustomerOrders = getMyOrders;

/** @deprecated استخدم getOrderDetails من orderService */
export const getCustomerOrderDetails = getOrderDetails;

/** @deprecated استخدم cancelOrder من orderService */
export const cancelCustomerOrder = cancelOrder;
