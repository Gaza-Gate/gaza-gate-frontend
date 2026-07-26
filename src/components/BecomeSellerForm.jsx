// src/components/BecomeSellerForm.jsx
//
// فورم بسيط (modal) بيظهر لما مستخدم hasSellerProfile === false يضغط
// "كن بائعًا". بياخد storeName + storeDescription وبينادي becomeSeller
// من الـ AuthContext.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Store } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./BecomeSellerForm.css";

export default function BecomeSellerForm({ onClose }) {
  const { becomeSeller, isBecomingSeller } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ storeName: "", storeDescription: "" });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validate() {
    const errs = {};
    if (!form.storeName.trim()) {
      errs.storeName = "اسم المتجر مطلوب";
    } else if (form.storeName.trim().length < 3) {
      errs.storeName = "اسم المتجر يجب أن يكون 3 أحرف على الأقل";
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    try {
      await becomeSeller(form);
      setSuccess(true);
      // نعطي فرصة للمستخدم يشوف رسالة النجاح قبل التحويل
      setTimeout(() => {
        onClose?.();
        navigate("/seller/dashboard");
      }, 1000);
    } catch (err) {
      const isConflict = err?.response?.status === 409;
      setErrors({
        general: isConflict
          ? "لديك متجر بالفعل — استخدم زر تبديل الدور بدل إنشاء متجر جديد"
          : err?.response?.data?.message || "حدث خطأ أثناء إنشاء المتجر، حاول مرة أخرى",
      });
    }
  }

  return (
    <div className="bsf-overlay" onClick={onClose}>
      <form
        className="bsf-card"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        noValidate
      >
        <button type="button" className="bsf-close-btn" onClick={onClose} aria-label="إغلاق">
          <X size={18} />
        </button>

        <div className="bsf-header">
          <Store size={22} />
          <h3 className="bsf-title">أنشئ متجرك الآن</h3>
        </div>
        <p className="bsf-subtitle">
          عبّي بيانات متجرك، وبتقدر تبدأ تبيع فوراً وتنتقل بين وضع المشتري والبائع بأي وقت.
        </p>

        <div className="bsf-field">
          <label htmlFor="storeName">اسم المتجر *</label>
          <input
            id="storeName"
            name="storeName"
            value={form.storeName}
            onChange={handleChange}
            placeholder="مثال: متجر أبو علاء"
            className={errors.storeName ? "bsf-input-error" : ""}
            disabled={isBecomingSeller}
          />
          {errors.storeName && <p className="bsf-field-error">{errors.storeName}</p>}
        </div>

        <div className="bsf-field">
          <label htmlFor="storeDescription">وصف المتجر</label>
          <textarea
            id="storeDescription"
            name="storeDescription"
            rows={3}
            value={form.storeDescription}
            onChange={handleChange}
            placeholder="اكتب وصفاً مختصراً عن منتجاتك ومتجرك"
            disabled={isBecomingSeller}
          />
        </div>

        {errors.general && <div className="bsf-general-error">{errors.general}</div>}
        {success && <div className="bsf-success">تم تفعيل متجرك بنجاح، جاري تحويلك...</div>}

        <div className="bsf-actions">
          <button type="button" className="bsf-cancel-btn" onClick={onClose} disabled={isBecomingSeller}>
            إلغاء
          </button>
          <button type="submit" className="bsf-submit-btn" disabled={isBecomingSeller}>
            {isBecomingSeller ? "جاري الإنشاء..." : "تفعيل المتجر"}
          </button>
        </div>
      </form>
    </div>
  );
}