import { verifyEmail, resendVerificationCode } from "../services/authService";
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// import { verifyEmail, resendVerificationCode } from "../services/authService"; 

/**
 * VerifyOTP — صفحة التحقق من البريد بعد التسجيل
 *
 * الاستخدام: بعد الـ Register ، navigate إلى "/verify-otp" مع تمرير الإيميل:
 *   navigate("/verify-otp", { state: { email: "user@example.com" } });
 */
export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const [countdown, setCountdown] = useState(60); // عداد إعادة الإرسال
  const [canResend, setCanResend] = useState(false);

  // عداد تنازلي لإعادة الإرسال
  useEffect(() => {
    if (countdown === 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (val, idx) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) document.getElementById(`votp-${idx + 1}`)?.focus();
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0)
      document.getElementById(`votp-${idx - 1}`)?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    const next = [...otp];
    text.split("").forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    document.getElementById(`votp-${Math.min(text.length, 5)}`)?.focus();
    e.preventDefault();
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResendMsg(""); setError("");
    try {
      await resendVerificationCode(email);
      setResendMsg("✅ تم إعادة إرسال الرمز");
      setCountdown(60);
      setCanResend(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.some((d) => !d)) { setError("أدخل الرمز كاملاً"); return; }
    setError(""); setLoading(true);
    try {
      await verifyEmail(email, otp.join(""));  
      navigate("/login/seller", { state: { verified: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fp-wrapper">
      <div className="fp-card">
        {/* Header */}
        <div className="fp-header">
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📬</div>
          <h1>تحقق من بريدك</h1>
          <p>
            أرسلنا رمزاً إلى{" "}
            <strong style={{ color: "#f97316" }}>{email}</strong>
          </p>
        </div>

        <form className="fp-form" onSubmit={handleSubmit}>
          {/* OTP inputs */}
          <div className="fp-otp-wrap" onPaste={handlePaste}>
            {otp.map((d, i) => (
              <input
                key={i}
                id={`votp-${i}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(e.target.value, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                className={`fp-otp-box${error ? " fp-otp-error" : ""}`}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && <div className="fp-error">{error}</div>}
          {resendMsg && (
            <div style={{ color: "#16a34a", fontSize: "0.85rem", textAlign: "center" }}>
              {resendMsg}
            </div>
          )}

          <button type="submit" className="fp-btn" disabled={loading}>
            {loading && <span className="fp-spinner" />}
            {loading ? "جاري التحقق..." : "تأكيد الرمز"}
          </button>

          {/* Resend */}
          <button
            type="button"
            className="fp-back"
            onClick={handleResend}
            disabled={!canResend}
            style={{ opacity: canResend ? 1 : 0.5, cursor: canResend ? "pointer" : "default" }}
          >
            {canResend
              ? "ما وصلك الرمز؟ أعد الإرسال"
              : `إعادة الإرسال بعد ${countdown} ثانية`}
          </button>
        </form>
      </div>
    </div>
  );
}