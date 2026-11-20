/**
 * Helpers related to navigating to / displaying a seller.
 *
 * The API returns the seller in slightly different shapes depending on the
 * endpoint and version. We've seen at least these variants:
 *
 *  1) New shape (most endpoints now):
 *     { seller: { id, storeName, avatar, actionUrl } }
 *     { sellerId: "..." }
 *
 *  2) Old shape (some `/api/product/public` responses — early deployment):
 *     { seller: { storeName } }      ← بدون id!
 *
 *  3) actionUrl-based (some endpoints return only the route):
 *     { seller: { actionUrl: "/store/cc65b83c-..." } }
 *
 *  4) Flat top-level:
 *     { sellerId: "..." }
 *
 *  Use `extractSellerId` everywhere we need the id so we never miss it.
 */

/**
 * استخراج id البائع من actionUrl (مثل "/store/cc65b83c-..." → "cc65b83c-...")
 * Accepts both with/without leading slash, full URLs and bare paths.
 */
// ✅ UUID كامل بس — عشان الـ slug (مثلاً "cafe-bead-face") ما ينفهم غلط كـ id
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isStoreId(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

function idFromActionUrl(actionUrl) {
  if (!actionUrl || typeof actionUrl !== "string") return null;
  // شي زي "/store/cc65b83c-46df-46e2-b12b-312b3f1696f8" أو "/customer/store/<id>" أو URL كامل
  // ⚠️ "/store/gift-store" (slug) → null — مش id
  const parts = actionUrl.split(/[/?#]/).filter(Boolean);
  const storeIndex = parts.lastIndexOf("store");
  const candidate = storeIndex >= 0 ? parts[storeIndex + 1] : parts[parts.length - 1];
  return isStoreId(candidate) ? candidate : null;
}

/**
 * ✅ slug المتجر من أي شكل: { slug } / { seller: { slug } } / { store: { slug } }
 *    أو actionUrl = "/store/<slug>" (الباك صار يبعته هيك للمتاجر اللي إلها slug)
 */
function slugFromStore(obj) {
  if (!obj || typeof obj !== "object") return null;
  const direct = obj.slug || obj.seller?.slug || obj.store?.slug;
  if (direct) return direct;
  const actionUrl = obj.actionUrl || obj.seller?.actionUrl || obj.store?.actionUrl;
  const m = typeof actionUrl === "string" && actionUrl.match(/^\/store\/([a-z0-9-]+)$/);
  return m && !isStoreId(m[1]) ? m[1] : null;
}

/**
 * Extract the seller id from a product, regardless of the shape it comes in.
 * Returns null if no id can be found.
 */
export function extractSellerId(product) {
  if (!product) return null;
  // 1) top-level sellerId
  if (product.sellerId && typeof product.sellerId === "string") {
    return product.sellerId;
  }
  // 2) nested seller.id
  if (product.seller?.id) {
    return product.seller.id;
  }
  // 3) nested seller._id
  if (product.seller?._id) {
    return product.seller._id;
  }
  // 4) nested seller.sellerId
  if (product.seller?.sellerId) {
    return product.seller.sellerId;
  }
  // 5) seller.actionUrl (e.g. "/store/<uuid>")
  const fromUrl = idFromActionUrl(product.seller?.actionUrl);
  if (fromUrl) return fromUrl;
  return null;
}

/**
 * Extract the seller display name from a product.
 */
export function extractSellerName(product) {
  if (!product) return "متجر";
  return (
    product.seller?.storeName ||
    product.storeName ||
    product.sellerName ||
    "متجر"
  );
}

/**
 * استخراج id الزبون (customer) من person object.
 *
 * الـ API بترجع person (otherParty / customer / order.customer) بأكثر من شكل:
 *
 *   1) New shape (الموصى به):
 *      { id, customerId: "<uuid>", actionUrl: "/profile/customer/<uuid>" }
 *
 *   2) Older shape (بدون customerId):
 *      { id, actionUrl: "/profile/customer/<uuid>" }
 *
 *   3) Oldest shape (قبل إضافة customerProfile support):
 *      { id: "<some-user-or-participant-id>" }   ← بدون customerId/actionUrl
 *      ⚠️ الـ id هون ممكن يكون user-id مش customer-id — فالـ API call
 *         بيوقع بـ 404 في بعض الحالات. هذا هو أفضل اللي عندنا.
 *
 * الترتيب: actionUrl > customerId > id (fallback)
 */
export function extractCustomerId(person) {
  if (!person) return null;

  // 1) actionUrl — الـ source of truth
  if (person.actionUrl && typeof person.actionUrl === "string") {
    const m = person.actionUrl.match(/\/profile\/customer\/([0-9a-f-]{8,})/i);
    if (m && m[1]) return m[1];
    // fallback: آخر segment بعد /
    const parts = person.actionUrl.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && /^[0-9a-f-]{8,}$/i.test(last)) return last;
  }

  // 2) customerId — الحقل الصريح
  if (person.customerId && typeof person.customerId === "string") {
    return person.customerId;
  }

  // 3) id — fallback (ممكن يكون user-id)
  if (person.id && typeof person.id === "string") {
    return person.id;
  }

  return null;
}

/**
 * Build the customer-profile route (/profile/customer/:id) for a given person.
 * Returns null لو ما لقى id صالح.
 */
export function customerProfilePath(person) {
  const id = extractCustomerId(person);
  return id ? `/profile/customer/${id}` : null;
}

/**
 * Build the store-profile route for a given product / seller / store (or id).
 *
 * ✅ رابط المتجر بالاسم:
 *   - عنده slug          → "/store/<slug>"         (gazagate.store/store/gift-store)
 *   - ما عنده (id بس)    → "/customer/store/<id>"  — الصفحة نفسها بتبدّل الرابط
 *                           للـ slug أول ما تحمّل المتجر.
 *
 * ⚠️ الروابط بالـ id ("/store/<id>" و "/customer/store/<id>") لازم تضل شغّالة
 *    للأبد — في QR مطبوع فيها.
 */
export function storeProfilePath(productOrSeller) {
  if (!productOrSeller) return null;
  // إذا جاي كـ string: id أو slug مباشر
  if (typeof productOrSeller === "string") {
    if (isStoreId(productOrSeller)) return `/customer/store/${productOrSeller}`;
    return `/store/${productOrSeller}`;
  }
  const slug = slugFromStore(productOrSeller);
  if (slug) return `/store/${slug}`;
  // استخرج الـ id بالـ helper
  const id = extractSellerId(productOrSeller);
  if (id) return `/customer/store/${id}`;
  return null;
}

/**
 * ✅ الرابط الكامل للمشاركة والـ QR: https://gazagate.store/store/<slug>
 *    (بيقبل نفس المدخلات تبع storeProfilePath)
 */
export function storeShareUrl(productOrSeller) {
  const path = storeProfilePath(productOrSeller);
  return path ? `${window.location.origin}${path}` : null;
}
