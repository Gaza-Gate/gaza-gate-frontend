import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, CreditCard, Zap, Shield, Lock, CheckCircle } from "lucide-react";
import CustomerNavbar from "../components/CustomerNavbar";
import CheckoutSteps from "../components/CheckoutSteps";
import { useCart } from "../context/CartContext";
import { createOrder } from "../services/orderService";
import logo from "../assets/logo.png";
import "./CustomerCheckout.css";

const paymentMethods = [
  {
    id: "cod",
    label: "الدفع عند الاستلام",
    desc: "ادفع نقداً عند استلام الطلب",
    Icon: Wallet,
    disabled: false,
  },
  {
    id: "card",
    label: "بطاقة ائتمانية",
    desc: "Visa / Mastercard / Amex",
    Icon: CreditCard,
    disabled: true,
  },
  {
    id: "jawwal",
    label: "Jawwal Pay",
    desc: "الدفع السريع بالبصمة",
    Icon: Zap,
    disabled: true,
  },
];

export default function CustomerCheckoutPayment() {
  const navigate = useNavigate();
  const { items, cartCount, total, clearCart } = useCart();
  const [method, setMethod] = useState("cod");
  const [card, setCard] = useState({
    number: "",
    name: "",
    cvv: "",
    expiry: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (items.length === 0) {
    navigate("/cart", { replace: true });
    return null;
  }

  // ✅ إلغاء الضريبة: المنتجات الفلسطينية معفاة من ضريبة 10% حالياً.
  //    نخليها دائماً 0 لتجنّب أي إضافات تلقائية على المجموع.
  //    الإجمالي = سعر المنتجات + رسوم التوصيل فقط (بدون ضرائب).
  const tax = 0;
  const storeName = items[0]?.store || "متجر التقنية";

  const handleCardChange = (field, value) => {
    setCard((prev) => ({ ...prev, [field]: value }));
  };

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      
      if (!token) {
        navigate("/login/customer");
        return;
      }

      // تجميع المنتجات حسب البائع
      const groupedBySeller = items.reduce((acc, item) => {
        const sellerId = item.sellerId || item.seller?._id || item.seller?.id;
        if (!sellerId) {
          console.warn("Item missing sellerId:", item);
          return acc;
        }

        if (!acc[sellerId]) {
          acc[sellerId] = [];
        }
        // ✅ الأمان: نرسل فقط productId و quantity للباك
        //    الباك يحسب السعر والـ total بنفسه من قاعدة البيانات
        acc[sellerId].push({
          productId: item.id || item._id,
          quantity: item.quantity
        });
        return acc;
      }, {});

      const sellerIds = Object.keys(groupedBySeller);
      if (sellerIds.length === 0) {
        setError("لا يمكن إنشاء طلب: المنتجات لا تحتوي على معلومات البائع");
        return;
      }

      // إنشاء طلب منفصل لكل بائع
      // ✅ الباك يحسب السعر والـ total بنفسه — لا نرسل productName/unitPrice/totalAmount
      const orderPromises = Object.entries(groupedBySeller).map(([sellerId, orderItems]) => {
        const orderData = {
          items: orderItems,
          paymentMethod: method === "cod" ? "cash_on_delivery" : method
        };
        return createOrder(orderData);
      });

      await Promise.all(orderPromises);

      clearCart();
      navigate("/checkout/confirm", { state: { method, total } });
    } catch (err) {
      console.error("Error creating order:", err);
      // إذا كان الخطأ بسبب token غير صالح، وجه المستخدم لتسجيل الدخول
      if (err.message?.includes("token") || err.message?.includes("Unauthorized") || err.message?.includes("Invalid") || err.message?.includes("expired")) {
        localStorage.removeItem("token");
        navigate("/login/customer");
        return;
      }
      setError(err.message || "حدث خطأ في إنشاء الطلب");
    } finally {
      setLoading(false);
    }
  };

  const displayNumber = card.number || "•••• •••• •••• ••••";
  const displayName = card.name || "احمد محمد";
  const displayExpiry = card.expiry || "MM/YY";

  return (
    <div className="ck-wrapper" dir="rtl">
      <CustomerNavbar logo={logo} cartCount={cartCount} />

      <main className="ck-main">
        <CheckoutSteps current={2} />

        <div className="ck-layout">
          <div className="ck-content">
            <h1 className="ck-title">اختر طريقة الدفع</h1>

            <div className="ck-payment-list">
              {paymentMethods.map(({ id, label, desc, Icon, disabled }) => (
                <label
                  key={id}
                  className={`ck-payment-option ${method === id ? "selected" : ""} ${disabled ? "disabled" : ""}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={id}
                    checked={method === id}
                    onChange={() => !disabled && setMethod(id)}
                    disabled={disabled}
                  />
                  <span className="ck-payment-radio" />
                  <div className="ck-payment-text">
                    <span className="ck-payment-label">{label}</span>
                    <span className="ck-payment-desc">{desc}</span>
                  </div>
                  <span className="ck-payment-icon">
                    <Icon size={20} />
                  </span>
                  {id === "card" && (
                    <span className="ck-card-brands">
                      <span>VISA</span>
                      <span>MC</span>
                      <span>AMEX</span>
                    </span>
                  )}
                </label>
              ))}
            </div>

            {error && (
              <div className="ck-error-message">
                {error}
              </div>
            )}

            {method === "card" && (
              <div className="ck-card-form">
                <div className="ck-card-preview">
                  <div className="ck-card-chip" />
                  <p className="ck-card-preview-number" dir="ltr">
                    {displayNumber}
                  </p>
                  <div className="ck-card-preview-bottom">
                    <span>{displayName}</span>
                    <span dir="ltr">{displayExpiry}</span>
                  </div>
                </div>

                <div className="ck-form-field">
                  <label>رقم البطاقة</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1234 5678 9012 3456"
                    value={card.number}
                    onChange={(e) =>
                      handleCardChange("number", formatCardNumber(e.target.value))
                    }
                    dir="ltr"
                  />
                </div>

                <div className="ck-form-field">
                  <label>اسم حامل البطاقة</label>
                  <input
                    type="text"
                    placeholder="احمد محمد"
                    value={card.name}
                    onChange={(e) => handleCardChange("name", e.target.value)}
                  />
                </div>

                <div className="ck-form-row">
                  <div className="ck-form-field">
                    <label>رمز الأمان (CVV)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="123"
                      maxLength={4}
                      value={card.cvv}
                      onChange={(e) =>
                        handleCardChange("cvv", e.target.value.replace(/\D/g, ""))
                      }
                      dir="ltr"
                    />
                  </div>
                  <div className="ck-form-field">
                    <label>تاريخ الانتهاء</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM/YY"
                      maxLength={5}
                      value={card.expiry}
                      onChange={(e) =>
                        handleCardChange("expiry", formatExpiry(e.target.value))
                      }
                      dir="ltr"
                    />
                  </div>
                </div>

                <p className="ck-secure-note">
                  <Lock size={13} />
                  اتصال آمن عبر SSL 256-bit. بياناتك لا تُخزَّن على خوادمنا.
                </p>
              </div>
            )}
          </div>

          <aside className="ck-sidebar">
            <div className="ck-summary">
              <h2>ملخص الدفع</h2>

              <div className="ck-summary-row">
                <span>{storeName}</span>
                <span>{total}₪</span>
              </div>

              <div className="ck-summary-row">
                <span>رسوم التوصيل</span>
                <span className="ck-free">مجاناً</span>
              </div>

              {/* ✅ صف الضريبة محذوف: المنتجات معفاة من ضريبة 10% حالياً.
                  الإجمالي يعكس سعر المنتجات + رسوم التوصيل فقط. */}

              <div className="ck-summary-total">
                <span>الإجمالي</span>
                <span className="ck-orange">{total}₪</span>
              </div>

              <button 
                className="ck-primary-btn ck-primary-btn--muted" 
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? "جاري إنشاء الطلب..." : "تأكيد الدفع والطلب"}
              </button>

              <div className="ck-trust">
                <Lock size={13} />
                <Shield size={13} />
                <CheckCircle size={13} />
                <span>دفع آمن ومشفر، مضمون بالكامل</span>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
