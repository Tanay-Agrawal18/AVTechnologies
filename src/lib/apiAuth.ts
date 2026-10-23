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

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Insufficient permissions for this resource", code: "FORBIDDEN" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user };
}
