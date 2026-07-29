// src/utils/notificationRoleFilter.js
//
// 🔒 فلتر مركزي لعزل الإشعارات حسب الدور (Customer ↔ Seller)
//
// المشكلة اللي بيحلها:
//   الـ socket connection الواحد بيستقبل إشعارات من الباك لكلا الدورين
//   (لأن نفس الـ user ممكن يكون customer + seller في نفس الوقت).
//   لو الـ frontend ما فلتر، الإشعارات بتهرب بين الواجهات:
//
//   مثلاً: البائع يفتح واجهة المشتري → بيشوف إشعارات "New message"
//   من زبائن → (مرحبا، هل المنتج متوفر؟) — bug!
//
// الحل:
//   3 طبقات فلترة مستقلة، أي واحدة منهم بتقول "هذا للبائع" = ارفض:
//
//   1) Type-based    — الباك بيبعت أنواع مميزة لكل دور
//   2) actionUrl     — مسارات البائع (/seller/...) أو (/conversations/...)
//   3) Recipient     — لو الباك بيبعت recipient.role أو audience
//   4) Sender.role   — لو sender.role = customer والـ type = MESSAGE
//                       → على الأغلب البائع هو المستقبل
//
// الاستخدام:
//   import { isCustomerNotification, isSellerNotification } from "...";
//   if (isCustomerNotification(notif)) { ... }     // ✅ اعرضه
//   if (isSellerNotification(notif))    { return; } // ❌ تجاهله
//
//   // أو على array:
//   const safe = notifs.filter(isCustomerNotification);
//
// ⚠️ الفلسفة: عزل صارم (deny by default).
//   أي إشعار ما نقدر نأكد إنه للمشتري → بيتجاهل.
//   هذا أأمن من اعتماده على الـ endpoint filtering (اللي ما بيمشي
//   على الـ socket events).

/* ── مجموعات الأنواع حسب الدور ── */

// أنواع البائع فقط (مأخوذة من BACKEND_TYPE_MAP في NotificationsPage.jsx)
const SELLER_ONLY_TYPES = new Set([
  "NEW_ORDER",
  "NEW_MESSAGE", // ← زبون بعث رسالة للبائع
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

// أنواع المشتري الأساسية (من CustomerNotifications.jsx)
const CUSTOMER_ONLY_TYPES = new Set([
  "ORDER",
  "SYSTEM",
  "PROMOTIONAL",
  "GENERAL",
  "REVIEW_REPLY",
]);

/* ── مسارات URLs حسب الدور ── */

const SELLER_ACTION_PREFIXES = [
  "/seller/",
  "/store/",
  "/conversations/", // ← الزبون بيشوف /messages، البائع بيشوف /conversations/
  "/ratings",
  "/seller-orders",
];

const CUSTOMER_ACTION_PREFIXES = [
  "/my-orders",
  "/orders/",
  "/profile/customer/",
  "/customer/profile/",
  "/customer/store/",
  "/messages", // ← الزبون يستخدم /messages
  "/product/", // ← تقييم أو رد على تقييم
  "/products",
  "/favorites",
  "/cart",
  "/home/customer",
];

/* ── كلمات مفتاحية (لحالات الـ fallback فقط) ── */

const SELLER_TITLE_KEYWORDS = [
  // عربي
  "متجرك",
  "متجركم",
  "متجر",
  "بائعك",
  "متجرك ",
  "نفذ المخزون",
  "نفذت",
  "بضاعتك",
  "مخزون",
  "تقييم جديد على",
  "طلب جديد من",
  "رسالة جديدة من",
  "زبون جديد",
  // english
  "new order from",
  "new review on",
  "new message from",
  "new customer",
  "low stock",
  "out of stock",
  "your store",
  "your product",
];

const CUSTOMER_TITLE_KEYWORDS = [
  // عربي
  "تم تحديث طلبك",
  "تم الرد على تقييمك",
  "طلبك",
  "تقييمك",
  "مراجعتك",
  "سلة",
  "مفضلتك",
  // english
  "your order",
  "your review",
  "your cart",
  "your favorites",
  "order status",
  "replied to your review",
  "replied to your rating",
];

/* ── Helpers ── */

function normType(t) {
  if (!t) return "";
  return String(t).toUpperCase().trim();
}

function getNested(obj, path) {
  if (!obj) return undefined;
  const keys = path.split(".");
  let cur = obj;
  for (const k of keys) {
    if (cur == null) return undefined;
    cur = cur[k];
  }
  return cur;
}

function getString(obj, keys) {
  if (!obj) return "";
  for (const k of keys) {
    const v = obj[k];
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

/* ── الكشف عن الدور ── */

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

/* ── Logic الأساسية ── */

/**
 * هل هذا الإشعار موجّه للبائع تحديداً؟
 *
 * ✅ بنرجّع true لو في أي إشارة واضحة إنه للبائع
 *    (مش بنرجّع false أبداً لو ما في إشارات — هذا تشدد مقصود)
 */
export function isSellerNotification(notif) {
  if (!notif || typeof notif !== "object") return false;

  // 1) النوع
  const type = normType(notif.type);
  if (type && SELLER_ONLY_TYPES.has(type)) return true;

  // 2) recipient.role
  const recipientRole = getRecipientRole(notif);
  if (recipientRole === "seller") return true;

  // 3) actionUrl
  const actionUrl = getString(notif, ["actionUrl", "action_url"]);
  if (actionUrl && startsWithAny(actionUrl, SELLER_ACTION_PREFIXES)) {
    // استثناء: /orders/<id> → للمشتري، /seller/orders/<id> → للبائع
    // SELLER_ACTION_PREFIXES فيها "/orders/" لكن بنحميها بالـ "/" الإضافية
    if (actionUrl.startsWith("/seller/orders/")) return true;
    if (actionUrl.startsWith("/seller/")) return true;
    if (actionUrl.startsWith("/conversations/")) return true;
    if (actionUrl.startsWith("/ratings")) return true;
    if (actionUrl.startsWith("/store/")) return true;
  }

  // 4) Sender.role: لو الـ sender customer والـ type = message → للبائع
  //    (الزبون بيبعت رسالة → البائع هو المستقبل)
  const senderRole = getSenderRole(notif);
  if (senderRole === "customer" && type === "MESSAGE") return true;

  // 5) الكلمات المفتاحية بالـ title/content (fallback أخير)
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
 * هل هذا الإشعار موجّه للمشتري تحديداً؟
 *
 * ⚠️ الفلسفة: عزل صارم.
 *   - لو inSellerNotification() = true → definitely NOT customer
 *   - لو في إشارات صريحة إنه للزبون (type, recipient, actionUrl) → نعم
 *   - لو ما في إشارات → نرجّع false (نرفض) — أأمن من السماح
 */
export function isCustomerNotification(notif) {
  if (!notif || typeof notif !== "object") return false;

  // 0) عزل قاطع: لو مؤشرات البائع موجودة → definitely not customer
  if (isSellerNotification(notif)) return false;

  // 1) النوع
  const type = normType(notif.type);
  if (type && CUSTOMER_ONLY_TYPES.has(type)) return true;

  // 2) recipient.role
  const recipientRole = getRecipientRole(notif);
  if (recipientRole === "customer") return true;

  // 3) actionUrl
  const actionUrl = getString(notif, ["actionUrl", "action_url"]);
  if (
    actionUrl &&
    startsWithAny(actionUrl, CUSTOMER_ACTION_PREFIXES) &&
    !startsWithAny(actionUrl, SELLER_ACTION_PREFIXES)
  ) {
    return true;
  }

  // 4) sender.role: لو الـ sender seller والـ type = MESSAGE → للزبون
  const senderRole = getSenderRole(notif);
  if (senderRole === "seller" && type === "MESSAGE") return true;

  // 5) Fallback: لو ما في أي إشارات → نرفض
  //    (الـ list الأساسي جاي من /api/customer/notification أصلاً،
  //     فالإشعارات اللي بتوصل بدون metadata واضحة نادرة —
  //     وبترفضها أحسن من السماح بتسرب)
  return false;
}

/* ── Helper لكامل الـ payloads (socket events) ── */

/**
 * يستخرج الإشعار من socket payload
 * (الباك أحياناً يبعت { notification: {...}, stats: {... } } أو الإشعار مباشرة)
 */
export function extractNotificationFromPayload(payload) {
  if (!payload) return null;
  if (typeof payload === "string") return { title: payload };
  if (typeof payload !== "object") return null;
  return payload.notification ?? payload.data ?? payload;
}

/**
 * فلتر مخصص لأحداث الـ socket:
 *   - لو الـ payload فيه إشعار واضح إنه للزبون → نعدّي
 *   - لو واضح للبائع → نرفض
 *   - لو مش واضح (ما في type/actionUrl/recipient) → نرفض (أأمن)
 *
 * ✅ الاستخدام:
 *    socket.on("notification:new", (p) => {
 *      if (!shouldAcceptCustomerSocketEvent(p)) return;
 *      ...
 *    });
 */
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

/* ── دالة مساعدة: فلترة array ── */

export function filterForCustomer(notifs) {
  if (!Array.isArray(notifs)) return [];
  return notifs.filter(isCustomerNotification);
}

export function filterForSeller(notifs) {
  if (!Array.isArray(notifs)) return [];
  return notifs.filter(isSellerNotification);
}

/* ── للتوافق مع الكود القديم ── */

/**
 * بديل عن `isNotificationForRole(notif, role)` من notificationRoutes.js
 * - بنستخدمه بالـ useNotificationCount hook و notificationRoutes
 *
 * @param {Object} notif
 * @param {"customer"|"seller"} role
 * @returns {boolean}
 */
export function isNotificationForRole(notif, role) {
  if (!notif || !role) return false;
  const r = String(role).toLowerCase();
  if (r === "customer") return isCustomerNotification(notif);
  if (r === "seller") return isSellerNotification(notif);
  return false;
}
