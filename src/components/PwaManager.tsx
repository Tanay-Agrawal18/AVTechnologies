"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker in production or when supported
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((registration) => {
            // Check for updates periodically
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (
                    installingWorker.state === "installed" &&
                    navigator.serviceWorker.controller
                  ) {
                    // New update available
                    console.log("[Vyorai PWA] New update available.");
                  }
                };
              }
            };
          })
          .catch((err) => {
            console.error("[Vyorai PWA] Service worker registration failed:", err);
          });
      });
    }

    // 2. Check if already installed / standalone mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIos(isIosDevice);

    // 4. Capture beforeinstallprompt for Chrome / Chromium / Edge / Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Only show banner if user hasn't explicitly dismissed it in this session
      const dismissed = sessionStorage.getItem("vyorai_pwa_dismissed");
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. Track if installed
    const handleAppInstalled = () => {
      console.log("[Vyorai PWA] App was successfully installed");
      setDeferredPrompt(null);
      setShowBanner(false);
      setIsStandalone(true);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("vyorai_pwa_dismissed", "true");
  };

  // If already standalone or user dismissed, don't show the persistent install banner
  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* Installation Banner */}
      {showBanner && (
        <aside
          role="region"
          aria-label="App Installation"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 bg-[#0B1F3A] text-white p-4 rounded-2xl shadow-2xl border border-sky-400/20 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-sm">
              <img
                src="/icons/icon-192.png"
                alt="Vyorai App Icon"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Install Vyorai App
              </h2>
              <p className="text-xs text-sky-100/80 mt-0.5 leading-snug">
                Install Vyorai for seamless offline-ready access to your tasks and projects.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#38BDF8] hover:bg-[#0284C7] active:scale-95 text-[#0B1F3A] hover:text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install Now
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-2.5 py-1.5 text-xs text-sky-200/70 hover:text-white transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install banner"
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* iOS Add to Home Screen Instructions Modal */}
      {showIosGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#0B1F3A]" />
                <h3 id="ios-modal-title" className="text-base font-bold text-[#0B1F3A]">
                  Install on iOS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                aria-label="Close iOS guide"
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Apple Safari does not allow automatic install prompts. To install <strong>Vyorai</strong> to your iPhone or iPad:
            </p>
            <ol className="text-xs text-slate-700 space-y-2.5 list-decimal list-inside bg-slate-50 p-3 rounded-xl border border-slate-100">
              <li className="leading-relaxed">
                Tap the <Share className="w-3.5 h-3.5 inline mx-1 text-sky-600" /> <strong>Share</strong> button in Safari's bottom toolbar.
              </li>
              <li className="leading-relaxed">
                Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong>.
              </li>
              <li className="leading-relaxed">
                Tap <strong>&quot;Add&quot;</strong> in the top-right corner.
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="mt-4 w-full py-2 bg-[#0B1F3A] text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
