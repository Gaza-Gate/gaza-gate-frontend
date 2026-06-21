import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./NotificationsPage.css";
import logo from "../assets/logo.png";

// ── Icons ──
const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const StarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="#f97316" stroke="#f97316" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const CartIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

const MessageIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const AlertIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const FunnelIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

// ── نوع الإشعار → لون وأيقونة ──
const TYPE_META = {
  order:   { icon: <CartIcon />,    bg: "#dbeafe", color: "#2563eb", label: "طلبات" },
  rating:  { icon: <StarIcon />,    bg: "#fff7ed", color: "#f97316", label: "تقييمات" },
  message: { icon: <MessageIcon />, bg: "#f0fdf4", color: "#16a34a", label: "رسائل" },
  alert:   { icon: <AlertIcon />,   bg: "#fef3c7", color: "#d97706", label: "تنبيهات" },
};

const TABS = [
  { key: "all",     label: "الكل" },
  { key: "order",   label: "الطلبات" },
  { key: "rating",  label: "التقييمات" },
  { key: "message", label: "الرسائل" },
  { key: "alert",   label: "المنتجات" },
];

// ── بيانات تجريبية ──
const NOTIFS_DATA = [
  { id: 1, type: "order",   title: "طلب جديد",              body: "أحمد محمد أرسل طلباً جديداً بقيمة ₪150",              time: "منذ 5 دقائق",  read: false },
  { id: 2, type: "rating",  title: "تقييم جديد",            body: "فاطمة علي قيّمت منتج 'زيت زيتون' بـ 4 نجوم",          time: "منذ 20 دقيقة", read: false },
  { id: 3, type: "message", title: "رسالة جديدة",           body: "محمود حسن: هل يوجد خصم للكميات الكبيرة؟",             time: "منذ ساعة",     read: false },
  { id: 4, type: "order",   title: "تم تأكيد الطلب",        body: "الطلب ORD-002 تم قبوله من قبل الزبون",                time: "منذ 3 ساعات",  read: true  },
  { id: 5, type: "alert",   title: "منتج على وشك النفاد",   body: "مخزون 'زيت الزيتون' وصل إلى 3 قطع فقط",              time: "منذ 5 ساعات",  read: true  },
  { id: 6, type: "rating",  title: "رد على تقييمك",         body: "يوسف أحمد أجمل ردك على تقييمه",                      time: "أمس",          read: true  },
  { id: 7, type: "order",   title: "طلب بانتظار الشحن",     body: "الطلب ORD-005 جاهز للتسليم، اشركة التوصيل في الطريق", time: "أمس",          read: true  },
  { id: 8, type: "message", title: "رسالة جديدة",           body: "سارة خالد: متى يصل طلبي؟",                            time: "أول أمس",      read: true  },
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState(NOTIFS_DATA);
  const [activeTab, setActiveTab] = useState("all");
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const visible = notifs.filter((n) => activeTab === "all" || n.type === activeTab);

  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));

  const markRead = (id) => setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));

  const tabCount = (key) => {
    const list = key === "all" ? notifs : notifs.filter((n) => n.type === key);
    return list.filter((n) => !n.read).length;
  };

  return (
    <div className="np-root" dir="rtl">

      {/* ── Navbar ── */}
      <nav className="np-navbar">
        <div className="np-nav-logo">
          <img src={logo} alt="Gaza Gate" className="np-logo-img" />
        </div>

        <div className="np-nav-links">
          <a href="#" className="np-nav-link" onClick={(e) => { e.preventDefault(); navigate("/seller/dashboard"); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
            لوحة التحكم
          </a>
          <a href="#" className="np-nav-link" onClick={(e) => { e.preventDefault(); navigate("/seller/products"); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            المنتجات
          </a>
          <a href="#" className="np-nav-link" onClick={(e) => { e.preventDefault(); navigate("/seller/profile"); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            ملف المتجر
          </a>
          <div className="np-dropdown" ref={moreRef}>
            <button className="np-nav-link np-dropdown-trigger" onClick={() => setMoreOpen((p) => !p)}>
              المزيد
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={moreOpen ? "np-chevron-open" : ""}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {moreOpen && (
              <div className="np-dropdown-menu">
                <a href="#" className="np-dropdown-item" onClick={(e) => { e.preventDefault(); navigate("/seller/orders"); }}>
                  <CartIcon /> الطلبات
                </a>
                <a href="#" className="np-dropdown-item" onClick={(e) => { e.preventDefault(); navigate("/seller/ratings"); }}>
                  <StarIcon /> التقييمات
                </a>
                <a href="#" className="np-dropdown-item" onClick={(e) => { e.preventDefault(); navigate("/seller/messages"); }}>
                  <MessageIcon /> المراسلات
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="np-nav-left">
          <button className="np-btn-notif" onClick={() => navigate("/seller/notifications")}>
            <BellIcon />
            {unreadCount > 0 && <span className="np-notif-dot"></span>}
          </button>
          <button className="np-btn-logout" onClick={() => navigate("/login")}>
            <span>خروج</span>
            <LogoutIcon />
          </button>
        </div>
      </nav>

      <main className="np-main">

        {/* ── Header ── */}
        <div className="np-header">
          <h1 className="np-page-title">التنبيهات</h1>
          <div className="np-header-actions">
            <button className="np-btn-mark-all" onClick={markAllRead}>
              تعيين الكل كمقروء
            </button>
            <button className="np-btn-dismiss-all" onClick={() => setNotifs([])}>
              حذف الكل
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="np-tabs">
          {TABS.map((tab) => {
            const count = tabCount(tab.key);
            return (
              <button
                key={tab.key}
                className={`np-tab ${activeTab === tab.key ? "np-tab-active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {count > 0 && <span className="np-tab-badge">{count}</span>}
              </button>
            );
          })}
          <div className="np-tabs-filter">
            <FunnelIcon />
          </div>
        </div>

        {/* ── List ── */}
        <div className="np-list">
          {visible.length === 0 && (
            <div className="np-empty">لا توجد إشعارات</div>
          )}
          {visible.map((n) => {
            const meta = TYPE_META[n.type];
            return (
              <div
                key={n.id}
                className={`np-item ${!n.read ? "np-item-unread" : ""}`}
                onClick={() => markRead(n.id)}
              >
                <div className="np-item-icon" style={{ background: meta.bg, color: meta.color }}>
                  {meta.icon}
                </div>
                <div className="np-item-body">
                  <div className="np-item-title">{n.title}</div>
                  <div className="np-item-desc">{n.body}</div>
                </div>
                <div className="np-item-right">
                  <span className="np-item-time">{n.time}</span>
                  {!n.read && <span className="np-unread-dot"></span>}
                </div>
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
} 