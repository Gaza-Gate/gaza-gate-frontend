import { useNavigate } from "react-router-dom"; // 🆕
import { Info, AlertTriangle } from "lucide-react";
import SellerNavbar from "../components/SellerNavbar";
import UnderDevelopmentBanner from "../components/UnderDevelopmentBanner";
import "./SellerWallet.css";

export default function SellerWallet({
  balance = 1250,
  stats = { commission: 420, totalSales: 4200, storeNow: 380 },
  transactions = [
    { id: 1, amount: 85.5, type: "credit", label: "طلب #ORD-241220 — تحرير", time: "منذ 21 دقيقة", flagged: false },
    { id: 2, amount: 142.0, type: "credit", label: "طلب #ORD-241215 — تحرير", time: "منذ 18 ساعة", flagged: false },
    { id: 3, amount: 500.0, type: "debit", label: "سحب إلى البنك", time: "منذ 3 أيام", flagged: true },
    { id: 4, amount: 67.2, type: "credit", label: "طلب #ORD-241210 — تحرير", time: "منذ 5 أيام", flagged: false },
    { id: 5, amount: 7.47, type: "debit", label: "عمولة المنصة 10%", time: "منذ 5 أيام", flagged: true },
  ],
  onWithdraw,
  onRequestEarlyRelease,
}) {
  const navigate = useNavigate(); // 🆕

  const handleEarlyRelease = () => {
    if (onRequestEarlyRelease) return onRequestEarlyRelease();
    // 🆕 [مؤقت للمعاينة] لسا ما في تحديد "أي طلب" فعلي من الباك إند —
    //    بناخد أول معاملة credit من القايمة كطلب افتراضي للمعاينة،
    //    وبنستخرج رقم الطلب من نصّها (مثال: "طلب #ORD-241220 — تحرير").
    //    لما onRequestEarlyRelease الحقيقي يجهز، هاد المنطق بيتوقف تلقائياً.
    const candidate = transactions.find((t) => t.type === "credit");
    const match = candidate?.label.match(/#([A-Za-z0-9-]+)/);
    const orderId = match ? match[1] : "ORD-241220";
    navigate(`/seller/wallet/early-release/${orderId}`);
  };

  return (
    <div className="wallet-root" dir="rtl">
      <SellerNavbar />
      <UnderDevelopmentBanner />

      <main className="wallet-main">
        <div className="wallet-banner">
          <button type="button" className="wallet-withdraw-btn" onClick={onWithdraw}>
            سحب الرصيد
          </button>
          <div>
            <p className="wallet-balance-label">الرصيد المتاح</p>
            <p className="wallet-balance-value">₪{balance.toLocaleString()}</p>
          </div>
        </div>

        <div className="wallet-stats-grid">
          <div className="wallet-stat-card">
            <p className="wallet-stat-value">₪{stats.commission}</p>
            <p className="wallet-stat-label">عمولة المنصة</p>
          </div>
          <div className="wallet-stat-card">
            <p className="wallet-stat-value">₪{stats.totalSales.toLocaleString()}</p>
            <p className="wallet-stat-label">إجمالي المبيعات</p>
          </div>
          <div className="wallet-stat-card">
            <p className="wallet-stat-value wallet-stat-value--highlight">₪{stats.storeNow}</p>
            <p className="wallet-stat-label">متجر الآن</p>
          </div>
        </div>

        <h3 className="wallet-section-title">آخر المعاملات</h3>

        <div className="wallet-tx-list">
          {transactions.map((t) => (
            <div className="wallet-tx-row" key={t.id}>
              <div className={`wallet-tx-icon ${t.flagged ? "wallet-tx-icon--flagged" : ""}`}>
                {t.flagged ? (
                  <AlertTriangle size={13} color="#dc2626" />
                ) : (
                  <Info size={13} color="#16a34a" />
                )}
              </div>

              <div className="wallet-tx-info">
                <p className="wallet-tx-label">{t.label}</p>
                <p className="wallet-tx-time">{t.time}</p>
              </div>

              <span
                className={`wallet-tx-amount ${
                  t.type === "credit" ? "wallet-tx-amount--credit" : "wallet-tx-amount--debit"
                }`}
              >
                {t.type === "credit" ? "+" : "-"}₪{t.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <button type="button" className="wallet-early-release-btn" onClick={handleEarlyRelease}>
          طلب تحرير مبكر للمبلغ
        </button>
      </main>
    </div>
  );
}