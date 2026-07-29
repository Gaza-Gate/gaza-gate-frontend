import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";

import {
  ShoppingCart,
  Package,
  ArrowLeft,
  Search,
  CreditCard,
  PackagePlus,
  Monitor,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { getPublicProducts } from "../services/productService";
import { getCurrentUser } from "../services/authService";
import heroBanner from "../assets/hero-banner.webp";
import handcraftIconImg from "../assets/icon-park-outline_traditional-chinese-medicine.jpg";
import foodIconImg from "../assets/ion_fast-food-outline.png";
import clothesIconImg from "../assets/hugeicons_clothes.jpg";
import logoFallback from "../assets/logo.png";
import "./CustomerHome.css";


// ── بيانات الأقسام والمنتجات والبانرات ──
const categories = [
  { id: "handicraft", label: "الأشغال اليدوية", iconSrc: handcraftIconImg },
  { id: "food", label: "المأكولات المنزلية", iconSrc: foodIconImg },
  { id: "clothes", label: "ملابس", iconSrc: clothesIconImg },
  { id: "electronics", label: "الإلكترونيات", icon: Monitor },
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

  // ✅ اسم حقيقي من auth (يقرأ من localStorage بدون API call)
  const userName = useMemo(() => {
    const user = getCurrentUser();
    if (!user) return "ضيف";
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return name || user.email?.split("@")[0] || "ضيف";
  }, []);

  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  const goToProduct = useCallback((id) => navigate(`/product/${id}`), [navigate]);
  const goToProducts = useCallback(() => navigate("/products"), [navigate]);

  return (
    <div className="home-wrapper" dir="rtl">
      

      {/* ── Hero ── */}
      <section className="home-hero">
        {/* ✅ WebP فقط — أصغر 99% من PNG الأصلي (~96KB vs 14MB) — مدعوم في 96%+ من المتصفحات */}
        <img
          src={heroBanner}
          alt=""
          className="home-hero-bg"
          // ✅ above-the-fold → eager + high priority عشان تظهر فوراً
          loading="eager"
          fetchpriority="high"
          decoding="async"
          width={1920}
          height={600}
        />
        <div className="home-hero-overlay" />

        <div className="home-hero-content">
          <span className="home-hero-pill">مرحبا {userName} </span>
          <h1 className="home-hero-title">
            تسوق بذكاء
            <br />
            وعش الفرق
          </h1>
          <p className="home-hero-text">
            آلاف المنتجات من أفضل المتاجر بأسعار لا تُقاوم. شحن مجاني وإرجاع سهل خلال 14 يوم.
          </p>
          <button className="home-hero-btn" onClick={goToProducts}>
            تسوق الان
          </button>
        </div>
      </section>

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
    {categories.map(({ id, label, iconSrc, icon: Icon }) => (
      <button
        key={id}
        className="home-category-card"
        onClick={() => navigate(`/products?category=${id}`)}
      >
        <span className="home-category-icon">
          {iconSrc ? (
            <img
              src={iconSrc}
              alt={label}
              loading="lazy"
              decoding="async"
              width={28}
              height={28}
            />
          ) : (
            Icon && <Icon size={28} />
          )}
        </span>
        {label}
      </button>
    ))}
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