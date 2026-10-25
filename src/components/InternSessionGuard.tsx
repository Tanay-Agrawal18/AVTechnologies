"use client";

import { useEffect } from "react";

export function InternSessionGuard() {
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.status === 401 || res.status === 403) {
          // Immediately log out and redirect to login page
          window.location.href = "/login?error=inactive";
          return;
        }

        const data = await res.json();
        if (data?.user?.status && data.user.status !== "active") {
          window.location.href = "/login?error=inactive";
        }
      } catch (err) {
        console.error("Session verification failed:", err);
      }
    };

    // Check immediately on mount/page navigation
    verifySession();

    // Check every 4 seconds so that any deactivation in admin panel logs the intern out immediately
    const timer = setInterval(verifySession, 4000);

    // Also check whenever user switches back to the tab/window
    const onFocus = () => verifySession();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      isMounted = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  return null;
}
