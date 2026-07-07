import { useState, useEffect } from "react";
import "./ProductsList.css";
import { getProducts, deleteProduct, updateProductStatus } from "../services/productService";
import { getAuthToken } from "../services/authService";
import ProductFormModal from "../components/ProductFormModal";
import ConfirmModal from "../components/ConfirmModal";
import ProductDetailsModal from "../components/ProductDetailsModal";
import SellerNavbar from "../components/SellerNavbar";

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const EditIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
  </svg>
);
const PackageEmptyIcon = () => (
  <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="#d1d5db" strokeWidth="1.5">
    <path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
const Loader = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" className="pl-spin" fill="none" stroke="#f97316" strokeWidth="2.5">
    <path d="M21 12a9 9 0 11-9-9" />
  </svg>
);

export default function ProductsList() {

  const token = getAuthToken();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  // حالة مودال الإضافة/التعديل
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchText, setSearchText] = useState("");

  // حالة مودال تأكيد الحذف
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // حالة مودال تفاصيل المنتج (يفتح عند الضغط على الكارد)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

 const fetchProducts = async () => {
    try {
      setLoading(true);
       const data = await getProducts();
       setProducts(data?.data?.products ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [token]);

  const handleToggleStatus = async (product) => {
    const id = product._id ?? product.id;
    const newStatus = product.status === "active" ? "hidden" : "active";
    setBusyId(id);
    try {
      await updateProductStatus(id, newStatus);
      setProducts((prev) =>
        prev.map((p) => ((p._id ?? p.id) === id ? { ...p, status: newStatus } : p))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };
  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(searchText.toLowerCase())
  );

const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    const id = productToDelete._id ?? productToDelete.id;
    setDeleteLoading(true);
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => (p._id ?? p.id) !== id));
      setIsConfirmOpen(false);
      setProductToDelete(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // فتح مودال تفاصيل المنتج عند الضغط على الكارد
  const handleCardClick = (product) => {
    setSelectedProduct(product);
    setIsDetailsOpen(true);
  };

  return (
        <div className="pl-wrapper" dir="rtl">
      <SellerNavbar />
      <div className="pl-content">
      <div className="pl-header"> 
        <div>
          <h1>منتجاتي</h1>
          <p>أدر منتجاتك وتحكم بظهورها للمشترين</p>
        </div>
        <button className="pl-btn-add" onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}>
           <PlusIcon />
          إضافة منتج جديد
        </button>
      </div>
      <div className="pl-search-wrap">
        <input
          type="text"
          placeholder="البحث عن المنتج"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>
      {error && (
        <div className="pl-error">
          <span>{error}</span>
          <button onClick={() => setError("")}>إغلاق</button>
        </div>
      )}

      {loading ? (
        <div className="pl-loading"><Loader /></div>
      ) : filteredProducts.length === 0 ? (
        <div className="pl-empty">
          <PackageEmptyIcon />
          <h3>لا توجد منتجات بعد</h3>
          <p>ابدأ بإضافة أول منتج لمتجرك ليظهر للمشترين</p>
             <button className="pl-btn-add" onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}>
             <PlusIcon />
            إضافة منتج
          </button>
        </div>
      ) : (
        <div className="pl-grid">
          {filteredProducts.map((product) => {
            const id = product._id ?? product.id;
            const image = product.images?.[0]?.imageUrl;
            const isBusy = busyId === id;
            return (
              <div className="pl-card" key={id}>
                <div
                  className="pl-card-img"
                  onClick={() => handleCardClick(product)}
                  style={{ cursor: "pointer" }}
                >
                  {image ? <img src={image} alt={product.name} /> : <PackageEmptyIcon />}
                  <span className={`pl-badge ${product.status === "active" ? "active" : "hidden"}`}>
                    {product.status === "active" ? "ظاهر" : "مخفي"}
                  </span>
                </div>
                <div className="pl-card-body">
                  <h3>{product.name}</h3>
                  <p className="pl-card-price">{product.price} ₪</p>
                  <p className="pl-card-stock">
                    {product.stockType === "unlimited"
                      ? "مخزون غير محدود"
                      : `الكمية: ${product.quantity ?? 0}`}
                  </p>
                </div>
                <div className="pl-card-actions">
                  <button
                    className="pl-action-btn"
                    onClick={(e) => { e.stopPropagation(); setEditingProduct(product); setIsFormOpen(true); }}
                    disabled={isBusy}
                  >
                    <EditIcon /> تعديل
                  </button>
                  <button
                    className="pl-action-btn"
                    onClick={(e) => { e.stopPropagation(); handleToggleStatus(product); }}
                    disabled={isBusy}
                  >
                    {product.status === "active" ? "إخفاء" : "إظهار"}
                  </button>
                  <button
                    className="pl-action-btn pl-action-danger"
                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(product); }}
                    disabled={isBusy}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
 )}
 </div>

      <ProductFormModal
        open={isFormOpen}
        product={editingProduct}
        onClose={() => setIsFormOpen(false)}
        onSaved={fetchProducts}
      />

      <ConfirmModal
        open={isConfirmOpen}
        title="هل أنت متأكد من حذف هذا المنتج؟"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        loading={deleteLoading}
      />

      <ProductDetailsModal
        open={isDetailsOpen}
        product={selectedProduct}
        onClose={() => setIsDetailsOpen(false)}
      />
    </div>
  );
}