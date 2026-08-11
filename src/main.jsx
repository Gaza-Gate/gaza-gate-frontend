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

// ── PWA Service Worker Registration ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[App] SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('[App] SW registration failed:', error);
      });
  });
}

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