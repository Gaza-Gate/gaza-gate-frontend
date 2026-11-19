import { useNavigate } from "react-router-dom";
import { X, ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { useCart } from "../context/CartContext";
import { getProductImageUrl } from "../utils/productImage";
import "./CustomerCart.css";

export default function CustomerCart() {
  const navigate = useNavigate();
  const { items, cartCount, total, updateQuantity, removeItem } = useCart();

  const itemLabel = cartCount === 1 ? "منتج" : "منتجات";

  return (
    <div className="cart-overlay" dir="rtl">
      <div className="cart-panel">
        <header className="cart-header">
          <button
            className="cart-close"
            onClick={() => navigate(-1)}
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>

          <div className="cart-header-info">
            <div className="cart-header-text">
              <h1>سلة التسوق</h1>
              <p>
                {cartCount} {itemLabel}
              </p>
            </div>
            <span className="cart-header-icon">
              <ShoppingCart size={20} />
            </span>
          </div>
        </header>

        <div className="cart-divider" />

        {items.length === 0 ? (
          <div className="cart-empty">
            <ShoppingCart size={48} strokeWidth={1.2} />
            <h3>السلة فارغة</h3>
            <p>أضف منتجات من صفحة المنتجات</p>
            <button className="cart-shop-btn" onClick={() => navigate("/products")}>
              تصفح المنتجات
            </button>
          </div>
        ) : (
          <>
            <ul className="cart-items">
              {items.map((item) => (
                <li className="cart-item" key={item.id}>
                  <button
                    className="cart-item-delete"
                    onClick={() => removeItem(item.id)}
                    aria-label="حذف"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="cart-item-body">
                    <h3 className="cart-item-name">{item.name}</h3>
                    <p className="cart-item-price">{item.price}₪</p>

                    <div className="cart-qty">
                      <button
                        className="cart-qty-btn cart-qty-btn--plus"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label="زيادة الكمية"
                      >
                        <Plus size={14} />
                      </button>
                      <span className="cart-qty-value">{item.quantity}</span>
                      <button
                        className="cart-qty-btn cart-qty-btn--minus"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label="تقليل الكمية"
                      >
                        <Minus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="cart-item-img">
                    <img src={getProductImageUrl(item)} alt={item.name} />
                  </div>
                </li>
              ))}
            </ul>

            <footer className="cart-footer">
              <div className="cart-total">
                <span className="cart-total-label">
                  المجموع ({cartCount} {itemLabel})
                </span>
                <span className="cart-total-value">{total}₪</span>
              </div>
              <button
                className="cart-checkout-btn"
                onClick={() => navigate("/checkout/review")}
              >
                المتابعة للدفع
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
