import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./OrdersManagement.css";
import logo from "../assets/logo.png";
import SellerNavbar from "../components/SellerNavbar";
import { getSellerOrders } from "../services/orderService";
import { getAuthToken } from "../services/authService";


// ── Icons ──
const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const UserIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CurrencyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9h4a2 2 0 010 4H9m0-4v8m6-8v8" />
  </svg>
);

// ── Status badge ──
const STATUS_MAP = {
  pending: { label: "قيد التنفيذ", className: "om-badge-blue" },
  approved: { label: "موافق عليه", className: "om-badge-green" },
  review: { label: "بانتظار", className: "om-badge-yellow" },
  delivered: { label: "تم التسليم", className: "om-badge-purple" },
  completed: { label: "مكتمل", className: "om-badge-gray" },
};

function StatusBadge({ status }) {
  const info = STATUS_MAP[status] || STATUS_MAP.pending;
  return <span className={`om-badge ${info.className}`}>{info.label}</span>;
}

// ── Static data مؤقتة - بتتبدّل لاحقاً بداتا الـ API ──
const ORDERS_DATA = [
  { id: "ORD-001", customer: "أحمد محمد علي", date: "2026-06-08", productsCount: 3, total: 150.0, status: "pending" },
  { id: "ORD-002", customer: "فاطمة حسن", date: "2026-06-09", productsCount: 5, total: 280.5, status: "approved" },
  { id: "ORD-003", customer: "محمود خالد", date: "2026-06-10", productsCount: 2, total: 95.0, status: "review" },
  { id: "ORD-004", customer: "سارة يوسف", date: "2026-06-07", productsCount: 4, total: 320.0, status: "delivered" },
  { id: "ORD-005", customer: "عمر إبراهيم", date: "2026-06-05", productsCount: 3, total: 180.0, status: "completed" },
];

const OrdersManagement = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const token = getAuthToken();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await getSellerOrders(token);
        setOrders(Array.isArray(data) ? data : data.orders ?? []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalOrders = orders.length;
  const reviewCount = orders.filter((o) => o.status === "review").length;
  const approvedCount = orders.filter((o) => o.status === "approved").length;
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="om-root" dir="rtl">
      
     <SellerNavbar />

      <main className="om-main">

        {/* Header */}
        <div className="om-header">
          <h1 className="om-page-title">ادارة الطلبات</h1>
          <p className="om-page-subtitle">عرض ومتابعة جميع الطلبات الخاصة بمتجرك</p>
        </div>

        {/* Stats */}
        <div className="om-stats">
          <div className="om-stat-card">
            <p className="om-stat-label">اجمالي الطلبات</p>
            <p className="om-stat-value">{totalOrders}</p>
          </div>
          <div className="om-stat-card">
            <p className="om-stat-label">بانتظار المراجعة</p>
            <p className="om-stat-value">{reviewCount}</p>
          </div>
          <div className="om-stat-card">
            <p className="om-stat-label">موافق عليها</p>
            <p className="om-stat-value">{approvedCount}</p>
          </div>
          <div className="om-stat-card">
            <p className="om-stat-label">قيد التنفيذ</p>
            <p className="om-stat-value">{pendingCount}</p>
          </div>
        </div>

        {/* Orders table */}
        <div className="om-table-card">
          <h2 className="om-table-title">قائمة الطلبات</h2>

          {loading ? (
            <div className="om-loading">جاري التحميل...</div>
          ) : error ? (
            <div className="om-error">{error}</div>
          ) : orders.length === 0 ? (
            <div className="om-empty">لا توجد طلبات بعد</div>
          ) : (
            <div className="om-table-wrap">
              <table className="om-table">
                <thead>
                  <tr>
                    <th>رقم الطلب</th>
                    <th>العميل</th>
                    <th>التاريخ</th>
                    <th>المنتجات</th>
                    <th>الإجمالي</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="om-cell-id">{order.id}</td>
                      <td>
                        <span className="om-cell-with-icon">
                          {order.customer?.name || order.customer}
                          <UserIcon />
                        </span>
                      </td>
                      <td>
                        <span className="om-cell-with-icon">
                          {order.createdAt || order.date}
                          <CalendarIcon />
                        </span>
                      </td>
                      <td>{order.items?.length || order.productsCount} منتجات</td>
                      <td>
                        <span className="om-cell-with-icon om-cell-price">
                          {(order.totalAmount || order.total).toFixed(2)}
                          <CurrencyIcon />
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td>
                        <button className="om-btn-view" onClick={() => navigate(`/seller/orders/${order.id}`)}>
                          <EyeIcon />
                          عرض التفاصيل
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default OrdersManagement;