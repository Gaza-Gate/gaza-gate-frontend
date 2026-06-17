import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Onboarding from "./pages/Onboarding"
// import Dashboard from "./pages/Dashboard"
import Register from "./pages/Register"
import EditStoreProfile from "./pages/EditStoreProfile";
import ChangePassword from "./pages/ChangePassword";


 


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="*" element={<Navigate to="/" />} />
        {/* <Route path="/dashboard" element={<Dashboard />} /> */}
        <Route path="/register" element={<Register />} />
        <Route path="/seller/profile/edit" element={<EditStoreProfile />} />
         <Route path="/seller/account/password" element={<ChangePassword />} />
      </Routes>
    </BrowserRouter>
  );
}