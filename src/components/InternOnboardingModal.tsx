"use client";

import { useState, useEffect, useCallback } from "react";
import { SessionUser } from "@/types";
import {
  Sparkles,
  LayoutDashboard,
  CheckSquare,
  FileText,
  UploadCloud,
  Bell,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  ChevronRight,
  UserCheck,
  GraduationCap,
  Globe,
  Phone,
  Shield,
} from "lucide-react";

interface InternOnboardingModalProps {
  user: SessionUser;
  isOpen: boolean;
  onClose: (completed: boolean) => void;
}

interface StepContent {
  title: string;
  badge: string;
  headline: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  keyPoints: string[];
  tips?: string;
  linkPreview?: {
    label: string;
    path: string;
  };
}

const WALKTHROUGH_STEPS: StepContent[] = [
  {
    title: "Intern Workspace Overview",
    badge: "1 of 6 • Dashboard",
    headline: "Your centralized workspace for daily productivity",
    description:
      "The Intern Dashboard provides instant visibility into your assigned roster, pending tasks, approved deliverables, and active announcements.",
    icon: LayoutDashboard,
    iconBg: "rgba(56,189,248,.12)",
    iconColor: "var(--iwms-sky)",
    keyPoints: [
      "KPI summary cards show tasks in 'To Do', 'In Progress', 'Under Review', and 'Approved'.",
      "Recent announcements and operational banners keep you informed of team updates.",
      "Direct shortcuts to quick start your next assigned deliverable with one click.",
    ],
    tips: "Check your overview each morning to plan your day's deliverables.",
    linkPreview: {
      label: "View Dashboard Overview",
      path: "/intern/dashboard",
    },
  },
  {
    title: "My Tasks & Work Roster",
    badge: "2 of 6 • Tasks",
    headline: "Find and organize all work assigned by your supervisor",
    description:
      "All assignments given to you appear under 'My Tasks', sorted by priority, due date, and current progress stage.",
    icon: CheckSquare,
    iconBg: "rgba(11,31,58,.08)",
    iconColor: "var(--iwms-navy)",
    keyPoints: [
      "Filter by status: Assigned, In Progress, Submitted, Changes Requested, or Approved.",
      "Clear priority tags (Urgent, High, Medium, Low) help you prioritize urgent deadlines.",
      "Visible due date badges alert you when deadlines are approaching.",
    ],
    tips: "Tasks with 'Urgent' or 'High' priority should always be completed first.",
    linkPreview: {
      label: "Browse My Tasks",
      path: "/intern/tasks",
    },
  },
  {
    title: "Task Details & Guidelines",
    badge: "3 of 6 • Task Details",
    headline: "Read deliverable specifications and upload daily progress snapshots",
    description:
      "Click into any task to view complete guidelines, acceptance criteria, timeline milestones, and start active work.",
    icon: FileText,
    iconBg: "rgba(14,165,233,.12)",
    iconColor: "#0284C7",
    keyPoints: [
      "Click 'Start Working' to transition an assigned task to 'In Progress'.",
      "Read detailed deliverable briefs and technical instructions from your supervisor.",
      "Upload daily proof-of-work snapshots (retained for 24 hours) to document daily progress.",
    ],
    tips: "Always read all deliverable guidelines before beginning implementation.",
  },
  {
    title: "Submit Work Deliverables",
    badge: "4 of 6 • Submissions",
    headline: "Submit your work notes, repository, or live demo URLs",
    description:
      "When your work is ready, use the built-in submission form on the Task Details page to hand off deliverables for supervisor review.",
    icon: UploadCloud,
    iconBg: "rgba(16,185,129,.12)",
    iconColor: "#10B981",
    keyPoints: [
      "Provide clear deliverable notes explaining what was implemented and how to test it.",
      "Attach external URLs such as GitHub pull requests, staging links, or Figma files.",
      "Once submitted, your task moves to 'Under Review' for admin review.",
    ],
    tips: "Double-check your repository permissions so supervisors can easily inspect your PRs.",
  },
  {
    title: "Notifications & Reminders",
    badge: "5 of 6 • Notifications",
    headline: "Stay updated on assignments, reviews, and approaching deadlines",
    description:
      "The bell icon in the top header keeps you informed in real time whenever an event happens on your account.",
    icon: Bell,
    iconBg: "rgba(245,158,11,.12)",
    iconColor: "#D97706",
    keyPoints: [
      "Receive notifications when new tasks are assigned to you.",
      "Get deadline reminders for approaching and overdue deliverables.",
      "Receive instant alerts when a supervisor approves your work or asks for revisions.",
    ],
    tips: "Click on any notification dropdown item to jump straight to the relevant task.",
  },
  {
    title: "Feedback & Revisions",
    badge: "6 of 6 • Feedback",
    headline: "Inspect supervisor feedback and submit updated revisions seamlessly",
    description:
      "If changes are requested, the task returns with a clear 'Changes Requested' status and detailed supervisor feedback.",
    icon: MessageSquare,
    iconBg: "rgba(239,68,68,.12)",
    iconColor: "#EF4444",
    keyPoints: [
      "Supervisor notes appear highlighted with an 'Action Required' revision banner.",
      "Make the requested adjustments based on the exact feedback provided.",
      "Submit Version 2+ with updated deliverable notes and revised repository links.",
    ],
    tips: "Revisions are reviewed promptly. Address feedback directly for fast approvals.",
  },
];

export function InternOnboardingModal({
  user,
  isOpen,
  onClose,
}: InternOnboardingModalProps) {
  // Navigation: 0 = Welcome screen, 1-6 = Walkthrough steps, 7 = Optional Quick Profile Setup
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Optional profile setup fields (pre-filled with existing data if present)
  const [phone, setPhone] = useState(user.phone || "");
  const [college, setCollege] = useState(user.college || "");
  const [githubUrl, setGithubUrl] = useState(user.githubUrl || "");
  const [linkedinUrl, setLinkedinUrl] = useState(user.linkedinUrl || "");
  const [bio, setBio] = useState(user.bio || "");

  const persistOnboarding = useCallback(
    async (action: "finish" | "skip", saveProfile = false) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const payload: {
          action: "finish" | "skip";
          phone?: string;
          college?: string;
          githubUrl?: string;
          linkedinUrl?: string;
          bio?: string;
        } = { action };

        if (saveProfile) {
          if (phone.trim()) payload.phone = phone.trim();
          if (college.trim()) payload.college = college.trim();
          if (githubUrl.trim()) payload.githubUrl = githubUrl.trim();
          if (linkedinUrl.trim()) payload.linkedinUrl = linkedinUrl.trim();
          if (bio.trim()) payload.bio = bio.trim();
        }

        const res = await fetch("/api/intern/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update onboarding state");
        }

        onClose(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error saving onboarding state");
      } finally {
        setIsSubmitting(false);
      }
    },
    [phone, college, githubUrl, linkedinUrl, bio, onClose]
  );

  const handleSkip = useCallback(() => {
    persistOnboarding("skip", false);
  }, [persistOnboarding]);

  const handleFinish = useCallback(() => {
    // Navigate to optional profile step if user wants, or finish directly
    persistOnboarding("finish", currentStep === 7);
  }, [persistOnboarding, currentStep]);

  // Handle keyboard navigation (Escape to close/skip)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleSkip]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity overflow-y-auto"
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]"
        style={{ borderColor: "var(--iwms-border)" }}
      >
        {/* Top Header Strip */}
        <div
          className="px-5 py-3.5 flex items-center justify-between border-b"
          style={{ borderColor: "var(--iwms-border)", background: "#FAFBFD" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-sky-50 border border-sky-100 overflow-hidden shrink-0">
              <img src="/image.png" alt="Vyorai" className="h-4 w-4 object-contain" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm tracking-tight" style={{ color: "var(--iwms-navy)" }}>
                Vyorai IWMS
              </span>
              <span className="text-[11px] text-slate-400 ml-1.5 hidden sm:inline">
                • Intern Orientation
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded-md transition-colors disabled:opacity-50"
            >
              Skip Orientation
            </button>
            <button
              onClick={handleSkip}
              aria-label="Close onboarding modal"
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar (Visible on steps 1-6) */}
        {currentStep >= 1 && currentStep <= 6 && (
          <div className="w-full bg-slate-100 h-1">
            <div
              className="h-1 transition-all duration-300"
              style={{
                width: `${(currentStep / 6) * 100}%`,
                background: "var(--iwms-sky)",
              }}
            />
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          {/* ═════════ SCREEN 0: WELCOME SCREEN ═════════ */}
          {currentStep === 0 && (
            <div className="space-y-6 text-center sm:text-left py-2">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                  style={{ background: "rgba(56,189,248,.15)", color: "var(--iwms-sky)" }}
                >
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 mb-1">
                    Welcome to Vyorai Technologies
                  </div>
                  <h2
                    id="onboarding-dialog-title"
                    className="text-xl sm:text-2xl font-bold tracking-tight"
                    style={{ color: "var(--iwms-navy)" }}
                  >
                    Welcome aboard, {user.name}!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-lg">
                    Your authenticated intern account is ready. Vyorai IWMS is your complete platform for managing project assignments, deliverable submissions, and supervisor feedback.
                  </p>
                </div>
              </div>

              {/* Verified Identity Summary Box */}
              <div
                className="p-4 rounded-xl border space-y-3"
                style={{ background: "var(--iwms-bg)", borderColor: "var(--iwms-border)" }}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 pb-2 border-b border-slate-200/60">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-sky-600" />
                    Verified Intern Profile
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Admin Managed
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Intern ID
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {user.internId || "Pending"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Work Email
                    </span>
                    <span className="font-medium text-slate-800 truncate block" title={user.email}>
                      {user.email}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Department
                    </span>
                    <span className="font-medium text-slate-800">
                      {user.department || "General Cohort"}
                    </span>
                  </div>
                </div>
              </div>

              {/* What You'll Learn Strip */}
              <div className="space-y-2 text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Quick Orientation Highlights
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                    <CheckSquare className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">Assigned Tasks</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Track priorities and deadlines.</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                    <UploadCloud className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">Submit Work</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Attach PRs, demos, and notes.</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                    <Bell className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">Stay Notified</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Receive review updates instantly.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ SCREENS 1-6: GUIDED WALKTHROUGH STEPS ═════════ */}
          {currentStep >= 1 && currentStep <= 6 && (
            (() => {
              const step = WALKTHROUGH_STEPS[currentStep - 1];
              const StepIcon = step.icon;

              return (
                <div className="space-y-5 py-1">
                  {/* Step Header */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: step.iconBg, color: step.iconColor }}
                    >
                      <StepIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200">
                        {step.badge}
                      </div>
                      <h3
                        id="onboarding-dialog-title"
                        className="text-lg sm:text-xl font-bold mt-1"
                        style={{ color: "var(--iwms-navy)" }}
                      >
                        {step.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        {step.headline}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Key Highlights */}
                  <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Key Highlights
                    </span>
                    <ul className="space-y-2 text-xs text-slate-700">
                      {step.keyPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pro Tip Callout */}
                  {step.tips && (
                    <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 flex items-start gap-2 text-xs text-sky-900">
                      <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Helpful Tip: </span>
                        <span>{step.tips}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}

          {/* ═════════ SCREEN 7: OPTIONAL QUICK PROFILE SETUP ═════════ */}
          {currentStep === 7 && (
            <div className="space-y-5 py-1">
              <div className="flex items-start gap-3.5">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-sky-50 text-sky-600"
                >
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200">
                    Optional Profile Setup
                  </div>
                  <h3
                    id="onboarding-dialog-title"
                    className="text-lg sm:text-xl font-bold mt-1"
                    style={{ color: "var(--iwms-navy)" }}
                  >
                    Complete Your Contact Details
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Optional information visible to supervisors in the admin directory. You can also update these anytime under My Profile.
                  </p>
                </div>
              </div>

              {/* Non-editable notice */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-[11px] text-slate-600">
                <Shield className="w-4 h-4 text-sky-600 shrink-0" />
                <span>
                  Protected fields (Intern ID: <strong>{user.internId || "Assigned"}</strong>, Department: <strong>{user.department || "General"}</strong>) are managed by Admin.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-sky-500" /> Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <GraduationCap className="w-3 h-3 text-sky-500" /> College / University
                  </label>
                  <input
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="e.g. Delhi University / IIT"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-sky-500" /> GitHub Profile
                  </label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-sky-500" /> LinkedIn Profile
                  </label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Brief Bio / Tech Interests
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Briefly state your technical domains, primary programming languages, or goals..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div
          className="px-5 py-4 border-t flex flex-wrap items-center justify-between gap-3 bg-white"
          style={{ borderColor: "var(--iwms-border)" }}
        >
          {/* Step Counter or Indicator */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && currentStep <= 6 ? (
              <span className="text-xs text-slate-500 font-medium">
                Step {currentStep} of 6
              </span>
            ) : currentStep === 7 ? (
              <span className="text-xs text-slate-500 font-medium">
                Final Step • Optional Setup
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                Orientation takes ~1 minute
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}

            {currentStep === 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all iwms-btn-primary"
                style={{ background: "var(--iwms-navy)", color: "var(--iwms-white)" }}
              >
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep >= 1 && currentStep < 6 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all iwms-btn-primary"
                style={{ background: "var(--iwms-navy)", color: "var(--iwms-white)" }}
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 6 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(7)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
                >
                  Quick Setup <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all iwms-btn-primary"
                  style={{ background: "var(--iwms-navy)", color: "var(--iwms-white)" }}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {isSubmitting ? "Saving..." : "Finish & Enter Workspace"}
                </button>
              </div>
            )}

            {currentStep === 7 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all iwms-btn-primary"
                  style={{ background: "var(--iwms-navy)", color: "var(--iwms-white)" }}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {isSubmitting ? "Saving..." : "Save & Complete"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
