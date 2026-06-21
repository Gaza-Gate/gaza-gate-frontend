 import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./RatingsManagement.css";
import logo from "../assets/logo.png";

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

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

// ── عرض نجوم تقييم ──
function StarsDisplay({ rating }) {
  return (
    <span className="rm-stars-display">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={n <= rating} />
      ))}
    </span>
  );
}

// ── Static demo data مؤقتة - بتتبدّل لاحقاً بداتا التقييمات الحقيقية من الـ API ──
const REVIEWS_DATA = [
  {
    id: 1,
    customer: "أحمد محمد",
    avatarColor: "#f97316",
    date: "2026-06-08",
    rating: 5,
    comment: "منتج ممتاز جداً، الجودة عالية والتوصيل سريع. شكراً لكم على الخدمة الرائعة!",
    reply: { text: "شكراً لتقييمك الرائع! نسعى دائماً لتقديم أفضل خدمة لعملائنا الكرام.", date: "2026-06-09" },
  },
  {
    id: 2,
    customer: "فاطمة علي",
    avatarColor: "#16a34a",
    date: "2026-06-05",
    rating: 4,
    comment: "جودة المنتج جيدة جداً لكن وقت التوصيل كان أطول من المتوقع شوي.",
    reply: null,
  },
  {
    id: 3,
    customer: "محمود حسن",
    avatarColor: "#2563eb",
    date: "2026-06-03",
    rating: 5,
    comment: "منتج رائع ويستحق التقييم بـ5 نجوم، تجربة شراء ممتازة جداً من أول مرة.",
    reply: null,
  },
  {
    id: 4,
    customer: "سارة خالد",
    avatarColor: "#9333ea",
    date: "2026-05-31",
    rating: 2,
    comment: "لم يكن المنتج كما توقعت، وصل متأخراً عن الوقت المحدد المتفق عليه.",
    reply: null,
  },
  {
    id: 5,
    customer: "يوسف أحمد",
    avatarColor: "#f97316",
    date: "2026-05-29",
    rating: 5,
    comment: "تجربة رائعة بكل المقاييس، سأكرر الطلب بكل تأكيد مع هذا المتجر.",
    reply: null,
  },
];

const RatingsManagement = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState(REVIEWS_DATA);
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [openReplyId, setOpenReplyId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");

  const sortRef = useRef(null);
  const moreRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── حسابات الملخص (بتتحدث تلقائياً حسب الداتا) ──
  const totalReviews = reviews.length;
  const averageRating = totalReviews
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  // ── فلترة وفرز ──
  const visibleReviews = reviews
    .filter((r) => activeFilter === "all" || r.rating === activeFilter)
    .sort((a, b) =>
      sortOrder === "newest" ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date)
    );

  // ── منطق الرد على التقييم ──
  const handleOpenReply = (id) => {
    setOpenReplyId(id);
    setReplyDraft("");
  };

  const handleEditReply = (review) => {
    setOpenReplyId(review.id);
    setReplyDraft(review.reply.text);
  };

  const handleSubmitReply = (id) => {
    if (!replyDraft.trim()) return;
    // مؤقتاً بنحدّث الستيت محلياً
    // لاحقاً: await submitReviewReply(id, replyDraft, getAuthToken());
    setReviews((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, reply: { text: replyDraft.trim(), date: new Date().toISOString().slice(0, 10) } }
          : r
      )
    );
    setOpenReplyId(null);
    setReplyDraft("");
  };

  return (
    <div className="rm-root" dir="rtl">
      {/* Navbar */}
      <nav className="rm-navbar">
        <div className="rm-nav-logo">
          <img src={logo} alt="Gaza Gate" className="rm-logo-img" />
        </div>
        <div className="rm-nav-links">
          <a href="#" className="rm-nav-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
            لوحة التحكم
          </a>
          <a href="#" className="rm-nav-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            المنتجات
          </a>
          <a href="#" className="rm-nav-link" onClick={() => navigate("/seller/profile")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            ملف المتجر
          </a>
          <div className="rm-dropdown" ref={moreRef}>
            <button type="button" className="rm-nav-link rm-dropdown-trigger" onClick={() => setMoreOpen((p) => !p)}>
              المزيد
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={moreOpen ? "rm-chevron-open" : ""}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {moreOpen && (
              <div className="rm-dropdown-menu">
                <a href="#" className="rm-dropdown-item" onClick={(e) => { e.preventDefault(); setMoreOpen(false); navigate("/seller/orders"); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  الطلبات
                </a>
                <a href="#" className="rm-dropdown-item" onClick={(e) => { e.preventDefault(); setMoreOpen(false); navigate("/seller/ratings"); }}>
                  <StarIcon filled />
                  التقييمات
                </a>
                <a href="#" className="rm-dropdown-item" onClick={(e) => { e.preventDefault(); setMoreOpen(false); navigate("/seller/messages"); }}>
                  <ReplyIcon />
                  المراسلات
                </a>
              </div>
            )}
          </div>
        </div>
        <div className="rm-nav-left">
          <button className="rm-btn-notif">
            <BellIcon />
            <span className="rm-notif-dot"></span>
          </button>
          <button className="rm-btn-logout" onClick={() => navigate("/login")}>
            <span>خروج</span>
            <LogoutIcon />
          </button>
        </div>
      </nav>

      <main className="rm-main">

        {/* Header */}
        <div className="rm-header">
          <h1 className="rm-page-title">ادارة التقييمات</h1>
          <p className="rm-page-subtitle">إدارة وعرض تقييمات الزبائن على متجرك</p>
        </div>

        {/* Summary card */}
        <div className="rm-summary-card">
          <div className="rm-distribution">
            {distribution.map((d) => (
              <div className="rm-dist-row" key={d.star}>
                <span className="rm-dist-star">
                  {d.star} <StarIcon filled />
                </span>
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
            <button
              className={`rm-filter-btn ${activeFilter === "all" ? "rm-filter-active" : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              الكل
            </button>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`rm-filter-btn ${activeFilter === star ? "rm-filter-active" : ""}`}
                onClick={() => setActiveFilter(star)}
              >
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
                <button
                  type="button"
                  className={`rm-sort-item ${sortOrder === "newest" ? "rm-sort-item-active" : ""}`}
                  onClick={() => { setSortOrder("newest"); setSortOpen(false); }}
                >
                  الأحدث أولاً
                </button>
                <button
                  type="button"
                  className={`rm-sort-item ${sortOrder === "oldest" ? "rm-sort-item-active" : ""}`}
                  onClick={() => { setSortOrder("oldest"); setSortOpen(false); }}
                >
                  الأقدم أولاً
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Reviews list */}
        <div className="rm-reviews-list">
          {visibleReviews.map((review) => (
            <div className="rm-review-card" key={review.id}>
              <div className="rm-review-top">
                <div className="rm-review-meta">
                  <StarsDisplay rating={review.rating} />
                  <span className="rm-review-name">{review.customer}</span>
                  <span className="rm-review-date">{review.date}</span>
                  {review.reply ? (
                    <span className="rm-badge rm-badge-green">تم الرد عليه</span>
                  ) : (
                    <span className="rm-badge rm-badge-yellow">بانتظار الرد</span>
                  )}
                </div>
                <div className="rm-avatar" style={{ background: review.avatarColor }}>
                  {review.customer.charAt(0)}
                </div>
              </div>

              <p className="rm-review-comment">{review.comment}</p>

              {review.reply && openReplyId !== review.id && (
                <div className="rm-reply-box">
                  <div className="rm-reply-header">
                    <button type="button" className="rm-edit-reply" onClick={() => handleEditReply(review)}>
                      <EditIcon /> تعديل الرد
                    </button>
                    <span>رد البائع:</span>
                  </div>
                  <p className="rm-reply-text">{review.reply.text}</p>
                </div>
              )}

              {openReplyId === review.id ? (
                <div className="rm-reply-form">
                  <textarea
                    className="rm-reply-textarea"
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    placeholder="اكتب ردك هنا..."
                    rows={3}
                  />
                  <div className="rm-reply-form-actions">
                    <button type="button" className="rm-btn-submit-reply" onClick={() => handleSubmitReply(review.id)}>
                      إرسال الرد
                    </button>
                    <button type="button" className="rm-btn-cancel-reply" onClick={() => setOpenReplyId(null)}>
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                !review.reply && (
                  <button type="button" className="rm-btn-reply" onClick={() => handleOpenReply(review.id)}>
                    <ReplyIcon /> رد على التقييم
                  </button>
                )
              )}
            </div>
          ))}

          {visibleReviews.length === 0 && (
            <div className="rm-empty">لا توجد تقييمات مطابقة لهذا الفلتر</div>
          )}
        </div>

      </main>
    </div>
  );
};

export default RatingsManagement;