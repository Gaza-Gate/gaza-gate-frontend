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

// جلب الفئات (لوحة البائع/الأدمن)
export async function getCategories() {
  const res = await api.get("/api/category/all");
  return res.data;
}

// جلب المنتجات العامة (مع ترقيم الصفحات)
export async function getPublicProducts(page = 1) {
  const res = await api.get(`/api/product/public?page=${page}`);
  return res.data;
}

// جلب المنتجات العامة حسب التصنيف
export async function getPublicProductsByCategory(categoryId, page = 1) {
  const res = await api.get(`/api/product/public?categoryId=${categoryId}&page=${page}`);
  return res.data;
}

// البحث في المنتجات العامة
export async function searchPublicProducts(searchTerm, page = 1) {
  const res = await api.get(`/api/product/public?search=${encodeURIComponent(searchTerm)}&page=${page}`);
  return res.data;
}

// تصفية المنتجات العامة حسب السعر
export async function filterPublicProductsByPrice(minPrice, maxPrice, page = 1) {
  const params = new URLSearchParams({ page });
  if (minPrice) params.append('minPrice', minPrice);
  if (maxPrice) params.append('maxPrice', maxPrice);
  const res = await api.get(`/api/product/public?${params}`);
  return res.data;
}

// ترتيب المنتجات العامة
export async function sortPublicProducts(sortBy, page = 1) {
  const res = await api.get(`/api/product/public?sort=${sortBy}&page=${page}`);
  return res.data;
}

// تصفية متقدمة للمنتجات العامة (مع كل الخيارات)
export async function getPublicProductsWithFilters({ page = 1, search, categoryId, minPrice, maxPrice, sort }) {
  const params = new URLSearchParams({ page });
  if (search) params.append('search', search);
  if (categoryId) params.append('categoryId', categoryId);
  if (minPrice) params.append('minPrice', minPrice);
  if (maxPrice) params.append('maxPrice', maxPrice);
  if (sort) params.append('sort', sort);
  const res = await api.get(`/api/product/public?${params}`);
  return res.data;
}

// جلب تفاصيل منتج عام واحد
export async function getPublicProductDetails(productId) {
  const res = await api.get(`/api/product/public/${productId}`);
  return res.data?.data?.product || res.data?.product || res.data;
}

// جلب جميع الفئات العامة (لصفحة المتجر العام وصفحة المنتجات)
/**
 * GET /api/category/public
 * الـ response المتوقع:
 * {
 *   "status": "success",
 *   "data": {
 *     "categories": [
 *       { "id": "uuid", "name": "Electronics" },
 *       { "id": "uuid", "name": "Food" }
 *     ]
 *   }
 * }
 * أو مصفوفة مباشرة: [{ id, name }]
 *
 * نُطبّع الحقل: nameAr (مترجم إلى العربية إذا كان إنجليزي) + iconKey
 */
const CATEGORY_NAME_MAP = {
  // إنجليزي → عربي + مفتاح أيقونة
  "electronics": { ar: "الإلكترونيات", iconKey: "electronics" },
  "electronic":  { ar: "الإلكترونيات", iconKey: "electronics" },
  "food":        { ar: "المأكولات المنزلية", iconKey: "food" },
  "homemade":    { ar: "المأكولات المنزلية", iconKey: "food" },
  "home food":   { ar: "المأكولات المنزلية", iconKey: "food" },
  "clothes":     { ar: "ملابس", iconKey: "clothes" },
  "clothing":    { ar: "ملابس", iconKey: "clothes" },
  "fashion":     { ar: "ملابس", iconKey: "clothes" },
  "handicraft":  { ar: "الأشغال اليدوية", iconKey: "handicraft" },
  "handicrafts": { ar: "الأشغال اليدوية", iconKey: "handicraft" },
  "hand made":   { ar: "الأشغال اليدوية", iconKey: "handicraft" },
  "handmade":    { ar: "الأشغال اليدوية", iconKey: "handicraft" },
  "books":       { ar: "الكتب", iconKey: "books" },
  "beauty":      { ar: "الجمال والعناية", iconKey: "beauty" },
  "sports":      { ar: "الرياضة", iconKey: "sports" },
  "toys":        { ar: "الألعاب", iconKey: "toys" },
  "furniture":   { ar: "الأثاث", iconKey: "furniture" },
};

/**
 * ترجمة اسم فئة + استخراج مفتاح الأيقونة
 */
function mapCategory(raw) {
  if (!raw) return null;
  const rawName = String(raw.name ?? "").trim();
  const lower = rawName.toLowerCase();
  const mapped = CATEGORY_NAME_MAP[lower];
  return {
    id: raw.id,
    name: rawName,
    nameAr: mapped?.ar ?? rawName,           // لو الباك رجّع عربي نستخدمه، وإلا نترجم
    iconKey: mapped?.iconKey ?? "default",
    productCount: Number(raw.productCount ?? raw.productsCount ?? raw._count?.products ?? 0),
  };
}

export async function getPublicCategories() {
  const res = await api.get(`/api/category/public`);
  const list = res.data?.data?.categories
    ?? res.data?.categories
    ?? res.data?.data
    ?? res.data;
  if (!Array.isArray(list)) return [];
  return list.map(mapCategory).filter(Boolean);
}

// ──────────────────────────────────────────────
// Seller-side additions (from teammate — kept intact)
// ──────────────────────────────────────────────

// جلب تقييمات منتج معين
export const getProductReviews = async (productId) => {
  const res = await api.get(`/api/review/product/${productId}`);
  return res.data;
};

// جلب تفاصيل منتج واحد (سيلر) + آخر تقييمات - بيشتغل حتى لو المنتج مخفي
export async function getSellerProductDetails(productId) {
  const res = await api.get(`/api/product/${productId}`);
  return res.data;
}
