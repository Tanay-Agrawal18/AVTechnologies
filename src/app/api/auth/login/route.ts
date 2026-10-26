import { NextRequest, NextResponse } from "next/server";
import { UserService } from "@/services/userService";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { LoginSchema } from "@/validators";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid credentials format", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const user = await UserService.authenticateUser(parsed.data.email, parsed.data.password);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password, or account is inactive" },
        { status: 401 }
      );
    }

    const token = await createSessionToken(user);
    await setSessionCookie(token);

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        internId: user.internId,
      },
      redirectTo: user.role === "admin" ? "/admin/dashboard" : "/intern/dashboard",
    });

    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    res.cookies.set("iwms_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      expires,
    });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err: unknown) {
    console.error("Login route error:", err);
    return NextResponse.json(
      { error: "Internal server error during authentication" },
      { status: 500 }
    );
  }
}
