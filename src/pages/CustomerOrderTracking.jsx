import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight, CheckCircle, Store, Package, Star, XCircle, CheckCircle2,
  CreditCard, Banknote, Wallet, Hash, Calendar,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { getOrderDetails, getPaymentMethodLabel } from "../services/orderService";
import { ORDER_STEPS, getStepIndex, isCancelledStatus, isCancellableStatus, getStatusLabel } from "../utils/orderStatus";
import { checkReviewEligibility } from "../utils/reviewEligibility";
import { getMyReviewedProductsMap } from "../services/reviewService";
import { OrderDetailsSkeleton } from "../components/LoadingState";
import logo from "../assets/logo.png";
import "./CustomerOrderTracking.css";
import ReviewModal from "../components/ReviewModal";
import CancelOrderModal from "../components/CancelOrderModal";
import { useToast, ToastContainer } from "../components/Toast";
import { Pencil, Trash2 } from "lucide-react";

function getStepState(index, activeIndex) {
  if (index < activeIndex) return "done";
  if (index === activeIndex) return "current";
  return "pending";
}

/**
 * أيقونة وسيلة الدفع
 */
function PaymentIcon({ method, size = 14 }) {
  const label = getPaymentMethodLabel(method);
  if (method === "cash" || method === "cash_on_delivery") return <Banknote size={size} />;
  if (method === "card" || method === "credit_card" || method === "visa" || method === "mastercard")
    return <CreditCard size={size} />;
  return <Wallet size={size} />;
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
  const [cancelOpen, setCancelOpen] = useState(false);
  // Map<productId, reviewData> — يربط كل منتج بالـ reviewId + data
  const [reviewedMap, setReviewedMap] = useState(new Map());
  const toast = useToast();

  // الأهلية منطق موحد
  const reviewEligibility = useMemo(
    () => (order ? checkReviewEligibility(order) : { allowed: false }),
    [order]
  );
  // نستخدم canCancel من الباك كمرجع أساسي
  // ونحتفظ بالـ local check كاحتياط لو الباك ما أرسل الحقل
  const canCancel = useMemo(() => {
    if (!order) return false;
    if (typeof order.canCancel === "boolean") return order.canCancel;
    return isCancellableStatus(order.status);
  }, [order]);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // ✅ تحميل خريطة التقييمات من السيرفر — يربط productId بـ review كامل
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map = await getMyReviewedProductsMap();
      if (!cancelled) setReviewedMap(map);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshReviewedMap = useCallback(async () => {
    const map = await getMyReviewedProductsMap({ force: true });
    setReviewedMap(map);
    return map;
  }, []);

  // ✅ Fallback: لو الباك ما رجّع productId بالـ order items، نعمل lookup من منتجات المتجر
  // ✅ الباك يرجع productId مباشرة بالـ item — ما في داعي لـ fallback

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login/customer");
        return;
      }
      const data = await getOrderDetails(id);
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
        <main className="ot-main">
          <OrderDetailsSkeleton />
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="ot-wrapper" dir="rtl">
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
  const totalQuantity = items.reduce((s, it) => s + Number(it.quantity ?? 1), 0);
  const payment = getPaymentMethodLabel(order.paymentMethod);

  return (
    <div className="ot-wrapper" dir="rtl">
      <main className="ot-main">
        <button className="ot-back" onClick={() => navigate("/my-orders")}>
          <ChevronRight size={14} />
          العودة الى طلباتي
        </button>

        {/* Summary bar */}
        <div className="ot-summary-bar">
          <div className="ot-summary-info">
            <span className="ot-order-id">{order.orderNumber || order.id?.slice(0, 8)}</span>
            <span className="ot-order-date">{formatDateTime(order.createdAt)}</span>
          </div>
          <div className="ot-summary-right">
            <span className="ot-status-badge">
              <span className="ot-status-dot" />
              {getStatusLabel(order.status)}
            </span>
            <span className="ot-total">{order.totalPrice}₪</span>
            {canCancel && (
              <button
                type="button"
                className="ot-cancel-btn"
                onClick={() => setCancelOpen(true)}
                title="إلغاء هذا الطلب"
              >
                <XCircle size={14} />
                إلغاء الطلب
              </button>
            )}
          </div>
        </div>

        {/* Meta info strip (order number, payment, items count) */}
        <div className="ot-meta-strip">
          <div className="ot-meta-item">
            <Hash size={13} />
            <span className="ot-meta-label">رقم الطلب</span>
            <strong className="ot-meta-value">{order.orderNumber}</strong>
          </div>
          <div className="ot-meta-item">
            <PaymentIcon method={order.paymentMethod} size={13} />
            <span className="ot-meta-label">الدفع</span>
            <strong className="ot-meta-value">{payment.ar}</strong>
          </div>
          <div className="ot-meta-item">
            <Package size={13} />
            <span className="ot-meta-label">المنتجات</span>
            <strong className="ot-meta-value">{totalQuantity} قطعة ({items.length} منتج)</strong>
          </div>
          <div className="ot-meta-item">
            <Calendar size={13} />
            <span className="ot-meta-label">تاريخ الطلب</span>
            <strong className="ot-meta-value">{formatDateTime(order.createdAt)}</strong>
          </div>
        </div>

        <div className="ot-layout">
          <section className="ot-items">
            <div className="ot-store-card">
              <Store size={16} />
              <span>{order.seller?.storeName || "متجر"}</span>
            </div>

            {items.map((item) => {
              // ✅ الباك يرجع productId مباشرة بالـ item
              const productId = item.productId || null;
              // ✅ بنجيب التقييم الكامل (مع reviewId) من الـ map
              const existingReview = productId
                ? reviewedMap.get(String(productId)) || null
                : null;
              const isReviewed = Boolean(existingReview?.id);
              const canRate = reviewEligibility.allowed && !isReviewed;
              return (
                <div className="ot-item-card" key={item.id}>
                  <img
                    src={item.primaryImage || logo}
                    alt={item.productName}
                    className="ot-item-img"
                  />
                  <div className="ot-item-info">
                    <h3>{item.productName}</h3>
                    <p className="ot-item-qty">
                      الكمية: {item.quantity} × {item.unitPrice}₪
                    </p>

                    {canRate && (
                      <button
                        onClick={() => {
                          setReviewTarget({
                            mode: "create",
                            productId,
                            productName: item.productName,
                          });
                        }}
                        className="ot-rate-btn"
                        title="تقييم المنتج"
                      >
                        <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
                        قيّم المنتج
                      </button>
                    )}
                    {isReviewed && (
                      <div className="ot-reviewed-actions">
                        <span className="ot-reviewed-badge">
                          <CheckCircle2 size={13} />
                          تم تقييم هذا المنتج
                        </span>
                        <div className="ot-reviewed-buttons">
                          <button
                            type="button"
                            className="ot-edit-btn"
                            onClick={() =>
                              setReviewTarget({
                                mode: "edit",
                                productId,
                                productName: item.productName,
                                existingReview,
                              })
                            }
                            title="تعديل التقييم"
                          >
                            <Pencil size={12} />
                            تعديل
                          </button>
                          <button
                            type="button"
                            className="ot-delete-btn"
                            onClick={() =>
                              setReviewTarget({
                                mode: "edit",
                                productId,
                                productName: item.productName,
                                existingReview,
                              })
                            }
                            title="حذف التقييم"
                          >
                            <Trash2 size={12} />
                            حذف
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="ot-item-price">{item.lineTotal}₪</span>
                </div>
              );
            })}

            <div className="ot-subtotal">
              <span>المجموع الفرعي</span>
              <span>{order.totalPrice}₪</span>
            </div>

            <div className="ot-shipping">
              <span>الشحن</span>
              <span>يُحسب عند التوصيل</span>
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
        mode={reviewTarget?.mode || "create"}
        productId={reviewTarget?.productId}
        productName={reviewTarget?.productName}
        order={order}
        existingReview={reviewTarget?.existingReview}
        onRefreshOrder={fetchOrder}
        onSubmitted={async (response, opts = {}) => {
          setReviewTarget(null);
          // ✅ refresh الـ map — حتى الزر "تم التقييم" يطلع فوراً
          await refreshReviewedMap();

          if (response?.alreadyReviewed) {
            return;
          }

          if (opts?.mode === "edit") {
            toast.success(
              "تم تحديث التقييم ✓",
              "تقييمك المعدّل يظهر الآن على المنتج والمتجر",
              { duration: 4500 }
            );
          } else {
            toast.success(
              "تم إرسال التقييم ⭐",
              response?.id
                ? `رقم التقييم #${response.id.slice(0, 8)} — شكراً لمشاركتك تجربتك`
                : "شكراً لمشاركتك تجربتك مع المنتج",
              { duration: 5000 }
            );
          }
        }}
        onDeleted={async () => {
          setReviewTarget(null);
          // ✅ refresh الـ map — حتى الزر "قيّم المنتج" يرجع
          await refreshReviewedMap();
          toast.success(
            "تم حذف التقييم",
            "يمكنك تقييم المنتج مرة أخرى",
            { duration: 4000 }
          );
        }}
      />
      <CancelOrderModal
        open={cancelOpen}
        order={order}
        onClose={() => setCancelOpen(false)}
        onCancelled={(cancelledOrder) => {
          // ندمج بحذر — نحتفظ بكل بيانات order الأصلية
          // ونحدّث فقط الحقول اللي تغيّرت
          setOrder((prev) =>
            prev
              ? {
                  ...prev,
                  status: "cancelled",
                  canCancel: false, // بعد الإلغاء ما عاد ينفع يلغي
                }
              : prev
          );
          setCancelOpen(false);
          toast.success(
            "تم إلغاء الطلب ✓",
            `الطلب ${cancelledOrder?.orderNumber || order.orderNumber} تم إلغاؤه بنجاح`,
            { duration: 5000 }
          );
        }}
      />
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
