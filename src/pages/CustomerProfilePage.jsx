import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Trophy,
  Star,
  Calendar,
  CheckCircle2,
  Info,
  ShoppingBag,
  Package,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  BadgeCheck,
  ArrowRight,
} from "lucide-react";

import { getPublicCustomerProfile } from "../services/profileService";
import { Skeleton } from "../components/LoadingState";
import "./CustomerProfilePage.css";

/* ──────────────────────────────────────────────
   helpers
   ────────────────────────────────────────────── */

const AVATAR_COLORS = ["#f97316", "#16a34a", "#2563eb", "#9333ea", "#e11d48", "#0891b2", "#ca8a04"];

function pickAvatarColor(name = "") {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(firstName = "", lastName = "") {
  const f = (firstName || "").trim();
  const l = (lastName || "").trim();
  if (f && l) return `${f[0]}${l[0]}`;
  if (f) return f.slice(0, 2);
  if (l) return l.slice(0, 2);
  return "؟";
}

/** "2026-07-19T09:45:04.000Z" → "يناير 2024" */
function formatMemberSince(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return d.toLocaleDateString("ar-EG", { year: "numeric", month: "long" });
  } catch {
    return d.toISOString().slice(0, 7);
  }
}

/** "2026-07-20T16:42:25.000Z" → "12 يناير 2025" */
function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return d.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

/** human-friendly "منذ X أيام" */
function timeSince(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "اليوم";
  if (days === 1) return "منذ يوم";
  if (days === 2) return "منذ يومين";
  if (days < 30) return `منذ ${days} أيام`;
  const months = Math.floor(days / 30);
  if (months < 12) return `منذ ${months} شهر`;
  return `منذ ${Math.floor(months / 12)} سنة`;
}

function StarRow({ rating = 0, size = 16 }) {
  const rounded = Math.round(rating);
  return (
    <span className="cpp-stars" aria-label={`${rating} من 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          fill={n <= rounded ? "#fbbf24" : "none"}
          stroke={n <= rounded ? "#fbbf24" : "#d1d5db"}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

/* ──────────────────────────────────────────────
   component
   ────────────────────────────────────────────── */

export default function CustomerProfilePage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ الصفحة هون صارت standalone (مش جوا CustomerLayout) — أي زائر
  //    (بائع / مشتري آخر / ضيف) يقدر يفوت عليها بنفس الشكل.
  //    ما في role switch، ما في CustomerNavbar، ما في CustomerChatWidget.
  //    زر "رجوع" بسيط بيرجّع للصفحة السابقة (لو فيه history)
  //    أو للـ home تباع الـ role.
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    // fallback آمن
    navigate("/");
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPublicCustomerProfile(customerId);
        if (alive) setProfile(data);
      } catch (err) {
        if (alive) setError(err?.response?.data?.data?.message || err?.message || "تعذّر تحميل الملف الشخصي");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [customerId]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // re-trigger the effect by forcing a tiny tick
    setProfile(null);
    // immediate re-fetch
    (async () => {
      try {
        const data = await getPublicCustomerProfile(customerId);
        setProfile(data);
      } catch (err) {
        setError(err?.response?.data?.data?.message || err?.message || "تعذّر تحميل الملف الشخصي");
      } finally {
        setLoading(false);
      }
    })();
  };

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="cpp-page" dir="rtl">
        <div className="cpp-container">
          <div className="cpp-topbar">
            <button type="button" className="cpp-back-btn" onClick={handleBack} aria-label="رجوع">
              <ArrowRight size={18} />
              <span>رجوع</span>
            </button>
          </div>
          <div className="cpp-top-grid">
            <div className="cpp-stats-grid">
              {[1, 2, 3, 4].map((i) => (
                <div className="cpp-stat-card" key={i}>
                  <Skeleton width={28} height={28} style={{ borderRadius: "50%" }} />
                  <Skeleton width={50} height={22} style={{ marginTop: 10 }} />
                  <Skeleton width={40} height={12} style={{ marginTop: 6 }} />
                </div>
              ))}
            </div>
            <div className="cpp-profile-card cpp-skeleton-card">
              <Skeleton width={64} height={64} style={{ borderRadius: "50%" }} />
              <Skeleton width="70%" height={18} style={{ marginTop: 14 }} />
              <Skeleton width="50%" height={12} style={{ marginTop: 8 }} />
            </div>
          </div>
          <Skeleton width="100%" height={120} style={{ marginTop: 24, borderRadius: 12 }} />
          <Skeleton width="100%" height={300} style={{ marginTop: 24, borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div className="cpp-page" dir="rtl">
        <div className="cpp-container">
          <div className="cpp-topbar">
            <button type="button" className="cpp-back-btn" onClick={handleBack} aria-label="رجوع">
              <ArrowRight size={18} />
              <span>رجوع</span>
            </button>
          </div>
          <div className="cpp-error-state">
            <AlertCircle size={42} className="cpp-error-icon" />
            <h2>تعذّر التحميل</h2>
            <p>{error}</p>
            <button type="button" className="cpp-retry-btn" onClick={handleRetry}>
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const customer = profile.customer || {};
  const stats = profile.stats || {};
  const shopping = profile.shopping || {};
  const reviews = profile.sellerReviews || {};

  const fullName = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || "مشتري";
  const initials = getInitials(customer.firstName, customer.lastName);
  const avatarBg = pickAvatarColor(fullName);
  const completion = Math.round(Number(stats.completionRate ?? 0));
  const avgRating = Number(stats.averageRating ?? 0);
  const totalReviews = Number(stats.totalReviews ?? 0);
  const completedOrders = Number(stats.completedOrders ?? 0);

  return (
    <div className="cpp-page" dir="rtl">
      <div className="cpp-container">
        {/* ── Topbar: زر رجوع بسيط (الصفحة standalone) ── */}
        <div className="cpp-topbar">
          <button type="button" className="cpp-back-btn" onClick={handleBack} aria-label="رجوع">
            <ArrowRight size={18} />
            <span>رجوع</span>
          </button>
        </div>

        {/* ── Top: stats + orange profile card ── */}
        <div className="cpp-top-grid">
          {/* Stats grid (right side in RTL) */}
          <div className="cpp-stats-grid">
            <div className="cpp-stat-card">
              <div className="cpp-stat-icon cpp-icon-orange">
                <Trophy size={20} />
              </div>
              <div className="cpp-stat-value">{completion}%</div>
              <div className="cpp-stat-label">إتمام</div>
            </div>

            <div className="cpp-stat-card">
              <div className="cpp-stat-icon cpp-icon-amber">
                <Star size={20} fill="currentColor" />
              </div>
              <div className="cpp-stat-value">{avgRating.toFixed(1)}</div>
              <div className="cpp-stat-label">متوسط</div>
            </div>

            <div className="cpp-stat-card">
              <div className="cpp-stat-icon cpp-icon-amber">
                <Star size={20} />
              </div>
              <div className="cpp-stat-value">{totalReviews}</div>
              <div className="cpp-stat-label">التقييمات</div>
            </div>

            <div className="cpp-stat-card">
              <div className="cpp-stat-icon cpp-icon-amber">
                <Calendar size={20} />
              </div>
              <div className="cpp-stat-value">{completedOrders}</div>
              <div className="cpp-stat-label">طلب مكتمل</div>
            </div>
          </div>

          {/* Orange profile card (left side in RTL = top of flex) */}
          <div className="cpp-profile-card">
            <div className="cpp-profile-avatar-wrap">
              {customer.avatar ? (
                <img src={customer.avatar} alt={fullName} className="cpp-profile-avatar" />
              ) : (
                <div
                  className="cpp-profile-avatar cpp-profile-avatar--placeholder"
                  style={{ background: avatarBg }}
                >
                  {initials}
                </div>
              )}
            </div>
            <div className="cpp-profile-info">
              <h1 className="cpp-profile-name">{fullName}</h1>
              <p className="cpp-profile-since">
                عضو منذ {formatMemberSince(customer.memberSince)}
              </p>
              {customer.isTrustedBuyer && (
                <span className="cpp-verified-pill">
                  <BadgeCheck size={14} />
                  مشتري موثّق
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Shopping now panel ── */}
        <div className="cpp-section">
          <div className="cpp-section-header">
            <h2 className="cpp-section-title">
              <ShoppingBag size={18} className="cpp-section-icon" />
              يتسوق الآن
            </h2>
            {shopping.lastOrderAt && (
              <span className="cpp-last-order">
                <Info size={14} />
                آخر طلب: {timeSince(shopping.lastOrderAt)}
              </span>
            )}
          </div>

          <div className="cpp-shopping-badges">
            <span className="cpp-pill cpp-pill--green">
              <ShieldCheck size={14} />
              اشتراك نشط
            </span>
            <span className="cpp-pill cpp-pill--teal">
              <CheckCircle2 size={14} />
              منتظم
            </span>
            <span className="cpp-pill cpp-pill--amber">
              <Sparkles size={14} />
              أكمل وبونز
            </span>
          </div>

          {Array.isArray(shopping.topCategories) && shopping.topCategories.length > 0 && (
            <div className="cpp-top-categories">
              <span className="cpp-top-cat-label">أكثر ما يشتري:</span>
              {shopping.topCategories.map((cat) => (
                <span key={cat.id} className="cpp-top-cat-tag">
                  {cat.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Seller reviews section ── */}
        <div className="cpp-section">
          <div className="cpp-section-header cpp-reviews-header">
            <div className="cpp-reviews-title">
              <h2 className="cpp-section-title">
                <Star size={18} className="cpp-section-icon" fill="currentColor" />
                تقييمات البائعين عليه
              </h2>
              <span className="cpp-reviews-summary">
                {Number(reviews.averageRating ?? 0).toFixed(1)}{" "}
                <span className="cpp-reviews-count">
                  ({Number(reviews.totalReviews ?? 0)} تقييم)
                </span>
              </span>
            </div>
          </div>

          {!Array.isArray(reviews.preview) || reviews.preview.length === 0 ? (
            <div className="cpp-empty-reviews">
              <Package size={36} className="cpp-empty-icon" />
              <p>لا توجد تقييمات من البائعين بعد.</p>
            </div>
          ) : (
            <ul className="cpp-reviews-list">
              {reviews.preview.map((rev) => {
                const seller = rev.seller || {};
                const product = rev.product || {};
                const sellerName = seller.storeName || "بائع";
                return (
                  <li key={rev.id} className="cpp-review-item">
                    <div className="cpp-review-left">
                      <div className="cpp-review-meta">
                        <div className="cpp-review-date">{formatDate(rev.createdAt)}</div>
                        <StarRow rating={rev.rating} size={14} />
                      </div>
                      <div className="cpp-review-seller">
                        {seller.id ? (
                          // ✅ دائماً نوجّه إلى CustomerStoreProfile (مسار الـ public view-only)
                          //    الـ seller.actionUrl اللي بيرجعه الباك = "/store/{id}" (مسار StoreProfile)
                          //    لكن المطلوب دائماً CustomerStoreProfile بناءً على طلب الـ user
                          <Link
                            to={`/customer/store/${seller.id}`}
                            className="cpp-review-seller-link"
                            title={`زيارة متجر ${sellerName}`}
                            aria-label={`زيارة متجر ${sellerName}`}
                          >
                            {seller.avatar ? (
                              <img src={seller.avatar} alt={sellerName} className="cpp-review-avatar" />
                            ) : (
                              <span
                                className="cpp-review-avatar cpp-review-avatar--placeholder"
                                style={{ background: pickAvatarColor(sellerName) }}
                              >
                                {sellerName[0]}
                              </span>
                            )}
                            <span className="cpp-review-store-name">{sellerName}</span>
                          </Link>
                        ) : (
                          <span className="cpp-review-seller-static" title={sellerName}>
                            {seller.avatar ? (
                              <img src={seller.avatar} alt={sellerName} className="cpp-review-avatar" />
                            ) : (
                              <span
                                className="cpp-review-avatar cpp-review-avatar--placeholder"
                                style={{ background: pickAvatarColor(sellerName) }}
                              >
                                {sellerName[0]}
                              </span>
                            )}
                            <span className="cpp-review-store-name">{sellerName}</span>
                          </span>
                        )}
                      </div>
                      <p className="cpp-review-comment">{rev.comment || "—"}</p>
                    </div>

                    {product.id && (
                      <Link
                        to={`/product/${product.id}`}
                        className="cpp-review-product"
                        title={`عرض ${product.name}`}
                      >
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="cpp-review-product-img" />
                        ) : (
                          <span className="cpp-review-product-img cpp-review-product-img--placeholder">
                            <Package size={20} />
                          </span>
                        )}
                        <span className="cpp-review-product-name">{product.name}</span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
