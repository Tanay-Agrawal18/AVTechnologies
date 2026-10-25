"use client";

import { useEffect, useState } from "react";
import { Bell, ChevronDown, Menu } from "lucide-react";
import { SessionUser } from "@/types";

interface HeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function DashboardHeader({ title, description, action }: HeaderProps) {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkAuth = () => {
      fetch("/api/auth/me")
        .then((res) => {
          if (res.status === 401 || res.status === 403) {
            window.location.href = "/login?error=inactive";
            return null;
          }
          return res.ok ? res.json() : null;
        })
        .then((data) => {
          if (isMounted && data?.user) setCurrentUser(data.user);
        })
        .catch(() => {});
    };

    checkAuth();
    // Periodic check every 15 seconds to immediately catch admin deactivations
    const interval = setInterval(checkAuth, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const triggerSidebar = () => {
    window.dispatchEvent(new CustomEvent("iwms:toggle-sidebar"));
  };

  /* Derive initials for the avatar */
  const initials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <header
      className="sticky top-0 z-30 px-3.5 py-2.5 sm:px-6 sm:py-3.5 lg:px-8 lg:py-4 transition-all bg-white/95 backdrop-blur-md"
      style={{
        borderBottom: "1px solid var(--iwms-border)",
      }}
    >
      <div className="flex items-center justify-between gap-2.5 sm:gap-4 min-w-0">
        {/* Left: Mobile Menu Button + Page Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Integrated Hamburger Button for Mobile */}
          <button
            onClick={triggerSidebar}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 rounded-xl transition-all duration-150 hover:bg-slate-100 active:scale-95 shrink-0 flex items-center justify-center text-slate-700 hover:text-slate-900"
            style={{
              border: "1px solid var(--iwms-border)",
              background: "rgba(248, 250, 252, 0.8)",
            }}
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
          </button>

          <div className="min-w-0 flex-1">
            <h1
              className="text-sm sm:text-lg lg:text-xl font-bold tracking-tight truncate leading-tight"
              style={{ color: "var(--iwms-navy)" }}
              title={title}
            >
              {title}
            </h1>
            {description && (
              <p
                className="hidden md:block text-[11px] lg:text-xs mt-0.5 truncate"
                style={{ color: "rgba(11,31,58,.50)" }}
                title={description}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions, Notifications & Profile Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {action && <div className="hidden sm:flex items-center gap-2 mr-1">{action}</div>}

          {/* Notification bell */}
          <button
            className="relative p-2 rounded-xl transition-colors hover:bg-slate-100 active:scale-95 text-slate-600 hover:text-slate-900"
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white"
              style={{ background: "var(--iwms-sky)" }}
            />
          </button>

          {/* User profile button / chip */}
          <div className="flex items-center gap-2 pl-1 sm:pl-2">
            {/* Avatar circle */}
            <div
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-sky-200/70 shadow-xs"
              style={{
                background: "linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)",
                color: "#0369A1",
              }}
              title={currentUser?.name || "User"}
            >
              {initials}
            </div>

            {/* Profile name - visible on tablet and desktop */}
            <div className="hidden md:block text-left max-w-[130px] lg:max-w-[180px]">
              <p
                className="font-semibold text-xs lg:text-sm leading-tight truncate"
                style={{ color: "var(--iwms-black)" }}
              >
                {currentUser?.name || "Loading…"}
              </p>
              <p
                className="text-[10px] lg:text-[11px] leading-tight truncate mt-0.5"
                style={{ color: "rgba(11,31,58,.50)" }}
              >
                {currentUser?.role === "intern"
                  ? `Intern • ${currentUser?.internId || ""}`
                  : "Administrator"}
              </p>
            </div>

            <ChevronDown
              className="hidden md:block w-3.5 h-3.5 shrink-0"
              style={{ color: "rgba(11,31,58,.35)" }}
            />
          </div>
        </div>
      </div>

      {/* Row 2 on mobile: Subtitle / Description (compact) */}
      {description && (
        <div className="md:hidden mt-1.5 pt-1.5 border-t border-slate-100">
          <p
            className="text-[11px] leading-snug line-clamp-1"
            style={{ color: "rgba(11,31,58,.50)" }}
          >
            {description}
          </p>
        </div>
      )}
    </header>
  );
}
