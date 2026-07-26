// src/components/RequireSeller.jsx
//
// حارس لطرق البائع.
//   - ما في session → يوجّه لـ /login/customer
//   - مسجل دخول بس ما عندوش متجر → يوجّه لـ /customer/become-seller
//   - عنده متجر → يعرض الـ children
//
// ملاحظة: ما عاد في isBootstrapping لأن AuthContext صار يقرأ localStorage
// بشكل sync لحظة الـ mount (مش async /me). فالنتيجة جاهزة من أول render.

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./RequireSeller.css";

export default function RequireSeller({ children }) {
  const { hasSellerProfile, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login/customer"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  if (!hasSellerProfile) {
    return (
      <Navigate
        to="/customer/become-seller"
        state={{ from: location.pathname, reason: "no_seller_profile" }}
        replace
      />
    );
  }

  return children;
}
