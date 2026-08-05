import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Star,
  ShoppingBag,
  MessageCircle,
  Package,
  ChevronRight,
  ChevronLeft,
  Plus,
  Heart,
  Share2,
  AlertCircle,
  RefreshCw,
  X,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  Sparkles,
  MapPin,
  Calendar,
  ShieldCheck,
  TrendingUp,
  Tag,
  Award,
  Clock,
} from "lucide-react";

import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { getCurrentUser } from "../services/authService";
import { getStoreProfile, getStoreProducts } from "../services/storeService";
import { avatarColor } from "../utils/chatHelpers";
import BuyerProductReviewsSection from "../components/BuyerProductReviewsSection";
import {
  EmptyState,
  ErrorState,
  StoreProfileSkeleton,
  ProductGridSkeleton,
} from "../components/LoadingState";

import "./CustomerStoreProfile.css";

// ── Helpers ────────────────────────────────────────────────
function StarRating({ value, size = 14, color = "#fbbf24" }) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <span className="csp-stars" style={{ fontSize: size }}>
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

function ProductCardImage({ src, alt }) {
  const [error, setError] = useState(false);
  if (error || !src) {
    return (
      <div className="csp-product-img-fallback">
        <ShoppingBag size={36} strokeWidth={1.4} />
      </div>
    );
  }
  return (
    <img src={src} alt={alt} loading="lazy" onError={() => setError(true)} />
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

function formatJoinDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const months = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Main Component ─────────────────────────────────────────
export default function CustomerStoreProfile() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsPage, setProductsPage] = useState(1);
  const [productsPagination, setProductsPagination] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("products"); // products | reviews | about
  const [productSearch, setProductSearch] = useState("");
  const [productSort, setProductSort] = useState("default"); // default | price-asc | price-desc | name
  const [activeCategory, setActiveCategory] = useState("all");
  const [copied, setCopied] = useState(false);
  const [msgTooltipVisible, setMsgTooltipVisible] = useState(false);

  // ✅ Auth central: لمعرفة دور الزائر الحالي (customer | seller | null للزائر)
  const { currentRole } = useAuth();

  // ✅ لزائر الـ "seller" → زر المراسلة معطّل (API غير جاهز بعد)
  //    لزائر الـ "customer" أو الزائر غير المسجّل → الزر يبقى فعّال عادي
  const isCurrentUserSeller = currentRole === "seller";

  // عدّاد + متوسط التقييمات — يُحدَّث من BuyerProductReviewsSection بعد ما يجيب البيانات
  const [sellerReviewsCount, setSellerReviewsCount] = useState(0);
  const [sellerAverageRating, setSellerAverageRating] = useState(0);
  const [sellerPositiveCount, setSellerPositiveCount] = useState(0);

  // ── جلب البروفايل ──
  const loadProfile = useCallback(async () => {
    if (!sellerId) return;
    try {
      setLoadingProfile(true);
      setError(null);
      const data = await getStoreProfile(sellerId);
      setProfile(data);
    } catch (err) {
      console.error("Store profile error:", err);
      setError(err?.response?.data?.message || err.message || "فشل تحميل المتجر");
    } finally {
      setLoadingProfile(false);
    }
  }, [sellerId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ── جلب المنتجات (مع pagination) ──
  const loadProducts = useCallback(
    async (page = 1) => {
      if (!sellerId) return;
      try {
        setLoadingProducts(true);
        const data = await getStoreProducts(sellerId, page);
        setProducts(data?.products ?? []);
        setProductsPagination(data?.pagination ?? null);
        setProductsPage(page);
      } catch (err) {
        console.error("Store products error:", err);
      } finally {
        setLoadingProducts(false);
      }
    },
    [sellerId]
  );

  useEffect(() => {
    loadProducts(1);
  }, [loadProducts]);

  const handleReviewsLoaded = useCallback((data) => {
    if (data?.total != null) setSellerReviewsCount(data.total);
    if (data?.average != null) setSellerAverageRating(Number(data.average));
    if (data?.distribution) {
      const dist = data.distribution;
      const pos = Number(dist[4] ?? dist["4"] ?? 0) + Number(dist[5] ?? dist["5"] ?? 0);
      setSellerPositiveCount(pos);
    }
  }, []);

  // ── Derived state ──
  const store = profile?.store;
  const stats = profile?.stats;
  const avatar = store?.user?.avatar;
  const storeName = store?.storeName || "متجر";
  const description = store?.storeDescription || "";
  const joinDate = formatJoinDate(store?.createdAt);
  const coverImage = store?.coverImage;

  const reviewStats = useMemo(() => {
    if (!products || products.length === 0) {
      return { totalReviews: 0, weightedAverage: 0, positiveReviews: 0 };
    }
    let totalReviews = 0;
    let ratingSum = 0;
    let positiveReviews = 0;
    for (const p of products) {
      const count = Number(p.reviewsCount ?? 0);
      const avg = Number(p.averageRating ?? 0);
      totalReviews += count;
      ratingSum += avg * count;
      if (avg >= 4) positiveReviews += count;
    }
    return {
      totalReviews,
      weightedAverage: totalReviews > 0 ? ratingSum / totalReviews : 0,
      positiveReviews,
    };
  }, [products]);

  // Categories derived from products
  const categories = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      const key = p.category || "أخرى";
      if (!map.has(key)) {
        map.set(key, { name: key, count: 0 });
      }
      map.get(key).count += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [products]);

  const initialToShow = useMemo(() => {
    if (!storeName) return "؟";
    return storeName.trim().charAt(0);
  }, [storeName]);

  // فلترة + ترتيب المنتجات
  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (activeCategory !== "all") {
      list = list.filter((p) => (p.category || "أخرى") === activeCategory);
    }
    if (productSearch.trim()) {
      const q = productSearch.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)
      );
    }
    switch (productSort) {
      case "price-asc":
        list.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price-desc":
        list.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "name":
        list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
        break;
      case "rating":
        list.sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0));
        break;
      default:
        break;
    }
    return list;
  }, [products, productSearch, productSort, activeCategory]);

  const handleReviewProductClick = (product) => {
    if (product?.id) {
      navigate(`/product/${product.id}`);
    }
  };

  // ── Handlers ──
  const handleMessageSeller = () => {
    // ✅ لو الزائر بائع → ما بسمح بفتح المحادثة (الميزة قيد التطوير)
    if (isCurrentUserSeller) {
      setMsgTooltipVisible(true);
      // إخفاء الـ tooltip تلقائياً بعد 3 ثواني
      setTimeout(() => setMsgTooltipVisible(false), 3000);
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate("/login/customer");
      return;
    }
    navigate(`/messages?sellerId=${sellerId}`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: storeName, text: description, url });
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        /* ignore */
      }
    }
  };

  const handleAddToCart = (product, e) => {
    e?.stopPropagation();
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate("/login/customer");
      return;
    }
    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        sellerId,
        stockType: product.stockType,
      },
      1
    );
  };

  const handleToggleFavoriteProduct = (product, e) => {
    e?.stopPropagation();
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate("/login/customer");
      return;
    }
    toggleWishlist({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      sellerId,
    });
  };

  // ── Render: loading (full page) ──
  if (loadingProfile && !profile) {
    return (
      <div className="csp-page" dir="rtl">
        <div className="csp-container">
          <StoreProfileSkeleton />
        </div>
      </div>
    );
  }

  // ── Render: error ──
  if (error && !profile) {
    return (
      <div className="csp-page" dir="rtl">
        <div className="csp-container">
          <ErrorState
            title="تعذّر تحميل المتجر"
            message={error}
            onRetry={loadProfile}
            retryLabel="إعادة المحاولة"
          />
          <div className="csp-back-center">
            <button className="csp-back-btn" onClick={() => navigate(-1)}>
              <ChevronRight size={16} />
              الرجوع
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: not found ──
  if (!store) {
    return (
      <div className="csp-page" dir="rtl">
        <div className="csp-container">
          <EmptyState
            icon={Package}
            title="المتجر غير موجود"
            description="ربما تم حذفه أو الرابط غير صحيح"
            action={
              <button
                className="csp-back-btn"
                onClick={() => navigate("/products")}
              >
                تصفح المنتجات
              </button>
            }
          />
        </div>
      </div>
    );
  }

  // positive percent
  const positivePercent =
    reviewStats.totalReviews > 0
      ? Math.round((reviewStats.positiveReviews / reviewStats.totalReviews) * 100)
      : 0;

  const responseRate = Number(store?.responseRate ?? 95); // fallback
  const shippingTime = store?.shippingTime || "1-3 أيام";

  return (
    <div className="csp-page" dir="rtl">
      <main className="csp-container">
        {/* ═══════ Hero / Header ═══════ */}
        <section className="csp-hero">
          <div
            className="csp-hero-bg"
            style={
              coverImage
                ? { backgroundImage: `url(${coverImage})` }
                : undefined
            }
          />
          <div className="csp-hero-content">
            <div className="csp-hero-main">
              <div className="csp-avatar-wrap">
                {avatar ? (
                  <img src={avatar} alt={storeName} className="csp-avatar-img" />
                ) : (
                  <div
                    className="csp-avatar"
                    style={{ backgroundColor: avatarColor(storeName) }}
                  >
                    {initialToShow}
                  </div>
                )}
               {store?.isTrustedSeller && (
                <span className="csp-verified-badge" title="متجر موثّق">
                  <CheckCircle2 size={14} />
                </span>
              )}
              </div>

              <div className="csp-hero-info">
                <h1 className="csp-store-name">{storeName}</h1>
                {description && (
                  <p className="csp-store-desc">{description}</p>
                )}
                <div className="csp-hero-meta">
                  <div className="csp-rating-pill">
                    <StarRating value={Number(reviewStats.weightedAverage) || Number(store.rating) || 0} size={13} />
                    <strong>
                      {reviewStats.totalReviews > 0
                        ? reviewStats.weightedAverage.toFixed(1)
                        : Number(store.rating || 0).toFixed(1)}
                    </strong>
                    <span className="csp-rating-text">
                      ({reviewStats.totalReviews || store.ratingCount || 0} تقييم)
                    </span>
                  </div>
                  {stats?.activeProducts > 0 && (
                    <span className="csp-pill">
                      <Package size={12} />
                      {stats.activeProducts} منتج
                    </span>
                  )}
                  {joinDate && (
                    <span className="csp-pill" title="تاريخ الانضمام">
                      <Calendar size={12} />
                      منذ {joinDate}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="csp-hero-actions">
              {/* ✅ زر المراسلة — يدعم الزائر بحساب seller (معطّل + tooltip) وبحساب customer (فعّال) */}
              <div className="csp-msg-btn-wrap">
                <button
                  className={`csp-msg-btn ${isCurrentUserSeller ? "csp-msg-btn--disabled" : ""}`}
                  onClick={handleMessageSeller}
                  disabled={isCurrentUserSeller}
                  aria-disabled={isCurrentUserSeller}
                  title={
                    isCurrentUserSeller
                      ? "المراسلة بين البائعين ستتوفر قريباً"
                      : "مراسلة المتجر"
                  }
                >
                  <MessageCircle size={16} />
                  مراسلة المتجر
                </button>
                {isCurrentUserSeller && msgTooltipVisible && (
                  <div className="csp-msg-tooltip" role="tooltip">
                    المراسلة بين البائعين ستتوفر قريباً
                  </div>
                )}
              </div>
              <button
                className="csp-icon-action"
                onClick={handleShare}
                aria-label="مشاركة"
                title={copied ? "تم نسخ الرابط" : "مشاركة"}
              >
                {copied ? <CheckCircle2 size={17} /> : <Share2 size={17} />}
              </button>
            </div>
          </div>
        </section>

        {/* ═══════ Trust strip — under the hero ═══════ */}
        <section className="csp-trust-strip">
          {store?.isTrustedSeller && (
            <>
              <div className="csp-trust-item">
                <span className="csp-trust-icon csp-trust-icon--orange">
                  <ShieldCheck size={16} />
                </span>
                <div className="csp-trust-text">
                  <strong>متجر موثّق</strong>
                  <small>تم التحقق من هويته</small>
                </div>
              </div>
              <div className="csp-trust-divider" />
            </>
          )}
          <div className="csp-trust-item">
            <span className="csp-trust-icon csp-trust-icon--green">
              <TrendingUp size={16} />
            </span>
            <div className="csp-trust-text">
              <strong>{responseRate}%</strong>
              <small>نسبة الاستجابة</small>
            </div>
          </div>
          <div className="csp-trust-divider" />
          <div className="csp-trust-item">
            <span className="csp-trust-icon csp-trust-icon--blue">
              <Clock size={16} />
            </span>
            <div className="csp-trust-text">
              <strong>{shippingTime}</strong>
              <small>مدة التجهيز والشحن</small>
            </div>
          </div>
          {stats?.activeProducts > 0 && (
            <>
              <div className="csp-trust-divider" />
              <div className="csp-trust-item">
                <span className="csp-trust-icon csp-trust-icon--purple">
                  <Award size={16} />
                </span>
                <div className="csp-trust-text">
                  <strong>{positivePercent}%</strong>
                  <small>تقييمات إيجابية</small>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ═══════ Tabs ═══════ */}
        <nav className="csp-tabs">
          <button
            className={`csp-tab ${activeTab === "products" ? "active" : ""}`}
            onClick={() => setActiveTab("products")}
          >
            <Package size={15} />
            <span>المنتجات</span>
            <span className="csp-tab-badge">{stats?.activeProducts ?? 0}</span>
          </button>
          <button
            className={`csp-tab ${activeTab === "reviews" ? "active" : ""}`}
            onClick={() => setActiveTab("reviews")}
          >
            <Star size={15} />
            <span>التقييمات</span>
            <span className="csp-tab-badge">
              {Math.max(
                sellerReviewsCount || 0,
                reviewStats.totalReviews || 0,
                store?.ratingCount || 0
              )}
            </span>
          </button>
          <button
            className={`csp-tab ${activeTab === "about" ? "active" : ""}`}
            onClick={() => setActiveTab("about")}
          >
            <Sparkles size={15} />
            <span>حول المتجر</span>
          </button>
        </nav>

        {/* ═══════ Tab Content ═══════ */}
        {activeTab === "products" && (
          <section className="csp-section">
            {/* category chips */}
            {categories.length > 1 && (
              <div className="csp-categories">
                <button
                  className={`csp-cat-chip ${activeCategory === "all" ? "active" : ""}`}
                  onClick={() => setActiveCategory("all")}
                >
                  <Tag size={12} />
                  الكل
                  <span className="csp-cat-count">{products.length}</span>
                </button>
                {categories.map((c) => (
                  <button
                    key={c.name}
                    className={`csp-cat-chip ${activeCategory === c.name ? "active" : ""}`}
                    onClick={() => setActiveCategory(c.name)}
                  >
                    {c.name}
                    <span className="csp-cat-count">{c.count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* toolbar: search + sort */}
            {products.length > 0 && (
              <div className="csp-products-toolbar">
                <div className="csp-search-input">
                  <Search size={15} color="#9ca3af" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="ابحث في منتجات المتجر..."
                  />
                  {productSearch && (
                    <button
                      className="csp-search-clear"
                      onClick={() => setProductSearch("")}
                      aria-label="مسح"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="csp-sort-wrap">
                  <SlidersHorizontal size={14} color="#6b7280" />
                  <select
                    value={productSort}
                    onChange={(e) => setProductSort(e.target.value)}
                    className="csp-sort-select"
                    aria-label="ترتيب المنتجات"
                  >
                    <option value="default">الترتيب الافتراضي</option>
                    <option value="price-asc">السعر: من الأقل</option>
                    <option value="price-desc">السعر: من الأعلى</option>
                    <option value="rating">الأعلى تقييماً</option>
                    <option value="name">الاسم (أ-ي)</option>
                  </select>
                </div>
              </div>
            )}

            {/* results summary */}
            {(productSearch || activeCategory !== "all") && !loadingProducts && (
              <div className="csp-results-meta">
                عرض {filteredProducts.length} من {products.length} منتج
                {(productSearch || activeCategory !== "all") && (
                  <button
                    className="csp-clear-filters"
                    onClick={() => {
                      setProductSearch("");
                      setActiveCategory("all");
                    }}
                  >
                    <X size={12} />
                    مسح الفلاتر
                  </button>
                )}
              </div>
            )}

            {loadingProducts ? (
              <ProductGridSkeleton count={6} columns={4} />
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                icon={Package}
                title={
                  productSearch || activeCategory !== "all"
                    ? "لا توجد منتجات مطابقة"
                    : "لا توجد منتجات بعد"
                }
                description={
                  productSearch || activeCategory !== "all"
                    ? "جرّب كلمة بحث مختلفة أو غيّر الفلتر"
                    : "عندما يضيف المتجر منتجات ستظهر هنا"
                }
                action={
                  (productSearch || activeCategory !== "all") && (
                    <button
                      className="csp-back-btn"
                      onClick={() => {
                        setProductSearch("");
                        setActiveCategory("all");
                      }}
                    >
                      عرض كل المنتجات
                    </button>
                  )
                }
              />
            ) : (
              <>
                <div className="csp-products-grid">
                  {filteredProducts.map((p) => {
                    const wishlisted = isWishlisted(p.id);
                    const outOfStock =
                      p.stockType === "limited" && Number(p.quantity) <= 0;
                    const lowStock =
                      p.stockType === "limited" &&
                      Number(p.quantity) > 0 &&
                      Number(p.quantity) <= 5;
                    const productRating = Number(p.averageRating || 0);
                    const reviewCount = Number(p.reviewsCount || 0);

                    return (
                      <article
                        key={p.id}
                        className="csp-product-card"
                        onClick={() => navigate(`/product/${p.id}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/product/${p.id}`);
                          }
                        }}
                      >
                        <div className="csp-product-img-wrap">
                          <ProductCardImage src={p.image} alt={p.name} />

                          {/* stock badge */}
                          {outOfStock && (
                            <span className="csp-stock-badge out">نفذ المخزون</span>
                          )}
                          {lowStock && (
                            <span className="csp-stock-badge low">
                              باقي {p.quantity}
                            </span>
                          )}

                          {/* wishlist */}
                          <button
                            className={`csp-wishlist-btn ${wishlisted ? "active" : ""}`}
                            onClick={(e) => handleToggleFavoriteProduct(p, e)}
                            aria-label={wishlisted ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                          >
                            <Heart
                              size={15}
                              fill={wishlisted ? "currentColor" : "none"}
                            />
                          </button>
                        </div>

                        <div className="csp-product-card-body">
                          {p.category && (
                            <span className="csp-product-category">
                              {p.category}
                            </span>
                          )}
                          <h3 className="csp-product-name" title={p.name}>{p.name}</h3>

                          {reviewCount > 0 && (
                            <div className="csp-product-rating">
                              <StarRating value={productRating} size={11} />
                              <span className="csp-product-rating-num">
                                {productRating.toFixed(1)}
                              </span>
                              <span className="csp-product-rating-count">
                                ({reviewCount})
                              </span>
                            </div>
                          )}

                          <div className="csp-product-footer">
                            <span className="csp-product-price">
                              <strong>{Number(p.price).toFixed(0)}</strong>
                              <small> ₪</small>
                            </span>
                            <button
                              className="csp-add-btn"
                              onClick={(e) => handleAddToCart(p, e)}
                              disabled={outOfStock}
                              aria-label={`أضف ${p.name} إلى السلة`}
                              title={
                                outOfStock
                                  ? "نفذ المخزون"
                                  : "أضف إلى السلة"
                              }
                            >
                              <Plus size={16} strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* pagination */}
                {productsPagination && productsPagination.totalPages > 1 && (
                  <div className="csp-pagination">
                    <button
                      className="csp-page-btn"
                      disabled={!productsPagination.hasPreviousPage || loadingProducts}
                      onClick={() => loadProducts(productsPage - 1)}
                    >
                      <ChevronRight size={16} />
                      السابق
                    </button>
                    <span className="csp-page-info">
                      صفحة {productsPagination.currentPage} من{" "}
                      {productsPagination.totalPages}
                    </span>
                    <button
                      className="csp-page-btn"
                      disabled={!productsPagination.hasNextPage || loadingProducts}
                      onClick={() => loadProducts(productsPage + 1)}
                    >
                      التالي
                      <ChevronLeft size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {activeTab === "reviews" && (
          <section className="csp-section">
            {(() => {
              // ✅ العدد والمتوسط يجوا من 3 مصادر بالترتيب:
              // 1) من BuyerProductReviewsSection (الأدق — يجيب كل تقييمات المتجر)
              // 2) من المنتجات (reviewStats — مجموع تقييمات كل المنتجات)
              // 3) من بروفايل المتجر مباشرة (store.ratingCount) — متاح فوراً بدون أي API إضافي
              const totalReviews = Math.max(
                sellerReviewsCount || 0,
                reviewStats.totalReviews || 0,
                store?.ratingCount || 0
              );
              const avgRating = Number(
                sellerAverageRating ||
                  reviewStats.weightedAverage ||
                  store?.rating ||
                  0
              );
              const positiveCount = Math.max(
                sellerPositiveCount || 0,
                reviewStats.positiveReviews || 0
              );
              const hasData = totalReviews > 0;

              return (
                <div className="csp-reviews-summary">
                  <div className="csp-reviews-summary-left">
                    <div className="csp-reviews-big-rating">
                      {hasData ? avgRating.toFixed(1) : "—"}
                    </div>
                    <div className="csp-reviews-summary-meta">
                      <StarRating value={avgRating} size={18} />
                      <div className="csp-reviews-count">
                        {totalReviews > 0 ? `${totalReviews} تقييم` : "لا يوجد تقييمات بعد"}
                      </div>
                    </div>
                  </div>
                  {hasData && (
                    <div className="csp-reviews-summary-right">
                      <div className="csp-reviews-summary-stats">
                        <div className="csp-reviews-summary-item">
                          <Award size={16} color="#16a34a" />
                          <span>
                            <strong>{positiveCount}</strong> تقييم إيجابي
                          </span>
                        </div>
                        <div className="csp-reviews-summary-item">
                          <Star size={16} color="#ca8a04" />
                          <span>
                            متوسط <strong>{avgRating.toFixed(1)}</strong> من 5
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {sellerId ? (
              <BuyerProductReviewsSection
                mode="seller"
                sellerId={sellerId}
                title="جميع تقييمات المتجر"
                subtitle="تقييمات العملاء لكل منتجات هذا المتجر"
                showProductTag
                showHeader={false}
                onProductTagClick={handleReviewProductClick}
                onCountLoaded={handleReviewsLoaded}
              />
            ) : (
              <div className="csp-empty-reviews">
                <Package size={32} color="#cbd5e1" />
                <p>لم يتم تحديد متجر — لا يمكن عرض التقييمات</p>
              </div>
            )}
          </section>
        )}

        {activeTab === "about" && (
          <section className="csp-section">
            <div className="csp-about">
              <div className="csp-about-block">
                <h3>
                  <Sparkles size={16} color="#f97316" />
                  عن المتجر
                </h3>
                <p>
                  {description ||
                    "لا يوجد وصف للمتجر بعد. عد لاحقاً للاطلاع على المزيد من المعلومات."}
                </p>
              </div>

              {/* info list */}
              {(joinDate || store?.city || store?.country) && (
                <div className="csp-about-info">
                  {joinDate && (
                    <div className="csp-info-item">
                      <span className="csp-info-icon">
                        <Calendar size={15} />
                      </span>
                      <div>
                        <span className="csp-info-label">تاريخ الانضمام</span>
                        <span className="csp-info-value">{joinDate}</span>
                      </div>
                    </div>
                  )}
                  {(store?.city || store?.country) && (
                    <div className="csp-info-item">
                      <span className="csp-info-icon">
                        <MapPin size={15} />
                      </span>
                      <div>
                        <span className="csp-info-label">الموقع</span>
                        <span className="csp-info-value">
                          {[store?.city, store?.country].filter(Boolean).join("، ")}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="csp-info-item">
                    <span className="csp-info-icon">
                      <Clock size={15} />
                    </span>
                    <div>
                      <span className="csp-info-label">مدة الشحن</span>
                      <span className="csp-info-value">{shippingTime}</span>
                    </div>
                  </div>
                <div className="csp-info-item">
                  <span className="csp-info-icon">
                    <ShieldCheck size={15} />
                  </span>
                  <div>
                    <span className="csp-info-label">حالة المتجر</span>
                    <span className={`csp-info-value ${store?.isTrustedSeller ? "csp-info-value--ok" : ""}`}>
                      {store?.isTrustedSeller ? "موثّق" : "غير موثّق"}
                    </span>
                  </div>
                </div>
                </div>
              )}

              <div className="csp-about-stats">
                <h3>إحصائيات</h3>
                <div className="csp-about-stats-grid">
                  <div className="csp-about-stat">
                    <span className="csp-about-stat-label">عدد المنتجات</span>
                    <span className="csp-about-stat-value">
                      {stats?.activeProducts ?? 0}
                    </span>
                  </div>
                  <div className="csp-about-stat">
                    <span className="csp-about-stat-label">إجمالي التقييمات</span>
                    <span className="csp-about-stat-value">
                      {Math.max(
                        sellerReviewsCount || 0,
                        reviewStats.totalReviews || 0,
                        store?.ratingCount || 0
                      )}
                    </span>
                  </div>
                  <div className="csp-about-stat">
                    <span className="csp-about-stat-label">التقييم الإيجابي</span>
                    <span className="csp-about-stat-value">
                      {Math.max(sellerPositiveCount || 0, reviewStats.positiveReviews || 0)}
                    </span>
                  </div>
                  <div className="csp-about-stat">
                    <span className="csp-about-stat-label">متوسط التقييم</span>
                    <span className="csp-about-stat-value">
                      {Number(
                        sellerAverageRating ||
                          reviewStats.weightedAverage ||
                          store.rating ||
                          0
                      ).toFixed(1)}{" "}
                      / 5
                    </span>
                  </div>
                </div>
              </div>

              <button
                className={`csp-about-msg-btn ${isCurrentUserSeller ? "csp-about-msg-btn--disabled" : ""}`}
                onClick={handleMessageSeller}
                disabled={isCurrentUserSeller}
                aria-disabled={isCurrentUserSeller}
                title={
                  isCurrentUserSeller
                    ? "المراسلة بين البائعين ستتوفر قريباً"
                    : "تواصل مع المتجر"
                }
              >
                <MessageCircle size={18} />
                {isCurrentUserSeller ? "تواصل مع المتجر (قريباً)" : "تواصل مع المتجر"}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
