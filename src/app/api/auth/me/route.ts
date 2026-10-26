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
      .select("name email role internId status profilePicture phone address college githubUrl linkedinUrl bio department designation onboardingCompleted startDate endDate createdAt")
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
      const response = NextResponse.json(
        {
          authenticated: false,
          user: null,
          error: "Account is inactive or pending setup",
          status: dbUser.status,
        },
        { status: 403 }
      );
      response.cookies.set("iwms_session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      response.headers.set("Cache-Control", "no-store, max-age=0");
      return response;
    }

    const response = NextResponse.json({
      authenticated: true,
      user: {
        id: dbUser._id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        internId: dbUser.internId,
        status: dbUser.status,
        profilePicture: dbUser.profilePicture,
        phone: dbUser.phone,
        address: dbUser.address,
        college: dbUser.college,
        githubUrl: dbUser.githubUrl,
        linkedinUrl: dbUser.linkedinUrl,
        bio: dbUser.bio,
        department: dbUser.department,
        designation: dbUser.designation,
        onboardingCompleted: dbUser.onboardingCompleted ?? false,
        startDate: dbUser.startDate,
        endDate: dbUser.endDate,
        createdAt: dbUser.createdAt,
      },
    });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Service temporarily unavailable. Unable to verify session status." },
        { status: 503 }
      );
    }
    // Fallback to session user only in local development if DB is momentarily unreachable
    return NextResponse.json({
      authenticated: true,
      user: {
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        role: sessionUser.role,
        internId: sessionUser.internId,
        status: sessionUser.status,
        onboardingCompleted: sessionUser.onboardingCompleted ?? false,
      },
    });
  }
}
