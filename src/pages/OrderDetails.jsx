import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import "./OrderDetails.css";

// ── Icons ──
const BackArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const PinIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const BoxIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const StepIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SuccessIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="9 12 12 15 16 10" />
  </svg>
);

// ── Workflow ──
// ✅ هاي القيم مطابقة تماماً لعمود status بقاعدة البيانات (enum):
// pending_review, accepted, rejected, in_production, ready, completed, cancelled
const WORKFLOW_STEPS = [
  { key: "pending_review", label: "بانتظار" },
  { key: "accepted",       label: "موافق عليه" },
  { key: "in_production",  label: "قيد التنفيذ" },
  { key: "ready",          label: "جاهز" },
  { key: "completed",      label: "مكتمل" },
];

const STATUS_BADGE = {
  pending_review: { label: "بانتظار المراجعة", className: "od-badge-yellow" },
  accepted:       { label: "موافق عليه",       className: "od-badge-green" },
  in_production:  { label: "قيد التنفيذ",      className: "od-badge-blue" },
  ready:          { label: "جاهز",              className: "od-badge-purple" },
  completed:      { label: "مكتمل",             className: "od-badge-gray" },
  rejected:       { label: "مرفوض",             className: "od-badge-red" },
  cancelled:      { label: "ملغي",              className: "od-badge-red" },
};

// ── Static fallback (لما ما يكون في باك اند) ──
const STATIC_ORDER = {
  id: "ORD-001",
  orderNumber: "ORD-001",
  date: "2026-06-10",
  time: "14:30",
  status: "pending_review",
  customer: { name: "أحمد محمد علي", phone: "+970599123456", address: "غزة، حي الرمال، شارع الجلاء" },
  products: [
    { name: "زيت زيتون فلسطيني", qty: 2, price: 45, total: 90 },
    { name: "صابون نابلسي",       qty: 4, price: 15, total: 60 },
  ],
  subtotal: 150,
  shipping: 10,
  total: 160,
};

const IS_API_READY = !!import.meta.env.VITE_API_URL;

// ── API Helpers ──
const fetchOrder = async (id) => {
  const res = await api.get(`/api/order/${id}`);
  return res.data;
};

const patchOrderStatus = async (id, newStatus) => {
  const res = await api.patch(`/api/order/${id}/status`, { status: newStatus });
  return res.data;
};

const rejectOrder = async (id, rejectionReason) => {
  const res = await api.patch(`/api/order/${id}/reject`, { rejectionReason });
  return res.data;
};

// ── تحويل شكل الداتا الحقيقية القادمة من الـ API لشكل يفهمه الكومبوننت ──
// الـ API بيرجع: { status: "success", data: { order: {...}, workflow: {...} } }
const normalizeOrder = (apiResponseData, fallbackId) => {
  // الـ API بيرجع الطلب جوا طبقتين: { status, data: { order: {...}, workflow: {...} } }
  const raw =
    apiResponseData?.data?.order ??
    apiResponseData?.order ??
    apiResponseData ??
    {};

  const createdAt = raw.created_at ?? raw.createdAt ?? "";
  const date = createdAt ? createdAt.slice(0, 10) : "";
  const time = createdAt ? createdAt.slice(11, 16) : "";

  const firstName = raw.customer?.user?.firstName ?? "";
  const lastName = raw.customer?.user?.lastName ?? "";
  const fullName = `${firstName} ${lastName}`.trim() || "عميل";
  const phone = raw.customer?.user?.phone ?? "غير متوفر";

  const neighborhood = raw.shippingNeighborhood ?? raw.shipping_neighborhood ?? "";
  const street = raw.shippingStreet ?? raw.shipping_street ?? "";
  const address = [neighborhood, street].filter(Boolean).join(" - ") || "غير متوفر";

  const products = (raw.items ?? raw.products ?? []).map((p) => ({
    name: p.name ?? p.productName ?? "منتج",
    qty: p.qty ?? p.quantity ?? 0,
    price: p.price ?? p.unitPrice ?? 0,
    total: p.total ?? (Number(p.qty ?? p.quantity ?? 0) * Number(p.price ?? p.unitPrice ?? 0)),
  }));

  return {
    id: raw.id ?? fallbackId,
    orderNumber: raw.orderNumber ?? raw.order_number ?? raw.id ?? fallbackId,
    date,
    time,
    status: raw.status ?? "pending_review",
    customer: { name: fullName, phone, address },
    products,
    subtotal: raw.subtotal ?? 0,
    shipping: raw.shippingFee ?? raw.shipping_fee ?? 0,
    total: raw.totalPrice ?? raw.total_price ?? 0,
  };
};

// ── Component ──
const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder]                 = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [updating, setUpdating]           = useState(false);
  const [rejecting, setRejecting]         = useState(false);
  const [showSuccess, setShowSuccess]     = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (IS_API_READY) {
        const data = await fetchOrder(id); // { order: {...}, workflow: {...} }
        setOrder(normalizeOrder(data, id));
      } else {
        setOrder({ ...STATIC_ORDER, id: id || STATIC_ORDER.id });
      }
    } catch (err) {
      console.error("فشل جلب الطلب:", err);
      setError("تعذّر تحميل بيانات الطلب. تأكد من الاتصال وأعد المحاولة.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  // بانر النجاح
  useEffect(() => {
    if (!showSuccess) return;
    setBannerVisible(false);
    const t1 = setTimeout(() => setBannerVisible(true), 10);
    const t2 = setTimeout(() => setBannerVisible(false), 6000);
    const t3 = setTimeout(() => setShowSuccess(false), 6350);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [showSuccess]);

  const handleUpdateStatus = async () => {
    if (!order || !nextStep || updating) return;
    setUpdating(true);
    setError(null);
    try {
      if (IS_API_READY) {
        await patchOrderStatus(order.id, nextStep.key);
      }
      setOrder((prev) => ({ ...prev, status: nextStep.key }));
      setShowSuccess(true);
    } catch (err) {
      console.error("فشل تحديث الحالة:", err);
      setError("تعذّر تحديث حالة الطلب. حاول مرة أخرى.");
    } finally {
      setUpdating(false);
    }
  };

    const handleReject = async () => {
    if (!order || rejecting) return;
    if (!rejectionReason.trim()) {
      setError("الرجاء كتابة سبب الرفض قبل المتابعة.");
      return;
    }
    setRejecting(true);
    setError(null);
    try {
      if (IS_API_READY) await rejectOrder(order.id, rejectionReason.trim());
      navigate("/seller/orders");
    } catch (err) {
      console.error("فشل رفض الطلب:", err);
      setError("تعذّر رفض الطلب. حاول مرة أخرى.");
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="od-root" dir="rtl">
        <div className="od-container od-state-center">
          <div className="od-spinner" />
          <p className="od-state-text">جاري تحميل بيانات الطلب…</p>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="od-root" dir="rtl">
        <div className="od-container od-state-center">
          <p className="od-state-error">{error}</p>
          <button type="button" className="od-btn-update" onClick={loadOrder}>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.key === order.status);
  const nextStep     = currentIndex >= 0 ? WORKFLOW_STEPS[currentIndex + 1] : null;
  const badge        = STATUS_BADGE[order.status] || STATUS_BADGE.pending_review;

  return (
    <div className="od-root" dir="rtl">
      <div className="od-container">

        <button type="button" className="od-back" onClick={() => navigate("/seller/orders")}>
          العودة للطلبات
          <BackArrowIcon />
        </button>

        <div className="od-title-row">
          <span className={`od-badge ${badge.className}`}>{badge.label}</span>
        </div>
        <h1 className="od-title">تفاصيل الطلب {order.orderNumber}</h1>
        <p className="od-subtitle">{order.date} - {order.time}</p>

        {error && order && (
          <div className="od-error-inline">{error}</div>
        )}

        {showSuccess && (
          <div className={`od-success-banner ${bannerVisible ? "od-success-banner-visible" : ""}`}>
            <div className="od-success-text">
              <span className="od-success-title">تم تحديث حالة الطلب بنجاح!</span>
              <span className="od-success-sub">تم إرسال إشعار للعميل بالتحديث</span>
            </div>
            <SuccessIcon />
          </div>
        )}

        {/* الـ Workflow بيظهر بس للحالات الطبيعية (مش لو الطلب مرفوض أو ملغي) */}
        {order.status !== "rejected" && order.status !== "cancelled" && (
          <div className="od-workflow-card">
            <h2 className="od-section-title">سير عمل الطلب (Workflow)</h2>
            <div className="od-steps">
              {WORKFLOW_STEPS.map((step, index) => (
                <div className="od-step" key={step.key}>
                  <div className="od-step-row">
                    <div
                      className={
                        "od-step-circle " +
                        (index < currentIndex ? "od-step-done"
                          : index === currentIndex ? "od-step-current"
                          : "od-step-pending")
                      }
                    >
                      {index <= currentIndex ? <StepIcon /> : index + 1}
                    </div>
                    {index < WORKFLOW_STEPS.length - 1 && (
                      <div className={`od-step-line ${index < currentIndex ? "od-step-line-done" : ""}`} />
                    )}
                  </div>
                  <span className={`od-step-label ${index === currentIndex ? "od-step-label-current" : ""}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {nextStep && (
              <div className="od-update-block">
                <button
                  type="button"
                  className={`od-btn-update ${updating ? "od-btn-loading" : ""}`}
                  onClick={handleUpdateStatus}
                  disabled={updating}
                >
                  {updating ? "جاري التحديث…" : `تحديث الحالة إلى ${nextStep.label}`}
                </button>
                <p className="od-update-note">سيتم إرسال إشعار تلقائياً للعميل عند تحديث الحالة</p>
              </div>
            )}

         {order.status === "pending_review" && (
  <div className="od-update-block">
    {!showRejectForm ? (
      <button
        type="button"
        className="od-btn-reject"
        onClick={() => setShowRejectForm(true)}
      >
        رفض الطلب
      </button>
    ) : (
      <div className="od-reject-form">
        <textarea
          className="od-reject-textarea"
          placeholder="اكتب سبب رفض الطلب (سيصل هذا السبب إلى العميل)…"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          rows={3}
        />
        <div className="od-reject-form-actions">
          <button
            type="button"
            className={`od-btn-reject ${rejecting ? "od-btn-loading" : ""}`}
            onClick={handleReject}
            disabled={rejecting}
          >
            {rejecting ? "جاري الرفض…" : "تأكيد الرفض"}
          </button>
          <button
            type="button"
            className="od-btn-cancel-reject"
            onClick={() => { setShowRejectForm(false); setRejectionReason(""); setError(null); }}
            disabled={rejecting}
          >
            إلغاء
          </button>
        </div>
      </div>
    )}
  </div>
)}
 </div>
        )}

        <div className="od-info-grid-wrapper">
          <div className="od-info-grid">
            <div className="od-info-card">
              <div className="od-info-header">
                <span>معلومات الطلب</span>
                <CalendarIcon />
              </div>
              <div className="od-info-rows">
                <div className="od-info-row">
                  <span className="od-info-value">{order.orderNumber}</span>
                  <span className="od-info-key">رقم الطلب:</span>
                </div>
                <div className="od-info-row">
                  <span className="od-info-value">{order.date || "—"}</span>
                  <span className="od-info-key">التاريخ:</span>
                </div>
                <div className="od-info-row">
                  <span className="od-info-value">{order.time || "—"}</span>
                  <span className="od-info-key">الوقت:</span>
                </div>
                <div className="od-info-row">
                  <span className="od-info-value">{order.products?.length ?? 0} منتجات</span>
                  <span className="od-info-key">عدد المنتجات:</span>
                </div>
              </div>
            </div>

            <div className="od-info-card">
              <div className="od-info-header">
                <span>معلومات العميل</span>
                <UserIcon />
              </div>
              <div className="od-info-rows">
                <div className="od-info-row od-info-row-single">
                  <span className="od-info-value">{order.customer?.name}</span>
                  <UserIcon />
                </div>
                <div className="od-info-row od-info-row-single">
                  <span className="od-info-value">{order.customer?.phone}</span>
                  <PhoneIcon />
                </div>
                <div className="od-info-row od-info-row-single">
                  <span className="od-info-value">{order.customer?.address}</span>
                  <PinIcon />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="od-products-card">
          <div className="od-info-header">
            <span>المنتجات</span>
            <BoxIcon />
          </div>
          <div className="od-products-list">
            {order.products?.length ? (
              order.products.map((p, i) => (
                <div className="od-product-row" key={i}>
                  <span className="od-product-total">₪{p.total}</span>
                  <div className="od-product-info">
                    <span className="od-product-name">{p.name}</span>
                    <span className="od-product-sub">الكمية: {p.qty} × {p.price}₪</span>
                  </div>
                  <div className="od-product-icon">
                    <BoxIcon />
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: "center", padding: "12px", color: "#888" }}>
                لا يوجد منتجات مضافة لهذا الطلب
              </p>
            )}
          </div>

          <div className="od-summary">
            <div className="od-summary-row">
              <span>₪{order.subtotal}</span>
              <span className="od-summary-key">المجموع الفرعي:</span>
            </div>
            <div className="od-summary-row">
              <span>₪{order.shipping}</span>
              <span className="od-summary-key">رسوم التوصيل:</span>
            </div>
            <div className="od-summary-row od-summary-total">
              <span>₪{order.total}</span>
              <span className="od-summary-key">الإجمالي:</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrderDetails;