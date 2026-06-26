 import { Routes, Route, Navigate } from 'react-router-dom'

// تحديث مسارات الاستيراد لتكون من المجلد الحالي أو المجلدات المباشرة
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

import { GoogleOAuthProvider } from '@react-oauth/google';

export default function App() {

  return (

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

      {/* مسارات البائع الإضافية */}
      <Route path="/seller/onboarding"      element={<SellerOnboarding />} />
      <Route path="/seller/profile/edit"    element={<EditStoreProfile />} />
      <Route path="/seller/account/password" element={<ChangePassword />} />
      <Route path="/seller/messages"        element={<Messages />} />

      {/* أي رابط غير موجود يتم توجيهه للبداية */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>

  )
}