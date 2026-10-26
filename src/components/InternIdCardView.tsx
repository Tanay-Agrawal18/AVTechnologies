"use client";

import React, { useRef, useState } from "react";
import {
  Printer,
  RotateCw,
  Sparkles,
  ShieldCheck,
  Share2,
  Building2,
  Calendar,
  Layers,
  CheckCircle,
  Cpu,
  Fingerprint,
  Radio,
  ExternalLink,
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

  const formattedInternId = intern.internId || "VYOR-26-00";
  const displayDepartment = intern.department || "Engineering & Innovation";
  const displayDesignation = intern.designation || "Software Development Intern";
  const displayStatus = intern.status || "active";
  const isActive = displayStatus.toLowerCase() === "active";

  const issueDateStr = intern.startDate
    ? new Date(intern.startDate).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        day: "numeric",
      })
    : intern.createdAt
    ? new Date(intern.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        day: "numeric",
      })
    : "Jan 15, 2026";

  const validThruStr = intern.endDate
    ? new Date(intern.endDate).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        day: "numeric",
      })
    : "Dec 31, 2026";

  // Generate initials for avatar fallback
  const initials = intern.name
    ? intern.name
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "VY";

  // QR Code payload (verification info)
  const qrPayload = JSON.stringify({
    issuer: "Vyorai Technologies Pvt Ltd",
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
      {/* ─── Action Toolbar ─── */}
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
              CR80 Compliant Secure Physical & Digital ID Pass
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

      {/* ─── Physical Lanyard + Smart Pass Holder ─── */}
      <div className="relative flex flex-col items-center my-3 sm:my-5 print:my-0">
        {/* Lanyard Top Strap */}
        <div className="flex flex-col items-center -mb-5 z-20 print:hidden select-none pointer-events-none">
          {/* Fabric ribbon */}
          <div className="w-12 h-14 bg-gradient-to-b from-[#0B1F3A] via-[#08182d] to-[#0B1F3A] rounded-t-md shadow-md flex items-center justify-center border-x border-slate-700/60 relative overflow-hidden">
            <div className="absolute inset-y-0 left-1 w-0.5 bg-sky-400/40" />
            <div className="absolute inset-y-0 right-1 w-0.5 bg-sky-400/40" />
            <span className="text-[8px] font-black tracking-widest text-sky-300 uppercase rotate-90 drop-shadow-xs">
              VYORAI
            </span>
          </div>

          {/* Chrome Metal Clip */}
          <div className="w-9 h-4 bg-gradient-to-r from-slate-300 via-white to-slate-400 rounded-xs shadow-md border border-slate-400/90 -mt-0.5 z-10 flex items-center justify-center">
            <div className="w-4 h-1 bg-slate-500/30 rounded-full" />
          </div>

          {/* Badge Hole Punch Slot */}
          <div className="w-14 h-3 bg-[#0B1F3A] rounded-full border border-sky-500/30 shadow-xs flex items-center justify-center -mt-1.5 z-20">
            <div className="w-7 h-1 bg-black/80 rounded-full" />
          </div>
        </div>

        {/* Outer Glow Halo matching brand navy/sky */}
        <div className="absolute -inset-2 bg-gradient-to-b from-sky-400/25 via-[#0B1F3A]/20 to-sky-500/20 rounded-[32px] blur-xl opacity-70 group-hover:opacity-100 transition duration-700 -z-10 print:hidden" />

        {/* ─── FLIPPABLE CARD BADGE CONTAINER ─── */}
        <div
          ref={cardRef}
          onClick={() => setIsFlipped((prev) => !prev)}
          title="Click to flip card"
          className="cursor-pointer select-none transition-transform duration-500 hover:scale-[1.01] active:scale-[0.99] print:cursor-default"
          style={{ perspective: "1400px" }}
        >
          <div
            className="w-[340px] sm:w-[380px] h-[590px] sm:h-[610px] relative rounded-[26px] overflow-hidden shadow-2xl transition-all duration-700 transform-gpu border border-sky-400/30 print:shadow-none print:border-slate-300 print:text-black"
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              backgroundColor: "#0B1F3A",
            }}
          >
            {/* ════════════════════════════════════════════════════════════════ */}
            {/* FRONT SIDE */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div
              className={`absolute inset-0 flex flex-col justify-between p-6 sm:p-7 text-white ${
                isFlipped ? "pointer-events-none opacity-0" : "opacity-100"
              } transition-opacity duration-300`}
              style={{
                backfaceVisibility: "hidden",
                background:
                  "radial-gradient(circle at 85% 15%, rgba(56, 189, 248, 0.18) 0%, transparent 45%), linear-gradient(160deg, #0B1F3A 0%, #071527 50%, #050e1b 100%)",
              }}
            >
              {/* Subtle tech micro-grid pattern */}
              <div
                className="absolute inset-0 opacity-[0.08] pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(#38bdf8 0.75px, transparent 0.75px), radial-gradient(#38bdf8 0.75px, #0B1F3A 0.75px)",
                  backgroundSize: "18px 18px",
                  backgroundPosition: "0 0, 9px 9px",
                }}
              />

              {/* Angled geometric facet accent on right side */}
              <div
                className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none opacity-20 blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle, #38BDF8 0%, rgba(11,31,58,0) 70%)",
                }}
              />

              {/* Watermark Logo subtly placed in background */}
              <div className="absolute right-[-15px] bottom-[80px] w-60 h-60 opacity-[0.04] pointer-events-none select-none">
                <img
                  src="/image.png"
                  alt="Vyorai Watermark"
                  className="w-full h-full object-contain filter invert"
                />
              </div>

              {/* Top Bar Header: Brand & Smart Tag */}
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  {/* Brand mark & name */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white p-1.5 shadow-md border border-sky-300/40 flex items-center justify-center shrink-0">
                      <img
                        src="/image.png"
                        alt="Vyorai Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold tracking-tight text-white leading-tight">
                        Vyorai
                      </h3>
                      <p className="text-[10px] tracking-widest uppercase font-semibold text-sky-400">
                        Technologies
                      </p>
                    </div>
                  </div>

                  {/* Active / Verified Badge */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-[10px] font-bold tracking-wider uppercase">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                      }`}
                    />
                    {displayStatus}
                  </div>
                </div>

                {/* EMV Microchip & NFC Contactless indicator */}
                <div className="flex items-center justify-between pt-1">
                  {/* Gold EMV Chip Simulation */}
                  <div className="w-11 h-8 rounded-md bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 border border-amber-300/80 p-1 shadow-sm flex flex-col justify-between opacity-95">
                    <div className="w-full h-[1px] bg-amber-700/40" />
                    <div className="flex justify-between">
                      <div className="w-2.5 h-2.5 rounded-xs border border-amber-800/40 bg-amber-200/50" />
                      <div className="w-2.5 h-2.5 rounded-xs border border-amber-800/40 bg-amber-200/50" />
                    </div>
                    <div className="w-full h-[1px] bg-amber-700/40" />
                  </div>

                  {/* NFC Signal */}
                  <div className="flex items-center gap-1.5 text-[10px] text-sky-300/80 font-mono tracking-wider">
                    <Radio className="w-3.5 h-3.5 text-sky-400" />
                    <span>NFC SMART PASS</span>
                  </div>
                </div>
              </div>

              {/* ─── Center: Intern Photo, Name, Role & ID ─── */}
              <div className="relative z-10 flex flex-col items-center text-center my-auto py-1">
                {/* Profile photo container with theme accent rings */}
                <div className="relative p-1 rounded-2xl bg-gradient-to-b from-sky-400 via-sky-500 to-[#0B1F3A] shadow-xl shadow-sky-500/15">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-slate-900 border-2 border-[#0B1F3A]">
                    {intern.profilePicture ? (
                      <img
                        src={intern.profilePicture}
                        alt={intern.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-[#0B1F3A] to-[#071527] text-sky-300 text-3xl font-extrabold tracking-wider">
                        {initials}
                      </div>
                    )}
                  </div>

                  {/* Shield Checkmark badge */}
                  <div className="absolute -bottom-2 -right-2 bg-sky-500 text-[#0B1F3A] p-1.5 rounded-full border-2 border-[#0B1F3A] shadow-md">
                    <ShieldCheck className="w-3.5 h-3.5 fill-sky-100" />
                  </div>
                </div>

                {/* Name */}
                <h4 className="mt-3.5 text-lg sm:text-xl font-extrabold tracking-tight text-white line-clamp-1">
                  {intern.name}
                </h4>

                {/* Role / Designation */}
                <p className="text-xs sm:text-sm font-semibold text-sky-300 tracking-wide mt-0.5 max-w-[280px] truncate">
                  {displayDesignation}
                </p>

                {/* Intern ID Pill */}
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-950/70 border border-sky-400/40 text-sky-200 font-mono text-xs font-semibold tracking-wider shadow-inner">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    ID
                  </span>
                  <span className="text-white font-bold">{formattedInternId}</span>
                </div>
              </div>

              {/* ─── Bottom Details & Holographic Security Bar ─── */}
              <div className="relative z-10 pt-2 border-t border-sky-500/20 space-y-2.5">
                {/* 3 Metric Pills */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-xs">
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                      Dept
                    </p>
                    <p className="text-[11px] font-bold text-white truncate mt-0.5">
                      {displayDepartment}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-xs">
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                      Valid From
                    </p>
                    <p className="text-[11px] font-bold text-white truncate mt-0.5">
                      {issueDateStr}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-xs">
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                      Security
                    </p>
                    <p className="text-[11px] font-bold text-sky-300 uppercase truncate mt-0.5">
                      L1 PASS
                    </p>
                  </div>
                </div>

                {/* Stylized Barcode Strip */}
                <div className="flex flex-col items-center pt-0.5">
                  <div className="h-6 w-52 flex items-stretch justify-between gap-[2px] opacity-80">
                    {Array.from({ length: 34 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-2xs"
                        style={{
                          width:
                            i % 4 === 0
                              ? "3px"
                              : i % 2 === 0
                              ? "2px"
                              : "1px",
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] font-mono tracking-widest text-slate-400 mt-1 uppercase">
                    {formattedInternId} • VYORAI SECURE PASS
                  </span>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* BACK SIDE */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div
              className={`absolute inset-0 flex flex-col justify-between p-6 sm:p-7 text-white ${
                !isFlipped ? "pointer-events-none opacity-0" : "opacity-100"
              } transition-opacity duration-300`}
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background:
                  "radial-gradient(circle at 15% 85%, rgba(56, 189, 248, 0.12) 0%, transparent 45%), linear-gradient(155deg, #071527 0%, #0B1F3A 55%, #050d18 100%)",
              }}
            >
              {/* Magnetic HiCo Stripe at the top */}
              <div className="-mx-6 sm:-mx-7 -mt-6 sm:-mt-7 h-11 bg-black border-y border-slate-800 shadow-inner flex items-center justify-between px-6">
                <span className="text-[8px] font-mono tracking-widest text-slate-500 uppercase">
                  MAGNETIC STRIPE // 4000 OE HICO
                </span>
                <span className="text-[8px] font-mono tracking-widest text-sky-400">
                  ISO/IEC 7810 ID-1
                </span>
              </div>

              {/* Terms & Identification Header */}
              <div className="pt-3 space-y-1">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-sky-300">
                    Official Identification Pass
                  </h5>
                  <span className="text-[10px] text-slate-300 font-mono font-semibold">
                    EXP: {validThruStr}
                  </span>
                </div>
                <p className="text-[10px] text-slate-300/80 leading-relaxed">
                  This smart credential is the property of Vyorai Technologies Pvt Ltd. It grants access to designated workspace facilities, lab networks, and internal cloud gateways.
                </p>
              </div>

              {/* QR Code Verification + Details Card */}
              <div className="my-auto py-2 grid grid-cols-5 gap-3 items-center bg-white/[0.06] p-3 rounded-2xl border border-white/10 backdrop-blur-xs">
                {/* QR Code */}
                <div className="col-span-2 flex flex-col items-center">
                  <div className="p-1.5 bg-white rounded-xl shadow-md border border-sky-300/40">
                    <img
                      src={qrCodeUrl}
                      alt="Verification QR"
                      className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                    />
                  </div>
                  <span className="text-[8px] font-mono font-bold text-sky-300 mt-1.5 tracking-wider uppercase">
                    SCAN TO VERIFY
                  </span>
                </div>

                {/* Contact & College Details */}
                <div className="col-span-3 space-y-2 text-left">
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 font-bold block">
                      Email
                    </span>
                    <span className="text-[11px] font-medium text-white truncate block">
                      {intern.email}
                    </span>
                  </div>

                  {intern.phone && (
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 font-bold block">
                        Contact Number
                      </span>
                      <span className="text-[11px] font-medium text-white block">
                        {intern.phone}
                      </span>
                    </div>
                  )}

                  {intern.college && (
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 font-bold block">
                        Institution
                      </span>
                      <span className="text-[11px] font-medium text-white truncate block">
                        {intern.college}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-[9px] uppercase text-slate-400 font-bold block">
                      Issued By
                    </span>
                    <span className="text-[11px] font-medium text-sky-300 block">
                      Vyorai Management HR
                    </span>
                  </div>
                </div>
              </div>

              {/* Signature, Seal & Terms */}
              <div className="pt-2 border-t border-slate-700/70 space-y-2 text-center">
                <div className="flex items-end justify-between px-1">
                  <div className="text-left">
                    <div className="font-serif italic text-sm text-sky-300 tracking-wider">
                      Tanay Agrawal
                    </div>
                    <div className="w-24 h-[1px] bg-sky-400/50 mt-0.5" />
                    <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wider block mt-0.5">
                      Authorized Signatory
                    </span>
                  </div>

                  {/* Company Stamp / Logo */}
                  <div className="w-9 h-9 rounded-full border border-sky-400/40 p-1 flex items-center justify-center bg-white/5 shadow-xs">
                    <img
                      src="/image.png"
                      alt="Stamp"
                      className="w-full h-full object-contain filter invert opacity-75"
                    />
                  </div>
                </div>

                <p className="text-[8px] text-slate-400 leading-tight pt-1">
                  If found, please return to Vyorai Technologies, Tech Hub, India.
                  <br />
                  Support: support@vyorai.com • www.vyorai.com
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Flip Card Prompt Hint */}
        <p className="mt-3.5 text-xs text-slate-500 font-medium flex items-center gap-1.5 print:hidden">
          <RotateCw
            className="w-3.5 h-3.5 text-sky-600 animate-spin"
            style={{ animationDuration: "8s" }}
          />
          Click or tap the card anywhere to flip between front & back side
        </p>
      </div>

      {/* ─── SIDE-BY-SIDE PRINT / INSPECTION SECTION (For Printing & Quick Dual Review) ─── */}
      <div className="hidden print:block w-full max-w-4xl pt-6">
        <div className="flex flex-row items-center justify-center gap-8">
          <p className="text-xs text-slate-400 text-center">
            Official Vyorai ID Smart Card • Print Document
          </p>
        </div>
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

