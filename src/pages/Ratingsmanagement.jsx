import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./RatingsManagement.css";
import api from "../utils/api";
import SellerNavbar from "../components/SellerNavbar";

// ══════════════════════════════════════════════════
//  ⚙️  أسماء الحقول — عدّليها حسب ما يرجع من الباك اند
// ══════════════════════════════════════════════════
// الـ response الحقيقي:
// {
//   status: "success",
//   data: {
//     averageRating: "0.00",
//     totalReviews: 0,
//     distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
//     reviews: [
//       {
//         _id / id: "...",
//         customerName: "أحمد محمد",
//         createdAt: "2026-06-08T...",
//         rating: 5,
//         comment: "...",
//         sellerReply: { text: "...", createdAt: "..." } | null
//       }
//     ],
//     pagination: { totalItems: 0, totalPages: 0, currentPage: 1 }
//   }
// }

const IS_API_READY = !!import.meta.env.VITE_API_URL;

// ── Icons ──
const StarIcon = ({ filled }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "#f97316" : "none"} stroke="#f97316" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const FunnelIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
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

function StarsDisplay({ rating }) {
  return (
    <span className="rm-stars-display">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={n <= rating} />
      ))}
    </span>
  );
}

const AVATAR_COLORS = ["#f97316", "#16a34a", "#2563eb", "#9333ea", "#e11d48"];

// ── Static fallback ──
const STATIC_REVIEWS = [
  {
    _id: "1",
    customerName: "أحمد محمد",
    createdAt: "2026-06-08",
    rating: 5,
    comment: "منتج ممتاز جداً، الجودة عالية والتوصيل سريع.",
    sellerReply: { text: "شكراً لتقييمك الرائع!", createdAt: "2026-06-09" },
  },
  {
    _id: "2",
    customerName: "فاطمة علي",
    createdAt: "2026-06-05",
    rating: 4,
    comment: "جودة المنتج جيدة جداً لكن وقت التوصيل كان أطول من المتوقع.",
    sellerReply: null,
  },
  {
    _id: "3",
    customerName: "محمود حسن",
    createdAt: "2026-06-03",
    rating: 5,
    comment: "منتج رائع ويستحق التقييم بـ5 نجوم.",
    sellerReply: null,
  },
  {
    _id: "4",
    customerName: "سارة خالد",
    createdAt: "2026-05-31",
    rating: 2,
    comment: "لم يكن المنتج كما توقعت، وصل متأخراً.",
    sellerReply: null,
  },
];

// ── API Helpers ──
const fetchReviews = async () => {
  const res = await api.get("/api/seller/review");
  // الـ API بيرجع: { status, data: { reviews: [...], averageRating, totalReviews, ... } }
  const payload = res.data?.data ?? res.data ?? {};
  const list = Array.isArray(payload?.reviews)
    ? payload.reviews
    : Array.isArray(payload)
    ? payload
    : [];

  // اسم العميل موجود جوا customer.user.firstName / lastName مش مباشرة customerName
  return list.map((r) => {
    const firstName = r.customer?.user?.firstName ?? "";
    const lastName = r.customer?.user?.lastName ?? "";
    const fullName = `${firstName} ${lastName}`.trim();
    return {
      ...r,
      customerName: r.customerName ?? (fullName || "عميل"),
    };
  });
};

const RatingsManagement = () => {
  const [reviews, setReviews]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortOrder, setSortOrder]     = useState("newest");
  const [sortOpen, setSortOpen]       = useState(false);
  const [openReplyId, setOpenReplyId] = useState(null);
  const [replyDraft, setReplyDraft]   = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  const sortRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (IS_API_READY) {
        const data = await fetchReviews();
        // حماية إضافية: لو رجع أي شكل غير متوقع، لا تكسري الصفحة - استخدمي array فاضية
        setReviews(Array.isArray(data) ? data : []);
      } else {
        setReviews(STATIC_REVIEWS);
      }
    } catch (err) {
      console.error("فشل جلب التقييمات:", err);
      setError("تعذّر تحميل التقييمات.");
      setReviews(STATIC_REVIEWS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  // ── حسابات الملخص ──
  const totalReviews  = reviews.length;
  const averageRating = totalReviews
    ? reviews.reduce((sum, r) => sum + Number(r.rating ?? 0), 0) / totalReviews
    : 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Number(r.rating) === star).length,
  }));
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  // ── فلترة وفرز ──
  const visibleReviews = reviews
    .filter((r) => activeFilter === "all" || Number(r.rating) === activeFilter)
    .sort((a, b) =>
      sortOrder === "newest"
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : new Date(a.createdAt) - new Date(b.createdAt)
    );

  // ── الرد على التقييم ──
  const handleOpenReply = (id) => { setOpenReplyId(id); setReplyDraft(""); };
  const handleEditReply = (review) => { setOpenReplyId(review._id ?? review.id); setReplyDraft(review.sellerReply.text); };

  const handleSubmitReply = async (id) => {
    if (!replyDraft.trim()) return;
    setReplyLoading(true);
    try {
      if (IS_API_READY) {
        // عدّلي المسار والـ body حسب ما يحدده الباك اند
        await api.post(`/api/seller/review/${id}/reply`, { text: replyDraft.trim() });
      }
      setReviews((prev) =>
        prev.map((r) =>
          (r._id ?? r.id) === id
            ? { ...r, sellerReply: { text: replyDraft.trim(), createdAt: new Date().toISOString() } }
            : r
        )
      );
      setOpenReplyId(null);
      setReplyDraft("");
    } catch (err) {
      console.error("فشل إرسال الرد:", err);
    } finally {
      setReplyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rm-root" dir="rtl">
        <SellerNavbar />
        <main className="rm-main">
          <div className="rm-state-center">
            <div className="od-spinner" />
            <p>جاري تحميل التقييمات…</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="rm-root" dir="rtl">
      <SellerNavbar />
      <main className="rm-main">

        <div className="rm-header">
          <h1 className="rm-page-title">إدارة التقييمات</h1>
          <p className="rm-page-subtitle">إدارة وعرض تقييمات الزبائن على متجرك</p>
        </div>

        {error && <div className="od-error-inline">{error}</div>}

        {/* Summary card */}
        <div className="rm-summary-card">
          <div className="rm-distribution">
            {distribution.map((d) => (
              <div className="rm-dist-row" key={d.star}>
                <span className="rm-dist-star">{d.star} <StarIcon filled /></span>
                <div className="rm-dist-bar-track">
                  <div className="rm-dist-bar-fill" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                </div>
                <span className="rm-dist-count">{d.count}</span>
              </div>
            ))}
          </div>
          <div className="rm-average">
            <span className="rm-average-value">{averageRating.toFixed(1)}</span>
            <StarsDisplay rating={Math.round(averageRating)} />
            <span className="rm-average-sub">{totalReviews} تقييمات</span>
          </div>
        </div>

        {/* Filter row */}
        <div className="rm-filter-row">
          <div className="rm-stars-filter">
            <button className={`rm-filter-btn ${activeFilter === "all" ? "rm-filter-active" : ""}`} onClick={() => setActiveFilter("all")}>الكل</button>
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} className={`rm-filter-btn ${activeFilter === star ? "rm-filter-active" : ""}`} onClick={() => setActiveFilter(star)}>
                {star} <StarIcon filled />
              </button>
            ))}
          </div>
          <div className="rm-sort-dropdown" ref={sortRef}>
            <button type="button" className="rm-btn-sort" onClick={() => setSortOpen((p) => !p)}>
              تصفية <FunnelIcon />
            </button>
            {sortOpen && (
              <div className="rm-sort-menu">
                <button type="button" className={`rm-sort-item ${sortOrder === "newest" ? "rm-sort-item-active" : ""}`} onClick={() => { setSortOrder("newest"); setSortOpen(false); }}>الأحدث أولاً</button>
                <button type="button" className={`rm-sort-item ${sortOrder === "oldest" ? "rm-sort-item-active" : ""}`} onClick={() => { setSortOrder("oldest"); setSortOpen(false); }}>الأقدم أولاً</button>
              </div>
            )}
          </div>
        </div>

        {/* Reviews list */}
        <div className="rm-reviews-list">
          {visibleReviews.map((review, i) => {
            const reviewId = review._id ?? review.id;
            return (
            <div className="rm-review-card" key={reviewId}>
              <div className="rm-review-top">
                <div className="rm-review-meta">
                  <StarsDisplay rating={review.rating} />
                  {/* عدّلي customerName حسب الاسم الحقيقي من الباك اند */}
                  <span className="rm-review-name">{review.customerName}</span>
                  <span className="rm-review-date">{review.createdAt?.slice(0, 10)}</span>
                  {review.sellerReply
                    ? <span className="rm-badge rm-badge-green">تم الرد عليه</span>
                    : <span className="rm-badge rm-badge-yellow">بانتظار الرد</span>
                  }
                </div>
                <div className="rm-avatar" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                  {/* عدّلي customerName حسب الاسم الحقيقي من الباك اند */}
                  {review.customerName?.charAt(0)}
                </div>
              </div>

              {/* عدّلي comment حسب الاسم الحقيقي من الباك اند */}
              <p className="rm-review-comment">{review.comment}</p>

              {review.sellerReply && openReplyId !== reviewId && (
                <div className="rm-reply-box">
                  <div className="rm-reply-header">
                    <button type="button" className="rm-edit-reply" onClick={() => handleEditReply(review)}>
                      <EditIcon /> تعديل الرد
                    </button>
                    <span>رد البائع:</span>
                  </div>
                  {/* عدّلي sellerReply.text حسب الاسم الحقيقي من الباك اند */}
                  <p className="rm-reply-text">{review.sellerReply.text}</p>
                </div>
              )}

              {openReplyId === reviewId ? (
                <div className="rm-reply-form">
                  <textarea
                    className="rm-reply-textarea"
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    placeholder="اكتب ردك هنا..."
                    rows={3}
                  />
                  <div className="rm-reply-form-actions">
                    <button type="button" className="rm-btn-submit-reply" onClick={() => handleSubmitReply(reviewId)} disabled={replyLoading}>
                      {replyLoading ? "جاري الإرسال…" : "إرسال الرد"}
                    </button>
                    <button type="button" className="rm-btn-cancel-reply" onClick={() => setOpenReplyId(null)}>إلغاء</button>
                  </div>
                </div>
              ) : (
                !review.sellerReply && (
                  <button type="button" className="rm-btn-reply" onClick={() => handleOpenReply(reviewId)}>
                    <ReplyIcon /> رد على التقييم
                  </button>
                )
              )}
            </div>
            );
          })}

          {visibleReviews.length === 0 && (
            <div className="rm-empty">لا توجد تقييمات مطابقة لهذا الفلتر</div>
          )}
        </div>

      </main>
    </div>
  );
};

export default RatingsManagement;