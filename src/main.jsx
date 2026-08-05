import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import './index.css';
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider, initTheme } from "./hooks/useTheme.jsx";

initTheme();

// نقوم بإنشاء الجذر الخاص بالتطبيق وإحاطة التطبيق بـ BrowserRouter
// لتمكين نظام التنقل بين الصفحات بشكل صحيح
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        {/* تم إضافة AuthProvider هنا ليغلف التطبيق بالكامل */}
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <App />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);