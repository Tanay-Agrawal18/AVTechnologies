import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary server-side using server-only environment variables
export function getCloudinaryClient() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudinaryUrl = process.env.CLOUDINARY_URL;

  if (cloudinaryUrl) {
    // cloudinary SDK automatically handles CLOUDINARY_URL if present,
    // but explicit config ensures isolation
    cloudinary.config({
      cloudinary_url: cloudinaryUrl,
      secure: true,
    });
  } else if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  } else {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or CLOUDINARY_URL) in environment variables."
    );
  }

  return cloudinary;
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET)
  );
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  bytes: number;
  format: string;
}

export async function uploadToCloudinary(
  buffer: Buffer,
  folder = "iwms_daily_progress"
): Promise<CloudinaryUploadResult> {
  const client = getCloudinaryClient();

  return new Promise((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          { width: 1920, height: 1080, crop: "limit" },
          { quality: "auto:good" },
        ],
      },
      (error: unknown, result: { public_id: string; secure_url: string; bytes: number; format: string } | undefined) => {
        if (error || !result) {
          return reject(error || new Error("Unknown Cloudinary upload failure"));
        }
        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
          bytes: result.bytes,
          format: result.format,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

export async function deleteFromCloudinary(
  publicId: string
): Promise<{ result: string }> {
  const client = getCloudinaryClient();
  const res = await client.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
  return res;
}
