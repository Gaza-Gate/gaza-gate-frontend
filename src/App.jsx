import { Routes, Route, Navigate } from 'react-router-dom'

import Dashboard from './pages/Dashboard'
import SplashScreen     from './pages/SplashScreen'
import Onboarding       from './pages/Onboarding'
import BuyerOnboarding  from './pages/BuyerOnboarding'
import LoginCustomer    from './pages/LoginCustomer'
import Login from './pages/Login'
import RegisterCustomer from './pages/RegisterCustomer'
import RegisterSeller   from './pages/RegisterSeller'
import VerifyEmail      from './pages/VerifyEmail'
import ForgotPassword   from './pages/ForgotPassword'
import SellerOnboarding from './pages/SellerOnboarding'
import EditStoreProfile from './pages/EditStoreProfile'
import ChangePassword   from './pages/ChangePassword'
import Messages         from './pages/Messages'
// استبدل السطر القديم بهذا السطر:
import OrdersManagement from "./pages/Ordersmanagement";
import OrderDetails from "./pages/Orderdetails";
import RatingsManagement from "./pages/RatingsManagement";
import NotificationsPage from "./pages/NotificationsPage";
import VerifyOTP from "./pages/Verifyotp";
import CustomerHome from "./pages/CustomerHome";   // ✅ إضافة جديدة

import { GoogleOAuthProvider } from '@react-oauth/google';
import StoreProfile from "./pages/StoreProfile";
import ProductsList from "./pages/ProductsList";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SplashScreen />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/onboarding/customer"  element={<BuyerOnboarding />} />
      <Route path="/login/customer"       element={<LoginCustomer />} />
      <Route path="/login/seller" element={<Login />} />
      <Route path="/register/customer"    element={<RegisterCustomer />} />
      <Route path="/register/seller"      element={<RegisterSeller />} />
      <Route path="/verify-email"         element={<VerifyEmail />} />
      <Route path="/forgot-password"      element={<ForgotPassword />} />

      {/* ✅ راوت المشتري بعد تسجيل الدخول */}
      <Route path="/home/customer" element={<CustomerHome />} />

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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}