// src/components/BecomeSellerForm.jsx
//
// فورم "كن بائعًا" — يظهر كـ modal لما المستخدم عنده customer profile
// بس ما عندوش seller profile (للمرة الأولى فقط).
//
// الـ flow:
//   1) user يفتح Modal من الـ Navbar
//   2) user يدخّل storeName + storeDescription
//   3) BecomeSellerForm → useAuth().becomeSeller(form)
//   4) AuthContext.becomeSeller → roleService.submitBecomeSeller
//      → POST /api/auth/become-seller
//   5) عند النجاح:
//      - AuthContext يحدّث user + currentRole + localStorage فوراً
//      - Navbar يعمل re-render ويعرض روابط البائع بدال زر "كن بائعًا"
//      - الـ modal يعمل navigate("/seller/dashboard")
//   6) عند الفشل: يعرض رسالة خطأ واضحة + يخلّي الـ form قابل للمحاولة
//
// ✅ Four states معروضة بوضوح:
//   - idle      → form قابل للتعديل
//   - submitting → loading spinner + تعطيل الـ form
//   - success   → checkmark كبير + "جاري التحويل..."
//   - error     → رسالة واضحة (validation أو API)

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Store, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  validateStoreName,
  validateStoreDescription,
} from "../utils/validators";
import "./BecomeSellerForm.css";

const SUCCESS_DELAY_MS = 900;
const CONFLICT_REDIRECT_MS = 800;
const UNAUTHORIZED_REDIRECT_MS = 1200;

/**
 * استخراج رسالة الخطأ من الرد.
 * الـ API بترجّع errors بالشكل:
 *   { status: "fail", data: { message: "..." } }          ← الباك
 *   { status: "fail", data: { errors: [{ field, message }] } }
 */
function getApiErrorMessage(err) {
  if (!err) return "حدث خطأ غير متوقع";
  return (
    err?.response?.data?.data?.message ||
    err?.response?.data?.message ||
    (Array.isArray(err?.response?.data?.data?.errors) &&
      err.response.data.data.errors
        .map((e) => e?.message)
        .filter(Boolean)
        .join(" · ")) ||
    err?.message ||
    "حدث خطأ غير متوقع"
  );
}

export default function BecomeSellerForm({ onClose }) {
  const {
    becomeSeller,
    isBecomingSeller,
    hasSellerProfile,
    logout,
  } = useAuth();
  const navigate = useNavigate();

  // ── Form state ──
  const [form, setForm] = useState({ storeName: "", storeDescription: "" });
  const [errors, setErrors] = useState({});

  // ── Phase machine: idle | submitting | success ──
  const [phase, setPhase] = useState("idle");
  const [apiError, setApiError] = useState("");

  const inputRef = useRef(null);
  // ✅ بنمنع الإرسال المتكرر
  const submitLockRef = useRef(false);

  /* ── Auto-focus first field on mount ── */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* ── Esc key closes modal (unless busy) ── */
  useEffect(() => {
    function onKey(e) {
      if (e.key !== "Escape") return;
      if (phase === "submitting" || phase === "success") return;
      onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, phase]);

  /* ── Safety: if user is already a seller, redirect away from this modal ── */
  useEffect(() => {
    if (hasSellerProfile && phase !== "success") {
      onClose?.();
      navigate("/seller/dashboard", { replace: true });
    }
  }, [hasSellerProfile, onClose, navigate, phase]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error as the user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (apiError) setApiError("");
  }

  function validate() {
    const errs = {};
    const nameErr = validateStoreName(form.storeName);
    if (nameErr) errs.storeName = nameErr;
    const descErr = validateStoreDescription(form.storeDescription);
    if (descErr) errs.storeDescription = descErr;
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // ✅ Lock: بنمنع أي محاولة ثانية
    if (submitLockRef.current) return;
    if (phase !== "idle") return;

    // ── Phase 1: client-side validation ──
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    submitLockRef.current = true;
    setPhase("submitting");
    setErrors({});
    setApiError("");

    try {
      // ✅ API call → AuthContext updates state فوراً (user + currentRole)
      //    والـ Navbar بيعمل re-render تلقائياً بدون page reload
      await becomeSeller({
        storeName: form.storeName.trim(),
        storeDescription: form.storeDescription.trim(),
      });

      // ── Phase 2: success ──
      setPhase("success");
      setTimeout(() => {
        onClose?.();
        navigate("/seller/dashboard", { replace: true });
      }, SUCCESS_DELAY_MS);
    } catch (err) {
      // ── Phase 3: error handling ──
      const status = err?.response?.status;

      if (status === 409) {
        // الباك يقول "Already a seller" — state محلي قديم. نثق بالباك ونحوّل
        setApiError("لديك متجر بالفعل. جاري التحويل للوحة البائع...");
        setTimeout(() => {
          onClose?.();
          navigate("/seller/dashboard", { replace: true });
        }, CONFLICT_REDIRECT_MS);
        return;
      }

      if (status === 401) {
        // التوكن منتهي → بنطلّعه للـ login بدل ما نخليه بصفحة معطّلة
        setApiError("انتهت جلستك. جاري تحويلك لصفحة تسجيل الدخول...");
        setTimeout(() => {
          onClose?.();
          logout();
          navigate("/login/customer", { replace: true });
        }, UNAUTHORIZED_REDIRECT_MS);
        return;
      } else if (status === 403) {
        setApiError("ليس لديك صلاحية لإنشاء متجر. تحقق من حسابك.");
      } else if (status >= 500) {
        setApiError("خطأ في الخادم. حاول مرة أخرى بعد قليل.");
      } else if (err?.message === "Network Error") {
        setApiError("تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.");
      } else {
        setApiError(getApiErrorMessage(err));
      }

      setPhase("idle");
    } finally {
      submitLockRef.current = false;
    }
  }

  const submitting = phase === "submitting" || isBecomingSeller;
  const success = phase === "success";

  return (
    <div
      className="bsf-overlay"
      onClick={success ? undefined : submitting ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bsf-title"
    >
      <form
        className="bsf-card"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        noValidate
        aria-busy={submitting}
      >
        <button
          type="button"
          className="bsf-close-btn"
          onClick={onClose}
          aria-label="إغلاق"
          disabled={submitting || success}
        >
          <X size={18} />
        </button>

        {success ? (
          /* ── Success state ── */
          <div className="bsf-success-state" role="status" aria-live="polite">
            <div className="bsf-success-icon-wrap">
              <CheckCircle2 size={56} className="bsf-success-icon" />
            </div>
            <h3 className="bsf-success-title">تم تفعيل متجرك بنجاح!</h3>
            <p className="bsf-success-text">جاري تحويلك للوحة البائع...</p>
            <Loader2 size={18} className="bsf-spinner bsf-spinner--inline" />
          </div>
        ) : (
          <>
            {/* ── Form header ── */}
            <div className="bsf-header">
              <Store size={22} />
              <h3 id="bsf-title" className="bsf-title">
                أنشئ متجرك الآن
              </h3>
            </div>
            <p className="bsf-subtitle">
              عبّي بيانات متجرك، وبتقدر تبدأ تبيع فوراً وتنتقل بين وضع المشتري
              والبائع بأي وقت.
            </p>

            {/* ── Fields ── */}
            <div className="bsf-field">
              <label htmlFor="bsf-storeName">
                اسم المتجر <span className="bsf-required">*</span>
              </label>
              <input
                id="bsf-storeName"
                ref={inputRef}
                name="storeName"
                type="text"
                value={form.storeName}
                onChange={handleChange}
                placeholder="مثال: متجر أبو علاء"
                className={errors.storeName ? "bsf-input-error" : ""}
                disabled={submitting}
                maxLength={100}
                aria-invalid={!!errors.storeName}
                aria-describedby={
                  errors.storeName ? "bsf-storeName-err" : undefined
                }
              />
              {errors.storeName && (
                <p
                  id="bsf-storeName-err"
                  className="bsf-field-error"
                  role="alert"
                >
                  {errors.storeName}
                </p>
              )}
            </div>

            <div className="bsf-field">
              <label htmlFor="bsf-storeDescription">وصف المتجر</label>
              <textarea
                id="bsf-storeDescription"
                name="storeDescription"
                rows={3}
                value={form.storeDescription}
                onChange={handleChange}
                placeholder="اكتب وصفاً مختصراً عن منتجاتك ومتجرك"
                className={errors.storeDescription ? "bsf-input-error" : ""}
                disabled={submitting}
                maxLength={500}
                aria-invalid={!!errors.storeDescription}
              />
              {errors.storeDescription && (
                <p className="bsf-field-error" role="alert">
                  {errors.storeDescription}
                </p>
              )}
            </div>

            {/* ── API error banner ── */}
            {apiError && (
              <div className="bsf-api-error" role="alert">
                <AlertCircle size={16} />
                <span>{apiError}</span>
              </div>
            )}

            {/* ── Actions ── */}
            <div className="bsf-actions">
              <button
                type="button"
                className="bsf-cancel-btn"
                onClick={onClose}
                disabled={submitting}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="bsf-submit-btn"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="bsf-spinner" />
                    جاري التفعيل...
                  </>
                ) : (
                  <>
                    <Store size={16} />
                    تفعيل المتجر
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
