// src/components/RequireCustomer.jsx
//
// حارس لطرق المشتري (نمط nested routes مع React Router v6).
//
//   - ما في session → يوجّه لـ /login/customer
//   - مسجل دخول ووضعه "seller" + عنده customer profile
//     → يعمل auto-switch لـ customer mode (الـ RoleSwitchOverlay العالمي بيعرض)
//   - مسجل دخول ووضعه "seller" + ما عندوش customer profile
//     → يوجّه لـ /seller/dashboard
//   - مسجل دخول بوضع "customer" → يعرض الـ child route عبر <Outlet />
//
// ✅ السلوك الجديد:
//   - ما في صفحات بيضاء فاضية أبداً — أي حالة (bootstrap / switching /
//     waiting) بتعرض <FullPageLoading /> موحّد بهوية المشروع (كحلي + برتقالي).
//   - الـ navigation decisions ما بتنفّذ إلا لما الـ state يكون "stable":
//     * isSwitchingRole || isBecomingCustomer || isBecomingSeller = true
//       → الـ guard بيرجّع <FullPageLoading /> وما يقرر شي (الـ Overlay
//         يعرض فوق الـ Outlet الجديد بعد ما يخلص).
//     * الـ user role الجديد ينعكس على الـ React state قبل ما أي navigate
//       يصير (atomic via flushStateUpdates() في الـ switchRole).
//   - بنستخدم الـ pendingNavigation من الـ context كـ fallback لو
//     الـ caller (مثلاً SwitchRoleButton) نسي يعمل navigate.

import { useEffect, useRef } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { Loader2, ShoppingBag } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./RequireCustomer.css";

/**
 * ✅ شاشة تحميل كاملة موحّدة
 * - z-index أقل من الـ RoleSwitchOverlay (اللي بـ 9999)
 *   حتى لو الاثنين ظاهرين بنفس الوقت، الـ Overlay بيكون فوق.
 * - mobile-friendly، بدون layout shift.
 * - ألوان المشروع: كحلي + برتقالي.
 */
function FullPageLoading({ label = "جاري التحقق من الجلسة…" }) {
  return (
    <div className="rc-loading" role="status" aria-live="polite" dir="rtl">
      <div className="rc-loading__inner">
        <div className="rc-loading__icon" aria-hidden="true">
          <ShoppingBag size={26} strokeWidth={2.2} />
          <span className="rc-loading__ring">
            <Loader2 size={42} className="rc-loading__spinner" />
          </span>
        </div>
        <p className="rc-loading__label">{label}</p>
        <div className="rc-loading__bar" aria-hidden="true">
          <div className="rc-loading__bar-fill" />
        </div>
      </div>
    </div>
  );
}

export default function RequireCustomer() {
  const {
    isAuthenticated,
    hasCustomerProfile,
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
  // ✅ بنمنع تكرار المحاولة إذا الـ switch فشل
  const autoSwitchRanRef = useRef(false);

  // ✅ Auto-switch: لو المستخدم وضعه "seller" وعنده customer profile،
  //    بدّل الـ role لـ customer تلقائياً.
  useEffect(() => {
    // ❌ بنمنع الـ auto-switch لو في تبديل جارٍ — بيتجنّب race conditions
    if (isBootstrapping) return;
    if (!isAuthenticated) return;
    if (currentRole !== "seller") return;
    if (hasCustomerProfile === false) return;
    if (autoSwitchRanRef.current) return;
    if (isSwitchingRole || isBecomingCustomer || isBecomingSeller) return;

    autoSwitchRanRef.current = true;

    switchRole("customer").catch((err) => {
      // ✅ بنرجّع الـ ref عشان المستخدم يقدر يحاول مرة ثانية
      autoSwitchRanRef.current = false;
      console.warn(
        "[RequireCustomer] auto-switch to customer failed:",
        err?.message
      );
    });
  }, [
    isBootstrapping,
    isAuthenticated,
    currentRole,
    hasCustomerProfile,
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
  //    الـ state رح يلتقط بعد قليل (atomic via flushStateUpdates)
  //    والـ Outlet بيظهر تلقائياً لما currentRole يصير "customer".
  //    لو في pendingNavigation (يعني caller بنى ناوي يعمل navigate)
  //    → بنعمل navigate فوراً.
  if (isSwitchingRole || isBecomingCustomer || isBecomingSeller) {
    if (pendingNavigation && switchingToRole === "customer") {
      return <Navigate to={pendingNavigation} replace />;
    }
    return (
      <FullPageLoading
        label={
          switchingToRole === "customer"
            ? "جاري التحويل لوضع المشتري…"
            : switchingToRole === "seller"
            ? "جاري التحويل لوضع البائع…"
            : "جاري تحديث الجلسة…"
        }
      />
    );
  }

  // ── 4) وضعه seller + عنده customer profile → انتظر الـ auto-switch
  //    بنعرض loading موحّد بدل null (يتجنّب أي وميض أو layout shift)
  if (currentRole === "seller" && hasCustomerProfile !== false) {
    return (
      <FullPageLoading label="جاري التحويل لوضع المشتري…" />
    );
  }

  // ── 5) وضعه seller + ما عندوش customer profile → ودّيه للـ seller dashboard
  if (currentRole === "seller" && hasCustomerProfile === false) {
    return <Navigate to="/seller/dashboard" replace />;
  }

  // ── 6) صرّح الباك إنه ما عندوش customer profile
  if (hasCustomerProfile === false) {
    return (
      <Navigate
        to="/login/customer"
        state={{ from: location.pathname, reason: "no_customer_profile" }}
        replace
      />
    );
  }

  // ✅ Outlet هو اللي بيعرض الـ child route (CustomerLayout + باقي الصفحات)
  return <Outlet />;
}
