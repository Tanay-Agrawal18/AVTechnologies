import { NextResponse } from "next/server";
import { getSession, clearSessionCookie } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export async function GET() {
  const sessionUser = await getSession();
  if (!sessionUser) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  try {
    await connectDB();
    const dbUser = await User.findById(sessionUser.id)
      .select("name email role internId status")
      .lean();

    if (!dbUser) {
      await clearSessionCookie();
      return NextResponse.json(
        { authenticated: false, user: null, error: "User not found" },
        { status: 401 }
      );
    }

    if (dbUser.status !== "active") {
      await clearSessionCookie();
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
          error: "Account is inactive or pending setup",
          status: dbUser.status,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: dbUser._id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        internId: dbUser.internId,
        status: dbUser.status,
      },
    });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    // Fallback to session user if DB is momentarily unreachable
    return NextResponse.json({
      authenticated: true,
      user: {
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        role: sessionUser.role,
        internId: sessionUser.internId,
        status: sessionUser.status,
      },
    });
  }
}
