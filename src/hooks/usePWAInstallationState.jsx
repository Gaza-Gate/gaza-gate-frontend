import { useState, useEffect, useCallback } from 'react';

/**
 * usePWAInstallationState
 * 
 * Custom hook to manage PWA installation prompt state.
 * - Listens for the `beforeinstallprompt` event
 * - Tracks whether the user has dismissed the banner
 * - Handles the installation flow
 * 
 * @returns {Object} {
 *   canInstall: boolean,          // true if beforeinstallprompt event fired
 *   isVisible: boolean,          // true if banner should be shown
 *   isInstalled: boolean,        // true if app is running as installed PWA
 *   install: () => Promise<void>, // trigger the install prompt
 *   dismiss: () => void,         // hide the banner (persisted to localStorage)
 *   resetDismissal: () => void,  // allow showing banner again (for testing)
 * }
 */
export function usePWAInstallationState() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem('pwa-install-dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [isInstalled, setIsInstalled] = useState(false);

  // Check if running as installed PWA (standalone mode)
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = window.navigator.standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkInstalled();

    // Listen for display-mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e) => setIsInstalled(e.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the default mini-infobar
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Check if app can be installed (条件满足时才显示)
  const canInstall = deferredPrompt !== null && !isInstalled;

  // Check if banner should be visible
  const isVisible = canInstall && !isDismissed;

  // Trigger the install prompt
  const install = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user's choice
      const { outcome } = await deferredPrompt.userChoice;

      console.log(`User response to install prompt: ${outcome}`);

      // Clear the deferred prompt - we can only use it once
      setDeferredPrompt(null);

      // If user accepted, hide the banner
      if (outcome === 'accepted') {
        setIsDismissed(true);
        try {
          localStorage.setItem('pwa-install-dismissed', 'true');
        } catch {
          // localStorage might not be available
        }
      }
    } catch (err) {
      console.error('Error during PWA installation:', err);
    }
  }, [deferredPrompt]);

  // Dismiss the banner (persist to localStorage)
  const dismiss = useCallback(() => {
    setIsDismissed(true);
    try {
      localStorage.setItem('pwa-install-dismissed', 'true');
    } catch {
      // localStorage might not be available
    }
  }, []);

  // Reset dismissal (for testing or user preference)
  const resetDismissal = useCallback(() => {
    setIsDismissed(false);
    try {
      localStorage.removeItem('pwa-install-dismissed');
    } catch {
      // localStorage might not be available
    }
  }, []);

  return {
    canInstall,
    isVisible,
    isInstalled,
    install,
    dismiss,
    resetDismissal,
  };
}

export default usePWAInstallationState;
