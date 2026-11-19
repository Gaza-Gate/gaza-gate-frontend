// src/context/LoginPromptContext.jsx
//
// ✅ تصفّح الضيف: أي حدا بيقدر يتصفّح الرئيسية والمنتجات والمتاجر بدون login.
//    بس الأفعال (سلة، مفضلة، مراسلة، تقييم، طلبات، إشعارات...) بدها حساب مشتري.
//
// الاستخدام بأي صفحة/component:
//
//   const { requireCustomer } = useLoginPrompt();
//
//   const handleAddToCart = () => {
//     if (!requireCustomer("تضيف المنتج للسلة")) return;
//     addItem(product);
//   };
//
// requireCustomer(actionLabel):
//   - مشتري مسجّل                → true (كمّل الفعل)
//   - ضيف                        → يفتح LoginRequiredModal (دخول / حساب / إلغاء) → false
//   - بائع بيتصفّح صفحات المشتري → تنبيه "هذه الميزة للمشترين"                 → false
//
// بعد الدخول، LoginCustomer بيرجّع المستخدم لنفس الصفحة (utils/authRedirect.js).

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import LoginRequiredModal from "../components/LoginRequiredModal";
import { savePostLoginRedirect, clearPostLoginRedirect } from "../utils/authRedirect";

const LoginPromptContext = createContext(null);

export function LoginPromptProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, currentRole } = useAuth();

  // prompt = null (مسكّر) أو { variant: "guest" | "seller", actionLabel }
  const [prompt, setPrompt] = useState(null);

  const isCustomer = isAuthenticated && currentRole === "customer";

  const requireCustomer = useCallback(
    (actionLabel) => {
      if (isCustomer) return true;
      setPrompt({
        variant: isAuthenticated ? "seller" : "guest",
        actionLabel,
      });
      return false;
    },
    [isCustomer, isAuthenticated]
  );

  const closePrompt = useCallback(() => {
    clearPostLoginRedirect();
    setPrompt(null);
  }, []);

  const goToAuth = useCallback(
    (path) => {
      const from = location.pathname + location.search;
      savePostLoginRedirect(from);
      setPrompt(null);
      navigate(path, { state: { from } });
    },
    [location.pathname, location.search, navigate]
  );

  const value = useMemo(
    () => ({ requireCustomer, isCustomer, isGuest: !isAuthenticated }),
    [requireCustomer, isCustomer, isAuthenticated]
  );

  return (
    <LoginPromptContext.Provider value={value}>
      {children}
      <LoginRequiredModal
        open={Boolean(prompt)}
        variant={prompt?.variant}
        actionLabel={prompt?.actionLabel}
        onLogin={() => goToAuth("/login/customer")}
        onRegister={() => goToAuth("/register/customer")}
        onCancel={closePrompt}
      />
    </LoginPromptContext.Provider>
  );
}

export function useLoginPrompt() {
  const ctx = useContext(LoginPromptContext);
  if (!ctx) throw new Error("useLoginPrompt must be used within LoginPromptProvider");
  return ctx;
}
