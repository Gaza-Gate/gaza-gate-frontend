import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, Heart, Plus, Star, Store, SlidersHorizontal,
  ShoppingBag, Monitor, Shirt, Hammer, UtensilsCrossed,
  BookOpen, Sparkles, Trophy, Gamepad2, Sofa, Package, Loader2,
  ChevronRight, ChevronLeft, X, AlertCircle,
} from "lucide-react";

import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import {
  getPublicProductsWithFilters,
  getPublicCategories,
} from "../services/productService";
import { storeProfilePath } from "../utils/sellerHelpers";
import logo from "../assets/logo.png";
import {
  EmptyState,
  ErrorState,
  ProductGridSkeleton,
} from "../components/LoadingState";
import "./CustomerProducts.css";

/**
 * خريطة الأيقونات حسب iconKey
 */
const ICON_BY_KEY = {
  food:        UtensilsCrossed,
  clothes:     Shirt,
  handicraft:  Hammer,
  electronics: Monitor,
  books:       BookOpen,
  beauty:      Sparkles,
  sports:      Trophy,
  toys:        Gamepad2,
  furniture:   Sofa,
  default:     Package,
};

/**
 * Fallback categories — تُستخدم لما الباك ما يرجع فئات من /api/category/public
 *
 * كل فئة لها:
 *  - id:         معرّف محلي (نبدأ بـ "__" لتمييزه عن UUIDs الحقيقية)
 *  - nameAr:     الاسم بالعربي للعرض
 *  - nameMatches: مصفوفة بأسماء (بالإنجليزي أو العربي) تُطابق product.category.name
 *                عند الفلترة client-side (لأن الـ id محلي)
 *  - isFallback: true = فلتر client-side
 */
const FALLBACK_CATEGORIES = [
  {
    id: "all", name: "all", nameAr: "الكل", iconKey: "default",
    nameMatches: [], isFallback: true,
  },
  {
    id: "__food", name: "food", nameAr: "المأكولات المنزلية", iconKey: "food",
    nameMatches: ["Food", "food", "المأكولات المنزلية", "مأكولات منزلية", "Home Food", "home food", "homemade"],
    isFallback: true,
  },
  {
    id: "__clothes", name: "clothes", nameAr: "ملابس", iconKey: "clothes",
    nameMatches: ["Clothes", "clothes", "ملابس", "Clothing", "clothing", "Fashion", "fashion"],
    isFallback: true,
  },
  {
    id: "__handicraft", name: "handicraft", nameAr: "الأشغال اليدوية", iconKey: "handicraft",
    nameMatches: ["Handicraft", "handicraft", "Handicrafts", "handicrafts", "الأشغال اليدوية", "أشغال يدوية", "Hand Made", "Handmade", "handmade"],
    isFallback: true,
  },
  {
    id: "__electronics", name: "electronics", nameAr: "الإلكترونيات", iconKey: "electronics",
    nameMatches: ["Electronics", "electronics", "Electronic", "electronic", "الإلكترونيات", "إلكترونيات", "Tech", "tech"],
    isFallback: true,
  },
];

export default function CustomerProducts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // للفلترة client-side
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ── الفئات من الباك أو fallback ──
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // ── Carousel state للـ categories ──
  const catScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateCatScrollState = useCallback(() => {
    const el = catScrollRef.current;
    if (!el) return;
    // RTL: scrollLeft سالب عادة
    setCanScrollLeft(el.scrollLeft < 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateCatScrollState();
    const el = catScrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateCatScrollState, { passive: true });
    window.addEventListener("resize", updateCatScrollState);
    return () => {
      el.removeEventListener("scroll", updateCatScrollState);
      window.removeEventListener("resize", updateCatScrollState);
    };
  }, [categories, updateCatScrollState]);

  const scrollCategories = useCallback((dir) => {
    const el = catScrollRef.current;
    if (!el) return;
    // في RTL: dir = "right" يعني نتحرك لليمين (نكشف اللي بعده)
    const amount = el.clientWidth * 0.7;
    el.scrollBy({
      left: dir === "right" ? -amount : amount,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setCategoriesLoading(true);
        const list = await getPublicCategories();
        if (cancelled) return;
        if (Array.isArray(list) && list.length > 0) {
          // الباك رجّع فئات حقيقية — استخدمها
          setCategories([
            { id: "all", name: "all", nameAr: "الكل", iconKey: "default", nameMatches: [], isFallback: true },
            ...list.map((c) => ({ ...c, isFallback: false })),
          ]);
        } else {
          setCategories(FALLBACK_CATEGORIES);
        }
      } catch (err) {
        console.warn("[categories] fallback to local list:", err.message);
        setCategories(FALLBACK_CATEGORIES);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // قراءة الفئة من URL
  useEffect(() => {
    const categoryFromUrl = searchParams.get("category");
    if (categoryFromUrl) setActiveCategory(categoryFromUrl);
  }, [searchParams]);

  // البحث عن الفئة النشطة (للحصول على isFallback)
  const activeCat = categories.find((c) => c.id === activeCategory) || categories[0];

  // ── جلب المنتجات (مع فلترة ذكية) ──
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeCategory, page, minPrice, maxPrice, sortBy]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const isFallbackCat = activeCat?.isFallback;
      const baseFilters = { page, search: search || undefined };
      if (minPrice) baseFilters.minPrice = minPrice;
      if (maxPrice) baseFilters.maxPrice = maxPrice;
      if (sortBy) baseFilters.sort = sortBy;

      if (isFallbackCat && activeCategory !== "all") {
        // ── فلتر محلي: نجيب كل المنتجات ثم نفلتر حسب nameMatches ──
        const res = await getPublicProductsWithFilters({ ...baseFilters, page: 1 });
        const all = res.data?.products || [];
        setAllProducts(all);
        const nameMatches = activeCat.nameMatches.map((n) => n.toLowerCase());
        const filtered = all.filter((p) => {
          const catName = String(p.category?.name || "").toLowerCase();
          return nameMatches.some((m) => catName === m || catName.includes(m));
        });
        setProducts(filtered);
      } else if (activeCategory === "all") {
        // ── كل المنتجات ──
        const res = await getPublicProductsWithFilters(baseFilters);
        const list = res.data?.products || [];
        setProducts(list);
        setAllProducts(list);
      } else {
        // ── فئة حقيقية من الباك — نرسل categoryId ──
        const res = await getPublicProductsWithFilters({
          ...baseFilters,
          categoryId: activeCategory,
        });
        const list = res.data?.products || [];
        setProducts(list);
        setAllProducts(list);
      }
    } catch (err) {
      console.error("[products] fetch error:", err);
      setError(err.message || "حدث خطأ في جلب المنتجات");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setActiveCategory("all");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("");
  };

  /**
   * يودّي المشتري على صفحة البائع/المتجر
   * بيدعم أكثر من path للـ seller ID (تبعاً لـ API response shape)
   */
  const goToStore = useCallback(
    (product) => {
      // استخدم الـ helper الموحّد — بيتعامل مع كل الـ shapes
      const path = storeProfilePath(product);
      if (path) {
        navigate(path);
      } else {
        console.warn("[Products] لا يوجد seller ID لهذا المنتج:", product?.id, product?.seller);
      }
    },
    [navigate]
  );

  return (
    <div className="cp-wrapper" dir="rtl">
      <main className="cp-main">
        <header className="cp-header">
          <h1>جميع المنتجات</h1>
          <p>تصفح وابحث في مئات المنتجات</p>
        </header>

        <div className="cp-search-wrap">
          <Search size={18} className="cp-search-icon" />
          <input
            type="text"
            className="cp-search-input"
            placeholder="ابحث عن منتج أو متجر..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className={`cp-filter-toggle ${showFilters ? "active" : ""}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {showFilters && (
          <div className="cp-filters-popup">
            <div className="cp-filter-popup-section">
              <h4 className="cp-filter-popup-title">السعر</h4>
              <div className="cp-price-filter">
                <input type="number" placeholder="من" className="cp-price-input"
                  value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                <span>-</span>
                <input type="number" placeholder="إلى" className="cp-price-input"
                  value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
              </div>
            </div>
            <div className="cp-filter-popup-section">
              <h4 className="cp-filter-popup-title">الترتيب حسب</h4>
              <select className="cp-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="">الافتراضي</option>
                <option value="price_asc">السعر: من الأقل للأعلى</option>
                <option value="price_desc">السعر: من الأعلى للأقل</option>
                <option value="rating_desc">التقييم: الأعلى أولاً</option>
                <option value="newest">الأحدث</option>
              </select>
            </div>
            <button className="cp-reset-btn" onClick={handleResetFilters}>
              إعادة تعيين الفلاتر
            </button>
          </div>
        )}

        <div className="cp-content">
          <div className="cp-toolbar">
            <div
              className={`cp-categories-wrap ${canScrollLeft ? "has-scroll-left" : ""} ${canScrollRight ? "has-scroll-right" : ""}`}
            >
              {canScrollLeft && (
                <button
                  type="button"
                  className="cp-cat-arrow cp-cat-arrow--left"
                  onClick={() => scrollCategories("left")}
                  aria-label="اسحب لليسار"
                >
                  <ChevronLeft size={18} />
                </button>
              )}

              <div className="cp-categories" ref={catScrollRef}>
                {categoriesLoading ? (
                  <div className="cp-categories-loading">
                    <Loader2 size={16} className="cp-spin" />
                    <span>جاري تحميل الفئات…</span>
                  </div>
                ) : categories.length === 0 ? (
                  <div className="cp-categories-empty">لا توجد فئات</div>
                ) : (
                  categories.map((cat) => {
                    const Icon = ICON_BY_KEY[cat.iconKey] || Package;
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        className={`cp-category-btn ${isActive ? "active" : ""}`}
                        onClick={() => {
                          setActiveCategory(cat.id);
                          setPage(1);
                        }}
                        title={cat.nameAr}
                      >
                        <Icon size={15} />
                        <span className="cp-category-label">{cat.nameAr}</span>
                        {cat.productCount > 0 && cat.id !== "all" && (
                          <span className="cp-category-count">{cat.productCount}</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {canScrollRight && (
                <button
                  type="button"
                  className="cp-cat-arrow cp-cat-arrow--right"
                  onClick={() => scrollCategories("right")}
                  aria-label="اسحب لليمين"
                >
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
            <div className="cp-count">
              <SlidersHorizontal size={16} />
              <span>{products.length} منتج</span>
            </div>
          </div>

          {loading ? (
            <ProductGridSkeleton count={8} columns={4} />
          ) : error ? (
            <ErrorState
              icon={AlertCircle}
              title="حدث خطأ"
              message={error}
              onRetry={() => window.location.reload()}
            />
          ) : products.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="لا توجد منتجات"
              description="جرّب تغيير البحث أو الفئة"
            />
          ) : (
            <div className="cp-grid">
              {products.map((product) => {
                const wishlisted = isWishlisted(product.id);
                const productId = product.id;
                const productImage =
                  product.primaryImage?.imageUrl ??
                  product.primaryImage ??
                  product.image ??
                  logo;
                return (
                  <article
                    className="cp-card cp-card--clickable"
                    key={productId}
                    onClick={() => navigate(`/product/${productId}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/product/${productId}`);
                      }
                    }}
                  >
                    <div className="cp-card-img-wrap">
                      <img src={productImage} alt={product.name} />
                      <button
                        className={`cp-wishlist-btn ${wishlisted ? "active" : ""}`}
                        aria-label="إضافة للمفضلة"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(product);
                        }}
                      >
                        <Heart size={16} fill={wishlisted ? "currentColor" : "none"} />
                      </button>
                      <span className="cp-cat-badge">
                        {product.category?.name ?? "منتج"}
                      </span>
                    </div>

                    <div className="cp-card-body">
                      <span className="cp-status">
                        {product.stockType === "limited" && Number(product.quantity) > 0
                          ? "متوفر"
                          : product.stockType === "limited" && Number(product.quantity) === 0
                          ? "نفذ"
                          : "متوفر"}
                      </span>
                      <h3 className="cp-card-title">{product.name}</h3>

                      {(() => {
                        const storePath = storeProfilePath(product);
                        // لو ما عندنا seller ID (API response قديم) → plain text
                        if (!storePath) {
                          return (
                            <div className="cp-store cp-store--static">
                              <Store size={13} />
                              <span>{product.seller?.storeName || "متجر"}</span>
                            </div>
                          );
                        }
                        // ✅ <Link> من react-router-dom — يفتح صفحة المتجر
                        // stopPropagation يمنع parent card من الـ navigate لـ /product/:id
                        return (
                          <Link
                            to={storePath}
                            className="cp-store cp-store--link"
                            onClick={(e) => e.stopPropagation()}
                            title={`زيارة متجر ${product.seller?.storeName || "البائع"}`}
                            aria-label={`زيارة متجر ${product.seller?.storeName || "البائع"}`}
                          >
                            <Store size={13} />
                            <span>{product.seller?.storeName || "متجر"}</span>
                          </Link>
                        );
                      })()}

                      <div className="cp-meta">
                        <div className="cp-rating">
                          <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
                          <span>{Number(product.averageRating ?? 0).toFixed(1)}</span>
                          {Number(product.reviewsCount ?? 0) > 0 && (
                            <span className="cp-rating-count">({product.reviewsCount})</span>
                          )}
                        </div>
                        <span className="cp-price">{Number(product.price ?? 0).toFixed(2)}₪</span>
                      </div>

                      <p className="cp-qty">الكمية: {product.quantity ?? 0}</p>

                      <button
                        className="cp-add-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          addItem(product);
                        }}
                      >
                        <Plus size={16} />
                        أضف
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
