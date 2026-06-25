const BASE_URL = import.meta.env.VITE_API_URL || "https://gaza-gate-backend.onrender.com";

async function requestJSON(endpoint, body, token, method = "POST") {
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ، حاول مرة ثانية");
  return data;
}

async function requestFormData(endpoint, formData, token, method = "POST") {
  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: formData,
  });
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