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
// ⚠️ تم إزالة شاشات الانتظار القديمة ("جاري التحويل لوضع المشتري...").
//    الـ RoleSwitchOverlay (المستضاف في App.jsx) هو شاشة الانتظار الوحيدة
//    المعتمدة — تظهر تلقائياً لما AuthContext.isSwitchingRole=true.
//
// ⚠️ لازم نستخدم <Outlet /> مش `children` prop مع نمط nested routes.

import { useEffect, useRef } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./RequireSeller.css";

export default function RequireCustomer() {
  const {
    isAuthenticated,
    hasCustomerProfile,
    isBootstrapping,
    currentRole,
    switchRole,
  } = useAuth();
  const location = useLocation();
  // ✅ بنمنع تكرار المحاولة إذا الـ switch فشل
  const autoSwitchRanRef = useRef(false);

  // ✅ Auto-switch: لو المستخدم وضعه "seller" وعنده customer profile،
  //    بدّل الـ role لـ customer تلقائياً.
  //    أثناء الانتظار: نرجّع null (الـ RoleSwitchOverlay العالمي بيعرض بصرياً).
  useEffect(() => {
    if (isBootstrapping) return;
    if (!isAuthenticated) return;
    if (currentRole !== "seller") return;
    if (hasCustomerProfile === false) return;
    if (autoSwitchRanRef.current) return;

    autoSwitchRanRef.current = true;

    switchRole("customer")
      .then(async (result) => {
        if (result?.reconnectSocket) {
          try {
            const { connectSocket, disconnectSocket } = await import(
              "../utils/socket"
            );
            disconnectSocket();
            connectSocket();
          } catch {
            /* socket not available */
          }
        }
        // الـ state تغيّر، الـ render رح يعيد التقييم ويعرض Outlet
      })
      .catch((err) => {
        console.warn(
          "[RequireCustomer] auto-switch to customer فشل:",
          err?.message
        );
        // ❌ ما بنعرض "تعذّر التبديل" inline — الـ RoleSwitchOverlay فقط
        //    إذا الـ switch فشل فعلاً، الـ Outlet مش رح يظهر لأن
        //    currentRole لسا "seller" — رح يبقى الـ overlay ظاهر
        //    (أو المستخدم يقدر يروح يدوياً)
      });
  }, [
    isBootstrapping,
    isAuthenticated,
    currentRole,
    hasCustomerProfile,
    switchRole,
  ]);

  // ── 1) bootstrap loading ──
  if (isBootstrapping) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6B7280",
          fontFamily: "Tajawal, sans-serif",
        }}
        dir="rtl"
      >
        <span>جاري التحقق من الجلسة...</span>
      </div>
    );
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

  // ── 3) وضعه seller + عنده customer profile → انتظر الـ auto-switch
  //    ✅ ما بنعرض أي شاشة انتظار محلية — الـ RoleSwitchOverlay العالمي هو المسؤول الوحيد
  if (currentRole === "seller" && hasCustomerProfile !== false) {
    return null;
  }

  // ── 4) وضعه seller + ما عندوش customer profile → ودّيه للـ seller dashboard ──
  if (currentRole === "seller" && hasCustomerProfile === false) {
    return <Navigate to="/seller/dashboard" replace />;
  }

  // ── 5) صرّح الباك إنه ما عندوش customer profile ──
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
