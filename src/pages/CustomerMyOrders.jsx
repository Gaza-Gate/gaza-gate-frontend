import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Package, Lock, XCircle } from "lucide-react";
 
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { getCustomerOrders } from "../services/authService";
import { ORDER_STEPS, getStepIndex, isCancelledStatus, getStatusLabel, getStatusClass } from "../utils/orderStatus";
import logo from "../assets/logo.png";
import "./CustomerMyOrders.css";

function OrderTimeline({ status }) {
  if (isCancelledStatus(status)) {
    return (
      <div className="co-cancelled-note">
        <XCircle size={16} />
        تم إلغاء هذا الطلب
      </div>
    );
  }

  const rawIndex = getStepIndex(status);
  const activeIndex = rawIndex === -1 ? 0 : rawIndex;

  return (
    <div className="co-timeline">
      {ORDER_STEPS.map((step, index) => {
        const isDone = index < activeIndex;
        const isCurrent = index === activeIndex;
        const { Icon } = step;

        return (
          <div className="co-timeline-step" key={step.key} style={{ flex: index === ORDER_STEPS.length - 1 ? "0 0 auto" : "1" }}>
            <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
              {index !== 0 && (
                <div className={`co-timeline-line ${index <= activeIndex ? "co-timeline-line--done" : ""}`} />
              )}
              <span
                className={`co-timeline-icon ${isDone ? "co-timeline-icon--done" : ""} ${isCurrent ? "co-timeline-icon--current" : ""}`}
              >
                <Icon size={14} />
              </span>
              {index !== ORDER_STEPS.length - 1 && (
                <div className={`co-timeline-line ${index < activeIndex ? "co-timeline-line--done" : ""}`} />
              )}
            </div>
            <span className={`co-timeline-label ${isCurrent ? "co-timeline-label--active" : ""}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function CustomerMyOrders() {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login/customer");
        return;
      }
      const orders = await getCustomerOrders(token);
      setOrders(Array.isArray(orders) ? orders : []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      if (err.message?.includes("token") || err.message?.includes("Invalid") || err.message?.includes("expired")) {
        localStorage.removeItem("token");
        navigate("/login/customer");
        return;
      }
      if (err.message?.toLowerCase().includes("seller not found") || err.message?.toLowerCase().includes("not found")) {
        setOrders([]);
        return;
      }
      setError(err.message || "حدث خطأ في جلب الطلبات");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="co-wrapper" dir="rtl">
      

      <main className="co-main">
        <header className="co-header">
          <h1>طلباتي</h1>
          <p>{orders.length} طلب</p>
        </header>

        {/* بانر نظام الحماية والخصوصية */}
        <div className="co-privacy-banner">
          <div className="co-privacy-text">
            <span className="co-privacy-title">
              نظام الحماية والخصوصية
              <Lock size={16} />
            </span>
            <p className="co-privacy-desc">
              أنت تشاهد طلباتك الخاصة فقط. الوصول لطلبات عميل آخر ينتج شاشة خطأ.
            </p>
            <button className="co-privacy-btn">
              جرب الوصول لطلب محظور (Demo)
            </button>
          </div>
        </div>

        {loading ? (
          <div className="co-empty">
            <Package size={48} strokeWidth={1.2} />
            <h3>جاري التحميل...</h3>
          </div>
        ) : error ? (
          <div className="co-empty">
            <Package size={48} strokeWidth={1.2} />
            <h3>حدث خطأ</h3>
            <p>{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="co-empty">
            <Package size={48} strokeWidth={1.2} />
            <h3>لا توجد طلبات</h3>
            <p>ابدأ بالتسوق لإنشاء طلباتك الأولى</p>
          </div>
        ) : (
          <ul className="co-list">
            {orders.map((order) => {
              const firstItem = order.items?.[0] || {};
              const itemsCount = order.items?.length || 1;
              const displayNumber = order.orderNumber || order.id;

              return (
                <li key={order.id}>
                  <button
                    className="co-card"
                    onClick={() => navigate(`/my-orders/${order.id}`)}
                  >
                    <div className="co-card-top">
                      <div className="co-card-left">
                        <span className={`co-status ${getStatusClass(order.status)}`}>
                          <span className="co-status-dot" />
                          {getStatusLabel(order.status)}
                        </span>
                        <span className="co-card-total">{order.totalPrice}₪</span>
                      </div>

                      <div className="co-card-right">
                        <div className="co-card-info">
                          <span className="co-card-id">{displayNumber}</span>
                          <span className="co-card-meta">
                            {formatDate(order.createdAt)} · {itemsCount} منتج
                          </span>
                        </div>
                        <div className="co-card-img">
                          <img
                            src={firstItem.primaryImage || logo}
                            alt={firstItem.productName || "منتج"}
                          />
                        </div>
                        <ChevronLeft size={16} className="co-card-arrow" />
                      </div>
                    </div>

                    <OrderTimeline status={order.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}