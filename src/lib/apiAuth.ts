import { NextResponse } from "next/server";
import { getSession } from "./auth";
import { SessionUser, UserRole } from "@/types";

export interface AuthenticatedContext {
  user: SessionUser;
}

export async function requireAuth(
  allowedRoles?: UserRole[]
): Promise<
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse }
> {
  const user = await getSession();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }

  if (user.status !== "active") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Account is inactive or pending setup", code: "FORBIDDEN" },
        { status: 403 }
      ),
    };
  }

  // Live database check to ensure account was not deactivated or deleted after token issuance
  let effectiveRole = user.role;
  try {
    const { connectDB } = await import("./db");
    const { User } = await import("@/models/User");
    await connectDB();
    const dbUser = await User.findById(user.id).select("status role").lean();

    if (!dbUser || dbUser.status !== "active") {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Account is inactive or pending setup", code: "FORBIDDEN" },
          { status: 403 }
        ),
      };
    }
    effectiveRole = dbUser.role;
  } catch (error) {
    console.error("Database status check error in requireAuth:", error);
    // Fail closed in production: Never silently authorize if live security check fails
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Security authorization check failed", code: "AUTH_CHECK_FAILED" },
          { status: 503 }
        ),
      };
    }
  }

  if (allowedRoles && !allowedRoles.includes(effectiveRole)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Insufficient permissions for this resource", code: "FORBIDDEN" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user: { ...user, role: effectiveRole } };
}
