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
function idFromActionUrl(actionUrl) {
  if (!actionUrl || typeof actionUrl !== "string") return null;
  // شي زي "/store/cc65b83c-46df-46e2-b12b-312b3f1696f8" أو "store/xxx" أو URL كامل
  const m = actionUrl.match(/\/store\/([0-9a-f-]{8,})/i);
  if (m && m[1]) return m[1];
  // fallback: آخر segment بعد /
  const parts = actionUrl.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  if (last && /^[0-9a-f-]{8,}$/i.test(last)) return last;
  return null;
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
 * Build the store-profile route for a given product (or seller id).
 * يقبل كمان string (id مباشر) أو كائن.
 */
export function storeProfilePath(productOrSeller) {
  if (!productOrSeller) return null;
  // إذا جاي كـ string (id مباشر)
  if (typeof productOrSeller === "string") {
    return productOrSeller ? `/customer/store/${productOrSeller}` : null;
  }
  // استخرج الـ id بالـ helper
  const id = extractSellerId(productOrSeller);
  if (id) return `/customer/store/${id}`;
  // آخر حل: لو في actionUrl جاهز، نستخدمه كما هو (لو الـ route متوافق)
  const actionUrl = productOrSeller?.seller?.actionUrl;
  if (actionUrl && actionUrl.startsWith("/store/")) {
    const sellerId = idFromActionUrl(actionUrl);
    if (sellerId) return `/customer/store/${sellerId}`;
  }
  return null;
}
