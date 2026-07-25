import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

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
import CustomerOrders from "./pages/CustomerOrders";
import CustomerMessages from "./pages/CustomerMessages";
import CustomerNotifications from "./pages/CustomerNotifications";

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

// ← الليّاوت الجديد يلي بيحتوي CustomerNavbar مرة وحدة لكل صفحات الزبون
import CustomerLayout from "./components/CustomerLayout";

export default function App() {

  // ← 2) اجلب المسار الحالي
  const location = useLocation();

  // ← 3) شرط: الويدجت يظهر بس إذا المسار الحالي يبلش بـ /seller
  const isSellerArea = location.pathname.startsWith('/seller');

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

        {/* مسارات الكاستمر — بتظهر تحت CustomerNavbar (مكتوب مرة وحدة جوا CustomerLayout) */}
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
          <Route path="/orders" element={<CustomerOrders />} />
          <Route path="/my-orders" element={<CustomerMyOrders />} />
          <Route path="/my-orders/:id" element={<CustomerOrderTracking />} />
        </Route>

        {/* مسارات الكاستمر بدون Navbar — عملية الدفع بتظهر لحالها بدون تشتيت */}
        <Route path="/checkout/review" element={<CustomerCheckoutReview />} />
        <Route path="/checkout/payment" element={<CustomerCheckoutPayment />} />
        <Route path="/checkout/confirm" element={<CustomerCheckoutConfirm />} />
        <Route path="/product-missing" element={<ProductMissing />} />
        <Route path="/checkout/failed" element={<CustomerCheckoutFailed />} />

        {/* مسارات البائع */}
        <Route path="/seller/dashboard" element={<Dashboard />} />
        <Route path="/seller/onboarding"      element={<SellerOnboarding />} />
        <Route path="/seller/profile/edit"    element={<EditStoreProfile />} />
        <Route path="/seller/account/password" element={<ChangePassword />} />
        <Route path="/seller/messages"        element={<Messages />} />
        <Route path="/store-profile" element={<StoreProfile />} />
        <Route path="/seller/orders" element={<OrdersManagement />} />
        <Route path="/seller/products" element={<ProductsList />} />
        <Route path="/seller/orders/:id" element={<OrderDetails />} />
        <Route path="/seller/ratings" element={<RatingsManagement />} />
        <Route path="/seller/notifications" element={<NotificationsPage />} />
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
    </>
  )
}