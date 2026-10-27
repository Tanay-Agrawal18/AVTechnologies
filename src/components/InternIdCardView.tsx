"use client";

import React, { useRef, useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Printer,
  RotateCw,
  Sparkles,
  Share2,
  Cpu,
  Calendar,
  Shield,
  Check,
  QrCode as QrCodeIcon,
  ShieldCheck,
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
  const [backQrDataUrl, setBackQrDataUrl] = useState<string>("");
  const [verificationUrl, setVerificationUrl] = useState<string>("");
  const cardRef = useRef<HTMLDivElement>(null);

  const formattedInternId = intern.internId || (intern._id ? `VYOR-26-${intern._id.slice(-2).toUpperCase()}` : "VYOR-26-01");
  const displayDepartment = intern.department || "Technology";
  const displayDesignation = intern.designation || "Software Development Intern";
  const displayStatus = (intern.status || "ACTIVE").toUpperCase();

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
    : "Active Term";

  const validThruStr = intern.endDate
    ? new Date(intern.endDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Term End";

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

  // Generate secure token & render QR code for back side
  useEffect(() => {
    let isMounted = true;

    async function generateCodes() {
      try {
        const clientOrigin =
          typeof window !== "undefined" && window.location.origin
            ? window.location.origin
            : "https://vyorai-three.vercel.app";

        const res = await fetch("/api/id-card/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: intern._id || intern.id,
            internId: formattedInternId,
          }),
        });

        let targetUrl = "";
        if (res.ok) {
          const json = await res.json();
          if (json.token) {
            // Guarantee target URL uses the exact active hostname / origin of the user
            targetUrl = `${clientOrigin}/verify/${encodeURIComponent(json.token)}`;
          } else if (json.verificationUrl) {
            targetUrl = json.verificationUrl;
          }
        }

        // Direct fallback: verify with formatted intern ID
        if (!targetUrl) {
          targetUrl = `${clientOrigin}/verify/${encodeURIComponent(formattedInternId)}`;
        }

        if (!isMounted) return;
        setVerificationUrl(targetUrl);

        // Generate large high-resolution Back QR code
        const backUrl = await QRCode.toDataURL(targetUrl, {
          width: 480,
          margin: 1,
          color: {
            dark: "#0B1F3A",
            light: "#FFFFFF",
          },
          errorCorrectionLevel: "H",
        });

        if (isMounted) {
          setBackQrDataUrl(backUrl);
        }
      } catch (err) {
        console.error("Failed to generate QR code data URL", err);
        const fallbackOrigin =
          typeof window !== "undefined" && window.location.origin
            ? window.location.origin
            : "https://vyorai-three.vercel.app";
        const fallbackTarget = `${fallbackOrigin}/verify/${encodeURIComponent(formattedInternId)}`;
        try {
          const fallbackQr = await QRCode.toDataURL(fallbackTarget, {
            width: 480,
            margin: 1,
            color: { dark: "#0B1F3A", light: "#FFFFFF" },
            errorCorrectionLevel: "H",
          });
          if (isMounted) {
            setBackQrDataUrl(fallbackQr);
            setVerificationUrl(fallbackTarget);
          }
        } catch {
          const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
            fallbackTarget
          )}&color=0b1f3a&bgcolor=ffffff&margin=1`;
          if (isMounted) {
            setBackQrDataUrl(fallbackUrl);
            setVerificationUrl(fallbackTarget);
          }
        }
      }
    }

    generateCodes();

    return () => {
      isMounted = false;
    };
  }, [intern._id, intern.id, formattedInternId]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareUrl = verificationUrl || (typeof window !== "undefined" ? window.location.href : "");
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${intern.name} - Vyorai ID Pass`,
          text: `Official Digital Identity Pass for ${intern.name} (${formattedInternId}) at Vyorai Technologies`,
          url: shareUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
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
              QR-Based Official Identity & Gate Pass
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
      <div className="relative flex flex-col items-center my-2 sm:my-4 print:my-0">
        {/* ── Realistic Navy Lanyard Strap & Clip ── */}
        <div className="flex flex-col items-center -mb-4 z-20 print:hidden select-none pointer-events-none">
          {/* Lanyard Webbing Ribbon */}
          <div className="w-11 h-14 bg-[#0B1F3A] shadow-lg flex items-center justify-center relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 4px)",
              }}
            />
            <div className="flex items-center gap-1 text-[9px] font-extrabold tracking-widest text-white uppercase rotate-90 drop-shadow-xs">
              <span className="opacity-90">VO</span>
              <span className="tracking-widest">vyorai</span>
            </div>
          </div>

          {/* Dark Matte Gunmetal Clamp */}
          <div className="w-14 h-5 bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-[#020617] rounded-md shadow-md border border-slate-700/80 -mt-1 z-10 flex flex-col items-center justify-center p-0.5">
            <div className="w-8 h-1.5 bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600 rounded-xs shadow-inner" />
          </div>

          {/* Badge Slot Cutout (Oval punch slot) */}
          <div className="w-10 h-3 bg-slate-900 rounded-full border border-slate-600/70 shadow-xs flex items-center justify-center -mt-1.5 z-20">
            <div className="w-6 h-1 bg-black rounded-full" />
          </div>
        </div>

        {/* Ambient Drop Glow */}
        <div className="absolute -inset-4 bg-gradient-to-b from-sky-200/40 via-sky-100/20 to-transparent rounded-[44px] blur-2xl -z-10 pointer-events-none print:hidden" />

        {/* ── Flipped Card Container (Vertical CR80 Dimensions) ── */}
        <div
          ref={cardRef}
          onClick={() => setIsFlipped((prev) => !prev)}
          title="Click to flip badge"
          className="cursor-pointer select-none print:cursor-default"
          style={{ perspective: "1500px" }}
        >
          <div
            className="w-[320px] sm:w-[350px] h-[490px] sm:h-[515px] relative transition-transform duration-700 ease-in-out"
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* ════════════════════════════════════════════════════════════════ */}
            {/* FRONT SIDE (QR-Based Smart ID with Light Aesthetic) */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div
              className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5 text-slate-900 rounded-[28px] overflow-hidden border border-slate-200/80 shadow-[0_20px_50px_rgba(11,31,58,0.18)]"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(0deg)",
                background: "#FFFFFF",
                zIndex: isFlipped ? 0 : 2,
              }}
            >
              {/* Soft, modern cyan curved wave gradients */}
              <div
                className="absolute -top-16 -right-16 w-80 h-80 rounded-full pointer-events-none opacity-40 blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle, rgba(186, 230, 253, 0.6) 0%, rgba(255,255,255,0) 70%)",
                }}
              />

              <div
                className="absolute top-44 -left-20 w-80 h-64 rounded-[100%] pointer-events-none opacity-40 blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle, rgba(224, 242, 254, 0.9) 0%, rgba(255,255,255,0) 70%)",
                }}
              />

              <div
                className="absolute -bottom-10 -left-10 -right-10 h-40 pointer-events-none opacity-70"
                style={{
                  background:
                    "radial-gradient(ellipse 90% 60% at 50% 100%, rgba(56, 189, 248, 0.35) 0%, rgba(186, 230, 253, 0.2) 60%, transparent 100%)",
                }}
              />

              {/* Watermark Logo subtly placed in background */}
              <div className="absolute right-[-10px] top-[40%] w-48 h-48 opacity-[0.06] pointer-events-none select-none">
                <img
                  src="/image.png"
                  alt="Vyorai Watermark"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* ── TOP HEADER: Logo + Active Pill ── */}
              <div className="relative z-10 pt-0.5">
                <div className="flex items-center justify-between">
                  {/* Brand mark with rounded squircle tile */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-slate-100 flex items-center justify-center p-1.5 shrink-0">
                      <img
                        src="/image.png"
                        alt="Vyorai Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold tracking-tight text-[#0B1F3A] leading-none">
                        Vyorai
                      </h3>
                      <p className="text-[9px] tracking-[0.2em] uppercase font-bold text-sky-500 mt-0.5">
                        Technologies
                      </p>
                    </div>
                  </div>

                  {/* ACTIVE status pill */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/70 border border-sky-200/80 text-sky-800 text-[11px] font-bold tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />
                    <span>{displayStatus}</span>
                  </div>
                </div>
              </div>

              {/* ── CENTER: Photo Frame, Verified Badge, Name & Role ── */}
              <div className="relative z-10 flex flex-col items-center text-center my-auto py-0.5">
                {/* Profile Photo with Cyan Border + Floating Check Badge */}
                <div className="relative">
                  <div className="w-24 h-24 sm:w-26 sm:h-26 rounded-2xl p-1 bg-gradient-to-b from-sky-400 to-sky-500 shadow-[0_6px_20px_rgba(56,189,248,0.28)]">
                    <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-100 border border-white">
                      {intern.profilePicture ? (
                        <img
                          src={intern.profilePicture}
                          alt={intern.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-sky-100 to-slate-100 text-sky-700 text-2xl font-extrabold tracking-wider">
                          {initials}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Floating Circular Blue Verified Checkmark Badge */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-md border-2 border-white">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                {/* Intern Full Name */}
                <h4 className="mt-2.5 text-lg sm:text-xl font-extrabold tracking-tight text-[#0B1F3A]">
                  {intern.name}
                </h4>

                {/* Designation */}
                <p className="text-xs sm:text-[13px] font-semibold text-slate-600 tracking-wide mt-0.5">
                  {displayDesignation}
                </p>

                {/* Intern ID Pill Capsule */}
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-sky-50 border border-sky-100 shadow-2xs">
                  <span className="text-[11px] font-bold text-sky-500">ID</span>
                  <span className="w-0.5 h-2.5 bg-slate-300" />
                  <span className="text-xs sm:text-[13px] font-extrabold text-[#0B1F3A] tracking-wider font-mono">
                    {formattedInternId}
                  </span>
                </div>
              </div>

              {/* ── 3 Rounded Info Metric Cards ── */}
              <div className="relative z-10 grid grid-cols-3 gap-2">
                {/* DEPT Card */}
                <div className="p-2 rounded-xl bg-white border border-sky-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-sky-500">
                    <Cpu className="w-3.5 h-3.5" />
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                      DEPT
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs font-bold text-[#0B1F3A] truncate mt-1">
                    {displayDepartment}
                  </p>
                </div>

                {/* VALID FROM Card */}
                <div className="p-2 rounded-xl bg-white border border-sky-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-sky-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                      VALID FROM
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs font-bold text-[#0B1F3A] truncate mt-1">
                    {issueDateStr}
                  </p>
                </div>

                {/* SECURITY Card */}
                <div className="p-2 rounded-xl bg-white border border-sky-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-sky-500">
                    <Shield className="w-3.5 h-3.5" />
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                      SECURITY
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs font-bold text-sky-600 truncate mt-1">
                    L1 PASS
                  </p>
                </div>
              </div>

              {/* ── BOTTOM: Front Security & Verification Footer (No QR code on front) ── */}
              <div className="relative z-10 pt-2.5 border-t border-sky-100/90 flex items-center justify-between px-1">
                <div className="text-left">
                  <span className="text-[11px] font-mono font-bold tracking-wider text-[#0B1F3A] uppercase block">
                    {formattedInternId}
                  </span>
                  <span className="text-[9px] font-bold text-sky-600 uppercase tracking-widest block">
                    OFFICIAL SMART PASS
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[8px] font-mono uppercase text-slate-400 tracking-widest block">
                    Vyorai Technologies
                  </span>
                  <span className="text-[9px] font-bold text-slate-600 tracking-wider uppercase block">
                    CR80 COMPLIANT
                  </span>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* BACK SIDE (Large Centered Scannable QR Code Layout) */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div
              className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5 text-slate-900 rounded-[28px] overflow-hidden border border-slate-200/80 shadow-[0_20px_50px_rgba(11,31,58,0.18)]"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: "#FFFFFF",
                zIndex: isFlipped ? 2 : 0,
              }}
            >
              {/* Soft wave background mirroring front side */}
              <div
                className="absolute -top-16 -left-16 w-80 h-80 rounded-full pointer-events-none opacity-40 blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle, rgba(186, 230, 253, 0.6) 0%, rgba(255,255,255,0) 70%)",
                }}
              />

              <div
                className="absolute -bottom-10 -left-10 -right-10 h-40 pointer-events-none opacity-70"
                style={{
                  background:
                    "radial-gradient(ellipse 90% 60% at 50% 100%, rgba(56, 189, 248, 0.35) 0%, rgba(186, 230, 253, 0.2) 60%, transparent 100%)",
                }}
              />

              {/* Watermark Logo subtly placed in background */}
              <div className="absolute left-[-10px] top-[30%] w-48 h-48 opacity-[0.06] pointer-events-none select-none">
                <img
                  src="/image.png"
                  alt="Vyorai Watermark"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* ── BACK HEADER: Brand Logo & Title ── */}
              <div className="relative z-10 flex items-center justify-between border-b border-sky-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-xs border border-slate-100 flex items-center justify-center p-1 shrink-0">
                    <img
                      src="/image.png"
                      alt="Vyorai Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-[#0B1F3A] leading-tight">
                      Vyorai Technologies
                    </h5>
                    <p className="text-[8px] tracking-widest uppercase font-bold text-sky-500">
                      Official ID Verification
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[8px] font-mono text-slate-400 block font-bold">
                    VALID THRU
                  </span>
                  <span className="text-[9px] font-mono font-extrabold text-[#0B1F3A]">
                    {validThruStr}
                  </span>
                </div>
              </div>

              {/* ── BACK CENTER: Large Scannable QR Code ── */}
              <div className="relative z-10 my-auto py-1 flex flex-col items-center text-center">
                {/* Large QR Frame with Gradient Ring & Soft Shadow */}
                <div className="p-1 rounded-2xl bg-gradient-to-b from-sky-400 via-sky-300 to-sky-500 shadow-lg shadow-sky-500/15">
                  <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-[14px] bg-white p-2.5 flex items-center justify-center border border-white">
                    {backQrDataUrl ? (
                      <img
                        src={backQrDataUrl}
                        alt="Scan To Verify ID QR Code"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
                        <QrCodeIcon className="w-9 h-9 text-sky-500 animate-spin" />
                        <span className="text-[9px] font-bold">Generating...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Scan Label */}
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 shadow-2xs">
                  <ShieldCheck className="w-3 h-3 text-sky-600" />
                  <span className="text-[11px] font-black tracking-wider uppercase text-[#0B1F3A]">
                    SCAN TO VERIFY ID
                  </span>
                </div>

                {/* Instruction */}
                <p className="text-[9px] text-slate-500 font-medium max-w-[260px] leading-tight mt-1.5">
                  Scan this QR code to verify the intern&apos;s identity and ID status.
                </p>

                {/* Intern Summary Card */}
                <div className="w-full mt-2 p-2 rounded-xl bg-white border border-sky-100 shadow-xs flex items-center justify-between text-left">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-extrabold text-[#0B1F3A] truncate">
                      {intern.name}
                    </p>
                    <p className="text-[9px] font-semibold text-slate-500 truncate">
                      {displayDesignation} • {displayDepartment}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[8px] uppercase font-bold text-slate-400 block">
                      EMP ID
                    </span>
                    <span className="text-[11px] font-mono font-bold text-sky-600">
                      {formattedInternId}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── BACK BOTTOM: Authorized Signatory & Security Policy ── */}
              <div className="relative z-10 pt-1.5 border-t border-slate-100 space-y-1 text-center">
                <div className="flex items-end justify-between px-1">
                  <div className="text-left">
                    <div className="h-10 flex items-end">
                      <img
                        src="/signature.png"
                        alt="Authorized Signature"
                        className="h-9 max-w-[130px] object-contain drop-shadow-2xs"
                      />
                    </div>
                    <div className="w-28 h-[1.5px] bg-sky-500 mt-0.5" />
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block mt-0.5">
                      Authorized Signatory
                    </span>
                  </div>

                  {/* Company Stamp / Logo */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="w-11 h-11 rounded-xl border border-sky-200/80 p-1 flex items-center justify-center bg-white/90 shadow-sm backdrop-blur-xs">
                      <img
                        src="/image.png"
                        alt="Stamp"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-[7.5px] uppercase font-bold text-sky-600 tracking-wider mt-1 block">
                      OFFICIAL SEAL
                    </span>
                  </div>
                </div>

                <p className="text-[8px] text-slate-500 leading-tight pt-1">
                  If found, please return to Vyorai Technologies, Tech Hub, India.
                  {intern.email ? ` • Contact: ${intern.email}` : ""}
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

      {/* Global CSS for high-fidelity physical badge printing (CR80 Standard: 54mm x 85.6mm / 2.125" x 3.375") */}
      <style jsx global>{`
        @media print {
          @page {
            size: 54mm 86mm;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #iwms-print-container,
          #iwms-print-container * {
            visibility: visible;
          }
          #iwms-print-container {
            position: fixed;
            left: 0;
            top: 0;
            width: 54mm !important;
            height: 85.6mm !important;
            display: flex;
            justify-content: center;
            align-items: center;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #iwms-print-container .w-\[340px\],
          #iwms-print-container .sm\:w-\[380px\] {
            width: 54mm !important;
            height: 85.6mm !important;
          }
        }
      `}</style>
    </div>
  );
}


