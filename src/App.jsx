import { Routes, Route, Navigate } from 'react-router-dom'

// تحديث مسارات الاستيراد لتكون من المجلد الحالي أو المجلدات المباشرة
import SplashScreen     from './pages/SplashScreen'
import Onboarding       from './pages/Onboarding'
import BuyerOnboarding  from './pages/BuyerOnboarding'
import LoginCustomer    from './pages/LoginCustomer'
import LoginSeller      from './pages/LoginSeller'
import RegisterCustomer from './pages/RegisterCustomer'
import RegisterSeller   from './pages/RegisterSeller'
import VerifyEmail      from './pages/VerifyEmail'
import ForgotPassword   from './pages/ForgotPassword'
import { GoogleOAuthProvider } from '@react-oauth/google';
import SellerOnboarding from "./pages/SellerOnboarding"
export default function App() {
  return (
    <Routes>
      {/* الشاشة الترحيبية تظهر أولاً عند فتح التطبيق */}
      <Route path="/" element={<SplashScreen />} />
      
      {/* بعد انتهاء الـ SplashScreen يتم التوجيه لهذا المسار */}
      <Route path="/onboarding" element={<Onboarding />} />
      
      <Route path="/onboarding/customer"  element={<BuyerOnboarding />} />
      <Route path="/login/customer"       element={<LoginCustomer />} />
      <Route path="/login/seller"         element={<LoginSeller />} />
      <Route path="/register/customer"    element={<RegisterCustomer />} />
      <Route path="/register/seller"      element={<RegisterSeller />} />
      <Route path="/verify-email"         element={<VerifyEmail />} />
      <Route path="/forgot-password"      element={<ForgotPassword />} />
      <Route path="/onboarding"           element={<SellerOnboarding />} />
      {/* أي رابط غير موجود يتم توجيهه للبداية */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}