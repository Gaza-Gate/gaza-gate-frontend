import { useState, useEffect, useRef } from "react";
import "./ChangePassword.css";
import { validatePassword, validateConfirmPassword } from "../utils/validators";
import { changePassword } from "../services/authService";

// ── Icons ──
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#9ca3af" strokeWidth="1.8">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

const TipsIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#f97316" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const EyeIcon = ({ open }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9ca3af" strokeWidth="2">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Password field ──
function PasswordField({ label, name, value, onChange, showPass, onToggle, error }) {
  return (
    <div className="cp-field">
      <label>{label} *</label>
      <div className="cp-input-wrap">
        <input
          type={showPass ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder="••••••••"
          className={error ? "cp-input-error" : ""}
        />
        <button type="button" className="cp-eye" onClick={onToggle}>
          <EyeIcon open={showPass} />
        </button>
      </div>
      {error && <p className="cp-field-error">{error}</p>}
    </div>
  );
}

// ── Main Modal ──
export default function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [show, setShow] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  // مراجع للـ timeouts عشان ننضفهم لما الكومبوننت يتفكك (يمنع أخطاء "setState on unmounted component")
  const hideTimeoutRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSuccess("");
  };

  const toggleShow = (field) =>
    setShow((prev) => ({ ...prev, [field]: !prev[field] }));

  const validate = () => {
    const errs = {};
    if (!form.currentPassword) errs.currentPassword = "كلمة المرور الحالية مطلوبة";
    const newErr = validatePassword(form.newPassword);
    if (newErr) errs.newPassword = newErr;
    const confirmErr = validateConfirmPassword(form.newPassword, form.confirmPassword);
    if (confirmErr) errs.confirmPassword = confirmErr;
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setSuccess("");
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });

      setSuccess("تم تحديث كلمة المرور بنجاح");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });

      // إخفاء رسالة النجاح بعد 3 ثواني (لو المودال ضل مفتوح لأي سبب)
      hideTimeoutRef.current = setTimeout(() => {
        setSuccess("");
      }, 3000);

      // إغلاق المودال تلقائياً بعد ظهور رسالة النجاح
      closeTimeoutRef.current = setTimeout(() => {
        onClose();
      }, 1800);

    } catch (err) {
      const backendMsg = err?.response?.data?.data?.message
        || err?.response?.data?.message
        || "حدث خطأ أثناء تحديث كلمة المرور";
      setErrors({ general: backendMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-modal-overlay" onClick={onClose}>
      <div className="cp-modal-box" onClick={(e) => e.stopPropagation()}>

        {/* زر الإغلاق */}
        <button type="button" className="cp-modal-close" onClick={onClose} aria-label="إغلاق">
          <CloseIcon />
        </button>

        {/* Header */}
        <div className="cp-page-header">
          <div className="cp-shield-icon">
            <ShieldIcon />
          </div>
          <h1>تغيير كلمة المرور</h1>
          <p>قم بتحديث كلمة المرور الخاصة بك بشكل آمن</p>
        </div>

        {/* Tips */}
        <div className="cp-tips">
          <div className="cp-tips-title">
            <TipsIcon />
            نصائح لكلمة مرور قوية:
          </div>
          <ul>
            <li>• استخدم 6 أحرف على الأقل</li>
            <li>• اجمع بين الأحرف والأرقام والرموز</li>
            <li>• تجنب استخدام معلومات شخصية واضحة</li>
            <li>• لا تشارك كلمة المرور مع أي شخص</li>
          </ul>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>

          <div className="cp-fields-card">
            <PasswordField
              label="كلمة المرور الحالية"
              name="currentPassword"
              value={form.currentPassword}
              onChange={handleChange}
              showPass={show.currentPassword}
              onToggle={() => toggleShow("currentPassword")}
              error={errors.currentPassword}
            />
            <PasswordField
              label="كلمة المرور الجديدة"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              showPass={show.newPassword}
              onToggle={() => toggleShow("newPassword")}
              error={errors.newPassword}
            />
            <PasswordField
              label="تأكيد كلمة المرور"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              showPass={show.confirmPassword}
              onToggle={() => toggleShow("confirmPassword")}
              error={errors.confirmPassword}
            />
          </div>

          {errors.general && <div className="cp-error">{errors.general}</div>}
          {success && (
            <div className="cp-success">
              <CheckIcon />
              {success}
            </div>
          )}

          <div className="cp-actions">
            <button type="submit" className="cp-btn-submit" disabled={loading}>
              {loading ? <span className="cp-spinner" /> : <LockIcon />}
              {loading ? "جاري التحديث..." : "تحديث كلمة المرور"}
            </button>
            <button type="button" className="cp-btn-cancel" onClick={onClose}>
              إلغاء
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}