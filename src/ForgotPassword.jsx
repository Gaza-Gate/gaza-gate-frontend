import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ForgotPassword.css";
 
function Steps({ current }) {
  return (
    <div className="fp-steps">
      {[1, 2, 3].map((n, i) => (
        <React.Fragment key={n}>
          <div className={`fp-step ${current === n ? "active" : current > n ? "done" : ""}`}>
            {current > n ? "✓" : n}
          </div>
          {i < 2 && <div className={`fp-line ${current > n + 0.5 ? "done" : ""}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function StepEmail({ onNext }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("أدخل بريداً إلكترونياً صحيحاً"); return;
    }
    setError(""); setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "حدث خطأ");
      onNext(email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fp-header">
        <h1>نسيت كلمة المرور؟ 🔑</h1>
        <p>سنرسل رمز التحقق إلى بريدك</p>
      </div>
      <form className="fp-form" onSubmit={handle}>
        <div className="fp-field">
          <label>البريد الالكتروني</label>
          <input type="email" placeholder="Store@gemit.com"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error && <div className="fp-error">{error}</div>}
        <button type="submit" className="fp-btn" disabled={loading}>
          {loading && <span className="fp-spinner" />}
          {loading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
        </button>
        <button type="button" className="fp-back" onClick={() => navigate("/login")}>
          العودة لتسجيل الدخول
        </button>
      </form>
    </>
  );
}

function StepOTP({ email, onNext }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (val, idx) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0)
      document.getElementById(`otp-${idx - 1}`)?.focus();
  };

  const handleResend = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/auth/resend-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "حدث خطأ");
      setError("");
      alert("تم إعادة إرسال الرمز ✅");
    } catch (err) {
      setError(err.message);
    }
  };

  const handle = async (e) => {
    e.preventDefault();
    if (otp.some((d) => !d)) { setError("أدخل الرمز كاملاً"); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp.join("") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "حدث خطأ");
      onNext(otp.join(""), data.resetToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fp-header">
        <h1>رمز التحقق</h1>
        <p>أرسلنا رمزاً إلى <strong>{email}</strong></p>
      </div>
      <form className="fp-form" onSubmit={handle}>
        <div className="fp-otp-wrap">
          {otp.map((d, i) => (
            <input key={i} id={`otp-${i}`} type="text" inputMode="numeric"
              maxLength={1} value={d}
              onChange={(e) => handleChange(e.target.value, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className="fp-otp-box" />
          ))}
        </div>
        {error && <div className="fp-error">{error}</div>}
        <button type="submit" className="fp-btn" disabled={loading}>
          {loading && <span className="fp-spinner" />}
          {loading ? "جاري التحقق..." : "تأكيد الرمز"}
        </button>
        <button type="button" className="fp-back" onClick={handleResend}>
          ما وصلك الرمز؟ أعد الإرسال
        </button>
      </form>
    </>
  );
}

function StepNewPassword({ resetToken, onDone }) {
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const EyeIcon = ({ open }) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#9ca3af" strokeWidth="2">
      {open
        ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
        : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
      }
    </svg>
  );

  const handle = async (e) => {
    e.preventDefault();
    if (pass.length < 8) { setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }
    if (!/[A-Z]/.test(pass)) { setError("يجب أن تحتوي على حرف كبير"); return; }
    if (!/[a-z]/.test(pass)) { setError("يجب أن تحتوي على حرف صغير"); return; }
    if (!/[0-9]/.test(pass)) { setError("يجب أن تحتوي على رقم"); return; }
    if (!/[^A-Za-z0-9]/.test(pass)) { setError("يجب أن تحتوي على رمز مثل @ # $"); return; }
    if (pass !== confirm) { setError("كلمتا المرور غير متطابقتين"); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword: pass, confirmPassword: confirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "حدث خطأ");
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fp-header">
        <h1>كلمة مرور جديدة</h1>
        <p>اختر كلمة مرور قوية</p>
      </div>
      <form className="fp-form" onSubmit={handle}>
        <div className="fp-field">
          <label>كلمة المرور الجديدة</label>
          <div className="fp-input-wrap">
            <input type={show1 ? "text" : "password"} placeholder="••••••••"
              value={pass} onChange={(e) => setPass(e.target.value)} />
            <button type="button" className="fp-eye" onClick={() => setShow1(!show1)}>
              <EyeIcon open={show1} />
            </button>
          </div>
        </div>
        <div className="fp-field">
          <label>تأكيد كلمة المرور</label>
          <div className="fp-input-wrap">
            <input type={show2 ? "text" : "password"} placeholder="••••••••"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <button type="button" className="fp-eye" onClick={() => setShow2(!show2)}>
              <EyeIcon open={show2} />
            </button>
          </div>
        </div>
        {error && <div className="fp-error">{error}</div>}
        <button type="submit" className="fp-btn" disabled={loading}>
          {loading && <span className="fp-spinner" />}
          {loading ? "جاري الحفظ..." : "حفظ كلمة المرور الجديدة"}
        </button>
      </form>
    </>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [done, setDone] = useState(false);

  if (done) return (
    <div className="fp-wrapper">
      <div className="fp-card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
        <h2 style={{ color: "#111827", marginBottom: "0.5rem" }}>تم تغيير كلمة المرور!</h2>
        <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>يمكنك الآن تسجيل الدخول</p>
        <button type="button" className="fp-btn" onClick={() => navigate("/login")}>
          تسجيل الدخول
        </button>
      </div>
    </div>
  );

  return (
    <div className="fp-wrapper">
      <div className="fp-card">
        <Steps current={step} />
        {step === 1 && <StepEmail onNext={(e) => { setEmail(e); setStep(2); }} />}
        {step === 2 && <StepOTP email={email} onNext={(_, token) => { setResetToken(token); setStep(3); }} />}
        {step === 3 && <StepNewPassword resetToken={resetToken} onDone={() => setDone(true)} />}
      </div>
    </div>
  );
}