import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Star,
  Package,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Camera,
  MessageSquareQuote,
  ShieldCheck,
  Store,
  BadgeCheck,
} from "lucide-react";

import {
  getProductReviews,
  getSellerProductReviews,
} from "../services/reviewService";
import { avatarColor, fullName } from "../utils/chatHelpers";
import { customerProfilePath, storeProfilePath } from "../utils/sellerHelpers";
import "./BuyerProductReviewsSection.css";

/* ════════════════════════════════════════════════════════════════
   BuyerProductReviewsSection
   ─────────────────────────────────────────────────────────────
   يعرض تقييمات المشترين (customers) لمنتج معيّن.
   مستخدم في:
     1) صفحة تفاصيل المنتج  (CustomerProductDetails)
     2) تبويب التقييمات في صفحة المتجر  (CustomerStoreProfile)
   ════════════════════════════════════════════════════════════════ */

/* ── Helpers ─────────────────────────────────────────────── */

function StarRow({ value, size = 14, color = "#f59e0b" }) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <span
      className="bprs-stars"
      style={{ fontSize: size }}
      aria-label={`تقييم ${rounded} من 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          fill={i < rounded ? color : "transparent"}
          color={i < rounded ? color : "#d8dade"}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const day = 1000 * 60 * 60 * 24;
  const days = Math.floor(diff / day);
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days < 7) return `منذ ${days} يوم`;
  if (days < 30) return `منذ ${Math.floor(days / 7)} أسبوع`;
  if (days < 365) return `منذ ${Math.floor(days / 30)} شهر`;
  return `منذ ${Math.floor(days / 365)} سنة`;
}

/** اسم العميل المعروض (نحترم خصوصيته)
 *  ✅ الباك الفعلي (من Postman NEW responses) يرجع customer كـ flat object:
 *     { id, firstName, lastName, avatar, actionUrl, isTrustedBuyer }
 *  لكن بعض الـ endpoints القديمة (مثل أول deployment) ترجع customer nested:
 *     { id, user: { firstName, lastName, avatar } }
 *  نتعامل مع كل الـ shapes.
 */
function buyerDisplayName(review) {
  if (!review) return "مشتري";
  const flat = review.customer || {};
  const nested = flat.user || review.user || {};
  // أولوية للـ flat shape (الموصى به حالياً من الباك)
  if (flat.firstName || flat.lastName) {
    return fullName(
      { firstName: flat.firstName, lastName: flat.lastName },
      "مشتري"
    );
  }
  // بعدها nested (للتوافق مع الإصدارات القديمة)
  if (nested.firstName || nested.lastName) return fullName(nested, "مشتري");
  // بعض الـ APIs ترجع اسم مختصر
  if (flat.name) return flat.name;
  if (nested.name) return nested.name;
  return "مشتري موثّق";
}

function buyerAvatarUrl(review) {
  if (!review) return null;
  return (
    review.customer?.avatar ||
    review.customer?.user?.avatar ||
    review.user?.avatar ||
    null
  );
}

function buyerInitial(review) {
  const flat = review.customer || {};
  const nested = flat.user || review.user || {};
  if (flat.firstName) return flat.firstName[0];
  if (nested.firstName) return nested.firstName[0];
  if (flat.name) return flat.name[0];
  if (nested.name) return nested.name[0];
  return "?";
}

/**
 * استخراج المسار لبروفايل المشتري (customer) من الـ review object.
 * ✅ حسب Postman collection — الـ shape الجديد بيرجّع:
 *    customer: { id, firstName, lastName, avatar, actionUrl, isTrustedBuyer }
 * الأولوية:
 *   1) customer.actionUrl  (الـ source of truth من الباك)
 *   2) customer.id         (نبني المسار يدوي)
 *   3) user.id             (fallback إذا الباك رجّع user.id فقط)
 * يرجع null لو ما في id صالح.
 */
function customerProfileHref(review) {
  if (!review) return null;
  // ✅ customerProfilePath من sellerHelpers.js — بيستخرج من actionUrl > customerId > id
  return customerProfilePath(review.customer) || customerProfilePath(review.user) || null;
}

/** هل المشتري موثّق (Trusted Buyer)؟ */
function isBuyerTrusted(review) {
  return Boolean(
    review?.customer?.isTrustedBuyer ||
      review?.customer?.user?.isTrustedBuyer ||
      review?.user?.isTrustedBuyer ||
      false
  );
}

/* ════════════════════════════════════════════════════════════════
   Seller Reply Normalization (محدّث من Postman NEW contract)
   ─────────────────────────────────────────────────────────────
   الباك الآن يرجّع الرد بشكل موحّد وبسيط (Postman NEW responses):
     review = {
 *     id, rating, comment, imageUrl, createdAt,
 *     sellerReply:    "string" | null,        ← نص مباشر (مش object)
 *     sellerRepliedAt: "ISO date" | null,     ← تاريخ الرد منفصل
 *     customer: { id, firstName, lastName, avatar, actionUrl, isTrustedBuyer },
 *     product?: { id, name }
 *   }

   هون بنحوّلهم لشكل موحّد للاستخدام داخل الـ UI:
     { text: "string", createdAt: "ISO date", seller: { id?, name?, avatar? } | null }

   الـ seller info (اسم + أفاتار) بنجيبها من review.seller (لو الباك رجّعه)
   أو من product.seller عبر الـ product object.
   ════════════════════════════════════════════════════════════════ */
function normalizeSellerReply(review) {
  if (!review || typeof review !== "object") return null;

  // ✅ NEW shape: sellerReply كنص top-level + sellerRepliedAt منفصل
  const rawText = review.sellerReply;
  if (typeof rawText !== "string" || !rawText.trim()) return null;

  return {
    text: rawText.trim(),
    createdAt: review.sellerRepliedAt ?? null,
    seller: extractReviewSeller(review),
    raw: { sellerReply: rawText, sellerRepliedAt: review.sellerRepliedAt },
  };
}

/**
 * تطبيع seller object من الـ review
 *
 * حسب Postman (NEW response):
 *   review = {
 *     id, rating, comment, imageUrl, sellerReply, sellerRepliedAt, createdAt,
 *     customer: { id, firstName, lastName, avatar, actionUrl, isTrustedBuyer },
 *     product?: { id, name }
 *   }
 *
 * ممكن الـ seller info تجي من:
 *   1) review.seller / review.store (نادر — من زاوية المشتري عادةً مش موجود)
 *   2) review.product.seller (لو الباك أرجعها مع المنتج)
 */
function extractReviewSeller(review) {
  if (!review) return null;
  // 1) من review.seller (لو الباك رجّعه مباشرة)
  if (review.seller) {
    return extractSellerInfo({ seller: review.seller });
  }
  // 2) من review.store (alias قديم)
  if (review.store) {
    return extractSellerInfo({ seller: review.store });
  }
  // 3) من review.product.seller (لو الباك أرجع البائع مع المنتج)
  if (review.product?.seller) {
    return extractSellerInfo({ seller: review.product.seller });
  }
  return null;
}

function extractSellerInfo(obj) {
  if (!obj || typeof obj !== "object") return null;
  const sellerObj = obj.seller || obj.store || obj.vendor || null;
  if (!sellerObj) return null;

  const id = sellerObj.id ?? sellerObj._id ?? sellerObj.sellerId ?? null;
  const avatar =
    sellerObj.avatar ||
    sellerObj.logo ||
    sellerObj.storeImage ||
    sellerObj.image ||
    null;

  // ✅ الباك قد يرجع:
  //    - { storeName, avatar, actionUrl }  (POSTMAN شكل أساسي)
  //    - { firstName, lastName, avatar }   (flat من /api/review/seller/.../product-reviews)
  //    - { user: { firstName, lastName, avatar } }  (nested قديم)
  let name =
    sellerObj.storeName ||
    sellerObj.name ||
    [sellerObj.user?.firstName, sellerObj.user?.lastName].filter(Boolean).join(" ").trim() ||
    [sellerObj.firstName, sellerObj.lastName].filter(Boolean).join(" ").trim() ||
    null;

  if (!name && typeof sellerObj === "object") {
    name = "المتجر";
  }

  return { id, name, avatar, actionUrl: sellerObj.actionUrl || null };
}

/**
 * استخراج قائمة المراجعات من أي shape يرجعها الباك
 * — القائمة ممكن تكون data.list / data.reviews / data.items / array مباشرة
 */
function extractList(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.list)) return data.list;
  if (Array.isArray(data.reviews)) return data.reviews;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function extractMeta(data, fallbackTotal) {
  if (!data || typeof data !== "object") {
    return { average: 0, total: fallbackTotal || 0, distribution: null, pagination: null };
  }
  return {
    average: Number(
      data?.average ?? data?.avgRating ?? data?.averageRating ?? 0
    ),
    total: Number(
      data?.total ?? data?.totalReviews ?? data?.count ?? fallbackTotal ?? 0
    ),
    distribution: data?.distribution ?? null,
    pagination: data?.pagination ?? null,
  };
}

/* ── Distribution Bars (5 → 1) ──────────────────────────── */

function DistributionBars({ distribution, total }) {
  if (!distribution || total <= 0) return null;
  const rows = [5, 4, 3, 2, 1];
  return (
    <div className="bprs-distribution" dir="rtl">
      {rows.map((star) => {
        // الباك بيرجّع keys كـ strings: { "1": 0, "2": 0, "3": 0, "4": 1, "5": 1 }
        const count = Number(
          distribution?.[star] ?? distribution?.[String(star)] ?? 0
        );
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={star} className="bprs-dist-row">
            <span className="bprs-dist-label">
              {star}
              <Star size={11} fill="#f59e0b" color="#f59e0b" strokeWidth={0} />
            </span>
            <div className="bprs-dist-bar">
              <div
                className="bprs-dist-fill"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="bprs-dist-count">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Single Review Card ─────────────────────────────────── */

function ReviewCard({
  review,
  index = 0,
  showProductTag = false,
  onProductTagClick = null,
  isHighlighted = false,
}) {
  const displayName = buyerDisplayName(review);
  const initial = buyerInitial(review);
  const avatarUrl = buyerAvatarUrl(review);
  const color = avatarColor(displayName);

  // ✅ رابط بروفايل المشتري — قابل للنقر (Clickable)
  // حسب Postman: review.customer.{id, actionUrl, isTrustedBuyer}
  const customerHref = customerProfileHref(review);
  const buyerIsTrusted = isBuyerTrusted(review);

  // صورة المراجعة (من الباك غالباً review.image / imageUrl / photo)
  // الباك يرجعها أيضاً في الـ POST response كـ imageUrl
  const reviewImage =
    review.image || review.imageUrl || review.photo || null;

  // اسم المنتج (لو الباك رجّعه — مفيد بصفحة المتجر لتمييز المنتج)
  const productName = review.product?.name || review.productName || null;

  // رد البائع — normalize شامل يدعم كل الأشكال/الأسماء المحتملة من الباك
  const sellerReply = normalizeSellerReply(review);

  // ✅ رابط بروفايل المتجر / البائع
  // حسب Postman: seller.actionUrl = "/store/:sellerId" أو seller.id
  const sellerHref = sellerReply
    ? storeProfilePath({
        seller: {
          id: sellerReply.seller?.id,
          actionUrl:
            sellerReply.seller?.actionUrl ||
            (sellerReply.seller?.id ? `/store/${sellerReply.seller.id}` : null),
        },
      })
    : null;

  return (
    <article
      className={`bprs-review-card ${isHighlighted ? "bprs-review-card--highlight" : ""}`}
      data-review-id={review.id}
      id={review.id ? `review-${review.id}` : undefined}
      style={{ animationDelay: `${Math.min(index, 8) * 0.05}s` }}
    >
      <div className="bprs-review-card-bg" />

      <header className="bprs-review-head">
        <div className="bprs-review-user">
          {customerHref ? (
            <Link
              to={customerHref}
              className="bprs-review-avatar bprs-review-avatar--link"
              style={{ backgroundColor: color }}
              title={`عرض بروفايل ${displayName}`}
              aria-label={`عرض بروفايل ${displayName}`}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} loading="lazy" />
              ) : (
                <span>{initial}</span>
              )}
            </Link>
          ) : (
            <div
              className="bprs-review-avatar"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} loading="lazy" />
              ) : (
                <span>{initial}</span>
              )}
            </div>
          )}
          <div className="bprs-review-user-meta">
            <div className="bprs-review-user-meta-row">
              {customerHref ? (
                <Link
                  to={customerHref}
                  className="bprs-review-name bprs-review-name--link"
                  title={`عرض بروفايل ${displayName}`}
                >
                  {displayName}
                </Link>
              ) : (
                <span className="bprs-review-name">{displayName}</span>
              )}
              {buyerIsTrusted && (
                <span
                  className="bprs-review-trusted"
                  title="مشتري موثّق"
                  aria-label="مشتري موثّق"
                >
                  <BadgeCheck size={13} />
                </span>
              )}
            </div>
            <span className="bprs-review-time">
              {timeAgo(review.createdAt || review.created_at)}
            </span>
          </div>
        </div>

        <div className="bprs-review-stars-wrap">
          <StarRow value={review.rating} size={15} />
          <span className="bprs-review-rating-num">
            {Number(review.rating).toFixed(1)}
          </span>
        </div>
      </header>

      {review.comment && (
        <p className="bprs-review-comment">{review.comment}</p>
      )}

      {showProductTag && productName && (
        onProductTagClick ? (
          <button
            type="button"
            className="bprs-review-product-tag bprs-review-product-tag--clickable"
            onClick={() => onProductTagClick(review.product)}
            title="عرض المنتج"
          >
            {productName}
          </button>
        ) : (
          <span className="bprs-review-product-tag" title="اسم المنتج">
            {productName}
          </span>
        )
      )}

      {reviewImage && (
        <div className="bprs-review-image-wrap">
          <a
            href={reviewImage}
            target="_blank"
            rel="noreferrer noopener"
            title="عرض الصورة بالحجم الكامل"
          >
            <img src={reviewImage} alt="صورة المراجعة" loading="lazy" />
          </a>
        </div>
      )}

      {sellerReply && (
        <div className="bprs-review-reply" role="note" aria-label="رد المتجر">
          <div className="bprs-review-reply-tail" aria-hidden="true" />

          {/* Header: أفاتار + اسم المتجر + verified + الوقت */}
          <div className="bprs-review-reply-head">
            {sellerHref ? (
              <Link
                to={sellerHref}
                className="bprs-review-reply-avatar bprs-review-reply-avatar--link"
                style={{
                  backgroundColor: avatarColor(
                    sellerReply.seller?.name || "المتجر"
                  ),
                }}
                title={`زيارة متجر ${sellerReply.seller?.name || ""}`}
                aria-label={`زيارة متجر ${sellerReply.seller?.name || ""}`}
              >
                {sellerReply.seller?.avatar ? (
                  <img
                    src={sellerReply.seller.avatar}
                    alt={sellerReply.seller.name || "المتجر"}
                  />
                ) : (
                  <Store size={14} />
                )}
              </Link>
            ) : (
              <div
                className="bprs-review-reply-avatar"
                style={{
                  backgroundColor: avatarColor(
                    sellerReply.seller?.name || "المتجر"
                  ),
                }}
                aria-hidden="true"
              >
                {sellerReply.seller?.avatar ? (
                  <img
                    src={sellerReply.seller.avatar}
                    alt={sellerReply.seller.name || "المتجر"}
                  />
                ) : (
                  <Store size={14} />
                )}
              </div>
            )}

            <div className="bprs-review-reply-meta">
              <div className="bprs-review-reply-meta-top">
                {sellerHref ? (
                  <Link
                    to={sellerHref}
                    className="bprs-review-reply-name bprs-review-reply-name--link"
                    title={`زيارة متجر ${sellerReply.seller?.name || ""}`}
                  >
                    {sellerReply.seller?.name || "المتجر"}
                    <span className="bprs-link-arrow" aria-hidden="true">↗</span>
                  </Link>
                ) : (
                  <strong className="bprs-review-reply-name">
                    {sellerReply.seller?.name || "المتجر"}
                  </strong>
                )}
                <span className="bprs-review-reply-badge" title="بائع موثّق">
                  <ShieldCheck size={10} />
                  موثّق
                </span>
              </div>
              <div className="bprs-review-reply-meta-bottom">
                <MessageSquareQuote size={11} />
                <span>ردّ المتجر</span>
                {sellerReply.createdAt && (
                  <>
                    <span className="bprs-review-reply-dot" aria-hidden="true">·</span>
                    <span className="bprs-review-reply-time">
                      {timeAgo(sellerReply.createdAt)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* نص الرد */}
          <p className="bprs-review-reply-text">{sellerReply.text}</p>
        </div>
      )}

      <footer className="bprs-review-foot">
        <span className="bprs-review-verified">
          <ShieldCheck size={11} />
          مشتري موثّق
        </span>
      </footer>
    </article>
  );
}

/* ════════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════════ */

export default function BuyerProductReviewsSection({
  /** productId — لوضع "منتج" (افتراضي). يستدعي /api/review/product/:id */
  productId,
  /**
   * mode: "product" | "seller"
   * - "product": تقييمات منتج معيّن (يحتاج productId)
   * - "seller":  كل تقييمات منتجات البائع (يحتاج sellerId)
   */
  mode = "product",
  /** sellerId — مطلوب فقط لو mode === "seller". يستدعي /api/review/seller/:id/product-reviews */
  sellerId,
  /** عنوان القسم (افتراضي: "تقييمات العملاء") */
  title = "تقييمات العملاء",
  subtitle = "آراء المشترين الذين استخدموا هذا المنتج",
  /** عدد الكروت قبل زر "عرض الكل" — null = عرض الكل */
  initialLimit = null,
  /** compact = بدون summary كبير، للدمج الضيق */
  compact = false,
  /**
   * inline = وضع انسيابي تحت المنتج مباشرة (بدون box / border / padding / background)
   *  - يلغي section wrapper الثقيل
   *  - يخفي الـ section-bg (التدرج البرتقالي)
   *  - يخفي الـ distribution summary
   *  - يخلي الكروت تتدفق بشكل طبيعي مع هوامش بسيطة
   *  مفيد لصفحة تفاصيل المنتج (CustomerProductDetails)
   */
  inline = false,
  /** تخطي الجلب — استخدم initialData */
  skipFetch = false,
  initialData = null,
  /** className إضافي للـ wrapper */
  className = "",
  /** عرض اسم المنتج داخل كل كرت (مفيد بصفحة المتجر لتجميع مراجعات كل المنتجات) */
  showProductTag = false,
  /** رابط المنتج لكل كرت (لو تبي يضغط على اسم المنتج يروح للمنتج) */
  onProductTagClick = null,
  /**
   * showHeader — لو false، ما بنعرض الـ header (title + stats) حتى يبقى بس الكروت.
   * مفيد لما يكون القسم مدمج بصفحة فيها summary خاص.
   */
  showHeader = true,
  /**
   * onCountLoaded — callback يُستدعى عند اكتمال الجلب، مع
   *   { total, average, distribution } حتى الـ parent يقدر يحدّث عدّاد (مثل badge).
   */
  onCountLoaded = null,
  /**
   * highlightReviewId — ID تقييم نحتاج نسلّط الضوء عليه (مثال: لما يفوت
   *   اليوزر من إشعار "رد على تقييمك").
   *   - لو التقييم موجود بالقائمة: بنعمل scroll + highlight animation + ننادي onHighlighted
   *   - لو مش ظاهر (بسبب initialLimit): بنفتح showAll تلقائياً وننتظر التحميل
   */
  highlightReviewId = null,
  /**
   * onHighlighted — callback يُستدعى لما التقييم المحدد يصير ظاهر فعلاً.
   *   الـ parent بيستخدمه ليشيل ?reviewId=xxx من URL أو يعمل أي cleanup.
   */
  onHighlighted = null,
}) {
  const [reviews, setReviews] = useState(() => extractList(initialData));
  const [meta, setMeta] = useState(() =>
    extractMeta(initialData, extractList(initialData).length)
  );
  const [loading, setLoading] = useState(!skipFetch);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  // ✅ ID التقييم اللي بنسلّط عليه الضوء (للأنيميشن)
  const [highlightedId, setHighlightedId] = useState(null);

  // الـ entity اللي بنجلب تقييماتها — يتغير حسب الـ mode
  const entityId = mode === "seller" ? sellerId : productId;
  // ✅ isValid واضح ومباشر: لازم يكون عندنا ID صالح حسب الـ mode
  const isValid =
    (mode === "seller" && Boolean(sellerId)) ||
    (mode === "product" && Boolean(productId));

  const fetchPage = useCallback(
    async (pageNum = 1) => {
      if (!isValid) {
        // ✅ log واضح: لو الـ sellerId أو productId ناقص
        if (typeof console !== "undefined") {
          console.warn(
            `[BuyerProductReviewsSection] ⚠️ Skipped fetch — mode="${mode}", sellerId=${sellerId}, productId=${productId}`
          );
        }
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const fetcher =
          mode === "seller"
            ? () => getSellerProductReviews(sellerId, pageNum)
            : () => getProductReviews(productId, pageNum);
        const data = await fetcher();
        const list = extractList(data);
        const m = extractMeta(data, list.length);

        // ✅ log للتشخيص: بنطبع الـ URL والـ response الأول
        if (typeof console !== "undefined" && !window.__bprs_load_logged) {
          window.__bprs_load_logged = true;
          const url = mode === "seller"
            ? `/api/review/seller/${sellerId}/product-reviews?page=${pageNum}&pageSize=10`
            : `/api/review/product/${productId}?page=${pageNum}&pageSize=10`;
          console.log(
            `%c[BuyerProductReviewsSection] ✅ Loaded ${list.length} reviews`,
            "color: #10b981; font-weight: bold;",
            { url, total: m.total, average: m.average, firstReview: list[0] || null }
          );
        }

        // ✅ debug log — مؤقت: نطبع شكل الـ review object عشان نعرف شو اسم حقل الرد
        if (list.length > 0 && typeof console !== "undefined" && !window.__bprs_review_keys_logged) {
          window.__bprs_review_keys_logged = true;
          console.groupCollapsed(
            "%c[BuyerProductReviewsSection] 🔍 Review object shape (first item)",
            "color: #2563eb; font-weight: bold;"
          );
          console.log("URL:", mode === "seller"
            ? `/api/review/seller/${sellerId}/product-reviews`
            : `/api/review/product/${productId}`);
          console.log("Keys:", Object.keys(list[0]));
          console.log("Sample review:", list[0]);
          if (list[0].seller || list[0].store) {
            console.log("Seller/Store object keys:", Object.keys(list[0].seller || list[0].store));
            console.log("Seller/Store object:", list[0].seller || list[0].store);
          }
          console.log("Reply-related fields found:", Object.keys(list[0]).filter(k =>
            k.toLowerCase().includes("reply") ||
            k.toLowerCase().includes("response") ||
            k.toLowerCase().includes("store")
          ));
          console.groupEnd();
        }

        setReviews(pageNum === 1 ? list : (prev) => [...prev, ...list]);
        setMeta(m);
        setPage(pageNum);
      } catch (err) {
        console.error("[BuyerProductReviewsSection] fetch error:", err);
        setError(
          err?.response?.data?.data?.message ||
            err?.response?.data?.message ||
            err?.message ||
            "فشل تحميل التقييمات"
        );
      } finally {
        setLoading(false);
      }
    },
    [isValid, mode, sellerId, productId]
  );

  useEffect(() => {
    if (skipFetch) return;
    if (!isValid) return;
    setReviews([]); // reset لما يتغيّر المنتج/البائع
    setPage(1);
    setShowAll(false);
    fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, mode]);

  // نُعلم الـ parent بعدد التقييمات لما تتحدّث (للـ tab badge مثلاً)
  useEffect(() => {
    if (!onCountLoaded) return;
    if (loading) return;
    onCountLoaded({
      total: meta.total,
      average: meta.average,
      distribution: meta.distribution,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.total, meta.average, loading, onCountLoaded]);

  // ✅ Highlight logic: لو وصلنا highlightReviewId من URL (?reviewId=xxx)
  //    وانتهى التحميل، نفعّل الـ highlight + scroll + onHighlighted callback
  useEffect(() => {
    if (!highlightReviewId) return;
    if (loading) return;
    if (reviews.length === 0) return;

    // 1) تأكد أن التقييم موجود فعلياً
    const exists = reviews.some(
      (r) => String(r.id) === String(highlightReviewId)
    );
    if (!exists) {
      // التقييم مش بالصفحة الحالية — ممكن يكون بالصفحات التالية
      if (meta.pagination?.hasNextPage) {
        // بنحاول نزيد الصفحة (بتحميل lazy)
        fetchPage(page + 1);
      }
      return;
    }

    // 2) التقييم موجود — بنفعّل الـ highlight
    setHighlightedId(highlightReviewId);
    setShowAll(true); // لو في limit، نفتحه

    // 3) نعطي DOM وقت يرسم الكروت، ثم scroll
    const t = setTimeout(() => {
      const el = document.getElementById(`review-${highlightReviewId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      // 4) ننادي الـ parent callback (الـ parent بيشيل الـ query param)
      if (typeof onHighlighted === "function") {
        onHighlighted();
      }
    }, 80);

    // 5) بعد 3 ثواني، نشيل الـ highlight (الأنيميشن بيلعب مرة واحدة)
    const tClear = setTimeout(() => {
      setHighlightedId(null);
    }, 3000);

    return () => {
      clearTimeout(t);
      clearTimeout(tClear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightReviewId, loading, reviews.length, meta.pagination?.hasNextPage]);

  /* ── derived ── */
  const visibleReviews = useMemo(() => {
    if (initialLimit == null) return reviews;
    return showAll ? reviews : reviews.slice(0, initialLimit);
  }, [reviews, initialLimit, showAll]);

  const hasMore =
    (initialLimit != null && reviews.length > initialLimit) ||
    Boolean(meta.pagination?.hasNextPage);

  // ✅ pagination props من الباك (لأزرار Prev/Next)
  const currentPage = Number(meta.pagination?.currentPage ?? page ?? 1);
  const totalPages = Number(meta.pagination?.totalPages ?? 1);
  const totalItems = Number(meta.pagination?.totalItems ?? meta.total ?? reviews.length);
  const hasPrevPage = Boolean(meta.pagination?.hasPreviousPage ?? currentPage > 1);
  const hasNextPage = Boolean(meta.pagination?.hasNextPage ?? currentPage < totalPages);
  const showPageNav = totalPages > 1;

  const showSummary = !compact;

  return (
    <section
      className={`bprs-section ${compact ? "bprs-compact" : ""} ${inline ? "bprs-inline" : ""} ${className}`}
      dir="rtl"
    >
      {!inline && <div className="bprs-section-bg" aria-hidden="true" />}

      {/* ─── Header (إخفاء لو showHeader=false) ─── */}
      {showHeader && (
        <header className="bprs-header">
          <div className="bprs-header-title">
            <div className="bprs-header-icon">
              <Star size={18} fill="currentColor" />
            </div>
            <div>
              <h3 className="bprs-title">{title}</h3>
              <p className="bprs-subtitle">{subtitle}</p>
            </div>
          </div>

          {!loading && meta.total > 0 && showSummary && (
            <div className="bprs-header-stats">
              <div className="bprs-header-average">
                {meta.average.toFixed(1)}
              </div>
              <StarRow value={meta.average} size={15} />
              <span className="bprs-header-total">({meta.total} تقييم)</span>
            </div>
          )}
        </header>
      )}

      {/* ─── Summary block (توزيع النجوم) — مخفي في وضع inline ─── */}
      {showSummary && !inline && !loading && meta.total > 0 && (
        <div className="bprs-summary">
          <DistributionBars
            distribution={meta.distribution}
            total={meta.total}
          />
        </div>
      )}

      {/* ─── Body ─── */}
      {loading ? (
        <div className="bprs-skeleton-list" aria-busy="true" aria-label="جاري تحميل التقييمات">
          {/* رسالة تحميل خفيفة فوق الـ skeleton — توضّح للمستخدم شو عم يصير */}
          <div className="bprs-skel-loading-text">
            <span className="bprs-skel-spinner" aria-hidden="true" />
            <span>جاري تحميل التقييمات…</span>
          </div>

          {/* Skeleton للـ header — يحاكي عنوان القسم + عدّاد التقييمات */}
          {showHeader && (
            <div className="bprs-skel-header">
              <div className="bprs-skel-header-icon" />
              <div className="bprs-skel-header-text">
                <div className="bprs-skel-line bprs-skel-line--title" />
                <div className="bprs-skel-line bprs-skel-line--sub" />
              </div>
              <div className="bprs-skel-header-stats">
                <div className="bprs-skel-line bprs-skel-line--stat" />
              </div>
            </div>
          )}

          {/* Skeleton للـ review cards — يحاكي شكل الكرت الحقيقي بشكل مضغوط */}
          <div className="bprs-skel-cards">
            {[0, 1, 2].map((i) => (
              <div
                className="bprs-skel-card"
                key={i}
                style={{ animationDelay: `${i * 0.12}s` }}
              >
                <div className="bprs-skel-avatar" />
                <div className="bprs-skel-body">
                  <div className="bprs-skel-row">
                    <div className="bprs-skel-line bprs-skel-line--name" />
                    <div className="bprs-skel-line bprs-skel-line--rating" />
                  </div>
                  <div className="bprs-skel-line bprs-skel-line--full" />
                  <div className="bprs-skel-line bprs-skel-line--full bprs-skel-line--short" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="bprs-error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            type="button"
            className="bprs-retry-btn"
            onClick={() => fetchPage(1)}
          >
            <RefreshCw size={13} />
            إعادة
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bprs-empty">
          <div className="bprs-empty-art">
            <Package size={28} />
          </div>
          <p>لا توجد تقييمات بعد</p>
          <span>عندما يقيّم المشترون هذا المنتج ستظهر تقييماتهم هنا</span>
        </div>
      ) : (
        <>
          <div className="bprs-grid">
            {visibleReviews.map((r, idx) => (
              <ReviewCard
                key={r.id ?? idx}
                review={r}
                index={idx}
                showProductTag={showProductTag}
                onProductTagClick={onProductTagClick}
                isHighlighted={highlightedId === String(r.id)}
              />
            ))}
          </div>

          {hasMore && (
            <div className="bprs-more-wrap">
              {/* ── "Load more" / "Show all" — فقط لما في initialLimit ── */}
              {initialLimit != null && reviews.length > initialLimit && !showAll && (
                <button
                  type="button"
                  className="bprs-more-btn"
                  onClick={() => setShowAll(true)}
                >
                  عرض الكل ({reviews.length})
                  <ChevronDown size={14} />
                </button>
              )}

              {initialLimit != null && showAll && (
                <button
                  type="button"
                  className="bprs-more-btn"
                  onClick={() => setShowAll(false)}
                >
                  عرض أقل
                  <ChevronDown
                    size={14}
                    style={{ transform: "rotate(180deg)", transition: "transform .2s" }}
                  />
                </button>
              )}

              {/* ── Prev/Next pagination (الطريقة الرئيسية للتنقل بين الصفحات) ──
                  ✅ أزرار بأيقونات فقط — touch target 40px+ على الموبايل */}
              {showPageNav && (
                <div className="bprs-pagination" role="navigation" aria-label="ترقيم صفحات التقييمات">
                  <button
                    type="button"
                    className="bprs-page-btn bprs-page-btn--prev"
                    onClick={() => fetchPage(currentPage - 1)}
                    disabled={!hasPrevPage || loading}
                    aria-label="الصفحة السابقة"
                    title="الصفحة السابقة"
                  >
                    <ChevronRight size={18} />
                  </button>

                  <span className="bprs-page-info" aria-live="polite">
                    صفحة <strong>{currentPage}</strong> من <strong>{totalPages}</strong>
                    <span className="bprs-page-total">({totalItems} تقييم)</span>
                  </span>

                  <button
                    type="button"
                    className="bprs-page-btn bprs-page-btn--next"
                    onClick={() => fetchPage(currentPage + 1)}
                    disabled={!hasNextPage || loading}
                    aria-label="الصفحة التالية"
                    title="الصفحة التالية"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
