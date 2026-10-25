"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SessionUser } from "@/types";
import { Shield, Mail, Hash } from "lucide-react";

export default function InternProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          router.push("/login?error=inactive");
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, [router]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "I";

  return (
    <>
      <DashboardHeader
        title="My Profile"
        description="Your verified identity, assignment parameters, and security credentials"
      />

      <main className="p-3 sm:p-5 lg:p-8 max-w-2xl space-y-4 sm:space-y-6">
        <div
          className="iwms-card p-4 sm:p-7 space-y-4 sm:space-y-6"
          style={{ borderRadius: "16px" }}
        >
          {/* Avatar + name */}
          <div
            className="flex items-center gap-3 sm:gap-4 pb-4 sm:pb-6"
            style={{ borderBottom: "1px solid var(--iwms-border)" }}
          >
            <div
              className="h-10 w-10 sm:h-14 sm:w-14 rounded-full flex items-center justify-center font-bold text-base sm:text-xl shrink-0"
              style={{
                background: "rgba(56,189,248,.15)",
                color: "var(--iwms-sky)",
                border: "2px solid rgba(56,189,248,.30)",
              }}
            >
              {initials}
            </div>
            <div>
              <h3
                className="font-bold text-sm sm:text-lg"
                style={{ color: "var(--iwms-black)" }}
              >
                {user?.name || "Loading…"}
              </h3>
              <p
                className="text-[10px] sm:text-xs mt-0.5 capitalize"
                style={{ color: "rgba(11,31,58,.50)" }}
              >
                {user?.role} Account
              </p>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-2 sm:space-y-4 text-xs sm:text-sm">
            {/* Intern ID */}
            <div
              className="flex items-center justify-between py-2.5 sm:py-3 gap-2"
              style={{ borderBottom: "1px solid rgba(11,31,58,.07)" }}
            >
              <span
                className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm"
                style={{ color: "rgba(11,31,58,.55)" }}
              >
                <Hash
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                  style={{ color: "var(--iwms-sky)" }}
                />
                Intern ID
              </span>
              <span
                className="font-mono font-semibold text-xs sm:text-sm"
                style={{ color: "var(--iwms-black)" }}
              >
                {user?.internId || "N/A"}
              </span>
            </div>

            {/* Email */}
            <div
              className="flex items-center justify-between py-2.5 sm:py-3 gap-2"
              style={{ borderBottom: "1px solid rgba(11,31,58,.07)" }}
            >
              <span
                className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm shrink-0"
                style={{ color: "rgba(11,31,58,.55)" }}
              >
                <Mail
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                  style={{ color: "var(--iwms-sky)" }}
                />
                Work Email
              </span>
              <span
                className="font-medium text-[11px] sm:text-sm truncate max-w-[200px] sm:max-w-none text-right"
                style={{ color: "var(--iwms-black)" }}
                title={user?.email}
              >
                {user?.email}
              </span>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between py-2.5 sm:py-3 gap-2">
              <span
                className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm"
                style={{ color: "rgba(11,31,58,.55)" }}
              >
                <Shield
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                  style={{ color: "var(--iwms-sky)" }}
                />
                Account Status
              </span>
              <span
                className="font-semibold capitalize px-2 sm:px-3 py-0.5 rounded-full text-[10px] sm:text-xs"
                style={
                  user?.status === "active"
                    ? {
                        background: "rgba(16,185,129,.12)",
                        color: "#059669",
                        border: "1px solid rgba(16,185,129,.25)",
                      }
                    : {
                        background: "rgba(239,68,68,.12)",
                        color: "#DC2626",
                        border: "1px solid rgba(239,68,68,.25)",
                      }
                }
              >
                {user?.status || "Loading…"}
              </span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
