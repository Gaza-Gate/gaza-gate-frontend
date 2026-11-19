import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Package, Lock, XCircle, Ban, AlertCircle } from "lucide-react";

import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { getMyOrders } from "../services/orderService";
import { ORDER_STEPS, getStepIndex, isCancelledStatus, isCancellableStatus, getStatusLabel, getStatusClass } from "../utils/orderStatus";
import { getProductImageUrl } from "../utils/productImage";
import "./CustomerMyOrders.css";
import CancelOrderModal from "../components/CancelOrderModal";
import { useToast, ToastContainer } from "../components/Toast";
import {
  EmptyState,
  ErrorState,
  OrderListSkeleton,
} from "../components/LoadingState";

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
  const [cancelTarget, setCancelTarget] = useState(null);
  const toast = useToast();

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
      const orders = await getMyOrders();
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
          <OrderListSkeleton count={4} />
        ) : error ? (
          <ErrorState
            icon={AlertCircle}
            title="حدث خطأ"
            message={error}
            onRetry={() => window.location.reload()}
          />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="لا توجد طلبات"
            description="ابدأ بالتسوق لإنشاء طلباتك الأولى"
            action={
              <button onClick={() => navigate("/products")}>
                تصفح المنتجات
              </button>
            }
          />
        ) : (
          <ul className="co-list">
            {orders.map((order) => {
              const firstItem = order.items?.[0] || {};
              const itemsCount = order.items?.length || 1;
              const totalQuantity = (order.items || []).reduce(
                (s, it) => s + Number(it.quantity ?? 1), 0
              );
              const displayNumber = order.orderNumber || order.id;
              // نستخدم canCancel من الباك، ولو مش موجود نحسبه محلياً
              const cancellable = typeof order.canCancel === "boolean"
                ? order.canCancel
                : isCancellableStatus(order.status);

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
                            {formatDate(order.createdAt)} · {totalQuantity} قطعة ({itemsCount} منتج)
                          </span>
                        </div>
                        <div className="co-card-img">
                          <img
                            src={getProductImageUrl(firstItem)}
                            alt={firstItem.productName || "منتج"}
                          />
                        </div>
                        <ChevronLeft size={16} className="co-card-arrow" />
                      </div>
                    </div>

                    <OrderTimeline status={order.status} />

                    {cancellable && (
                      <div className="co-card-actions">
                        <span
                          role="button"
                          tabIndex={0}
                          className="co-cancel-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setCancelTarget(order);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.stopPropagation();
                              e.preventDefault();
                              setCancelTarget(order);
                            }
                          }}
                        >
                          <Ban size={12} />
                          إلغاء الطلب
                        </span>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <CancelOrderModal
        open={!!cancelTarget}
        order={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onCancelled={(updated) => {
          // ندمج بحذر — نحتفظ بكل بيانات order الأصلية
          // ونحدّث فقط الحقول اللي تغيّرت
          setOrders((prev) =>
            prev.map((o) =>
              o.id === updated.id
                ? {
                    ...o,
                    status: "cancelled",
                    canCancel: false,
                  }
                : o
            )
          );
          setCancelTarget(null);
          toast.success(
            "تم إلغاء الطلب ✓",
            `الطلب ${updated?.orderNumber || ""} تم إلغاؤه بنجاح`,
            { duration: 5000 }
          );
        }}
      />
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}