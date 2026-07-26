import api from "../utils/api";

/**
 * GET /api/customer/store/{sellerId}
 * — يجيب بيانات المتجر الكاملة: info + stats + products preview + reviews
 *
 * شكل الـ response:
 * {
 *   status: "success",
 *   data: {
 *     store: { id, storeName, storeDescription, rating, ratingCount, user: {avatar} },
 *     stats: { positiveReviews, activeProducts },
 *     products: { total, preview: [...] },
 *     reviews: { average, total, list: [...], hasMore }
 *   }
 * }
 */
export async function getStoreProfile(sellerId) {
  const res = await api.get(`/api/customer/store/${sellerId}`);
  return res.data?.data ?? res.data;
}

/**
 * GET /api/customer/store/{sellerId}/products?page=1
 * — قائمة منتجات المتجر مع pagination
 */
export async function getStoreProducts(sellerId, page = 1) {
  const res = await api.get(
    `/api/customer/store/${sellerId}/products?page=${page}`
  );
  return res.data?.data ?? res.data;
}
