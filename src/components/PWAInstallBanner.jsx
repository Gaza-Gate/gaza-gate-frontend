import { useEffect, useState } from 'react';
import { X, Download, Smartphone, ChevronDown } from 'lucide-react';
import usePWAInstallationState from '../hooks/usePWAInstallationState';
import './PWAInstallBanner.css';

/**
 * PWAInstallBanner
 * 
 * A dismissible banner that invites users to install the PWA.
 * - Positioned at the very top of the page (above navbar)
 * - RTL-aware with Arabic text
 * - Non-intrusive and can be dismissed
 * 
 * @param {Object} props
 * @param {boolean} props.forceShow - Force show the banner (for testing)
 */
export default function PWAInstallBanner({ forceShow = false }) {
  const { isVisible, install, dismiss } = usePWAInstallationState();
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // Handle dismiss with animation
  const handleDismiss = () => {
    setIsAnimatingOut(true);
    // Wait for animation to complete before hiding
    setTimeout(() => {
      dismiss();
      setIsAnimatingOut(false);
    }, 300);
  };

  // Handle install
  const handleInstall = async () => {
    await install();
  };

  // Don't render if not visible (unless forced for testing)
  if (!isVisible && !forceShow) return null;

  // Don't render if animating out
  if (isAnimatingOut) return null;

  return (
    <div className="pwa-banner" role="banner" aria-label="تثبيت التطبيق">
      <div className="pwa-banner__content">
        {/* Download Icon */}
        <div className="pwa-banner__icon">
          <div className="pwa-banner__icon-cloud">
            <ChevronDown size={16} className="pwa-banner__arrow" />
          </div>
          <Smartphone size={20} className="pwa-banner__icon-phone" />
        </div>

        {/* Arabic Text */}
        <div className="pwa-banner__text">
          <p className="pwa-banner__title">
            استمتع بتجربة تسوق أسرع وأسهل!
          </p>
          <p className="pwa-banner__subtitle">
            حمّل تطبيق غزة جيت الآن
            <span className="pwa-banner__optional">(خيار اختياري)</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pwa-banner__actions">
          <button
            className="pwa-banner__btn-install"
            onClick={handleInstall}
            aria-label="تنزيل التطبيق"
          >
            <Download size={16} />
            <span>تنزيل التطبيق</span>
          </button>

          <button
            className="pwa-banner__btn-dismiss"
            onClick={handleDismiss}
            aria-label="إغلاق"
          >
            <X size={16} />
            <span>ربما لاحقاً</span>
          </button>
        </div>
      </div>
    </div>
  );
}
