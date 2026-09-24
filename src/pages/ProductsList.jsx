import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import "./ProductsList.css";
import { getProducts, deleteProduct, updateProductStatus } from "../services/productService";
import { getAuthToken } from "../services/authService";
import { API_BASE_URL } from "../utils/api"; // 🆕 عشان نبني رابط الباك إند مباشرة (لموضوع الميتا تاغز بواتساب/فيسبوك)
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
// 🆕 أيقونة المشاركة/الترويج
const ShareIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
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

  // 🆕 تخزين id المنتج اللي انتسخ رابطه مؤخراً، عشان نعرض "تم النسخ" تحت زر الترويج تبعه فقط
  const [copiedId, setCopiedId] = useState(null);

  //   لدعم فتح منتج محدد مباشرة عبر الرابط (?productId=xxx) — جاي مثلاً من صفحة الإشعارات
  const [searchParams, setSearchParams] = useSearchParams();

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

  //   بعد ما تنجلب المنتجات: لو في productId بالرابط، نلاقي المنتج ونفتحله
  // مودال التفاصيل تلقائياً (نفس اللي بيصير لما تدوسي عالكارد)، وبعدها منشيل
  // الـ query param من الرابط حتى ما يعاود يفتح المودال لو المستخدم سكّره ورجع.
  useEffect(() => {
    if (loading) return;
    const productId = searchParams.get("productId");
    if (!productId) return;

    const found = products.find((p) => (p._id ?? p.id) === productId);
    if (found) {
      setSelectedProduct(found);
      setIsDetailsOpen(true);
    }

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("productId");
      return next;
    }, { replace: true });
  }, [loading, products, searchParams, setSearchParams]);

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

  // 🆕 نسخ رابط المنتج للكليبورد (رابط الترويج/المشاركة)
  //    ⚠️ مهم: هذا الرابط لازم يشاور مباشرة على الباك إند (API_BASE_URL) مش على
  //    صفحة الريأكت (window.location.origin). السبب: نفس الـ endpoint
  //    `/api/product/:id` عند الباك إند بيفرّق حسب الـ Accept header:
  //      - لو الطلب من كروولر واتساب/فيسبوك (بدون Accept: application/json)
  //        → بيرجع صفحة HTML فيها meta tags (og:image, og:title) عشان تطلع
  //        معاينة (صورة + اسم المنتج) لما ينلصق الرابط بمحادثة.
  //      - لو الطلب من التطبيق نفسه (مع Accept: application/json)
  //        → بيرجع JSON عادي.
  //    فلو نسخنا رابط صفحة الريأكت (SPA) بدل رابط الـ API، الكروولر ما رح
  //    يلاقي أي meta tags حقيقية (لأنه React بيبني المحتوى بالـ JS بعد التحميل،
  //    والكروولر ما بينفذ JS)، وبالتالي ما رح تطلع أي معاينة أبداً.
  const handleCopyLink = async (product) => {
    const id = product._id ?? product.id;
    const link = `${API_BASE_URL}/api/product/${id}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        // fallback للمتصفحات القديمة أو لو الصفحة مش على https
        const textarea = document.createElement("textarea");
        textarea.value = link;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 5000);
    } catch (err) {
      setError("تعذّر نسخ الرابط، حاول مرة أخرى.");
    }
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
            const image = product.primaryImage?.imageUrl || product.images?.[0]?.imageUrl;
 
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

                {/* 🆕 زر الترويج — بينسخ رابط المنتج، وبيظهر تأكيد "تم النسخ" مؤقتاً
                    ⚠️ style مكتوب inline قصداً هون (مش معتمد على .pl-action-btn) عشان
                    نتجنب مشكلة الهوفر (نص أبيض ع خلفية بيضاء) والحجم الصغير اللي كانوا
                    جايين من الكلاس المشترك مع باقي الأزرار */}
                <div style={{ padding: "0 12px 10px" }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCopyLink(product); }}
                    disabled={isBusy}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "9px 12px",
                      fontSize: 14,
                      fontWeight: 600,
                      borderRadius: 8,
                      cursor: isBusy ? "not-allowed" : "pointer",
                      border: copiedId === id ? "1px solid #16a34a" : "1px solid #f97316",
                      backgroundColor: copiedId === id ? "#f0fdf4" : "#fff7ed",
                      color: copiedId === id ? "#16a34a" : "#f97316",
                      transition: "background-color .15s, color .15s, border-color .15s",
                    }}
                    onMouseEnter={(e) => {
                      if (copiedId === id) return;
                      e.currentTarget.style.backgroundColor = "#f97316";
                      e.currentTarget.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      if (copiedId === id) return;
                      e.currentTarget.style.backgroundColor = "#fff7ed";
                      e.currentTarget.style.color = "#f97316";
                    }}
                  >
                    <ShareIcon />
                    {copiedId === id ? "تم نسخ الرابط" : "تسويق "}
                  </button>
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
        productId={selectedProduct?._id ?? selectedProduct?.id}
        onClose={() => setIsDetailsOpen(false)}
      />
    </div>
  );
}