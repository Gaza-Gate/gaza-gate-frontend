// ════════════════════════════════════════════════════════════════════════════
//  Visibility — تحديد مركزي لـ "وين يظهر الزر/الويدجت" بناءً على الـ route
// ════════════════════════════════════════════════════════════════════════════
//
//  الهدف: نقرر من مكان واحد إذا كان الـ FloatingChatWidget + FloatingThemeToggle
//    يظهرون على الصفحة الحالية. لا نضع شروط داخل كل صفحة.
//
//  • الـ Floating actions (Chatbot + Theme) تظهر فقط في الـ Home
//      - Customer Home  → /home/customer
//      - Seller Home    → /seller/dashboard
//  • كل الـ routes الثانية (products, cart, orders, profile, messages…):
//      → لا Chatbot، لا Theme button.
//
//  إذا حبّينا نسمح في صفحة معيّنة مستقبلاً: نضيفها لـ HOME_ROUTES
//    فقط (مكان واحد) — باقي الكود ما رح يتغيّر.
//
// ════════════════════════════════════════════════════════════════════════════

import { FEATURES } from "./featureFlags";

// ── الـ routes اللي مسموح فيها بظهور الـ Floating Actions (Chatbot + Theme) ──
// كل route هو "home" لدور معيّن. هون نعرّفهم بالـ exact match لتفادي أي
// تطابق خاطئ مع sub-paths (مثل /seller/dashboard/xyz).
const HOME_ROUTES = Object.freeze([
  "/home/customer",    // Customer Home
  "/seller/dashboard", // Seller Home
]);

/**
 * هل الـ pathname الحالي هو "home page" — الصفحة الرئيسية
 * للـ Customer أو الـ Seller. هنا فقط يظهر الـ Floating Actions.
 *
 * @param {string} pathname - window.location.pathname
 * @returns {boolean}
 */
export function isHomeRoute(pathname) {
  if (!pathname) return false;
  return HOME_ROUTES.includes(pathname);
}

/**
 * هل زر تبديل الثيم العائم (Floating Theme Toggle) يظهر في الصفحة الحالية؟
 *
 * ✅ يظهر دائماً ما عدا Splash ("/") — السلوك الموجود سابقاً.
 * ✅ لو FLOATING_ACTIONS_ON_HOME_ONLY = true: يظهر فقط في الـ Home
 *    (Customer Home / Seller Home).
 *
 * @param {string} pathname
 * @returns {boolean}
 */
export function shouldShowFloatingThemeToggle(pathname) {
  if (!pathname || pathname === "/") return false;

  // السلوك البديل: لو حبّينا نقفل ظهوره على الـ Home فقط.
  if (FEATURES.FLOATING_ACTIONS_ON_HOME_ONLY) {
    return isHomeRoute(pathname);
  }

  return true;
}

/**
 * هل الـ Chatbot widget (Customer أو Seller) يظهر في الصفحة الحالية؟
 *
 * ✅ يظهر فقط في الـ Home routes (Customer Home / Seller Home).
 * ✅ لو CHATBOT_ENABLED = false: ما يظهر أبداً.
 *
 * @param {string} pathname
 * @returns {boolean}
 */
export function shouldShowChatbotWidget(pathname) {
  if (!FEATURES.CHATBOT_ENABLED) return false;
  return isHomeRoute(pathname);
}

/**
 * هل الـ Customer Chat Widget يظهر؟ (نفس قواعد shouldShowChatbotWidget
 *   — مذكور هنا كـ semantic alias إذا حبّينا نفرّق لاحقاً.)
 *
 * @param {string} pathname
 * @returns {boolean}
 */
export const shouldShowCustomerChatWidget = shouldShowChatbotWidget;

/**
 * هل الـ Seller Floating Chat Widget يظهر؟
 *
 * @param {string} pathname
 * @returns {boolean}
 */
export const shouldShowSellerChatWidget = shouldShowChatbotWidget;

// تصدير الـ HOME_ROUTES للقراءة فقط (مفيد للاختبارات/dev tools)
export const HOME_ROUTES_LIST = HOME_ROUTES;
