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
 * POST /api/customer/order
 * إنشاء طلب جديد
 *
 * ⚠️ الأمان: نرسل فقط productId و quantity — الباك يحسب السعر والـ total بنفسه
 *    من قاعدة البيانات (لتجنب تلاعب الفرونت بالأسعار).
 *
 * @param {Object} orderData
 * @param {Array<{productId: string, quantity: number}>} orderData.items
 * @param {"cash_on_delivery" | "card" | ...} orderData.paymentMethod
 * @returns {Promise<Object>} الطلب المُنشأ
 */
export async function createOrder(orderData) {
  if (!orderData || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    throw new Error("orderData.items is required and must be a non-empty array");
  }
  if (!orderData.paymentMethod) {
    throw new Error("paymentMethod is required");
  }
  // ✅ التحقق من شكل الـ items — نضمن فقط productId و quantity
  const cleanItems = orderData.items.map((item) => {
    if (!item.productId) throw new Error("Each item must have a productId");
    if (!item.quantity || item.quantity < 1) throw new Error("Each item must have a valid quantity");
    return {
      productId: item.productId,
      quantity: Number(item.quantity)
    };
  });

  const res = await api.post("/api/customer/order", {
    items: cleanItems,
    paymentMethod: orderData.paymentMethod
  });
  return res.data?.data?.order ?? res.data?.order ?? res.data;
  return normalizeOrder(order);
}

/**
 * GET /api/customer/order/preview
 * معاينة تفصيل الطلب قبل التأكيد — ترجع الـ subtotal / shippingFee / tax / totalPrice
 *
 * ⚠️ الـ endpoint قد لا يكون متاحاً في كل النسخ — لذلك نعطي fallback محلي آمن.
 * الـ response المتوقع (مثال):
 * {
 *   "status": "success",
 *   "data": {
 *     "preview": {
 *       "subtotal": 100.00,
 *       "shippingFee": 10.00,
 *       "tax": 5.00,
 *       "totalPrice": 115.00
 *     }
 *   }
 * }
 *
 * @param {Array<{productId: string, quantity: number}>} items
 * @returns {Promise<{subtotal: number, shippingFee: number, tax: number, totalPrice: number}>}
 *          في حال فشل الـ API، يرجع قيم آمنة (tax=0) بدون رمي خطأ.
 */
export async function getOrderPreview(items) {
  // قيم افتراضية آمنة
  const safeFallback = (subtotal) => ({
    subtotal: Number(subtotal) || 0,
    shippingFee: 0,
    tax: 0,
    totalPrice: Number(subtotal) || 0,
  });

  if (!Array.isArray(items) || items.length === 0) {
    return safeFallback(0);
  }

  const cleanItems = items.map((item) => ({
    productId: item.productId ?? item.id ?? item._id,
    quantity: Number(item.quantity ?? 1),
  })).filter((i) => i.productId && i.quantity > 0);

  if (cleanItems.length === 0) return safeFallback(0);

  try {
    const res = await api.post("/api/customer/order/preview", { items: cleanItems });
    const preview = res.data?.data?.preview ?? res.data?.preview ?? res.data?.data ?? res.data ?? {};

    const subtotal = Number(preview.subtotal ?? preview.subTotal ?? 0);
    const shippingFee = Number(preview.shippingFee ?? preview.shipping ?? 0);
    const tax = Number(preview.tax ?? preview.taxAmount ?? 0);
    // لو الـ totalPrice مش موجود، نحسبه محلياً
    const totalPrice = Number(
      preview.totalPrice ?? preview.total ?? (subtotal + shippingFee + tax)
    );

    return { subtotal, shippingFee, tax, totalPrice };
  } catch (err) {
    // الـ endpoint مش متاح أو رجّع خطأ — fallback صامت إلى tax=0
    // الحسّاب المحلي للـ subtotal بيتم في الـ UI
    const localSubtotal = cleanItems.reduce((sum, it) => {
      const item = items.find((i) => (i.productId ?? i.id ?? i._id) === it.productId);
      return sum + (Number(item?.price ?? 0) * it.quantity);
    }, 0);
    return safeFallback(localSubtotal);
  }
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
 * GET /api/order/  (⚠️ لاحظ: بدون seller بالـ path — حسب Postman)
 * طلبات البائع (لوحة التحكم) — للـ seller Dashboard + OrdersManagement
 * يدعم pagination وstatus filter
 *
 * ✅ Endpoint الصحيح حسب Postman: GET /api/order/ مع Bearer SELLER_ACCESS_TOKEN
 *    (مش /api/seller/order — هاي غلط، الباك بيرد 404)
 */
export async function getSellerOrders(token, { page = 1, status } = {}) {
  const params = new URLSearchParams();
  if (page) params.append("page", page);
  if (status) params.append("status", status);
  const queryString = params.toString();
  // ✅ trailing slash مهم — الباك ما بيقبل بدونه
  const url = `/api/order/${queryString ? `?${queryString}` : ""}`;
  const res = await api.get(url);
  return res.data;
}

/**
 * GET /api/order/:id
 * تفاصيل طلب واحد (لوحة البائع)
 *
 * ✅ Endpoint الصحيح حسب Postman: GET /api/order/:id مع Bearer SELLER_ACCESS_TOKEN
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

// ════════════════════════════════════════════════════════
//  Re-exports للتوافق العكسي مع authService.js
// ════════════════════════════════════════════════════════

/** @deprecated استخدم getMyOrders من orderService */
export const getCustomerOrders = getMyOrders;

/** @deprecated استخدم getOrderDetails من orderService */
export const getCustomerOrderDetails = getOrderDetails;

/** @deprecated استخدم cancelOrder من orderService */
export const cancelCustomerOrder = cancelOrder;
