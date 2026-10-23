"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SessionUser } from "@/types";
import { Shield, Mail, Hash } from "lucide-react";

export default function InternProfilePage() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      });
  }, []);

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

      <main className="p-8 max-w-2xl space-y-6">
        <div
          className="iwms-card p-7 space-y-6"
          style={{ borderRadius: "16px" }}
        >
          {/* Avatar + name */}
          <div
            className="flex items-center gap-4 pb-6"
            style={{ borderBottom: "1px solid var(--iwms-border)" }}
          >
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0"
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
                className="font-bold text-lg"
                style={{ color: "var(--iwms-black)" }}
              >
                {user?.name || "Loading…"}
              </h3>
              <p
                className="text-xs mt-0.5 capitalize"
                style={{ color: "rgba(11,31,58,.50)" }}
              >
                {user?.role} Account
              </p>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4 text-sm">
            {/* Intern ID */}
            <div
              className="flex items-center justify-between py-3"
              style={{ borderBottom: "1px solid rgba(11,31,58,.07)" }}
            >
              <span
                className="flex items-center gap-2"
                style={{ color: "rgba(11,31,58,.55)" }}
              >
                <Hash
                  className="w-4 h-4"
                  style={{ color: "var(--iwms-sky)" }}
                />
                Intern ID
              </span>
              <span
                className="font-mono font-semibold"
                style={{ color: "var(--iwms-black)" }}
              >
                {user?.internId || "N/A"}
              </span>
            </div>

            {/* Email */}
            <div
              className="flex items-center justify-between py-3"
              style={{ borderBottom: "1px solid rgba(11,31,58,.07)" }}
            >
              <span
                className="flex items-center gap-2"
                style={{ color: "rgba(11,31,58,.55)" }}
              >
                <Mail
                  className="w-4 h-4"
                  style={{ color: "var(--iwms-sky)" }}
                />
                Work Email
              </span>
              <span
                className="font-medium"
                style={{ color: "var(--iwms-black)" }}
              >
                {user?.email}
              </span>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between py-3">
              <span
                className="flex items-center gap-2"
                style={{ color: "rgba(11,31,58,.55)" }}
              >
                <Shield
                  className="w-4 h-4"
                  style={{ color: "var(--iwms-sky)" }}
                />
                Account Status
              </span>
              <span
                className="font-semibold capitalize px-3 py-0.5 rounded-full text-xs"
                style={{
                  background: "rgba(16,185,129,.12)",
                  color: "#059669",
                  border: "1px solid rgba(16,185,129,.25)",
                }}
              >
                {user?.status}
              </span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
