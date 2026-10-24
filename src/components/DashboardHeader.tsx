"use client";

import { useEffect, useState } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { SessionUser } from "@/types";

interface HeaderProps {
  title: string;
  description?: string;
}

export function DashboardHeader({ title, description }: HeaderProps) {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

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
      className="px-3 py-2.5 sm:px-5 sm:py-3.5 lg:px-8 lg:py-5 transition-all"
      style={{
        background: "var(--iwms-white)",
        borderBottom: "1px solid var(--iwms-border)",
      }}
    >
      <div className="flex items-center justify-between gap-3 min-w-0">
        {/* Left: Page Title + Mobile spacer for hamburger button */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Invisible spacer so title doesn't collide with fixed hamburger button on mobile */}
          <div className="w-10 h-10 shrink-0 lg:hidden" aria-hidden="true" />
          
          <div className="min-w-0 flex-1">
            <h1
              className="text-base sm:text-xl lg:text-2xl font-bold tracking-tight truncate leading-tight"
              style={{ color: "var(--iwms-navy)" }}
              title={title}
            >
              {title}
            </h1>
            {description && (
              <p
                className="hidden sm:block text-xs lg:text-sm mt-0.5 truncate"
                style={{ color: "rgba(11,31,58,.50)" }}
                title={description}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right-hand controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Notification bell */}
          <button
            className="relative p-2 rounded-lg transition-colors hover:bg-sky-50 touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Notifications"
            aria-label="View notifications"
            style={{ color: "var(--iwms-navy)" }}
          >
            <Bell className="w-5 h-5" />
            <span
              className="absolute top-2 right-2 w-2 h-2 rounded-full"
              style={{ background: "var(--iwms-sky)" }}
            />
          </button>

          {/* Divider */}
          <div
            className="hidden sm:block h-6 w-px mx-1"
            style={{ background: "var(--iwms-border)" }}
          />

          {/* User profile chip */}
          <div className="flex items-center gap-2 sm:gap-2.5 cursor-default select-none">
            {/* Avatar circle */}
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-sky-100"
              style={{
                background: "#BAE6FD",
                color: "#0369A1",
              }}
              title={currentUser?.name || "User"}
            >
              {initials}
            </div>

            {/* Profile name - visible on tablet and desktop */}
            <div className="hidden md:block text-left max-w-[140px] lg:max-w-[180px]">
              <p
                className="font-semibold text-sm leading-tight truncate"
                style={{ color: "var(--iwms-black)" }}
              >
                {currentUser?.name || "Loading…"}
              </p>
              <p
                className="text-xs leading-tight truncate"
                style={{ color: "rgba(11,31,58,.50)" }}
              >
                {currentUser?.role === "intern"
                  ? `Intern • ${currentUser?.internId || ""}`
                  : "System Administrator"}
              </p>
            </div>

            <ChevronDown
              className="hidden md:block w-4 h-4 shrink-0"
              style={{ color: "rgba(11,31,58,.35)" }}
            />
          </div>
        </div>
      </div>

      {/* Row 2 on mobile: Description */}
      {description && (
        <div className="sm:hidden mt-2 pt-2 border-t border-slate-100/80">
          <p
            className="text-xs leading-relaxed line-clamp-2"
            style={{ color: "rgba(11,31,58,.55)" }}
          >
            {description}
          </p>
        </div>
      )}
    </header>
  );
}
