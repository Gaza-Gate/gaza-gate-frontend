import { useState, useEffect } from "react";
import { AlertTriangle, X, Loader2, Ban, Package, CheckCircle2, Hash } from "lucide-react";
import { cancelOrder as cancelCustomerOrder } from "../services/orderService";
import { formatApiError } from "../utils/errorHelper";
import "./CancelOrderModal.css";

/**
 * ════════════════════════════════════════════════════════════
 *  CancelOrderModal — نافذة تأكيد إلغاء الطلب
 *
 *  مطابق لـ API الباك:
 *    POST /api/customer/order/:id/cancel
 *    Body: لا يوجد
 *    Response: { status: "success", data: { order: { id, orderNumber, status: "cancelled" } } }
 *
 *  Props:
 *   - open:        boolean
 *   - order:       object|null
 *   - onClose:     () => void
 *   - onCancelled: (updatedOrder) => void
 * ════════════════════════════════════════════════════════════
 */
export default function CancelOrderModal({ open, order, onClose, onCancelled }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);
  const [success, setSuccess] = useState(false);
  const [cancelledOrder, setCancelledOrder] = useState(null);

  // Reset عند الفتح/الإغلاق
  useEffect(() => {
    if (open) {
      setError(null);
      setErrorInfo(null);
      setSuccess(false);
      setCancelledOrder(null);
    }
  }, [open]);

  // إغلاق بـ Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open || !order) return null;

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setErrorInfo(null);
    try {
      // POST بدون body — مطابق للـ spec تبع الباك
      const updated = await cancelCustomerOrder(order.id);
      console.log("[CancelOrder] API response:", updated);

      // ندمج بحذر: نحتفظ بكل بيانات order الأصلية
      // ونحدّث فقط الحقول اللي جاءت من الباك
      const merged = {
        ...order,
        id: updated.id ?? order.id,
        orderNumber: updated.orderNumber ?? order.orderNumber,
        status: "cancelled",
        canCancel: false,
      };
      setCancelledOrder(merged);
      setSuccess(true);
      onCancelled?.(merged);
    } catch (err) {
      console.error("[CancelOrder] API error:", err);
      const info = formatApiError(err, "تعذّر إلغاء الطلب");
      setErrorInfo(info);
      setError(info.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="com-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="com-modal" dir="rtl" role="dialog" aria-modal="true">
        {success ? (
          /* ══════ Success state ══════ */
          <>
            <div className="com-success-header">
              <div className="com-success-icon">
                <CheckCircle2 size={56} strokeWidth={2.5} />
              </div>
              <h2 className="com-success-title">تم إلغاء الطلب بنجاح ✓</h2>
              <p className="com-success-subtitle">تم تحديث حالة الطلب في النظام</p>
            </div>
            <div className="com-body">
              <div className="com-success-card">
                <div className="com-success-row">
                  <span className="com-success-label">رقم الطلب</span>
                  <strong className="com-success-value">
                    <Hash size={13} />
                    {cancelledOrder?.orderNumber || cancelledOrder?.id?.slice(0, 8)}
                  </strong>
                </div>
                <div className="com-success-row">
                  <span className="com-success-label">الحالة الجديدة</span>
                  <span className="com-success-status">ملغي</span>
                </div>
                <div className="com-success-row">
                  <span className="com-success-label">المعرف</span>
                  <code className="com-success-id">
                    {cancelledOrder?.id?.slice(0, 13)}…
                  </code>
                </div>
              </div>

              <div className="com-success-info">
                💡 سيتم إبلاغ البائع، وإن تم الدفع مسبقاً يُسترجع المبلغ خلال 3–7 أيام
              </div>
            </div>
            <div className="com-footer">
              <button
                type="button"
                className="com-btn com-btn-primary-success"
                onClick={onClose}
              >
                حسناً، إغلاق
              </button>
            </div>
          </>
        ) : (
          /* ══════ Confirmation state ══════ */
          <>
            <div className="com-header">
              <button
                type="button"
                className="com-close"
                onClick={onClose}
                disabled={submitting}
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
              <div className="com-header-icon">
                <AlertTriangle size={22} />
              </div>
              <div className="com-header-info">
                <h2 className="com-title">إلغاء الطلب</h2>
                <p className="com-subtitle">هل أنت متأكد من رغبتك في الإلغاء؟</p>
              </div>
            </div>

            <div className="com-body">
              <div className="com-order-card">
                <div className="com-order-icon">
                  <Package size={18} />
                </div>
                <div className="com-order-meta">
                  <span className="com-order-num">
                    {order.orderNumber || order.id?.slice(0, 8)}
                  </span>
                  <span className="com-order-total">{order.totalPrice}₪</span>
                </div>
              </div>

              <ul className="com-warning-list">
                <li>
                  <span className="com-bullet" />
                  سيتم إبلاغ البائع فوراً بإلغاء الطلب
                </li>
                <li>
                  <span className="com-bullet" />
                  لن تستطيع إعادة الطلب بعد الإلغاء — ستحتاج لإنشاء طلب جديد
                </li>
                <li>
                  <span className="com-bullet" />
                  في حال تم الدفع مسبقاً، يتم استرجاع المبلغ خلال 3–7 أيام عمل
                </li>
              </ul>

              {error && (
                <div className="com-error">
                  <AlertTriangle size={15} />
                  <div>
                    <strong>{error}</strong>
                    {errorInfo?.status && (
                      <span className="com-error-hint">
                        {errorInfo.status === 404
                          ? "الطلب غير موجود"
                          : errorInfo.status === 400
                          ? "الحالة الحالية لا تسمح بالإلغاء"
                          : errorInfo.status === 401
                          ? "انتهت جلستك — سجّل دخول من جديد"
                          : "حاول مرة أخرى"}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="com-footer">
              <button
                type="button"
                className="com-btn com-btn-secondary"
                onClick={onClose}
                disabled={submitting}
              >
                تراجع
              </button>
              <button
                type="button"
                className="com-btn com-btn-danger"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="com-spin" />
                    جاري الإلغاء...
                  </>
                ) : (
                  <>
                    <Ban size={15} />
                    نعم، ألغِ الطلب
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
