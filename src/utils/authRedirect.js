// src/utils/authRedirect.js
//
// ✅ حفظ "وين كان الضيف" قبل ما نوديه على تسجيل الدخول، عشان يرجع لنفس
//    الصفحة بعد الـ login (أو بعد إنشاء حساب + تأكيد الإيميل + login).
//
// ليش sessionStorage مش location.state بس؟
//   مسار إنشاء الحساب بيمر بعدة صفحات (register → verify-email → login)،
//   والـ state ما بينتقل معهم. sessionStorage بيضل لنفس التاب بس،
//   وبنمسحه أول ما نستخدمه.
//
// الأمان: بنقبل بس مسارات داخلية بتبدأ بـ "/" (مش "//" ولا روابط كاملة)
//   عشان ما حدا يستغلها كـ open redirect.

const REDIRECT_KEY = "gaza-gate-post-login-redirect";

// بعد هالمدة الرابط المحفوظ بيعتبر قديم (مثلاً فتح الـ popup ورجع بعد ساعة)
const REDIRECT_TTL_MS = 30 * 60 * 1000;

// صفحات ما منرجع لها بعد الدخول (صفحات الـ auth نفسها)
const BLOCKED_PREFIXES = ["/login", "/register", "/verify-email", "/verify-otp", "/forgot-password", "/onboarding"];

/**
 * ✅ هل المسار داخلي وآمن نرجع له؟
 * @param {string} path
 * @returns {boolean}
 */
export function isSafeRedirectPath(path) {
  if (!path || typeof path !== "string") return false;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
  if (path === "/") return false;
  return !BLOCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
}

/**
 * ✅ احفظ الصفحة الحالية عشان نرجع لها بعد الدخول
 * @param {string} path - pathname + search (مثلاً "/customer/store/abc?tab=reviews")
 */
export function savePostLoginRedirect(path) {
  if (!isSafeRedirectPath(path)) return;
  try {
    sessionStorage.setItem(REDIRECT_KEY, JSON.stringify({ path, savedAt: Date.now() }));
  } catch {
    /* storage غير متاح — منكمل بدون رجوع */
  }
}

/**
 * ✅ امسح أي رابط محفوظ (مثلاً لما الضيف يلغي)
 */
export function clearPostLoginRedirect() {
  try {
    sessionStorage.removeItem(REDIRECT_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * ✅ رجّع الصفحة اللي لازم نروح عليها بعد الدخول، وامسحها من التخزين.
 *
 * الأولوية:
 *   1) stateFrom — جاي من location.state.from (الـ RequireCustomer بيبعته)
 *   2) الرابط المحفوظ بـ sessionStorage (من الـ popup) لو لسا جديد
 *   3) fallback
 *
 * @param {string} fallback - مثلاً "/home/customer"
 * @param {string} [stateFrom]
 * @returns {string}
 */
export function consumePostLoginRedirect(fallback, stateFrom) {
  let saved = null;
  try {
    const raw = sessionStorage.getItem(REDIRECT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Date.now() - Number(parsed.savedAt) < REDIRECT_TTL_MS) {
        saved = parsed.path;
      }
    }
  } catch {
    /* ignore */
  }
  clearPostLoginRedirect();

  if (isSafeRedirectPath(stateFrom)) return stateFrom;
  if (isSafeRedirectPath(saved)) return saved;
  return fallback;
}
