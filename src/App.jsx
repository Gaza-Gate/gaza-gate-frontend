import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import Dashboard from './pages/Dashboard'
import SplashScreen     from './pages/SplashScreen'
import Onboarding       from './pages/Onboarding'
import BuyerOnboarding  from './pages/BuyerOnboarding'
import LoginCustomer    from './pages/LoginCustomer'
import Login from          './pages/Login'
import RegisterCustomer from './pages/RegisterCustomer'
import RegisterSeller   from './pages/RegisterSeller'
import VerifyEmail      from './pages/VerifyEmail'
import ForgotPassword   from './pages/ForgotPassword'
import SellerOnboarding from './pages/SellerOnboarding'
import EditStoreProfile from './pages/EditStoreProfile'
import ChangePassword   from './pages/ChangePassword'
import Messages         from './pages/Messages'
import OrdersManagement from "./pages/OrdersManagement";
import OrderDetails from "./pages/OrderDetails";
import RatingsManagement from "./pages/RatingsManagement";
import NotificationsPage from "./pages/NotificationsPage";
import VerifyOTP from "./pages/VerifyOTP";
import CustomerCheckoutFailed from "./pages/CustomerCheckoutFailed";
import ConvertToSeller from "./pages/ConvertToSeller"; //
import ProductMissing from "./pages/ProductMissing";
import CustomerHome from "./pages/CustomerHome";
import CustomerProducts from "./pages/CustomerProducts";
import CustomerProductDetails from "./pages/CustomerProductDetails";
import CustomerCart from "./pages/CustomerCart";
import CustomerProfile from "./pages/CustomerProfile";
import CustomerCheckoutReview from "./pages/CustomerCheckoutReview";
import CustomerCheckoutPayment from "./pages/CustomerCheckoutPayment";
import CustomerCheckoutConfirm from "./pages/CustomerCheckoutConfirm";
import CustomerFavorites from "./pages/CustomerFavorites";
import CustomerMyOrders from "./pages/CustomerMyOrders";
import CustomerOrderTracking from "./pages/CustomerOrderTracking";
import CustomerMessages from "./pages/CustomerMessages";
import CustomerNotifications from "./pages/CustomerNotifications";
import CustomerStoreProfile from "./pages/CustomerStoreProfile";
import CustomerProfilePage from "./pages/CustomerProfilePage";

import { GoogleOAuthProvider } from '@react-oauth/google';
import StoreProfile from "./pages/StoreProfile";
import ProductsList from "./pages/ProductsList";
import AdminSettings from './pages/AdminSettings';
import AdminProfile from './pages/AdminProfile';
import AdminNotifications from './pages/AdminNotifications';
import AdminReports from './pages/AdminReports';
import AdminCategories from './pages/AdminCategories';
import AdminUsers from './pages/AdminUsers';
import AdminDashboard from './pages/AdminDashboard';


import FloatingChatWidget from "./components/FloatingChatWidget";
import CustomerChatWidget from "./components/CustomerChatWidget";
import RoleSwitchListener from "./components/RoleSwitchListener";

// ← الليّاوت الجديد يلي بيحتوي CustomerNavbar مرة وحدة لكل صفحات الزبون
import CustomerLayout from "./components/CustomerLayout";

// ── حراس المسارات (Route Guards) ──
import RequireSeller from "./components/RequireSeller";
import RequireCustomer from "./components/RequireCustomer";
// AuthSuccess ما عاد مستخدم — كان للـ OAuth callback القديم
// (الآن في googleAuth.js بنعمل كل شي client-side)

// ── صفحات المشتري (الزبون) يلي بيظهر فيها الـ CustomerChatWidget ──
// ✅ استثنينا صفحات البروفايل العمومي (public view-only) حتى لو الزائر بائع
//    أو حتى مش مسجّل — الـ widget لازم يظهر فقط للزائر اللي وضعه customer.
const CUSTOMER_AREA_PREFIXES = [
  "/home/customer",
  "/products",
  "/product/",
  "/cart",
  "/favorites",
  "/orders",
  "/my-orders",
  "/checkout/",
  "/messages",
  "/notifications",
  "/product-missing",
];

// صفحات public view-only (بروفايل مشتري / بروفايل متجر) —
// ما بدها widget، وما بدها role switch، وبدها تتشاف بنفس الشكل للجميع.
const PUBLIC_VIEW_ONLY_PATTERNS = [
  /^\/profile\/customer\/[^/]+$/i, // /profile/customer/:id
  /^\/customer\/profile\/[^/]+$/i, // /customer/profile/:id
  /^\/store\/[^/]+$/i,            // /store/:sellerId
  /^\/customer\/store\/[^/]+$/i,  // /customer/store/:sellerId
];

function isPublicViewOnly(pathname) {
  return PUBLIC_VIEW_ONLY_PATTERNS.some((rx) => rx.test(pathname));
}

function isCustomerPath(pathname) {
  return CUSTOMER_AREA_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export default function App() {

  // ← 2) اجلب المسار الحالي
  const location = useLocation();

  // ✅ نقرأ الـ role عشان نقرر مين بيشوف الـ CustomerChatWidget
  //    (بائع، أدمن، زائر = ما بدهم widget حتى لو المسار /profile/customer/...)
  const { currentRole } = useAuth();

  // ← 3) شرط: الويدجت يظهر بس إذا المسار الحالي يبلش بـ /seller
  const isSellerArea = location.pathname.startsWith('/seller');
  // ✅ الـ CustomerChatWidget يظهر فقط للزائر اللي دوره customer
  //    * مش للضيوف، ومش للبائعين، ومش للأدمن
  //    * ومش على الصفحات public view-only (بروفايل/متجر)
  const isCustomerArea =
    currentRole === 'customer' &&
    isCustomerPath(location.pathname) &&
    !isPublicViewOnly(location.pathname);

  return (
    <>
      <Routes>

        {/* الشاشة الترحيبية تظهر أولاً عند فتح التطبيق */}
        <Route path="/" element={<SplashScreen />} />

        {/* بعد انتهاء الـ SplashScreen يتم التوجيه لهذا المسار */}
        <Route path="/onboarding" element={<Onboarding />} />

        <Route path="/onboarding/customer"  element={<BuyerOnboarding />} />
        <Route path="/login/customer"       element={<LoginCustomer />} />
        <Route path="/login/seller" element={<Login />} />
        <Route path="/register/customer"    element={<RegisterCustomer />} />
        <Route path="/register/seller"      element={<RegisterSeller />} />
        <Route path="/verify-email"         element={<VerifyEmail />} />
        <Route path="/forgot-password"      element={<ForgotPassword />} />

        {/* مسارات الكاستمر — كلها محمية بـ RequireCustomer */}
        <Route element={<RequireCustomer />}>
          <Route element={<CustomerLayout />}>
            <Route path="/customer/become-seller" element={<ConvertToSeller />} />
            <Route path="/messages" element={<CustomerMessages />} />
            <Route path="/notifications" element={<CustomerNotifications />} />
            <Route path="/home/customer" element={<CustomerHome />} />
            <Route path="/products" element={<CustomerProducts />} />
            <Route path="/product/:id" element={<CustomerProductDetails />} />
            <Route path="/cart" element={<CustomerCart />} />
            <Route path="/profile/customer" element={<CustomerProfile />} />
            <Route path="/favorites" element={<CustomerFavorites />} />
            <Route path="/my-orders" element={<CustomerMyOrders />} />
            <Route path="/my-orders/:id" element={<CustomerOrderTracking />} />
            <Route path="/customer/store" element={<CustomerStoreProfile />} />
            <Route path="/customer/store/:sellerId" element={<CustomerStoreProfile />} />
          </Route>
        </Route>

        {/* ──────────────────────────────────────────────────────────
            صفحات Public View-Only (بدون role switch، بدون layout)
            ──────────────────────────────────────────────────────────
            الهدف: أي زائر (بائع / مشتري آخر / زائر غير مسجّل) يقدر يفتح
            بروفايل المشتري بنفس الشكل تماماً، بدون أن يتحول دوره إلى
            customer، وبدون أن يتأثر الـ AuthContext / Session.

            الـ onClick handlers في:
              - OrdersManagement.jsx
              - OrderDetails.jsx
              - Messages.jsx
              - RatingsManagement.jsx
              - Dashboard.jsx
            كلها تنادي customerProfilePath(person) بترجع
            /profile/customer/:customerId أو /customer/profile/:customerId
        */}
        <Route path="/customer/profile/:customerId" element={<CustomerProfilePage />} />
        <Route path="/profile/customer/:customerId" element={<CustomerProfilePage />} />

        {/* مسارات الكاستمر بدون Navbar — عملية الدفع بتظهر لحالها بدون تشتيت */}
        <Route path="/checkout/review" element={<CustomerCheckoutReview />} />
        <Route path="/checkout/payment" element={<CustomerCheckoutPayment />} />
        <Route path="/checkout/confirm" element={<CustomerCheckoutConfirm />} />
        <Route path="/product-missing" element={<ProductMissing />} />
        <Route path="/checkout/failed" element={<CustomerCheckoutFailed />} />

        {/* مسارات البائع — كلها محمية بـ RequireSeller */}
        <Route element={<RequireSeller />}>
          <Route path="/seller/dashboard" element={<Dashboard />} />
          <Route path="/seller/profile/edit"    element={<EditStoreProfile />} />
          <Route path="/seller/account/password" element={<ChangePassword />} />
          <Route path="/seller/messages"        element={<Messages />} />
          <Route path="/store-profile" element={<StoreProfile />} />
          <Route path="/seller/orders" element={<OrdersManagement />} />
          <Route path="/seller/products" element={<ProductsList />} />
          <Route path="/seller/orders/:id" element={<OrderDetails />} />
          <Route path="/seller/ratings" element={<RatingsManagement />} />
          <Route path="/seller/notifications" element={<NotificationsPage />} />
        </Route>
        {/* مسارات البائع يلي ما بدها حماية (onboarding + public store view) */}
        <Route path="/seller/onboarding"      element={<SellerOnboarding />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/store/:sellerId" element={<StoreProfile />} />
        {/* مسارات الأدمن */}
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
        <Route path="/admin/notifications" element={<AdminNotifications />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* أي رابط غير موجود يتم توجيهه للبداية */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>

      {/* ← 4) الويدجت هون، برا الـ Routes، وبيظهر بس لما isSellerArea تكون true */}
      {isSellerArea && <FloatingChatWidget />}

      {/* ✅ ويدجت الزبون — بيظهر بس للزائر اللي دوره customer، وعلى صفحات الزبون فقط
          (مش على صفحات public view-only زي بروفايل/متجر) */}
      {isCustomerArea && <CustomerChatWidget />}

      {/* ✅ RoleSwitchOverlay — بيظهر أثناء تبديل الدور (customer ↔ seller)
          سكلتون يحاكي الـ layout الجديد، بدون layout shift */}
      <RoleSwitchListener />
    </>
  )
}