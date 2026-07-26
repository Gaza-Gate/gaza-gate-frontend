// src/components/SwitchRoleButton.jsx
//
// زر تبديل الدور — بياخذ القرار الذكي بناءً على user.hasSellerProfile
// و user.hasCustomerProfile من AuthContext (بدون fetch إضافي).
//
//   customer → seller:
//     ✅ hasSellerProfile === true  → POST /api/auth/switch-role
//        (الباك بيرجّع accessToken + user محدّث، منمررهم لـ login() فوراً)
//     ❌ hasSellerProfile === false → navigate("/customer/become-seller")
//        (ما نستدعي switch-role لأنه رح يرجّع 409 —
//         بدالها نوجّهه لصفحة إنشاء المتجر مرة واحدة فقط)
//
//   seller → customer:
//     ✅ hasCustomerProfile === true  → POST /api/auth/switch-role
//     ❌ hasCustomerProfile === false → POST /api/auth/become-customer
//        (حالة نادرة، بس الـ smart logic يغطيها)
//
// ✅ 409 Fallback:
//    لو لأي سبب الباك رجّع 409 (مثلاً state محلي قديم) → نصلّح
//    hasSellerProfile=true في الـ context و localStorage فوراً،
//    ونوجّه المستخدم على لوحة البائع بدون error.
//
// في كل الحالات: بعد ما الـ API يرجع 200، منمرّر user + accessToken
// لـ login() في AuthContext → الـ React state و localStorage ينحدّثوا
// في نفس اللحظة، والـ UI يتفاعل بدون reload.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import "./SwitchRoleButton.css";

function extractSwitchPayload(res) {
  // الباك بيرجّع { status, data: { accessToken, user, reconnectSocket } }
  const payload = res?.data?.data ?? res?.data ?? {};
  return {
    accessToken: payload.accessToken,
    user: payload.user,
    reconnectSocket: payload.reconnectSocket,
  };
}

export default function SwitchRoleButton() {
  const { user, currentRole, login } = useAuth();
  const navigate = useNavigate();
  const [localError, setLocalError] = useState("");
  const [busy, setBusy] = useState(false);

  const isSeller = currentRole === "seller";
  const targetRole = isSeller ? "customer" : "seller";
  const label = isSeller ? "التحويل لوضع المشتري" : "التحويل لوضع البائع";

  // ✅ 409 fallback helper — يصلّح state محلي قديم ويرجّع للوحة البائع
  function recoverFrom409AlreadySeller() {
    const existingToken = localStorage.getItem("token");
    const fixedUser = {
      ...(user ?? {}),
      hasSellerProfile: true,
    };
    if (existingToken) {
      login({ user: fixedUser, accessToken: existingToken });
    }
    navigate("/seller/dashboard", { replace: true });
  }

  async function handleClick() {
    setLocalError("");

    // ─── 1) Smart gate: customer → seller بدون متجر ───
    if (targetRole === "seller" && !user?.hasSellerProfile) {
      // ❌ ما عندوش متجر → روح لصفحة "إنشاء المتجر" (once-only)
      navigate("/customer/become-seller");
      return;
    }

    // ─── 2) Smart gate: seller → customer بدون customer profile (نادر) ───
    if (targetRole === "customer" && !user?.hasCustomerProfile) {
      setBusy(true);
      try {
        const res = await api.post("/api/auth/become-customer");
        const { accessToken, user: newUser } = extractSwitchPayload(res);
        if (!accessToken || !newUser) {
          throw new Error("استجابة غير متوقعة من الخادم");
        }
        login({ user: newUser, accessToken });
        navigate("/home/customer");
      } catch (err) {
        setLocalError(
          err?.response?.data?.data?.message ||
            err?.response?.data?.message ||
            err.message ||
            "تعذّر التحويل لمشتري، حاول مرة أخرى"
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    // ─── 3) عنده الـ profile → POST /api/auth/switch-role ───
    setBusy(true);
    try {
      const res = await api.post("/api/auth/switch-role", { role: targetRole });
      const { accessToken, user: newUser, reconnectSocket } =
        extractSwitchPayload(res);

      if (!accessToken || !newUser) {
        throw new Error("استجابة غير متوقعة من الخادم");
      }

      // ✅ مرّر الرد الطازج للـ login() — React state و localStorage
      //    ينحدّثوا فوراً، وكل المكونات تالية على useAuth() بتعمل re-render
      login({ user: newUser, accessToken });

      // (اختياري) socket reconnect: لو الباك طلب إعادة الاتصال
      if (reconnectSocket) {
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
      // ✅ 409 fallback: الباك يقول "Already a seller" (state محلي قديم)
      if (err?.response?.status === 409 && targetRole === "seller") {
        recoverFrom409AlreadySeller();
        return;
      }
      setLocalError(
        err?.response?.data?.data?.message ||
          err?.response?.data?.message ||
          err.message ||
          "تعذّر تبديل الدور، حاول مرة أخرى"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="srb-wrapper">
      <button
        type="button"
        className={`srb-btn ${isSeller ? "srb-btn-to-buyer" : "srb-btn-to-seller"}`}
        onClick={handleClick}
        disabled={busy}
      >
        <ArrowLeftRight size={16} />
        {busy ? "جاري التبديل..." : label}
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
