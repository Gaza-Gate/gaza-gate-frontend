// src/components/NotificationBell.jsx
//
// جرس الإشعارات الموحّد — يستخدمه كل من CustomerNavbar و SellerNavbar.
//
// 🔑 الميزة الأساسية: عزل صارم حسب الدور (Role-based Isolation)
//   - المكون يستقبل `role="customer"` أو `role="seller"` كـ prop
//   - داخلياً يستخدم `useNotificationCount(role)` →
//     العداد بيكون صفر دائماً لو الـ currentRole مش مطابق
//   - يعني: لو المستخدم وضعه seller → جرس الـ seller فقط يعرض
//     ولو انتقل لوضع customer → جرس الـ customer يعرض بعداد جديد
//
// ✅ لا نحتاج لتمرير count كـ prop — المكون يجيبه لحاله
// ✅ لا نحتاج لتمرير onClick كـ prop — بيمرر للـ navigate للـ path الصحيح
// ✅ أيقونة + badge + handler — كل شي self-contained

import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNotificationCount } from "../hooks/useNotificationCount";
import "./NotificationBell.css";

const ROUTE_BY_ROLE = {
  customer: "/notifications",
  seller: "/seller/notifications",
};

const LABEL_BY_ROLE = {
  customer: "الإشعارات",
  seller: "الإشعارات",
};

export default function NotificationBell({ role, iconColor = "#374151" }) {
  // ✅ الهوك بيعزل العداد حسب الدور — لا تقلق من الـ leak
  const { count, loading } = useNotificationCount(role);
  const navigate = useNavigate();
  const target = ROUTE_BY_ROLE[role] || "/notifications";
  const label = LABEL_BY_ROLE[role] || "الإشعارات";

  function handleClick() {
    navigate(target);
  }

  return (
    <button
      className="nb-bell"
      onClick={handleClick}
      aria-label={label}
      title={label}
      data-bell-role={role}
    >
      <Bell size={20} color={iconColor} />
      {!loading && count > 0 && (
        <span className="nb-badge" aria-label={`${count} إشعار غير مقروء`}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
