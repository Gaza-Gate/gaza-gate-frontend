import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
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
  ChevronDown,
  Bell,
  MessageCircle,
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
export default function CustomerNavbar({ cartCount = 0, wishlistCount = 0, onLogout }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);

  const navItems = [
    { path: "/home/customer", label: "الرئيسية", Icon: Home },
    { path: "/products", label: "المنتجات", Icon: ShoppingBag },
    { path: "/my-orders", label: "طلباتي", Icon: User },
  ];

  const moreItems = [
    { path: "/profile/customer", label: "الملف الشخصي", Icon: User },
    { path: "/messages", label: "المراسلات", Icon: MessageCircle },
    { path: "/customer/become-seller", label: "التحول لبائع", Icon: ArrowLeftRight },
  ];

  useEffect(() => {
    function handleClickOutside(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setShowMore(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setShowMore(false);
    navigate(path);
  };

  const isMoreActive = moreItems.some((item) => pathname === item.path);

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
              className={`cn-link ${pathname === path || pathname.startsWith(path + "/") ? "active" : ""}`}
              onClick={() => navigate(path)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}

          <div className="cn-dropdown" ref={moreRef}>
            <button
              className={`cn-link cn-dropdown-trigger ${isMoreActive ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowMore((prev) => !prev);
              }}
            >
              <ChevronDown size={15} className={`cn-dropdown-icon ${showMore ? "open" : ""}`} />
              المزيد
            </button>

            {showMore && (
              <div className="cn-dropdown-menu">
                {moreItems.map(({ path, label, Icon }) => (
                  <button
                    key={path}
                    className={`cn-dropdown-item ${pathname === path ? "cn-dropdown-item-active" : ""}`}
                    onClick={() => goTo(path)}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}

                {/* ✅ تسجيل الخروج تحت "المزيد" */}
                <div className="cn-dropdown-divider" />
                <button
                  className="cn-dropdown-item cn-dropdown-item--logout"
                  onClick={handleLogout}
                >
                  <LogOut size={15} />
                  تسجيل الخروج
                </button>
              </div>
            )}
          </div>
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

          {/* ✅ التنبيهات ظاهرة مباشرة في الـ actions بدل ما تكون مخبّاية في "المزيد" */}
          <button
            className={`cn-icon-btn cn-icon-btn--ghost ${pathname === "/notifications" ? "cn-icon-btn--active" : ""}`}
            onClick={() => navigate("/notifications")}
            aria-label="التنبيهات"
          >
            <Bell size={18} />
          </button>

          {/* ✅ البروفايل انتقل لـ "المزيد" بدل أيقونة علوية — بيقلل الازدحام */}

          {/* ✅ زر القائمة — ظاهر دائماً، يفتح Drawer جانبي */}
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
        <>
          <div
            className="cn-drawer-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="cn-drawer" dir="rtl">
            <div className="cn-drawer-head">
              <h3>القائمة</h3>
              <button
                className="cn-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            <div className="cn-drawer-section">
              <h4 className="cn-drawer-section-title">التنقل</h4>
              {navItems.map(({ path, label, Icon }) => (
                <button
                  key={path}
                  className={`cn-drawer-link ${pathname === path ? "active" : ""}`}
                  onClick={() => goTo(path)}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            <div className="cn-drawer-section">
              <h4 className="cn-drawer-section-title">المزيد</h4>
              <button
                className={`cn-drawer-link ${pathname === "/notifications" ? "active" : ""}`}
                onClick={() => goTo("/notifications")}
              >
                <Bell size={16} />
                التنبيهات
              </button>
              {moreItems.map(({ path, label, Icon }) => (
                <button
                  key={path}
                  className={`cn-drawer-link ${pathname === path ? "active" : ""}`}
                  onClick={() => goTo(path)}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            <div className="cn-drawer-foot">
              <button
                className="cn-drawer-link cn-drawer-link--logout"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                تسجيل الخروج
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}