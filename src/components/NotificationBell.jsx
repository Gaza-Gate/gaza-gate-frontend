// src/components/NotificationBell.jsx
//
// جرس الإشعارات الموحّد — يستخدمه كل من CustomerNavbar و SellerNavbar.
//
// ✅ يفتح NotificationDropdown (نافذة منبثقة) بدل صفحة منفصلة
// ✅ العداد: جاي من useNotificationCount(role) — معزول حسب الدور
// ✅ click-outside: الـ dropdown يقفل تلقائياً
// ✅ ESC: يقفل الـ dropdown
//
// 🔑 الميزة الأساسية: عزل صارم حسب الدور (Role-based Isolation)
//   - المكون يستقبل `role="customer"` أو `role="seller"` كـ prop
//   - داخلياً يستخدم `useNotificationCount(role)` →
//     العداد بيكون صفر دائماً لو الـ currentRole مش مطابق
//
// 📍 مسار النقر على الإشعار (موحّد عبر notificationRoutes.js):
//   - إشعار تقييم للزبون → /product/:id?reviewId=...
//   - إشعار تقييم للبائع → /seller/products?productId=...
//     (ProductsList عنده useEffect يفتح ProductDetailsModal تلقائياً)
//   - إشعار تقييم بدون productId → /seller/ratings (قسم التقييمات)
//   - إشعار طلب/رسالة/آخر → الراوت المخصص حسب النوع

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNotificationCount } from "../hooks/useNotificationCount";
import NotificationDropdown from "./NotificationDropdown";
import "./NotificationBell.css";

const LABEL_BY_ROLE = {
  customer: "الإشعارات",
  seller: "الإشعارات",
};

export default function NotificationBell({ role, iconColor = "currentColor" }) {
  // ✅ الهوك بيعزل العداد حسب الدور — لا تقلق من الـ leak
  const { count, loading } = useNotificationCount(role);
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef(null);

  const label = LABEL_BY_ROLE[role] || "الإشعارات";

  function handleClick() {
    setIsOpen((prev) => !prev);
  }

  function handleClose() {
    setIsOpen(false);
  }

  // ✅ ESC يقفل
  useEffect(() => {
    if (!isOpen) return undefined;
    function onKey(e) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <>
      <button
        ref={anchorRef}
        className={`nb-bell ${isOpen ? "nb-bell--active" : ""}`}
        onClick={handleClick}
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={label}
        data-bell-role={role}
      >
        <Bell size={20} color={isOpen ? "#f97316" : iconColor} />
        {!loading && count > 0 && (
          <span className="nb-badge" aria-label={`${count} إشعار غير مقروء`}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* ✅ النافذة المنبثقة — تظهر فوق الواجهة بدون تحويل لصفحة */}
      <NotificationDropdown
        isOpen={isOpen}
        onClose={handleClose}
        role={role}
        anchorRef={anchorRef}
      />
    </>
  );
}
