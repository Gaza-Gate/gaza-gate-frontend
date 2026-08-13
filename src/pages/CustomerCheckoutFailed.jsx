import { useNavigate } from "react-router-dom";
import { AlertCircle, Headphones, ShoppingBag, Wallet, Info } from "lucide-react";
import CustomerNavbar from "../components/CustomerNavbar";
import { useCart } from "../context/CartContext";
import { getProductImageUrl } from "../utils/productImage";
import logo from "../assets/logo.png";
import "./CustomerCheckoutFailed.css";

/**
 * CustomerCheckoutFailed — تُعرض عندما يفشل إتمام الطلب أثناء الدفع
 * (مثلاً: أحد المنتجات لم يعد متوفراً وقت الدفع)
 *
 * Props:
 *  affectedItems {Array} — اختياري، صور المنتجات المتأثرة لعرضها أسفل الصفحة
 */
export default function CustomerCheckoutFailed({ affectedItems = [] }) {
  const navigate = useNavigate();
  const { items, cartCount } = useCart();

  // إن لم يتم تمرير منتجات متأثرة، اعرض أول 3 عناصر من السلة كمرجع بصري
  const thumbs = affectedItems.length > 0 ? affectedItems : items.slice(0, 3);

  return (
    <div className="ckf-wrapper" dir="rtl">
      <CustomerNavbar logo={logo} cartCount={cartCount} />

      <main className="ckf-main">
        <div className="ckf-card">
          <div className="ckf-icon-wrap">
            <span className="ckf-icon-glow" />
            <span className="ckf-icon-circle">
              <AlertCircle size={28} strokeWidth={2.5} />
            </span>
          </div>

          <h1 className="ckf-title">تعذّر إتمام طلبك</h1>
          <p className="ckf-desc">
            نعتذر، أحد المنتجات لم يعد متوفراً. تم إلغاء العملية بالكامل ولم
            يتم خصم أي مبلغ من حسابك.
          </p>

          <div className="ckf-info-row">
            <div className="ckf-info-card">
              <div className="ckf-info-head">
                أمان الدفع
                <Wallet size={16} />
              </div>
              <p className="ckf-info-sub">لم يتم سحب أي مبالغ مالية</p>
            </div>

            <div className="ckf-info-card">
              <div className="ckf-info-head">
                تحديث المخزون
                <Info size={16} />
              </div>
              <p className="ckf-info-sub">حدث تغيير في توفر الأصناف أثناء الدفع</p>
            </div>
          </div>

          <div className="ckf-actions">
            <button className="ckf-btn-support" onClick={() => navigate("/seller/messages")}>
              <Headphones size={18} />
              تواصل مع الدعم
            </button>
            <button className="ckf-btn-cart" onClick={() => navigate("/cart")}>
              <ShoppingBag size={18} />
              مراجعة السلة
            </button>
          </div>
        </div>

        {thumbs.length > 0 && (
          <div className="ckf-thumbs">
            {thumbs.map((item, i) => (
              <div className="ckf-thumb" key={item.id ?? i}>
                <img src={getProductImageUrl(item)} alt={item.name || ""} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}