import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Award,
  Star,
  Store as StoreIcon,
  Package,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

import { getReviewsFromSellers } from "../services/reviewService";
import { avatarColor, fullName } from "../utils/chatHelpers";
import "./SellerRatingsSection.css";

/* ── Helpers ─────────────────────────────────────────────── */
function Stars({ value, size = 14, color = "#f59e0b" }) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <span className="srs-stars" style={{ fontSize: size }}>
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

/* ── Single Review Card (stagger fade-in) ─────────────────── */
function ReviewCard({ review, index = 0, onSellerClick }) {
  const navigate = useNavigate();
  const seller = review.seller || {};
  const order = review.order || {};
  const sellerName = fullName(seller, "بائع");

  return (
    <article
      className="srs-rating-card"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="srs-rating-card-bg" />

      <button
        type="button"
        className="srs-rating-seller"
        onClick={() => {
          if (seller?.id) {
            if (onSellerClick) onSellerClick(seller);
            else navigate(`/customer/store/${seller.id}`);
          }
        }}
        title={seller?.id ? `صفحة ${sellerName}` : undefined}
      >
        <div
          className="srs-rating-avatar"
          style={{ backgroundColor: avatarColor(sellerName) }}
        >
          {seller?.avatar ? (
            <img src={seller.avatar} alt={sellerName} />
          ) : (
            <StoreIcon size={16} />
          )}
        </div>
        <div className="srs-rating-seller-meta">
          <span className="srs-rating-seller-name">{sellerName}</span>
          {order?.orderNumber && (
            <span className="srs-rating-order">طلب #{order.orderNumber}</span>
          )}
        </div>
        <div className="srs-rating-stars-wrap">
          <Stars value={review.rating} size={14} />
        </div>
      </button>

      {review.comment && (
        <p className="srs-rating-comment">{review.comment}</p>
      )}

      <div className="srs-rating-footer">
        <span className="srs-rating-time">
          <Sparkles size={11} />
          {timeAgo(review.createdAt)}
        </span>
        <span className="srs-rating-rating">
          {Number(review.rating).toFixed(1)} / 5
        </span>
      </div>
    </article>
  );
}

/* ── Main Component ───────────────────────────────────────── */
export default function SellerRatingsSection({
  /** فلتر اختياري — لو بدك تعرض تقييمات بائع معيّن فقط */
  sellerId = null,
  /** عنوان القسم (افتراضي: "تقييمات البائعين عليك") */
  title = "تقييمات البائعين عليك",
  subtitle = "آراء البائعين الذين تعاملت معهم",
  /** عدد الكروت المعروضة قبل زر "عرض الكل" */
  initialLimit = 3,
  /** عرض compact (للمساحات الصغيرة) */
  compact = false,
  /** تخطي جلب البيانات (لو بدك تمررها جاهزة) */
  skipFetch = false,
  initialData = null,
  /** callback عند الضغط على البائع */
  onSellerClick = null,
  /** custom className للـ wrapper */
  className = "",
}) {
  const [reviews, setReviews] = useState(initialData?.reviews ?? []);
  const [meta, setMeta] = useState({
    averageRating: initialData?.averageRating ?? 0,
    totalReviews: initialData?.totalReviews ?? 0,
  });
  const [pagination, setPagination] = useState(
    initialData?.pagination ?? { hasNextPage: false }
  );
  const [loading, setLoading] = useState(!skipFetch);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const fetchPage = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError(null);
        const data = await getReviewsFromSellers({ page, pageSize: 20 });
        const list = data?.reviews ?? [];
        const filtered = sellerId
          ? list.filter((r) => r?.seller?.id === sellerId)
          : list;
        setReviews(page === 1 ? filtered : (prev) => [...prev, ...filtered]);
        setMeta({
          averageRating: Number(data?.averageRating ?? 0),
          totalReviews: Number(data?.totalReviews ?? 0),
        });
        setPagination(data?.pagination ?? { hasNextPage: false });
      } catch (err) {
        console.error("[SellerRatingsSection] fetch error:", err);
        setError(err?.response?.data?.data?.message || err.message || "فشل التحميل");
      } finally {
        setLoading(false);
      }
    },
    [sellerId]
  );

  useEffect(() => {
    if (skipFetch) return;
    fetchPage(1);
  }, [fetchPage, skipFetch]);

  const visibleReviews = showAll ? reviews : reviews.slice(0, initialLimit);

  return (
    <section className={`srs-section ${compact ? "srs-compact" : ""} ${className}`} dir="rtl">
      {/* Decorative background */}
      <div className="srs-section-bg" />

      {/* Header */}
      <header className="srs-header">
        <div className="srs-header-title">
          <div className="srs-header-icon">
            <Award size={18} />
          </div>
          <div>
            <h3 className="srs-title">{title}</h3>
            <p className="srs-subtitle">{subtitle}</p>
          </div>
        </div>

        {!loading && meta.totalReviews > 0 && (
          <div className="srs-header-stats">
            <div className="srs-header-average">
              {Number(meta.averageRating || 0).toFixed(1)}
            </div>
            <Stars value={meta.averageRating} size={14} />
            <span className="srs-header-total">
              ({meta.totalReviews} تقييم)
            </span>
          </div>
        )}
      </header>

      {/* Body */}
      {loading ? (
        <div className="srs-skeleton-list">
          {[1, 2, 3].map((i) => (
            <div className="srs-skel-card" key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="srs-error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            type="button"
            className="srs-retry-btn"
            onClick={() => fetchPage(1)}
          >
            <RefreshCw size={13} />
            إعادة
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="srs-empty">
          <div className="srs-empty-art">
            <Package size={28} />
          </div>
          <p>لا توجد تقييمات من البائعين بعد</p>
          <span>عندما يقيّمك البائعون بعد إتمام الطلب ستظهر تقييماتهم هنا</span>
        </div>
      ) : (
        <>
          <div className="srs-grid">
            {visibleReviews.map((r, idx) => (
              <ReviewCard
                key={r.id ?? idx}
                review={r}
                index={idx}
                onSellerClick={onSellerClick}
              />
            ))}
          </div>

          {(reviews.length > initialLimit || pagination.hasNextPage) && (
            <div className="srs-more-wrap">
              <button
                type="button"
                className="srs-more-btn"
                onClick={() => {
                  if (showAll) {
                    setShowAll(false);
                  } else if (reviews.length > initialLimit) {
                    setShowAll(true);
                  } else if (pagination.hasNextPage) {
                    fetchPage((pagination.currentPage ?? 1) + 1);
                  }
                }}
              >
                {showAll
                  ? "عرض أقل"
                  : pagination.hasNextPage
                  ? `تحميل المزيد (${meta.totalReviews - reviews.length}+)`
                  : `عرض الكل (${reviews.length})`}
                <ChevronDown
                  size={14}
                  style={{
                    transform: showAll ? "rotate(180deg)" : "none",
                    transition: "transform .2s",
                  }}
                />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
