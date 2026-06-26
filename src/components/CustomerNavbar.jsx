import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, User, LogOut, ShoppingBag, PackageSearch } from "lucide-react";
import "./CustomerNavbar.css";

/**
 * CustomerNavbar — ناف بار موحد لكل صفحات المشتري
 *
 * Props:
 *  logo       {string}   — import الصورة من assets ثم مررها هنا
 *  cartCount  {number}   — عدد عناصر السلة (badge برتقالي)
 *  onLogout   {function} — اختياري، لو ما حطيته بيعمل logout تلقائي
 */
export default function CustomerNavbar({ logo, cartCount = 0, onLogout }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = (path) => pathname === path;

  const handleLogout = () => {
    if (onLogout) { onLogout(); return; }
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    navigate("/login/customer");
  };

  return (
    <nav className="cn-nav" dir="rtl">

      {/* ── Logo ── */}
      <div className="cn-logo" onClick={() => navigate("/home/customer")}>
        {logo
          ? <img src={logo} alt="Gaza Gate" className="cn-logo-img" />
          : <span className="cn-logo-text">GAZA GATE</span>
        }
      </div>

      {/* ── Links ── */}
      <div className="cn-links">
        <button className={`cn-link ${active("/home/customer") ? "active" : ""}`} onClick={() => navigate("/home/customer")}>
          الرئيسية
        </button>
        <button className={`cn-link ${active("/products") ? "active" : ""}`} onClick={() => navigate("/products")}>
          <ShoppingBag size={15} /> المنتجات
        </button>
        <button className={`cn-link ${active("/my-orders") ? "active" : ""}`} onClick={() => navigate("/my-orders")}>
          <PackageSearch size={15} /> طلباتي
        </button>
      </div>

      {/* ── Actions ── */}
      <div className="cn-actions">
        <button className="cn-icon-btn" onClick={() => navigate("/cart")} aria-label="السلة">
          <ShoppingCart size={20} />
          {cartCount > 0 && <span className="cn-badge">{cartCount}</span>}
        </button>

        <button className="cn-icon-btn" onClick={() => navigate("/profile/customer")} aria-label="الملف الشخصي">
          <User size={20} />
        </button>

        <button className="cn-logout" onClick={handleLogout}>
          <LogOut size={15} />
          <span>خروج</span>
        </button>
      </div>

    </nav>
  );
}