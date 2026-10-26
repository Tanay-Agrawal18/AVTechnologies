"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { InternIdCardView } from "@/components/InternIdCardView";
import { IUser } from "@/types";
import { ArrowLeft, Edit2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";

export default function AdminInternIdCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [intern, setIntern] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/interns/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load intern details");
        return res.json();
      })
      .then((data) => {
        if (data?.intern) {
          setIntern(data.intern);
        } else {
          setError("Intern record not found");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error loading intern");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  return (
    <>
      <DashboardHeader
        title={intern ? `${intern.name}'s ID Card` : "Intern ID Card"}
        description="Official Vyorai ID Smart Pass & Credential Preview"
      />

      <main className="p-3 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/admin/interns/${id}`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" /> Back to Intern Details
          </Link>

          {intern && (
            <Link
              href={`/admin/interns/${id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Edit Intern Info
            </Link>
          )}
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
        ) : intern ? (
          <div id="iwms-print-container" className="w-full">
            <InternIdCardView intern={intern} />
          </div>
        ) : null}
      </main>
    </>
  );
}
