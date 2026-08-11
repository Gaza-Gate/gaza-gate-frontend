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
/**
 * يحاول أولاً الـ protected endpoint `/api/category/all`.
 * لو فشل (401/403) → fallback تلقائي للـ public `/api/category/public` عشان
 * على الأقل البائع يشوف الفئات (الـ public نفس البيانات للقراءة).
 *
 * الـ response المتوقع (إحدى هذه الأشكال):
 *   1) { status: "success", data: { categories: [{ id, name }, ...] } }
 *   2) { status: "success", categories: [{ id, name }, ...] }
 *   3) { data: { categories: [...] } }
 *   4) [{ id, name }, ...]  (مصفوفة مباشرة)
 * بيرجع array مُطبَّع (id, name).
 */
export async function getCategories() {
  const unwrap = (data) => {
    const list = data?.data?.categories
      ?? data?.categories
      ?? data?.data
      ?? data;
    if (!Array.isArray(list)) return [];
    return list
      .map((c) => ({
        id: c?.id ?? c?._id,
        name: c?.name ?? "",
      }))
      .filter((c) => c.id);
  };

  // المحاولة الأولى: endpoint محمي (يتوقع توثيق)
  try {
    const res = await api.get("/api/category/all");
    const list = unwrap(res.data);
    if (list.length > 0) return list;
    // رجّع مصفوفة فاضية من غير ما نعمل fallback — الباك فعلاً رجّع فاضي
    // (الفاضي هنا مش خطأ، يعني ما في فئات بالـ DB)
    return list;
  } catch (err) {
    const status = err?.response?.status;
    // 401/403/404: التوكن مش صالح أو الـ endpoint محمي/مفقود
    // → نجرّب public كـ fallback
    if (status === 401 || status === 403 || status === 404) {
      console.warn(
        `⚠️ [getCategories] الـ protected endpoint رجّع ${status}، بنجرّب public كـ fallback...`
      );
      try {
        const res = await api.get("/api/category/public");
        return unwrap(res.data);
      } catch (fallbackErr) {
        console.error("❌ [getCategories] الـ public fallback كمان فشل:", fallbackErr);
        throw err; // نرجع الخطأ الأصلي (الـ protected) لأنه الأوضح
      }
    }
    // باقي الأخطاء (500, network, ...) → ارميها
    throw err;
  }
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
 * ✅ الـ endpoint الموثّق للباك: `GET /api/category/all`
 * (نفس endpoint البائع — بيرجع array من {id, name} بدون pagination)
 *
 * الـ request interceptor رح يضيف `Authorization: Bearer <token>` تلقائياً
 * لما المشتري مسجل دخول — فبيرجّع الفئات بنجاح.
 *
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
 * استخراج مصفوفة الفئات من أي شكل متوقع للـ response
 * (الباك أحياناً بيرجّعها بصفّ data wrapper، أحياناً مباشرة)
 */
function unwrapCategories(payload) {
  const list = payload?.data?.categories
    ?? payload?.categories
    ?? payload?.data
    ?? payload;
  return Array.isArray(list) ? list : [];
}

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

/**
 * ✅ جلب الفئات من الباك (للعميل على صفحة المنتجات).
 *
 * الترتيب:
 * 1) `GET /api/category/all`  ← endpoint موثّق، يعمل مع auth (المشتري عنده token)
 * 2) `GET /api/category/public` ← fallback لو الأول رجّع 401/403/404
 * 3) بترجّع [] لو الاثنين فشلوا → الـ carousel رح يستخدم FALLBACK المحلي
 */
export async function getPublicCategories() {
  // ── 1) المحاولة الأولى: الـ endpoint الموثّق مع auth ──
  try {
    const res = await api.get(`/api/category/all`);
    const list = unwrapCategories(res.data);
    if (list.length > 0) {
      return list.map(mapCategory).filter(Boolean);
    }
    // الباك رجّع 200 بس فاضي — نرجّع فاضي بدون fallback
    return [];
  } catch (err) {
    const status = err?.response?.status;
    // 401/403/404 → الـ endpoint محمي أو مش متاح، بنجرّب الـ public كـ fallback
    if (status === 401 || status === 403 || status === 404) {
      console.warn(
        `⚠️ [getPublicCategories] /api/category/all رجّع ${status}، بنجرّب /api/category/public كـ fallback...`
      );
      try {
        const res = await api.get(`/api/category/public`);
        const list = unwrapCategories(res.data);
        return list.map(mapCategory).filter(Boolean);
      } catch (fallbackErr) {
        console.error("❌ [getPublicCategories] الـ public fallback كمان فشل:", fallbackErr);
        return []; // الـ caller رح يستخدم الـ FALLBACK المحلي
      }
    }
    // باقي الأخطاء (500, network, ...) → ارمِها ليتعامل معها الـ caller
    throw err;
  }
}

// ──────────────────────────────────────────────
// Seller-side additions (from teammate — kept intact)
// ──────────────────────────────────────────────

// جلب تقييمات منتج معين
export const getProductReviews = async (productId, page = 1) => {
  const res = await api.get(`/api/review/product/${productId}?page=${page}`);
  return res.data;
};

// جلب تفاصيل منتج واحد (سيلر) + آخر تقييمات - بيشتغل حتى لو المنتج مخفي
export async function getSellerProductDetails(productId) {
  const res = await api.get(`/api/product/${productId}`);
  return res.data;
}
