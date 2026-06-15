import { useState } from "react";
import { useNavigate } from "react-router-dom";
 
// ================================================================
//  useLogin.js — كل منطق تسجيل الدخول هون
// ================================================================

const BASE_URL = "http://localhost:5000";
 
async function loginWithEmail(email, password) {
  const res = await fetch(`http://localhost:5000/api/auth/seller/local/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "حدث خطأ");
  return data;
}
  
    
 
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
      const data = await loginWithEmail(email, password);
      (remember ? localStorage : sessionStorage).setItem("token", data.token);
      setSuccess(`أهلاً ${data.user.name}! جاري تحويلك... ✅`);
       navigate("/dashboard")  
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
 
  const handleForgotPassword = async () => {
    if (!email.trim()) { setError("أدخل بريدك أولاً"); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "حدث خطأ");
      setSuccess("تم إرسال رابط الاستعادة على بريدك ✅");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
 
  return {
    email, setEmail, password, setPassword,
    remember, setRemember, showPass, setShowPass,
    loading, error, success,
    handleLogin, handleForgotPassword,
  };
}