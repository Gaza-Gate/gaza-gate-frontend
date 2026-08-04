import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import "./RatingsManagement.css";
import api from "../utils/api";
import SellerNavbar from "../components/SellerNavbar";
import { ErrorState } from "../components/LoadingState";
import { customerProfilePath } from "../utils/sellerHelpers";

// ══════════════════════════════════════════════════
//  ⚙️  الـ endpoints — تأكدي من المسار الصحيح ببوستمان
// ══════════════════════════════════════════════════
// Tab 1: تقييمات الزبائن لمنتجاتي (Seller Product Reviews)
const PRODUCT_REVIEWS_ENDPOINT = "/api/seller/review";

// Tab 2: تقييماتي أنا كسيلر للزبائن (Seller Customer Reviews)
const CUSTOMER_REVIEWS_ENDPOINT = "/api/seller/review/customer/my";

// ⚠️ ما تأكدنا من شكل الـ Body تبع الـ PATCH لسا (افتراض: { rating, comment })
// إذا رجع خطأ، افتحي "Update Seller Customer Review" ببوستمان وشوفي شكل الـ Body الحقيقي
const customerReviewUrl = (id) => `/api/seller/review/customer/${id}`;

//   مدة بقاء الهايلايت المؤقت على التقييم المستهدف (بالميلي ثانية)
const HIGHLIGHT_DURATION_MS = 2500;

// ══════════════════════════════════════════════════
//  🆕 مفتاح هوية بديل للتقييم (بما إنه الـ backend ما بيرجع _id/id
//  للتقييمات لا بالـ Dashboard ولا بـ /api/seller/review) — مبني من
//  (customer.id + rating + التاريخ + أول 60 حرف من التعليق). هاي التركيبة
//  عملياً فريدة لكل تقييم، وبتُستخدم فقط للتعرّف/السكرول/الهايلايت،
//  مش لأي إجراء حقيقي على السيرفر (تعديل/حذف بيستخدموا الـ id الحقيقي
//  الموجود بتبويب "تقييماتي للزبائن" لو موجود).
// ══════════════════════════════════════════════════
const buildReviewMatchKey = ({ customerId, rating, comment, date }) => {
  const dateStr = (date || "").toString().slice(0, 10);
  const commentStr = (comment || "").toString().trim().slice(0, 60);
  return `${customerId || ""}|${rating || ""}|${dateStr}|${commentStr}`;
};

// يرجع هوية التقييم: الـ id الحقيقي لو موجود، وإلا المفتاح المركّب كبديل
const getReviewIdentity = (review) => {
  const realId = review._id ?? review.id;
  if (realId) return String(realId);
  return buildReviewMatchKey({
    customerId: review.customer?.id,
    rating: review.rating,
    comment: review.comment,
    date: review.createdAt ?? review.date,
  });
};

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

const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
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

// نجمة قابلة للضغط - لفورم تعديل تقييم الزبون
function StarPicker({ value, onChange }) {
  return (
    <div className="rm-star-picker">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="rm-star-picker-btn"
          onClick={() => onChange(n)}
          aria-label={`${n} نجوم`}
        >
          <StarIcon filled={n <= value} />
        </button>
      ))}
    </div>
  );
}

const AVATAR_COLORS = ["#f97316", "#16a34a", "#2563eb", "#9333ea", "#e11d48"];

// ── API Helpers ──

// تقييمات الزبائن لمنتجاتي
const fetchProductReviews = async () => {
  const res = await api.get(PRODUCT_REVIEWS_ENDPOINT);
  const payload = res.data?.data ?? res.data ?? {};
  const list = Array.isArray(payload?.reviews)
    ? payload.reviews
    : Array.isArray(payload)
    ? payload
    : [];

  return list.map((r) => {
    const firstName = r.customer?.user?.firstName ?? r.customer?.firstName ?? "";
    const lastName = r.customer?.user?.lastName ?? r.customer?.lastName ?? "";
    const fullName = `${firstName} ${lastName}`.trim();

    // الـ API بيرجع sellerReply كنص مباشر + sellerRepliedAt منفصل
    // بنحولهم هون لنفس شكل الـ object يلي باقي الكود متوقعه
    const sellerReply = r.sellerReply
      ? { text: r.sellerReply, createdAt: r.sellerRepliedAt ?? null }
      : null;

    return {
      ...r,
      customerName: r.customerName ?? (fullName || "عميل"),
      sellerReply,
    };
  });
};

// تقييماتي أنا كسيلر للزبائن — كل عنصر فيه customer (الزبون المُقيَّم) + order + product
const fetchCustomerReviews = async () => {
  const res = await api.get(CUSTOMER_REVIEWS_ENDPOINT);
  const payload = res.data?.data ?? res.data ?? {};
  const list = Array.isArray(payload?.reviews)
    ? payload.reviews
    : Array.isArray(payload)
    ? payload
    : [];

  return list.map((r) => {
    const firstName = r.customer?.firstName ?? "";
    const lastName = r.customer?.lastName ?? "";
    const fullName = `${firstName} ${lastName}`.trim();
    return {
      ...r,
      customerName: fullName || "عميل",
    };
  });
};

// تعديل تقييم زبون سابق
const updateCustomerReview = async (id, { orderId, rating, comment }) => {
  const res = await api.patch(customerReviewUrl(id), { orderId, rating, comment });
  return res.data;
};

// حذف تقييم زبون
const deleteCustomerReview = async (id) => {
  const res = await api.delete(customerReviewUrl(id));
  return res.data;
};

const RatingsManagement = () => {
   const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── التبويب النشط ──
  const [activeTab, setActiveTab] = useState("productReviews"); // "productReviews" | "customerReviews"

  // ── بيانات كل تبويب لحاله ──
  const [productReviews, setProductReviews] = useState([]);
  const [customerReviews, setCustomerReviews] = useState([]);
  const [productLoaded, setProductLoaded] = useState(false);
  const [customerLoaded, setCustomerLoaded] = useState(false);

  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortOrder, setSortOrder]     = useState("newest");
  const [sortOpen, setSortOpen]       = useState(false);
  const [openReplyId, setOpenReplyId] = useState(null);
  const [replyDraft, setReplyDraft]   = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  // ── تعديل/حذف تقييم زبون (تبويب تقييماتي للزبائن) ──
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editRating, setEditRating]           = useState(0);
  const [editComment, setEditComment]         = useState("");
  const [editLoading, setEditLoading]         = useState(false);
  const [editError, setEditError]             = useState("");
  const [deletingId, setDeletingId]           = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  //   دعم فتح تقييم محدد عبر الرابط (?reviewKey=...) — بينطبق بس على تبويب المنتجات
  const [highlightedReviewId, setHighlightedReviewId] = useState(null);
  const reviewRefs = useRef({});
  const highlightTimeoutRef = useRef(null);
  const handledReviewIdRef = useRef(null);

  const sortRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── تحميل بيانات التبويب النشط (مرة وحدة فقط لكل تبويب) ──
  const loadActiveTab = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "productReviews") {
        if (!productLoaded) {
          // ✅ دائماً بنستدعي الـ API الحقيقي — بدون mock data
          const data = await fetchProductReviews();
          setProductReviews(Array.isArray(data) ? data : []);
          setProductLoaded(true);
        }
      } else {
        if (!customerLoaded) {
          // ✅ دائماً بنستدعي الـ API الحقيقي
          const data = await fetchCustomerReviews();
          setCustomerReviews(Array.isArray(data) ? data : []);
          setCustomerLoaded(true);
        }
      }
    } catch (err) {
      console.error("فشل جلب التقييمات:", err);
      const msg =
        err?.response?.data?.data?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "تعذّر تحميل التقييمات. تحقق من الاتصال بالإنترنت وحاول مرة أخرى.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeTab, productLoaded, customerLoaded]);

  // ✅ دالة retry — بتعطي الـ user فرصة إعادة المحاولة بدون reload
  const retryLoad = useCallback(() => {
    setProductLoaded(false);
    setCustomerLoaded(false);
    setError(null);
    loadActiveTab();
  }, [loadActiveTab]);

  useEffect(() => { loadActiveTab(); }, [loadActiveTab]);

  useEffect(() => {
    setActiveFilter("all");
  }, [activeTab]);

  const reviews = activeTab === "productReviews" ? productReviews : customerReviews;

  //   لمّا يوصل ?reviewKey= بالرابط (جاي من Dashboard): بينطبق بس على تبويب
  //   تقييمات المنتجات. بما إنه ما في id حقيقي للتقييم بالـ backend، منقارن
  //   عن طريق getReviewIdentity (الـ id الحقيقي لو موجود، وإلا المفتاح المركّب).
  useEffect(() => {
    if (activeTab !== "productReviews") return;
    const reviewKeyParam = searchParams.get("reviewKey");
    if (!reviewKeyParam || loading) return;
    if (handledReviewIdRef.current === reviewKeyParam) return;

    const target = reviews.find((r) => getReviewIdentity(r) === reviewKeyParam);
    if (!target) return;

    handledReviewIdRef.current = reviewKeyParam;
    setActiveFilter("all");

    const scrollTimer = setTimeout(() => {
      const node = reviewRefs.current[reviewKeyParam];
      if (node) node.scrollIntoView({ behavior: "smooth", block: "center" });

      setHighlightedReviewId(reviewKeyParam);
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = setTimeout(() => setHighlightedReviewId(null), HIGHLIGHT_DURATION_MS);
    }, 150);

    return () => clearTimeout(scrollTimer);
  }, [searchParams, loading, reviews, activeTab]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  // ── حسابات الملخص (حسب التبويب النشط) ──
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

  // ── الرد على تقييم منتج ──
  const handleOpenReply = (id) => { setOpenReplyId(id); setReplyDraft(""); };
  const handleEditReply = (review) => { setOpenReplyId(review._id ?? review.id); setReplyDraft(review.sellerReply.text); };

 const handleSubmitReply = async (id) => {
  if (!replyDraft.trim()) {
    return;
  }
  setReplyLoading(true);
  try {
    // ✅ دائماً بنستدعي الـ API الحقيقي
    await api.post(`/api/seller/review/${id}/reply`, { reply: replyDraft.trim() });
    setProductReviews((prev) =>
      prev.map((r) =>
        (r._id ?? r.id) === id
          ? { ...r, sellerReply: { text: replyDraft.trim(), createdAt: new Date().toISOString() } }
          : r
      )
    );
    setOpenReplyId(null);
    setReplyDraft("");
  } catch (err) {
    console.error("فشل الرد على التقييم:", err);
    setError(err?.response?.data?.data?.message || "فشل إرسال الرد. حاول مرة أخرى.");
  } finally {
    setReplyLoading(false);
  }
};
  // ── تعديل تقييم زبون ──
  const handleOpenEdit = (review) => {
    setEditingReviewId(review._id ?? review.id);
    setEditRating(review.rating ?? 0);
    setEditComment(review.comment ?? "");
    setEditError("");
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setEditError("");
  };

const handleSubmitEdit = async (id, orderId) => {
  if (editRating === 0) {
    setEditError("الرجاء اختيار عدد النجوم.");
    return;
  }
  setEditLoading(true);
  setEditError("");
  try {
    // ✅ دائماً بنستدعي الـ API الحقيقي
    await updateCustomerReview(id, { orderId, rating: editRating, comment: editComment.trim() });
    setCustomerReviews((prev) =>
      prev.map((r) =>
        (r._id ?? r.id) === id
          ? { ...r, rating: editRating, comment: editComment.trim() }
          : r
      )
    );
    setEditingReviewId(null);
  } catch (err) {
    console.error("فشل تعديل التقييم:", err);
    setEditError(
      err?.response?.data?.data?.message || "تعذّر حفظ التعديل. حاول مرة أخرى."
    );
  } finally {
    setEditLoading(false);
  }
};

  // ── حذف تقييم زبون ──
  const handleConfirmDelete = async (id) => {
    setDeletingId(id);
    try {
      // ✅ دائماً بنستدعي الـ API الحقيقي
      await deleteCustomerReview(id);
      setCustomerReviews((prev) => prev.filter((r) => (r._id ?? r.id) !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("فشل حذف التقييم:", err);
      setError(
        err?.response?.data?.data?.message || "تعذّر حذف التقييم. حاول مرة أخرى."
      );
    } finally {
      setDeletingId(null);
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

        {/* Tabs */}
        <div className="rm-tabs">
          <button
            className={`rm-tab ${activeTab === "productReviews" ? "rm-tab-active" : ""}`}
            onClick={() => setActiveTab("productReviews")}
          >
            تقييمات الزبائن لي
          </button>
          <button
            className={`rm-tab ${activeTab === "customerReviews" ? "rm-tab-active" : ""}`}
            onClick={() => setActiveTab("customerReviews")}
          >
            تقييماتي للزبائن
          </button>
        </div>

        {error && (
          <div className="rm-error-block">
            <ErrorState
              icon={error.isPermission ? AlertCircle : AlertCircle}
              title={error.title || "تعذّر تحميل التقييمات"}
              message={error.message}
              onRetry={error.isPermission ? null : retryLoad}
              variant="inline"
            />
            {error.isPermission && (
              <div className="rm-error-hint">
                <p>💡 قد تحتاج لإكمال إعداد ملف متجرك أولاً قبل أن تستطيع إدارة التقييمات.</p>
                <button
                  type="button"
                  className="rm-edit-link-btn"
                  onClick={() => navigate("/seller/profile/edit")}
                >
                  إكمال ملف المتجر
                </button>
              </div>
            )}
          </div>
        )}

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
            // 🆕 identityKey: id حقيقي لو موجود (تبويب تقييماتي للزبائن)،
            // وإلا مفتاح مركّب بديل (تبويب تقييمات الزبائن لي، اللي ما فيه id
            // بالـ backend). يُستخدم فقط لـ key/ref/هايلايت — مش لأي API call.
            const identityKey = getReviewIdentity(review);
            // reviewId: يبقى id حقيقي فقط (أو undefined) — يُستخدم حصراً
            // لإجراءات حقيقية على السيرفر (تعديل/حذف/رد)
            const reviewId = review._id ?? review.id;
            const isHighlighted = highlightedReviewId === identityKey;
            const isCustomerTab = activeTab === "customerReviews";
            const isEditing = editingReviewId === reviewId;

            const customerPath = customerProfilePath(review.customer);

            return (
            <div
              className="rm-review-card"
              key={identityKey}
              ref={(el) => { reviewRefs.current[identityKey] = el; }}
              style={{
                transition: "background-color 0.6s ease, box-shadow 0.6s ease",
                ...(isHighlighted
                  ? { backgroundColor: "#fff7ed", boxShadow: "0 0 0 2px #f97316 inset" }
                  : {}),
              }}
            >
              <div className="rm-review-top">
                <div className="rm-review-meta">
                  <StarsDisplay rating={review.rating} />
                  {customerPath ? (
                    <Link
                      to={customerPath}
                      className="rm-review-name rm-review-name--link"
                      title="عرض بروفايل الزبون"
                    >
                      {review.customerName}
                    </Link>
                  ) : (
                    <span className="rm-review-name">{review.customerName}</span>
                  )}
                  <span className="rm-review-date">{review.createdAt?.slice(0, 10)}</span>
                  {!isCustomerTab && (
                    review.sellerReply
                      ? <span className="rm-badge rm-badge-green">تم الرد عليه</span>
                      : <span className="rm-badge rm-badge-yellow">بانتظار الرد</span>
                  )}
                </div>

                {review.customer?.avatar ? (
                  customerPath ? (
                    <Link
                      to={customerPath}
                      className="rm-avatar-link"
                      title={`بروفايل ${review.customerName}`}
                    >
                      <img src={review.customer.avatar} alt={review.customerName} className="rm-avatar-img" />
                    </Link>
                  ) : (
                    <img src={review.customer.avatar} alt={review.customerName} className="rm-avatar-img" />
                  )
                ) : customerPath ? (
                  <Link
                    to={customerPath}
                    className="rm-avatar-link"
                    title={`بروفايل ${review.customerName}`}
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {review.customerName?.charAt(0)}
                  </Link>
                ) : (
                  <div className="rm-avatar" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                    {review.customerName?.charAt(0)}
                  </div>
                )}
              </div>

              {/* سطر إضافي - بيظهر بس بتبويب "تقييماتي للزبائن": رقم الطلبية + اسم المنتج */}
              {isCustomerTab && (review.order || review.product) && (
                <p className="rm-review-extra">
                  {review.product?.name && <span>المنتج: {review.product.name}</span>}
                  {review.order?.orderNumber && <span> · الطلبية: {review.order.orderNumber}</span>}
                </p>
              )}

              {/* فورم التعديل يحل مكان التعليق العادي لما تكون بحالة تعديل */}
              {isCustomerTab && isEditing ? (
                <div className="rm-edit-form">
                  <StarPicker value={editRating} onChange={setEditRating} />
                  <textarea
                    className="rm-reply-textarea"
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    rows={3}
                  />
                  {editError && <div className="od-error-inline">{editError}</div>}
                  <div className="rm-reply-form-actions">
                    <button
                      type="button"
                      className="rm-btn-submit-reply"
                      onClick={() => handleSubmitEdit(reviewId, review.order?.id)}
                      disabled={editLoading}
                    >
                      {editLoading ? "جاري الحفظ…" : "حفظ التعديل"}
                    </button>
                    <button
                      type="button"
                      className="rm-btn-cancel-reply"
                      onClick={handleCancelEdit}
                      disabled={editLoading}
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <p className="rm-review-comment">{review.comment}</p>
              )}

              {/* أزرار تعديل/حذف - بتبويب تقييماتي للزبائن بس */}
              {isCustomerTab && !isEditing && (
                <div className="rm-customer-review-actions">
                  <button
                    type="button"
                    className="rm-btn-edit-review"
                    onClick={() => handleOpenEdit(review)}
                  >
                    <EditIcon /> تعديل
                  </button>

                  {confirmDeleteId === reviewId ? (
                    <div className="rm-confirm-delete">
                      <span>متأكدة من الحذف؟</span>
                      <button
                        type="button"
                        className="rm-btn-confirm-delete"
                        onClick={() => handleConfirmDelete(reviewId)}
                        disabled={deletingId === reviewId}
                      >
                        {deletingId === reviewId ? "جاري الحذف…" : "نعم، احذف"}
                      </button>
                      <button
                        type="button"
                        className="rm-btn-cancel-reply"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="rm-btn-delete-review"
                      onClick={() => setConfirmDeleteId(reviewId)}
                    >
                      <TrashIcon /> حذف
                    </button>
                  )}
                </div>
              )}

              {/* الرد يظهر بس بتقييمات المنتجات */}
              {!isCustomerTab && review.sellerReply && openReplyId !== reviewId && (
                <div className="rm-reply-box">
                  <div className="rm-reply-header">
                    <button type="button" className="rm-edit-reply" onClick={() => handleEditReply(review)}>
                      <EditIcon /> تعديل الرد
                    </button>
                    <span>رد البائع:</span>
                  </div>
                  <p className="rm-reply-text">{review.sellerReply.text}</p>
                </div>
              )}

              {!isCustomerTab && (
                openReplyId === reviewId ? (
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
                )
              )}
            </div>
            );
          })}

          {visibleReviews.length === 0 && !error && (
            <div className="rm-empty">لا توجد تقييمات مطابقة لهذا الفلتر</div>
          )}
        </div>

      </main>
    </div>
  );
};

export default RatingsManagement;