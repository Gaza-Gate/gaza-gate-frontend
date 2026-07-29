// src/services/roleService.js
//
// خدمات API الخاصة بـ "تبديل الدور" و"تحويل حساب المشتري إلى بائع".
// بتستخدم نفس الـ axios instance الموجود بـ utils/api.js —
// اللي معمول له interceptor بيحط access token بالـ header تلقائياً
// وبيعمل refresh token تلقائي عند 401.

import api from "../utils/api";

/**
 * تطبيع شكل الرد القادم من الباك.
 * الباك بيرجّع { status: "success", data: { accessToken, refreshToken, user, reconnectSocket } }
 * فبنوحّد الشكل عشان الـ callers ما يحتاجوا يعرفوا الـ shape الكامل.
 */
function normalizeAuthResponse(resData) {
  const payload = resData?.data ?? resData ?? {};
  return {
    accessToken: payload.accessToken || payload.token || null,
    refreshToken: payload.refreshToken || null,
    user: payload.user || null,
    reconnectSocket: payload.reconnectSocket ?? false,
    message: payload.message || resData?.message || null,
  };
}

/**
 * POST /api/auth/become-seller
 * بيستقبل storeName + storeDescription، ولو الطلب نجح بيرجع
 * accessToken/refreshToken جدد + user object فيه role=seller و hasSellerProfile=true.
 *
 * شكل الرد (من Postman):
 * {
 *   status: "success",
 *   data: {
 *     accessToken: "eyJ...",
 *     user: { id, firstName, lastName, email, role: "seller", hasCustomerProfile: true, hasSellerProfile: true },
 *     reconnectSocket: true
 *   }
 * }
 *
 * ✅ 409 Conflict: الباك بيرجّع "Already a seller" لو المستخدم بائع فعلاً
 *    (المفروض ما يصير لأن الـ caller بيعمل check أولاً، بس بنغطّيه).
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
 *
 * شكل الرد (من Postman):
 * {
 *   status: "success",
 *   data: {
 *     accessToken: "eyJ...",
 *     user: { id, firstName, lastName, email, role, hasCustomerProfile, hasSellerProfile },
 *     reconnectSocket: true
 *   }
 * }
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
 * ✅ Bootstrap session validator
 *
 * بنفحص وجود seller profile و customer profile بـ request واحد متوازي
 * ونستنتج الـ flags من حالة الـ response:
 *   - 200 → الـ profile موجود
 *   - 401 → الـ token منتهي (بيعمله الـ axios interceptor refresh)
 *   - 403/404 → مش موجود
 *   - أي خطأ تاني → بنرجّع null (الـ caller بيستخدم الـ cached user)
 *
 * السبب: ما في /api/auth/me endpoint (تأكدت من Postman) — بس عندنا
 * /api/seller/profile و /api/profile/customer (موجودين بالـ Postman).
 *
 * الـ Promise.allSettled بنضمن إنو فشل واحد ما يوقف الثاني.
 */
export async function fetchProfileFlags() {
  const [sellerCheck, customerCheck] = await Promise.allSettled([
    api.get("/api/seller/profile"),
    api.get("/api/profile/customer"),
  ]);

  const hasSellerProfile =
    sellerCheck.status === "fulfilled" &&
    sellerCheck.value?.status >= 200 &&
    sellerCheck.value?.status < 300;
  const hasCustomerProfile =
    customerCheck.status === "fulfilled" &&
    customerCheck.value?.status >= 200 &&
    customerCheck.value?.status < 300;

  // إذا الاثنين رجعوا error (مثلاً 401) → ما عندنا info كافية
  if (sellerCheck.status === "rejected" && customerCheck.status === "rejected") {
    // 401 = token منتهي → بنرجّع null والـ caller بيعمل logout
    const sellerStatus = sellerCheck.reason?.response?.status;
    const customerStatus = customerCheck.reason?.response?.status;
    if (sellerStatus === 401 || customerStatus === 401) {
      return null;
    }
  }

  return { hasSellerProfile, hasCustomerProfile };
}
