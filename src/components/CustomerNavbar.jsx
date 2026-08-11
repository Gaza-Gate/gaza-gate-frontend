import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ThemeLogo from "./ThemeLogo";
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
  MessageCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import "./CustomerNavbar.css";

/**
 * CustomerNavbar — ناف بار موحد لكل صفحات المشتري
 *
 * ✅ الإشعارات: معزولة تماماً — يستخدم `NotificationBell role="customer"`
 *    اللي بدوره يستخدم `useNotificationCount("customer")` →
 *    العداد يكون 0 إذا الـ currentRole !== "customer" (عزل صارم).
 *
 * ✅ التبديل: نص "جاري التحويل..." اتشال — الـ RoleSwitchOverlay العالمي
 *    هو المسؤول الوحيد عن عرض حالة التحميل أثناء التبديل.
 *    الزر بيبقى disabled (opacity) فقط، بدون أي نص بديل.
 */
export default function CustomerNavbar({ cartCount = 0, wishlistCount = 0, onLogout }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const {
    logout: authLogout,
    hasSellerProfile,
    switchRoleAndNavigate,
    syncProfileFlags,
    currentRole,
    isSwitchingRole,
    isBecomingSeller,
  } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);
  // ✅ الـ RoleSwitchOverlay بيغطي الشاشة أثناء التبديل، نخلي الزر disabled فقط
  const isConverting = isSwitchingRole || isBecomingSeller;

  const navItems = [
    { path: "/home/customer", label: "الرئيسية", Icon: Home },
    { path: "/products", label: "المنتجات", Icon: ShoppingBag },
    { path: "/my-orders", label: "طلباتي", Icon: User },
  ];

  // ✅ خانة "التحول لبائع" تتغير حسب حالة المستخدم:
  //   - عنده متجر (حسب state المحلي) → "العودة لوضع البائع" (switchRole)
  //   - ما عندوش متجر (حسب state المحلي) → "التحول لبائع" (نفس الـ action الذكي
  //     اللي بيجرب switch أولاً — بيعالج حالة الـ stale state)
  //   - بنخبيها بالكامل لمن يكون بالفعل بائع (لتجنب التكرار)
  //
  // 📌 الإصلاح: حتى لو الـ state المحلي يقول ما عندوش متجر، الـ action دايماً
  //    "switch-to-seller" — الـ handler بيجرب الباك (syncProfileFlags + switchRole)
  //    قبل ما يقرر يودّيه لصفحة become-seller. كذا بنعالج الـ bug "البائع المسجّل
  //    بيوصل لصفحة إنشاء المتجر بدون logout/login".
  const becomeSellerItem = hasSellerProfile
    ? { path: null, label: "العودة لوضع البائع", Icon: ArrowLeftRight, action: "switch-to-seller" }
    : { path: null, label: "التحول لبائع", Icon: ArrowLeftRight, action: "switch-to-seller" };

  const moreItems = [
    { path: "/profile/customer", label: "الملف الشخصي", Icon: User },
    { path: "/messages", label: "المراسلات", Icon: MessageCircle },
    becomeSellerItem,
  ].filter(Boolean);

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
    // ✅ بنستخدم AuthContext.logout() بدل clearAuthSession()
    //    عشان:
    //    1) React state (user) يصفّر
    //    2) AUTH_CHANGED_EVENT ينطلق → باقي المكونات تنحدّث
    //    3) RequireSeller/RequireCustomer يعملوا redirect تلقائي
    authLogout();
    navigate("/login/customer");
  };

  // ✅ handler ذكي للتحول للبائع — يستخدم switch-role إذا عنده متجر
  //    الدور الموحّد: الـ RoleSwitchOverlay بيدير شاشة الانتظار.
  //    هنا ما بنعرض أي نص "جاري التحويل" — الزر بيبقى disabled لحظياً.
  //
  // 🔑 الإصلاح: قبل ما نحاول switch، بنعمل syncProfileFlags() عشان نعالج
  //    الـ stale state (المستخدم بائع فعلاً بس الـ state المحلي يقول غير ذلك).
  //    فقط لما الباك يفشل بـ 404/403 (ما عندوش متجر) → نحوّله لصفحة become-seller.
  async function handleMoreItemClick(item) {
    setMobileMenuOpen(false);
    setShowMore(false);

    if (item.action === "switch-to-seller") {
      if (isConverting) return; // ✅ بنمنع الضغط المتعدد

      // ✅ 1) sync state مع الباك (silent — ما بيلمس isBootstrapping)
      try {
        await syncProfileFlags();
      } catch (syncErr) {
        console.warn(
          "[CustomerNavbar] syncProfileFlags فشل، بنكمّل بالـ switch:",
          syncErr?.message
        );
      }

      // ✅ 2) بنجرّب switch-role (الباك هو المرجع)
      try {
        await switchRoleAndNavigate("seller", navigate, {
          path: "/seller/dashboard",
          replace: true,
        });
        // ✅ navigate صار من جوا الـ helper
      } catch (err) {
        // ✅ fallback: الباك أكد إنه ما عندوش متجر → صفحة إنشاء المتجر
        const status = err?.response?.status;
        if (status === 404 || status === 403 || status === 409) {
          console.info(
            "[CustomerNavbar] switch-role رفض الطلب — المستخدم ما عندوش seller profile → become-seller"
          );
          navigate("/customer/become-seller");
          return;
        }
        // أي خطأ تاني (شبكة، توكن منتهي، إلخ) — بنفس الـ fallback القديم
        console.warn(
          "[CustomerNavbar] switch-role فشل، بنحوّل لصفحة become-seller:",
          err?.message
        );
        navigate("/customer/become-seller");
      }
      return;
    }

    if (item.path) navigate(item.path);
  }

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
          <ThemeLogo className="cn-logo-img" />
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
                {moreItems.map((item) => {
                  const isActive = item.path && pathname === item.path;
                  return (
                    <button
                      key={item.label}
                      className={`cn-dropdown-item ${isActive ? "cn-dropdown-item-active" : ""}`}
                      onClick={() => handleMoreItemClick(item)}
                      disabled={isConverting}
                    >
                      <item.Icon size={15} />
                      {item.label}
                    </button>
                  );
                })}

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

          {/* ✅ زر تبديل الثيم (Light/Dark/System) */}
          <ThemeToggle variant="navbar" size={18} />

          {/* ✅ جرس الإشعارات المعزول — NotificationBell بيدير كل شي داخلياً */}
          <NotificationBell role="customer" />

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
                <span style={{ flex: 1 }}>التنبيهات</span>
              </button>
              {moreItems.map((item) => {
                const isActive = item.path && pathname === item.path;
                return (
                  <button
                    key={item.label}
                    className={`cn-drawer-link ${isActive ? "active" : ""}`}
                    onClick={() => handleMoreItemClick(item)}
                    disabled={isConverting}
                  >
                    <item.Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
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
