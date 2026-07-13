import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatbotWidget from "../components/ChatbotWidget";

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
import logo from "../assets/logo.png";
import heroBanner from "../assets/hero-banner.png";
import handcraftIconImg from "../assets/icon-park-outline_traditional-chinese-medicine.jpg";
import foodIconImg from "../assets/ion_fast-food-outline.png";
import clothesIconImg from "../assets/hugeicons_clothes.jpg";
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

export default function CustomerHome() {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const userName = "أحمد";
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const response = await getPublicProducts(1);
      setFeaturedProducts(response.data?.products?.slice(0, 3) || []);
    } catch (err) {
      console.error("Error fetching featured products:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-wrapper" dir="rtl">
      

      {/* ── Hero ── */}
      <section className="home-hero">
        <img src={heroBanner} alt="" className="home-hero-bg" />
        <div className="home-hero-overlay" />

        <div className="home-hero-content">
          <span className="home-hero-pill">مرحبا {userName}, عروض اليوم تصل حتى خصم 40%</span>
          <h1 className="home-hero-title">
            تسوق بذكاء
            <br />
            وعش الفرق
          </h1>
          <p className="home-hero-text">
            آلاف المنتجات من أفضل المتاجر بأسعار لا تُقاوم. شحن مجاني وإرجاع سهل خلال 14 يوم.
          </p>
          <button className="home-hero-btn" onClick={() => navigate("/products")}>
            تسوق الان
          </button>
        </div>
      </section>

      {/* ── الأقسام ── */}
      <section className="home-section">
        <div className="home-section-head">
          <h2>تصفح الأقسام</h2>
          <button className="home-link-btn" onClick={() => navigate("/products")}>
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
              style={{ width: '28px', height: '28px', objectFit: 'contain' }} 
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
          <button className="home-link-btn" onClick={() => navigate("/products")}>
            عرض الكل
            <ArrowLeft size={15} />
          </button>
        </div>

        <div className="home-products">
          {loading ? (
            <p>جاري التحميل...</p>
          ) : featuredProducts.length === 0 ? (
            <p>لا توجد منتجات مميزة</p>
          ) : (
            featuredProducts.map((p) => (
              <div
                className="home-product-card home-product-card--clickable"
                key={p.id}
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
                <div className="home-product-img">
                  <img src={p.primaryImage?.imageUrl || logo} alt={p.name} />
                </div>
                <div className="home-product-info">
                  <span className="home-product-status">{p.status || "متوفر"}</span>
                  <h4>{p.name}</h4>
                  <div className="home-product-row">
                    <span className="home-product-price">{p.price}₪</span>
                    <span className="home-product-qty">الكمية: {p.quantity || 0}</span>
                  </div>
                </div>
              </div>
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
       <ChatbotWidget />
    </div>
  );
}