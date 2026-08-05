// src/components/RequireAdmin.jsx
//
// حارس لطرق لوحة تحكم الأدمن (نمط nested routes مع React Router v6).
//
//   - ما في session → يوجّه لـ /login/customer
//   - مسجل دخول + الدور "admin" (أو الـ isAdmin flag = true) → يعرض <Outlet />
//   - مسجل دخول + مش admin → يوجّه للـ home (حسب الدور الحالي)
//
// ⚠️ التوثيق:
//    - مثل RequireCustomer/RequireSeller، لازم نستخدم <Outlet /> مع nested routes
//    - الـ API endpoints الخاصة بالأدمن محمية على السيرفر بـ admin role check
//      (الباك بيرجّع 403 لو ما عندوش صلاحية)
//    - الـ frontend role check هنا هو خط دفاع أول فقط — لازم يكون السيرفر هو
//      الـ source of truth
//
// TODO (optional): لو الـ user object ما فيه isAdmin flag، نعمل API call
//                  لـ /admin/profile عند mount عشان نتأكد من الـ role.

import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * يتحقق إذا المستخدم عنده صلاحية أدمن
 * بنقبل أي من:
 *   1) user.role === "admin"
 *   2) user.isAdmin === true
 *   3) user.role === "super_admin" (احتياط)
 */
function isAdminUser(user) {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  if (user.role === "admin" || user.role === "super_admin") return true;
  return false;
}

/**
 * يحدد الصفحة الرئيسية حسب الدور الحالي للمستخدم
 */
function getHomeForRole(user) {
  if (user?.role === "seller" || user?.hasSellerProfile) {
    return "/seller/dashboard";
  }
  return "/home/customer";
}

export default function RequireAdmin() {
  const { isAuthenticated, user, isBootstrapping } = useAuth();
  const location = useLocation();

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
        state={{ from: location.pathname, reason: "admin_requires_login" }}
        replace
      />
    );
  }

  // ── 3) مسجل دخول + مش admin → وجهه للـ home تبع دوره ──
  if (!isAdminUser(user)) {
    return <Navigate to={getHomeForRole(user)} replace />;
  }

  // ✅ Outlet هو اللي بيعرض الـ child route
  return <Outlet />;
}
