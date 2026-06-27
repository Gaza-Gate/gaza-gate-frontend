import { useNavigate } from "react-router-dom";
import {
  LogOut,
  ShoppingCart,
  AlignJustify,
  User,
  Package,
  ShoppingBag,
  ArrowLeft,
  Search,
  Gift,
  CreditCard,
  Truck,
} from "lucide-react";
import logo from "../assets/logo.png";
import heroImg from "../assets/hero-shopping.png";
import "./CustomerHome.css";

// ── أيقونات الأقسام ──
const HandcraftIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M7 21c-2-1-3-3-3-5V9a2 2 0 012-2 2 2 0 012 2v4" />
    <path d="M9 13V6a2 2 0 014 0v6" />
    <path d="M13 12V5a2 2 0 014 0v8" />
    <path d="M17 13V8a2 2 0 014 0v6c0 3-1 6-4 7H9" />
  </svg>
);

const FoodIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 11h18" />
    <path d="M4 11a8 8 0 0116 0" />
    <path d="M3 11c0 4 2 7 4 9h10c2-2 4-5 4-9" />
    <path d="M9 3c-1 1-1 2 0 3" />
    <path d="M12 3c-1 1-1 2 0 3" />
  </svg>
);

const ClothesIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M9 4l3 2 3-2 4 3-2 3-2-1v11H8V9l-2 1-2-3z" />
  </svg>
);

// ── بيانات ──
const categories = [
  { id: 1, label: "الأشغال اليدوية", Icon: HandcraftIcon },
  { id: 2, label: "المأكولات المنزلية", Icon: FoodIcon },
  { id: 3, label: "ملابس", Icon: ClothesIcon },
];

const featuredProducts = [
  {
    id: 1,
    name: "جمبري",
    price: 100,
    qty: 10,
    status: "نشط",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
  },
  {
    id: 2,
    name: "قميص قطني كاجوال",
    price: 95,
    qty: 10,
    status: "نشط",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80",
  },
  {
    id: 3,
    name: "زيت زيتون اصلي",
    price: 45,
    qty: 20,
    status: "نشط",
    image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80",
  },
];

const howItWorks = [
  { Icon: Search,      title: "تصفح وابحث",  desc: "ابحث في آلاف المنتجات وفلتر حسب الفئة" },
  { Icon: ShoppingCart,title: "أضف للسلة",   desc: "أضف ما يعجبك للسلة بنقرة واحدة" },
  { Icon: CreditCard,  title: "ادفع بأمان",  desc: "ادفع بطريقتك المفضلة بأمان تام" },
  { Icon: ShoppingBag, title: "استقبل طلبك", desc: "تتبع طلبك حتى يصل لبابك" },
];

export default function CustomerHome() {
  const navigate = useNavigate();
  const userName = "أحمد";

  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    navigate("/login/customer");
  };

  return (
    <div className="home-wrapper" dir="rtl">

      {/* ══ Navbar ══ */}
      <nav className="home-nav">
        <div className="home-nav-side">
          <button className="home-icon-btn" aria-label="خروج" onClick={handleLogout}>
            <LogOut size={18} />
            <span>خروج</span>
          </button>
          <button className="home-icon-btn home-icon-btn--ghost" aria-label="السلة" onClick={() => navigate("/cart")}>
            <ShoppingCart size={18} />
          </button>
          <button className="home-icon-btn home-icon-btn--ghost" aria-label="القائمة">
            <AlignJustify size={18} />
          </button>
        </div>

        <div className="home-nav-links">
          <a href="#orders" className="home-nav-link">
            طلباتي <User size={15} />
          </a>
          <a href="#products" className="home-nav-link">
            المنتجات <Package size={15} />
          </a>
          <button className="home-nav-btn" onClick={() => navigate("/")}>
            الرئيسية <ShoppingCart size={15} />
          </button>
        </div>

        <img src={logo} alt="بوابة غزة" className="home-nav-logo" />
      </nav>

      {/* ══ Hero ══ */}
      <section className="home-hero">
        {/* طبقة التدرج اللوني */}
        <div className="home-hero-overlay" />

        {/* صورة اليمين */}
        <div className="home-hero-img-wrap">
          <img src={heroImg} alt="تسوق إلكتروني" className="home-hero-img" />
        </div>

        {/* المحتوى النصي */}
        <div className="home-hero-content">
          <span className="home-hero-pill">
            مرحبا {userName}, عروض اليوم تصل حتى خصم 40%
          </span>
          <h1 className="home-hero-title">
            تسوق بذكاء<br />وعش الفرق
          </h1>
          <p className="home-hero-text">
            آلاف المنتجات من أفضل المتاجر بأسعار لا تُقاوم.
            شحن مجاني وإرجاع سهل خلال 14 يوم.
          </p>
          <button className="home-hero-btn" onClick={() => navigate("/products")}>
            تسوق الآن
          </button>
        </div>
      </section>

      {/* ══ الأقسام ══ */}
      <section className="home-section">
        <div className="home-section-head">
          <h2>تصفح الأقسام</h2>
          <button className="home-link-btn">
            عرض الكل <ArrowLeft size={15} />
          </button>
        </div>
        <div className="home-categories">
          {categories.map(({ id, label, Icon }) => (
            <button key={id} className="home-category-card">
              <span className="home-category-icon"><Icon /></span>
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* ══ بانرات العروض ══ */}
      <section className="home-section">
        <div className="home-banners">
          <div className="home-banner home-banner--dark">
            <span className="home-banner-eyebrow">موسم الأزياء</span>
            <h3>أحدث التشكيلات</h3>
            <p>ملابس عصرية لجميع المناسبات</p>
            <button className="home-banner-btn">تسوق الآن</button>
          </div>
          <div className="home-banner home-banner--orange">
            <Gift size={130} className="home-banner-deco" />
            <span className="home-banner-eyebrow">عروض الإلكترونيات</span>
            <h3>خصم حتى 30%</h3>
            <p>على أحدث الهواتف واللابتوبات</p>
            <button className="home-banner-btn home-banner-btn--light">اكتشف الآن</button>
          </div>
        </div>
      </section>

      {/* ══ منتجات مميزة ══ */}
      <section className="home-section" id="products">
        <div className="home-section-head">
          <h2>منتجات مميزة</h2>
          <button className="home-link-btn">
            عرض الكل <ArrowLeft size={15} />
          </button>
        </div>
        <div className="home-products">
          {featuredProducts.map((p) => (
            <div className="home-product-card" key={p.id}>
              <div className="home-product-img">
                <img src={p.image} alt={p.name} loading="lazy" />
              </div>
              <div className="home-product-info">
                <span className="home-product-status">{p.status}</span>
                <h4>{p.name}</h4>
                <div className="home-product-row">
                  <span className="home-product-price">{p.price}₪</span>
                  <span className="home-product-qty">الكمية: {p.qty}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ كيف يعمل سوق؟ ══ */}
      <section className="home-section home-howitworks">
        <h2 className="home-howitworks-title">كيف يعمل سوق؟</h2>
        <div className="home-steps">
          {howItWorks.map(({ Icon, title, desc }) => (
            <div className="home-step" key={title}>
              <span className="home-step-icon"><Icon size={22} /></span>
              <h4>{title}</h4>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}