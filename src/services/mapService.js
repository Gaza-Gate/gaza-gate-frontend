 import api from "../utils/api";

/**
 * خريطة المتاجر — جلب الدبابيس مع الفلاتر.
 * lat/lng لازم يوصلوا سوا. من غير sort، الباك بيختار تلقائياً:
 * nearest لو في GPS، وإلا rating.
 */
export async function getMapStores({
  lat,
  lng,
  sort,
  categoryId,
  q,
  radiusKm,
  page = 1,
  limit = 20,
} = {}) {
  const params = new URLSearchParams();
  if (lat != null && lng != null) {
    params.append("lat", lat);
    params.append("lng", lng);
  }
  if (sort) params.append("sort", sort);
  if (categoryId) params.append("categoryId", categoryId);
  if (q) params.append("q", q);
  if (radiusKm) params.append("radiusKm", radiusKm);
  params.append("page", page);
  params.append("limit", limit);

  const res = await api.get(`/api/map/stores?${params.toString()}`);
  // { stores: [...], pagination: {...} }
  return res.data?.data ?? { stores: [], pagination: null };
}

/** شيبس التصنيفات (عام، بدون توكن) */
export async function getAllCategories() {
  const res = await api.get("/api/category/all");
  return res.data?.data?.categories ?? [];
}

/** قراءة دبوس البائع الحالي — location تكون null إذا ما في دبوس بعد */
export async function getMyStoreLocation() {
  const res = await api.get("/api/seller/map/location");
  return res.data?.data?.location ?? null;
}

/** حفظ/استبدال دبوس البائع (لازم داخل حدود غزة، الباك بيتحقق ويرجع 400 غير هيك) */
export async function upsertMyStoreLocation(latitude, longitude) {
  const res = await api.put("/api/seller/map/location", { latitude, longitude });
  return res.data?.data?.location ?? null;
}

/** حذف دبوس البائع (idempotent — 200 حتى لو ما في دبوس أصلاً) */
export async function deleteMyStoreLocation() {
  const res = await api.delete("/api/seller/map/location");
  return res.data?.data ?? null;
}

/** صفحة المتجر العامة (بدون توكن) */
export async function getPublicStore(sellerId) {
  const res = await api.get(`/api/customer/store/${sellerId}`);
  return res.data?.data ?? null;
}

/** منتجات المتجر (بدون توكن) */
export async function getStoreProducts(sellerId, { page = 1, sort = "newest" } = {}) {
  const res = await api.get(
    `/api/customer/store/${sellerId}/products?page=${page}&sort=${sort}`
  );
  return res.data?.data ?? null;
}

/** استخراج رسالة خطأ مقروءة من رد الباك (validation / permission / not found) */
export function extractApiErrorMessage(err, fallback = "صار في خطأ، جرّبي كمان مرة") {
  const data = err?.response?.data?.data;
  if (!data) return fallback;
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors[0].message || fallback;
  }
  if (data.message) return data.message;
  return fallback;
}