import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { uploadToCloudinary, deleteFromCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["intern", "admin"]);
  if (!auth.ok) return auth.response;

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary image service is not configured. Please set Cloudinary credentials in server environment." },
      { status: 503 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed formats: JPEG, PNG, WebP" },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds maximum size limit of 5MB" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(auth.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Upload new profile picture to Cloudinary
    const uploadResult = await uploadToCloudinary(buffer, "user_profiles");

    // 2. If user already had a previous profile picture on Cloudinary, delete it!
    const oldPublicId = user.profilePicturePublicId;
    if (oldPublicId) {
      try {
        await deleteFromCloudinary(oldPublicId);
      } catch (delErr) {
        console.error(`Failed to delete previous profile picture ${oldPublicId} from Cloudinary:`, delErr);
      }
    }

    // 3. Update user document
    user.profilePicture = uploadResult.secure_url;
    user.profilePicturePublicId = uploadResult.public_id;
    await user.save();

    return NextResponse.json({
      success: true,
      profilePicture: user.profilePicture,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to upload profile picture";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function DELETE() {
  const auth = await requireAuth(["intern", "admin"]);
  if (!auth.ok) return auth.response;

  try {
    await connectDB();
    const user = await User.findById(auth.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.profilePicturePublicId && isCloudinaryConfigured()) {
      try {
        await deleteFromCloudinary(user.profilePicturePublicId);
      } catch (delErr) {
        console.error(`Failed to delete profile picture ${user.profilePicturePublicId} from Cloudinary:`, delErr);
      }
    }

    user.profilePicture = undefined;
    user.profilePicturePublicId = undefined;
    await user.save();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to remove profile picture";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
