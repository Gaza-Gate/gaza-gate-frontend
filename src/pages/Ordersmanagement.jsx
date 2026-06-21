import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./OrdersManagement.css";
import logo from "../assets/logo.png";

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
  const [orders] = useState(ORDERS_DATA);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

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
      {/* Navbar */}
      <nav className="om-navbar">
        <div className="om-nav-logo">
          <img src={logo} alt="Gaza Gate" className="om-logo-img" />
        </div>
        <div className="om-nav-links">
          <a href="#" className="om-nav-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
            لوحة التحكم
          </a>
          <a href="#" className="om-nav-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            المنتجات
          </a>
          <a href="#" className="om-nav-link" onClick={() => navigate("/seller/profile")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            ملف المتجر
          </a>
          <div className="om-dropdown" ref={moreRef}>
            <button
              type="button"
              className="om-nav-link om-dropdown-trigger"
              onClick={() => setMoreOpen((prev) => !prev)}
            >
              المزيد
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={moreOpen ? "om-chevron-open" : ""}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {moreOpen && (
              <div className="om-dropdown-menu">
                <a
                  href="#"
                  className="om-dropdown-item"
                  onClick={(e) => { e.preventDefault(); setMoreOpen(false); navigate("/seller/orders"); }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  الطلبات
                </a>
                <a
                  href="#"
                  className="om-dropdown-item"
                  onClick={(e) => { e.preventDefault(); setMoreOpen(false); navigate("/seller/ratings"); }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  التقييمات
                </a>
                <a
                  href="#"
                  className="om-dropdown-item"
                  onClick={(e) => { e.preventDefault(); setMoreOpen(false); navigate("/seller/messages"); }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  المراسلات
                </a>
              </div>
            )}
          </div>
        </div>
        <div className="om-nav-left">
          <button className="om-btn-notif">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="om-notif-dot"></span>
          </button>
          <button className="om-btn-logout" onClick={() => navigate("/login")}>
            <span>خروج</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </nav>

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
                        {order.customer}
                        <UserIcon />
                      </span>
                    </td>
                    <td>
                      <span className="om-cell-with-icon">
                        {order.date}
                        <CalendarIcon />
                      </span>
                    </td>
                    <td>{order.productsCount} منتجات</td>
                    <td>
                      <span className="om-cell-with-icon om-cell-price">
                        {order.total.toFixed(2)}
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
        </div>

      </main>
    </div>
  );
};

export default OrdersManagement;