// src/utils/errorMessages.js
//
// Helper موحّد لتحويل أخطاء الـ API إلى رسائل واضحة بالعربية
// للـ user — يضمن إن كل صفحات المشروع تعرض نفس الأسلوب
// لمعالجة الأخطاء.

/**
 * استخراج رسالة خطأ مفيدة من أي error object (axios / fetch / generic)
 *
 * @param {Error|object} err
 * @returns {{ title: string, message: string, status: number|null, isPermission: boolean, isNotFound: boolean, isAuth: boolean }}
 */
export function getApiError(err) {
  const status = err?.response?.status ?? null;
  const rawMessage =
    err?.response?.data?.data?.message ||
    err?.response?.data?.message ||
    (Array.isArray(err?.response?.data?.data?.errors) &&
      err.response.data.data.errors
        .map((e) => e?.message)
        .filter(Boolean)
        .join(" · ")) ||
    err?.message ||
    "حدث خطأ غير متوقع";

  // Default: title عام + message
  let title = "حدث خطأ";
  let message = rawMessage;
  let isPermission = false;
  let isNotFound = false;
  let isAuth = false;

  // ⚠️ Network Error (axios throws this when offline or CORS failed)
  if (err?.message === "Network Error" || err?.code === "ERR_NETWORK") {
    title = "تعذّر الاتصال بالخادم";
    message = "تحقق من اتصالك بالإنترنت، ثم حاول مرة أخرى.";
  }
  // 400 — Bad Request (validation)
  else if (status === 400) {
    title = "بيانات غير صحيحة";
    message = rawMessage;
  }
  // 401 — Unauthorized
  else if (status === 401) {
    title = "انتهت جلستك";
    message = "يرجى تسجيل الدخول مرة أخرى للمتابعة.";
    isAuth = true;
  }
  // 403 — Forbidden
  else if (status === 403) {
    title = "ليست لديك صلاحية";
    message =
      "قد تحتاج لإكمال إعداد ملف متجرك أولاً، أو ليس لديك الإذن لعرض هذه البيانات.";
    isPermission = true;
  }
  // 404 — Not Found
  else if (status === 404) {
    title = "الميزة غير متوفرة حالياً";
    message =
      "هذه الصفحة أو البيانات غير متوفرة على الخادم. حاول مرة أخرى لاحقاً أو ارجع للصفحة السابقة.";
    isNotFound = true;
  }
  // 429 — Too Many Requests
  else if (status === 429) {
    title = "طلبات كثيرة جداً";
    message = "انتظر قليلاً ثم حاول مرة أخرى.";
  }
  // 500+ — Server Error
  else if (status >= 500) {
    title = "خطأ في الخادم";
    message = "حاول مرة أخرى بعد قليل. إذا استمرت المشكلة، تواصل مع الدعم.";
  }

  return {
    title,
    message,
    status,
    isPermission,
    isNotFound,
    isAuth,
    raw: rawMessage,
  };
}

/**
 * رسالة قصيرة مفيدة لعرضها في toast أو banner
 */
export function shortErrorMessage(err) {
  const { title, message } = getApiError(err);
  return message || title;
}
