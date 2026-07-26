import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import "./ConvertToSeller.css";
import { validateStoreName, validateStoreDescription } from "../utils/validators";
import { useAuth } from "../context/AuthContext";
import { connectSocket, disconnectSocket } from "../utils/socket";

// ── Icons ──
const StoreIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

const LocationIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const SpinnerIcon = () => <span className="cts-spinner" />;

export default function ConvertToSeller() {
  const navigate = useNavigate();
  const { becomeSeller, hasSellerProfile } = useAuth();

  const [form, setForm] = useState({
    storeName: "",
    storeDescription: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // ─────────────────────────────────────────────────────────────────
  // ✅ One-time-only guard:
  //    هاي الصفحة "معلومات المتجر" لازم تنعرض فقط إذا المستخدم
  //    ما عندوش seller profile. لو عنده متجر (هاي الصفحة خلصت مرة
  //    أو الـ state محدّث من تاب تاني)، نحوّله على لوحة البائع فوراً
  //    بدون عرض الفورم.
  // ─────────────────────────────────────────────────────────────────
  if (hasSellerProfile) {
    return <Navigate to="/seller/dashboard" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const errs = {};
    const storeNameErr = validateStoreName(form.storeName);
    if (storeNameErr) errs.storeName = storeNameErr;
    const descErr = validateStoreDescription(form.storeDescription);
    if (descErr) errs.storeDescription = descErr;
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
    setErrors({});
    try {
      // ✅ AuthContext.becomeSeller صار يتعامل مع 409 شفّاف:
      //    لو الباك رجّع 409 (state محلي قديم)، بيرجع success مع
      //    recoveredFrom409=true والـ state ينحدّث تلقائياً.
      const result = await becomeSeller({
        storeName: form.storeName.trim(),
        storeDescription: form.storeDescription.trim(),
      });

      if (result?.reconnectSocket) {
        disconnectSocket();
        connectSocket();
      }

      setSuccess(true);
      // نوجّه على لوحة البائع — هاي الصفحة خلصت دورها (one-time-only)
      setTimeout(() => navigate("/seller/dashboard", { replace: true }), 1000);
    } catch (err) {
      const backendMsg =
        err?.response?.data?.data?.message ||
        err?.response?.data?.message ||
        err.message ||
        "حدث خطأ، حاول مرة أخرى";
      setErrors({ general: backendMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cts-root" dir="rtl">
      <div className="cts-wrapper">
        <p className="cts-breadcrumb">انشاء حساب بائع</p>
        <h1 className="cts-title">معلومات المتجر</h1>

        <form className="cts-card" onSubmit={handleSubmit} noValidate>

          <div className="cts-field">
            <label>اسم المتجر *</label>
            <input
              name="storeName"
              value={form.storeName}
              onChange={handleChange}
              placeholder="مثال: متجر فوكس"
              className={errors.storeName ? "cts-input-error" : ""}
            />
            {errors.storeName && <p className="cts-error">{errors.storeName}</p>}
          </div>

          <div className="cts-field">
            <label>وصف المتجر</label>
            <textarea
              name="storeDescription"
              value={form.storeDescription}
              onChange={handleChange}
              placeholder="اكتب وصفاً مختصراً لمتجرك"
              className={errors.storeDescription ? "cts-input-error" : ""}
            />
            {errors.storeDescription && (
              <p className="cts-error">{errors.storeDescription}</p>
            )}
          </div>

          {errors.general && <div className="cts-banner-error">{errors.general}</div>}
          {success && (
            <div className="cts-banner-success">
              تم تفعيل متجرك بنجاح، جاري تحويلك...
            </div>
          )}

          <button type="submit" className="cts-btn-submit" disabled={loading}>
            {loading ? <SpinnerIcon /> : <StoreIcon />}
            {loading ? "جاري التفعيل..." : "تفعيل المتجر"}
          </button>

        </form>
      </div>
    </div>
  );
}
