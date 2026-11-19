  import { Wrench } from "lucide-react";
import "./UnderDevelopmentBanner.css";

/**
 * UnderDevelopmentBanner — شريط تنبيه ثابت بأعلى أي صفحة لسا قيد التطوير.
 * يوضع مباشرة تحت الـ SellerNavbar وقبل محتوى الصفحة.
 *
 * الاستخدام:
 *   <SellerNavbar />
 *   <UnderDevelopmentBanner />
 *   <main>...</main>
 */
export default function UnderDevelopmentBanner() {
  return (
    <div className="udb-banner" dir="rtl">
      <Wrench size={15} />
      <span>هذه الميزة لا تزال تحت التطوير — الشاشة للمعاينة فقط وقد لا تعمل الإجراءات بشكل كامل</span>
    </div>
  );
}