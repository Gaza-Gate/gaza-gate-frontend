import { useNavigate } from "react-router-dom";
import {
  LogOut,
  ShoppingCart,
  User,
  Package,
  ArrowLeft,
  Search,
  CreditCard,
  PackagePlus,
  PackageCheck,
} from "lucide-react";
import logo from "../assets/logo.png";

// ضع الصور التالية داخل مجلد src/assets/ بهذه الأسماء بالضبط:
import heroBanner from "../assets/hero-banner.png";
import productJambari from "../assets/product-jambari.jpg";
import productShirt from "../assets/product-shirt.jpg";
import productOliveOil from "../assets/product-oliveoil.jpg";
import handcraftIconImg from "../assets/icon-park-outline_traditional-chinese-medicine.jpg";
import foodIconImg from "../assets/ion_fast-food-outline.png";
import clothesIconImg from "../assets/hugeicons_clothes.jpg";
import "./CustomerHome.css";


// ── بيانات الأقسام والمنتجات والبانرات ──
const categories = [
  { id: 1, label: "الأشغال اليدوية", iconSrc: handcraftIconImg },
  { id: 2, label: "المأكولات المنزلية", iconSrc: foodIconImg },
  { id: 3, label: "ملابس", iconSrc: clothesIconImg },
];

const featuredProducts = [
  { id: 1, name: "جمبري", price: 100, qty: 10, status: "نشط", image: productJambari },
  { id: 2, name: "قميص قطني كاجوال", price: 95, qty: 10, status: "نشط", image: productShirt },
  { id: 3, name: "زيت زيتون اصلي", price: 45, qty: 20, status: "نشط", image: productOliveOil },
];

const howItWorks = [
  { Icon: Package, title: "استقبل طلبك", desc: "تتبع طلبك حتى يصل لبابك" },
  { Icon: CreditCard, title: "ادفع بأمان", desc: "ادفع بطريقتك المفضلة بأمان تام" },
  { Icon: ShoppingCart, title: "أضف للسلة", desc: "أضف ما يعجبك للسلة بنقرة واحدة" },
  { Icon: Search, title: "تصفح وابحث", desc: "ابحث في آلاف المنتجات وفلتر حسب الفئة" },
];

export default function CustomerHome() {
  const navigate = useNavigate();
  const userName = "أحمد";

  return (
    <div className="home-wrapper" dir="rtl">
      {/* ── Navbar ── */}
      <nav className="home-nav">
        <img src={logo} alt="Gaza Gate" className="home-nav-logo" style={{ cursor: 'pointer' }} 
           onClick={() => navigate("/home/customer")}/>

        <div className="home-nav-links">
          <button className="home-nav-btn" onClick={() => navigate("/home/customer")}>
            <ShoppingCart size={15} />
            الرئيسية
          </button>
          <a href="#products" className="home-nav-link">
            <Package size={15} />
            المنتجات
          </a>
          <a href="#orders" className="home-nav-link">
            <User size={15} />
            طلباتي
          </a>
        </div>

        <div className="home-nav-side">
          <button className="home-icon-btn home-icon-btn--ghost" aria-label="السلة">
            <ShoppingCart size={18} />
          </button>
          <button className="home-icon-btn home-icon-btn--ghost" aria-label="الحساب">
            <User size={18} />
          </button>
          <button className="home-icon-btn" aria-label="خروج" onClick={() => navigate("/login/customer")}>
            <span>خروج</span>
            <LogOut size={18} />
          </button>
        </div>
      </nav>

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
          <button className="home-link-btn">
            عرض الكل
            <ArrowLeft size={15} />
          </button>
        </div>

       <div className="home-categories">
    {categories.map(({ id, label, iconSrc }) => (
      <button key={id} className="home-category-card">
        <span className="home-category-icon">
          {/* عرض الصور بدلاً من الـ SVG القديمة */}
          <img 
            src={iconSrc} 
            alt={label} 
            style={{ width: '28px', height: '28px', objectFit: 'contain' }} 
          />
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
      <section className="home-section" id="products">
        <div className="home-section-head">
          <h2>منتجات مميزة</h2>
          <button className="home-link-btn">
            عرض الكل
            <ArrowLeft size={15} />
          </button>
        </div>

        <div className="home-products">
          {featuredProducts.map((p) => (
            <div className="home-product-card" key={p.id}>
              <div className="home-product-img">
                <img src={p.image} alt={p.name} />
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