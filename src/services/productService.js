import { refreshAccessToken, saveRefreshedToken, forceLogoutRedirect } from "./authService";

const BASE_URL = import.meta.env.VITE_API_URL || "https://gaza-gate-backend.f9hf.onrender.com";

async function requestJSON(endpoint, body, token, method = "POST", _isRetry = false) {
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) }),
  });

  if (res.status === 401 && !_isRetry && token) {
    try {
      const refreshData = await refreshAccessToken();
      const newToken =
        refreshData?.data?.accessToken || refreshData?.accessToken || refreshData?.token;
      if (!newToken) throw new Error("فشل تجديد الجلسة");
      saveRefreshedToken(newToken);
      return requestJSON(endpoint, body, newToken, method, true);
    } catch {
      forceLogoutRedirect();
      throw new Error("انتهت جلستك، الرجاء تسجيل الدخول مرة أخرى");
    }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data;
}

async function requestFormData(endpoint, formData, token, method = "POST", _isRetry = false) {
  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: formData,
  });

  if (res.status === 401 && !_isRetry && token) {
    try {
      const refreshData = await refreshAccessToken();
      const newToken =
        refreshData?.data?.accessToken || refreshData?.accessToken || refreshData?.token;
      if (!newToken) throw new Error("فشل تجديد الجلسة");
      saveRefreshedToken(newToken);
      return requestFormData(endpoint, formData, newToken, method, true);
    } catch {
      forceLogoutRedirect();
      throw new Error("انتهت جلستك، الرجاء تسجيل الدخول مرة أخرى");
    }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data;
}

// جلب كل منتجات البائع
export async function getProducts(token) {
  return requestJSON("/api/product/", null, token, "GET");
}

// إنشاء منتج جديد (FormData لأنه فيها صورة)
export async function createProduct(formData, token) {
  return requestFormData("/api/product/", formData, token, "POST");
}

// تعديل منتج موجود (FormData لأنه فيها صورة)
export async function updateProduct(productId, formData, token) {
  return requestFormData(`/api/product/${productId}`, formData, token, "PUT");
}

// تبديل حالة المنتج (نشط/مخفي) - بدون body
export async function updateProductStatus(productId, _newStatus, token) {
  return requestJSON(`/api/product/${productId}/toggle`, null, token, "PATCH");
}

// حذف منتج
export async function deleteProduct(productId, token) {
  return requestJSON(`/api/product/${productId}`, null, token, "DELETE");
}

// جلب المنتجات العامة (مع ترقيم الصفحات)
export async function getPublicProducts(page = 1) {
  const res = await fetch(`${BASE_URL}/api/product/public?page=${page}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data;
}

// جلب المنتجات العامة حسب التصنيف
export async function getPublicProductsByCategory(categoryId, page = 1) {
  const res = await fetch(`${BASE_URL}/api/product/public?categoryId=${categoryId}&page=${page}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data;
}

// البحث في المنتجات العامة
export async function searchPublicProducts(searchTerm, page = 1) {
  const res = await fetch(`${BASE_URL}/api/product/public?search=${encodeURIComponent(searchTerm)}&page=${page}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data;
}

// تصفية المنتجات العامة حسب السعر
export async function filterPublicProductsByPrice(minPrice, maxPrice, page = 1) {
  const params = new URLSearchParams({ page });
  if (minPrice) params.append('minPrice', minPrice);
  if (maxPrice) params.append('maxPrice', maxPrice);
  const res = await fetch(`${BASE_URL}/api/product/public?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data;
}

// ترتيب المنتجات العامة
export async function sortPublicProducts(sortBy, page = 1) {
  const res = await fetch(`${BASE_URL}/api/product/public?sort=${sortBy}&page=${page}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data;
}

// تصفية متقدمة للمنتجات العامة (مع كل الخيارات)
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

// جلب تفاصيل منتج عام واحد
export async function getPublicProductDetails(productId) {
  const res = await fetch(`${BASE_URL}/api/product/public/${productId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data.data?.product || data.product || data;
}

// جلب جميع الفئات العامة
export async function getPublicCategories() {
  const res = await fetch(`${BASE_URL}/api/category/public`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data.data?.categories || data.categories || data;
}