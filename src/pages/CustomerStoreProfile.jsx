 import { useState } from "react";
import "./StoreProfilePage.css";

/**
 * StoreProfilePage — صفحة المتجر (بروفايل البائع) يلي يشوفها الزبون
 *
 * ملاحظة: الناف بار (CustomerNavbar) ما بينحط هون، هو موجود مرة وحدة
 * جوا CustomerLayout ويلف كل صفحات الزبون. هاي الصفحة بترجع المحتوى بس.
 *
 * البيانات هون Mock، استبدلها لاحقاً بـ fetch من الـ API متل:
 * const { data: store } = useQuery(['store', storeId], () => getStore(storeId));
 */

const STORE = {
  name: "فاشون هاوس",
  initial: "ف",
  rating: 4.3,
  reviewsCount: 156,
  responseHours: 24,
  productsCount: 12,
};

const PRODUCTS = [
  {
    id: 1,
    name: "حقيبة جلدية بدوية",
    price: 310,
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&q=80",
  },
  {
    id: 2,
    name: "بليزر خان عصري",
    price: 220,
    image:
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&q=80",
  },
  {
    id: 3,
    name: "وشاح حريمي فاخر",
    price: 85,
    image:
      "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=400&q=80",
  },
  {
    id: 4,
    name: "فستان سهرة أنيق",
    price: 150,
    image:
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80",
  },
];

const REVIEWS = [
  {
    id: 1,
    name: "أحمد محمود",
    timeAgo: "منذ يومين",
    rating: 5,
    comment:
      "المنتج راقٍ جداً والجودة توطبق، التوصيل كان سريع جداً والتعامل راقٍ، أنصح الجميع بالشراء من فاشون هاوس.",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&q=80",
  },
  {
    id: 2,
    name: "سارة خالد",
    timeAgo: "منذ أسبوع",
    rating: 5,
    comment:
      "أفضل متجر للأزياء تعاملت معه، غرفة المقاسات دقيقة جداً والأقمشة ممتازة.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&q=80",
  },
  {
    id: 3,
    name: "محمد علي",
    timeAgo: "منذ 3 أسابيع",
    rating: 5,
    comment:
      "تجربة رائعة، الباقي متنوع جداً وأسعاره على جميع استمراريتي قبل الشراء.",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&q=80",
  },
];

function StarRating({ value, size = 14 }) {
  return (
    <span className="stars" style={{ fontSize: size }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < Math.round(value) ? "star filled" : "star"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function StoreProfilePage() {
  const [products] = useState(PRODUCTS);
  const [reviews] = useState(REVIEWS);

  return (
    <div className="store-page" dir="rtl">
      <main className="store-container">
        {/* شريط الإحصائيات + بطاقة المتجر */}
        <section className="store-hero">
          <div className="stat-card">
            <span className="stat-value">{STORE.reviewsCount}</span>
            <span className="stat-label">تقييم إيجابي</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{STORE.responseHours}</span>
            <span className="stat-label">ساعة استجابة</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{STORE.productsCount}</span>
            <span className="stat-label">منتج معروض</span>
          </div>

          <div className="store-banner">
            <div className="store-avatar">{STORE.initial}</div>
            <div className="store-info">
              <h1 className="store-name">{STORE.name}</h1>
              <div className="store-meta">
                <span>{STORE.productsCount} منتج</span>
                <span className="dot">•</span>
                <span className="rating-pill">
                  <StarRating value={STORE.rating} />
                  {STORE.rating} ({STORE.reviewsCount} تقييم)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* منتجات المتجر */}
        <section className="products-section">
          <div className="section-header">
            <h2>منتجات المتجر</h2>
            <span className="count-badge">{STORE.productsCount} منتج</span>
          </div>

          <div className="products-grid">
            {products.map((p) => (
              <article key={p.id} className="product-card">
                <div className="product-image-wrap">
                  <img src={p.image} alt={p.name} loading="lazy" />
                </div>
                <h3 className="product-name">{p.name}</h3>
                <div className="product-footer">
                  <button className="add-btn" aria-label={`أضف ${p.name} إلى السلة`}>
                    +
                  </button>
                  <span className="product-price">{p.price} ريال</span>
                </div>
              </article>
            ))}
          </div>

          <button className="show-all-btn">عرض جميع المنتجات</button>
        </section>

        {/* تقييمات الزبائن */}
        <section className="reviews-section">
          <div className="section-header">
            <h2>تقييمات الزبائن</h2>
            <span className="rating-summary">
              <StarRating value={STORE.rating} size={16} />
              {STORE.rating} ({STORE.reviewsCount} تقييم)
            </span>
          </div>

          <div className="reviews-list">
            {reviews.map((r) => (
              <article key={r.id} className="review-card">
                <img className="review-avatar" src={r.avatar} alt={r.name} />
                <div className="review-body">
                  <div className="review-head">
                    <div>
                      <span className="review-name">{r.name}</span>
                      <span className="review-time">{r.timeAgo}</span>
                    </div>
                    <StarRating value={r.rating} />
                  </div>
                  <p className="review-comment">{r.comment}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}