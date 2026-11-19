// src/hooks/useSwipeToDismiss.js
//
// ✅ Touch swipe-to-dismiss hook (لـ mobile) — ثنائي الاتجاه
// ─────────────────────────────────────────────────────────
// - يلتقط السحب الأفقي على العنصر
// - يدعم السحب بجهتين (يسار ويمين) — حسب الاختيار
// - عند تجاوز العتبة (default 30% من العرض) → يستدعي onDismiss
// - أثناء السحب: يحرّك العنصر بـ transform: translateX(...)
// - visual feedback: الخلفية تتحوّل للون الأحمر تدريجياً + أيقونة trash
// - RTL/LTR aware
//
// الاستخدام:
//   // 1) سحب لليسار فقط (مثلاً RTL): يحذف
//   const swipe = useSwipeToDismiss({ onDismiss: handleDelete, direction: "left" });
//
//   // 2) سحب لليمين فقط: يحذف
//   const swipe = useSwipeToDismiss({ onDismiss: handleDelete, direction: "right" });
//
//   // 3) سحب بكلا الاتجاهين
//   const swipe = useSwipeToDismiss({ onDismiss: handleDelete, direction: "both" });
//
//   // 4) قيمة افتراضية — حسب لغة الصفحة (RTL = سحب لليسار، LTR = سحب لليمين)
//   const swipe = useSwipeToDismiss({ onDismiss: handleDelete, direction: "auto" });
//
//   <div {...swipe.bind()}>...</div>

import { useRef, useCallback, useState, useEffect } from "react";

const DEFAULT_THRESHOLD = 0.3; // 30% من العرض

/**
 * Hook لكشف اتجاه اللغة الفعلي (RTL/LTR) على الـ document.
 * — "auto" يعتمد على dir="rtl" أو dir="ltr" في الـ HTML.
 */
function getDocumentDirection() {
  if (typeof document === "undefined") return "rtl";
  const dir = document.documentElement?.dir || document.body?.dir || "ltr";
  return dir === "rtl" ? "rtl" : "ltr";
}

export function useSwipeToDismiss({
  onDismiss,
  threshold = DEFAULT_THRESHOLD,
  enabled = true,
  /**
   * اتجاه السحب المسموح:
   *  - "left"  : سحب لليسار فقط
   *  - "right" : سحب لليمين فقط
   *  - "both"  : سحب بكلا الاتجاهين
   *  - "auto"  : حسب لغة الصفحة (RTL=يسار، LTR=يمين) — افتراضي
   *  - "rtl"   : alias — RTL (يسار = خروج)
   *  - "ltr"   : alias — LTR (يمين = خروج)
   */
  direction = "auto",
} = {}) {
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalRef = useRef(false);
  const elRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);

  // ✅ نحدّد الاتجاه الفعلي (left/right/both) حسب `direction`
  const resolvedDirection = useMemoDirection(direction);

  const onTouchStart = useCallback(
    (e) => {
      if (!enabled) return;
      const t = e.touches?.[0];
      if (!t) return;
      startXRef.current = t.clientX;
      startYRef.current = t.clientY;
      isHorizontalRef.current = false;
      setSwiping(false);
    },
    [enabled]
  );

  const onTouchMove = useCallback(
    (e) => {
      if (!enabled) return;
      const t = e.touches?.[0];
      if (!t) return;

      const dx = t.clientX - startXRef.current;
      const dy = t.clientY - startYRef.current;

      // أول حركة: نقرر هل هو سحب أفقي أو عمودي
      if (!isHorizontalRef.current && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;

      // إذا الحركة العمودية أكبر بكثير → لا نعترض (نترك scroll يحدث)
      if (Math.abs(dy) > Math.abs(dx) * 1.4) {
        isHorizontalRef.current = false;
        return;
      }
      isHorizontalRef.current = true;
      setSwiping(true);

      // ✅ نطبّق الاتجاه المسموح:
      // - "left"  → السحب لليسار فقط (dx < 0)
      // - "right" → السحب لليمين فقط (dx > 0)
      // - "both"  → كلا الاتجاهين
      if (resolvedDirection === "left" && dx > 0) {
        // سحب لليمين — لكن الاتجاه يسار فقط → نتجاهل
        setOffset(0);
        return;
      }
      if (resolvedDirection === "right" && dx < 0) {
        // سحب لليسار — لكن الاتجاه يمين فقط → نتجاهل
        setOffset(0);
        return;
      }

      setOffset(dx);
    },
    [enabled, resolvedDirection]
  );

  const finish = useCallback(
    (commit) => {
      if (!enabled) return;
      const w = elRef.current?.offsetWidth || 300;
      const passed = Math.abs(offset) > w * threshold;
      if (commit && passed && typeof onDismiss === "function") {
        onDismiss();
      }
      setOffset(0);
      setSwiping(false);
      isHorizontalRef.current = false;
    },
    [enabled, offset, threshold, onDismiss]
  );

  const onTouchEnd = useCallback(() => finish(true), [finish]);
  const onTouchCancel = useCallback(() => finish(false), [finish]);

  /**
   * ✅ Style أثناء السحب — يُستخدم بـ style={swipe.style}
   * الـ transform يطابق dx (موجب = يمين، سالب = يسار)
   */
  const style = swiping
    ? {
        transform: `translateX(${offset}px)`,
        transition: "none",
        opacity: Math.max(0, 1 - Math.abs(offset) / (elRef.current?.offsetWidth || 300)),
        willChange: "transform, opacity",
      }
    : null;

  /**
   * ✅ bind: لازم تناديها على الـ container element
   * { ...swipe.bind() }
   */
  const bind = useCallback(
    () => ({
      ref: elRef,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
    }),
    [onTouchStart, onTouchMove, onTouchEnd, onTouchCancel]
  );

  /**
   * ✅ خلفية الـ "behind" element (تظهر لما العنصر ينسحب)
   * مثلاً: div حاوي فيه trash icon + خلفية حمراء
   * الـ bgStyle.bothMode = true لو الاتجاه "both" (يعرض من الجانبين)
   */
  const bgStyle = {
    opacity: Math.min(1, Math.abs(offset) / 80),
    transform: `scaleX(${Math.min(1, Math.abs(offset) / 100)})`,
  };

  return { bind, style, swiping, offset, bgStyle, direction: resolvedDirection };
}

/**
 * Helper: يحوّل "auto" / "rtl" / "ltr" / "both" / "left" / "right"
 * إلى "left" / "right" / "both" الفعلي.
 */
function useMemoDirection(direction) {
  // SSR-safe: نستخدم useState + useEffect لقراءة الـ document
  const [resolved, setResolved] = useState(() => {
    return resolveDirectionStatic(direction);
  });

  useEffect(() => {
    setResolved(resolveDirectionStatic(direction));
  }, [direction]);

  return resolved;
}

function resolveDirectionStatic(direction) {
  if (direction === "auto") {
    const docDir = getDocumentDirection();
    return docDir === "rtl" ? "left" : "right";
  }
  if (direction === "rtl") return "left";
  if (direction === "ltr") return "right";
  // "left" | "right" | "both"
  return direction;
}
