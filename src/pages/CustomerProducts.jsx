import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, Heart, Plus, Star, Store, SlidersHorizontal,
  ShoppingBag, Loader2, ChevronRight, ChevronLeft, X, AlertCircle,
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
 * الـ "الكل" pseudo-category — دائماً أول عنصر بالـ carousel
 * (مش من الـ API — الباك ما عنده فكرة عن زر "الكل")
 */
const ALL_PSEUDO_CATEGORY = {
  id: "all",
  name: "all",
  nameAr: "الكل",
  iconKey: "default",
};

/**
 * ✅ Fallback categories — تتعرض لما الـ API يرجّع فاضي أو يفشل
 * (نفس الـ shape يلي بيرجّعه `mapCategory` بالـ service)
 * الهدف: الـ carousel يضل فيه تصنيفات ظاهرة دائماً جنب زر "الكل"
 * حتى لو الباك رجّع 401/403/500 أو الـ DB فاضية.
 */
const FALLBACK_CATEGORIES = [
  { id: "fb-electronics", name: "electronics", nameAr: "الإلكترونيات",  iconKey: "electronics", productCount: 0 },
  { id: "fb-food",        name: "food",        nameAr: "المأكولات المنزلية", iconKey: "food",        productCount: 0 },
  { id: "fb-clothes",     name: "clothes",     nameAr: "ملابس",          iconKey: "clothes",     productCount: 0 },
  { id: "fb-handicraft",  name: "handicraft",  nameAr: "الأشغال اليدوية",  iconKey: "handicraft",  productCount: 0 },
  { id: "fb-books",       name: "books",       nameAr: "الكتب",          iconKey: "books",       productCount: 0 },
  { id: "fb-beauty",      name: "beauty",      nameAr: "الجمال والعناية",  iconKey: "beauty",      productCount: 0 },
  { id: "fb-sports",      name: "sports",      nameAr: "الرياضة",        iconKey: "sports",      productCount: 0 },
  { id: "fb-toys",        name: "toys",        nameAr: "الألعاب",        iconKey: "toys",        productCount: 0 },
  { id: "fb-furniture",   name: "furniture",   nameAr: "الأثاث",         iconKey: "furniture",   productCount: 0 },
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
  const [toast, setToast] = useState(null);

  // ── Pagination meta من الباك (للأزرار Prev/Next) ──
  // الباك يرجّع: { totalItems, totalPages, currentPage, pageSize, hasNextPage, hasPreviousPage }
  // بستخدمها للـ "all" + categoryId الحقيقية من الباك (نفس المنطق للـ "كل" والتصنيفات).
  // ملاحظة: الـ pageSize ما بنحدده بالـ frontend — الباك هو اللي بيقرر
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // ── الفئات من الباك (مثل البائع تماماً — مصفوفة فاضية بالبداية) ──
  const [categories, setCategories] = useState([]);
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
        // نفس منطق البائع: استخدم اللي رجّعه الـ API مباشرة
        // ونضيف "الكل" بالبداية كـ pseudo-category للـ reset
        const apiCategories = Array.isArray(list) ? list : [];
        // ✅ لو الـ API رجّع فاضي → نعرض الـ fallback عشان الـ carousel ما يطلع فاضي
        const visible = apiCategories.length > 0 ? apiCategories : FALLBACK_CATEGORIES;
        setCategories([ALL_PSEUDO_CATEGORY, ...visible]);
      } catch (err) {
        console.warn("[categories] فشل جلب الفئات:", err?.message);
        if (!cancelled) {
          // ✅ حتى لو فشل الـ API (401/403/500/Network) → نعرض "الكل" + fallback
          // عشان المشتري يشوف التصنيفات ويستعملها بدل ما يطلعله carousel فاضي
          setCategories([ALL_PSEUDO_CATEGORY, ...FALLBACK_CATEGORIES]);
        }
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

  // ── جلب المنتجات (مع فلترة ذكية) ──
  // ملاحظة: أي تغيير بالـ search/category/minPrice/maxPrice/sortBy لازم يرجع للصفحة 1
  // عشان ما نخلي اليوزر على صفحة 5 مع بحث جديد.
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeCategory, page, minPrice, maxPrice, sortBy]);

  // ✅ helper: reset الصفحة لـ 1 لما يتغير أي فلتر (مش الـ page نفسه)
  const resetToFirstPage = useCallback(() => {
    setPage(1);
    // بنعمل scroll لأعلى الصفحة — رح يطلع فوق الـ grid
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const baseFilters = { page, search: search || undefined };
      if (minPrice) baseFilters.minPrice = minPrice;
      if (maxPrice) baseFilters.maxPrice = maxPrice;
      if (sortBy) baseFilters.sort = sortBy;

      if (activeCategory === "all") {
        // ── كل المنتجات (مع pagination من الباك) ──
        const res = await getPublicProductsWithFilters(baseFilters);
        const list = res.data?.products || [];
        setProducts(list);
        setAllProducts(list);
        setPagination(
          res.data?.pagination ?? {
            totalItems: list.length,
            totalPages: 1,
            currentPage: 1,
            pageSize: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          }
        );
      } else {
        // ── فئة حقيقية من الباك — نرسل categoryId (مع pagination من الباك) ──
        // (نفس منطق البائع — الـ ID دايماً UUID حقيقي من الـ API)
        const res = await getPublicProductsWithFilters({
          ...baseFilters,
          categoryId: activeCategory,
        });
        const list = res.data?.products || [];
        setProducts(list);
        setAllProducts(list);
        setPagination(
          res.data?.pagination ?? {
            totalItems: list.length,
            totalPages: 1,
            currentPage: 1,
            pageSize: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          }
        );
      }
    } catch (err) {
      console.error("[products] fetch error:", err);
      setError(err.message || "حدث خطأ في جلب المنتجات");
      setProducts([]);
      // ✅ reset pagination عند الفشل
      setPagination({
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        pageSize: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });
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
    setPage(1);
  };

  // ✅ handlers for filter changes — always reset to page 1
  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };
  const handleMinPriceChange = (val) => {
    setMinPrice(val);
    setPage(1);
  };
  const handleMaxPriceChange = (val) => {
    setMaxPrice(val);
    setPage(1);
  };
  const handleSortChange = (val) => {
    setSortBy(val);
    setPage(1);
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

  const handleAddToCart = async (e, product) => {
    e.stopPropagation();
    try {
      await addItem(product);
      setToast({ message: "تمت إضافة المنتج إلى السلة", type: "success" });
    } catch (err) {
      const msg = err.response?.data?.data?.message || err.message || "حدث خطأ ما";
      setToast({ message: msg, type: "error" });
    }
  };

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
            onChange={(e) => handleSearchChange(e.target.value)}
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
                  value={minPrice} onChange={(e) => handleMinPriceChange(e.target.value)} />
                <span>-</span>
                <input type="number" placeholder="إلى" className="cp-price-input"
                  value={maxPrice} onChange={(e) => handleMaxPriceChange(e.target.value)} />
              </div>
            </div>
            <div className="cp-filter-popup-section">
              <h4 className="cp-filter-popup-title">الترتيب حسب</h4>
              <select className="cp-sort-select" value={sortBy} onChange={(e) => handleSortChange(e.target.value)}>
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
              <span>
                {pagination.totalItems > 0
                  ? `${pagination.totalItems} منتج`
                  : `${products.length} منتج`}
              </span>
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
            <>
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
                          {/* ✅ Status badge: محدود + كمية 0 → "نفذ"
                              أي حالة ثانية (limited + quantity > 0، أو unlimited) → "متوفر" */}
                          {product.stockType === "limited" && Number(product.quantity) === 0
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

                        <p className="cp-qty">
                          {/* ✅ عرض الكمية بشكل صحيح بناءً على نوع المخزون:
                              - stockType === "unlimited" → "غير محدود"
                              - غير هيك → نعرض الكمية الحقيقية (أو 0 إذا ما متوفرة) */}
                          {product.stockType === "unlimited"
                            ? "الكمية: غير محدود"
                            : `الكمية: ${Number(product.quantity ?? 0)}`}
                        </p>

                        <button
                          className="cp-add-btn"
                          onClick={(e) => handleAddToCart(e, product)}
                        >
                          <Plus size={16} />
                          أضف
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* ═══════ Prev/Next pagination (بس لما في أكثر من صفحة) ═══════
                  ✅ أزرار بأيقونات فقط — touch target 40px+ على الموبايل */}
              {pagination.totalPages > 1 && (
                <div className="cp-pagination" role="navigation" aria-label="ترقيم صفحات المنتجات">
                  <button
                    type="button"
                    className="cp-page-btn cp-page-btn--prev"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.hasPreviousPage || loading}
                    aria-label="الصفحة السابقة"
                    title="الصفحة السابقة"
                  >
                    <ChevronRight size={18} />
                  </button>

                  <span className="cp-page-info" aria-live="polite">
                    صفحة <strong>{pagination.currentPage}</strong> من <strong>{pagination.totalPages}</strong>
                    <span className="cp-page-total">({pagination.totalItems} منتج)</span>
                  </span>

                  <button
                    type="button"
                    className="cp-page-btn cp-page-btn--next"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={!pagination.hasNextPage || loading}
                    aria-label="الصفحة التالية"
                    title="الصفحة التالية"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {toast && (
        <div className={`cp-toast cp-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
