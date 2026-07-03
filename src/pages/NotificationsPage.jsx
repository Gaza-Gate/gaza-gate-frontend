import { useState, useRef, useEffect, useCallback } from "react";
import "./NotificationsPage.css";
import api from "../utils/api";
import SellerNavbar from "../components/SellerNavbar";

const IS_API_READY = !!import.meta.env.VITE_API_URL;

// ── Icons ──
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

// ── Static fallback ──
const STATIC_NOTIFS = [
  { _id: "1", type: "order",   title: "طلب جديد",            body: "أحمد محمد أرسل طلباً جديداً بقيمة ₪150",     time: "منذ 5 دقائق",  isRead: false },
  { _id: "2", type: "rating",  title: "تقييم جديد",          body: "فاطمة علي قيّمت منتج 'زيت زيتون' بـ 4 نجوم", time: "منذ 20 دقيقة", isRead: false },
  { _id: "3", type: "message", title: "رسالة جديدة",         body: "محمود حسن: هل يوجد خصم للكميات الكبيرة؟",    time: "منذ ساعة",     isRead: false },
  { _id: "4", type: "order",   title: "تم تأكيد الطلب",      body: "الطلب ORD-002 تم قبوله من قبل الزبون",       time: "منذ 3 ساعات",  isRead: true  },
  { _id: "5", type: "alert",   title: "منتج على وشك النفاد", body: "مخزون 'زيت الزيتون' وصل إلى 3 قطع فقط",     time: "منذ 5 ساعات",  isRead: true  },
];

// ── API Helpers ──
// عدّلي المسارات حسب ما يحددها الباك اند
const fetchNotifications = async () => {
  const res = await api.get("/api/seller/notification");
  // شكل الريسبونس الفعلي: { status, data: { notifications: [], stats: {...}, pagination: {...} } }
  // لازم نلاقي الـ array الصحيح بدل ما ناخد الـ object كامل بالغلط
  const list =
    res.data?.data?.notifications ??
    res.data?.notifications ??
    [];
  return Array.isArray(list) ? list : [];
};

const markOneRead = async (id) => {
  await api.patch(`/api/seller/notification/${id}/read`);
};

const markAllReadAPI = async () => {
  await api.patch("/api/seller/notification/read-all");
};

const deleteAllAPI = async () => {
  await api.delete("/api/seller/notification");
};

// ── Component ──
export default function NotificationsPage() {
  const [notifs, setNotifs]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const moreRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {}
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      if (IS_API_READY) {
        const data = await fetchNotifications();
        setNotifs(Array.isArray(data) ? data : []);
      } else {
        setNotifs(STATIC_NOTIFS);
      }
    } catch (err) {
      console.error("فشل جلب الإشعارات:", err);
      setNotifs(STATIC_NOTIFS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  // حماية إضافية: حتى لو صار notifs غير array لأي سبب، ما تكسر الصفحة
  const safeNotifs = Array.isArray(notifs) ? notifs : [];

  const unreadCount = safeNotifs.filter((n) => !n.isRead).length;
  const visible = safeNotifs.filter((n) => activeTab === "all" || n.type === activeTab);

  const markRead = async (id) => {
    try {
      if (IS_API_READY) await markOneRead(id);
      setNotifs((prev) => (Array.isArray(prev) ? prev : []).map((n) => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error("فشل تعيين كمقروء:", err);
    }
  };

  const markAllRead = async () => {
    try {
      if (IS_API_READY) await markAllReadAPI();
      setNotifs((prev) => (Array.isArray(prev) ? prev : []).map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("فشل تعيين الكل كمقروء:", err);
    }
  };

  const deleteAll = async () => {
    try {
      if (IS_API_READY) await deleteAllAPI();
      setNotifs([]);
    } catch (err) {
      console.error("فشل حذف الإشعارات:", err);
    }
  };

  const tabCount = (key) => {
    const list = key === "all" ? safeNotifs : safeNotifs.filter((n) => n.type === key);
    return list.filter((n) => !n.isRead).length;
  };

  if (loading) {
    return (
      <div className="np-root" dir="rtl">
        <SellerNavbar />
        <main className="np-main">
          <div className="rm-state-center">
            <div className="od-spinner" />
            <p>جاري تحميل الإشعارات…</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="np-root" dir="rtl">
      <SellerNavbar />
      <main className="np-main">

        <div className="np-header">
          <h1 className="np-page-title">التنبيهات</h1>
          <div className="np-header-actions">
            <button className="np-btn-mark-all" onClick={markAllRead}>
              تعيين الكل كمقروء
            </button>
            <button className="np-btn-dismiss-all" onClick={deleteAll}>
              حذف الكل
            </button>
          </div>
        </div>

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
          <div className="np-tabs-filter"><FunnelIcon /></div>
        </div>

        <div className="np-list">
          {visible.length === 0 && (
            <div className="np-empty">لا توجد إشعارات</div>
          )}
          {visible.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.alert;
            return (
              <div
                key={n._id}
                className={`np-item ${!n.isRead ? "np-item-unread" : ""}`}
                onClick={() => markRead(n._id)}
              >
                <div className="np-item-icon" style={{ background: meta.bg, color: meta.color }}>
                  {meta.icon}
                </div>
                <div className="np-item-body">
                  {/* عدّلي title وbody حسب أسماء الحقول من الباك اند */}
                  <div className="np-item-title">{n.title}</div>
                  <div className="np-item-desc">{n.body}</div>
                </div>
                <div className="np-item-right">
                  {/* عدّلي time حسب اسم الحقل من الباك اند */}
                  <span className="np-item-time">{n.time ?? n.createdAt?.slice(0, 10)}</span>
                  {!n.isRead && <span className="np-unread-dot"></span>}
                </div>
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
}