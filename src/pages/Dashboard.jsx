import { useState, useEffect } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import {
  CheckCircle,
  Package,
  Truck,
  Clock,
  Star,
  ShoppingCart,
  PackagePlus,
  Loader2,
} from "lucide-react";
import SellerNavbar from "../components/SellerNavbar";
import "./Dashboard.css";
import { getSellerOrders } from "../services/orderService";
import { getProducts } from "../services/productService";
import { getSellerDashboard } from "../services/dashboardService";
import { customerProfilePath } from "../utils/sellerHelpers";
import { useAuth } from "../context/AuthContext";

const STATUS_LABELS = {
  pending: "بانتظار",
  processing: "قيد التنفيذ",
  shipped: "قيد التنفيذ",
  delivered: "مكتمل",
  cancelled: "ملغي",
};

const STATUS_CLASS = {
  pending: "dsh-tag-waiting",
  processing: "dsh-tag-progress",
  shipped: "dsh-tag-progress",
  delivered: "dsh-tag-approved",
  cancelled: "dsh-tag-cancelled",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { hasSellerProfile, isBootstrapping } = useAuth();

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null); // بيانات جاهزة من /api/seller/dashboard إذا توفرت
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState("");

  // ✅ Defensive guard: لو الـ RequireSeller ما اشتغل (لأي سبب)
  //    أو الـ state لسا ما تحدّث، نحوّل لصفحة إنشاء المتجر بدل ما نعرض
  //    dashboard فاضي.
  // ⚠️ isBootstrapping بنستناه عشان ما نعمل redirect غلط لو الـ AuthContext
  //    عم يعمل refresh session بهدوء.
  if (!isBootstrapping && hasSellerProfile === false) {
    return <Navigate to="/customer/become-seller" replace />;
  }

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        setFatalError("");

        // المحاولة الأولى: الـ endpoint الجديد المخصص (أسرع وأدق - كل شي دفعة وحدة)
        let dashboardOk = false;
        try {
          const dashboardRes = await getSellerDashboard();
          if (!isMounted) return;
          const d = dashboardRes?.data?.dashboard ?? {};
          const s = d.stats ?? {};
          const r = d.rating ?? {};

          setStats({
            completedCount: s.completedOrder ?? 0,
            activeProductsCount: s.activeProduct ?? 0,
            inProgressCount: s.inProgressOrder ?? 0,
            pendingCount: s.waitingOrder ?? 0,
            avgRating: Number(r.average) || 0,
            ratingDistribution: r.distribution ?? null,
            ratingCount: r.totalReviews ?? 0,
          });

          setReviews(Array.isArray(r.reviews) ? r.reviews : []);
          setOrders(Array.isArray(d.recentOrders) ? d.recentOrders : []);

          dashboardOk = true;
        } catch (err) {
          // الـ endpoint لسا غير جاهز أو صار خطأ → نكمل بالطريقة القديمة تحت
          if (isMounted) setStats(null);
          // 401 = token منتهي (الـ interceptor بيعمل refresh، لو فشل رح يطلعنا)
          // 403 = user مش بائع فعلاً (لازم يذهب لـ become-seller)
          const status = err?.response?.status;
          if (status === 403) {
            setFatalError(
              "حسابك ما عندوش صلاحية بائع بعد. بنرجّعك لصفحة إنشاء المتجر..."
            );
            setTimeout(() => navigate("/customer/become-seller", { replace: true }), 1500);
            return;
          }
        }

        // لو الـ dashboard endpoint فشل، منجيب البيانات القديمة يدوياً كـ fallback
        if (!dashboardOk && isMounted) {
          const [ordersData, productsData] = await Promise.all([
            getSellerOrders().catch(() => ({ orders: [] })),
            getProducts().catch(() => ({ products: [] })),
          ]);
          setOrders(
            Array.isArray(ordersData) ? ordersData : (ordersData.orders ?? []),
          );
          setProducts(
            Array.isArray(productsData)
              ? productsData
              : (productsData.products ?? []),
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (fatalError && !loading) {
    return (
      <div className="dsh-wrapper">
        <SellerNavbar />
        <div className="dsh-content" dir="rtl" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <p style={{ color: "#b91c1c", fontSize: 16, marginBottom: "1rem" }}>{fatalError}</p>
          <Loader2 className="dsh-spinner" />
        </div>
      </div>
    );
  }

  // حساب يدوي (Fallback) - يُستخدم فقط إذا stats من الـ API الجديد غير متوفرة
  const completedCount =
    stats?.completedCount ?? orders.filter((o) => o.status === "delivered").length;
  const activeProductsCount =
    stats?.activeProductsCount ?? products.filter((p) => p.status === "active").length;
  const inProgressCount =
    stats?.inProgressCount ??
    orders.filter((o) => ["processing", "shipped"].includes(o.status)).length;
  const pendingCount =
    stats?.pendingCount ?? orders.filter((o) => o.status === "pending").length;

  const avgRating =
    stats?.avgRating ||
    (reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0);

  const recentOrders = orders.slice(0, 3);

  return (
    <div className="dsh-wrapper">
      <SellerNavbar />

      <div className="dsh-content" dir="rtl">
        <div className="dsh-title-area">
          <h1>مرحباً بك في Gaza-Gate</h1>
          <p>إليك نظرة عامة على متجرك ونشاطاته</p>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="dsh-stats-grid">
          <div className="dsh-stat-card">
            <div className="dsh-stat-icon dsh-icon-green">
              <CheckCircle size={22} />
            </div>
            <div className="dsh-stat-info">
              <span className="dsh-stat-value">
                {loading ? "—" : completedCount}
              </span>
              <span className="dsh-stat-label">الطلبات المكتملة</span>
              <span className="dsh-stat-sub">انجازات هذا الشهر</span>
            </div>
          </div>

          <div className="dsh-stat-card">
            <div className="dsh-stat-icon dsh-icon-orange">
              <Package size={22} />
            </div>
            <div className="dsh-stat-info">
              <span className="dsh-stat-value">
                {loading ? "—" : activeProductsCount}
              </span>
              <span className="dsh-stat-label">المنتجات النشطة</span>
              <span className="dsh-stat-sub">معروضة للجمهور</span>
            </div>
          </div>

          <div className="dsh-stat-card">
            <div className="dsh-stat-icon dsh-icon-orange">
              <Truck size={22} />
            </div>
            <div className="dsh-stat-info">
              <span className="dsh-stat-value">
                {loading ? "—" : inProgressCount}
              </span>
              <span className="dsh-stat-label">طلبات قيد التنفيذ</span>
              <span className="dsh-stat-sub">قيد المعالجة الأن</span>
            </div>
          </div>

          <div className="dsh-stat-card">
            <div className="dsh-stat-icon dsh-icon-orange">
              <Clock size={22} />
            </div>
            <div className="dsh-stat-info">
              <span className="dsh-stat-value">
                {loading ? "—" : pendingCount}
              </span>
              <span className="dsh-stat-label">طلبات قيد الانتظار</span>
              <span className="dsh-stat-sub">بحاجة لاتخاذ إجراء</span>
            </div>
          </div>
        </div>

        {/* تقييم المتجر */}
        <div className="dsh-panel">
          <div className="dsh-panel-header">
            <span className="dsh-panel-title">
              <Star size={16} color="#f97316" /> تقييم المتجر
            </span>
            <button
              className="dsh-link-btn"
              onClick={() => navigate("/seller/ratings")}
            >
              عرض الكل ←
            </button>
          </div>

          <div className="dsh-rating-summary">
            <div className="dsh-rating-bars">
              {[5, 4, 3].map((star) => (
                <div className="dsh-rating-bar-row" key={star}>
                  <span>{star} ★</span>
                  <div className="dsh-rating-bar-track">
                    <div
                      className="dsh-rating-bar-fill"
                      style={{
                        width: `${
                          stats?.ratingDistribution
                            ? (stats.ratingDistribution[star] ?? 0)
                            : (reviews.filter((r) => r.rating === star).length /
                                (reviews.length || 1)) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <span>
                    {stats?.ratingDistribution
                      ? stats.ratingDistribution[star] ?? 0
                      : reviews.filter((r) => r.rating === star).length}
                  </span>
                </div>
              ))}
            </div>
            <div className="dsh-rating-score">
              <span className="dsh-rating-number">{avgRating.toFixed(1)}</span>
              <span className="dsh-rating-stars">{"★".repeat(5)}</span>
              <span className="dsh-rating-count">
                {stats?.ratingCount ?? reviews.length} تقييمات حديثة
              </span>
            </div>
          </div>

          <div className="dsh-reviews-list">
            {reviews.length === 0 ? (
              <p className="dsh-empty-text">لا توجد تقييمات حتى الآن</p>
            ) : (
              reviews.map((r, idx) => {
                // ✅ استخراج الـ customer ID الصحيح (actionUrl > customerId > id)
                const customerPath = customerProfilePath(r.customer);
                // 🆕 الـ backend ما بيرجع أي id للتقييم نفسه (لا بالـ Dashboard
                // ولا بصفحة RatingsManagement). فبدل الاعتماد على reviewId
                // (غير موجود أصلاً)، منبني مفتاح مركّب من (customer.id + rating
                // + التاريخ + التعليق) — نفس المنطق بالضبط المستخدم جوا
                // RatingsManagement.jsx (buildReviewMatchKey/getReviewIdentity)
                // عشان تنطابق الاثنتين وتوصل بالضبط لنفس التقييم بالسكرول+الهايلايت.
                const goToReview = () => {
                  const dateStr = (r.date || "").toString().slice(0, 10);
                  const commentStr = (r.comment || "").toString().trim().slice(0, 60);
                  const reviewKey = `${r.customer?.id || ""}|${r.rating || ""}|${dateStr}|${commentStr}`;
                  navigate(`/seller/ratings?reviewKey=${encodeURIComponent(reviewKey)}`);
                };

                return (
                  <div
                    className="dsh-review-row dsh-row--clickable"
                    key={idx}
                    onClick={goToReview}
                    role="button"
                    tabIndex={0}
                  >
                    {customerPath ? (
                      <Link
                        to={customerPath}
                        className="dsh-avatar dsh-avatar--link"
                        title={`بروفايل ${r.customerName ?? ""}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.avatar ? (
                          <img src={r.avatar} alt={r.customerName ?? ""} />
                        ) : (
                          r.customerName?.[0] ?? "؟"
                        )}
                      </Link>
                    ) : (
                      <div className="dsh-avatar">
                        {r.avatar ? (
                          <img src={r.avatar} alt={r.customerName ?? ""} />
                        ) : (
                          r.customerName?.[0] ?? "؟"
                        )}
                      </div>
                    )}
                    <div className="dsh-review-body">
                      <div className="dsh-review-top">
                        {customerPath ? (
                          <Link
                            to={customerPath}
                            className="dsh-review-name dsh-review-name--link"
                            title="عرض بروفايل الزبون"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {r.customerName}
                          </Link>
                        ) : (
                          <span className="dsh-review-name">{r.customerName}</span>
                        )}
                        <span className="dsh-review-stars">
                          {"★".repeat(r.rating)}
                          {"☆".repeat(5 - r.rating)}
                        </span>
                      </div>
                      <p className="dsh-review-text">{r.comment}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* الطلبات الأخيرة */}
        <div className="dsh-panel">
          <div className="dsh-panel-header">
            <span className="dsh-panel-title">الطلبات الأخيرة</span>
            <button
              className="dsh-link-btn"
              onClick={() => navigate("/seller/orders")}
            >
              عرض الكل ←
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <p className="dsh-empty-text">لا توجد طلبات حتى الآن</p>
          ) : (
            <div className="dsh-orders-list">
              {recentOrders.map((order) => {
                const id = order._id ?? order.id;
                // ✅ استخراج الـ customer ID الصحيح للـ Link
                const customerPath = customerProfilePath(order.customer);

                const goToOrder = () => {
                  if (id) navigate(`/seller/orders/${id}`);
                };

                return (
                  <div
                    className="dsh-order-row dsh-row--clickable"
                    key={id}
                    onClick={goToOrder}
                    role="button"
                    tabIndex={0}
                  >
                    <div>
                      <span className="dsh-order-number">
                        {order.orderNumber ?? `ORD-${id?.toString().slice(-3)}`}
                      </span>
                      {customerPath ? (
                        <Link
                          to={customerPath}
                          className="dsh-order-buyer dsh-order-buyer--link"
                          title="عرض بروفايل الزبون"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {order.customerName ?? "مشتري"}
                        </Link>
                      ) : (
                        <p className="dsh-order-buyer">
                          {order.customerName ?? "مشتري"}
                        </p>
                      )}
                    </div>
                    <span
                      className={`dsh-tag ${STATUS_CLASS[order.status] ?? ""}`}
                    >
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    <span className="dsh-order-total">
                      {order.total ?? order.totalPrice ?? 0}₪
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* إجراءات سريعة */}
        <div className="dsh-quick-actions">
                        <button
            className="dsh-quick-btn dsh-quick-dark"
            onClick={() => navigate("/seller/orders")}
          >
            <ShoppingCart size={26} />
            <span className="dsh-quick-title">متابعة الطلبات</span>
            <span className="dsh-quick-sub">تتبع وإدارة الطلبات</span>
          </button>
          <button
            className="dsh-quick-btn dsh-quick-orange"
            onClick={() => navigate("/seller/products")}
          >
            <PackagePlus size={26} />
            <span className="dsh-quick-title">إدارة المنتجات</span>
            <span className="dsh-quick-sub">إضافة وتعديل منتجاتك</span>
          </button>
        </div>
      </div>
    </div>
  );
}