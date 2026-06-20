import { useLogin } from "../hooks/useLogin";
import { Link } from 'react-router-dom';
import "./Login.css";
import { useGoogleLogin } from '@react-oauth/google';
import { sellerGoogleLogin } from "../services/authService";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const EyeIcon = ({ open }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9ca3af" strokeWidth="2">
    {open ? (
      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
    ) : (
      <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
    )}
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9ca3af" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/>
  </svg>
);

export default function Login() {
  const {
    email, setEmail,
    password, setPassword,
    remember, setRemember,
    showPass, setShowPass,
    loading, error, success,
    handleLogin,
    handleForgotPassword,
  } = useLogin();

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const data = await sellerGoogleLogin(tokenResponse.access_token);
        console.log(data);
      } catch (err) {
        console.log(err);
      }
    },
    onError: () => {
      console.log('فشل تسجيل الدخول بجوجل');
    }
  });

  return (
    <div className="lp-wrapper">
      <div className="lp-card">

        <div className="lp-header">
          <h1>مرحباً بك من جديد 👋</h1>
          <p>ادخل بياناتك للوصول للوحة التحكم</p>
        </div>

        <form className="lp-form" onSubmit={handleLogin} noValidate>

          <div className="lp-field">
            <label>البريد الالكتروني</label>
            <div className="lp-input-wrap">
              <input type="email" placeholder="Store@gemit.com" value={email}
                onChange={(e) => setEmail(e.target.value)} autoComplete="email"/>
              <span className="lp-input-icon"><MailIcon /></span>
            </div>
          </div>

          <div className="lp-field">
            <label>كلمة المرور</label>
            <div className="lp-input-wrap">
              <input type={showPass ? "text" : "password"} placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"/>
              <button type="button" className="lp-input-icon"
                onClick={() => setShowPass(!showPass)}>
                <EyeIcon open={showPass} />
              </button>
            </div>
          </div>

          <div className="lp-opts">
            <label className="lp-remember">
              <input type="checkbox" checked={remember}
                onChange={(e) => setRemember(e.target.checked)} />
              تذكرني
            </label>
            <button type="button" className="lp-forgot"
              onClick={handleForgotPassword} disabled={loading}>
              نسيت كلمة المرور؟
            </button>
          </div>

          {error   && <div className="lp-error">{error}</div>}
          {success && <div className="lp-success">{success}</div>}

          <button type="submit" className="lp-btn-submit" disabled={loading}>
            {loading && <span className="lp-spinner" />}
            {loading ? "جاري الدخول..." : "تسجيل دخول"}
          </button>

        </form>

        <div className="lp-divider">أو</div>

        <div className="lp-socials">
          <button className="lp-social-btn" type="button" onClick={() => handleGoogleLogin()}>
            <GoogleIcon />
            متابعة باستخدام Google
          </button>
        </div>

        <p className="lp-signup">
          لا يوجد عندك حساب؟ <Link to="/register/seller">إنشاء حساب</Link>
        </p>
      </div>
    </div>
  );
}