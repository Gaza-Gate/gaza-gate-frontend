import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, ChevronDown, Menu, X, ArrowLeftRight } from "lucide-react";
import ThemeLogo from "./ThemeLogo";
import ConvertToBuyerModal from "./ConvertToBuyerModal";
import { logout } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
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

export default function SellerNavbar() {
  const {
    switchRoleAndNavigate,
    becomeCustomer,
    logout: authLogout,
    currentRole,
    isSwitchingRole,
    isBecomingCustomer,
  } = useAuth();
  // ✅ الـ RoleSwitchOverlay بيغطي الشاشة أثناء التبديل، والزر بيظهر disabled
  const isConverting = isSwitchingRole || isBecomingCustomer;
  const location = useLocation();
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // ✅ تم إزالة unreadCount و useEffect و socket listeners من هنا —
  //    كله صار بيدار في NotificationBell + useNotificationCount(role="seller")

  useEffect(() => {
    function handleClick() {
      setShowMore(false);
    }
    if (showMore) document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showMore]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      // ✅ 1) محاولة تسجيل الخروج من السيرفر
      //    لو فشل (network/server) — منكمل بمسح محلي
      await logout().catch((err) => {
        console.warn("[SellerNavbar] logout API failed (continuing local cleanup):", err?.message);
      });
    } finally {
      // ✅ 2) تنظيف شامل محلي (state + caches + token)
      authLogout();
      setLoggingOut(false);
      // ✅ 3) navigate بـ replace عشان نمنع back لصفحة محمية
      navigate("/login/seller", { replace: true });
    }
  }

  function handleOpenConvertModal() {
    setShowMore(false);
    setMobileMenuOpen(false);
    setShowConvertModal(true);
  }

  // ✅ منستخدم فقط دوال AuthContext — ممنوع نعمل api.post يدوياً
  //    الـ RoleSwitchOverlay العالمي هو المسؤول الوحيد عن شاشة الانتظار.
  //    نقفل المودال فوراً عند بدء التحويل عشان الـ overlay يبين للمستخدم بدون تداخل.
  async function handleConfirmConvert() {
    // نقفل المودال فوراً — الـ overlay رح يغطي الشاشة
    setShowConvertModal(false);
    try {
      let result;
      try {
        // أول محاولة: تحويل حقيقي (أول مرة يصير فيها العميل customer)
        result = await becomeCustomer();
        // ✅ atomic: state + tokens + socket → navigate
        navigate("/home/customer", { replace: true });
      } catch (err) {
        // لو عنده صلاحية customer أصلاً (409)، بنستخدم switchRoleAndNavigate
        if (err.response?.status === 409) {
          await switchRoleAndNavigate("customer", navigate, {
            path: "/home/customer",
            replace: true,
          });
          // ✅ navigate صار من جوا الـ helper
          return;
        } else {
          throw err;
        }
      }

      // (fallback socket reconnect — الـ helper الجديد بيشتغل تلقائياً)
      if (result?.reconnectSocket) {
        const { connectSocket, disconnectSocket } = await import(
          "../utils/socket"
        );
        disconnectSocket();
        connectSocket();
      }
    } catch (error) {
      console.error("فشل التحويل لحساب المشتري:", error);
    }
  }

  const allLinksForMobile = [...NAV_LINKS, ...MORE_LINKS];

  return (
    <nav className="snb-nav" dir="rtl">
      <Link to="/seller/dashboard" className="snb-logo-link">
        <ThemeLogo className="snb-logo" />
      </Link>

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

        <button
          type="button"
          className="snb-link snb-link-btn snb-convert-btn"
          onClick={handleOpenConvertModal}
          disabled={isConverting}
        >
          <ArrowLeftRight size={15} />
          التحويل لمشتري
        </button>
      </div>

      <div className="snb-actions snb-actions-desktop">
        {/* ✅ زر تبديل الثيم (Light/Dark/System) */}
        <ThemeToggle variant="navbar" size={18} />

        {/* ✅ جرس الإشعارات المعزول — NotificationBell بيدير كل شي داخلياً */}
        <NotificationBell role="seller" />
        <button className="snb-logout-btn" onClick={handleLogout} disabled={loggingOut}>
          <LogOut size={16} color="#f97316" />
          {loggingOut ? "جاري الخروج..." : "خروج"}
        </button>
      </div>

      {/* ✅ شريط الأفعال للموبايل — جرس الإشعارات ظاهر دائماً جنب زر القائمة
           حتى ما يضطر المستخدم يفتح القائمة كل مرة يبي يشوف إشعار جديد. */}
      <div className="snb-actions snb-actions-mobile" aria-label="إجراءات سريعة">
        <NotificationBell role="seller" />
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
      </div>

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

          <button type="button" className="snb-mobile-link snb-mobile-link-btn" onClick={handleOpenConvertModal} disabled={isConverting}>
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
            الإشعارات
          </button>

          <button className="snb-mobile-link snb-mobile-link-btn snb-mobile-logout" onClick={handleLogout} disabled={loggingOut}>
            <LogOut size={16} color="#f97316" />
            {loggingOut ? "جاري الخروج..." : "خروج"}
          </button>
        </div>
      )}

      {showConvertModal && (
        <ConvertToBuyerModal
          isOpen={showConvertModal}
          onClose={() => !isConverting && setShowConvertModal(false)}
          onConfirm={handleConfirmConvert}
          isLoading={isConverting}
        />
      )}
    </nav>
  );
}
