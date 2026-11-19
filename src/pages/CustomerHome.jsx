import { useEffect, useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";

import {
  ShoppingCart,
  Package,
  ArrowLeft,
  Search,
  CreditCard,
  PackagePlus,
  Loader2,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { getPublicProducts, getPublicCategories } from "../services/productService";
import HeroSlider from "../components/HeroSlider";
import logoFallback from "../assets/logo.png";
import "./CustomerHome.css";

/**
 * ✅ Fallback categories — بتتعرض لما الـ API يرجّع فاضي أو يفشل
 * (نفس الـ shape والـ IDs اللي بـ CustomerProducts.jsx — كل ID بـ "fb-" prefix
 *  عشان ما يتعارض مع UUIDs الحقيقية من الباك)
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


const howItWorks = [
  { Icon: Package, title: "استقبل طلبك", desc: "تتبع طلبك حتى يصل لبابك" },
  { Icon: CreditCard, title: "ادفع بأمان", desc: "ادفع بطريقتك المفضلة بأمان تام" },
  { Icon: ShoppingCart, title: "أضف للسلة", desc: "أضف ما يعجبك للسلة بنقرة واحدة" },
  { Icon: Search, title: "تصفح وابحث", desc: "ابحث في آلاف المنتجات وفلتر حسب الفئة" },
];

// ── Skeleton Card (يظهر وقت تحميل المنتجات) ──
const ProductSkeleton = memo(function ProductSkeleton() {
  return (
    <div className="home-product-card home-product-skeleton" aria-hidden="true">
      <div className="home-product-img skel-block" />
      <div className="home-product-info">
        <div className="skel-line skel-line--sm" />
        <div className="skel-line skel-line--md" />
        <div className="skel-line skel-line--xs" />
      </div>
    </div>
  );
});

// ── Product Card (memoized — ما يعيد render إلا إذا تغيّر المنتج) ──
const ProductCard = memo(function ProductCard({ product, onOpen }) {
  const imageUrl = product.primaryImage?.imageUrl || logoFallback;
  const handleClick = useCallback(() => onOpen(product.id), [product.id, onOpen]);
  const handleKey = useCallback((e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return (
    <div
      className="home-product-card home-product-card--clickable"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKey}
    >
      <div className="home-product-img">
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
          decoding="async"
          width={300}
          height={190}
        />
      </div>
      <div className="home-product-info">
        <span className="home-product-status">{product.status || "متوفر"}</span>
        <h4>{product.name}</h4>
        <div className="home-product-row">
          <span className="home-product-price">{product.price}₪</span>
          <span className="home-product-qty">الكمية: {product.quantity || 0}</span>
        </div>
      </div>
    </div>
  );
});

export default function CustomerHome() {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();

  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ✅ الفئات من الباك — نفس منطق CustomerProducts.jsx بالظبط
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    // ✅ mounted flag — يمنع setState بعد ما الـ component يتفكك
    let mounted = true;
    (async () => {
      try {
        const response = await getPublicProducts(1);
        if (!mounted) return;
        setFeaturedProducts(response.data?.products?.slice(0, 6) || []);
      } catch (err) {
        if (!mounted) return;
        console.error("Error fetching featured products:", err);
        setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ✅ جلب الفئات من الباك (/api/category/all) — نفس منطق CustomerProducts.jsx
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setCategoriesLoading(true);
        const list = await getPublicCategories();
        if (cancelled) return;
        const apiCategories = Array.isArray(list) ? list : [];
        // ✅ لو الـ API رجّع فاضي → نعرض الـ fallback عشان قسم "تصفح الأقسام" ما يطلع فاضي
        const visible = apiCategories.length > 0 ? apiCategories : FALLBACK_CATEGORIES;
        setCategories(visible);
      } catch (err) {
        console.warn("[home-categories] فشل جلب الفئات:", err?.message);
        if (!cancelled) {
          setCategories(FALLBACK_CATEGORIES);
        }
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const goToProduct = useCallback((id) => navigate(`/product/${id}`), [navigate]);
  const goToProducts = useCallback(() => navigate("/products"), [navigate]);

  return (
    <div className="home-wrapper" dir="rtl">
      

      {/* ── Hero Slider (يستبدل الـ Hero Banner القديم) ── */}
      <HeroSlider />

      {/* ── الأقسام ── */}
      <section className="home-section">
        <div className="home-section-head">
          <h2>تصفح الأقسام</h2>
          <button className="home-link-btn" onClick={goToProducts}>
            عرض الكل
            <ArrowLeft size={15} />
          </button>
        </div>

       <div className="home-categories">
    {categoriesLoading ? (
      <div className="home-categories-loading">
        <Loader2 size={20} className="home-spin" />
        <span>جاري تحميل الأقسام…</span>
      </div>
    ) : categories.length === 0 ? (
      <div className="home-categories-empty">لا توجد أقسام حالياً</div>
    ) : (
      // ✅ أول 4 أقسام بس — بدون أيقونة، اسم القسم فقط
      categories.slice(0, 4).map((cat) => (
        <button
          key={cat.id}
          className="home-category-card"
          onClick={() => navigate(`/products?category=${encodeURIComponent(cat.id)}`)}
          aria-label={`تصفح قسم ${cat.nameAr}`}
          title={cat.nameAr}
        >
          <span className="home-category-label">{cat.nameAr}</span>
        </button>
      ))
    )}
  </div>
      </section>

      {/* ── بانرات العروض ── */}
      <section className="home-section">
        <div className="home-banners">
          <div className="home-banner home-banner--dark">
            <span className="home-banner-eyebrow">موسم الأزياء</span>
            <h3>أحدث التشكيلات</h3>
            <p>ملابس عصرية لجميع المناسبات</p>
            <button className="home-banner-btn">تسوق الآن</button>
          </div>

          <div className="home-banner home-banner--orange">
            <PackagePlus size={130} className="home-banner-deco" />
            <span className="home-banner-eyebrow">عروض الإلكترونيات</span>
            <h3>خصم حتى 30%</h3>
            <p>على أحدث الهواتف واللابتوبات</p>
            <button className="home-banner-btn home-banner-btn--light">اكتشف الآن</button>
          </div>
        </div>
      </section>

      {/* ── منتجات مميزة ── */}
      <section className="home-section" >
        <div className="home-section-head">
          <h2>منتجات مميزة</h2>
          <button className="home-link-btn" onClick={goToProducts}>
            عرض الكل
            <ArrowLeft size={15} />
          </button>
        </div>

        <div className="home-products">
          {loading ? (
            <>
              <ProductSkeleton />
              <ProductSkeleton />
              <ProductSkeleton />
            </>
          ) : error ? (
            <p className="home-products-msg home-products-msg--err">
              تعذّر تحميل المنتجات. حاول مرة ثانية لاحقاً.
            </p>
          ) : featuredProducts.length === 0 ? (
            <p className="home-products-msg">لا توجد منتجات مميزة حالياً.</p>
          ) : (
            featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} onOpen={goToProduct} />
            ))
          )}
        </div>
      </section>

      {/* ── كيف يعمل سوق؟ ── */}
      <section className="home-section home-howitworks">
        <h2 className="home-howitworks-title">كيف يعمل سوق؟</h2>
        <div className="home-steps">
          {howItWorks.map(({ Icon, title, desc }) => (
            <div className="home-step" key={title}>
              <span className="home-step-icon">
                <Icon size={22} />
              </span>
              <h4>{title}</h4>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}