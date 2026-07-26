// src/services/roleService.js
//
// خدمات API الخاصة بـ "تبديل الدور" و"تحويل حساب المشتري إلى بائع".
// بتستخدم نفس الـ axios instance الموجود بالمشروع (utils/api.js)،
// وهو أصلاً معمول له interceptor بيحط access token بالـ header تلقائياً:
//   config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`
// فما في داعي نكرر هالمنطق هون — بس لازم نتأكد إنه التوكن الجديد
// يترخزن بـ localStorage بعد كل نجاح عشان الطلب الجاي ياخده صح.

import api from "../utils/api";

/**
 * تطبيع شكل الرد القادم من الباك اند.
 * الباك أحياناً بيرجع { data: { accessToken, refreshToken, user } }
 * وأحياناً بيرجعهم مباشرة، فهاي الدالة بتوحّد الشكل.
 */
function normalizeAuthResponse(resData) {
  const payload = resData?.data ?? resData ?? {};
  return {
    accessToken: payload.accessToken || null,
    refreshToken: payload.refreshToken || null,
    user: payload.user || null,
    message: payload.message || resData?.message || null,
  };
}

/**
 * GET /api/auth/me  (عدّل المسار حسب ما هو موجود فعلياً بمشروعك — شوف
 * ملاحظة "3" بالشرح: هاي نقطة النهاية لازم ترجّع نفس شكل الـ user
 * يلي بيرجعه الـ login، وأهمها حقل hasSellerProfile.
 *
 * هاي الدالة هي "مصدر الحقيقة" الوحيد لبيانات المستخدم — منستخدمها
 * عند إقلاع التطبيق (bootstrap) عشان نتأكد إنه الـ localStorage
 * مش عاطل أو ناقص (متل ما صار بمشكلتك: تخزين token بس بدون user).
 */
export async function fetchCurrentUser() {
  const res = await api.get("/api/auth/me");
  const payload = res.data?.data ?? res.data ?? {};
  return payload.user || payload;
}

/**
 * POST /api/auth/become-seller
 * بيستقبل storeName + storeDescription، ولو الطلب نجح بيرجع
 * accessToken/refreshToken جدد + user object فيه hasSellerProfile: true.
 *
 * ملاحظة: لو المستخدم بائع أصلاً، الباك بيرجّع 409 —
 * منسيب معالجة هاي الحالة للمكوّن (component) يلي بينادي الدالة
 * عشان يقرر شو يعرض للمستخدم.
 */
export async function submitBecomeSeller({ storeName, storeDescription }) {
  const res = await api.post("/api/auth/become-seller", {
    storeName: storeName?.trim(),
    storeDescription: storeDescription?.trim() || "",
  });
  return normalizeAuthResponse(res.data);
}

/**
 * POST /api/auth/switch-role
 * @param {"seller"|"customer"} role - الدور المطلوب التحويل إليه
 */
export async function switchUserRole(role) {
  if (role !== "seller" && role !== "customer") {
    throw new Error('role يجب أن تكون "seller" أو "customer" فقط');
  }
  const res = await api.post("/api/auth/switch-role", { role });
  return normalizeAuthResponse(res.data);
}

/**
 * POST /api/auth/become-customer
 * بائع يطلب التحويل لحساب مشتري (بيلغي صلاحية البائع)
 * بيرجّع accessToken جديد + user فيه role: "customer" + reconnectSocket
 */
export async function submitBecomeCustomer() {
  const res = await api.post("/api/auth/become-customer");
  return normalizeAuthResponse(res.data);
}

/**
 * ✅ جديد: smart fallback للـ bootstrap لما /api/auth/me يرجّع 404.
 * بنفحص وجود seller profile و customer profile بـ request واحد
 * ونستنتج الـ flags من حالة الـ response:
 *   - 200 → الـ profile موجود
 *   - 404/403 → مش موجود
 *   - أي خطأ تاني → بنرجّع null (الـ bootstrap بيستخدم الـ cached user)
 *
 * السبب: الباك ممكن ما يكون عندوش /me endpoint، بس أكيد عندوش
 * /api/profile/customer و /api/seller/profile (موجودين بالـ Postman).
 */
export async function fetchProfileFlags() {
  const [sellerCheck, customerCheck] = await Promise.allSettled([
    api.get("/api/seller/profile"),
    api.get("/api/profile/customer"),
  ]);

  const hasSellerProfile =
    sellerCheck.status === "fulfilled" && sellerCheck.value.status === 200;
  const hasCustomerProfile =
    customerCheck.status === "fulfilled" && customerCheck.value.status === 200;

  // لازم يكون في flag واحد على الأقل true عشان نعتبر النتيجة صالحة
  // (وإلا الـ token منتهي أو في مشكلة كبيرة)
  if (!hasSellerProfile && !hasCustomerProfile) {
    return null;
  }

  return { hasSellerProfile, hasCustomerProfile };
}