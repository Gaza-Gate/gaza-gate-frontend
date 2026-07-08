import { apiRequest, requestFormData } from "./authService";

const BASE_URL = import.meta.env.VITE_API_URL || "https://gaza-gate-backend.f9hf.onrender.com";

// جلب كل منتجات البائع
export async function getProducts(token) {
  return apiRequest("/api/product/", null, token, "GET");
}

// إنشاء منتج جديد (FormData لأنه فيها صورة)
export async function createProduct(formData, token) {
  return requestFormData("/api/product/", formData, token, "POST");
}

// تعديل منتج موجود (FormData لأنه فيها صورة)
export async function updateProduct(productId, formData, token) {
  return requestFormData(`/api/product/${productId}`, formData, token, "PUT");
}

// تبديل حالة المنتج
export async function updateProductStatus(productId, _newStatus, token) {
  return apiRequest(`/api/product/${productId}/toggle`, null, token, "PATCH");
}

// حذف منتج
export async function deleteProduct(productId, token) {
  return apiRequest(`/api/product/${productId}`, null, token, "DELETE");
}

// إرسال تقييم لمنتج مع صورة اختيارية
export async function submitProductReview(productId, reviewData, token) {
  const fd = new FormData();
  fd.append("rating", reviewData.rating);
  fd.append("comment", reviewData.comment);
  if (reviewData.orderId) fd.append("orderId", reviewData.orderId);
  if (reviewData.image) fd.append("image", reviewData.image);

  return requestFormData(`/api/product/${productId}/reviews`, fd, token, "POST");
}

// ══════════════════════════════════════════════
// المسارات العامة (Public) — بدون توكن، ما بتحتاج تجديد
// ══════════════════════════════════════════════

export async function getPublicProducts(page = 1) {
  const res = await fetch(`${BASE_URL}/api/product/public?page=${page}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data;
}

export async function getPublicProductsByCategory(categoryId, page = 1) {
  const res = await fetch(`${BASE_URL}/api/product/public?categoryId=${categoryId}&page=${page}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data;
}

export async function searchPublicProducts(searchTerm, page = 1) {
  const res = await fetch(`${BASE_URL}/api/product/public?search=${encodeURIComponent(searchTerm)}&page=${page}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data;
}

export async function filterPublicProductsByPrice(minPrice, maxPrice, page = 1) {
  const params = new URLSearchParams({ page });
  if (minPrice) params.append('minPrice', minPrice);
  if (maxPrice) params.append('maxPrice', maxPrice);
  const res = await fetch(`${BASE_URL}/api/product/public?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data;
}

export async function sortPublicProducts(sortBy, page = 1) {
  const res = await fetch(`${BASE_URL}/api/product/public?sort=${sortBy}&page=${page}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data;
}

export async function getPublicProductsWithFilters({ page = 1, search, categoryId, minPrice, maxPrice, sort }) {
  const params = new URLSearchParams({ page });
  if (search) params.append('search', search);
  if (categoryId) params.append('categoryId', categoryId);
  if (minPrice) params.append('minPrice', minPrice);
  if (maxPrice) params.append('maxPrice', maxPrice);
  if (sort) params.append('sort', sort);
  const res = await fetch(`${BASE_URL}/api/product/public?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data;
}

export async function getPublicProductDetails(productId) {
  const res = await fetch(`${BASE_URL}/api/product/public/${productId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data.data?.product || data.product || data;
}

export async function getPublicCategories() {
  const res = await fetch(`${BASE_URL}/api/category/public`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data.data?.categories || data.categories || data;
}