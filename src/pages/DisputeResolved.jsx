import { Check } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom"; // 🆕 ضفنا useNavigate
import SellerNavbar from "../components/SellerNavbar";
import UnderDevelopmentBanner from "../components/UnderDevelopmentBanner"; // 🆕 بانر تحت التطوير
import "./DisputeResolved.css";

/**
 * DisputeResolved — صفحة تأكيد نتيجة النزاع لصالح البائع.
 *
 * ⚠️ النافبار مش مضمّن هون — حطّي هنا الكومبوننت الخاص فيكِ.
 *
 * props:
 *   amount = 95
 *   hoursUntilCredit = 24
 *   onViewWallet
 */
export default function DisputeResolved({ amount: amountProp = 95, hoursUntilCredit = 24, onViewWallet }) {
  // 🆕 [مؤقت للمعاينة] لو وصلنا من EarlyReleaseRequest، ناخد المبلغ الحقيقي من الـ state
  const location = useLocation();
  const navigate = useNavigate(); // 🆕
  const amount = location.state?.amount ?? amountProp;

  const handleViewWallet = () => {
    if (onViewWallet) return onViewWallet();
    // 🆕 [مؤقت للمعاينة] ما في onViewWallet ممرّر من حدا لسا —
    //    بننقل مباشرة لصفحة محفظة البائع الفعلية بالراوتر.
    //    لما تمرري onViewWallet فعلي، بيتوقف هالسلوك تلقائياً.
    navigate("/seller/wallet");
  };

  return (
    <div className="dr-root" dir="rtl">
      <SellerNavbar />
      <UnderDevelopmentBanner />

      <main className="dr-main">
        <div className="dr-icon-outer">
          <div className="dr-icon-inner">
            <Check size={24} color="#fff" strokeWidth={3} />
          </div>
        </div>

        <h1 className="dr-title">تم البت في النزاع لصالحك</h1>
        <p className="dr-subtitle">
          سيضاف مبلغ {amount}₪ لمحفظتك خلال {hoursUntilCredit} ساعة
        </p>

        <button type="button" className="dr-view-wallet-btn" onClick={handleViewWallet}>
          عرض محفظتي
        </button>
      </main>
    </div>
  );
}