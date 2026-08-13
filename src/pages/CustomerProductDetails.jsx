import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  Check,
  Heart,
  MessageCircle,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  Store,
} from "lucide-react";

import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { getPublicProductDetails } from "../services/productService";
import { getCurrentUser } from "../services/authService";
import { storeProfilePath, extractSellerId } from "../utils/sellerHelpers";
import { contactStore } from "../utils/chatHelpers";
import BuyerProductReviewsSection from "../components/BuyerProductReviewsSection";
import { ProductDetailsSkeleton } from "../components/LoadingState";
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addItem, cartCount } = useCart();
  const { isWishlisted, toggleWishlist, wishlistCount } = useWishlist();
  const [quantity, setQuantity] = useState(1);

  // ✅ حالة زر "مراسلة المتجر" — نمنع الضغطات المتعددة وندلّ على التحميل
  const [messagingStore, setMessagingStore] = useState(false);
  // ✅ Toast للتنبيهات (إضافة للسلة، أخطاء)
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  // ✅ لما يفوت اليوزر بـ ?reviewId=xxx (مثلاً من إشعار "رد على تقييمك")
  // → بنمرر الـ id للـ BuyerProductReviewsSection عن طريق prop
  // → وبنعمل scroll + highlight لمكان الرد بعد ما الريفيوز يحمل
  const highlightReviewId = searchParams.get("reviewId");

  // ✅ Toast auto-dismiss بعد 2.5s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

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
        <main className="pd-main">
          <ProductDetailsSkeleton />
        </main>
      </div>
    );
  }

  if (error || !product) {
    return <Navigate to="/product-not-found" replace />;
  }

  const wishlisted = isWishlisted(product.id);

  const handleAddToCart = async () => {
    try {
      await addItem(product, quantity);
      setToast({ message: "تمت إضافة المنتج إلى السلة", type: "success" });
    } catch (err) {
      const msg = err.response?.data?.data?.message || err.message || "حدث خطأ ما";
      setToast({ message: msg, type: "error" });
    }
  };

  // ── مراسلة المتجر ──
  // يستخدم contactStore helper الموحّد من utils/chatHelpers.js
  // — صفحة /messages بتقرأ الـ state وتستدعي createConversation بنفسها
  //   (لتفادي duplicate calls ولتمركز الـ logic بمكان واحد)
  // ✅ السماح بالمراسلة الذاتية: لو البائع والمشتري نفس الـ user
  //    (المستخدم بيدخل على منتجه الخاص)، الـ button بيظهر وبيشتغل طبيعي.
  //    ممنوع نحط شرط يمنع senderId === receiverId في الواجهة.
  const handleMessageStore = () => {
    if (messagingStore) return; // prevent double-clicks

    // 1) لازم يكون مسجل دخول (المشتري) — وإلا نوجّهه لصفحة الدخول
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate("/login/customer");
      return;
    }

    // 2) نستخرج sellerId من أي shape للـ product
    const sellerId = extractSellerId(product);
    if (!sellerId) {
      console.warn("[ProductDetails] لا يمكن مراسلة المتجر: sellerId مفقود من المنتج");
      return;
    }

    // ✅ بدون فحص ذاتي: لو currentUser.id === sellerId (نفس المستخدم بيبيع ويشتري)
    //    — نسمحله يفتح محادثة مع نفسه عادي. الحظر يكون على الباك فقط.

    // 3) نوجّه على /messages مع state — صفحة الرسائل بتتولّى إنشاء/فتح المحادثة
    contactStore(navigate, {
      sellerId,
      productId: product.id,
      storeName: product.seller?.storeName || product.sellerName,
    });
  };

  return (
    <div className="pd-wrapper" dir="rtl">
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
              {/* ✅ Status badge: محدود + كمية 0 → "نفذ"
                  أي حالة ثانية (limited + كمية > 0، أو unlimited، أو status=active) → "متوفر" */}
              {(() => {
                const isOutOfStock =
                  product.stockType === "limited" && Number(product.quantity ?? 0) === 0;
                if (isOutOfStock) {
                  return (
                    <span className="pd-badge pd-badge--out">
                      نفذ
                    </span>
                  );
                }
                if (product.status === "active") {
                  return (
                    <span className="pd-badge pd-badge--available">
                      <Check size={13} />
                      متوفر
                    </span>
                  );
                }
                return null;
              })()}
            </div>

            <h1 className="pd-title">{product.name}</h1>

            <div className="pd-rating-row">
              <StarRating rating={product.averageRating || 0} />
              <span className="pd-rating-value">{product.averageRating || 0}</span>
              <span className="pd-review-count">({product.reviewsCount || 0} تقييم)</span>
            </div>

            {(() => {
              const sellerName =
                product.seller?.storeName || product.sellerName || "متجر";
              const storePath = storeProfilePath(product);
              const sellerId = extractSellerId(product);

              return (
                <div className="pd-seller">
                  <Store size={16} />
                  <span className="pd-seller-name">
                    البائع:{" "}
                    {storePath ? (
                      // ✅ اسم البائع = <Link> يودّي على صفحة المتجر
                      <Link
                        to={storePath}
                        className="pd-seller-link"
                        title={`زيارة متجر ${sellerName}`}
                        aria-label={`زيارة متجر ${sellerName}`}
                      >
                        <strong>{sellerName}</strong>
                      </Link>
                    ) : (
                      <strong>{sellerName}</strong>
                    )}
                  </span>

                  {/* ✅ زر "مراسلة المتجر" — يظهر فقط لو عندنا sellerId */}
                  {sellerId && (
                    <button
                      type="button"
                      className="pd-msg-store-btn"
                      onClick={handleMessageStore}
                      disabled={messagingStore}
                      title="مراسلة المتجر"
                      aria-label="مراسلة المتجر"
                    >
                      <MessageCircle size={15} />
                      <span>
                        {messagingStore ? "جاري الفتح..." : "مراسلة المتجر"}
                      </span>
                    </button>
                  )}
                </div>
              );
            })()}

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
                  onClick={() =>
                    setQuantity((q) => {
                      // ✅ لو المخزون غير محدود → ما في حد أعلى
                      if (product.stockType === "unlimited") return q + 1;
                      // ✅ لو محدود → الحد الأعلى هو الكمية الفعلية
                      const max = Number(product.quantity ?? 0);
                      if (max <= 0) return q; // ما في مخزون
                      return Math.min(max, q + 1);
                    })
                  }
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

        {/* ═══════ تقييمات المشترين على هذا المنتج (انسيابي) ═══════ */}
        {product?.id && (
          <BuyerProductReviewsSection
            productId={product.id}
            title="آراء العملاء"
            subtitle=""
            inline
            showHeader
            highlightReviewId={highlightReviewId}
            onHighlighted={() => {
              // ✅ بعد ما الريفيو اتعلم — بنشيل الـ query param من URL عشان ما يضل معنا
              // وبنعمل scroll ناعم لمكانه
              const targetId = `review-${highlightReviewId}`;
              const el = document.getElementById(targetId);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
              }
              if (searchParams.get("reviewId")) {
                const next = new URLSearchParams(searchParams);
                next.delete("reviewId");
                setSearchParams(next, { replace: true });
              }
            }}
            className="pd-reviews-flow"
          />
        )}
      </main>

      {toast && (
        <div className={`pd-toast pd-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
