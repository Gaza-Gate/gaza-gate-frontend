// src/hooks/useLogin.js
//
// Hook لتسجيل دخول البائع (النسخة الخفيفة من Login.jsx — لصفحات ثانية).
//
// ✅ تم إصلاح:
//   - result.data.user.name  → user.firstName (الباك بيرجّع firstName, مش name)
//   - كان ما بيستدعي login() من AuthContext → الـ React state ما كان
//     ينحدّث فوراً. الآن بنمرر user + accessToken صراحةً.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { extractToken, extractUser } from "../utils/authSession";

export function useLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.sellerLogin({ email, password });
      const token = extractToken(res.data);
      const user = extractUser(res.data);
      if (!token || !user) throw new Error("استجابة الخادم غير مكتملة");

      // ✅ مرّر user + accessToken للـ login() — React state و localStorage
      //    ينحدّثوا فوراً، بدون page reload
      login({ user, accessToken: token });

      // ✅ firstName وليس name (الباك بيرجّع firstName/lastName)
      const firstName = user.firstName || user.name || "بك";
      setSuccess(`أهلاً ${firstName}! جاري تحويلك...`);
      setTimeout(() => navigate("/seller/dashboard"), 800);
    } catch (err) {
      setError(
        err?.response?.data?.data?.message ||
          err?.response?.data?.message ||
          err.message ||
          "فشل تسجيل الدخول"
      );
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
