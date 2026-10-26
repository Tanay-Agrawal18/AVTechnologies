"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Building2,
  GraduationCap,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface VerificationData {
  verified: boolean;
  idStatus: "active" | "inactive" | "expired" | "pending_setup";
  statusLabel: string;
  intern: {
    name: string;
    internId?: string;
    department?: string;
    designation?: string;
    college?: string;
    profilePicture?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  };
  verifiedAt: string;
  error?: string;
}

export default function VerificationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<VerificationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/verify/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to verify credential");
        }
        setData(json);
      })
      .catch((err) => {
        setErrorMessage(
          err instanceof Error ? err.message : "Verification failed"
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <header className="max-w-xl mx-auto w-full flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-white p-1.5 shadow-sm border border-slate-200 flex items-center justify-center">
            <img
              src="/image.png"
              alt="Vyorai"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-[#0B1F3A] leading-tight">
              Vyorai Technologies
            </h1>
            <p className="text-[10px] tracking-widest uppercase font-bold text-sky-500">
              Identity & Credential Gateway
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
          <Sparkles className="w-3 h-3 text-sky-600" />
          Official Audit
        </span>
      </header>

      {/* Main Verification Card */}
      <main className="max-w-xl mx-auto w-full my-auto py-6">
        {isLoading ? (
          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-200/80 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center mx-auto animate-spin">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              Verifying Smart Pass Credential...
            </h2>
            <p className="text-xs text-slate-500">
              Querying cryptographic signatures and live directory records.
            </p>
          </div>
        ) : errorMessage || !data ? (
          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-rose-200 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 mb-2">
                VERIFICATION FAILED
              </span>
              <h2 className="text-xl font-extrabold text-slate-900">
                Invalid or Expired Credential
              </h2>
              <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                {errorMessage ||
                  "The verification token provided is either corrupt, expired, or has not been recognized by our authority registry."}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0B1F3A] hover:bg-[#071527] transition-colors"
              >
                Go to Portal Login
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 sm:p-9 shadow-xl border border-slate-200/90 space-y-6 relative overflow-hidden">
            {/* Background ambient corner mesh */}
            <div
              className="absolute -top-16 -right-16 w-60 h-60 rounded-full opacity-30 pointer-events-none blur-2xl"
              style={{
                background: data.verified
                  ? "radial-gradient(circle, #38BDF8 0%, transparent 70%)"
                  : "radial-gradient(circle, #f43f5e 0%, transparent 70%)",
              }}
            />

            {/* Verification Status Header */}
            <div className="text-center space-y-3">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-md ${
                  data.verified
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-amber-50 text-amber-600 border border-amber-200"
                }`}
              >
                {data.verified ? (
                  <CheckCircle2 className="w-9 h-9" />
                ) : (
                  <AlertTriangle className="w-9 h-9" />
                )}
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider mb-2 border shadow-2xs">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      data.verified
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-amber-500"
                    }`}
                  />
                  <span
                    className={
                      data.verified ? "text-emerald-700" : "text-amber-700"
                    }
                  >
                    {data.statusLabel}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#0B1F3A]">
                  Verified Identity Record
                </h2>
                <p className="text-xs text-slate-500">
                  Confirmed through Vyorai Secure ID Authority Gateway
                </p>
              </div>
            </div>

            {/* Profile Section */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl bg-sky-50/60 border border-sky-100">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white border-2 border-sky-300 shadow-md shrink-0">
                {data.intern.profilePicture ? (
                  <img
                    src={data.intern.profilePicture}
                    alt={data.intern.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-[#0B1F3A] to-sky-900 text-sky-200 font-bold text-2xl">
                    {data.intern.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="text-center sm:text-left flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-extrabold text-[#0B1F3A] truncate">
                  {data.intern.name}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                  {data.intern.designation}
                </p>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-sky-200 text-xs font-mono font-bold text-[#0B1F3A] shadow-2xs">
                  <span className="text-sky-500 text-[10px] uppercase">ID</span>
                  <span>{data.intern.internId || "VYOR-26-XX"}</span>
                </div>
              </div>
            </div>

            {/* Key Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Department
                </span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                  {data.intern.department}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Academic Affiliation
                </span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                  {data.intern.college || "Authorized Associate"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Validity Start
                </span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                  {data.intern.startDate
                    ? new Date(data.intern.startDate).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" }
                      )
                    : "Active Term"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Validity Expiry
                </span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                  {data.intern.endDate
                    ? new Date(data.intern.endDate).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" }
                      )
                    : "End of Term"}
                </span>
              </div>
            </div>

            {/* Official Audit Verification Footer */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
              <span className="font-mono">
                Scanned Timestamp: {new Date(data.verifiedAt).toLocaleTimeString()}
              </span>
              <span className="font-semibold text-sky-600">
                Vyorai Verified Smart Pass
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-xl mx-auto w-full text-center text-xs text-slate-400 pt-4">
        © {new Date().getFullYear()} Vyorai Technologies Pvt Ltd. All rights reserved.
      </footer>
    </div>
  );
}
