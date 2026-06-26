import "./ConfirmModal.css";

export default function ConfirmModal({
  open,
  title,
  confirmLabel = "نعم",
  cancelLabel = "إلغاء",
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!open) return null;

  return (
    <div className="cfm-overlay" dir="rtl" onClick={onCancel}>
      <div className="cfm-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="cfm-title">{title}</h2>
        <div className="cfm-actions">
          <button className="cfm-btn-cancel" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button className="cfm-btn-confirm" onClick={onConfirm} disabled={loading}>
            {loading ? <span className="cfm-spinner" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
