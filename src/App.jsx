import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import {
  shouldShowFloatingThemeToggle,
  shouldShowSellerChatWidget,
  shouldShowCustomerChatWidget,
  isHomeRoute,
} from './utils/visibility'

// ✅ مسارات الـ Auth & Initial — سابقاً كانت تُغلَّف بـ AuthShell بخلفية كحلية.
//    الآن كل الشاشات ديناميكية مع الثيم (ThemeProvider + CSS variables).
//    لم نعد نضيف class "auth-shell" على الـ body — المتغيرات العامة (--bg-page)
//    تتكفّل بتغيير الخلفية بين الفاتح والكحلي بحسب الثيم.
const AUTH_SHELL_PATHS = [
  '/',
  '/onboarding',
  '/onboarding/customer',
  '/seller/onboarding',
  '/login/customer',
  '/login/seller',
  '/register/customer',
  '/register/seller',
  '/verify-email',
  '/verify-otp',
  '/forgot-password',
]

function isAuthShellPath(pathname) {
  if (pathname === '/' || pathname.startsWith('/?')) return true
  return AUTH_SHELL_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

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
import SellerNotifications from "./pages/SellerNotifications";
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

// ✅ زر تبديل الثيم العائم (FAB) — يظهر من Onboarding وما بعده
import FloatingThemeToggle from "./components/FloatingThemeToggle";

// ── حراس المسارات (Route Guards) ──
import RequireSeller from "./components/RequireSeller";
import RequireCustomer from "./components/RequireCustomer";
import RequireAdmin from "./components/RequireAdmin";
// AuthSuccess ما عاد مستخدم — كان للـ OAuth callback القديم
// (الآن في googleAuth.js بنعمل كل شي client-side)

// ── صفحات المشتري (الزبون) يلي بيظهر فيها الـ CustomerChatWidget ──
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
  /^\/customer\/store$/i,         // /customer/store (بدون id)
];

function isPublicViewOnly(pathname) {
  return PUBLIC_VIEW_ONLY_PATTERNS.some((rx) => rx.test(pathname));
}

function isCustomerPath(pathname) {
  return CUSTOMER_AREA_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

/**
 * ✅ ScrollToTop
 * ─────────────────────────────────────────────────────────
 * بعد أي navigation، بنرجّع السكرول لأعلى الصفحة.
 *   - يمنع ظهور "صفحة بيضاء" أو scroll position قديم من الدور السابق
 *     (مثلاً: المستخدم كان بآخر /my-orders كبائع، بعد التحويل لـ customer
 *      يروح لـ /home/customer — بدون ScrollToTop السكرول رح يفضل تحت).
 *   - instant: ما في animation، السكرول يصير فوراً.
 *   - بنستثني الـ Splash ("/") لأنه بيشتغل أول مرة.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (typeof window === "undefined") return;
    // بنستثني الـ Splash لأنه بيشتغل animation منظّم
    if (pathname === "/") return;
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [pathname]);
  return null;
}

export default function App() {
  // ← 2) اجلب المسار الحالي
  const location = useLocation();

  // ✅ نقرأ الـ role عشان نقرر مين بيشوف الـ CustomerChatWidget
  //    (بائع، أدمن، زائر = ما بدهم widget حتى لو المسار /profile/customer/...)
  const { currentRole } = useAuth();

  // ← 3) شرط: الويدجت يظهر بس إذا المسار الحالي يبلش بـ /seller
  //    (مُستبدل بشرط مركزي: يظهر فقط في الـ Seller Home عبر visibility.js)
  const isSellerArea = shouldShowSellerChatWidget(location.pathname);
  // ✅ الـ CustomerChatWidget يظهر فقط للزائر اللي دوره customer
  //    * مش للضيوف، ومش للبائعين، ومش للأدمن
  //    * فقط على الـ Customer Home (route-based central)
  //    * ومش على الصفحات public view-only (بروفايل/متجر)
  const isCustomerArea =
    currentRole === 'customer' &&
    shouldShowCustomerChatWidget(location.pathname) &&
    !isPublicViewOnly(location.pathname);

  // ✅ زر تبديل الثيم العائم (FAB)
  //    • مركزي عبر visibility.js → يظهر فقط في الـ Home (Customer/Seller)
  //    • z-index عالي (10000) فيطفو فوق كل المحتوى
  //    • السلوك القديم: location.pathname !== '/' (ما عدا Splash)
  //      — حافظنا على هذا عبر helper (يرجع false على "/").
  const showFloatingThemeToggle = shouldShowFloatingThemeToggle(location.pathname);

  // ملاحظة: isHomeRoute محجوز للقراءة/الاختبار — لا حاجة لاستخدامه هنا
  void isHomeRoute;

  return (
    <>
      {/* ✅ ScrollToTop — يضمن إنو كل navigation يبدأ من فوق
          (يمنع scroll position قديم / صفحات بيضاء فجائية) */}
      <ScrollToTop />

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

        {/* مسارات الكاستمر — كلها محمية بـ RequireCustomer
            الـ guard بيعرض FullPageLoading + الـ RoleSwitchOverlay
            بيغطي الشاشة أثناء أي تبديل دور. */}
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
          </Route>
        </Route>

        {/* ──────────────────────────────────────────────────────────
            صفحات Public View-Only (بدون role switch، بدون layout)
            ──────────────────────────────────────────────────────────
            الهدف: أي زائر (بائع / مشتري آخر / زائر غير مسجّل) يقدر يفتح
            بروفايل المتجر أو بروفايل المشتري بنفس الشكل تماماً.

            - CustomerStoreProfile (صفحة المتجر): standalone page، تتعامل
              مع دور الزائر داخلياً عبر useAuth() — تخفي/تعطّل زر المراسلة
              للبائع، وتبقيه فعّالاً للمشتري والزائر.
            - CustomerProfilePage (بروفايل المشتري): نفس الفكرة.
        */}
        <Route path="/customer/store" element={<CustomerStoreProfile />} />
        <Route path="/customer/store/:sellerId" element={<CustomerStoreProfile />} />
        <Route path="/customer/profile/:customerId" element={<CustomerProfilePage />} />
        <Route path="/profile/customer/:customerId" element={<CustomerProfilePage />} />

        {/* مسارات الكاستمر بدون Navbar — عملية الدفع بتظهر لحالها بدون تشتيت */}
        <Route path="/checkout/review" element={<CustomerCheckoutReview />} />
        <Route path="/checkout/payment" element={<CustomerCheckoutPayment />} />
        <Route path="/checkout/confirm" element={<CustomerCheckoutConfirm />} />
        <Route path="/product-missing" element={<ProductMissing />} />
        <Route path="/checkout/failed" element={<CustomerCheckoutFailed />} />

        {/* مسارات البائع — كلها محمية بـ RequireSeller
            الـ guard بيعرض FullPageLoading + الـ RoleSwitchOverlay. */}
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
          <Route path="/seller/notifications" element={<SellerNotifications />} />
        </Route>
        {/* مسارات البائع يلي ما بدها حماية (onboarding + public store view) */}
        <Route path="/seller/onboarding"      element={<SellerOnboarding />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/store/:sellerId" element={<StoreProfile />} />
        {/* مسارات الأدمن — كلها محمية بـ RequireAdmin */}
        <Route element={<RequireAdmin />}>
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/profile" element={<AdminProfile />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>

        {/* أي رابط غير موجود يتم توجيهه للبداية */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>

      {/* ← 4) الويدجت هون، برا الـ Routes، وبيظهر بس لما isSellerArea تكون true */}
      {isSellerArea && <FloatingChatWidget />}

      {/* ✅ ويدجت الزبون — بيظهر بس للزائر اللي دوره customer، وعلى صفحات الزبون فقط
          (مش على صفحات public view-only زي بروفايل/متجر) */}
      {isCustomerArea && <CustomerChatWidget />}

      {/* ✅ زر تبديل الثيم العائم (FAB) — bottom-right
          • يظهر من Onboarding وما بعده (مش على Splash "/")
          • z-index: 10000 (فوق كل المحتوى)
          • يبدّل بين Light/Dark بنقرة واحدة */}
      {showFloatingThemeToggle && <FloatingThemeToggle />}

      {/* ✅ RoleSwitchOverlay — بيظهر أثناء تبديل الدور (customer ↔ seller)
          z-index: 9999 (فوق FullPageLoading اللي بـ 1000، وتحت الـ FAB بـ 10000)
          سكلتون يحاكي الـ layout الجديد، بدون layout shift. */}
      <RoleSwitchListener />
    </>
  )
}
