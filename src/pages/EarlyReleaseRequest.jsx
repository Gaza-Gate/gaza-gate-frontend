import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom"; // 🆕 ضفنا useParams
import { ChevronLeft } from "lucide-react";
import SellerNavbar from "../components/SellerNavbar";
import UnderDevelopmentBanner from "../components/UnderDevelopmentBanner";
import "./EarlyReleaseRequest.css";

const REASONS = [
  { key: "buyer_confirmed_direct", label: "المشتري أكد الاستلام عبر التواصل المباشر" },
  { key: "no_reply_7_days", label: "مرّ أكثر من 7 أيام بدون رد من المشتري" },
  { key: "other", label: "سبب آخر" },
];

export default function EarlyReleaseRequest({
  order, // 🆕 صار اختياري — إذا ما تمرر، بنبنيه من الـ URL param
  onSubmit,
  onBack,
}) {
  const [reason, setReason] = useState(REASONS[0].key);
  const [note, setNote] = useState("");
  const navigate = useNavigate();
  const { orderId } = useParams(); // 🆕 من المسار /seller/wallet/early-release/:orderId

  // 🆕 [مؤقت للمعاينة] لسا ما في API يجيب تفاصيل الطلب الحقيقية عبر orderId —
  //    فبنستخدم orderId من الرابط مع مبلغ افتراضي للعرض فقط.
  //    لما يصير عندك fetch فعلي لتفاصيل الطلب، مرري order كـ prop وبيتجاوز هالافتراضي.
  const resolvedOrder = order || { orderNumber: orderId || "ORD-241220", amount: 95 };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) return onSubmit(reason, note);
    navigate("/seller/disputes/demo/resolved", { state: { amount: resolvedOrder.amount } });
  };

  return (
    <div className="err-root" dir="rtl">
      <SellerNavbar />
      <UnderDevelopmentBanner />

      <main className="err-main">
        <button type="button" className="err-breadcrumb" onClick={onBack ?? (() => navigate(-1))}>
          <h2 className="err-title">طلب تحرير مبكر</h2>
          <ChevronLeft size={16} color="#9ca3af" />
        </button>

        <div className="err-banner">
          يمكنك طلب تحرير المبلغ قبل تأكيد المشتري في حالات استثنائية — سيراجعها فريق GAZA GATE
        </div>

        <div className="err-order-card">
          <div>
            <p className="err-order-field-label">رقم الطلب</p>
            <p className="err-order-field-value">{resolvedOrder.orderNumber}</p>
          </div>
          <div>
            <p className="err-order-field-label">المبلغ المطلوب</p>
            <p className="err-order-field-value err-order-field-value--orange">{resolvedOrder.amount}₪</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <p className="err-reason-title">سبب الطلب</p>

          <div className="err-reason-list">
            {REASONS.map((r) => (
              <label className="err-reason-option" key={r.key}>
                <input
                  type="radio"
                  name="release-reason"
                  className="err-reason-radio"
                  value={r.key}
                  checked={reason === r.key}
                  onChange={() => setReason(r.key)}
                />
                {r.label}
              </label>
            ))}
          </div>

          <textarea
            className="err-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="توضيح إضافي..."
            rows={4}
          />

          <button type="submit" className="err-submit-btn">
            إرسال الطلب
          </button>

          <p className="err-review-note">قد يستغرق المراجعة 24-48 ساعة</p>
        </form>
      </main>
    </div>
  );
}