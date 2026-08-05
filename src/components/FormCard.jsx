import { Link } from "react-router-dom";

/**
 * FormCard — البطاقة الموحّدة لشاشات Login/Register/Verify/Forgot.
 *
 * ✅ اللوغو تم إزالته من أعلى البطاقة (بناءً على طلب المستخدم).
 * ✅ الثيم ديناميكي بالكامل:
 *    - light → خلفية فاتحة + بطاقة بيضاء + نصوص داكنة.
 *    - dark  → خلفية slate ناعمة (#1e293b) + بطاقة شفافة زجاجية + نصوص فاتحة مريحة.
 * ✅ البرتقالي يظل نفسه في الوضعين.
 * ✅ الموجة المتحركة في الخلفية تأتي من body::before / body::after في index.css.
 */
export function FormCard({ children }) {
  return (
    <div className="form-card-wrapper">
      {/* لمسة برتقالية خفيفة في الخلفية — لإحساس الـ "wave" (محايدة للثيم) */}
      <div
        aria-hidden
        className="form-card-glow"
      />

      <div
        className="fade-up form-card-inner"
      >
        {children}
      </div>
    </div>
  );
}

export function CardHeader({ icon, subtitle }) {
  return (
    <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
      <div
        className="form-card-title"
        style={{
          marginBottom: ".4rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {icon}
      </div>
      <p className="form-card-subtitle">{subtitle}</p>
    </div>
  );
}

export function PrimaryBtn({ children, loading }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="auth-orange-btn"
      style={{
        display: "block",
        width: "100%",
        padding: 13,
        background: loading
          ? "rgba(249, 115, 22, 0.5)"
          : "linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontFamily: "'Tajawal', sans-serif",
        fontSize: 16,
        fontWeight: 700,
        cursor: loading ? "not-allowed" : "pointer",
        boxShadow: "0 6px 18px rgba(249, 115, 22, 0.45)",
        transition: "background .2s, transform .2s, box-shadow .2s",
        textAlign: "center",
        marginBottom: "1.25rem",
      }}
    >
      {loading ? "جاري التحميل..." : children}
    </button>
  );
}

export function Divider() {
  return (
    <div
      className="auth-divider"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: "1.25rem",
        fontSize: 13,
      }}
    >
      <div className="auth-divider-line" style={{ flex: 1, height: 1 }} />
      أو
      <div className="auth-divider-line" style={{ flex: 1, height: 1 }} />
    </div>
  );
}

export function FooterLink({ text, linkText, to }) {
  return (
    <div
      className="form-card-footer"
      style={{
        textAlign: "center",
        fontSize: 13,
      }}
    >
      {text}{" "}
      <Link
        to={to}
        style={{
          color: "#fb923c",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        {linkText}
      </Link>
    </div>
  );
}

export function RememberRow({ userType = "seller", remember = false, onRememberChange }) {
  const forgotPath = userType === "customer" ? "/forgot-password?role=customer" : "/forgot-password";

  return (
    <div
      className="form-card-remember"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "1.25rem",
        fontSize: 13,
      }}
    >
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => onRememberChange?.(e.target.checked)}
          style={{ accentColor: "#f97316", width: 15, height: 15 }}
        />
        تذكرني
      </label>
      <Link
        to={forgotPath}
        style={{ color: "#fb923c", textDecoration: "none", fontWeight: 500 }}
      >
        نسيت كلمة المرور؟
      </Link>
    </div>
  );
}

export function ApiError({ message }) {
  if (!message) return null;
  return (
    <div
      className="form-card-api-error"
      style={{
        background: "rgba(239, 68, 68, 0.12)",
        border: "1px solid rgba(239, 68, 68, 0.4)",
        borderRadius: "var(--radius-sm)",
        padding: "10px 14px",
        marginBottom: "1rem",
        fontSize: 13,
        textAlign: "right",
      }}
    >
      {message}
    </div>
  );
}
