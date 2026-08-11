import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, CreditCard, Zap, Shield, Lock, CheckCircle, AlertCircle } from "lucide-react";
import CustomerNavbar from "../components/CustomerNavbar";
import CheckoutSteps from "../components/CheckoutSteps";
import { useCart } from "../context/CartContext";
import { createOrder } from "../services/orderService";
import { getCart, removeCartItem } from "../services/authService";
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
  const { items, cartCount, total, clearCart, removeItem } = useCart();
  const [method, setMethod] = useState("cod");
  const [card, setCard] = useState({ number: "", name: "", cvv: "", expiry: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (items.length === 0) {
    navigate("/cart", { replace: true });
    return null;
  }

  const storeName = items[0]?.store || "متجر";

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

  /**
   * إنشاء الطلب — مطابق للـ API:
   * POST /api/customer/order
   * body: { paymentMethod: "cash_on_delivery" }
   * الباك بيقرأ الـ items من السلة الموجودة على السيرفر.
   *
   * ⚠️ ملاحظة هامة: قبل إنشاء الطلب، بنزامن مع السلة الموجودة فعلياً
   * على السيرفر وبنحذف أي عنصر صار غير متاح (status !== 'active' أو المخزون ناقص).
   * هذا يحل مشكلة الـ 400 "Product X is no longer available" لما يكون
   * في عناصر قديمة بالسيرة من جلسات سابقة.
   */
  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login/customer");
        return;
      }

      // 1) مزامنة السلة: اجلب السلة الفعلية من السيرفر
      const serverCart = await getCart();
      const serverItems = Array.isArray(serverCart?.items) ? serverCart.items : [];

      // 2) حدد العناصر اللي صارت غير متاحة
      const staleItems = serverItems.filter((it) => {
        const p = it?.product;
        if (!p) return true;
        if (p.status && p.status !== "active") return true;
        if (p.isDeleted) return true;
        if (
          p.stockType === "limited" &&
          typeof p.quantity === "number" &&
          typeof it.quantity === "number" &&
          p.quantity < it.quantity
        ) {
          return true;
        }
        return false;
      });

      // 3) احذف العناصر غير المتاحة من السيرفر (واحد واحد)
      if (staleItems.length > 0) {
        await Promise.allSettled(
          staleItems
            .filter((it) => it.id)
            .map((it) => removeCartItem(it.id).catch(() => null))
        );

        // اعد جلب السلة بعد التنظيف للتأكد
        const cleanedCart = await getCart();
        const cleanedItems = Array.isArray(cleanedCart?.items) ? cleanedCart.items : [];

        if (cleanedItems.length === 0) {
          setError("السلة فارغة بعد إزالة المنتجات غير المتاحة.");
          setLoading(false);
          return;
        }

        // نبض السلة المحلية لتطابق السيرفر (إزالة العناصر المحلية الموافقة)
        const cleanedProductIds = new Set(cleanedItems.map((it) => it.product?.id).filter(Boolean));
        items
          .filter((local) => !cleanedProductIds.has(local.id))
          .forEach((local) => removeItem(local.id));
      }

      // 4) الآن انشئ الطلب — الـ payload مطابق للأبي
      const orderData = {
        paymentMethod: method === "cod" ? "cash_on_delivery" : method,
      };

      const createdOrders = await createOrder(orderData);
      const orderList = Array.isArray(createdOrders) ? createdOrders : [createdOrders];

      clearCart();
      navigate("/checkout/confirm", {
        state: {
          method,
          total,
          orderIds: orderList.map((o) => o?.id).filter(Boolean),
          orderNumbers: orderList.map((o) => o?.orderNumber).filter(Boolean),
        },
      });
    } catch (err) {
      const apiMsg =
        err?.response?.data?.data?.message ??
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.message ??
        "تعذّر إتمام الطلب. حاول مرة أخرى.";
      setError(apiMsg);

      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login/customer");
      }
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
              <div className="ck-error-message" role="alert" aria-live="assertive">
                <div className="ck-error-content">
                  <AlertCircle size={18} className="ck-error-icon" />
                  <span className="ck-error-text" dir="ltr">
                    {error}
                  </span>
                </div>
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
