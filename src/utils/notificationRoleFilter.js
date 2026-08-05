// src/utils/notificationRoleFilter.js
//
// 🔒 فلتر مركزي لعزل الإشعارات حسب الدور (Customer ↔ Seller)
//
// ✅ تم تحديثه ليتطابق مع الـ types الفعلية اللي بيرجعها الباك
//    (من Postman collection — Gaza-Gate API v2):
//
//    Customer: ORDER, SYSTEM, PROMOTIONAL, GENERAL, REVIEW_REPLY
//    Seller:   ORDER, SYSTEM, PROMOTIONAL, GENERAL
//              (الباك بيستخدم نفس الـ 4 types مع تمييز الدور من الـ endpoint)
//
//    النتيجة: فلترنا لازم يتعامل مع الأنواع الـ 4 الأساسية كنوع "مشترك"
//    ونعتمد على الـ endpoint + auth token للفصل بين الأدوار.

/* ── الأنواع الـ 4 الأساسية اللي الباك بيرجعها للدورين ──
   (من Postman responses المؤكدة) */
const BASE_TYPES = new Set([
  "ORDER",
  "SYSTEM",
  "PROMOTIONAL",
  "GENERAL",
]);

/* ── أنواع إضافية خاصة بالمشتري ── */
const CUSTOMER_EXTRA_TYPES = new Set([
  "REVIEW_REPLY",  // رد البائع على تقييمك
]);

/* ── أنواع إضافية خاصة بالبائع (لو الباك غيّر مستقبلاً) ── */
const SELLER_EXTRA_TYPES = new Set([
  "NEW_ORDER",      // توافق قديم
  "NEW_MESSAGE",
  "NEW_CUSTOMER",
  "NEW_PRODUCT",
  "NEW_RATING",
  "NEW_REVIEW",
  "ORDER_UPDATE",
  "LOW_STOCK",
  "PRODUCT_LOW_STOCK",
  "RATING",
  "REVIEW",
  "ALERT",
]);

/* ── مسارات URLs حسب الدور ── */

const SELLER_ACTION_PREFIXES = [
  "/seller/",
  "/store/",
  "/conversations/", // البائع بيشوف /conversations
  "/ratings",
  "/seller-orders",
  "/seller/notifications",
];

const CUSTOMER_ACTION_PREFIXES = [
  "/my-orders",
  "/profile/customer/",
  "/customer/profile/",
  "/customer/store/",
  "/messages",        // الزبون بيستخدم /messages
  "/product/",
  "/products",
  "/favorites",
  "/cart",
  "/home/customer",
  "/notifications",
];

/* ── كلمات مفتاحية (fallback فقط) ── */

const SELLER_TITLE_KEYWORDS = [
  "متجرك", "متجركم", "متجر", "بائعك",
  "نفذ المخزون", "نفذت", "بضاعتك", "مخزون",
  "تقييم جديد على", "طلب جديد من",
  "رسالة جديدة من", "زبون جديد",
  "new order from", "new review on", "new message from",
  "new customer", "low stock", "out of stock",
  "your store", "your product",
];

const CUSTOMER_TITLE_KEYWORDS = [
  "تم تحديث طلبك", "تم الرد على تقييمك",
  "طلبك", "تقييمك", "مراجعتك", "سلة", "مفضلتك",
  "your order", "your review", "your cart", "your favorites",
  "order status", "replied to your review", "replied to your rating",
];

/* ── Helpers ── */

function normType(t) {
  if (!t) return "";
  return String(t).toUpperCase().trim();
}

function getString(obj, keys) {
  if (!obj) return "";
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null) return String(v);
  }
  return "";
}

function lower(s) {
  return s ? String(s).toLowerCase() : "";
}

function startsWithAny(str, prefixes) {
  if (!str || typeof str !== "string") return false;
  return prefixes.some((p) => str.startsWith(p));
}

function getRecipientRole(n) {
  if (!n) return "";
  const candidates = [
    n.recipient?.role,
    n.recipients?.[0]?.role,
    n.audience,
    n.targetRole,
    n.role,
  ];
  for (const c of candidates) {
    if (c) return String(c).toLowerCase();
  }
  return "";
}

function getSenderRole(n) {
  if (!n) return "";
  return String(n.sender?.role ?? n.senderRole ?? "").toLowerCase();
}

/* ── المنطق الأساسي ── */

/**
 * هل هذا الإشعار موجّه للبائع؟
 *
 * ✅ الاستراتيجية:
 *   1) لو type من الأنواع الخاصة بالبائع فقط → نعم
 *   2) لو recipient.role = "seller" → نعم
 *   3) لو actionUrl بيبدأ بـ /seller/ أو /conversations/ أو /ratings → نعم
 *   4) لو type من BASE_TYPES (ORDER/SYSTEM/PROMOTIONAL/GENERAL) → ambiguous
 *      ما بنرجّع true ولا false بناءً على الـ type لحاله — لازم في مؤشر إضافي
 */
export function isSellerNotification(notif) {
  if (!notif || typeof notif !== "object") return false;

  const type = normType(notif.type);

  // 1) نوع خاص بالبائع فقط
  if (type && SELLER_EXTRA_TYPES.has(type)) return true;

  // 2) recipient.role
  if (getRecipientRole(notif) === "seller") return true;

  // 3) actionUrl
  const actionUrl = getString(notif, ["actionUrl", "action_url"]);
  if (actionUrl) {
    if (actionUrl.startsWith("/seller/orders/")) return true;
    if (actionUrl.startsWith("/seller/notifications")) return true;
    if (actionUrl.startsWith("/seller/")) return true;
    if (actionUrl.startsWith("/conversations/")) return true;
    if (actionUrl.startsWith("/ratings")) return true;
    if (actionUrl.startsWith("/store/")) return true;
  }

  // 4) Sender.role: لو sender customer والـ type = message → للبائع
  if (getSenderRole(notif) === "customer" && type === "MESSAGE") return true;

  // 5) Fallback: كلمات مفتاحية بالـ title/content
  const text = `${lower(getString(notif, ["title"]))} ${lower(
    getString(notif, ["content", "body", "message"])
  )}`;
  if (text) {
    for (const kw of SELLER_TITLE_KEYWORDS) {
      if (text.includes(kw.toLowerCase())) return true;
    }
  }

  return false;
}

/**
 * هل هذا الإشعار موجّه للمشتري؟
 *
 * ✅ الاستراتيجية (نفس seller لكن معكوسة):
 *   1) لو مؤشرات البائع قوية (isSellerNotification = true) → definitely NOT customer
 *   2) نوع خاص بالمشتري → نعم
 *   3) recipient.role = "customer" → نعم
 *   4) actionUrl بيبدأ بمسار عميل → نعم
 *   5) نوع من BASE_TYPES بدون أي مؤشر → default = TRUE (لأن الـ list
 *      جاي أصلاً من /api/customer/notification — الباك فلتره من قبل)
 */
export function isCustomerNotification(notif) {
  if (!notif || typeof notif !== "object") return false;

  // 0) عزل قاطع
  if (isSellerNotification(notif)) return false;

  const type = normType(notif.type);

  // 1) نوع خاص بالمشتري فقط
  if (type && CUSTOMER_EXTRA_TYPES.has(type)) return true;

  // 2) recipient.role
  if (getRecipientRole(notif) === "customer") return true;

  // 3) actionUrl بمسار عميل
  const actionUrl = getString(notif, ["actionUrl", "action_url"]);
  if (
    actionUrl &&
    startsWithAny(actionUrl, CUSTOMER_ACTION_PREFIXES) &&
    !startsWithAny(actionUrl, SELLER_ACTION_PREFIXES)
  ) {
    return true;
  }

  // 4) Sender.role: لو sender seller والـ type = MESSAGE → للمشتري
  if (getSenderRole(notif) === "seller" && type === "MESSAGE") return true;

  // 5) Fallback: كلمات مفتاحية
  const text = `${lower(getString(notif, ["title"]))} ${lower(
    getString(notif, ["content", "body", "message"])
  )}`;
  if (text) {
    for (const kw of CUSTOMER_TITLE_KEYWORDS) {
      if (text.includes(kw.toLowerCase())) return true;
    }
  }

  // 6) Default: لو وصلنا لهون بدون أي reject = type من BASE_TYPES
  // (ORDER, SYSTEM, PROMOTIONAL, GENERAL) بدون أي مؤشر إضافي
  // → بنقبله كإشعار عميل (لأن الـ endpoint هو /api/customer/notification)
  if (type && BASE_TYPES.has(type)) return true;

  // ⚠️ آخر fallback: لو type غير معروف، نقبل (نثق بالـ endpoint filter للباك)
  if (type) return true;

  return false;
}

/* ── Helpers لكامل الـ payloads (socket events) ── */

export function extractNotificationFromPayload(payload) {
  if (!payload) return null;
  if (typeof payload === "string") return { title: payload };
  if (typeof payload !== "object") return null;
  return payload.notification ?? payload.data ?? payload;
}

export function shouldAcceptCustomerSocketEvent(payload) {
  const notif = extractNotificationFromPayload(payload);
  if (!notif) return false;
  return isCustomerNotification(notif);
}

export function shouldAcceptSellerSocketEvent(payload) {
  const notif = extractNotificationFromPayload(payload);
  if (!notif) return false;
  return isSellerNotification(notif);
}

/* ── فلترة array ── */

export function filterForCustomer(notifs) {
  if (!Array.isArray(notifs)) return [];
  return notifs.filter(isCustomerNotification);
}

export function filterForSeller(notifs) {
  if (!Array.isArray(notifs)) return [];
  return notifs.filter(isSellerNotification);
}

/* ── للتوافق مع الكود القديم ── */

export function isNotificationForRole(notif, role) {
  if (!notif || !role) return false;
  const r = String(role).toLowerCase();
  if (r === "customer") return isCustomerNotification(notif);
  if (r === "seller") return isSellerNotification(notif);
  return false;
}
