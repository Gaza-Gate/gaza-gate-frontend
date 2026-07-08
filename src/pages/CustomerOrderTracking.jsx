import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, CheckCircle, Store, Package } from "lucide-react";
import CustomerNavbar from "../components/CustomerNavbar";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { getCustomerOrderDetails } from "../services/authService";
import { ORDER_STEPS, getStepIndex, isCancelledStatus, getStatusLabel } from "../utils/orderStatus";
import logo from "../assets/logo.png";
import "./CustomerOrderTracking.css";
import ReviewModal from "../components/ReviewModal";


function getStepState(index, activeIndex) {
  if (index < activeIndex) return "done";
  if (index === activeIndex) return "current";
  return "pending";
}

export default function CustomerOrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login/customer");
        return;
      }
      const data = await getCustomerOrderDetails(id, token);
      setOrder(data);
    } catch (err) {
      console.error("Error fetching order details:", err);
      if (err.message?.includes("token") || err.message?.includes("Invalid") || err.message?.includes("expired")) {
        localStorage.removeItem("token");
        navigate("/login/customer");
        return;
      }
      setError(err.message || "تعذر جلب تفاصيل الطلب");
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timePart = date.toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart} ${timePart}`;
  };

  if (loading) {
    return (
      <div className="ot-wrapper" dir="rtl">
        <CustomerNavbar logo={logo} cartCount={cartCount} wishlistCount={wishlistCount} />
        <main className="ot-main">
          <p>جاري التحميل...</p>
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="ot-wrapper" dir="rtl">
        <CustomerNavbar logo={logo} cartCount={cartCount} wishlistCount={wishlistCount} />
        <main className="ot-main">
          <button className="ot-back" onClick={() => navigate("/my-orders")}>
            <ChevronRight size={14} />
            العودة الى طلباتي
          </button>
          <p>{error || "الطلب غير موجود"}</p>
        </main>
      </div>
    );
  }

  const cancelled = isCancelledStatus(order.status);
  const rawIndex = getStepIndex(order.status);
  const activeIndex = rawIndex === -1 ? 0 : rawIndex;
  const items = order.items || [];

  return (
    <div className="ot-wrapper" dir="rtl">
      <CustomerNavbar logo={logo} cartCount={cartCount} wishlistCount={wishlistCount} />

      <main className="ot-main">
        <button className="ot-back" onClick={() => navigate("/my-orders")}>
          <ChevronRight size={14} />
          العودة الى طلباتي
        </button>

        <div className="ot-summary-bar">
          <div className="ot-summary-info">
            <span className="ot-order-id">{order.orderNumber || order.id}</span>
            <span className="ot-order-date">{formatDateTime(order.createdAt)}</span>
          </div>
          <div className="ot-summary-right">
            <span className="ot-status-badge">
              <span className="ot-status-dot" />
              {getStatusLabel(order.status)}
            </span>
            <span className="ot-total">{order.totalPrice}₪</span>
          </div>
        </div>

        <div className="ot-layout">
          <section className="ot-items">
            <div className="ot-store-card">
              <Store size={16} />
              <span>{order.seller?.storeName || "متجر"}</span>
            </div>

{items.map((item) => (
  <div className="ot-item-card" key={item.id}>
    <img
      src={item.primaryImage || logo}
      alt={item.productName}
      className="ot-item-img"
    />
    <div className="ot-item-info">
      <h3>{item.productName}</h3>
      <p>الكمية: {item.quantity}</p>
      {order.status === "completed" && (
        <button
          onClick={() =>
            setReviewTarget({ productId: item.productId, productName: item.productName })
          }
          style={{
            marginTop: 6,
            background: "none",
            border: "1px solid #f97316",
            color: "#f97316",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          قيّم المنتج
        </button>
      )}
    </div>
    <span className="ot-item-price">{item.lineTotal ?? item.unitPrice}₪</span>
  </div>
))}

            <div className="ot-subtotal">
              <span>المجموع</span>
              <span>{order.totalPrice}₪</span>
            </div>

            <div className="ot-grand-total">
              <span>الإجمالي الكلي</span>
              <span>{order.totalPrice}₪</span>
            </div>
          </section>

          <section className="ot-timeline-card">
            <h2>مسار الطلب</h2>

            {cancelled ? (
              <div className="ot-step ot-step--alt">
                <div className="ot-step-icon">
                  <Package size={16} />
                </div>
                <div className="ot-step-content">
                  <h4>ملغى</h4>
                  <p>تم إلغاء الطلب</p>
                </div>
              </div>
            ) : (
              <ul className="ot-timeline">
                {ORDER_STEPS.map((step, index) => {
                  const state = getStepState(index, activeIndex);
                  const { Icon } = step;

                  return (
                    <li key={step.key} className={`ot-step ot-step--${state}`}>
                      <div className="ot-step-icon">
                        <Icon size={16} />
                        {state === "done" && (
                          <span className="ot-step-check">
                            <CheckCircle size={12} />
                          </span>
                        )}
                      </div>
                      <div className="ot-step-content">
                        {state === "current" && (
                          <span className="ot-current-badge">الحالة الحالية</span>
                        )}
                        <h4>{step.label}</h4>
                        <p>{step.desc}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
        <ReviewModal
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        productId={reviewTarget?.productId}
        productName={reviewTarget?.productName}
        orderId={order.id}
        onSubmitted={() => setReviewTarget(null)}
      />
    </div>
  );
}