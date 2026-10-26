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
  AlertTriangle,
  FolderGit2,
  CheckSquare,
  Award,
  Download,
  Globe,
  Link2,
  FileCheck,
} from "lucide-react";

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  status: string;
  startDate?: string;
  dueDate?: string;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface VerificationData {
  verified: boolean;
  idStatus: "active" | "completed" | "inactive" | "pending_setup";
  isInternshipCompleted: boolean;
  statusLabel: string;
  intern: {
    name: string;
    internId?: string;
    department?: string;
    designation?: string;
    college?: string;
    bio?: string;
    githubUrl?: string;
    linkedinUrl?: string;
    profilePicture?: string;
    startDate?: string;
    endDate?: string;
    certificateUrl?: string | null;
    status?: string;
  };
  projects: ProjectItem[];
  tasksSummary: {
    total: number;
    completed: number;
    inProgress: number;
  };
  recentTasks: TaskItem[];
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
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50 flex flex-col justify-between p-3 sm:p-6 lg:p-8">
      {/* ── Header ── */}
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between pb-4 border-b border-slate-200">
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

        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs">
          <Sparkles className="w-3 h-3 text-sky-600" />
          Official Audit
        </span>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-2xl mx-auto w-full my-auto py-6">
        {isLoading ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200/80 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center mx-auto animate-spin">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              Verifying Smart Pass Credential...
            </h2>
            <p className="text-xs text-slate-500">
              Querying cryptographic signatures, projects, and live verification records.
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
          <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-xl border border-slate-200/90 space-y-6 relative overflow-hidden">
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
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider mb-2 border shadow-2xs">
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
                  Official Intern Public Profile
                </h2>
                <p className="text-xs text-slate-500">
                  Confirmed through Vyorai Secure ID Authority Gateway
                </p>
              </div>
            </div>

            {/* ── Intern Profile Card ── */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl bg-sky-50/60 border border-sky-100">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-white border-2 border-sky-300 shadow-md shrink-0">
                {data.intern.profilePicture ? (
                  <img
                    src={data.intern.profilePicture}
                    alt={data.intern.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-[#0B1F3A] to-sky-900 text-sky-200 font-bold text-3xl">
                    {data.intern.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="text-center sm:text-left flex-1 min-w-0 space-y-1">
                <h3 className="text-lg sm:text-xl font-extrabold text-[#0B1F3A] truncate">
                  {data.intern.name}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-slate-600">
                  {data.intern.designation}
                </p>
                <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-lg bg-white border border-sky-200 text-xs font-mono font-bold text-[#0B1F3A] shadow-2xs">
                    <span className="text-sky-500 text-[10px] uppercase">ID</span>
                    <span>{data.intern.internId || "VYOR-26-XX"}</span>
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-sky-100 text-sky-800 text-[11px] font-bold">
                    {data.intern.department}
                  </span>
                </div>

                {data.intern.bio && (
                  <p className="text-xs text-slate-600 pt-1 line-clamp-2">
                    {data.intern.bio}
                  </p>
                )}

                {/* Social Links */}
                {(data.intern.githubUrl || data.intern.linkedinUrl) && (
                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                    {data.intern.githubUrl && (
                      <a
                        href={data.intern.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
                        title="GitHub Profile"
                      >
                        <Globe className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {data.intern.linkedinUrl && (
                      <a
                        href={data.intern.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-sky-700 transition-colors"
                        title="LinkedIn Profile"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Key Metadata Grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                  Department
                </span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                  {data.intern.department}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                  Institution
                </span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                  {data.intern.college || "Tech Associate"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                  Start Date
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

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                  End Date
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

            {/* ── INTERNSHIP CERTIFICATE SECTION (When End Date Reached or Drive link provided) ── */}
            {data.isInternshipCompleted && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-sky-50 to-emerald-50 border border-amber-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        Internship Completion Certificate
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Official Vyorai Technologies Certified Document
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    COMPLETED
                  </span>
                </div>

                {data.intern.certificateUrl ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-amber-200/60">
                    <p className="text-xs text-slate-600 font-medium">
                      Certificate is available for public verification and download via Google Drive.
                    </p>
                    <a
                      href={data.intern.certificateUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0B1F3A] hover:bg-[#071527] transition-all active:scale-95 shadow-sm shrink-0"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                      View Certificate (Drive)
                    </a>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-amber-200/60 flex items-center gap-2 text-xs text-slate-500">
                    <FileCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Internship term completed. Verified digital certificate drive link is being processed by HR.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── PROJECTS WORKED ON (Live collaborative projects) ── */}
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-sky-600" />
                  <h4 className="text-sm font-bold text-[#0B1F3A]">
                    Projects Worked On
                  </h4>
                </div>
                <span className="text-xs text-slate-400 font-semibold">
                  {data.projects.length} {data.projects.length === 1 ? "Project" : "Projects"}
                </span>
              </div>

              {data.projects.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  No public team projects linked yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {data.projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-3.5 rounded-xl bg-white border border-sky-100 shadow-2xs hover:border-sky-300 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-xs font-bold text-slate-900 truncate">
                          {proj.title}
                        </h5>
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
                          {proj.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {proj.description || "Contributed to core development and deliverables."}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── TASKS CONTRIBUTION SUMMARY ── */}
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-sky-600" />
                  <h4 className="text-sm font-bold text-[#0B1F3A]">
                    Task Deliverables & Contributions
                  </h4>
                </div>
                <span className="text-xs text-emerald-600 font-bold">
                  {data.tasksSummary.completed} Approved Tasks
                </span>
              </div>

              {data.recentTasks.length > 0 && (
                <div className="space-y-1.5">
                  {data.recentTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-slate-800 truncate pr-2">
                        {t.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                          t.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : t.status === "in_progress"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {t.status.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Official Audit Verification Footer ── */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
              <span className="font-mono">
                Verified at: {new Date(data.verifiedAt).toLocaleTimeString()}
              </span>
              <span className="font-semibold text-sky-600">
                Official Vyorai ID Authority Gateway
              </span>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="max-w-2xl mx-auto w-full text-center text-xs text-slate-400 pt-4">
        © {new Date().getFullYear()} Vyorai Technologies Pvt Ltd. All rights reserved.
      </footer>
    </div>
  );
}

