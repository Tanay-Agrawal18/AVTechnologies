"use client";

import React, { useRef, useState } from "react";
import {
  Printer,
  RotateCw,
  Sparkles,
  Share2,
  Cpu,
  Calendar,
  Shield,
  Check,
  Radio,
} from "lucide-react";

export interface InternIdCardProps {
  intern: {
    _id?: string;
    id?: string;
    name: string;
    internId?: string;
    email: string;
    phone?: string;
    department?: string;
    designation?: string;
    college?: string;
    address?: string;
    profilePicture?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    createdAt?: string | Date;
  };
  showBackDefault?: boolean;
}

export function InternIdCardView({
  intern,
  showBackDefault = false,
}: InternIdCardProps) {
  const [isFlipped, setIsFlipped] = useState(showBackDefault);
  const [isCopied, setIsCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const formattedInternId = intern.internId || "VYOR-26-03";
  const displayDepartment = intern.department || "AI-ML";
  const displayDesignation = intern.designation || "Software Development Intern";
  const displayStatus = (intern.status || "ACTIVE").toUpperCase();
  const isActive = displayStatus === "ACTIVE";

  const issueDateStr = intern.startDate
    ? new Date(intern.startDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : intern.createdAt
    ? new Date(intern.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Nov 1, 2026";

  const validThruStr = intern.endDate
    ? new Date(intern.endDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Nov 1, 2027";

  // Generate initials for avatar fallback
  const initials = intern.name
    ? intern.name
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "DR";

  // QR Code payload (verification info)
  const qrPayload = JSON.stringify({
    issuer: "Vyorai Technologies",
    name: intern.name,
    id: formattedInternId,
    department: displayDepartment,
    status: displayStatus,
    verified: true,
  });

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    qrPayload
  )}&color=0b1f3a&bgcolor=ffffff&margin=0`;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${intern.name} - Vyorai ID Pass`,
          text: `Official Digital Identification Card for ${intern.name} (${formattedInternId}) at Vyorai Technologies`,
          url: window.location.href,
        });
      } catch {
        // User cancelled or unsupported
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto py-2 sm:py-6">
      {/* ─── Top Control Toolbar ─── */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-6 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Vyorai Smart Pass Credential
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Official Physical & Digital Identity Pass
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsFlipped((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all active:scale-95 shadow-2xs"
          >
            <RotateCw className="w-3.5 h-3.5 text-sky-600" />
            {isFlipped ? "Show Front Side" : "Flip to Back Side"}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-[#0B1F3A] hover:bg-[#071527] rounded-xl transition-all active:scale-95 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            Print / Save Badge
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-all active:scale-95 shadow-2xs"
          >
            <Share2 className="w-3.5 h-3.5 text-sky-600" />
            {isCopied ? "Link Copied!" : "Share Pass"}
          </button>
        </div>
      </div>

      {/* ─── BADGE DISPLAY AREA ─── */}
      <div className="relative flex flex-col items-center my-4 sm:my-6 print:my-0">
        {/* ── Realistic Navy Lanyard Strap & Clip ── */}
        <div className="flex flex-col items-center -mb-5 z-20 print:hidden select-none pointer-events-none">
          {/* Lanyard Webbing Ribbon */}
          <div className="w-13 h-20 bg-[#0B1F3A] shadow-lg flex items-center justify-center relative overflow-hidden">
            {/* Fine texture weave overlay */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 4px)",
              }}
            />
            {/* White Vyorai text rotated vertically */}
            <div className="flex items-center gap-1 text-[10px] font-extrabold tracking-widest text-white uppercase rotate-90 drop-shadow-xs">
              <span className="opacity-90">VO</span>
              <span className="tracking-widest">vyorai</span>
            </div>
          </div>

          {/* Dark Matte Gunmetal Clamp / Swivel Clip */}
          <div className="w-16 h-7 bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-[#020617] rounded-md shadow-md border border-slate-700/80 -mt-1 z-10 flex flex-col items-center justify-center p-0.5">
            <div className="w-10 h-2 bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600 rounded-xs shadow-inner" />
          </div>

          {/* Badge Slot Cutout (Oval punch slot) */}
          <div className="w-12 h-3.5 bg-slate-900 rounded-full border border-slate-600/70 shadow-xs flex items-center justify-center -mt-2 z-20">
            <div className="w-7 h-1.5 bg-black rounded-full" />
          </div>
        </div>

        {/* Ambient Drop Glow */}
        <div className="absolute -inset-4 bg-gradient-to-b from-sky-200/40 via-sky-100/20 to-transparent rounded-[44px] blur-2xl -z-10 pointer-events-none print:hidden" />

        {/* ── Flipped Card Container (Vertical CR80 Badge Dimensions) ── */}
        <div
          ref={cardRef}
          onClick={() => setIsFlipped((prev) => !prev)}
          title="Click to flip badge"
          className="cursor-pointer select-none transition-transform duration-500 hover:scale-[1.01] active:scale-[0.99] print:cursor-default"
          style={{ perspective: "1500px" }}
        >
          <div
            className="w-[340px] sm:w-[380px] h-[610px] sm:h-[635px] relative rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(11,31,58,0.18)] transition-all duration-700 transform-gpu border border-slate-200/80 print:shadow-none print:border-slate-300"
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              backgroundColor: "#FFFFFF",
            }}
          >
            {/* ════════════════════════════════════════════════════════════════ */}
            {/* FRONT SIDE (Exact match to requested UI/UX) */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div
              className={`absolute inset-0 flex flex-col justify-between p-6 sm:p-7 text-slate-900 ${
                isFlipped ? "pointer-events-none opacity-0" : "opacity-100"
              } transition-opacity duration-300`}
              style={{
                backfaceVisibility: "hidden",
                background: "#FFFFFF",
              }}
            >
              {/* Soft, modern cyan curved wave gradients (matching reference background) */}
              {/* Top-right subtle blue curve */}
              <div
                className="absolute -top-16 -right-16 w-80 h-80 rounded-full pointer-events-none opacity-40 blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle, rgba(186, 230, 253, 0.6) 0%, rgba(255,255,255,0) 70%)",
                }}
              />

              {/* Mid-left sweeping wave */}
              <div
                className="absolute top-44 -left-20 w-80 h-64 rounded-[100%] pointer-events-none opacity-40 blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle, rgba(224, 242, 254, 0.9) 0%, rgba(255,255,255,0) 70%)",
                }}
              />

              {/* Bottom sweeping blue wave arc */}
              <div
                className="absolute -bottom-10 -left-10 -right-10 h-40 pointer-events-none opacity-70"
                style={{
                  background:
                    "radial-gradient(ellipse 90% 60% at 50% 100%, rgba(56, 189, 248, 0.35) 0%, rgba(186, 230, 253, 0.2) 60%, transparent 100%)",
                }}
              />

              {/* Watermark Logo subtly placed in background on the right */}
              <div className="absolute right-[-10px] top-[40%] w-48 h-48 opacity-[0.06] pointer-events-none select-none">
                <img
                  src="/image.png"
                  alt="Vyorai Watermark"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* ── TOP HEADER: Logo + Active Pill ── */}
              <div className="relative z-10 pt-1">
                <div className="flex items-center justify-between">
                  {/* Brand mark with rounded squircle white tile */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-slate-100 flex items-center justify-center p-2 shrink-0">
                      <img
                        src="/image.png"
                        alt="Vyorai Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold tracking-tight text-[#0B1F3A] leading-none">
                        Vyorai
                      </h3>
                      <p className="text-[10px] tracking-[0.2em] uppercase font-bold text-sky-500 mt-1">
                        Technologies
                      </p>
                    </div>
                  </div>

                  {/* ACTIVE status pill */}
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-100/70 border border-sky-200/80 text-sky-800 text-xs font-bold tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
                    <span>{displayStatus}</span>
                  </div>
                </div>

                {/* ── EMV Gold Chip + NFC Smart Pass ── */}
                <div className="flex items-center justify-between mt-4 px-0.5">
                  {/* Realistic Metallic Gold Smart Chip */}
                  <div className="w-12 h-9 rounded-lg bg-gradient-to-br from-[#fde68a] via-[#f59e0b] to-[#b45309] p-[1.5px] shadow-sm relative overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-tr from-[#fbbf24] via-[#fde68a] to-[#d97706] rounded-[6px] p-1 flex flex-col justify-between">
                      <div className="w-full h-[1px] bg-[#92400e]/40" />
                      <div className="flex justify-between items-center px-1">
                        <div className="w-2 h-2.5 rounded-xs border border-[#92400e]/40 bg-[#fef3c7]/60" />
                        <div className="w-2 h-2.5 rounded-xs border border-[#92400e]/40 bg-[#fef3c7]/60" />
                      </div>
                      <div className="w-full h-[1px] bg-[#92400e]/40" />
                    </div>
                  </div>

                  {/* NFC Signal Indicator */}
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#0B1F3A] tracking-wider uppercase">
                    <Radio className="w-3.5 h-3.5 text-sky-500" />
                    <span>NFC SMART PASS</span>
                  </div>
                </div>
              </div>

              {/* ── CENTER: Photo Frame, Verified Badge, Name & Role ── */}
              <div className="relative z-10 flex flex-col items-center text-center my-auto py-1">
                {/* Profile Photo with Cyan Border + Floating Check Badge */}
                <div className="relative">
                  <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl p-1 bg-gradient-to-b from-sky-400 to-sky-500 shadow-[0_8px_24px_rgba(56,189,248,0.3)]">
                    <div className="w-full h-full rounded-[20px] overflow-hidden bg-slate-100 border border-white">
                      {intern.profilePicture ? (
                        <img
                          src={intern.profilePicture}
                          alt={intern.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-sky-100 to-slate-100 text-sky-700 text-3xl font-extrabold tracking-wider">
                          {initials}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Floating Circular Blue Verified Checkmark Badge */}
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-md border-2 border-white">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                </div>

                {/* Intern Full Name */}
                <h4 className="mt-4 text-2xl font-extrabold tracking-tight text-[#0B1F3A]">
                  {intern.name}
                </h4>

                {/* Designation */}
                <p className="text-sm font-semibold text-slate-600 tracking-wide mt-0.5">
                  {displayDesignation}
                </p>

                {/* Intern ID Pill Capsule */}
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-100 shadow-2xs">
                  <span className="text-xs font-bold text-sky-500">ID</span>
                  <span className="w-0.5 h-3.5 bg-slate-300" />
                  <span className="text-sm font-extrabold text-[#0B1F3A] tracking-wider font-mono">
                    {formattedInternId}
                  </span>
                </div>
              </div>

              {/* ── BOTTOM: 3 Rounded Info Metric Cards + Barcode ── */}
              <div className="relative z-10 space-y-3 pt-1">
                {/* 3 Metric Cards */}
                <div className="grid grid-cols-3 gap-2.5">
                  {/* DEPT Card */}
                  <div className="p-2.5 rounded-2xl bg-white border border-sky-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-sky-500">
                      <Cpu className="w-3.5 h-3.5" />
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                        DEPT
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#0B1F3A] truncate mt-1">
                      {displayDepartment}
                    </p>
                  </div>

                  {/* VALID FROM Card */}
                  <div className="p-2.5 rounded-2xl bg-white border border-sky-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-sky-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                        VALID FROM
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#0B1F3A] truncate mt-1">
                      {issueDateStr}
                    </p>
                  </div>

                  {/* SECURITY Card */}
                  <div className="p-2.5 rounded-2xl bg-white border border-sky-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-sky-500">
                      <Shield className="w-3.5 h-3.5" />
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                        SECURITY
                      </span>
                    </div>
                    <p className="text-xs font-bold text-sky-600 truncate mt-1">
                      L1 PASS
                    </p>
                  </div>
                </div>

                {/* High Density Barcode Strip */}
                <div className="flex flex-col items-center pt-1 pb-1">
                  <div className="h-8 w-60 sm:w-64 flex items-stretch justify-between gap-[2px]">
                    {Array.from({ length: 42 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-[#0B1F3A] rounded-2xs"
                        style={{
                          width:
                            i % 5 === 0
                              ? "3.5px"
                              : i % 3 === 0
                              ? "2.5px"
                              : i % 2 === 0
                              ? "1.5px"
                              : "1px",
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-slate-500 mt-1 uppercase">
                    {formattedInternId} • VYORAI SECURE PASS
                  </span>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* BACK SIDE (Refined light executive companion to the front) */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div
              className={`absolute inset-0 flex flex-col justify-between p-6 sm:p-7 text-slate-900 ${
                !isFlipped ? "pointer-events-none opacity-0" : "opacity-100"
              } transition-opacity duration-300`}
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: "#FFFFFF",
              }}
            >
              {/* Magnetic HiCo Stripe at the top */}
              <div className="-mx-6 sm:-mx-7 -mt-6 sm:-mt-7 h-12 bg-[#0B1F3A] shadow-inner flex items-center justify-between px-6 border-b border-slate-300">
                <span className="text-[8px] font-mono tracking-widest text-slate-300 uppercase">
                  MAGNETIC STRIPE // 4000 OE HICO
                </span>
                <span className="text-[8px] font-mono tracking-widest text-sky-400 font-bold">
                  ISO/IEC 7810 ID-1
                </span>
              </div>

              {/* Identification Header */}
              <div className="pt-3 space-y-1">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-sky-700">
                    Official Identification Pass
                  </h5>
                  <span className="text-[10px] text-slate-500 font-mono font-bold">
                    EXP: {validThruStr}
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  This smart credential is the property of Vyorai Technologies Pvt Ltd. It grants access to designated workspace facilities, lab networks, and internal cloud gateways.
                </p>
              </div>

              {/* QR Code Verification + Details Card */}
              <div className="my-auto py-2 grid grid-cols-5 gap-3 items-center bg-sky-50/70 p-3.5 rounded-2xl border border-sky-100">
                {/* QR Code */}
                <div className="col-span-2 flex flex-col items-center">
                  <div className="p-1.5 bg-white rounded-xl shadow-sm border border-sky-200">
                    <img
                      src={qrCodeUrl}
                      alt="Verification QR"
                      className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                    />
                  </div>
                  <span className="text-[8px] font-mono font-bold text-sky-700 mt-1.5 tracking-wider uppercase">
                    SCAN TO VERIFY
                  </span>
                </div>

                {/* Contact & College Details */}
                <div className="col-span-3 space-y-2 text-left">
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 font-bold block">
                      Email
                    </span>
                    <span className="text-[11px] font-bold text-[#0B1F3A] truncate block">
                      {intern.email}
                    </span>
                  </div>

                  {intern.phone && (
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 font-bold block">
                        Contact Number
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 block">
                        {intern.phone}
                      </span>
                    </div>
                  )}

                  {intern.college && (
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 font-bold block">
                        Institution
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 truncate block">
                        {intern.college}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-[9px] uppercase text-slate-400 font-bold block">
                      Issued By
                    </span>
                    <span className="text-[11px] font-bold text-sky-700 block">
                      Vyorai Management HR
                    </span>
                  </div>
                </div>
              </div>

              {/* Signature, Seal & Terms */}
              <div className="pt-2 border-t border-slate-200 space-y-2 text-center">
                <div className="flex items-end justify-between px-1">
                  <div className="text-left">
                    <div className="font-serif italic text-sm text-[#0B1F3A] tracking-wider font-semibold">
                      Tanay Agrawal
                    </div>
                    <div className="w-24 h-[1px] bg-sky-500 mt-0.5" />
                    <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider block mt-0.5">
                      Authorized Signatory
                    </span>
                  </div>

                  {/* Company Stamp / Logo */}
                  <div className="w-10 h-10 rounded-full border border-sky-300 p-1 flex items-center justify-center bg-white shadow-xs">
                    <img
                      src="/image.png"
                      alt="Stamp"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <p className="text-[8px] text-slate-500 leading-tight pt-1">
                  If found, please return to Vyorai Technologies, Tech Hub, India.
                  <br />
                  Support: support@vyorai.com • www.vyorai.com
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Flip Card Hint */}
        <p className="mt-3.5 text-xs text-slate-500 font-medium flex items-center gap-1.5 print:hidden">
          <RotateCw
            className="w-3.5 h-3.5 text-sky-600 animate-spin"
            style={{ animationDuration: "8s" }}
          />
          Click or tap the card anywhere to flip between front & back side
        </p>
      </div>

      {/* Global CSS for high-fidelity physical badge printing */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #iwms-print-container,
          #iwms-print-container * {
            visibility: visible;
          }
          #iwms-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: flex;
            justify-content: center;
            background: white !important;
            padding: 20px 0;
          }
        }
      `}</style>
    </div>
  );
}

