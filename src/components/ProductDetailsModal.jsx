import { useState, useEffect } from "react";
import "./ProductDetailsModal.css";
import { getSellerProductDetails, getProductReviews } from "../services/productService";

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PackageEmptyIcon = () => (
  <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#d1d5db" strokeWidth="1.5">
    <path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const StarIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill={filled ? "#f97316" : "none"} stroke="#f97316" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.63 22 9.24 17 14.14 18.18 21 12 17.77 5.82 21 7 14.14 2 9.24 8.91 8.63 12 2" />
  </svg>
);

const StarRow = ({ rating }) => {
  const rounded = Math.round(rating);
  return (
    <div className="pdm-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={n <= rounded} />
      ))}
    </div>
  );
};

// بار التوزيع - بيشتغل بس لما يكون عنا distribution (من getProductReviews الكاملة)
const DistributionBars = ({ distribution, total }) => {
  const rows = [5, 4, 3, 2, 1];
  return (
    <div className="pdm-distribution">
      {rows.map((star) => {
        const count = distribution?.[star] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div className="pdm-dist-row" key={star}>
            <span className="pdm-dist-label">{star} ⭐</span>
            <div className="pdm-dist-track">
              <div className="pdm-dist-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="pdm-dist-count">{count}</span>
          </div>
        );
      })}
    </div>
  );
};

const formatReviewDate = (isoDate) => {
  if (!isoDate) return "";
  try {
    return new Date(isoDate).toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const ReviewItem = ({ review }) => {
  const fullName = review.customer
    ? `${review.customer.firstName ?? ""} ${review.customer.lastName ?? ""}`.trim()
    : "مستخدم";

  return (
    <div className="pdm-review-item">
      <div className="pdm-review-head">
        {review.customer?.avatar ? (
          <img src={review.customer.avatar} alt={fullName} className="pdm-review-avatar" />
        ) : (
          <div className="pdm-review-avatar pdm-review-avatar-empty" />
        )}

        <div className="pdm-review-head-text">
          <span className="pdm-review-author">{fullName || "مستخدم"}</span>
          <div className="pdm-review-head-sub">
            <StarRow rating={review.rating ?? 0} />
            {review.createdAt && (
              <span className="pdm-review-date">{formatReviewDate(review.createdAt)}</span>
            )}
          </div>
        </div>
      </div>

      {review.comment && <p className="pdm-review-comment">{review.comment}</p>}

      {review.imageUrl && (
        <img src={review.imageUrl} alt="صورة مرفقة مع التقييم" className="pdm-review-image" />
      )}
    </div>
  );
};

// المودال دلوقتي بياخد productId بس، وبيجيب كل شي بنفسه لما يفتح
export default function ProductDetailsModal({ open, productId, onClose }) {
  const [product, setProduct] = useState(null);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState("");

  // ملخص التقييمات + أول preview - جايين مع نفس طلب تفاصيل المنتج
  const [reviewsSummary, setReviewsSummary] = useState(null); // { average, total, preview }

  // القائمة الكاملة (مع التوزيع والصفحات) - بتتجاب بس لما يدوس "عرض المزيد"
  const [fullReviews, setFullReviews] = useState(null);
  const [fullReviewsLoading, setFullReviewsLoading] = useState(false);
  const [fullReviewsError, setFullReviewsError] = useState("");
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    if (!open || !productId) return;

    // إعادة الضبط كل ما يتفتح المودال لمنتج جديد
    setProduct(null);
    setProductError("");
    setReviewsSummary(null);
    setFullReviews(null);
    setFullReviewsError("");
    setShowAllReviews(false);

    const loadProductDetails = async () => {
      setProductLoading(true);
      try {
        const res = await getSellerProductDetails(productId);
        setProduct(res?.data?.product ?? null);
        setReviewsSummary(res?.data?.reviews ?? null);
      } catch (err) {
        setProductError("تعذر تحميل تفاصيل المنتج");
      } finally {
        setProductLoading(false);
      }
    };

    loadProductDetails();
  }, [open, productId]);

  // لما يدوس "عرض المزيد" - نجيب القائمة الكاملة (فيها كل الريفيوهات + التوزيع)
  const handleShowMore = async () => {
    setShowAllReviews(true);
    if (fullReviews) return; // مجلوبة قبل هيك، ما تعيد الطلب

    setFullReviewsLoading(true);
    try {
      const res = await getProductReviews(productId);
      setFullReviews(res?.data ?? null);
    } catch (err) {
      setFullReviewsError("تعذر تحميل باقي التقييمات");
    } finally {
      setFullReviewsLoading(false);
    }
  };

  if (!open) return null;

  if (productLoading) {
    return (
      <div className="pdm-overlay" onClick={onClose}>
        <div className="pdm-card pdm-card-loading" onClick={(e) => e.stopPropagation()} dir="rtl">
          <p>جارِ تحميل تفاصيل المنتج...</p>
        </div>
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="pdm-overlay" onClick={onClose}>
        <div className="pdm-card pdm-card-loading" onClick={(e) => e.stopPropagation()} dir="rtl">
          <button className="pdm-close" onClick={onClose} aria-label="إغلاق">
            <CloseIcon />
          </button>
          <p>{productError || "لم يتم العثور على المنتج"}</p>
        </div>
      </div>
    );
  }

  const image = product.images?.[0]?.imageUrl;

  const total = Number(reviewsSummary?.total ?? 0);
  const average = reviewsSummary?.average ?? "0.00";
  const previewList = reviewsSummary?.preview ?? [];

  // لو المستخدم لسه ما دوس "عرض المزيد" منعرض الـ preview بس
  // ولو دوس، منعرض القائمة الكاملة من fullReviews لو وصلت
  const displayedReviews = showAllReviews && fullReviews ? fullReviews.reviews ?? [] : previewList;
  const hasMore = total > previewList.length;

  return (
    <div className="pdm-overlay" onClick={onClose}>
      <div className="pdm-card" onClick={(e) => e.stopPropagation()} dir="rtl">
        <button className="pdm-close" onClick={onClose} aria-label="إغلاق">
          <CloseIcon />
        </button>

        <div className="pdm-main">
          <div className="pdm-img-wrap">
            {image ? (
              <img src={image} alt={product.name} className="pdm-img" />
            ) : (
              <div className="pdm-img-empty">
                <PackageEmptyIcon />
              </div>
            )}
            <span className={`pdm-badge ${product.status === "active" ? "active" : "hidden"}`}>
              {product.status === "active" ? "ظاهر" : "مخفي"}
            </span>
          </div>

          <div className="pdm-side">
            <div className="pdm-body">
              <h2 className="pdm-title">{product.name}</h2>
              <p className="pdm-price">{product.price} ₪</p>

              <p className="pdm-stock">
                {product.stockType === "unlimited"
                  ? "مخزون غير محدود"
                  : `الكمية المتوفرة: ${product.quantity ?? 0}`}
              </p>

              {product.description && (
                <p className="pdm-description">{product.description}</p>
              )}

              {/* category صار object فيه id و name */}
              {product.category?.name && (
                <p className="pdm-meta">
                  <span className="pdm-meta-label">الفئة:</span> {product.category.name}
                </p>
              )}
            </div>

            <div className="pdm-reviews">
              <div className="pdm-reviews-top">
                <div className="pdm-reviews-summary">
                  <span className="pdm-reviews-avg">{average}</span>
                  <StarRow rating={Number(average) || 0} />
                  <span className="pdm-reviews-total">({total} تقييم)</span>
                </div>

                {/* التوزيع بيظهر بس لما تتوفر بيانات fullReviews الكاملة */}
                {showAllReviews && fullReviews?.distribution && total > 0 && (
                  <DistributionBars distribution={fullReviews.distribution} total={total} />
                )}
              </div>

              {total === 0 ? (
                <p className="pdm-reviews-empty">لا توجد تقييمات لهذا المنتج بعد</p>
              ) : (
                <>
                  <div className="pdm-reviews-list">
                    {displayedReviews.map((rev) => (
                      <ReviewItem key={rev.id} review={rev} />
                    ))}
                  </div>

                  {fullReviewsLoading && (
                    <p className="pdm-reviews-status">جارِ تحميل باقي التقييمات...</p>
                  )}

                  {fullReviewsError && (
                    <p className="pdm-reviews-status pdm-reviews-error">{fullReviewsError}</p>
                  )}

                  {hasMore && !showAllReviews && (
                    <button className="pdm-reviews-more" onClick={handleShowMore}>
                      عرض المزيد
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}