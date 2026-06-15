import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import ForgotPassword from "./ForgotPassword";
import SplashScreen from "./SplashScreen";
import Onboarding from "./pages/Onboarding"
// import Dashboard from "./pages/Dashboard"
import Register from "./pages/Register"

 


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="*" element={<Navigate to="/" />} />
        {/* <Route path="/dashboard" element={<Dashboard />} /> */}
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}