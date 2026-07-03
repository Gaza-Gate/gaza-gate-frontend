import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, ChevronDown, Menu, X, ArrowLeftRight } from "lucide-react";
import logo from "../assets/logo.png";
import ConvertToBuyerModal from "./ConvertToBuyerModal";
import "./SellerNavbar.css";

const NAV_LINKS = [
  { to: "/seller/dashboard", label: "لوحة التحكم" },
  { to: "/seller/products", label: "المنتجات" },
  { to: "/store-profile", label: "ملف المتجر" },
];

const MORE_LINKS = [
  { to: "/seller/orders", label: "الطلبات" },
  { to: "/seller/ratings", label: "التقييمات" },
  { to: "/seller/messages", label: "المراسلات" },
];

export default function SellerNavbar({ hasNotification = true }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  useEffect(() => {
    function handleClick() {
      setShowMore(false);
    }
    if (showMore) document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showMore]);

  // إغلاق قائمة الموبايل تلقائياً عند تغيير الصفحة
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    navigate("/login/seller");
  }

  function handleOpenConvertModal() {
    setShowMore(false);
    setMobileMenuOpen(false);
    setShowConvertModal(true);
  }

  // كل الروابط سوا (تظهر مدمجة بقائمة الموبايل)
  const allLinksForMobile = [...NAV_LINKS, ...MORE_LINKS];

  return (
    <nav className="snb-nav" dir="rtl">
      <Link to="/seller/dashboard" className="snb-logo-link">
        <img src={logo} alt="Gaza Gate" className="snb-logo" />
      </Link>

      {/* ── روابط سطح المكتب ── */}
      <div className="snb-links snb-links-desktop">
        {NAV_LINKS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`snb-link ${location.pathname.startsWith(item.to) ? "snb-link-active" : ""}`}
          >
            {item.label}
          </Link>
        ))}

        <div className="snb-dropdown">
          <button
            className="snb-dropdown-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowMore((s) => !s);
            }}
          >
            <ChevronDown size={16} className={`snb-dropdown-icon ${showMore ? "open" : ""}`} />
            المزيد
          </button>
          {showMore && (
            <div className="snb-dropdown-menu">
              {MORE_LINKS.map((item) => (
                <Link key={item.to} to={item.to} className="snb-dropdown-item">
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* زر التحويل لمشتري - ظاهر مباشرة بجانب "المزيد"، مش جوا القائمة المنسدلة */}
        <button
          type="button"
          className="snb-link snb-link-btn snb-convert-btn"
          onClick={handleOpenConvertModal}
        >
          <ArrowLeftRight size={15} />
          التحويل لمشتري
        </button>
      </div>

      {/* ── أزرار يمين: الإشعارات + خروج (سطح المكتب) ── */}
      <div className="snb-actions snb-actions-desktop">
        <button
          className="snb-bell-btn"
          aria-label="الإشعارات"
          onClick={() => navigate("/seller/notifications")}
        >
          <Bell size={20} color="#374151" />
          {hasNotification && <span className="snb-bell-dot" />}
        </button>
        <button className="snb-logout-btn" onClick={handleLogout}>
          <LogOut size={16} color="#f97316" />
          خروج
        </button>
      </div>

      {/* ── زر الهامبرغر (موبايل فقط) ── */}
      <button
        className="snb-hamburger-btn"
        aria-label="فتح القائمة"
        onClick={(e) => {
          e.stopPropagation();
          setMobileMenuOpen((s) => !s);
        }}
      >
        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* ── قائمة الموبايل المنسدلة ── */}
      {mobileMenuOpen && (
        <div className="snb-mobile-menu" onClick={(e) => e.stopPropagation()}>
          {allLinksForMobile.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`snb-mobile-link ${location.pathname.startsWith(item.to) ? "snb-link-active" : ""}`}
            >
              {item.label}
            </Link>
          ))}

          <button type="button" className="snb-mobile-link snb-mobile-link-btn" onClick={handleOpenConvertModal}>
            <ArrowLeftRight size={16} />
            التحويل لمشتري
          </button>

          <div className="snb-mobile-divider" />

          <button
            className="snb-mobile-link snb-mobile-link-btn"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate("/seller/notifications");
            }}
          >
            <Bell size={18} color="#374151" />
            الإشعارات
            {hasNotification && <span className="snb-bell-dot" />}
          </button>

          <button className="snb-mobile-link snb-mobile-link-btn snb-mobile-logout" onClick={handleLogout}>
            <LogOut size={16} color="#f97316" />
            خروج
          </button>
        </div>
      )}

      {showConvertModal && (
        <ConvertToBuyerModal
          isOpen={showConvertModal}
          onClose={() => setShowConvertModal(false)}
          onConfirm={() => {
            setShowConvertModal(false);
            navigate("/buyer"); // أو أي مسار البائع-> مشتري عندك، مثلاً /buyer/home
          }}
        />
      )}
    </nav>
  );
}