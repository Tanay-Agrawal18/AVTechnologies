import { NextRequest } from "next/server";

export function getBaseUrl(req?: NextRequest): string {
  // 1. If explicit environment variable is configured and not default localhost, use it
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // 2. If Vercel standard environment variable exists
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  // 3. Dynamically detect from incoming HTTP request host header (supports live domains, Vercel preview/production, custom domains)
  if (req) {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (host && !host.includes("localhost")) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  // 4. Default fallback: live Vyorai domain or NEXT_PUBLIC_APP_URL or fallback
  return (
    process.env.NEXT_PUBLIC_APP_URL || "https://vyorai-three.vercel.app"
  ).replace(/\/$/, "");
}
