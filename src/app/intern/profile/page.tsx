"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SessionUser } from "@/types";
import { User, Shield, Mail, Hash, Calendar } from "lucide-react";

export default function InternProfilePage() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      });
  }, []);

  return (
    <>
      <DashboardHeader
        title="My Profile"
        description="Your verified identity, assignment parameters, and security credentials"
      />

      <main className="p-8 max-w-2xl space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-200">
            <div className="h-14 w-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl">
              {user?.name ? user.name[0] : "I"}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">{user?.name}</h3>
              <p className="text-xs text-slate-500 capitalize">{user?.role} Account</p>
            </div>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-400" /> Intern ID
              </span>
              <span className="font-mono font-semibold text-slate-800">
                {user?.internId || "N/A"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" /> Work Email
              </span>
              <span className="font-medium text-slate-800">{user?.email}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-400" /> Account Status
              </span>
              <span className="font-semibold text-emerald-600 capitalize">
                {user?.status}
              </span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
