// src/components/SwitchRoleButton.jsx
//
// زر تبديل الدور — بياخذ القرار الذكي بناءً على user.hasSellerProfile
// و user.hasCustomerProfile من AuthContext (بدون fetch إضافي).
//
//   customer → seller:
//     ✅ hasSellerProfile === true  → AuthContext.switchRole("seller")
//        (بيرجّع accessToken + user محدّث، منحدّث الـ state فوراً)
//     ❌ hasSellerProfile === false → navigate("/customer/become-seller")
//        (ما نستدعي switch-role لأنه رح يرجّع 409 —
//         بدالها نوجّهه لصفحة إنشاء المتجر مرة واحدة فقط)
//
//   seller → customer:
//     ✅ hasCustomerProfile === true  → AuthContext.switchRole("customer")
//     ❌ hasCustomerProfile === false → AuthContext.becomeCustomer()
//        (حالة نادرة، بس الـ smart logic يغطيها)
//
// ✅ كل الـ API calls بتتم عبر AuthContext — ممنوع نعمل api.post يدوياً
//    (عشان نضمن تحديث state بشكل consistent بدون race conditions).
//
// ✅ لا نص "جاري التبديل..." — الـ RoleSwitchOverlay العالمي هو المسؤول الوحيد
//    عن عرض حالة الانتظار، الزر بيظهر disabled فقط.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./SwitchRoleButton.css";

export default function SwitchRoleButton() {
  const {
    user,
    currentRole,
    hasSellerProfile,
    hasCustomerProfile,
    switchRole,
    becomeCustomer,
  } = useAuth();
  const navigate = useNavigate();
  const [localError, setLocalError] = useState("");

  const isSeller = currentRole === "seller";
  const targetRole = isSeller ? "customer" : "seller";
  const label = isSeller ? "التحويل لوضع المشتري" : "التحويل لوضع البائع";

  async function handleClick() {
    setLocalError("");

    // ─── 1) Smart gate: customer → seller بدون متجر ───
    if (targetRole === "seller" && !hasSellerProfile) {
      // ❌ ما عندوش متجر → روح لصفحة "إنشاء المتجر" (once-only)
      navigate("/customer/become-seller");
      return;
    }

    // ─── 2) Smart gate: seller → customer بدون customer profile (نادر) ───
    if (targetRole === "customer" && hasCustomerProfile === false) {
      try {
        await becomeCustomer();
        navigate("/home/customer");
      } catch (err) {
        setLocalError(
          err?.response?.data?.data?.message ||
            err?.response?.data?.message ||
            err.message ||
            "تعذّر التحويل لمشتري، حاول مرة أخرى"
        );
      }
      return;
    }

    // ─── 3) عنده الـ profile → AuthContext.switchRole ───
    try {
      const result = await switchRole(targetRole);

      // (اختياري) socket reconnect: لو الباك طلب إعادة الاتصال
      if (result?.reconnectSocket) {
        try {
          const { connectSocket, disconnectSocket } = await import(
            "../utils/socket"
          );
          disconnectSocket();
          connectSocket();
        } catch {
          /* socket ليس متاحاً دائماً، بنتجاهل الخطأ */
        }
      }

      navigate(targetRole === "seller" ? "/seller/dashboard" : "/home/customer");
    } catch (err) {
      setLocalError(
        err?.response?.data?.data?.message ||
          err?.response?.data?.message ||
          err.message ||
          "تعذّر تبديل الدور، حاول مرة أخرى"
      );
    }
  }

  // إخفاء الزر تماماً لو ما في user (defensive)
  if (!user) return null;

  return (
    <div className="srb-wrapper">
      <button
        type="button"
        className={`srb-btn ${isSeller ? "srb-btn-to-buyer" : "srb-btn-to-seller"}`}
        onClick={handleClick}
      >
        <ArrowLeftRight size={16} />
        {label}
      </button>
      {localError && (
        <p className="srb-error" role="alert">
          <AlertCircle size={14} />
          {localError}
        </p>
      )}
    </div>
  );
}
