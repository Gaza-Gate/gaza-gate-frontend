import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Package, Star, MessageCircle, AlertCircle, Trash2, CheckCheck } from "lucide-react";
import CustomerNavbar from "../components/CustomerNavbar";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import {
  getCustomerNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteAllNotifications,
  getAuthToken,
} from "../services/authService";
import logo from "../assets/logo.png";
import "./CustomerNotifications.css";

const TYPE_META = {
  order:   { icon: <Package size={15} />,      bg: "#dbeafe", color: "#2563eb", label: "الطلبات" },
  review:  { icon: <Star size={15} />,          bg: "#fff7ed", color: "#f97316", label: "التقييمات" },
  product: { icon: <MessageCircle size={15} />, bg: "#f0fdf4", color: "#16a34a", label: "المنتجات" },
  system:  { icon: <AlertCircle size={15} />,   bg: "#fef3c7", color: "#d97706", label: "النظام" },
};

const TABS = [
  { key: "all", label: "الكل" },
  { key: "order", label: "الطلبات" },
  { key: "review", label: "التقييمات" },
  { key: "product", label: "المنتجات" },
  { key: "system", label: "النظام" },
];

export default function CustomerNotifications() {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const token = getAuthToken();

  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ total: 0, order: 0, system: 0, product: 0, review: 0, unRead: 0 });
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
      if (!token) {
        navigate("/login/customer");
        return;
      }
      const data = await getCustomerNotifications(token);
      setNotifications(data.notifications || []);
      setStats(data.stats || {});
    } catch (err) {
      console.error("Error fetching notifications:", err);
      if (err.message?.includes("token") || err.message?.includes("expired")) {
        localStorage.removeItem("token");
        navigate("/login/customer");
        return;
      }
      setError(err.message || "تعذر جلب الإشعارات");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, isRead: true } : n))
    );
    try {
      await markNotificationRead(id, token);
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
    try {
      await markAllNotificationsRead(token);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllNotifications(token);
      setNotifications([]);
    } catch (err) {
      console.error("Error deleting notifications:", err);
    }
  };

  const visible = notifications.filter((n) => activeTab === "all" || n.type === activeTab);

  const tabCount = (key) => (key === "all" ? stats.unRead : notifications.filter((n) => n.type === key && !(n.read || n.isRead)).length);

  return (
    <div className="cnt-wrapper" dir="rtl">
      <CustomerNavbar logo={logo} cartCount={cartCount} wishlistCount={wishlistCount} />

      <main className="cnt-main">
        <div className="cnt-header">
          <h1>الإشعارات</h1>
          <div className="cnt-header-actions">
            <button className="cnt-btn-mark-all" onClick={handleMarkAllRead}>
              <CheckCheck size={14} />
              تعيين الكل كمقروء
            </button>
            <button className="cnt-btn-dismiss-all" onClick={handleDeleteAll}>
              <Trash2 size={14} />
              حذف الكل
            </button>
          </div>
        </div>

        <div className="cnt-tabs">
          {TABS.map((tab) => {
            const count = tabCount(tab.key);
            return (
              <button
                key={tab.key}
                className={`cnt-tab ${activeTab === tab.key ? "cnt-tab-active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {count > 0 && <span className="cnt-tab-badge">{count}</span>}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="cnt-empty">
            <Bell size={40} strokeWidth={1.2} />
            <h3>جاري التحميل...</h3>
          </div>
        ) : error ? (
          <div className="cnt-empty">
            <Bell size={40} strokeWidth={1.2} />
            <h3>حدث خطأ</h3>
            <p>{error}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="cnt-empty">
            <Bell size={40} strokeWidth={1.2} />
            <h3>لا توجد إشعارات</h3>
          </div>
        ) : (
          <div className="cnt-list">
            {visible.map((n) => {
              const meta = TYPE_META[n.type] || TYPE_META.system;
              const isRead = n.read || n.isRead;
              return (
                <div
                  key={n.id}
                  className={`cnt-item ${!isRead ? "cnt-item-unread" : ""}`}
                  onClick={() => !isRead && handleMarkRead(n.id)}
                >
                  <div className="cnt-item-icon" style={{ background: meta.bg, color: meta.color }}>
                    {meta.icon}
                  </div>
                  <div className="cnt-item-body">
                    <div className="cnt-item-title">{n.title}</div>
                    <div className="cnt-item-desc">{n.body || n.message}</div>
                  </div>
                  <div className="cnt-item-right">
                    <span className="cnt-item-time">{n.time || n.createdAt}</span>
                    {!isRead && <span className="cnt-unread-dot" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}