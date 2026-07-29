// src/pages/ConvertToSeller.jsx
//
// صفحة "إنشاء المتجر" — تظهر لمستخدم customer ما عندوش seller profile
// للحظة إنشائه الأولى (one-time-only).
//
// الـ flow:
//   1) user يدخل storeName + storeDescription
//   2) ConvertToSeller → useAuth().becomeSeller(form)
//   3) AuthContext.becomeSeller → roleService.submitBecomeSeller
//      → POST /api/auth/become-seller
//   4) عند النجاح:
//      - AuthContext يحدّث user + currentRole + localStorage فوراً
//      - Navbar يعمل re-render ويعرض روابط البائع
//      - الصفحة تعمل navigate("/seller/dashboard")
//   5) عند الفشل: رسالة واضحة + form يبقى قابل للتعديل
//
// ✅ Four states معروضة بوضوح:
//   - idle      → form قابل للتعديل
//   - submitting → loading spinner + form معطّل
//   - success   → checkmark كبير + "جاري التحويل..."
//   - error     → banner أحمر + رسالة الخطأ

import { useState, useEffect, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Store,
} from "lucide-react";
import {
  validateStoreName,
  validateStoreDescription,
} from "../utils/validators";
import { useAuth } from "../context/AuthContext";
import { connectSocket, disconnectSocket } from "../utils/socket";
import "./ConvertToSeller.css";

const SUCCESS_DELAY_MS = 900;
const CONFLICT_REDIRECT_MS = 800;
const UNAUTHORIZED_REDIRECT_MS = 1200;

/**
 * استخراج رسالة الخطأ من الرد.
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

export default function ConvertToSeller() {
  const navigate = useNavigate();
  const { becomeSeller, hasSellerProfile, isAuthenticated, logout } = useAuth();

  const [form, setForm] = useState({
    storeName: "",
    storeDescription: "",
  });
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState("idle"); // idle | submitting | success
  const [apiError, setApiError] = useState("");
  const inputRef = useRef(null);
  // ✅ بنمنع الإرسال المتكرر (double-click أو re-render)
  const submitLockRef = useRef(false);

  /* ── Auto-focus on mount ── */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // لو ما في session → نرجّع للـ login
  if (isAuthenticated === false) {
    return <Navigate to="/login/customer" replace />;
  }

  /* ── One-time-only guard: لو عنده متجر بالفعل → لوحة البائع ── */
  if (hasSellerProfile) {
    return <Navigate to="/seller/dashboard" replace />;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (apiError) setApiError("");
  }

  function validate() {
    const errs = {};
    const storeNameErr = validateStoreName(form.storeName);
    if (storeNameErr) errs.storeName = storeNameErr;
    const descErr = validateStoreDescription(form.storeDescription);
    if (descErr) errs.storeDescription = descErr;
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // ✅ Lock: بنمنع أي محاولة ثانية حتى تنتهي هاي المحاولة
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
      const result = await becomeSeller({
        storeName: form.storeName.trim(),
        storeDescription: form.storeDescription.trim(),
      });

      // (اختياري) reconnect socket لو الباك طلب ذلك
      if (result?.reconnectSocket) {
        try {
          disconnectSocket();
          connectSocket();
        } catch {
          /* socket غير متاح — بنتجاهل */
        }
      }

      // ── Phase 2: success ──
      setPhase("success");
      setTimeout(() => navigate("/seller/dashboard", { replace: true }), SUCCESS_DELAY_MS);
    } catch (err) {
      // ── Phase 3: error handling ──
      const status = err?.response?.status;

      if (status === 409) {
        // الباك يقول "Already a seller" — state محلي قديم، نحوّل مباشرة
        setApiError("لديك متجر بالفعل. جاري التحويل للوحة البائع...");
        setTimeout(
          () => navigate("/seller/dashboard", { replace: true }),
          CONFLICT_REDIRECT_MS
        );
        return;
      }

      if (status === 401) {
        // التوكن منتهي (الـ interceptor ما قدر يعمل refresh) → بنطلّعه للـ login
        setApiError("انتهت جلستك. جاري تحويلك لصفحة تسجيل الدخول...");
        setTimeout(() => {
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

  const submitting = phase === "submitting";
  const success = phase === "success";

  return (
    <div className="cts-root" dir="rtl">
      <div className="cts-wrapper">
        <p className="cts-breadcrumb">انشاء حساب بائع</p>
        <h1 className="cts-title">معلومات المتجر</h1>

        {success ? (
          /* ── Success state ── */
          <div className="cts-card cts-success-state" role="status" aria-live="polite">
            <div className="cts-success-icon-wrap">
              <CheckCircle2 size={64} className="cts-success-icon" />
            </div>
            <h2 className="cts-success-title">تم تفعيل متجرك بنجاح!</h2>
            <p className="cts-success-text">
              {form.storeName} — جاري تحويلك للوحة البائع...
            </p>
            <Loader2 size={20} className="cts-spinner" />
          </div>
        ) : (
          <form className="cts-card" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
            <div className="cts-field">
              <label htmlFor="cts-storeName">
                اسم المتجر <span className="cts-required">*</span>
              </label>
              <input
                id="cts-storeName"
                ref={inputRef}
                name="storeName"
                type="text"
                value={form.storeName}
                onChange={handleChange}
                placeholder="مثال: متجر فوكس"
                className={errors.storeName ? "cts-input-error" : ""}
                disabled={submitting}
                maxLength={100}
                aria-invalid={!!errors.storeName}
                aria-describedby={errors.storeName ? "cts-storeName-err" : undefined}
              />
              {errors.storeName && (
                <p id="cts-storeName-err" className="cts-error" role="alert">
                  {errors.storeName}
                </p>
              )}
            </div>

            <div className="cts-field">
              <label htmlFor="cts-storeDescription">وصف المتجر</label>
              <textarea
                id="cts-storeDescription"
                name="storeDescription"
                rows={3}
                value={form.storeDescription}
                onChange={handleChange}
                placeholder="اكتب وصفاً مختصراً لمتجرك"
                className={errors.storeDescription ? "cts-input-error" : ""}
                disabled={submitting}
                maxLength={500}
                aria-invalid={!!errors.storeDescription}
              />
              {errors.storeDescription && (
                <p className="cts-error" role="alert">
                  {errors.storeDescription}
                </p>
              )}
            </div>

            {apiError && (
              <div className="cts-api-error" role="alert">
                <AlertCircle size={16} />
                <span>{apiError}</span>
              </div>
            )}

            <button type="submit" className="cts-btn-submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={16} className="cts-spinner cts-spinner--inline" />
                  جاري التفعيل...
                </>
              ) : (
                <>
                  <Store size={16} />
                  تفعيل المتجر
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
