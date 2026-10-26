import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
  college: z.string().trim().max(150).optional(),
  githubUrl: z.string().trim().max(250).optional(),
  linkedinUrl: z.string().trim().max(250).optional(),
  portfolioUrl: z.string().trim().max(250).optional(),
  twitterUrl: z.string().trim().max(250).optional(),
  skills: z.array(z.string().trim().max(50)).max(20).optional(),
  bio: z.string().trim().max(500).optional(),
});

export async function PATCH(req: NextRequest) {
  const sessionUser = await getSession();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(sessionUser.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (parsed.data.phone !== undefined) user.phone = parsed.data.phone;
    if (parsed.data.address !== undefined) user.address = parsed.data.address;
    if (parsed.data.college !== undefined) user.college = parsed.data.college;
    if (parsed.data.githubUrl !== undefined) user.githubUrl = parsed.data.githubUrl;
    if (parsed.data.linkedinUrl !== undefined) user.linkedinUrl = parsed.data.linkedinUrl;
    if (parsed.data.portfolioUrl !== undefined) user.portfolioUrl = parsed.data.portfolioUrl;
    if (parsed.data.twitterUrl !== undefined) user.twitterUrl = parsed.data.twitterUrl;
    if (parsed.data.skills !== undefined) user.skills = parsed.data.skills;
    if (parsed.data.bio !== undefined) user.bio = parsed.data.bio;

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        phone: user.phone,
        address: user.address,
        college: user.college,
        githubUrl: user.githubUrl,
        linkedinUrl: user.linkedinUrl,
        portfolioUrl: user.portfolioUrl,
        twitterUrl: user.twitterUrl,
        skills: user.skills,
        bio: user.bio,
      },
    });
  } catch (err: unknown) {
    console.error("Error updating user profile:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update profile" },
      { status: 500 }
    );
  }
}
