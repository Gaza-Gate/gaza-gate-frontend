import { useNavigate } from "react-router-dom";
import { Heart, Plus, Star, Store, Trash2 } from "lucide-react";
import CustomerNavbar from "../components/CustomerNavbar";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import logo from "../assets/logo.png";
import "./CustomerFavorites.css";

export default function CustomerFavorites() {
  const navigate = useNavigate();
  const { cartCount, addItem } = useCart();
  const { items, wishlistCount, toggleWishlist, clearWishlist } = useWishlist();

  const itemLabel =
    wishlistCount === 1 ? "منتج" : wishlistCount === 2 ? "منتجين" : "منتجات";

  return (
    <div className="fav-wrapper" dir="rtl">
      <CustomerNavbar logo={logo} cartCount={cartCount} wishlistCount={wishlistCount} />

      <main className="fav-main">
        <header className="fav-header">
          <div>
            <h1>المفضلة</h1>
            <p>
              {wishlistCount > 0
                ? `${wishlistCount} ${itemLabel} تم الحفظ`
                : "لا توجد منتجات محفوظة"}
            </p>
          </div>

          {wishlistCount > 0 && (
            <button className="fav-clear" onClick={clearWishlist}>
              <Trash2 size={15} />
              مسح الكل
            </button>
          )}
        </header>

        {items.length === 0 ? (
          <div className="fav-empty">
            <div className="fav-empty-visual">
              <span className="fav-empty-dot fav-empty-dot--grey" />
              <span className="fav-empty-dot fav-empty-dot--red" />
              <span className="fav-empty-circle">
                <Heart size={36} strokeWidth={1.5} />
              </span>
            </div>
            <h3>قائمة المفضلة فاضية</h3>
            <p>تصفح المنتجات وأضف ما يعجبك لقائمة المفضلة</p>
            <button className="fav-shop-btn" onClick={() => navigate("/products")}>
              تصفح المنتجات
            </button>
          </div>
        ) : (
          <div className="fav-grid">
            {items.map((product) => (
              <article
                className="fav-card fav-card--clickable"
                key={product.id}
                onClick={() => navigate(`/product/${product.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/product/${product.id}`);
                  }
                }}
              >
                <div className="fav-card-img-wrap">
                  <img src={product.primaryImage?.imageUrl || product.image} alt={product.name} />
                  <button
                    className="fav-heart-btn active"
                    aria-label="إزالة من المفضلة"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(product);
                    }}
                  >
                    <Heart size={16} fill="currentColor" />
                  </button>
                  {product.category?.name && (
                    <span className="fav-cat-badge">{product.category.name}</span>
                  )}
                </div>

                <div className="fav-card-body">
                  <span className="fav-status">{product.status || "نشط"}</span>
                  <h3 className="fav-card-title">{product.name}</h3>

                  <div className="fav-store">
                    <Store size={13} />
                    <span>{product.seller?.storeName || "متجر"}</span>
                  </div>

                  <div className="fav-meta">
                    {product.averageRating && (
                      <div className="fav-rating">
                        <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
                        <span>{product.averageRating}</span>
                      </div>
                    )}
                    <span className="fav-price">{product.price}₪</span>
                  </div>

                  {product.quantity && (
                    <p className="fav-qty">الكمية: {product.quantity}</p>
                  )}

                  <button
                    className="fav-add-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      addItem(product);
                    }}
                  >
                    <Plus size={16} />
                    أضف
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
