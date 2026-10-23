import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_super_secret_minimum_32_characters_key_2026"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets & public routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/login" ||
    pathname === "/setup-password" ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/setup-password")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("iwms_session")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
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
