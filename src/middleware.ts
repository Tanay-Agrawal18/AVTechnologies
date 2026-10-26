import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { JWT_SECRET_KEY, SESSION_COOKIE_NAME } from "@/lib/jwtConfig";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets & public routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/icons/") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.json" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/offline.html" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/image.png" ||
    pathname === "/login" ||
    pathname === "/setup-password" ||
    pathname.startsWith("/verify") ||
    pathname.startsWith("/api/verify") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/setup-password")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    const role = payload.role as string;
    const status = payload.status as string;

    if (status !== "active") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Account inactive" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/login?error=inactive", request.url));
    }

    // Role Route Protections
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
      if (role !== "admin") {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Forbidden: Admin required" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/intern/dashboard", request.url));
      }
    }

    if (pathname.startsWith("/intern") || pathname.startsWith("/api/intern")) {
      if (role !== "intern") {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Forbidden: Intern required" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/intern/:path*",
    "/api/admin/:path*",
    "/api/intern/:path*",
    "/api/files/:path*",
  ],
};
