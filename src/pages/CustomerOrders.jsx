import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Package, AlertCircle } from "lucide-react";
 
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { getCustomerOrders } from "../services/authService";
import logo from "../assets/logo.png";
import {
  EmptyState,
  ErrorState,
  OrderListSkeleton,
} from "../components/LoadingState";
import "./CustomerOrders.css";

const statusConfig = {
  pending: {
    label: "قيد المعالجة",
    class: "co-status--waiting",
  },
  confirmed: {
    label: "تم التأكيد",
    class: "co-status--approved",
  },
  preparing: {
    label: "قيد التحضير",
    class: "co-status--preparing",
  },
  shipped: {
    label: "قيد الشحن",
    class: "co-status--delivery",
  },
  delivered: {
    label: "تم التوصيل",
    class: "co-status--completed",
  },
  cancelled: {
    label: "ملغي",
    class: "co-status--cancelled",
  },
};

export default function CustomerOrders() {
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
      console.error("Error message:", err.message);
      // إذا كان الخطأ بسبب token غير صالح، وجه المستخدم لتسجيل الدخول
      if (err.message?.includes("token") || err.message?.includes("Invalid") || err.message?.includes("expired")) {
        localStorage.removeItem("token");
        navigate("/login/customer");
        return;
      }
      // إذا كان الخطأ بسبب "Seller not found" أو أخطاء أخرى، عرض قائمة فارغة
      if (err.message?.toLowerCase().includes("seller not found") || err.message?.toLowerCase().includes("not found")) {
        console.log("Seller not found error detected, showing empty orders");
        setOrders([]);
        return;
      }
      setError(err.message);
      // في حالة الخطأ، استخدم البيانات التجريبية بدلاً من عرض رسالة خطأ
      setOrders([
        {
          id: "ORD-241220",
          createdAt: "2024-12-20T10:34:00Z",
          status: "shipped",
          totalAmount: 95,
          seller: { storeName: "بيست باي عربي" },
          items: [{ name: "سماعات نويز كانسلينج" }],
        },
        {
          id: "ORD-241215",
          createdAt: "2024-12-15T15:20:00Z",
          status: "delivered",
          totalAmount: 150,
          seller: { storeName: "متجر التقنية" },
          items: [{ name: "سماعات بلوتوث" }],
        },
        {
          id: "ORD-241210",
          createdAt: "2024-12-10T11:00:00Z",
          status: "pending",
          totalAmount: 45,
          seller: { storeName: "متجر التقنية" },
          items: [{ name: "زيت زيتون أصلي" }],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusInfo = (status) => {
    return statusConfig[status] || statusConfig.pending;
  };

  return (
    <div className="co-wrapper" dir="rtl">
     

      <main className="co-main">
        <header className="co-header">
          <h1>طلباتي</h1>
          <p>{orders.length} طلبات</p>
        </header>

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
              const statusInfo = getStatusInfo(order.status);
              const firstItem = order.items?.[0] || {};

              return (
                <li key={order.id}>
                  <button
                    className="co-card"
                    onClick={() => navigate(`/my-orders/${order.id}`)}
                  >
                    <div className="co-card-top">
                      <div className="co-card-id">
                        <Package size={16} />
                        <span>{order.id}</span>
                      </div>
                      <span className={`co-status ${statusInfo.class}`}>
                        <span className="co-status-dot" />
                        {statusInfo.label}
                      </span>
                    </div>

                    <p className="co-card-item">{firstItem.name || "منتج"}</p>
                    <p className="co-card-store">{order.seller?.storeName || "متجر"}</p>

                    <div className="co-card-bottom">
                      <span className="co-card-date">
                        {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
                      </span>
                      <span className="co-card-total">{order.totalAmount}₪</span>
                    </div>

                    <ChevronLeft size={16} className="co-card-arrow" />
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
