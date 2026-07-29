import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./OrdersManagement.css";
import logo from "../assets/logo.png";
import SellerNavbar from "../components/SellerNavbar";
import { getSellerOrders } from "../services/orderService";
import { getAuthToken } from "../services/authService";
import { Inbox, AlertCircle, LayoutDashboard } from "lucide-react";
import LoadingState, { EmptyState, ErrorState } from "../components/LoadingState";
import { customerProfilePath } from "../utils/sellerHelpers";
import { getApiError } from "../utils/errorMessages";

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
// ✅ هاي القيم مطابقة تماماً لعمود status بقاعدة البيانات (enum):
// pending_review, accepted, rejected, in_production, ready, completed, cancelled
const STATUS_MAP = {
  pending_review: { label: "بانتظار المراجعة", className: "om-badge-yellow" },
  accepted: { label: "موافق عليه", className: "om-badge-green" },
  in_production: { label: "قيد التنفيذ", className: "om-badge-blue" },
  ready: { label: "جاهز", className: "om-badge-purple" },
  completed: { label: "مكتمل", className: "om-badge-gray" },
  rejected: { label: "مرفوض", className: "om-badge-red" },
  cancelled: { label: "ملغي", className: "om-badge-red" },
};

function StatusBadge({ status }) {
  const info = STATUS_MAP[status] || { label: status || "غير معروف", className: "om-badge-blue" };
  return <span className={`om-badge ${info.className}`}>{info.label}</span>;
}

const OrdersManagement = () => {
  const navigate = useNavigate();
  const token = getAuthToken();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pendingReview: 0,
    accepted: 0,
    inProduction: 0,
    ready: 0,
    completed: 0,
    cancelled: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getSellerOrders(token);

        // شكل الريسبونس الحقيقي: { status: "success", data: { orders: [], stats: {...}, pagination: {...} } }
        const list = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
          ? res.data
          : res?.data?.orders ?? res?.orders ?? [];

        const backendStats = res?.data?.stats ?? res?.stats ?? null;

        setOrders(
          list.map((o) => ({
            id: o.id ?? o._id,
            orderNumber: o.orderNumber ?? o.order_number ?? o.id,
            customer: o.customerName ?? o.buyerName ?? o.buyer?.name ?? o.customer_name ?? "عميل",
            // ✅ نحتفظ بكامل object تبع customer (فيه id, actionUrl, avatar)
            //    لاستخدامه ببروفايل الزبون عند الضغط على اسمه
            customerObj: o.customer ?? null,
            date: (o.date ?? o.createdAt ?? o.created_at ?? "").slice(0, 10),
            productsCount: o.itemsCount ?? o.productsCount ?? o.items?.length ?? 0,
            total: o.totalPrice ?? o.total ?? o.total_price ?? 0,
            status: o.status ?? "pending_review",
          }))
        );

        if (backendStats) {
          setStats({
            total: backendStats.total ?? 0,
            pendingReview: backendStats.pendingReview ?? 0,
            accepted: backendStats.accepted ?? 0,
            inProduction: backendStats.inProduction ?? 0,
            ready: backendStats.ready ?? 0,
            completed: backendStats.completed ?? 0,
            cancelled: backendStats.cancelled ?? 0,
            rejected: backendStats.rejected ?? 0,
          });
        }
      } catch (err) {
        console.error("getSellerOrders failed:", err);
        // ✅ ما بنعرض mock data — بنعرض رسالة خطأ حقيقية + زر retry
        const errInfo = getApiError(err);
        setError(errInfo);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // ✅ دالة retry لإعادة جلب الطلبات
  const retryLoad = useCallback(() => {
    setError(null);
    setLoading(true);
    // إعادة تشغيل effect يدوياً
    (async () => {
      try {
        setLoading(true);
        const res = await getSellerOrders(token);
        const list = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
          ? res.data
          : res?.data?.orders ?? res?.orders ?? [];

        const backendStats = res?.data?.stats ?? res?.stats ?? null;

        setOrders(
          list.map((o) => ({
            id: o.id ?? o._id,
            orderNumber: o.orderNumber ?? o.order_number ?? o.id,
            customer: o.customerName ?? o.buyerName ?? o.buyer?.name ?? o.customer_name ?? "عميل",
            customerObj: o.customer ?? null,
            date: (o.date ?? o.createdAt ?? o.created_at ?? "").slice(0, 10),
            productsCount: o.itemsCount ?? o.productsCount ?? o.items?.length ?? 0,
            total: o.totalPrice ?? o.total ?? o.total_price ?? 0,
            status: o.status ?? "pending_review",
          }))
        );

        if (backendStats) {
          setStats({
            total: backendStats.total ?? 0,
            pendingReview: backendStats.pendingReview ?? 0,
            accepted: backendStats.accepted ?? 0,
            inProduction: backendStats.inProduction ?? 0,
            ready: backendStats.ready ?? 0,
            completed: backendStats.completed ?? 0,
            cancelled: backendStats.cancelled ?? 0,
            rejected: backendStats.rejected ?? 0,
          });
        }
        setError(null);
      } catch (err) {
        const errInfo = getApiError(err);
        setError(errInfo);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
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

  // الإحصائيات: من الباك دائماً (stats.total, stats.pendingReview, etc.)
  // ما بنحسبها يدوياً من orders لأن الـ pagination ممكن يخفي قسم من البيانات
  const totalOrders = stats.total;
  const reviewCount = stats.pendingReview;
  const approvedCount = stats.accepted;
  const pendingCount = stats.inProduction;

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
            <p className="om-stat-value">{loading ? "—" : totalOrders}</p>
          </div>
          <div className="om-stat-card">
            <p className="om-stat-label">بانتظار المراجعة</p>
            <p className="om-stat-value">{loading ? "—" : reviewCount}</p>
          </div>
          <div className="om-stat-card">
            <p className="om-stat-label">موافق عليها</p>
            <p className="om-stat-value">{loading ? "—" : approvedCount}</p>
          </div>
          <div className="om-stat-card">
            <p className="om-stat-label">قيد التنفيذ</p>
            <p className="om-stat-value">{loading ? "—" : pendingCount}</p>
          </div>
        </div>

        {/* Orders table */}
        <div className="om-table-card">
          <h2 className="om-table-title">قائمة الطلبات</h2>

          {loading ? (
            <div className="om-loading-wrap">
              <LoadingState message="جاري تحميل الطلبات…" />
            </div>
          ) : error ? (
            <div className="om-error-block">
              <ErrorState
                icon={error.isNotFound ? LayoutDashboard : AlertCircle}
                title={error.title || "تعذّر تحميل الطلبات"}
                message={error.message}
                onRetry={error.isNotFound ? null : retryLoad}
              />
              {error.isNotFound && (
                <div className="om-error-hint">
                  <p>
                    💡 الباك إند ما عندوش endpoint مخصص لطلبات البائع لحد الآن.
                    <br />
                    بيكفي تكمل إعداد ملف متجرك، وأي endpoint جديد رح يظهر تلقائياً هنا.
                  </p>
                  <button
                    type="button"
                    className="om-dashboard-link-btn"
                    onClick={() => navigate("/seller/dashboard")}
                  >
                    <LayoutDashboard size={16} />
                    الذهاب للوحة التحكم (آخر الطلبات متاحة هناك)
                  </button>
                </div>
              )}
              {error.isPermission && (
                <div className="om-error-hint">
                  <p>💡 قد تحتاج لإكمال إعداد ملف متجرك أولاً.</p>
                  <button
                    type="button"
                    className="om-dashboard-link-btn"
                    onClick={() => navigate("/seller/profile/edit")}
                  >
                    إكمال ملف المتجر
                  </button>
                </div>
              )}
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="لا توجد طلبات بعد"
              description="ستظهر طلبات المشترين هنا عند وصولها"
            />
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
                  {orders.map((order) => {
                    // ✅ استخراج الـ customer ID الصحيح (actionUrl > customerId > id)
                    const customerPath = customerProfilePath(order.customerObj);
                    return (
                    <tr key={order.id}>
                      <td className="om-cell-id">{order.orderNumber}</td>
                      <td>
                        {customerPath ? (
                          <Link
                            to={customerPath}
                            className="om-cell-with-icon om-cell-customer om-cell-customer--link"
                            title="عرض بروفايل الزبون"
                          >
                            {order.customer}
                            <UserIcon />
                          </Link>
                        ) : (
                          <span className="om-cell-with-icon">
                            {order.customer}
                            <UserIcon />
                          </span>
                        )}
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
                          {Number(order.total).toFixed(2)}
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
                    );
                  })}
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