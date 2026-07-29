import React from "react";
import { X } from "lucide-react";
import "./ConvertToBuyerModal.css";

const ConvertToBuyerModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="cbm-overlay" onClick={onClose}>
      <div className="cbm-card" onClick={(e) => e.stopPropagation()}>
        <button className="cbm-close-btn" onClick={onClose} aria-label="إغلاق" disabled={isLoading}>
          <X size={18} />
        </button>

        <span className="cbm-eyebrow">التحويل لحساب المشتري</span>

        <p className="cbm-intro">
          متجرك ومنتجاتك محفوظة، وتقدر ترجع لوضع البائع في أي وقت.
        </p>

        <h4 className="cbm-question">ماذا سيتغيّر؟</h4>

        <ul className="cbm-list">
          <li>ستظهر لك واجهة التسوق والمنتجات.</li>
          <li>سلتك وطلباتك القديمة لا تزال موجودة.</li>
          <li>لن ترى لوحة البائع أو الطلبات الواردة مؤقتًا.</li>
        </ul>

        {/* ✅ لا نص "جاري التحويل" — الـ RoleSwitchOverlay العالمي هو المسؤول الوحيد
            الزر بيظهر disabled فقط، الـ overlay بيغطي الشاشة أثناء التبديل */}
        <button className="cbm-confirm-btn" onClick={onConfirm} disabled={isLoading}>
          نعم، تحول لمشتري
        </button>
      </div>
    </div>
  );
};

export default ConvertToBuyerModal;