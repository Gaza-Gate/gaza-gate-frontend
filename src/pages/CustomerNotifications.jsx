import { useState, useEffect } from "react";
 import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import {
  getAuthToken,
  getCustomerNotifications,
  markAllCustomerNotificationsRead,
  markCustomerNotificationRead,
  clearAllCustomerNotifications,
} from "../services/authService";
import "./NotificationsPage.css";

// ── Icons ──
const CartIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);
const StarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="#f97316" stroke="#f97316" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const MessageIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const AlertIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const FunnelIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const TYPE_META = {
  order:   { icon: <CartIcon />,    bg: "#dbeafe", color: "#2563eb", label: "طلبات" },
  rating:  { icon: <StarIcon />,    bg: "#fff7ed", color: "#f97316", label: "تقييمات" },
  message: { icon: <MessageIcon />, bg: "#f0fdf4", color: "#16a34a", label: "رسائل" },
  alert:   { icon: <AlertIcon />,   bg: "#fef3c7", color: "#d97706", label: "تنبيهات" },
};

const TABS = [
  { key: "all",     label: "الكل" },
  { key: "order",   label: "الطلبات" },
  { key: "message", label: "الرسائل" },
  { key: "alert",   label: "تنبيهات" },
];

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "أمس" : `منذ ${days} يوم`;
}

export default function CustomerNotifications() {
  const token = getAuthToken();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();

  const [notifs, setNotifs] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCustomerNotifications(token);
      const list = Array.isArray(data) ? data : data.notifications ?? [];
      setNotifs(list);
    } catch (err) {
      setError(err.message || "تعذر جلب التنبيهات");
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await markAllCustomerNotificationsRead(token);
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      setError(err.message);
    }
  };

  const markRead = async (id) => {
    setNotifs((prev) => prev.map((n) => (n.id ?? n._id) === id ? { ...n, read: true } : n));
    try {
      await markCustomerNotificationRead(id, token);
    } catch (err) {
      console.error(err);
    }
  };

  const dismissAll = async () => {
    try {
      await clearAllCustomerNotifications(token);
      setNotifs([]);
    } catch (err) {
      setError(err.message);
    }
  };

  const visible = notifs.filter((n) => activeTab === "all" || n.type === activeTab);

  const tabCount = (key) => {
    const list = key === "all" ? notifs : notifs.filter((n) => n.type === key);
    return list.filter((n) => !n.read).length;
  };

  return (
    <div className="np-root" dir="rtl">
      

      <main className="np-main">
        <div className="np-header">
          <h1 className="np-page-title">التنبيهات</h1>
          <div className="np-header-actions">
            <button className="np-btn-mark-all" onClick={markAllRead}>تعيين الكل كمقروء</button>
            <button className="np-btn-dismiss-all" onClick={dismissAll}>حذف الكل</button>
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
          {loading ? (
            <div className="np-empty">جاري التحميل...</div>
          ) : error ? (
            <div className="np-empty">{error}</div>
          ) : visible.length === 0 ? (
            <div className="np-empty">لا توجد إشعارات</div>
          ) : (
            visible.map((n) => {
              const id = n.id ?? n._id;
              const meta = TYPE_META[n.type] || TYPE_META.alert;
              return (
                <div
                  key={id}
                  className={`np-item ${!n.read ? "np-item-unread" : ""}`}
                  onClick={() => markRead(id)}
                >
                  <div className="np-item-icon" style={{ background: meta.bg, color: meta.color }}>
                    {meta.icon}
                  </div>
                  <div className="np-item-body">
                    <div className="np-item-title">{n.title}</div>
                    <div className="np-item-desc">{n.body}</div>
                  </div>
                  <div className="np-item-right">
                    <span className="np-item-time">{timeAgo(n.createdAt)}</span>
                    {!n.read && <span className="np-unread-dot"></span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}