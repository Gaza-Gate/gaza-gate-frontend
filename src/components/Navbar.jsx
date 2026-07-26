// src/components/Navbar.jsx
//
// Navbar موحّد بيقرأ currentRole و hasSellerProfile من AuthContext
// وبيقرر شو يعرض:
//   - غير مسجل → زر "تسجيل الدخول"
//   - مسجل + عنده متجر → SwitchRoleButton (يفصل بشكل ذكي بناءً على الـ profile)
//   - مسجل + ما عندوش متجر → زر "كن بائعًا" يفتح BecomeSellerForm
//
// ملاحظة: ما عاد في isBootstrapping لأن AuthContext صار يقرأ localStorage
// بشكل sync لحظة الـ mount.

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Heart, PackageSearch, LayoutDashboard, Boxes, Store } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import SwitchRoleButton from "./SwitchRoleButton";
import BecomeSellerForm from "./BecomeSellerForm";
import "./Navbar.css";

// روابط وضع المشتري
const CUSTOMER_LINKS = [
  { to: "/products", label: "المنتجات", icon: PackageSearch },
  { to: "/cart", label: "السلة", icon: ShoppingCart },
  { to: "/favorites", label: "المفضلة", icon: Heart },
];

// روابط وضع البائع
const SELLER_LINKS = [
  { to: "/seller/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/seller/products", label: "منتجاتي", icon: Boxes },
];

export default function Navbar() {
  const location = useLocation();
  const { currentRole, hasSellerProfile, isAuthenticated } = useAuth();
  const [showBecomeSellerForm, setShowBecomeSellerForm] = useState(false);

  const links = currentRole === "seller" ? SELLER_LINKS : CUSTOMER_LINKS;

  return (
    <>
      <nav className="gn-nav" dir="rtl">
        <Link to="/" className="gn-logo">
          Gaza Gate
        </Link>

        <div className="gn-links">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`gn-link ${location.pathname.startsWith(to) ? "gn-link-active" : ""}`}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </div>

        <div className="gn-actions">
          {!isAuthenticated ? (
            <Link to="/login" className="gn-login-btn">
              تسجيل الدخول
            </Link>
          ) : hasSellerProfile ? (
            // عنده متجر أصلاً → Smart switch button يفصل تلقائياً
            <SwitchRoleButton />
          ) : (
            // ما عندوش متجر بعد → زر يفتح فورم إنشاء المتجر
            <button
              type="button"
              className="gn-become-seller-btn"
              onClick={() => setShowBecomeSellerForm(true)}
            >
              <Store size={16} />
              كن بائعًا
            </button>
          )}
        </div>
      </nav>

      {showBecomeSellerForm && (
        <BecomeSellerForm onClose={() => setShowBecomeSellerForm(false)} />
      )}
    </>
  );
}
