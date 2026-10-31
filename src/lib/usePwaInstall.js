import { useState, useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * PWA install hook — captures the beforeinstallprompt event (Chrome/Android)
 * and detects iOS Safari (which uses manual "Add to Home Screen").
 *
 * Returns:
 *   canInstall      — true when the browser fired beforeinstallprompt (Android/Chrome)
 *   isIOS           — true on iOS Safari (no programmatic install)
 *   isInstalled     — true when already running as standalone PWA
 *   promptInstall() — triggers the native install prompt (returns promise)
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed)
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true;
    setIsInstalled(standalone);

    // iOS Safari detection (but not if already standalone)
    const ua = window.navigator.userAgent || "";
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    setIsIOS(isIOSDevice && isSafari && !standalone);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      trackEvent("pwa_install_prompted");
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      trackEvent("pwa_installed");
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return { outcome: "unavailable" };
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return { outcome };
  };

  return {
    canInstall: !!deferredPrompt,
    isIOS,
    isInstalled,
    promptInstall,
  };
}