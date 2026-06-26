import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
const WORKFLOW_STEPS = [
  { key: "review", label: "بانتظار" },
  { key: "approved", label: "موافق عليه" },
  { key: "pending", label: "قيد التنفيذ" },
  { key: "delivered", label: "تم التسليم" },
  { key: "completed", label: "مكتمل" },
];

const STATUS_BADGE = {
  review: { label: "بانتظار", className: "od-badge-yellow" },
  approved: { label: "موافق عليه", className: "od-badge-green" },
  pending: { label: "قيد التنفيذ", className: "od-badge-blue" },
  delivered: { label: "تم التسليم", className: "od-badge-purple" },
  completed: { label: "مكتمل", className: "od-badge-gray" },
};

// ── Static demo data مؤقتة - بتتبدّل لاحقاً بداتا حقيقية من الـ API حسب رقم الطلب ──
const ORDER_DETAILS = {
  id: "ORD-001",
  date: "2026-06-10",
  time: "14:30",
  status: "review",
  customer: {
    name: "أحمد محمد علي",
    phone: "+970599123456",
    address: "غزة، حي الرمال، شارع الجلاء",
  },
  products: [
    { name: "زيت زيتون فلسطيني", qty: 2, price: 45, total: 90 },
    { name: "صابون نابلسي", qty: 4, price: 15, total: 60 },
  ],
  subtotal: 150,
  shipping: 10,
  total: 160,
};

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // مؤقتاً بنعرض داتا ثابتة - لاحقاً رح تجيب الطلب الحقيقي حسب id من الـ API
  const [status, setStatus] = useState(ORDER_DETAILS.status);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);

  const order = { ...ORDER_DETAILS, id: id || ORDER_DETAILS.id, status };

  const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.key === order.status);
  const nextStep = WORKFLOW_STEPS[currentIndex + 1];
  const badge = STATUS_BADGE[order.status] || STATUS_BADGE.review;

  // البانر بيدخل بفيد ناعم، يضل ظاهر 6 ثواني، وبعدين يخرج بفيد ناعم
  useEffect(() => {
    if (!showSuccess) return;

    setBannerVisible(false);
    const enterTimer = setTimeout(() => setBannerVisible(true), 10);
    const hideTimer = setTimeout(() => setBannerVisible(false), 6000);
    const removeTimer = setTimeout(() => setShowSuccess(false), 6350);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [showSuccess]);

  const handleUpdateStatus = async () => {
    if (!nextStep) return;

    // مؤقتاً بنحدّث الستيت مباشرة
    // لاحقاً: await updateOrderStatus(order.id, nextStep.key);
    setStatus(nextStep.key);
    setShowSuccess(true);
  };

  return (
    <div className="od-root" dir="rtl">
      <div className="od-container">

        {/* رابط العودة */}
        <button type="button" className="od-back" onClick={() => navigate("/seller/orders")}>
          العودة للطلبات
          <BackArrowIcon />
        </button>

        {/* العنوان والحالة */}
        <div className="od-title-row">
          <span className={`od-badge ${badge.className}`}>{badge.label}</span>
        </div>
        <h1 className="od-title">تفاصيل الطلب {order.id}</h1>
        <p className="od-subtitle">{order.date} - {order.time}</p>

        {/* بانر النجاح بعد تحديث الحالة */}
        {showSuccess && (
          <div className={`od-success-banner ${bannerVisible ? "od-success-banner-visible" : ""}`}>
            <div className="od-success-text">
              <span className="od-success-title">تم تحديث حالة الطلب بنجاح!</span>
              <span className="od-success-sub">تم إرسال إشعار للعميل بالتحديث</span>
            </div>
            <SuccessIcon />
          </div>
        )}

        {/* Workflow */}
        <div className="od-workflow-card">
          <h2 className="od-section-title">سير عمل الطلب (Workflow)</h2>

          <div className="od-steps">
            {WORKFLOW_STEPS.map((step, index) => (
              <div className="od-step" key={step.key}>
                <div className="od-step-row">
                  <div
                    className={
                      "od-step-circle " +
                      (index < currentIndex
                        ? "od-step-done"
                        : index === currentIndex
                        ? "od-step-current"
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
              <button type="button" className="od-btn-update" onClick={handleUpdateStatus}>
                تحديث الحالة إلى {nextStep.label}
              </button>
              <p className="od-update-note">سيتم إرسال إشعار تلقائياً للعميل عند تحديث الحالة</p>
            </div>
          )}
        </div>

        {/* كاردات المعلومات */}
        <div className="od-info-grid-wrapper">
          <div className="od-info-grid">
            <div className="od-info-card">
              <div className="od-info-header">
                <span>معلومات الطلب</span>
                <CalendarIcon />
              </div>
              <div className="od-info-rows">
                <div className="od-info-row">
                  <span className="od-info-value">{order.id}</span>
                  <span className="od-info-key">رقم الطلب:</span>
                </div>
                <div className="od-info-row">
                  <span className="od-info-value">{order.date}</span>
                  <span className="od-info-key">التاريخ:</span>
                </div>
                <div className="od-info-row">
                  <span className="od-info-value">{order.time}</span>
                  <span className="od-info-key">الوقت:</span>
                </div>
                <div className="od-info-row">
                  <span className="od-info-value">{order.products.length} منتجات</span>
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
                  <span className="od-info-value">{order.customer.name}</span>
                  <UserIcon />
                </div>
                <div className="od-info-row od-info-row-single">
                  <span className="od-info-value">{order.customer.phone}</span>
                  <PhoneIcon />
                </div>
                <div className="od-info-row od-info-row-single">
                  <span className="od-info-value">{order.customer.address}</span>
                  <PinIcon />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* المنتجات */}
        <div className="od-products-card">
          <div className="od-info-header">
            <span>المنتجات</span>
            <BoxIcon />
          </div>

          <div className="od-products-list">
            {order.products.map((p, i) => (
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
            ))}
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