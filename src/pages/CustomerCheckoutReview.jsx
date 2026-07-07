import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Store, ArrowRight } from "lucide-react";
import CustomerNavbar from "../components/CustomerNavbar";
import CheckoutSteps from "../components/CheckoutSteps";
import { useCart } from "../context/CartContext";
import logo from "../assets/logo.png";
import "./CustomerCheckout.css";

function groupByStore(items) {
  return items.reduce((acc, item) => {
    const store = item.store || "متجر";
    if (!acc[store]) acc[store] = [];
    acc[store].push(item);
    return acc;
  }, {});
}

export default function CustomerCheckoutReview() {
  const navigate = useNavigate();
  const { items, cartCount, total } = useCart();

  const grouped = useMemo(() => groupByStore(items), [items]);

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
                (sum, i) => sum + i.price * i.quantity,
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
                      <li className="ck-product-row" key={item.id}>
                        <span className="ck-product-price">{item.price * item.quantity}₪</span>
                        <div className="ck-product-info">
                          <h3>{item.name}</h3>
                          <p>
                            الكمية: {item.quantity} × {item.price} ₪
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
                    <span className="ck-orange">{storeTotal}₪</span>
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
                  (sum, i) => sum + i.price * i.quantity,
                  0
                );
                return (
                  <div className="ck-summary-row" key={storeName}>
                    <span>{storeName}</span>
                    <span>{storeTotal}₪</span>
                  </div>
                );
              })}

              <div className="ck-summary-row">
                <span>رسوم التوصيل</span>
                <span className="ck-free">مجاناً</span>
              </div>

              <div className="ck-summary-total">
                <span>الإجمالي</span>
                <span className="ck-orange">{total}₪</span>
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
