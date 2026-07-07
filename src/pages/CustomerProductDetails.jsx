import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Check,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  Store,
} from "lucide-react";
import CustomerNavbar from "../components/CustomerNavbar";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { getPublicProductDetails } from "../services/productService";
import logo from "../assets/logo.png";
import "./CustomerProductDetails.css";

function StarRating({ rating }) {
  return (
    <div className="pd-stars" aria-label={`تقييم ${rating} من 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={18}
          fill={star <= Math.round(rating) ? "#fbbf24" : "none"}
          stroke={star <= Math.round(rating) ? "#fbbf24" : "#d1d5db"}
        />
      ))}
    </div>
  );
}

export default function CustomerProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addItem, cartCount } = useCart();
  const { isWishlisted, toggleWishlist, wishlistCount } = useWishlist();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const product = await getPublicProductDetails(id);
      console.log("Fetched product:", product);
      setProduct(product);
    } catch (err) {
      console.error("Error fetching product:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pd-wrapper" dir="rtl">
        <CustomerNavbar logo={logo} cartCount={cartCount} wishlistCount={wishlistCount} />
        <main className="pd-main">
          <div className="pd-empty">
            <h3>جاري التحميل...</h3>
          </div>
        </main>
      </div>
    );
  }

  if (error || !product) {
    return <Navigate to="/product-not-found" replace />;
  }

  const wishlisted = isWishlisted(product.id);

  const handleAddToCart = () => {
    addItem(product, quantity);
  };

  return (
    <div className="pd-wrapper" dir="rtl">
      <CustomerNavbar logo={logo} cartCount={cartCount} wishlistCount={wishlistCount} />

      <main className="pd-main">
        <nav className="pd-breadcrumb" aria-label="مسار التنقل">
          <Link to="/products">المنتجات</Link>
          <ChevronLeft size={14} />
          <span>{product.category?.name || product.categoryId || "منتج"}</span>
          <ChevronLeft size={14} />
          <span className="pd-breadcrumb-current">{product.name}</span>
        </nav>

        <div className="pd-layout">
          <div className="pd-image-wrap">
            <img src={product.primaryImage?.imageUrl || product.images?.[0]?.imageUrl || logo} alt={product.name} />
          </div>

          <section className="pd-info">
            <div className="pd-badges">
              <span className="pd-badge pd-badge--category">{product.category?.name || product.categoryId || "منتج"}</span>
              {product.status === "active" && (
                <span className="pd-badge pd-badge--available">
                  <Check size={13} />
                  متوفر
                </span>
              )}
            </div>

            <h1 className="pd-title">{product.name}</h1>

            <div className="pd-rating-row">
              <StarRating rating={product.averageRating || 0} />
              <span className="pd-rating-value">{product.averageRating || 0}</span>
              <span className="pd-review-count">({product.reviewsCount || 0} تقييم)</span>
            </div>

            <div className="pd-seller">
              <Store size={16} />
              <span>
                البائع: <strong>{product.seller?.storeName || product.sellerName || "متجر"}</strong>
              </span>
            </div>

            <div className="pd-price-block">
              <span className="pd-price-label">السعر</span>
              <span className="pd-price">{product.price}₪</span>
              {product.freeShipping && (
                <span className="pd-shipping">
                  <Check size={14} />
                  شحن مجاني
                </span>
              )}
            </div>

            <div className="pd-description">
              <h2>وصف المنتج</h2>
              <p>{product.description || "لا يوجد وصف"}</p>
            </div>

            <div className="pd-actions">
              <div className="pd-qty">
                <button
                  type="button"
                  className="pd-qty-btn"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="تقليل الكمية"
                >
                  <Minus size={16} />
                </button>
                <span className="pd-qty-value">{quantity}</span>
                <button
                  type="button"
                  className="pd-qty-btn pd-qty-btn--plus"
                  onClick={() => setQuantity((q) => Math.min(product.quantity || 10, q + 1))}
                  aria-label="زيادة الكمية"
                >
                  <Plus size={16} />
                </button>
              </div>

              <button type="button" className="pd-cart-btn" onClick={handleAddToCart}>
                <ShoppingCart size={18} />
                أضف إلى السلة
              </button>
            </div>

            <button
              type="button"
              className={`pd-wishlist-btn ${wishlisted ? "active" : ""}`}
              onClick={() => toggleWishlist(product)}
            >
              <Heart size={18} fill={wishlisted ? "currentColor" : "none"} />
              {wishlisted ? "في المفضلة" : "أضف للمفضلة"}
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}