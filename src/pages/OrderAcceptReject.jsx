import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import SellerNavbar from "../components/SellerNavbar";
import UnderDevelopmentBanner from "../components/UnderDevelopmentBanner"; // 🆕 بانر تحت التطوير
import SimpleToast from "../components/SimpleToast"; // 🆕 رسالة 'تحت التطوير'
import "./OrderAcceptReject.css";

/**
 * OrderAcceptReject — شاشة مختصرة تفتح من إشعار "طلب جديد" (المدخل الأول).
 * منفصلة عن OrderDetails.jsx (صفحة التفاصيل الكاملة من لوحة التحكم).
 *
 * ⚠️ النافبار مش مضمّن هون — حطّي هنا الكومبوننت الخاص فيكِ.
 *
 * props:
 *   order = {
 *     orderNumber: "ORD-241221",
 *     productName: "حذاء رياضي أسود",
 *     quantity: "1 قطعة",
 *     totalAmount: 95,
 *     autoReleaseDays: 7,
 *   }
 *   onAccept, onReject
 */
export default function OrderAcceptReject({
  order = {
    orderNumber: "ORD-241221",
    productName: "حذاء رياضي أسود",
    quantity: "1 قطعة",
    totalAmount: 95,
    autoReleaseDays: 7,
  },
  onAccept,
  onReject,
}) {
  // 🆕 لسا الميزة تحت التطوير — الأزرار بتعرض رسالة بدل ما تنفذ فعل حقيقي.
  //    لما الباك إند يصير جاهز، فيكي تمرري onAccept/onReject فعليين كـ props
  //    وبيشتغلوا بدل هاد السلوك المؤقت تلقائياً.
  const [toastMsg, setToastMsg] = useState("");

  const handleAccept = () => {
    if (onAccept) return onAccept();
    setToastMsg("هذه الخدمة تحت التطوير");
  };

  const handleReject = () => {
    if (onReject) return onReject();
    setToastMsg("هذه الخدمة تحت التطوير");
  };

  return (
    <div className="oar-root" dir="rtl">
      <SellerNavbar />
      <UnderDevelopmentBanner />

      <main className="oar-main">
        <div className="oar-badge-row">
          <span className="oar-badge">طلب جديد</span>
        </div>

        <div className="oar-card">
          <h2 className="oar-card-title">تفاصيل الطلب</h2>
          <div className="oar-rows">
            <div className="oar-row">
              <span className="oar-row-label">رقم الطلب</span>
              <span className="oar-row-value">{order.orderNumber}</span>
            </div>
            <div className="oar-row">
              <span className="oar-row-label">المنتج</span>
              <span className="oar-row-value oar-row-value--bold">{order.productName}</span>
            </div>
            <div className="oar-row">
              <span className="oar-row-label">الكمية</span>
              <span className="oar-row-value">{order.quantity}</span>
            </div>
            <div className="oar-row">
              <span className="oar-row-label">المبلغ الإجمالي</span>
              <span className="oar-row-value oar-row-value--bold oar-row-value--orange">
                {order.totalAmount}₪
              </span>
            </div>
          </div>
        </div>

        <div className="oar-escrow-box">
          <ShieldCheck size={20} color="#f97316" className="oar-escrow-icon" />
          <div>
            <p className="oar-escrow-title">المبلغ محتجز {order.totalAmount}₪</p>
            <p className="oar-escrow-sub">
              سيتم تحويله لك بعد تأكيد المشتري الاستلام أو بعد {order.autoReleaseDays} أيام تلقائياً
            </p>
          </div>
        </div>

        <div className="oar-actions">
          <button type="button" className="oar-btn-accept" onClick={handleAccept}>
            قبول الطلب والبدء بالتحضير
          </button>
          <button type="button" className="oar-btn-reject" onClick={handleReject}>
            رفض الطلب
          </button>
        </div>
      </main>

      {/* 🆕 توست "تحت التطوير" */}
      <SimpleToast message={toastMsg} onDone={() => setToastMsg("")} />
    </div>
  );
}