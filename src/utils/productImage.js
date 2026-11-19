// src/utils/productImage.js
//
// ✅ Helper موحّد لاستخراج رابط صورة المنتج من أي "item" في المشروع.
// الباك يعطي الصورة بأشكال مختلفة حسب الـ endpoint:
//
//   • GET /api/product/public         → product.primaryImage = { imageUrl: "..." } (object)
//   • GET /api/product/public/:id     → product.images[] = [{ imageUrl, isPrimary, ... }]
//   • GET /api/customer/cart/         → cartItem.product.imageUrl = "..." (string)
//   • GET /api/customer/order/:id     → orderItem.primaryImage = "..." (string)
//
// الـ cart المحلي (CartContext) يحفظ enrichedProduct كاملة، فبنحتاج نتحقق
// من كل الحقول الممكنة قبل ما نرجع logo كـ fallback.

import logo from "../assets/logo.png";

/**
 * ✅ يرجّع URL صورة صالح لـ "item" (cart item, order item, product, ...).
 *
 * @param {Object} item - العنصر اللي بدنا صورته
 * @param {string} [fallback] - fallback اختياري (افتراضياً logo المشروع)
 * @returns {string}
 */
export function getProductImageUrl(item, fallback) {
  if (!item) return fallback || logo;

  // 1) لو الـ item عنده product nested (مثلاً cartItem.product, orderItem.product)
  //    الباك في cart GET بيرجّع: { id, product: { id, name, imageUrl, ... } }
  if (item.product) {
    // 1a) product.imageUrl كحقل string
    if (typeof item.product.imageUrl === "string" && item.product.imageUrl) {
      return item.product.imageUrl;
    }
    // 1b) product.primaryImage.imageUrl (object)
    if (item.product.primaryImage?.imageUrl) {
      return item.product.primaryImage.imageUrl;
    }
    // 1c) product.primaryImage كـ string مباشرة
    if (typeof item.product.primaryImage === "string" && item.product.primaryImage) {
      return item.product.primaryImage;
    }
    // 1d) product.images[] array
    const img = findFirstImage(item.product.images);
    if (img) return img;
  }

  // 2) الـ item نفسه عنده image كحقل string (cart محلي)
  if (typeof item.image === "string" && item.image) {
    return item.image;
  }

  // 3) order item عنده primaryImage كحقل string
  if (typeof item.primaryImage === "string" && item.primaryImage) {
    return item.primaryImage;
  }

  // 4) order item عنده primaryImage كـ object
  if (item.primaryImage?.imageUrl) {
    return item.primaryImage.imageUrl;
  }

  // 5) الـ item عنده images array مباشرة
  const img = findFirstImage(item.images);
  if (img) return img;

  // 6) fallback
  return fallback || logo;
}

/**
 * يبحث عن أول imageUrl صالح داخل مصفوفة images
 * (قد تكون entries بـ imageUrl أو بـ url).
 */
function findFirstImage(images) {
  if (!Array.isArray(images) || images.length === 0) return null;

  // أولوية 1: اللي isPrimary = true
  const primary = images.find((i) => i && i.isPrimary === true);
  if (primary?.imageUrl) return primary.imageUrl;
  if (primary?.url) return primary.url;

  // أولوية 2: أول عنصر عنده imageUrl
  const first = images.find((i) => i && (i.imageUrl || i.url));
  if (first?.imageUrl) return first.imageUrl;
  if (first?.url) return first.url;

  return null;
}
