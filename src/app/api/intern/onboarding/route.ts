import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { OnboardingStatusSchema } from "@/validators";

export async function POST(req: NextRequest) {
  // Enforce authenticated intern role
  const auth = await requireAuth(["intern"]);
  if (!auth.ok) {
    return auth.response;
  }

  const sessionUser = auth.user;

  try {
    const body = await req.json();
    const parsed = OnboardingStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid onboarding payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(sessionUser.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Role check from server-side database record
    if (user.role !== "intern") {
      return NextResponse.json(
        { error: "Onboarding is only applicable to intern accounts", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    if (parsed.data.action === "reset") {
      user.onboardingCompleted = false;
    } else {
      // Both "finish" and "skip" mark onboarding as completed to prevent repeating prompt
      user.onboardingCompleted = true;

      // If optional supported profile details were provided during onboarding, update them safely
      if (parsed.data.phone !== undefined) user.phone = parsed.data.phone;
      if (parsed.data.college !== undefined) user.college = parsed.data.college;
      if (parsed.data.githubUrl !== undefined) user.githubUrl = parsed.data.githubUrl;
      if (parsed.data.linkedinUrl !== undefined) user.linkedinUrl = parsed.data.linkedinUrl;
      if (parsed.data.bio !== undefined) user.bio = parsed.data.bio;
    }

    await user.save();

    const res = NextResponse.json({
      success: true,
      message:
        parsed.data.action === "reset"
          ? "Onboarding reset successfully"
          : "Onboarding status saved successfully",
      onboardingCompleted: user.onboardingCompleted,
    });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err: unknown) {
    console.error("Error updating onboarding status:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update onboarding status" },
      { status: 500 }
    );
  }
}
