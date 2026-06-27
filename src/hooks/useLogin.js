import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginSeller } from "../services/authService";

// ================================================================
//  useLogin.js — كل منطق تسجيل الدخول هون
// ================================================================

export function useLogin() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  function validate() {
    if (!email.trim()) return "يرجى إدخال البريد الإلكتروني";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "البريد الإلكتروني غير صحيح";
    if (!password) return "يرجى إدخال كلمة المرور";
    if (password.length < 8) return "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    if (!/[A-Z]/.test(password)) return "يجب أن تحتوي على حرف كبير";
    if (!/[a-z]/.test(password)) return "يجب أن تحتوي على حرف صغير";
    if (!/[0-9]/.test(password)) return "يجب أن تحتوي على رقم";
    if (!/[^A-Za-z0-9]/.test(password)) return "يجب أن تحتوي على رمز مثل @ # $";

    return null;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
    const result = await loginSeller(email, password);
      (remember ? localStorage : sessionStorage).setItem("token", result.data.accessToken);
      setSuccess(`أهلاً ${result.data.user.name}! جاري تحويلك... ✅`);
      setTimeout(() => navigate("/seller/dashboard"), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

  return {
    email, setEmail, password, setPassword,
    remember, setRemember, showPass, setShowPass,
    loading, error, success,
    handleLogin, handleForgotPassword,
  };
}
