// src/components/SwitchRoleButton.jsx
//
// زر تبديل الدور — بياخذ القرار الذكي بناءً على user.hasSellerProfile
// و user.hasCustomerProfile من AuthContext (بدون fetch إضافي).
//
//   customer → seller:
//     ✅ hasSellerProfile === true  → AuthContext.switchRoleAndNavigate("seller", navigate)
//        (atomic: state + tokens + socket → navigate)
//     ❌ hasSellerProfile === false → AuthContext.switchRoleAndNavigate("seller", navigate)
//        (فإذا الباك قبل الطلب، معناه المستخدم بائع فعلاً بس الـ state محلي قديم)
//        (وإذا رفض الطلب (404/403) → نحوّله لصفحة "كن بائعًا")
//
//   seller → customer:
//     ✅ hasCustomerProfile === true  → AuthContext.switchRoleAndNavigate("customer", navigate)
//     ❌ hasCustomerProfile === false → AuthContext.becomeCustomer()
//        (حالة نادرة، بس الـ smart logic يغطيها)
//
// ✅ كل الـ API calls بتتم عبر AuthContext — ممنوع نعمل api.post يدوياً
//    (عشان نضمن تحديث state بشكل consistent بدون race conditions).
//
// ✅ لا نص "جاري التبديل..." — الـ RoleSwitchOverlay العالمي هو المسؤول الوحيد
//    عن عرض حالة الانتظار، الزر بيظهر disabled فقط.
//
// 🔑 إصلاح الـ bug: قبل اتخاذ قرار الـ routing، بنعمل
//    "refresh-then-try" — أول شي بنحدّث الـ flags من الباك
//    (عشان نعالج الـ stale state بدون logout/login).
//    فإذا الباك يقول المستخدم عنده seller profile → نحوّله للوحة البائع.
//    وإذا ما عندوش → بنجرّب switch-role (الباك هو المرجع):
//      - نجح  → المستخدم بائع (state كان قديم فقط) → لوحة البائع
//      - فشل  → فعلاً ما عندوش متجر → كن بائعًا

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./SwitchRoleButton.css";

/**
 * ✅ يحدّد إذا الرد من الباك معناه "ما عندك الـ profile المطلوب"
 * (يعني المستخدم فعلاً مش بائع، مو بس state قديم).
 */
function isMissingProfileError(err) {
  const status = err?.response?.status;
  if (status === 404 || status === 403 || status === 409) return true;

  // 401 = التوكن منتهي — الـ interceptor رح يعالجه، بس كاحتياط بنعتبرها missing
  if (status === 401) return false;

  // فحص الـ error code/message
  const code = String(
    err?.response?.data?.code || err?.code || ""
  ).toUpperCase();
  if (
    code.includes("NO_SELLER") ||
    code.includes("SELLER_NOT_FOUND") ||
    code.includes("NO_PROFILE") ||
    code.includes("NOT_REGISTERED")
  ) {
    return true;
  }

  const message = String(
    err?.response?.data?.data?.message ||
      err?.response?.data?.message ||
      err?.message ||
      ""
  ).toLowerCase();
  return (
    message.includes("not a seller") ||
    message.includes("no seller profile") ||
    message.includes("seller profile not found") ||
    message.includes("not found") ||
    message.includes("غير موجود") ||
    message.includes("لا يملك متجر")
  );
}

export default function SwitchRoleButton() {
  const {
    user,
    currentRole,
    hasSellerProfile,
    hasCustomerProfile,
    switchRoleAndNavigate,
    becomeCustomer,
    syncProfileFlags,
    isSwitchingRole,
    isBecomingCustomer,
    isBecomingSeller,
  } = useAuth();
  const navigate = useNavigate();
  const [localError, setLocalError] = useState("");

  const isSeller = currentRole === "seller";
  const targetRole = isSeller ? "customer" : "seller";
  const label = isSeller ? "التحويل لوضع المشتري" : "التحويل لوضع البائع";
  const busy = isSwitchingRole || isBecomingCustomer || isBecomingSeller;

  async function handleClick() {
    setLocalError("");

    // ─── 1) Smart gate: customer → seller بدون متجر (مع حماية من stale state) ───
    if (targetRole === "seller" && !hasSellerProfile) {
      // ✅ أول شي: بنحدّث الـ flags من الباك (يعالج الـ stale state بدون logout/login).
      //    بنستخدم `syncProfileFlags` (مش refreshSession) لأنها ما بتلمس
      //    isBootstrapping — فحراس المسارات ما رح يعرضوا شاشة تحميل.
      let freshHasSellerProfile = false;
      try {
        const freshUser = await syncProfileFlags();
        freshHasSellerProfile = Boolean(freshUser?.hasSellerProfile);
      } catch (refreshErr) {
        // إذا الـ sync فشل (شبكة/توكن منتهي...) → بنكمّل بالـ try fallback
        console.warn(
          "[SwitchRoleButton] syncProfileFlags فشل، بنكمّل بالـ try:",
          refreshErr?.message
        );
      }

      // ✅ ثانياً: حتى لو الـ refresh ما أكّد، الباك هو المرجع
      //    فبنجرّب switch-role مباشرة — إذا نجح = المستخدم بائع
      if (!freshHasSellerProfile) {
        try {
          await switchRoleAndNavigate("seller", navigate, {
            path: "/seller/dashboard",
            replace: true,
          });
          return; // ✅ نجح — في seller profile فعلاً
        } catch (switchErr) {
          // ✅ فشل switch-role → الباك أكّد إنه فعلاً ما عندوش متجر
          if (isMissingProfileError(switchErr)) {
            navigate("/customer/become-seller");
            return;
          }
          // خطأ تاني (شبكة/توكن...) — بنعرض رسالة
          setLocalError(
            switchErr?.response?.data?.data?.message ||
              switchErr?.response?.data?.message ||
              switchErr?.message ||
              "تعذّر تبديل الدور، حاول مرة أخرى"
          );
          return;
        }
      }
      // ✅ الـ refresh حدّث الـ state وبنستخدمه ضمنياً عبر الـ switch العادي تحت
    }

    // ─── 2) Smart gate: seller → customer بدون customer profile (نادر) ───
    if (targetRole === "customer" && hasCustomerProfile === false) {
      try {
        await becomeCustomer();
        // ✅ navigate بعد ما الـ state يلتقط (atomic via flushStateUpdates)
        navigate("/home/customer", { replace: true });
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

    // ─── 3) عنده الـ profile → AuthContext.switchRoleAndNavigate ───
    //    atomic: state + tokens + socket → navigate
    try {
      await switchRoleAndNavigate(targetRole, navigate, {
        path: targetRole === "seller" ? "/seller/dashboard" : "/home/customer",
        replace: true,
      });
      // ✅ navigate صار من جوا الـ helper — ما في شي نعمله هون
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
        disabled={busy}
        aria-busy={busy}
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
