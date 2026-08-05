import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Store, ArrowRight } from "lucide-react";
import CustomerNavbar from "../components/CustomerNavbar";
import CheckoutSteps from "../components/CheckoutSteps";
import { useCart } from "../context/CartContext";
import { getOrderPreview } from "../services/orderService";
import logo from "../assets/logo.png";
import "./CustomerCheckout.css";

function groupByStore(items) {
  return items.reduce((acc, item) => {
    const store = item.store || item.seller?.storeName || "متجر";
    if (!acc[store]) acc[store] = [];
    acc[store].push(item);
    return acc;
  }, {});
}

// تنسيق العملة بشكل موحّد: "20.00₪"
const fmt = (n) => {
  const num = Number(n) || 0;
  return `${num.toFixed(2)}₪`;
};

export default function CustomerCheckoutReview() {
  const navigate = useNavigate();
  const { items, cartCount, total } = useCart();

  // معاينة الطلب من الباك: subtotal / shippingFee / tax / totalPrice
  const [preview, setPreview] = useState({
    subtotal: 0,
    shippingFee: 0,
    tax: 0,
    totalPrice: 0,
  });
  const [previewLoading, setPreviewLoading] = useState(false);

  const grouped = useMemo(() => groupByStore(items), [items]);

  // ✅ نطلب معاينة الطلب من الباك عند تغيّر السلة
  //    الهدف: جلب قيمة الضريبة (tax) الحقيقية من الباك + التحقق من الإجمالي
  useEffect(() => {
    if (items.length === 0) return;

    let cancelled = false;
    const fetchPreview = async () => {
      setPreviewLoading(true);
      try {
        const payload = items.map((i) => ({
          productId: i.productId || i.id || i._id,
          quantity: Number(i.quantity ?? 1),
          price: Number(i.price ?? 0),
        }));
        const result = await getOrderPreview(payload);
        if (!cancelled) setPreview(result);
      } catch {
        // الفشل يعالَج داخل getOrderPreview ويرجع fallback آمن
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };

    fetchPreview();
    return () => { cancelled = true; };
  }, [items]);

  // الإجمالي المحسوب محلياً كاحتياط لو الباك ما رجّع preview كامل
  const localSubtotal = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.price ?? 0) * Number(i.quantity ?? 1), 0),
    [items]
  );

  // لو الـ preview فاضي، نستخدم القيم المحلية كـ fallback
  const subtotal    = Number(preview.subtotal)    || localSubtotal;
  const shippingFee = Number(preview.shippingFee) || 0;
  const tax         = Number(preview.tax)         || 0;
  const grandTotal  = Number(preview.totalPrice) || (subtotal + shippingFee + tax);

  if (items.length === 0) {
    navigate("/cart", { replace: true });
    return null;
  }

  return (
    <div className="ck-wrapper" dir="rtl">
      <CustomerNavbar logo={logo} cartCount={cartCount} />

      <main className="ck-main">
        <button className="ck-back" onClick={() => navigate("/products")}>
          <ArrowRight size={16} />
          متابعة التسوق
        </button>

        <CheckoutSteps current={1} />

        <h1 className="ck-title">مراجعة الطلب</h1>

        <div className="ck-layout">
          <div className="ck-content">
            {Object.entries(grouped).map(([storeName, storeItems]) => {
              const storeTotal = storeItems.reduce(
                (sum, i) => sum + Number(i.price ?? 0) * Number(i.quantity ?? 1),
                0
              );

              return (
                <div className="ck-store-card" key={storeName}>
                  <div className="ck-store-head">
                    <Store size={16} />
                    <span>{storeName}</span>
                  </div>

                  <ul className="ck-product-list">
                    {storeItems.map((item) => (
                      <li className="ck-product-row" key={item.id || item.productId}>
                        <span className="ck-product-price">
                          {fmt(Number(item.price ?? 0) * Number(item.quantity ?? 1))}
                        </span>
                        <div className="ck-product-info">
                          <h3>{item.name}</h3>
                          <p>
                            الكمية: {item.quantity} × {fmt(item.price)}
                          </p>
                        </div>
                        <div className="ck-product-img">
                          <img src={item.image} alt={item.name} />
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="ck-store-total">
                    <span>مجموع {storeName}</span>
                    <span className="ck-orange">{fmt(storeTotal)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="ck-sidebar">
            <div className="ck-summary">
              <h2>ملخص الطلب</h2>

              {Object.entries(grouped).map(([storeName, storeItems]) => {
                const storeTotal = storeItems.reduce(
                  (sum, i) => sum + Number(i.price ?? 0) * Number(i.quantity ?? 1),
                  0
                );
                return (
                  <div className="ck-summary-row" key={storeName}>
                    <span>{storeName}</span>
                    <span>{fmt(storeTotal)}</span>
                  </div>
                );
              })}

              {/* المجموع الفرعي */}
              <div className="ck-summary-row">
                <span>المجموع الفرعي</span>
                <span>{fmt(subtotal)}</span>
              </div>

              {/* رسوم التوصيل */}
              <div className="ck-summary-row">
                <span>رسوم التوصيل</span>
                <span className={shippingFee === 0 ? "ck-free" : ""}>
                  {shippingFee === 0 ? "مجاناً" : fmt(shippingFee)}
                </span>
              </div>

              {/* الضريبة — تجلب من الباك عبر orderService.getOrderPreview */}
              <div className="ck-summary-row" data-tax-row>
                <span>
                  الضريبة
                  {previewLoading && (
                    <span className="ck-tax-loading" aria-label="جاري التحميل">…</span>
                  )}
                </span>
                <span className={tax === 0 ? "ck-free" : ""}>
                  {tax === 0 ? "مجاناً" : fmt(tax)}
                </span>
              </div>

              {/* الإجمالي = subtotal + shipping + tax */}
              <div className="ck-summary-total">
                <span>الإجمالي</span>
                <span className="ck-orange">{fmt(grandTotal)}</span>
              </div>

              <button
                className="ck-primary-btn"
                onClick={() => navigate("/checkout/payment")}
              >
                المتابعة للدفع
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
