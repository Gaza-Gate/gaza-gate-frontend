import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import SellerOnboarding from "./pages/SellerOnboarding"
 import Register from "./pages/Register"
import EditStoreProfile from "./pages/EditStoreProfile";
import ChangePassword from "./pages/ChangePassword";
import Messages from "./pages/Messages";



 


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<SellerOnboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/seller/profile/edit" element={<EditStoreProfile />} />
         <Route path="/seller/account/password" element={<ChangePassword />} />
         <Route path="/seller/messages" element={<Messages />} />
      </Routes>
    </BrowserRouter>
  );
}