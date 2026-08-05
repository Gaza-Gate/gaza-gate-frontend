import { useEffect, useRef, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../hooks/useTheme.jsx";
import "./FloatingThemeToggle.css";

/**
 * FloatingThemeToggle — زر عائم (FAB) لتبديل الثيم.
 *
 * ✅ يظهر في أسفل يمين الشاشة بشكل ثابت (position: fixed).
 * ✅ z-index عالي (10000) ليطفو فوق كل المحتوى (أعلى من FloatingChatWidget).
 * ✅ أنيميشن سلسة بين أيقونتي الشمس ↔ القمر.
 * ✅ متجاوب مع الثيم الحالي: شكل زجاجي نظيف في الوضعين.
 * ✅ tooltip يوضّح الإجراء + اختصار لوحة المفاتيح.
 * ✅ يمنع تغيير الثيم على شاشات الـ Checkout/modal-heavy (لتجنب التعارض البصري).
 */
export default function FloatingThemeToggle({ hidden = false }) {
  const { isDark, toggle } = useTheme();
  const [pulse, setPulse] = useState(false);
  const timerRef = useRef(null);

  // لمسة بصرية عند التبديل (نبضة قصيرة)
  function handleToggle(e) {
    toggle();
    setPulse(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPulse(false), 500);
  }

  // اختصار لوحة المفاتيح: Alt+T لتبديل الثيم من أي مكان
  useEffect(() => {
    function onKey(e) {
      if (e.altKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        handleToggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // تنظيف الـ timer عند الـ unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (hidden) return null;

  const label = isDark ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي";
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`ftt-fab ${isDark ? "ftt-fab--dark" : "ftt-fab--light"} ${
        pulse ? "ftt-fab--pulse" : ""
      }`}
      aria-label={label}
      title={`${label} (Alt+T)`}
    >
      <span className="ftt-icon-wrap" key={isDark ? "sun" : "moon"}>
        <Icon size={22} className="ftt-icon" strokeWidth={2.2} />
      </span>
      <span className="ftt-tooltip">{label}</span>
    </button>
  );
}
