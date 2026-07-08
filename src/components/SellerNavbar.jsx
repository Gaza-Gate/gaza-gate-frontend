import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, ChevronDown, Menu, X, ArrowLeftRight } from "lucide-react";
import logo from "../assets/logo.png";
import ConvertToBuyerModal from "./ConvertToBuyerModal";
import { logout } from "../services/authService";
import api from "../utils/api";
import { connectSocket, disconnectSocket } from "../utils/socket";
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

// جلب عدد الإشعارات غير المقروءة من نفس مسار صفحة الإشعارات
// شكل الريسبونس: { status, data: { notifications: [], stats: {...}, pagination: {...} } }
async function fetchUnreadCount() {
  const res = await api.get("/api/seller/notification");
  // الباك اند بيرجّع stats.unRead (بحرف R كبير) - لو موجود منستخدمه مباشرة، وإلا منحسبه من القائمة
  const statsUnread = res.data?.data?.stats?.unRead;
  if (typeof statsUnread === "number") return statsUnread;

  const list = res.data?.data?.notifications ?? res.data?.notifications ?? [];
  const arr = Array.isArray(list) ? list : [];
  return arr.filter((n) => !n.isRead).length;
}

// hasNotification كـ prop أصبح اختياري: لو الأب مرّره صراحة (true/false) منستخدمه كما هو،
// وإلا منجيب العدد الحقيقي من الـ API ومنبني عليه ظهور النقطة الحمرا
export default function SellerNavbar({ hasNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  // نجيب عدد الإشعارات غير المقروءة أول ما يفتح المستخدم التطبيق (تحميل أولي)
  // وبعدين منستمع بالـ socket لأي تحديث لحظي (إشعار جديد / تعليم كمقروء) بدون إعادة الجلب
  useEffect(() => {
    // لو الأب مرّر hasNotification صراحة، ما في حاجة نجيب العدد أو نفتح اتصال socket
    if (hasNotification !== undefined) return;

    let isMounted = true;

    async function loadInitialCount() {
      try {
        const count = await fetchUnreadCount();
        if (isMounted) setUnreadCount(count);
      } catch (err) {
        console.error("فشل جلب عدد الإشعارات غير المقروءة:", err);
      }
    }
    loadInitialCount();

    const socket = connectSocket();

    // 🔧 أداة تشخيص مؤقتة: بتطبع بالـ Console اسم أي حدث حقيقي يوصل من السيرفر
    // بعد ما تتأكدي من الاسم الصحيح، احذفي هذا الـ onAny واستبدلي الأسماء تحته بالاسم الحقيقي فقط
    socket.onAny((eventName, payload) => {
      console.log("📡 Socket event received:", eventName, payload);
    });

    // أسماء مقترحة شائعة لحدث "إشعار جديد" - عدّليها للاسم الحقيقي فور معرفته من الباك اند
    const NEW_NOTIFICATION_EVENTS = ["newNotification", "notification:new", "notification"];
    const READ_EVENTS = ["notification:read", "notification:readAll", "notificationsUpdated"];

    const handleNewNotification = () => {
      if (isMounted) setUnreadCount((prev) => prev + 1);
    };
    const handleReadUpdate = () => {
      // أبسط وأضمن حل: نعيد جلب العدد الحقيقي من السيرفر بعد أي تحديث قراءة
      loadInitialCount();
    };

    NEW_NOTIFICATION_EVENTS.forEach((evt) => socket.on(evt, handleNewNotification));
    READ_EVENTS.forEach((evt) => socket.on(evt, handleReadUpdate));

    return () => {
      isMounted = false;
      NEW_NOTIFICATION_EVENTS.forEach((evt) => socket.off(evt, handleNewNotification));
      READ_EVENTS.forEach((evt) => socket.off(evt, handleReadUpdate));
      socket.offAny();
      disconnectSocket();
    };
  }, [hasNotification]);

  // القيمة النهائية اللي بتحدد ظهور النقطة الحمرا
  const showDot = hasNotification !== undefined ? hasNotification : unreadCount > 0;

  // ✅ الآن الخروج مربوط فعلياً بالـ API: بنستدعي /api/auth/logout
  // لإبطال التوكن على السيرفر، وبعدين بنمسحه محلياً ونحول المستخدم لصفحة الدخول.
  // حتى لو فشل الطلب (مثلاً السيرفر مش متاح) منكمل نسجل الخروج محلياً
  // عشان ما نأخر أو نعلّق المستخدم بمكانه.
  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error("Logout API failed:", err);
    } finally {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      setLoggingOut(false);
      navigate("/login/seller");
    }
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
          {showDot && <span className="snb-bell-dot" />}
        </button>
        <button className="snb-logout-btn" onClick={handleLogout} disabled={loggingOut}>
          <LogOut size={16} color="#f97316" />
          {loggingOut ? "جاري الخروج..." : "خروج"}
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
            {showDot && <span className="snb-bell-dot" />}
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