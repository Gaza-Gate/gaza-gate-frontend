import { Outlet } from "react-router-dom";
import CustomerNavbar from "../components/CustomerNavbar"; // عدّل المسار حسب مكان الملف عندك
import PWAInstallBanner from "./PWAInstallBanner"; // ✅ شريط تثبيت التطبيق

/**
 * CustomerLayout — يلف كل صفحات الزبون (المتجر، المنتجات، الطلبات...)
 * الناف بار مكتوب هون مرة وحدة بس، وكل صفحة زبون بتنعرض جوا <Outlet />
 * بدون ما تحتاج تستدعي CustomerNavbar بنفسها.
 *
 * cartCount / wishlistCount مفروض تجي من مكان مركزي (Context أو Redux أو props
 * ممررة من App)، مش من كل صفحة لحالها.
 */
export default function CustomerLayout({ cartCount = 0, wishlistCount = 0, onLogout }) {
  return (
    <>
      {/* ✅ شريط تثبيت التطبيق PWA — يظهر أعلى الصفحة */}
      <PWAInstallBanner />

      <CustomerNavbar
        logo="/assets/logo-gaza-gate.png"
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        onLogout={onLogout}
      />
      <Outlet />
    </>
  );
}