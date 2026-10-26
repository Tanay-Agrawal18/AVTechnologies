"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { InternIdCardView } from "@/components/InternIdCardView";
import { SessionUser } from "@/types";
import { ArrowLeft, User, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";

export default function InternIdCardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (data?.user) {
          setUser(data.user);
        } else {
          setError("Failed to load user profile");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error loading credentials");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router]);

  return (
    <>
      <DashboardHeader
        title="Intern ID Card"
        description="Official Vyorai Digital Smart ID Card & Workspace Pass"
      />

      <main className="p-3 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation link & quick profile shortcut */}
        <div className="flex items-center justify-between">
          <Link
            href="/intern/profile"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" /> Back to My Profile
          </Link>

          <Link
            href="/intern/profile"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            Update Profile / Photo
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <Skeleton className="w-[340px] sm:w-[380px] h-[580px] rounded-[28px]" />
            <Skeleton className="w-48 h-4 rounded-md" />
          </div>
        ) : user ? (
          <div id="iwms-print-container" className="w-full">
            <InternIdCardView intern={user} />
          </div>
        ) : null}
      </main>
    </>
  );
}
