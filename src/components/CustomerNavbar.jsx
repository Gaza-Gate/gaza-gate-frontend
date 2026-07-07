import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell } from "lucide-react"; 
import {
  Home,
  ShoppingBag,
  User,
  ShoppingCart,
  Heart,
  LogOut,
  Menu,
  X,
  ArrowLeftRight,
} from "lucide-react";
import { clearAuthSession } from "../utils/authSession";
import "./CustomerNavbar.css";

/**
 * CustomerNavbar — ناف بار موحد لكل صفحات المشتري
 *
 * Props:
 *  logo       {string}   — import الصورة من assets ثم مررها هنا
 *  cartCount  {number}   — عدد عناصر السلة (badge برتقالي)
 *  onLogout   {function} — اختياري، لو ما حطيته بيعمل logout تلقائي
 */
export default function CustomerNavbar({ logo, cartCount = 0, wishlistCount = 0, onLogout }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/home/customer", label: "الرئيسية", Icon: Home },
    { path: "/products", label: "المنتجات", Icon: ShoppingBag },
    { path: "/orders", label: "طلباتي", Icon: User },
  ];

  const handleLogout = () => {
    setMobileMenuOpen(false);
    if (onLogout) {
      onLogout();
      return;
    }
    clearAuthSession();
    navigate("/login/customer");
  };

  const goTo = (path) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <>
      <nav className="cn-nav" dir="rtl">
        <div className="cn-logo" onClick={() => navigate("/home/customer")}>
          {logo ? (
            <img src={logo} alt="Gaza Gate" className="cn-logo-img" />
          ) : (
            <span className="cn-logo-text">GAZA GATE</span>
          )}
        </div>

        <div className="cn-links">
          {navItems.map(({ path, label, Icon }) => (
            <button
              key={path}
              className={`cn-link ${pathname === path || (path === "/orders" && pathname.startsWith("/orders")) || (path === "/products" && pathname.startsWith("/products")) ? "active" : ""}`}
              onClick={() => navigate(path)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
          <button
            className={`cn-link ${pathname === "/customer/become-seller" ? "active" : ""}`}
            onClick={() => navigate("/customer/become-seller")}
          >
            <ArrowLeftRight size={15} />
            التحول لبائع
          </button>
        </div>

        <div className="cn-actions">
          <button
            className={`cn-icon-btn cn-icon-btn--ghost ${pathname === "/favorites" ? "cn-icon-btn--active" : ""}`}
            onClick={() => navigate("/favorites")}
            aria-label="المفضلة"
          >
            <Heart size={18} />
            {wishlistCount > 0 && <span className="cn-badge">{wishlistCount}</span>}
          </button>

          <button
            className="cn-icon-btn cn-icon-btn--ghost"
            onClick={() => navigate("/cart")}
            aria-label="السلة"
          >
            <ShoppingCart size={18} />
            {cartCount > 0 && <span className="cn-badge">{cartCount}</span>}
          </button>
           <button
               className="cn-icon-btn cn-icon-btn--ghost"
               onClick={() => navigate("/notifications")}
                aria-label="التنبيهات"
>
                 <Bell size={18} />
              </button>
            <button
            className="cn-icon-btn cn-icon-btn--ghost"
            onClick={() => navigate("/profile/customer")}
            aria-label="الملف الشخصي"
          >
            <User size={18} />
          </button>

          <button className="cn-logout" onClick={handleLogout} aria-label="خروج">
            <span>خروج</span>
            <LogOut size={18} />
          </button>

          <button
            className="cn-mobile-menu-btn"
            aria-label="القائمة"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="cn-mobile-menu">
          {navItems.map(({ path, label, Icon }) => (
            <button
              key={path}
              className={`cn-mobile-menu-link ${pathname === path ? "active" : ""}`}
              onClick={() => goTo(path)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
          <button
            className={`cn-mobile-menu-link ${pathname === "/seller/onboarding" ? "active" : ""}`}
            onClick={() => goTo("/seller/onboarding")}
          >
            <ArrowLeftRight size={16} />
            التحول لبائع
          </button>
          <div className="cn-mobile-menu-divider" />
          <button
            className="cn-mobile-menu-link cn-mobile-menu-link--logout"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            تسجيل الخروج
          </button>
        </div>
      )}
    </>
  );
}