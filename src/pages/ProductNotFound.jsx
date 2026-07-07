import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import CustomerNavbar from "../components/CustomerNavbar";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import logo from "../assets/logo.png";
import "./ProductNotFound.css";

/**
 * ProductNotFound — تُعرض عندما يحاول المستخدم فتح منتج محذوف/غير موجود
 * (رقم منتج خاطئ في الرابط، أو منتج تم حذفه من قبل البائع)
 */
export default function ProductNotFound() {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();

  return (
    <div className="pnf-wrapper" dir="rtl">
      <CustomerNavbar logo={logo} cartCount={cartCount} wishlistCount={wishlistCount} />

      <main className="pnf-main">
        <div className="pnf-banner">
          <span className="pnf-banner-text">
            <span className="pnf-banner-emoji" role="img" aria-label="تحذير">⚠️</span>
            المنتج غير موجود
          </span>
          <AlertTriangle size={26} className="pnf-banner-icon" />
        </div>

        {/* هيكل شبحي (skeleton) يمثل مكان صفحة المنتج خلف رسالة الخطأ */}
        <div className="pnf-skeleton-card" aria-hidden="true">
          <div>
            <div className="pnf-skel-line pnf-skel-title" />
            <div className="pnf-skel-line pnf-skel-sub" />
            <div className="pnf-skel-line pnf-skel-block" />
          </div>
          <div className="pnf-skel-image" />
        </div>

        <div className="pnf-actions">
          <button className="pnf-back-btn" onClick={() => navigate("/products")}>
            عودة لصفحة المنتجات
            <ArrowLeft size={18} />
          </button>
        </div>
      </main>
    </div>
  );
}