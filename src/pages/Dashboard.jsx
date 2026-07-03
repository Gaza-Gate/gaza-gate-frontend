import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Package,
  Truck,
  Clock,
  Star,
  ShoppingCart,
  PackagePlus,
} from "lucide-react";
import SellerNavbar from "../components/SellerNavbar";
import "./Dashboard.css";
import { getSellerOrders } from "../services/orderService";
import { getProducts } from "../services/productService";
import { getSellerDashboard } from "../services/dashboardService";

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

// بيانات تقييم افتراضية تُستخدم فقط إذا الـ API الجديد لسا غير شغال (fallback)
const FALLBACK_REVIEWS = [
  { name: "أحمد محمد", rating: 5, text: "منتج ممتاز جداً!" },
  { name: "فاطمة علي", rating: 4, text: "جودة عالية لكن التوصيل تأخر" },
  { name: "محمود حسن", rating: 5, text: "صابون طبيعي رائع" },
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState(FALLBACK_REVIEWS);
  const [stats, setStats] = useState(null); // بيانات جاهزة من /api/seller/dashboard إذا توفرت
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // المحاولة الأولى: الـ endpoint الجديد المخصص (أسرع وأدق)
        try {
          const dashboardRes = await getSellerDashboard();
          // ⚠️ لما يجهز الباك اند، تأكدي من أسماء الحقول هون وعدليها حسب الـ Response الفعلي
          const d = dashboardRes.data ?? dashboardRes;
          setStats({
            completedCount: d.completedOrders ?? d.completedCount ?? 0,
            activeProductsCount: d.activeProducts ?? d.activeProductsCount ?? 0,
            inProgressCount: d.inProgressOrders ?? d.inProgressCount ?? 0,
            pendingCount: d.pendingOrders ?? d.pendingCount ?? 0,
            avgRating: d.rating?.average ?? d.avgRating ?? 0,
            ratingDistribution: d.rating?.distribution ?? null,
            ratingCount: d.rating?.count ?? d.reviews?.length ?? 0,
          });
          if (Array.isArray(d.reviews) && d.reviews.length > 0) {
            setReviews(d.reviews);
          }
          // لما الـ endpoint يشتغل، ما عاد محتاجين نجيب orders/products يدوياً للإحصائيات
          // (بس بنخليهم لقسم "الطلبات الأخيرة" تحت)
        } catch {
          // الـ endpoint لسا غير جاهز (404) → نكمل بالطريقة القديمة تحت
          setStats(null);
        }

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
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
    reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1);

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
            {reviews.map((r, idx) => (
              <div className="dsh-review-row" key={idx}>
                <div className="dsh-avatar">{r.name[0]}</div>
                <div className="dsh-review-body">
                  <div className="dsh-review-top">
                    <span className="dsh-review-name">{r.name}</span>
                    <span className="dsh-review-stars">
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </span>
                  </div>
                  <p className="dsh-review-text">{r.text}</p>
                </div>
              </div>
            ))}
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
                return (
                  <div className="dsh-order-row" key={id}>
                    <div>
                      <span className="dsh-order-number">
                        ORD-{order.orderNumber ?? id?.toString().slice(-3)}
                      </span>
                      <p className="dsh-order-buyer">
                        {order.buyerName ?? order.buyer?.name ?? "مشتري"}
                      </p>
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
            onClick={() => navigate("/seller/orders/:id")}
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