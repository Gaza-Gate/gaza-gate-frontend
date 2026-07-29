import api, { API_BASE_URL } from "../utils/api";

/**
 * ════════════════════════════════════════════════════════════
 *  Review Service — نقطة الربط الوحيدة بين الفرونت والباك للتقييمات
 *  Base URL يأتي من VITE_API_URL (أو الافتراضي في api.js)
 * ════════════════════════════════════════════════════════════
 *
 *  Endpoints المؤكدة من الباك (من Postman collection):
 *
 *  Customer (تحتاج customer token):
 *  ─ POST   /api/customer/review/                → submitReview          (مع trailing slash!)
 *  ─ GET    /api/customer/review/my              → getMyReviews
 *  ─ PATCH  /api/customer/review/:id             → updateReview
 *  ─ DELETE /api/customer/review/:id             → deleteReview
 *  ─ GET    /api/customer/review/from-sellers    → getReviewsFromSellers
 *
 *  Seller (تحتاج seller token):
 *  ─ GET    /api/seller/review                   → getSellerReviews
 *  ─ POST   /api/seller/review/:id/reply         → replyToReview
 *  ─ POST   /api/seller/review/customer          → createSellerCustomerReview
 *  ─ PATCH  /api/seller/review/customer/:id      → updateSellerCustomerReview
 *  ─ GET    /api/seller/review/customer/my       → getMySellerCustomerReviews
 *  ─ DELETE /api/seller/review/customer/:id      → deleteSellerCustomerReview
 *
 *  Public / Shared:
 *  ─ GET    /api/review/product/:productId?page=1   → getProductReviews
 *           تقييمات منتج معيّن + الإحصائيات + التوزيع
 *  ─ GET    /api/review/seller/:sellerId/product-reviews?page=1
 *           كل تقييمات منتجات بائع معيّن (للتجميع في صفحة المتجر)
 *  ─ GET    /api/review/customer/:customerId/seller-reviews
 *           تقييمات البائعين عن زبون معيّن
 *  ─ GET    /api/review/customer/:customerId/product-reviews
 *           تقييمات المنتج اللي بعتهم زبون معيّن
 *  ─ GET    /api/review/seller/:sellerId/customer-reviews
 *           تقييمات الزبائن عن بائع معيّن
 *
 *  شكل الـ response المؤكد من الباك لـ POST review:
 *  Success:  { status: "success", data: { id, productId, orderId, rating, comment, imageUrl, createdAt } }
 *  Failure:  { status: "fail",    data: { message: "..." } }
 */

/* ────────────────────────────────────────────────────────────
   Custom error class — نُعرّف نوع الخطأ بدل ما نعتمد على نص
   ──────────────────────────────────────────────────────────── */

/**
 * أنواع الأخطاء المعروفة من الباك
 *  - ALREADY_REVIEWED: قيّم هاد المنتج قبل
 *  - NOT_ELIGIBLE:     لسا ما مرّ 5 أيام
 *  - ORDER_NOT_FOUND:  الطلب غير موجود / غير تابع للزبون
 *  - PRODUCT_NOT_FOUND: المنتج غير موجود
 *  - VALIDATION_ERROR: الباك رفض البيانات (حقل ناقص أو غير صالح) — 400 مع errors array
 *  - UNAUTHORIZED:     توكن منتهي
 *  - UNKNOWN:          أي شي ثاني
 */
export const REVIEW_ERROR_TYPES = Object.freeze({
  ALREADY_REVIEWED: "ALREADY_REVIEWED",
  NOT_ELIGIBLE: "NOT_ELIGIBLE",
  ORDER_NOT_FOUND: "ORDER_NOT_FOUND",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  UNKNOWN: "UNKNOWN",
});

export class ReviewApiError extends Error {
  /**
   * @param {Object} params
   * @param {string} params.type       — أحد REVIEW_ERROR_TYPES
   * @param {string} params.message    — الرسالة المعروضة للمستخدم
   * @param {number} [params.status]   — HTTP status
   * @param {Object} [params.payload]  — body الباك الكامل
   * @param {Array}  [params.fieldErrors] — قائمة أخطاء الحقول من الباك (Joi shape)
   */
  constructor({ type, message, status, payload, fieldErrors }) {
    super(message || "Review API error");
    this.name = "ReviewApiError";
    this.type = type;
    this.status = status;
    this.payload = payload;
    this.fieldErrors = Array.isArray(fieldErrors) ? fieldErrors : [];
  }
}

/** نصنيف الخطأ حسب رسالة الباك والـ field errors */
function classifyReviewError(message, fieldErrors = []) {
  const m = message ? String(message).toLowerCase() : "";

  if (m.includes("already reviewed") || m.includes("already review")) {
    return REVIEW_ERROR_TYPES.ALREADY_REVIEWED;
  }
  // ✅ "This order is not eligible for review yet. It must remain in its current status for at least 5 days."
  // أو بالعربي: "الطلب غير مؤهل للتقييم" أو "يجب الانتظار"
  if (
    m.includes("not eligible") ||
    m.includes("must remain") ||
    m.includes("not eligible for review") ||
    m.includes("يجب الانتظار") ||
    m.includes("غير مؤهل")
  ) {
    return REVIEW_ERROR_TYPES.NOT_ELIGIBLE;
  }
  // "Order containing this product was not found"
  // أو "order not found" أو "order does not belong to user"
  if (m.includes("order") && (m.includes("not found") || m.includes("not belong") || m.includes("containing"))) {
    return REVIEW_ERROR_TYPES.ORDER_NOT_FOUND;
  }
  if (m.includes("product") && (m.includes("not found") || m.includes("containing"))) {
    return REVIEW_ERROR_TYPES.PRODUCT_NOT_FOUND;
  }
  if (m.includes("unauthorized") || m.includes("not authorized")) {
    return REVIEW_ERROR_TYPES.UNAUTHORIZED;
  }
  // ✅ إذا الباك رجّع errors array (Joi / express-validator) → validation
  if (fieldErrors.length > 0) {
    return REVIEW_ERROR_TYPES.VALIDATION_ERROR;
  }
  return REVIEW_ERROR_TYPES.UNKNOWN;
}

/** استخراج الـ message من response body بشكل موحّد */
function extractServerMessage(data) {
  if (!data) return null;
  if (typeof data === "string") return data;
  return (
    data?.data?.message || // ← الشكل اللي عندنا
    data?.message ||
    data?.error ||
    data?.msg ||
    null
  );
}

/**
 * استخراج أخطاء الحقول من response body (Joi / express-validator shape):
 *   { status: "fail", data: { errors: [{ field: "rating", message: "..." }, ...] } }
 *   أو
 *   { errors: [{ field, message }] }
 *   أو
 *   { details: [{ path: ["rating"], message: "..." }] }  ← Joi shape
 *
 *  بنرجع array من { field, message } بشكل موحّد
 */
function extractFieldErrors(data) {
  if (!data || typeof data !== "object") return [];

  // الشكل المعتاد عندنا: data.data.errors
  // أو data.errors
  const arr =
    data?.data?.errors ||
    data?.errors ||
    (data?.data?.details && Array.isArray(data.data.details) ? data.data.details : null) ||
    (data?.details && Array.isArray(data.details) ? data.details : null) ||
    [];

  if (!Array.isArray(arr)) return [];

  return arr
    .map((e) => {
      if (!e || typeof e !== "object") return null;
      const field = e.field || e.path || e.param || null;
      const message = e.message || e.msg || null;
      if (!message && !field) return null;
      return { field: field ? String(field) : null, message: message ? String(message) : null };
    })
    .filter(Boolean);
}

/* ────────────────────────────────────────────────────────────
   submitReview
   ──────────────────────────────────────────────────────────── */

/**
 * POST /api/customer/review/
 *  ⚠️ المسار مع trailing slash — الباك الإنتاج على onrender بيرفض بدونه
 *  لازم يكون في order حقيقي للمنتج (productId) من هاد الـ user
 *  الـ order لازم يكون بحالة "completed" أو "rejected" أو بعد 5 أيام من ACCEPTED/IN_PRODUCTION/READY
 *
 *  Contract المؤكد من Postman (Working 201 response):
 *  body (FormData) — كل الحقول type="text" ما عدا image file:
 *  - productId:    string (required) — UUID للمنتج
 *  - orderId:      string (required) — UUID للطلب
 *  - rating:       string (required) — "1".."5" (الباك بيستقبله string)
 *  - comment:      string (مُرسل دائماً حتى لو "" — الباك ب Postman بيبعتو مع كل طلب)
 *  - image:        File (optional — نوع "file" في Postman)
 *
 *  ملاحظة مهمة عن `comment`:
 *  عدم إرسال الحقل في FormData ≠ إرسال حقل فاضي. الـ backend validation
 *  (Joi / express-validator / Multer schema) ممكن يفسر الغياب كـ "حقل ناقص"
 *  ويرجّع 400. فلازم نُرسل comment دائماً، حتى لو string فاضي "".
 *
 *  Response نجاح: { status: "success", data: { id, productId, orderId, rating, comment, imageUrl, createdAt } }
 *  Response فشل: { status: "fail", data: { message: "..." } | { errors: [{ field, message }] } }
 *
 * @throws {ReviewApiError} عند أي خطأ من الباك
 */
/**
 * POST /api/customer/review
 * ⚠️ لاحظ: شلنا الـ trailing slash بناءً على طلب صريح — لو رجع 404/400 غريب،
 *    جرب ترجعها لـ "/api/customer/review/" (كانت موثقة إنها مطلوبة على الباك القديم).
 */
export async function submitReview({ productId, orderId, rating, comment, image }) {
  if (!productId) throw new Error("productId is required");
  if (!orderId) throw new Error("orderId is required");
  if (!rating || rating < 1 || rating > 5) throw new Error("rating must be 1..5");

  const trimmedComment = comment?.trim() ?? "";

  // ✅ الباك يرفض comment فاضي أو أقل من 3 حروف — منمنع الإرسال أصلاً هون كطبقة حماية إضافية
  // (الفحص الأساسي لازم يصير بالـ UI بـ ReviewModal.jsx قبل ما توصل لهون)
  if (trimmedComment.length > 0 && trimmedComment.length < 3) {
    throw new Error("التعليق يجب أن يكون 3 أحرف على الأقل أو فارغاً تماماً");
  }

  const formData = new FormData();
  formData.append("productId", productId);
  formData.append("orderId", orderId);
  formData.append("rating", String(rating));
  // ✅ نرسل comment دائماً لأنه أصبح إجباري
  formData.append("comment", trimmedComment);
  // ✅ نمرر ملف الصورة الحقيقي (File object) مش boolean
  if (image instanceof File) {
    formData.append("image", image);
  }

  try {
    const res = await api.post("/api/customer/review/", formData, {
      // ✅ لا نحدد Content-Type يدوياً — المتصفح لازم يحطه تلقائياً
      // مع الـ boundary الصحيح لـ multipart. الـ interceptor بـ api.js
      // بيتعرف على FormData ويضبط الهيدر المناسب.
      headers: { "Content-Type": undefined },
    });
    invalidateMyReviewsCache();
    return res.data?.data ?? res.data;
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    const serverMessage = extractServerMessage(data);
    const fieldErrors = extractFieldErrors(data);
    const type = classifyReviewError(serverMessage, fieldErrors);

    // ✅ طباعة تفصيلية لأخطاء الحقول عند الفشل
    console.group("%c[reviewService] ❌ Validation/API Error", "color:#ef4444;font-weight:bold;");
    console.log("HTTP status:", status);
    console.log("Error type:", type);
    console.log("Server message:", serverMessage);
    console.log("Field errors (data.data.errors):", err.response?.data?.data?.errors);
    console.log("Field errors details:", JSON.stringify(err.response?.data?.data?.errors, null, 2));
    console.log("Full response:", data);
    console.log("Sent data:", { productId, orderId, rating, comment: trimmedComment, hasImage: !!image });
    console.groupEnd();

    throw new ReviewApiError({
      type,
      message: serverMessage || err.message,
      status,
      payload: data,
      fieldErrors,
    });
  }
}

/**
 * GET /api/customer/review/my?page=1
 * تقييمات الزبون نفسه (لصفحة "تقييماتي" إن وُجدت)
 */
export async function getMyReviews(page = 1) {
  const res = await api.get(`/api/customer/review/my?page=${page}`);
  return res.data?.data ?? res.data;
}

/**
 * GET /api/customer/review/from-sellers?page=1
 * التقييمات يلي بعتوها البائعين عن هاد الزبون
 *  (سمعة الزبون عند البائعين)
 *
 *  Response shape:
 *  {
 *    status: "success",
 *    data: {
 *      averageRating: 4.7,
 *      totalReviews: 12,
 *      reviews: [
 *        {
 *          id, rating, comment, createdAt,
 *          seller: { id, storeName, avatar },
 *          order: { id, orderNumber }
 *        }
 *      ],
 *      pagination: { totalItems, totalPages, currentPage, pageSize, hasNextPage, hasPreviousPage }
 *    }
 *  }
 */
export async function getReviewsFromSellers({ page = 1, pageSize = 10 } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const res = await api.get(`/api/customer/review/from-sellers?${params}`);
  return res.data?.data ?? res.data;
}

/**
 * GET /api/customer/review/my/all
 * Helper: يرجع Set من productIds اللي قيّمها الزبون
 *  (بنستخدمه في صفحة الطلبات لتعطيل زر "تقييم" للمنتجات المُقيَّمة)
 */
export async function getMyReviewedProductIds() {
  try {
    const map = await getMyReviewedProductsMap();
    return new Set(map.keys());
  } catch (err) {
    console.warn("[reviewService] getMyReviewedProductIds failed:", err);
    return new Set();
  }
}

/**
 * GET /api/customer/review/my
 * Helper: يرجع Map من productId → review data الكاملة (id, rating, comment, image, createdAt, ...)
 *  بنستخدمه في صفحات "تقييماتي" / "تعديل التقييم" — لحتى نعرف الـ reviewId لكل منتج
 *  مع تخزين مؤقت بسيط (cache) لتفادي استدعاءات متكررة في نفس الـ session
 */
let _myReviewsCache = null;
let _myReviewsCacheAt = 0;
const MY_REVIEWS_CACHE_TTL_MS = 30_000; // 30 ثانية

export async function getMyReviewedProductsMap({ force = false } = {}) {
  const now = Date.now();
  if (!force && _myReviewsCache && now - _myReviewsCacheAt < MY_REVIEWS_CACHE_TTL_MS) {
    return _myReviewsCache;
  }
  try {
    const data = await getMyReviews(1);
    const list = Array.isArray(data?.reviews) ? data.reviews
              : Array.isArray(data?.list) ? data.list
              : Array.isArray(data) ? data
              : [];
    const map = new Map();
    for (const r of list) {
      const pid = r.productId || r.product_id || r.product?.id;
      if (pid) map.set(String(pid), r);
    }
    _myReviewsCache = map;
    _myReviewsCacheAt = now;
    return map;
  } catch (err) {
    console.warn("[reviewService] getMyReviewedProductsMap failed:", err);
    return new Map();
  }
}

/** مسح الـ cache — استدعيه بعد تعديل/حذف تقييم */
export function invalidateMyReviewsCache() {
  _myReviewsCache = null;
  _myReviewsCacheAt = 0;
}

/**
 * PATCH /api/customer/review/:id
 * تعديل تقييم موجود
 *  body (FormData لو في صورة جديدة، JSON عادي بدونها):
 *   - rating?: 1..5   — الباك بيستقبله كـ string ("3") حسب Postman
 *   - comment?: string — نُرسلها دائماً (حتى "") عشان نتفادى 400 "field required"
 *   - image?: File (اختياري — لو تغيّرت الصورة)
 *
 *  Response:
 *  {
 *    status: "success",
 *    data: {
 *      id, productId, orderId, rating, comment, imageUrl,
 *      createdAt, updatedAt
 *    }
 *  }
 */
export async function updateReview(reviewId, payload = {}) {
  let body;
  let headers = {};
  if (payload.image) {
    // صورة جديدة → FormData (multipart)
    body = new FormData();
    if (payload.rating != null) body.append("rating", String(payload.rating));
    // ✅ أرسل comment دائماً — حتى لو فاضي
const trimmedUpdateComment = payload.comment != null ? String(payload.comment).trim() : "";
if (trimmedUpdateComment) {
  body.append("comment", trimmedUpdateComment);
}
    body.append("image", payload.image);
  } else {
    // JSON عادي — الباك ب Postman بيبعت rating كـ string
    body = {};
    if (payload.rating != null) body.rating = String(payload.rating);
    // ✅ أرسل comment دائماً — حتى لو فاضي
    if (payload.comment != null) body.comment = String(payload.comment);
  }
  const res = await api.patch(`/api/customer/review/${reviewId}`, body, { headers });
  // ✅ invalidate cache — حتى الصفحات الثانية تشوف التقييم المعدّل
  invalidateMyReviewsCache();
  return res.data?.data ?? res.data;
}

/**
 * DELETE /api/customer/review/:id
 *  Response: { status: "success", data: { id, deleted: true } }
 */
export async function deleteReview(reviewId) {
  const res = await api.delete(`/api/customer/review/${reviewId}`);
  // ✅ invalidate cache
  invalidateMyReviewsCache();
  return res.data?.data ?? res.data;
}

/**
 * GET /api/review/product/:productId?page=1&pageSize=10   (public)
 * تقييمات منتج معيّن + الإحصائيات + التوزيع
 *
 *  Response shape المؤكّد من Postman:
 *  {
 *    status: "success",
 *    data: {
 *      averageRating: "5.00",            // string — ممكن يجي number
 *      totalReviews: 1,
 *      distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 1 },
 *      reviews: [
 *        {
 *          id, rating, comment, imageUrl, createdAt,
 *          customer: { id, firstName, lastName, avatar }  // ⚠️ flat — مش customer.user
 *        }
 *      ],
 *      pagination: { totalItems, totalPages, currentPage, pageSize, hasNextPage, hasPreviousPage }
 *    }
 *  }
 */
export async function getProductReviews(productId, page = 1, pageSize = 10) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const res = await api.get(`/api/review/product/${productId}?${params}`);
  return res.data?.data ?? res.data;
}

/**
 * GET /api/review/seller/:sellerId/product-reviews?page=1&pageSize=10   (public)
 * كل تقييمات منتجات بائع معيّن — للعرض في صفحة المتجر (تجميع كل التقييمات)
 *
 *  Response shape المؤكّد من Postman:
 *  {
 *    status: "success",
 *    data: {
 *      averageRating: "4.00",
 *      totalReviews: 1,
 *      distribution: { "1": 0, "2": 0, "3": 0, "4": 1, "5": 0 },
 *      reviews: [
 *        {
 *          id, rating, comment, imageUrl, createdAt,
 *          customer: { id, firstName, lastName, avatar },
 *          product: { id, name },    // ⚠️ مفيد لعرض اسم المنتج داخل كل تقييم
 *          // ⚠️ رد البائع — ممكن يرجع بأي من الأشكال التالية (شوف normalizeSellerReply):
 *          sellerReply: "شكراً" | { text, createdAt } | { reply, repliedAt } | ...
 *          // أو جوا seller/store object
 *          seller: { id, storeName, avatar, reply: "..." }
 *        }
 *      ],
 *      pagination: { totalItems, totalPages, currentPage, pageSize, hasNextPage, hasPreviousPage }
 *    }
 *  }
 *
 *  تنسيق رد البائع — BuyerProductReviewsSection.normalizeSellerReply() يتعامل مع:
 *    أسماء الحقول: sellerReply, reply, response, storeReply, sellerResponse, replyText, ...
 *    أشكال القيم: string, { text, createdAt }, { reply, repliedAt }, { message, replyAt }, ...
 *    التواريخ: createdAt, replyCreatedAt, repliedAt, replyAt, updatedAt
 *    بيانات المتجر: seller, store, vendor → { id, name/storeName, avatar/logo }
 */
export async function getSellerProductReviews(sellerId, page = 1, pageSize = 10) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const res = await api.get(`/api/review/seller/${sellerId}/product-reviews?${params}`);
  return res.data?.data ?? res.data;
}

/**
 * GET /api/seller/review?page=1&rating=5
 * تقييمات متجر البائع (لوحة البائع)
 */
export async function getSellerReviews({ page = 1, rating } = {}) {
  const params = new URLSearchParams({ page });
  if (rating) params.append("rating", String(rating));
  const res = await api.get(`/api/seller/review?${params}`);
  return res.data?.data ?? res.data;
}

/**
 * POST /api/seller/review/:id/reply
 * البائع يرد على تقييم
 *  body: { text: string }
 */
export async function replyToReview(reviewId, text) {
  if (!text?.trim()) throw new Error("reply text is required");
  const res = await api.post(`/api/seller/review/${reviewId}/reply`, {
    text: text.trim(),
  });
  return res.data?.data ?? res.data;
}

/* ═══════════════════════════════════════════════════════════════════
   ⚠️ Fallback Endpoints — لجلب الرد لو الـ public list ما رجّعته
   ─────────────────────────────────────────────────────────────
   المشكلة: GET /api/review/product/:id و GET /api/review/seller/:id/product-reviews
   (الـ public) ممكن ما يرجّعوا حقل الرد (sellerReply) في الـ response.
   فهول الـ endpoints بنستخدموهم كـ fallback لما الرد ناقص من الـ list.

   ⚠️ هول endpoints غير مؤكدين — ممكن يرجعوا 404 من الباك.
   الـ frontend بيتعامل مع 404 بصمت (silent fail) — يعني لو مش موجودين
   ما بيطلع error للمستخدم، بس ما بيظهر رد.
   ═══════════════════════════════════════════════════════════════════ */

/**
 * GET /api/review/:id  (محتمل)
 * جلب تقييم واحد بالـ id — بيرجّع الرد لو موجود
 *  Response: { status: "success", data: { id, rating, comment, sellerReply: {...}, ... } }
 */
export async function getReviewById(reviewId) {
  if (!reviewId) return null;
  try {
    const res = await api.get(`/api/review/${reviewId}`);
    return res.data?.data ?? res.data;
  } catch (err) {
    // 404 → الباك ما عنده هاد الـ endpoint
    if (err.response?.status === 404 || err.response?.status === 405) {
      return null;
    }
    throw err;
  }
}

/**
 * GET /api/review/:id/reply  (محتمل)
 * جلب رد البائع فقط لتقييم واحد — لو الـ endpoint موجود
 *  Response: { status: "success", data: { text, createdAt, ... } }
 */
export async function getReviewReply(reviewId) {
  if (!reviewId) return null;
  try {
    const res = await api.get(`/api/review/${reviewId}/reply`);
    return res.data?.data ?? res.data;
  } catch (err) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      return null;
    }
    throw err;
  }
}

/**
 * Batch fetch للردود الناقصة — بيجيب رد لكل review id بـ parallel
 * (مع throttling بسيط عشان ما نغرق الباك بطلبات).
 *
 * @param {string[]} reviewIds — قائمة IDs للتقييمات اللي ناقصها رد
 * @returns {Promise<Map<string, object>>} — Map من reviewId → normalized reply
 */
export async function fetchMissingReplies(reviewIds) {
  if (!Array.isArray(reviewIds) || reviewIds.length === 0) return new Map();

  const unique = [...new Set(reviewIds.filter(Boolean))];
  const results = new Map();

  // ✅ بنفّذ بـ chunks من 5 طلبات متوازي — عشان ما نغرق الباك
  const CHUNK_SIZE = 5;
  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const chunk = unique.slice(i, i + CHUNK_SIZE);
    const promises = chunk.map(async (id) => {
      // نجرب endpoint الرد أولاً (أخف على الباك)
      let reply = await getReviewReply(id);

      // لو ما في، نجيب الـ review كامل (ممكن يكون الرد جوا)
      if (!reply) {
        const fullReview = await getReviewById(id);
        if (fullReview) {
          reply = fullReview.sellerReply
            || fullReview.reply
            || fullReview.response
            || null;
        }
      }
      return { id, reply };
    });

    const chunkResults = await Promise.allSettled(promises);
    chunkResults.forEach((r) => {
      if (r.status === "fulfilled" && r.value.reply) {
        results.set(r.value.id, r.value.reply);
      }
    });
  }

  return results;
}

/**
 * GET /api/review/customer/:customerId/seller-reviews?page=1&pageSize=10   (public)
 * تقييمات البائعين عن زبون معيّن — للعرض في صفحة بروفايل الزبون العمومية.
 * (نفس بنية /api/customer/review/from-sellers لكن للعرض العام)
 *
 *  Response shape:
 *  {
 *    status: "success",
 *    data: {
 *      averageRating: number,
 *      totalReviews: number,
 *      reviews: [
 *        {
 *          id, rating, comment, createdAt,
 *          seller: { id, storeName, avatar, actionUrl? },
 *          order: { id, orderNumber },
 *          product?: { id, name, image }
 *        }
 *      ],
 *      pagination: { totalItems, totalPages, currentPage, pageSize, hasNextPage, hasPreviousPage }
 *    }
 *  }
 */
export async function getCustomerSellerReviewsPublic(customerId, page = 1, pageSize = 10) {
  if (!customerId) throw new Error("customerId is required");
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const res = await api.get(`/api/review/customer/${customerId}/seller-reviews?${params}`);
  return res.data?.data ?? res.data;
}