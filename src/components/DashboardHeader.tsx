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
      className="px-8 py-5 flex items-center justify-between"
      style={{
        background: "var(--iwms-white)",
        borderBottom: "1px solid var(--iwms-border)",
      }}
    >
      {/* Page title */}
      <div>
        <h2
          className="text-xl font-bold tracking-tight"
          style={{ color: "var(--iwms-black)" }}
        >
          {title}
        </h2>
        {description && (
          <p
            className="text-sm mt-0.5"
            style={{ color: "rgba(11,31,58,.55)" }}
          >
            {description}
          </p>
        )}
      </div>

      {/* Right-hand controls */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          className="relative p-2 rounded-lg transition-colors hover:bg-sky-50"
          title="Notifications"
          style={{ color: "var(--iwms-navy)" }}
        >
          <Bell className="w-5 h-5" />
        </button>

        {/* Divider */}
        <div
          className="h-6 w-px"
          style={{ background: "var(--iwms-border)" }}
        />

        {/* User profile chip */}
        <div className="flex items-center gap-2.5 cursor-default select-none">
          {/* Avatar circle */}
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{
              background: "rgba(56,189,248,.15)",
              color: "var(--iwms-sky)",
              border: "1.5px solid rgba(56,189,248,.35)",
            }}
          >
            {initials}
          </div>

          <div className="text-left">
            <p
              className="font-semibold text-sm leading-tight"
              style={{ color: "var(--iwms-black)" }}
            >
              {currentUser?.name || "Loading…"}
            </p>
            <p
              className="text-xs leading-tight"
              style={{ color: "rgba(11,31,58,.50)" }}
            >
              {currentUser?.role === "intern"
                ? `Intern • ${currentUser?.internId || ""}`
                : "System Administrator"}
            </p>
          </div>

          <ChevronDown
            className="w-4 h-4 flex-shrink-0"
            style={{ color: "rgba(11,31,58,.35)" }}
          />
        </div>
      </div>
    </header>
  );
}
