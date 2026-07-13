import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Heart,
  Plus,
  Star,
  Store,
  SlidersHorizontal,
  ShoppingBag,
  Monitor,
} from "lucide-react";
 
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { getPublicProductsWithFilters } from "../services/productService";
import logo from "../assets/logo.png";
import handcraftIconImg from "../assets/icon-park-outline_traditional-chinese-medicine.jpg";
import foodIconImg from "../assets/ion_fast-food-outline.png";
import clothesIconImg from "../assets/hugeicons_clothes.jpg";
import "./CustomerProducts.css";

const categories = [
  { id: "all", label: "الكل", icon: ShoppingBag },
  { id: "food", label: "المأكولات المنزلية", iconSrc: foodIconImg },
  { id: "clothes", label: "ملابس", iconSrc: clothesIconImg },
  { id: "handicraft", label: "الاشغال اليدوية", iconSrc: handcraftIconImg },
  { id: "electronics", label: "الإلكترونيات", icon: Monitor },
];

export default function CustomerProducts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addItem, cartCount } = useCart();
  const { isWishlisted, toggleWishlist, wishlistCount } = useWishlist();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const categoryFromUrl = searchParams.get("category");
    if (categoryFromUrl) {
      setActiveCategory(categoryFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [search, activeCategory, page, minPrice, maxPrice, sortBy]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = {
        page,
        search: search || undefined,
      };
      // أرسل categoryId إذا لم يكن "all"
      if (activeCategory !== "all") {
        filters.categoryId = activeCategory;
      }
      // فلتر السعر
      if (minPrice) filters.minPrice = minPrice;
      if (maxPrice) filters.maxPrice = maxPrice;
      // الترتيب
      if (sortBy) filters.sort = sortBy;
      
      const response = await getPublicProductsWithFilters(filters);
      setProducts(response.data?.products || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setActiveCategory("all");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("");
  };

  return (
    <div className="cp-wrapper" dir="rtl">
      

      <main className="cp-main">
        <header className="cp-header">
          <h1>جميع المنتجات</h1>
          <p>تصفح وابحث في مئات المنتجات</p>
        </header>

        <div className="cp-search-wrap">
          <Search size={18} className="cp-search-icon" />
          <input
            type="text"
            className="cp-search-input"
            placeholder="ابحث عن منتج أو متجر..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className={`cp-filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {showFilters && (
          <div className="cp-filters-popup">
            <div className="cp-filter-popup-section">
              <h4 className="cp-filter-popup-title">السعر</h4>
              <div className="cp-price-filter">
                <input
                  type="number"
                  placeholder="من"
                  className="cp-price-input"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <span>-</span>
                <input
                  type="number"
                  placeholder="إلى"
                  className="cp-price-input"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="cp-filter-popup-section">
              <h4 className="cp-filter-popup-title">الترتيب حسب</h4>
              <select
                className="cp-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="">الافتراضي</option>
                <option value="price_asc">السعر: من الأقل للأعلى</option>
                <option value="price_desc">السعر: من الأعلى للأقل</option>
                <option value="rating_desc">التقييم: الأعلى أولاً</option>
                <option value="newest">الأحدث</option>
              </select>
            </div>

            <button className="cp-reset-btn" onClick={handleResetFilters}>
              إعادة تعيين الفلاتر
            </button>
          </div>
        )}

        <div className="cp-content">
          <div className="cp-toolbar">
            <div className="cp-categories">
              {categories.map(({ id, label, icon: Icon, iconSrc }) => (
                <button
                  key={id}
                  className={`cp-category-btn ${activeCategory === id ? "active" : ""}`}
                  onClick={() => setActiveCategory(id)}
                >
                  {iconSrc ? (
                    <img src={iconSrc} alt="" className="cp-category-img" />
                  ) : (
                    Icon && <Icon size={15} />
                  )}
                  {label}
                </button>
              ))}
            </div>

            <div className="cp-count">
              <SlidersHorizontal size={16} />
              <span>{products.length} منتج</span>
            </div>
          </div>

        {loading ? (
          <div className="cp-empty">
            <ShoppingBag size={48} strokeWidth={1.2} />
            <h3>جاري التحميل...</h3>
          </div>
        ) : error ? (
          <div className="cp-empty">
            <ShoppingBag size={48} strokeWidth={1.2} />
            <h3>حدث خطأ</h3>
            <p>{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="cp-empty">
            <ShoppingBag size={48} strokeWidth={1.2} />
            <h3>لا توجد منتجات</h3>
            <p>جرّب تغيير البحث أو الفئة</p>
          </div>
        ) : (
          <div className="cp-grid">
            {products.map((product) => {
              const wishlisted = isWishlisted(product.id);
              return (
                <article
                  className="cp-card cp-card--clickable"
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
                  <div className="cp-card-img-wrap">
                    <img src={product.primaryImage?.imageUrl || logo} alt={product.name} />
                    <button
                      className={`cp-wishlist-btn ${wishlisted ? "active" : ""}`}
                      aria-label="إضافة للمفضلة"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist(product);
                      }}
                    >
                      <Heart size={16} fill={wishlisted ? "currentColor" : "none"} />
                    </button>
                    <span className="cp-cat-badge">{product.category?.name || "منتج"}</span>
                  </div>

                  <div className="cp-card-body">
                    <span className="cp-status">{product.status || "متوفر"}</span>
                    <h3 className="cp-card-title">{product.name}</h3>

                    <div className="cp-store">
                      <Store size={13} />
                      <span>{product.seller?.storeName || "متجر"}</span>
                    </div>

                    <div className="cp-meta">
                      <div className="cp-rating">
                        <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
                        <span>{product.averageRating || 0}</span>
                      </div>
                      <span className="cp-price">{product.price}₪</span>
                    </div>

                    <p className="cp-qty">الكمية: {product.quantity || 0}</p>

                    <button
                      className="cp-add-btn"
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
              );
            })}
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
