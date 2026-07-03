import { useState, useEffect, useRef } from "react";
import { X, Upload } from "lucide-react";
import "./ProductFormModal.css";
import { createProduct, updateProduct, getCategories } from "../services/productService";
import { getAuthToken } from "../services/authService";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
  stockType: "unlimited", // "limited" | "unlimited"
  quantity: "",
  status: "active", // "active" | "hidden"
};

export default function ProductFormModal({ open, product, onClose, onSaved }) {
  const fileRef = useRef(null);
  const token = getAuthToken();
  const isEditMode = Boolean(product);

  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  // جلب قائمة الفئات من الباك اند عند فتح المودال
useEffect(() => {
  if (!open) return;
  getCategories()
    .then((res) => setCategories(res.data?.categories ?? []))
    .catch(() => setCategories([]));
}, [open]);
  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({
        name: product.name ?? "",
        description: product.description ?? "",
        price: product.price ?? "",
        categoryId: product.categoryId ?? "",
        stockType: product.stockType ?? (product.quantity != null ? "limited" : "unlimited"),
        quantity: product.quantity ?? "",
        status: product.status ?? "active",
      });
      setImagePreview(product.images?.[0] ?? null);
    } else {
      setForm(emptyForm);
      setImagePreview(null);
    }
    setImageFile(null);
    setErrors({});
  }, [open, product]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "اسم المنتج مطلوب";
    if (!form.price) errs.price = "السعر مطلوب";
    else if (Number(form.price) <= 0) errs.price = "السعر غير صحيح";
    if (!form.categoryId) errs.categoryId = "الفئة مطلوبة";
    if (form.stockType === "limited") {
      if (form.quantity === "" || Number(form.quantity) < 0) {
        errs.quantity = "الكمية مطلوبة";
      }
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("description", form.description.trim());
      fd.append("price", form.price);
      fd.append("categoryId", form.categoryId);
      fd.append("stockType", form.stockType);
      fd.append("quantity", form.stockType === "limited" ? form.quantity : "");
      fd.append("status", form.status);
      if (imageFile) fd.append("image", imageFile);

      if (isEditMode) {
       await updateProduct(product._id ?? product.id, fd);
      } else {
        await createProduct(fd);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setErrors({ general: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pfm-overlay" dir="rtl" onClick={onClose}>
      <div className="pfm-card" onClick={(e) => e.stopPropagation()}>

        <div className="pfm-header">
          <button className="pfm-close" onClick={onClose} aria-label="إغلاق">
            <X size={20} />
          </button>
          <h2>{isEditMode ? "تعديل المنتج" : "إضافة منتج جديد"}</h2>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="pfm-image-section">
            <label className="pfm-image-label">صورة المنتج</label>
            <div className="pfm-image-row">
              <button type="button" className="pfm-upload-btn" onClick={() => fileRef.current?.click()}>
                <Upload size={16} />
                تحميل صورة
              </button>
              <div className="pfm-image-preview">
                {imagePreview ? (
                  <img src={imagePreview} alt="معاينة" />
                ) : (
                  <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#fff" strokeWidth="1.6">
                    <path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                )}
              </div>
              <input type="file" accept="image/*" ref={fileRef} style={{ display: "none" }} onChange={handleImageChange} />
            </div>
          </div>

          <div className="pfm-field">
            <label>اسم المنتج *</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="مثال: زيت زيتون فلسطيني" />
            {errors.name && <p className="pfm-error">{errors.name}</p>}
          </div>

          <div className="pfm-field">
            <label>وصف المنتج</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="وصف مختصر للمنتج..."
              rows={3}
            />
            {errors.description && <p className="pfm-error">{errors.description}</p>}
          </div>

          <div className="pfm-field">
            <label>السعر (₪) *</label>
            <input type="number" name="price" min="0" step="0.01" value={form.price} onChange={handleChange} placeholder="0" />
            {errors.price && <p className="pfm-error">{errors.price}</p>}
          </div>

          <div className="pfm-field">
            <label>الفئة *</label>
            <select name="categoryId" value={form.categoryId} onChange={handleChange}>
              <option value="" disabled>
                اختر الفئة
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.categoryId && <p className="pfm-error">{errors.categoryId}</p>}
          </div>

          <div className="pfm-field">
            <label>نوع المخزون *</label>
            <div className="pfm-radio-row">
              <label className="pfm-radio">
                <input
                  type="radio"
                  name="stockType"
                  value="unlimited"
                  checked={form.stockType === "unlimited"}
                  onChange={() => setForm((p) => ({ ...p, stockType: "unlimited", quantity: "" }))}
                />
                غير محدود
              </label>
              <label className="pfm-radio">
                <input
                  type="radio"
                  name="stockType"
                  value="limited"
                  checked={form.stockType === "limited"}
                  onChange={() => setForm((p) => ({ ...p, stockType: "limited" }))}
                />
                محدود
              </label>
            </div>
          </div>

          {/* تظهر فقط عند اختيار "محدود" */}
          {form.stockType === "limited" && (
            <div className="pfm-field">
              <label>الكمية *</label>
              <input type="number" name="quantity" min="0" value={form.quantity} onChange={handleChange} placeholder="مثال: 20" />
              {errors.quantity && <p className="pfm-error">{errors.quantity}</p>}
            </div>
          )}

          <div className="pfm-field">
            <label>الحالة</label>
            <div className="pfm-radio-row">
              <label className="pfm-radio">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={form.status === "active"}
                  onChange={() => setForm((p) => ({ ...p, status: "active" }))}
                />
                نشط
              </label>
              <label className="pfm-radio">
                <input
                  type="radio"
                  name="status"
                  value="hidden"
                  checked={form.status === "hidden"}
                  onChange={() => setForm((p) => ({ ...p, status: "hidden" }))}
                />
                مخفي
              </label>
            </div>
          </div>

          {errors.general && <div className="pfm-banner-error">{errors.general}</div>}

          <div className="pfm-actions">
            <button type="button" className="pfm-btn-cancel" onClick={onClose} disabled={loading}>
              إلغاء
            </button>
            <button type="submit" className="pfm-btn-save" disabled={loading}>
              {loading ? "جاري الحفظ..." : isEditMode ? "حفظ التعديلات" : "إضافة المنتج"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}