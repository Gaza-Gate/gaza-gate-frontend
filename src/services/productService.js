import api from "../utils/api";

// جلب كل منتجات البائع
export async function getProducts() {
  const res = await api.get("/api/product/");
  return res.data;
}

// إنشاء منتج جديد (FormData لأنه فيها صورة)
export async function createProduct(formData) {
  const res = await api.post("/api/product/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function updateProduct(productId, formData) {
  const res = await api.put(`/api/product/${productId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

// تبديل حالة المنتج (نشط/مخفي)
export async function updateProductStatus(productId) {
  const res = await api.patch(`/api/product/${productId}/toggle`);
  return res.data;
}

// حذف منتج
export async function deleteProduct(productId) {
  const res = await api.delete(`/api/product/${productId}`);
  return res.data;
}

// جلب الفئات
export async function getCategories() {
  const res = await api.get("/api/category/all");
  return res.data;
}