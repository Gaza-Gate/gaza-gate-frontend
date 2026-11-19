// src/utils/smartBack.js
//
// ✅ Smart back navigation — يستخدم history.back() لما يكون آمن،
//    وإلا يرجع لـ fallback path مناسب للمشروع.
//
// المشكلة اللي بيحلها:
//   • navigate(-1) بدون فحص:
//       1) إذا فتح المستخدم صفحة login بشكل مباشر (deep link، refresh،
//          copy-paste URL) → window.history.length ممكن يكون 1 (أول صفحة)
//          أو قد يشير لصفحة login نفسها → ما في back حقيقي.
//       2) بعد logout → إذا كان history فيه صفحة محمية (cart, my-orders, ...)
//          navigate(-1) يرجع لها، والـ RequireCustomer/RequireSeller
//          بياخد قرار بناءً على الـ React state، لكن ممكن يكون
//          الـ state لسا ما تحدّث (race condition).
//       3) إذا الـ back history يشير لصفحة login تانية (seller login مثلاً)
//          → back ما رح يفيد.
//
// الحل:
//   1) لو في history كافي + الـ document.referrer أو الـ location.state
//      يشير لصفحة "آمنة" (مش auth page، ومش protected page بعد logout) →
//      window.history.back() (أو navigate(-1)).
//   2) غير هيك → نرجع لـ fallback path مناسب لكل user type.

import authShellPaths from "./authShellPaths";

/**
 * ✅ Smart back: ارجع للصفحة السابقة بشكل آمن.
 *
 * @param {object} navigate - useNavigate() من react-router-dom
 * @param {object} options
 * @param {string} options.fallback - path الـ fallback (مثلاً "/home/customer")
 * @param {boolean} options.useHistoryBack - يستخدم window.history.back() بدل navigate(-1) — أنظف
 * @returns {boolean} true إذا عمل back حقيقي، false إذا استخدم fallback
 */
export function smartBack(navigate, { fallback = "/", useHistoryBack = true } = {}) {
  if (typeof window === "undefined") {
    navigate(fallback, { replace: true });
    return false;
  }

  // 1) لو ما في history كافي → fallback
  //    (window.history.length <= 1 يعني أول صفحة أو refresh مباشر)
  if (!window.history.state || window.history.length <= 1) {
    navigate(fallback, { replace: true });
    return false;
  }

  // 2) فحص الـ referrer + الـ current state
  //    (window.history.state.key مختلف عن المفتاح الحالي)
  //    ما نقدر نشوف "الصفحة السابقة" مباشرة من history API
  //    بس بنقدر نتحقق من referrer
  const referrer = document.referrer;
  if (referrer) {
    try {
      const refUrl = new URL(referrer);
      const refPath = refUrl.pathname;
      // لو الـ referrer هو صفحة auth → لا ترجع لها
      if (isAuthPath(refPath)) {
        navigate(fallback, { replace: true });
        return false;
      }
    } catch {
      /* ignore */
    }
  }

  // 3) فحص الـ state من react-router (لو محفوظ من التنقل داخل التطبيق)
  //    الـ react-router بيخزن state لكل entry بالـ history
  //    بنحاول نتحقق من آخر entry قبل الحالي
  const previousKey = window.history.state?.key;
  if (!previousKey) {
    // ما في state كافي → نعتبر back غير آمن
    navigate(fallback, { replace: true });
    return false;
  }

  // 4) Safe to go back
  if (useHistoryBack) {
    window.history.back();
  } else {
    navigate(-1);
  }
  return true;
}

/**
 * يفحص إذا الـ path هو صفحة auth (login/register/...).
 */
function isAuthPath(pathname) {
  if (!pathname) return false;
  if (pathname === "/") return true;
  return authShellPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
