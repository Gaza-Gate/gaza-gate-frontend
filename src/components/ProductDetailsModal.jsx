 import "./ProductDetailsModal.css";

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PackageEmptyIcon = () => (
  <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#d1d5db" strokeWidth="1.5">
    <path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

export default function ProductDetailsModal({ open, product, onClose }) {
  if (!open || !product) return null;

  const image = product.images?.[0]?.imageUrl;

  return (
    <div className="pdm-overlay" onClick={onClose}>
      <div className="pdm-card" onClick={(e) => e.stopPropagation()} dir="rtl">
        <button className="pdm-close" onClick={onClose} aria-label="إغلاق">
          <CloseIcon />
        </button>

        <div className="pdm-img-wrap">
          {image ? (
            <img src={image} alt={product.name} className="pdm-img" />
          ) : (
            <div className="pdm-img-empty">
              <PackageEmptyIcon />
            </div>
          )}
          <span className={`pdm-badge ${product.status === "active" ? "active" : "hidden"}`}>
            {product.status === "active" ? "ظاهر" : "مخفي"}
          </span>
        </div>

        <div className="pdm-body">
          <h2 className="pdm-title">{product.name}</h2>
          <p className="pdm-price">{product.price} ₪</p>

          <p className="pdm-stock">
            {product.stockType === "unlimited"
              ? "مخزون غير محدود"
              : `الكمية المتوفرة: ${product.quantity ?? 0}`}
          </p>

          {product.description && (
            <p className="pdm-description">{product.description}</p>
          )}

          {product.category && (
            <p className="pdm-meta">
              <span className="pdm-meta-label">الفئة:</span> {product.category}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}