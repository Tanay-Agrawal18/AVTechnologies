"use client";

import { useEffect, useState } from "react";
import { User, Bell } from "lucide-react";
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

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>

      <div className="flex items-center gap-4">
        <button
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
        </button>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <User className="w-4 h-4" />
          </div>
          <div className="text-left text-sm">
            <p className="font-semibold text-slate-900 leading-tight">
              {currentUser?.name || "Loading..."}
            </p>
            <p className="text-xs text-slate-500 capitalize">
              {currentUser?.role === "intern"
                ? `Intern • ${currentUser?.internId || ""}`
                : "System Administrator"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
