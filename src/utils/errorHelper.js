// ─────────────────────────────────────────────────────────────
//  API Error Helper — يحول أخطاء Axios لأشكال مفيدة للـ UI
// ─────────────────────────────────────────────────────────────

/**
 * يستخرج رسالة مفيدة من خطأ Axios.
 * - لو الباك رجّع message بنعرضها
 * - لو 404 → "المسار غير موجود على الباك"
 * - لو 401 → "الجلسة انتهت"
 * - لو 400 → "بيانات غير صالحة"
 * - لو 500+ → "خطأ في السيرفر"
 * - غير هيك → نص افتراضي
 */
export function formatApiError(err, fallback = "حدث خطأ غير متوقع") {
  if (!err) return { message: fallback, status: null, url: null, method: null };

  const status = err.response?.status;
  const data = err.response?.data;
  const relativeUrl = err.config?.url || "";
  const baseURL = err.config?.baseURL || "";
  // الـ URL الكامل = baseURL + relativeUrl (مع تنظيف)
  let fullUrl = baseURL + relativeUrl;
  if (baseURL.endsWith("/") && relativeUrl.startsWith("/")) {
    fullUrl = baseURL + relativeUrl.slice(1);
  } else if (!baseURL.endsWith("/") && !relativeUrl.startsWith("/") && relativeUrl) {
    fullUrl = baseURL + "/" + relativeUrl;
  }
  const method = err.config?.method?.toUpperCase() || "?";

  // محاولة استخراج رسالة من response body بأشكال مختلفة
  // ندعم الهياكل الشائعة:
  //   { status: "fail", data: { message: "..." } }    ← الأكثر شيوعاً في هاد المشروع
  //   { message: "..." }
  //   { error: "..." }
  //   { error: { message: "..." } }
  let serverMessage = null;
  if (data && typeof data === "object") {
    serverMessage =
      data.data?.message ||  // ← هاد اللي بنستخدمه للـ review API
      data.message ||
      data.error ||
      data.msg ||
      null;
    // بعض الـ APIs ترجع error كائن فيه message
    if (!serverMessage && data.error && typeof data.error === "object") {
      serverMessage = data.error.message || data.error.code;
    }
  } else if (typeof data === "string") {
    serverMessage = data;
  }

  // fallback: لو الـ status موجود بلا message
  let message = serverMessage;
  if (!message) {
    switch (status) {
      case 400:
        message = "البيانات المُرسلة غير صالحة";
        break;
      case 401:
        message = "انتهت جلستك — سجّل دخول من جديد";
        break;
      case 403:
        message = "ليس لديك صلاحية لتنفيذ هذا الإجراء";
        break;
      case 404:
        message = "المسار غير موجود على السيرفر";
        break;
      case 409:
        message = "تعارض في البيانات";
        break;
      case 422:
        message = "البيانات لا تستوفي شروط الباك";
        break;
      case 429:
        message = "طلبات كثيرة — حاول بعد قليل";
        break;
      case 500:
        message = "خطأ في السيرفر";
        break;
      case 502:
      case 503:
      case 504:
        message = "السيرفر غير متاح حالياً";
        break;
      default:
        if (status) {
          message = `خطأ من السيرفر (${status})`;
        } else if (err.message) {
          message = err.message;
        } else {
          message = fallback;
        }
    }
  }

  return {
    message,
    status,
    url: fullUrl,  // ← Bug fix: كانت `url` غير معرّفة
    method,
    serverMessage,
    raw: err,
  };
}

/**
 * Helper بسيط: ينسخ تفاصيل الخطأ للـ clipboard
 */
export async function copyErrorDetails(err) {
  const info = formatApiError(err);
  const text = [
    `Status: ${info.status || "—"}`,
    `Method: ${info.method}`,
    `URL: ${info.url}`,
    `Message: ${info.message}`,
    info.serverMessage ? `Server: ${info.serverMessage}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
