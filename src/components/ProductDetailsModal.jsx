 import { useState, useEffect } from "react";
import "./ProductDetailsModal.css";
import { getSellerProductDetails, getProductReviews } from "../services/productService";
import api from "../utils/api";

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

const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const ReplyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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

const ReviewItem = ({
  review,
  openReplyId,
  replyDraft,
  replyLoading,
  onOpenReply,
  onEditReply,
  onSubmitReply,
  onCancelReply,
  onChangeDraft,
}) => {
  const fullName = review.customer
    ? `${review.customer.firstName ?? ""} ${review.customer.lastName ?? ""}`.trim()
    : "مستخدم";

  const reviewId = review.id ?? review._id;
  const isReplying = openReplyId === reviewId;

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

      {review.sellerReply && !isReplying && (
        <div className="pdm-reply-box">
          <div className="pdm-reply-header">
            <button
              type="button"
              className="pdm-edit-reply"
              onClick={() => onEditReply(review)}
            >
              <EditIcon /> تعديل الرد
            </button>
            <span>رد البائع:</span>
          </div>
          <p className="pdm-reply-text">{review.sellerReply}</p>
        </div>
      )}

      {isReplying ? (
        <div className="pdm-reply-form">
          <textarea
            className="pdm-reply-textarea"
            value={replyDraft}
            onChange={(e) => onChangeDraft(e.target.value)}
            placeholder="اكتب ردك هنا..."
            rows={3}
          />
          <div className="pdm-reply-form-actions">
            <button
              type="button"
              className="pdm-btn-submit-reply"
              onClick={() => onSubmitReply(reviewId)}
              disabled={replyLoading}
            >
              {replyLoading ? "جاري الإرسال…" : "إرسال الرد"}
            </button>
            <button
              type="button"
              className="pdm-btn-cancel-reply"
              onClick={onCancelReply}
              disabled={replyLoading}
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        !review.sellerReply && (
          <button
            type="button"
            className="pdm-btn-reply"
            onClick={() => onOpenReply(reviewId)}
          >
            <ReplyIcon /> رد على التقييم
          </button>
        )
      )}
    </div>
  );
};

// المودال بياخد productId بس. تفاصيل المنتج (اسم/سعر/صورة) من getSellerProductDetails،
// أما التقييمات (كلها، مش preview) فمن getProductReviews دايماً — لأنه هاد الـ endpoint
// هو المؤكد إنه بيرجع sellerReply بشكل موثوق. الاعتماد على الـ preview الجاي مع تفاصيل
// المنتج كان بيسبب اختفاء الرد بعد إغلاق/فتح المودال أو الـ refresh، لأنه الـ endpoint هذا
// (product/:id) ما تأكدنا لسا إنه فعلاً برجع sellerReply بشكل موثوق من الباك اند.
export default function ProductDetailsModal({ open, productId, onClose }) {
  const [product, setProduct] = useState(null);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState("");

  const [reviewsData, setReviewsData] = useState(null); // { averageRating, totalReviews, distribution, reviews, pagination }
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  const [openReplyId, setOpenReplyId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState("");

  useEffect(() => {
    if (!open || !productId) return;

    setProduct(null);
    setProductError("");
    setReviewsData(null);
    setReviewsError("");
    setOpenReplyId(null);
    setReplyDraft("");
    setReplyError("");

    const loadProduct = async () => {
      setProductLoading(true);
      try {
        const res = await getSellerProductDetails(productId);
        setProduct(res?.data?.product ?? null);
      } catch (err) {
        setProductError("تعذر تحميل تفاصيل المنتج");
      } finally {
        setProductLoading(false);
      }
    };

    const loadReviews = async () => {
      setReviewsLoading(true);
      try {
        const res = await getProductReviews(productId, 1);
        setReviewsData(res?.data ?? null);
      } catch (err) {
        setReviewsError("تعذر تحميل التقييمات");
      } finally {
        setReviewsLoading(false);
      }
    };

    loadProduct();
    loadReviews();
  }, [open, productId]);

  // تحميل صفحة تقييمات إضافية (لو فيه أكتر من صفحة) وإضافتها للقائمة الحالية
  const handleLoadMoreReviews = async () => {
    if (loadingMore || !reviewsData?.pagination?.hasNextPage) return;
    setLoadingMore(true);
    try {
      const nextPage = (reviewsData.pagination.currentPage ?? 1) + 1;
      const res = await getProductReviews(productId, nextPage);
      const newData = res?.data;
      if (newData) {
        setReviewsData((prev) => ({
          ...newData,
          reviews: [...(prev?.reviews ?? []), ...(newData.reviews ?? [])],
        }));
      }
    } catch (err) {
      setReviewsError("تعذر تحميل باقي التقييمات");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleOpenReply = (reviewId) => {
    setOpenReplyId(reviewId);
    setReplyDraft("");
    setReplyError("");
  };

  const handleEditReply = (review) => {
    const reviewId = review.id ?? review._id;
    setOpenReplyId(reviewId);
    setReplyDraft(review.sellerReply ?? "");
    setReplyError("");
  };

  const handleCancelReply = () => {
    setOpenReplyId(null);
    setReplyDraft("");
    setReplyError("");
  };

  const handleSubmitReply = async (reviewId) => {
    if (!replyDraft.trim()) return;

    setReplyLoading(true);
    setReplyError("");
    try {
      await api.post(`/api/seller/review/${reviewId}/reply`, {
        reply: replyDraft.trim(),
      });
      // تحديث محلي فوري + الداتا أصلاً محفوظة بالسيرفر (أكدنا هيك بالـ Network)
      // فأي refetch لاحق (فتح/إغلاق المودال، refresh) رح يجيبها صح من getProductReviews
      setReviewsData((prev) => {
        if (!prev?.reviews) return prev;
        return {
          ...prev,
          reviews: prev.reviews.map((r) =>
            (r.id ?? r._id) === reviewId ? { ...r, sellerReply: replyDraft.trim() } : r
          ),
        };
      });
      setOpenReplyId(null);
      setReplyDraft("");
    } catch (err) {
      console.error("فشل الرد على التقييم:", err);
      setReplyError(
        err?.response?.data?.data?.message || "فشل إرسال الرد. حاول مرة أخرى."
      );
    } finally {
      setReplyLoading(false);
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

  const total = Number(reviewsData?.totalReviews ?? 0);
  const average = reviewsData?.averageRating ?? "0.00";
  const reviewsList = reviewsData?.reviews ?? [];
  const hasMore = !!reviewsData?.pagination?.hasNextPage;

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

              {product.category?.name && (
                <p className="pdm-meta">
                  <span className="pdm-meta-label">الفئة:</span> {product.category.name}
                </p>
              )}
            </div>

            <div className="pdm-reviews">
              {reviewsLoading && !reviewsData ? (
                <p className="pdm-reviews-status">جارِ تحميل التقييمات...</p>
              ) : reviewsError && !reviewsData ? (
                <p className="pdm-reviews-status pdm-reviews-error">{reviewsError}</p>
              ) : (
                <>
                  <div className="pdm-reviews-top">
                    <div className="pdm-reviews-summary">
                      <span className="pdm-reviews-avg">{average}</span>
                      <StarRow rating={Number(average) || 0} />
                      <span className="pdm-reviews-total">({total} تقييم)</span>
                    </div>

                    {reviewsData?.distribution && total > 0 && (
                      <DistributionBars distribution={reviewsData.distribution} total={total} />
                    )}
                  </div>

                  {replyError && (
                    <div className="pdm-reviews-status pdm-reviews-error">{replyError}</div>
                  )}

                  {total === 0 ? (
                    <p className="pdm-reviews-empty">لا توجد تقييمات لهذا المنتج بعد</p>
                  ) : (
                    <>
                      <div className="pdm-reviews-list">
                        {reviewsList.map((rev) => (
                          <ReviewItem
                            key={rev.id ?? rev._id}
                            review={rev}
                            openReplyId={openReplyId}
                            replyDraft={replyDraft}
                            replyLoading={replyLoading}
                            onOpenReply={handleOpenReply}
                            onEditReply={handleEditReply}
                            onSubmitReply={handleSubmitReply}
                            onCancelReply={handleCancelReply}
                            onChangeDraft={setReplyDraft}
                          />
                        ))}
                      </div>

                      {loadingMore && (
                        <p className="pdm-reviews-status">جارِ تحميل باقي التقييمات...</p>
                      )}

                      {hasMore && !loadingMore && (
                        <button className="pdm-reviews-more" onClick={handleLoadMoreReviews}>
                          عرض المزيد
                        </button>
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