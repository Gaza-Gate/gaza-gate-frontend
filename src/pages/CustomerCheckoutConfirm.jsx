import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import CustomerNavbar from "../components/CustomerNavbar";
import { useCart } from "../context/CartContext";
import logo from "../assets/logo.png";
import "./CustomerCheckout.css";

export default function CustomerCheckoutConfirm() {
  const navigate = useNavigate();
  const { cartCount } = useCart();

  return (
    <div className="ck-wrapper" dir="rtl">
      <CustomerNavbar logo={logo} cartCount={cartCount} />

      <main className="ck-main ck-main--center">
        <div className="ck-success">
          <span className="ck-success-glow">
            <CheckCircle size={56} strokeWidth={1.5} />
          </span>
          <h1>تم تأكيد طلبك!</h1>
          <p className="ck-success-lead">
            شكراً لك! استلمنا طلبك وسيتواصل معك البائع قريباً.
          </p>
          <p className="ck-success-sub">
            يمكنك متابعة حالة طلبك في صفحة &quot;طلباتي&quot;.
          </p>

          <div className="ck-success-actions">
            <button
              className="ck-primary-btn"
              onClick={() => navigate("/my-orders")}
            >
              متابعة طلباتي
            </button>
            <button
              className="ck-secondary-btn"
              onClick={() => navigate("/products")}
            >
              متابعة للتسوق
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
