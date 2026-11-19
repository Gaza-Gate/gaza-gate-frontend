// src/components/RequireSeller.jsx
//
// حارس لطرق البائع (نمط nested routes مع React Router v6).
//
//   - ما في session → يوجّه لـ /login/customer
//   - مسجل دخول بوضع "customer" + عنده seller profile
//     → يعمل auto-switch لـ seller mode (الـ RoleSwitchOverlay العالمي بيعرض)
//   - مسجل دخول بوضع "customer" + ما عندوش seller profile
//     → يوجّه لـ /customer/become-seller
//   - عنده متجر + وضعه "seller" → يعرض <Outlet />
//
// ✅ السلوك الجديد:
//   - ما في صفحات بيضاء فاضية أبداً — أي حالة (bootstrap / switching /
//     waiting) بتعرض <FullPageLoading /> موحّد بهوية المشروع (كحلي + برتقالي).
//   - الـ navigation decisions ما بتنفّذ إلا لما الـ state يكون "stable".
//   - بنستخدم الـ pendingNavigation من الـ context كـ fallback.

import { useEffect, useRef } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./RequireSeller.css";

/**
 * ✅ شاشة تحميل كاملة موحّدة
 * - z-index أقل من الـ RoleSwitchOverlay (اللي بـ 9999)
 *   حتى لو الاثنين ظاهرين بنفس الوقت، الـ Overlay بيكون فوق.
 * - mobile-friendly، بدون layout shift.
 * - ألوان المشروع: كحلي + برتقالي (نفس هوية RequireCustomer).
 */
function FullPageLoading({ label = "جاري التحقق من الجلسة…" }) {
  return (
    <div className="rs-loading" role="status" aria-live="polite" dir="rtl">
      <div className="rs-loading__inner">
        <div className="rs-loading__icon" aria-hidden="true">
          <ShieldCheck size={26} strokeWidth={2.2} />
          <span className="rs-loading__ring">
            <Loader2 size={42} className="rs-loading__spinner" />
          </span>
        </div>
        <p className="rs-loading__label">{label}</p>
        <div className="rs-loading__bar" aria-hidden="true">
          <div className="rs-loading__bar-fill" />
        </div>
      </div>
    </div>
  );
}

export default function RequireSeller() {
  const {
    isAuthenticated,
    hasSellerProfile,
    isBootstrapping,
    currentRole,
    isSwitchingRole,
    switchingToRole,
    isBecomingCustomer,
    isBecomingSeller,
    pendingNavigation,
    switchRole,
  } = useAuth();
  const location = useLocation();
  const autoSwitchRanRef = useRef(false);

  // ✅ Auto-switch: لو المستخدم وضعه "customer" وعنده seller profile،
  //    بدّل لـ seller mode تلقائياً.
  useEffect(() => {
    if (isBootstrapping) return;
    if (!isAuthenticated) return;
    if (currentRole !== "customer") return;
    if (!hasSellerProfile) return;
    if (autoSwitchRanRef.current) return;
    // ❌ بنمنع الـ auto-switch لو في تبديل جارٍ
    if (isSwitchingRole || isBecomingCustomer || isBecomingSeller) return;

    autoSwitchRanRef.current = true;

    switchRole("seller").catch((err) => {
      autoSwitchRanRef.current = false;
      console.warn(
        "[RequireSeller] auto-switch to seller failed:",
        err?.message
      );
    });
  }, [
    isBootstrapping,
    isAuthenticated,
    currentRole,
    hasSellerProfile,
    isSwitchingRole,
    isBecomingCustomer,
    isBecomingSeller,
    switchRole,
  ]);

  // ── 1) bootstrap loading ──
  if (isBootstrapping) {
    return <FullPageLoading label="جاري التحقق من الجلسة…" />;
  }

  // ── 2) مش مسجل → login ──
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login/customer"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // ── 3) في عملية تبديل (atomic) → ما نقرر شي، نعرض loading.
  if (isSwitchingRole || isBecomingCustomer || isBecomingSeller) {
    if (pendingNavigation && switchingToRole === "seller") {
      return <Navigate to={pendingNavigation} replace />;
    }
    return (
      <FullPageLoading
        label={
          switchingToRole === "seller"
            ? "جاري التحويل لوضع البائع…"
            : switchingToRole === "customer"
            ? "جاري التحويل لوضع المشتري…"
            : "جاري تحديث الجلسة…"
        }
      />
    );
  }

  // ── 4) وضعه customer + عنده seller profile → استنى الـ auto-switch
  if (currentRole === "customer" && hasSellerProfile) {
    return <FullPageLoading label="جاري التحويل لوضع البائع…" />;
  }

  // ── 5) وضعه customer + ما عندوش seller profile → ودّيه لإنشاء المتجر
  if (currentRole === "customer" && !hasSellerProfile) {
    return (
      <Navigate
        to="/customer/become-seller"
        state={{ from: location.pathname, reason: "no_seller_profile" }}
        replace
      />
    );
  }

  // ── 6) وضعه seller بس ما عندوش seller profile (حالة غريبة) → login
  if (currentRole === "seller" && !hasSellerProfile) {
    return (
      <Navigate
        to="/login/customer"
        state={{ from: location.pathname, reason: "no_seller_profile" }}
        replace
      />
    );
  }

  // ✅ Outlet هو اللي بيعرض الـ child route
  return <Outlet />;
}
