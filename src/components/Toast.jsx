import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import "./Toast.css";

/**
 * ════════════════════════════════════════════════════════════
 *  Toast — إشعار مؤقت يظهر في أعلى/أسفل الشاشة
 *
 *  Variants: success | error | warning | info
 *  duration: ms قبل الاختفاء التلقائي (افتراضي 4000)
 *  على الموبايل: ينزلق من الأعلى
 *  على الديسكتوب: في الزاوية اليمنى العليا
 * ════════════════════════════════════════════════════════════
 */

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

let _idCounter = 0;

export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" dir="rtl" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const Icon = ICONS[toast.variant] || Info;

  return (
    <div className={`toast-item toast-${toast.variant}`} role="status">
      <div className="toast-icon">
        <Icon size={20} />
      </div>
      <div className="toast-content">
        {toast.title && <strong className="toast-title">{toast.title}</strong>}
        {toast.message && <p className="toast-message">{toast.message}</p>}
      </div>
      <button
        type="button"
        className="toast-close"
        onClick={() => onDismiss(toast.id)}
        aria-label="إغلاق"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * useToast — hook لإضافة toasts من أي مكان
 * الاستخدام:
 *   const toast = useToast();
 *   toast.success("تم!", "تم إرسال تقييمك بنجاح");
 *   toast.error("فشل", "حاول مرة أخرى");
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant, title, message, opts = {}) => {
      const id = ++_idCounter;
      const toast = { id, variant, title, message, ...opts };
      setToasts((prev) => [...prev, toast]);
      const duration = opts.duration ?? 4000;
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  return {
    toasts,
    dismiss,
    success: (title, message, opts) => push("success", title, message, opts),
    error:   (title, message, opts) => push("error",   title, message, opts),
    warning: (title, message, opts) => push("warning", title, message, opts),
    info:    (title, message, opts) => push("info",    title, message, opts),
  };
}
