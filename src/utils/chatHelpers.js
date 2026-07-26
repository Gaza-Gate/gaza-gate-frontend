// ─────────────────────────────────────────────────────────────
//  Chat helpers — utilities used by both customer & seller
//  messages pages to keep behaviour consistent (RTL/Arabic UI)
// ─────────────────────────────────────────────────────────────

/**
 * تنسيق الوقت بشكل مختصر (مثال: "14:32")
 */
export function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * اسم الفاصل الزمني (اليوم / أمس / التاريخ)
 * — بيتستخدم لرسالة التاريخ يلي بتفصل بين مجموعات الرسائل
 */
export function getDayLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today - target) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "اليوم";
  if (diffDays === 1) return "أمس";

  // نفس الأسبوع: اسم اليوم
  if (diffDays > 1 && diffDays < 7) {
    const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    return dayNames[d.getDay()];
  }

  // أقدم: تاريخ كامل
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/**
 * يتأكد إذا رسالتين متتاليتين بنفس اليوم
 */
export function isSameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/**
 * تنسيق الاسم الكامل للشخص (firstName + lastName)
 */
export function fullName(person, fallback = "مستخدم") {
  if (!person) return fallback;
  const f = person.firstName ?? "";
  const l = person.lastName ?? "";
  const combined = `${f} ${l}`.trim();
  return combined || fallback;
}

/**
 * اسم العرض: اسم المتجر لو موجود، وإلا الاسم الكامل
 */
export function displayName(otherParty) {
  if (!otherParty) return "مستخدم";
  return otherParty.storeName || fullName(otherParty, "مستخدم");
}

/**
 * يولّد لون أفاتار ثابت بناءً على اسم (hash → palette)
 */
const AVATAR_COLORS = ["#F97316", "#8B5CF6", "#EF4444", "#10B981", "#3B82F6", "#EC4899", "#F59E0B", "#14B8A6"];

export function avatarColor(name = "") {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * ينسخ الـ object بشكل عميق لكن مع تجاهل القيم null/غير محددة
 * (مفيد لما تجيب رسالة من الـ API وتضيفها للقائمة)
 */
export function safeAssign(...sources) {
  return Object.assign({}, ...sources.filter(Boolean));
}

/**
 * مقارنة آمنة لـ IDs (string vs string, case-insensitive)
 */
export function sameId(a, b) {
  if (a == null || b == null) return false;
  return String(a).toLowerCase() === String(b).toLowerCase();
}

/**
 * يضيف رسالة للقائمة بدون تكرار (dedup بالـ id)
 */
export function addMessageUnique(prevMessages, newMsg) {
  if (!newMsg?.id) return [...prevMessages, newMsg];
  const exists = prevMessages.some((m) => sameId(m.id, newMsg.id));
  if (exists) return prevMessages;
  return [...prevMessages, newMsg];
}

/**
 * يقسم الـ URL لـ origin فقط (للـ socket)
 */
export function getSocketOrigin(apiUrl) {
  if (!apiUrl) return "http://localhost:3000";
  return apiUrl.replace(/\/api\/?$/, "");
}

/**
 * يطبع وقت مختصر للـ conversation list:
 * - اليوم: HH:MM
 * - أمس: "أمس"
 * - أقدم: DD/MM
 */
export function formatConvTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today - target) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  if (diffDays === 1) return "أمس";
  if (diffDays < 7) {
    const dayNames = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];
    return dayNames[d.getDay()];
  }
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/* ════════════════════════════════════════════════════════════════
   "Contact Store / مراسلة المتجر" — universal navigation helper
   ────────────────────────────────────────────────────────────────
   Standard way to wire any "Message Store" button across the app
   (Product Details, Store Page, Order details, etc.) to open /
   start a conversation on the messages page.

   الـ messages page بتقرأ `location.state` (state) أو `searchParams`
   (URL) — فاحنا بنمرّر الاثنين لضمان استمرارية الـ flow.
   ════════════════════════════════════════════════════════════════ */

/**
 * Standard "Contact Store" navigation handler.
 *
 * @param {Function} navigate          - the navigate function from useNavigate()
 * @param {Object}   options
 * @param {string}   options.sellerId  - the seller's id (REQUIRED)
 * @param {string}   [options.productId] - optional product id (if messaging from product page)
 * @param {string}   [options.storeName] - optional store name (display/analytics)
 *
 * @example
 *   import { useNavigate } from "react-router-dom";
 *   import { contactStore } from "../utils/chatHelpers";
 *
 *   function ProductDetails() {
 *     const navigate = useNavigate();
 *     return (
 *       <button onClick={() => contactStore(navigate, { sellerId: product.seller.id })}>
 *         مراسلة المتجر
 *       </button>
 *     );
 *   }
 */
export function contactStore(navigate, { sellerId, productId, storeName } = {}) {
  if (typeof navigate !== "function") {
    console.warn("[contactStore] navigate is required (from useNavigate)");
    return;
  }
  if (!sellerId) {
    console.warn("[contactStore] sellerId is required — can't open a chat without a seller");
    return;
  }

  // ✅ نمرّر state للـ route (للمستخدم الجديد) + URL params (لـ refresh/share)
  const params = new URLSearchParams();
  if (sellerId) params.set("sellerId", sellerId);
  if (productId) params.set("productId", productId);
  const search = params.toString();

  navigate({
    pathname: "/messages",
    search: search ? `?${search}` : "",
    state: { sellerId, productId, storeName },
  });
}
