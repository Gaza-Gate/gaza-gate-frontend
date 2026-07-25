import { useState, useEffect } from "react";
import "./ProductDetailsModal.css";
import { getProductReviews } from "../services/productService";

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

// نجمة واحدة، ممتلئة أو فاضية حسب القيمة
const StarIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill={filled ? "#f97316" : "none"} stroke="#f97316" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.63 22 9.24 17 14.14 18.18 21 12 17.77 5.82 21 7 14.14 2 9.24 8.91 8.63 12 2" />
  </svg>
);

// صف 5 نجوم يعكس رقم عشري (4.8 مثلاً) بتقريب لأقرب نجمة
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

// بار أفقي لعدد التقييمات لكل نجمة (5 نجوم فوق، 1 نجمة تحت)
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

// تنسيق التاريخ لشكل عربي مقروء (مثال: 18 يوليو 2026)
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

// عنصر ريفيو واحد كامل - بكل الحقول الموجودة بالـ API
const ReviewItem = ({ review }) => {
  const fullName = review.customer
    ? `${review.customer.firstName ?? ""} ${review.customer.lastName ?? ""}`.trim()
    : "مستخدم";

  return (
    <div className="pdm-review-item">
      <div className="pdm-review-head">
        {review.customer?.avatar ? (
          <img
            src={review.customer.avatar}
            alt={fullName}
            className="pdm-review-avatar"
          />
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
        <img
          src={review.imageUrl}
          alt="صورة مرفقة مع التقييم"
          className="pdm-review-image"
        />
      )}
    </div>
  );
};

export default function ProductDetailsModal({ open, product, onClose }) {
  const [reviewsData, setReviewsData] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [showAllReviews, setShowAllReviews] = useState(false);

  const productId = product?._id ?? product?.id;

  useEffect(() => {
    if (!open || !productId) return;

    // إعادة الضبط كل ما يتفتح المودال لمنتج جديد
    setReviewsData(null);
    setReviewsError("");
    setShowAllReviews(false);

    const loadReviews = async () => {
      setReviewsLoading(true);
      try {
        const res = await getProductReviews(productId);
        setReviewsData(res?.data ?? null);
      } catch (err) {
        setReviewsError("تعذر تحميل التقييمات");
      } finally {
        setReviewsLoading(false);
      }
    };

    loadReviews();
  }, [open, productId]);

  if (!open || !product) return null;

  const image = product.images?.[0]?.imageUrl;

  // آخر 3 ريفيو دايماً ظاهرين، والباقي بيظهر لما يدوس "عرض المزيد"
  const latestThree = reviewsData?.reviews?.slice(0, 3);
  const restReviews = reviewsData?.reviews?.slice(3);
  const hasMore = (reviewsData?.reviews?.length ?? 0) > 3;

  return (
    <div className="pdm-overlay" onClick={onClose}>
      <div className="pdm-card" onClick={(e) => e.stopPropagation()} dir="rtl">
        <button className="pdm-close" onClick={onClose} aria-label="إغلاق">
          <CloseIcon />
        </button>

        <div className="pdm-main">
          {/* العمود الأيمن: صورة المنتج */}
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

          {/* العمود الأيسر: التفاصيل + التقييمات */}
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

              {product.category && (
                <p className="pdm-meta">
                  <span className="pdm-meta-label">الفئة:</span> {product.category}
                </p>
              )}
            </div>

            {/* قسم التقييمات */}
            <div className="pdm-reviews">
              {reviewsLoading && (
                <p className="pdm-reviews-status">جارِ تحميل التقييمات...</p>
              )}

              {reviewsError && (
                <p className="pdm-reviews-status pdm-reviews-error">{reviewsError}</p>
              )}

              {!reviewsLoading && !reviewsError && reviewsData && (
                <>
                  <div className="pdm-reviews-top">
                    <div className="pdm-reviews-summary">
                      <span className="pdm-reviews-avg">{reviewsData.averageRating}</span>
                      <StarRow rating={Number(reviewsData.averageRating) || 0} />
                      <span className="pdm-reviews-total">({reviewsData.totalReviews} تقييم)</span>
                    </div>

                    {reviewsData.totalReviews > 0 && (
                      <DistributionBars
                        distribution={reviewsData.distribution}
                        total={reviewsData.totalReviews}
                      />
                    )}
                  </div>

                  {reviewsData.totalReviews === 0 ? (
                    <p className="pdm-reviews-empty">لا توجد تقييمات لهذا المنتج بعد</p>
                  ) : (
                    <>
                      <div className="pdm-reviews-list">
                        {latestThree?.map((rev) => (
                          <ReviewItem key={rev.id} review={rev} />
                        ))}
                      </div>

                      {/* الريفيوهات الإضافية - بتظهر جوا صندوق فيه سكرول لما يدوس عرض المزيد */}
                      {showAllReviews && restReviews?.length > 0 && (
                        <div className="pdm-reviews-list pdm-reviews-scroll">
                          {restReviews.map((rev) => (
                            <ReviewItem key={rev.id} review={rev} />
                          ))}
                        </div>
                      )}

                      {hasMore && !showAllReviews && (
                        <button
                          className="pdm-reviews-more"
                          onClick={() => setShowAllReviews(true)}
                        >
                          عرض المزيد
                        </button>
                      )}

                      {/* معلومة الصفحات - مفيدة لو صار فيه أكتر من صفحة تقييمات مستقبلاً */}
                      {reviewsData.pagination?.totalPages > 1 && (
                        <p className="pdm-reviews-pagination-note">
                          صفحة {reviewsData.pagination.currentPage} من {reviewsData.pagination.totalPages}
                        </p>
                      )}
                    </>
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