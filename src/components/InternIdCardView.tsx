"use client";

import React, { useRef, useState } from "react";
import {
  Download,
  Printer,
  RotateCw,
  Sparkles,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  Calendar,
  MapPin,
  ExternalLink,
  QrCode,
  Share2,
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

export function InternIdCardView({ intern, showBackDefault = false }: InternIdCardProps) {
  const [isFlipped, setIsFlipped] = useState(showBackDefault);
  const [isCopied, setIsCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const formattedInternId = intern.internId || "VYOR-26-00";
  const displayDepartment = intern.department || "Engineering / AI";
  const displayDesignation = intern.designation || "Software Development Intern";
  const displayStatus = intern.status || "active";

  const issueDateStr = intern.startDate
    ? new Date(intern.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric", day: "numeric" })
    : intern.createdAt
    ? new Date(intern.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric", day: "numeric" })
    : "Jan 2026";

  const validThruStr = intern.endDate
    ? new Date(intern.endDate).toLocaleDateString("en-US", { month: "short", year: "numeric", day: "numeric" })
    : "Dec 2026";

  // Generate initials for avatar fallback
  const initials = intern.name
    ? intern.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "VY";

  // QR Code payload (verification info)
  const qrPayload = JSON.stringify({
    org: "Vyorai Technologies",
    name: intern.name,
    id: formattedInternId,
    dept: displayDepartment,
    verified: true,
  });
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    qrPayload
  )}&color=0b1f3a&bgcolor=ffffff&margin=0`;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${intern.name} - Vyorai ID Card`,
          text: `Digital Identity Card for ${intern.name} (${formattedInternId}) at Vyorai`,
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
      {/* Action Toolbar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-6 bg-white/80 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Verified Vyorai Smart Pass</h2>
            <p className="text-xs text-slate-500">Official digital identity & gate credential</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsFlipped((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all active:scale-95 shadow-2xs"
          >
            <RotateCw className="w-3.5 h-3.5 text-sky-600" />
            {isFlipped ? "Show Front Side" : "Show Back Side"}
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            Print / Save PDF
          </button>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-xl hover:bg-sky-100 transition-all active:scale-95 shadow-2xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            {isCopied ? "Link Copied!" : "Share Pass"}
          </button>
        </div>
      </div>

      {/* ID Card Display Area with 3D Lanyard & Hologram Glow */}
      <div className="relative flex flex-col items-center my-2 sm:my-4 print:m-0">
        {/* Lanyard Strap & Clip (Stylistic realistic physical badge aesthetic) */}
        <div className="flex flex-col items-center -mb-5 z-20 print:hidden">
          {/* Lanyard Neck Ribbon */}
          <div className="w-12 h-14 bg-gradient-to-b from-slate-900 via-sky-950 to-slate-900 rounded-t-md shadow-md flex items-center justify-center border-x border-slate-700/50">
            <span className="text-[8px] font-black tracking-widest text-sky-400 uppercase rotate-90 select-none">
              VYORAI
            </span>
          </div>
          {/* Metallic Clip */}
          <div className="w-8 h-4 bg-gradient-to-r from-slate-300 via-slate-100 to-slate-400 rounded-sm shadow-inner border border-slate-400/80 -mt-1 z-10" />
          {/* Badge Hole slot cutout */}
          <div className="w-14 h-3 bg-slate-800 rounded-full border border-slate-600 shadow-xs flex items-center justify-center -mt-1.5 z-20">
            <div className="w-8 h-1 bg-slate-950 rounded-full" />
          </div>
        </div>

        {/* Outer Glow Halo */}
        <div className="absolute -inset-1.5 bg-gradient-to-r from-sky-400/30 via-indigo-500/20 to-sky-400/30 rounded-[32px] blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 -z-10 print:hidden" />

        {/* CARD CONTAINER (Vertical standard CR80 credit badge proportion: ~360px x 560px) */}
        <div
          ref={cardRef}
          onClick={() => setIsFlipped(!isFlipped)}
          title="Click to flip badge"
          className="cursor-pointer select-none transition-transform duration-500 hover:scale-[1.01] active:scale-[0.99] print:cursor-default"
          style={{ perspective: "1200px" }}
        >
          {/* CARD BODY */}
          <div
            className="w-[340px] sm:w-[380px] h-[580px] sm:h-[600px] relative rounded-[28px] overflow-hidden shadow-2xl transition-all duration-700 transform-gpu bg-slate-950 border border-sky-400/30 print:shadow-none print:border-slate-300 print:text-black"
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* ======================================================== */}
            {/* FRONT SIDE */}
            {/* ======================================================== */}
            <div
              className={`absolute inset-0 flex flex-col justify-between p-6 sm:p-7 text-white ${
                isFlipped ? "pointer-events-none opacity-0" : "opacity-100"
              } transition-opacity duration-300`}
              style={{
                backfaceVisibility: "hidden",
                background:
                  "linear-gradient(145deg, #070e1c 0%, #0b1f3a 45%, #082142 70%, #030a17 100%)",
              }}
            >
              {/* Holographic angled sheen & high-tech mesh */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(#38bdf8 0.75px, transparent 0.75px), radial-gradient(#38bdf8 0.75px, #070e1c 0.75px)",
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0, 10px 10px",
                }}
              />

              {/* Dynamic prismatic glass diagonal shine */}
              <div
                className="absolute -top-[100%] -left-[50%] w-[200%] h-[200%] pointer-events-none opacity-20"
                style={{
                  background:
                    "linear-gradient(60deg, transparent 40%, rgba(56,189,248,0.3) 50%, rgba(255,255,255,0.4) 52%, rgba(125,211,252,0.2) 55%, transparent 65%)",
                }}
              />

              {/* Watermark Logo subtly placed in background */}
              <div className="absolute right-[-20px] bottom-[70px] w-64 h-64 opacity-5 pointer-events-none select-none">
                <img
                  src="/image.png"
                  alt="Vyorai"
                  className="w-full h-full object-contain filter invert"
                />
              </div>

              {/* TOP HEADER: Brand & Chip */}
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-md border border-sky-300/40 flex items-center justify-center shrink-0">
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

                  {/* RFID / Smart Pass Tag */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-400/40 text-sky-300 text-[10px] font-semibold tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    PASS
                  </div>
                </div>

                {/* EMV Smart Chip Aesthetic + Wave contact */}
                <div className="flex items-center justify-between pt-1">
                  <div className="w-11 h-8 rounded-lg bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300/70 p-1 shadow-sm flex flex-col justify-between opacity-90">
                    <div className="w-full h-[1px] bg-amber-700/50" />
                    <div className="flex justify-between">
                      <div className="w-2.5 h-2.5 rounded-xs border border-amber-800/40" />
                      <div className="w-2.5 h-2.5 rounded-xs border border-amber-800/40" />
                    </div>
                    <div className="w-full h-[1px] bg-amber-700/50" />
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-sky-200/60 font-mono">
                    <svg className="w-4 h-4 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 8.5a7 7 0 0 1 14 0" />
                      <path d="M7.5 12a4.5 4.5 0 0 1 9 0" />
                      <path d="M10 15.5a2 2 0 0 1 4 0" />
                    </svg>
                    NFC ENABLED
                  </div>
                </div>
              </div>

              {/* CENTER: Intern Photo + Name + Role */}
              <div className="relative z-10 flex flex-col items-center text-center my-auto py-2">
                {/* Photo Frame with Glowing Cyan Ring */}
                <div className="relative p-1 rounded-2xl bg-gradient-to-b from-sky-400 via-sky-500 to-indigo-600 shadow-lg shadow-sky-500/20">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-slate-900 border-2 border-slate-950">
                    {intern.profilePicture ? (
                      <img
                        src={intern.profilePicture}
                        alt={intern.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-sky-950 to-slate-900 text-sky-300 text-3xl font-extrabold">
                        {initials}
                      </div>
                    )}
                  </div>
                  {/* Verified badge icon */}
                  <div className="absolute -bottom-2 -right-2 bg-sky-500 text-slate-950 p-1 rounded-full border-2 border-slate-950 shadow-md">
                    <ShieldCheck className="w-4 h-4 fill-sky-200" />
                  </div>
                </div>

                {/* Name */}
                <h4 className="mt-3.5 text-lg sm:text-xl font-bold tracking-tight text-white line-clamp-1">
                  {intern.name}
                </h4>

                {/* Designation & Role */}
                <p className="text-xs sm:text-sm font-medium text-sky-300 tracking-wide mt-0.5">
                  {displayDesignation}
                </p>

                {/* Intern ID Pill */}
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-950/80 border border-sky-400/40 text-sky-200 font-mono text-xs font-semibold tracking-wider shadow-inner">
                  <span>ID:</span>
                  <span className="text-white font-bold">{formattedInternId}</span>
                </div>
              </div>

              {/* BOTTOM: Key Parameters (Dept, Joining, Status) */}
              <div className="relative z-10 pt-2 border-t border-sky-500/20">
                <div className="grid grid-cols-3 gap-2 text-center pb-2">
                  <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                      Dept
                    </p>
                    <p className="text-[11px] font-bold text-white truncate mt-0.5">
                      {displayDepartment}
                    </p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                      Valid From
                    </p>
                    <p className="text-[11px] font-bold text-white truncate mt-0.5">
                      {issueDateStr}
                    </p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                      Status
                    </p>
                    <p className="text-[11px] font-bold text-emerald-400 capitalize truncate mt-0.5">
                      {displayStatus}
                    </p>
                  </div>
                </div>

                {/* Bottom Barcode Strip */}
                <div className="pt-2 flex flex-col items-center">
                  <div className="h-6 w-48 flex items-stretch justify-between gap-[2px] opacity-75">
                    {/* Stylized Barcode */}
                    {Array.from({ length: 32 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-2xs"
                        style={{
                          width: (i % 3 === 0 ? "3px" : i % 2 === 0 ? "2px" : "1px"),
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] font-mono tracking-widest text-slate-400 mt-0.5">
                    {formattedInternId} • VYORAI SECURE PASS
                  </span>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* BACK SIDE */}
            {/* ======================================================== */}
            <div
              className={`absolute inset-0 flex flex-col justify-between p-6 sm:p-7 text-white ${
                !isFlipped ? "pointer-events-none opacity-0" : "opacity-100"
              } transition-opacity duration-300`}
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background:
                  "linear-gradient(155deg, #050a14 0%, #0b1f3a 50%, #030812 100%)",
              }}
            >
              {/* Magnetic Stripe on top */}
              <div className="-mx-6 sm:-mx-7 -mt-6 sm:-mt-7 h-11 bg-black border-y border-slate-800 shadow-inner flex items-center justify-between px-6">
                <span className="text-[8px] font-mono tracking-widest text-slate-500">
                  MAGNETIC STRIPE // HIGH COERCIVITY 4000 OE
                </span>
                <span className="text-[8px] font-mono tracking-widest text-sky-400">
                  ISO/IEC 7810 ID-1
                </span>
              </div>

              {/* Back Content Header */}
              <div className="pt-3 space-y-1">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-sky-300">
                    Official Identification
                  </h5>
                  <span className="text-[10px] text-slate-400 font-mono">
                    VALID THRU: {validThruStr}
                  </span>
                </div>
                <p className="text-[10px] text-slate-300/80 leading-relaxed">
                  This credential is the property of Vyorai Technologies Pvt Ltd. It grants access to designated workspace facilities and cloud environments.
                </p>
              </div>

              {/* QR Verification & Details Grid */}
              <div className="my-auto py-2 grid grid-cols-5 gap-3 items-center bg-white/5 p-3 rounded-2xl border border-white/10">
                {/* QR Code */}
                <div className="col-span-2 flex flex-col items-center">
                  <div className="p-1.5 bg-white rounded-xl shadow-md">
                    <img
                      src={qrCodeUrl}
                      alt="Verification QR"
                      className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                    />
                  </div>
                  <span className="text-[8px] font-mono text-sky-300 mt-1 tracking-wider uppercase">
                    Scan To Verify
                  </span>
                </div>

                {/* Details Breakdown */}
                <div className="col-span-3 space-y-2 text-left">
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 font-semibold block">
                      Email
                    </span>
                    <span className="text-[11px] font-medium text-white truncate block">
                      {intern.email}
                    </span>
                  </div>

                  {intern.phone && (
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 font-semibold block">
                        Emergency Contact
                      </span>
                      <span className="text-[11px] font-medium text-white block">
                        {intern.phone}
                      </span>
                    </div>
                  )}

                  {intern.college && (
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 font-semibold block">
                        Institution
                      </span>
                      <span className="text-[11px] font-medium text-white truncate block">
                        {intern.college}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-[9px] uppercase text-slate-400 font-semibold block">
                      Issued By
                    </span>
                    <span className="text-[11px] font-medium text-sky-300 block">
                      Vyorai Management HR
                    </span>
                  </div>
                </div>
              </div>

              {/* Authorized Signature & Terms */}
              <div className="pt-2 border-t border-slate-700/60 space-y-2 text-center">
                <div className="flex items-end justify-between px-2">
                  <div className="text-left">
                    <div className="h-6 font-serif italic text-sm text-sky-300 tracking-wider">
                      Tanay Agrawal
                    </div>
                    <div className="w-24 h-[1px] bg-sky-400/50 mt-0.5" />
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block mt-0.5">
                      Authorized Signatory
                    </span>
                  </div>

                  <div className="w-9 h-9 rounded-full border border-sky-400/40 p-1 flex items-center justify-center opacity-80">
                    <img
                      src="/image.png"
                      alt="Stamp"
                      className="w-full h-full object-contain filter invert opacity-70"
                    />
                  </div>
                </div>

                <p className="text-[8px] text-slate-400 leading-tight pt-1">
                  If found, please return to Vyorai Technologies, Tech Hub, India.
                  <br />
                  Emergency Support: support@vyorai.com • www.vyorai.com
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Flip prompt hint */}
        <p className="mt-3 text-xs text-slate-500 font-medium flex items-center gap-1.5 print:hidden">
          <RotateCw className="w-3.5 h-3.5 text-sky-500 animate-spin" style={{ animationDuration: "6s" }} />
          Click or tap the card to flip between front & back
        </p>
      </div>

      {/* Print Specific CSS to ensure perfect physical badge printing */}
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
          }
        }
      `}</style>
    </div>
  );
}
