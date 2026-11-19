import { LogIn, UserPlus, Store } from "lucide-react";
import "./LoginRequiredModal.css";

/**
 * LoginRequiredModal — popup بيطلع للضيف لما يضغط على فعل بيحتاج حساب مشتري
 * (السلة، المفضلة، المراسلة، التقييم، الطلبات...).
 *
 * نوعين:
 *   - variant="guest"  → [تسجيل دخول] [إنشاء حساب] [إلغاء]
 *   - variant="seller" → البائع بيتصفّح كزائر — بس تنبيه + [حسناً]
 *
 * ما بيستخدم مباشرة من الصفحات — الصفحات بتستخدم useLoginPrompt()
 * من LoginPromptContext، واللي بيعرض هالمودال مرة وحدة للتطبيق كله.
 */
export default function LoginRequiredModal({
  open,
  variant = "guest",
  actionLabel,
  onLogin,
  onRegister,
  onCancel,
}) {
  if (!open) return null;

  const isSeller = variant === "seller";

  return (
    <div className="lrm-overlay" dir="rtl" onClick={onCancel}>
      <div
        className="lrm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lrm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lrm-icon" aria-hidden="true">
          {isSeller ? <Store size={26} /> : <LogIn size={26} />}
        </div>

        <h2 id="lrm-title" className="lrm-title">
          {isSeller ? "هذه الميزة للمشترين" : "سجّل دخولك أولاً"}
        </h2>

        <p className="lrm-text">
          {isSeller
            ? "أنت تتصفّح كبائع. لتقدر " + (actionLabel || "تكمل") + " لازم تستخدم حساب مشتري."
            : "لتقدر " + (actionLabel || "تكمل") + " لازم يكون عندك حساب مشتري. بعد الدخول بترجع لنفس الصفحة."}
        </p>

        {isSeller ? (
          <div className="lrm-actions">
            <button type="button" className="lrm-btn lrm-btn--primary" onClick={onCancel} autoFocus>
              حسناً
            </button>
          </div>
        ) : (
          <>
            <div className="lrm-actions">
              <button type="button" className="lrm-btn lrm-btn--primary" onClick={onLogin} autoFocus>
                <LogIn size={17} />
                تسجيل دخول
              </button>
              <button type="button" className="lrm-btn lrm-btn--outline" onClick={onRegister}>
                <UserPlus size={17} />
                إنشاء حساب
              </button>
            </div>
            <button type="button" className="lrm-cancel" onClick={onCancel}>
              متابعة التصفّح
            </button>
          </>
        )}
      </div>
    </div>
  );
}
