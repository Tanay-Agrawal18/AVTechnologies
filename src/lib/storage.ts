import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { validateStorageEnv } from "./storageConfig";

export interface StorageAdapter {
  saveFile(buffer: Buffer, originalName: string, mimeType: string): Promise<{ fileKey: string; fileSize: number }>;
  getFileStream(fileKey: string): Promise<Buffer | null>;
  deleteFile(fileKey: string): Promise<void>;
}

export class LocalPrivateStorageAdapter implements StorageAdapter {
  private baseDir: string;

  constructor(subFolder: string = "uploads") {
    // turbopackIgnore prevents dynamic tracing warnings during next build
    this.baseDir = path.join(/*turbopackIgnore: true*/ process.cwd(), subFolder);
  }

  private async ensureDir() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch {
      // directory exists
    }
  }

  async saveFile(
    buffer: Buffer,
    originalName: string
  ): Promise<{ fileKey: string; fileSize: number }> {
    await this.ensureDir();
    const ext = path.extname(originalName);
    const randomKey = `${Date.now()}-${crypto.randomBytes(16).toString("hex")}${ext}`;
    const filePath = path.join(this.baseDir, randomKey);

    await fs.writeFile(filePath, buffer);
    return {
      fileKey: randomKey,
      fileSize: buffer.length,
    };
  }

  async getFileStream(fileKey: string): Promise<Buffer | null> {
    // Sanitize fileKey to avoid directory traversal
    const safeKey = path.basename(fileKey);
    const filePath = path.join(this.baseDir, safeKey);
    try {
      return await fs.readFile(filePath);
    } catch {
      return null;
    }
  }

  async deleteFile(fileKey: string): Promise<void> {
    const safeKey = path.basename(fileKey);
    const filePath = path.join(this.baseDir, safeKey);
    try {
      await fs.unlink(filePath);
    } catch {
      // ignore if already deleted
    }
  }
}

/**
 * Cloudflare R2 Storage Adapter using S3-compatible API.
 * Keeps bucket strictly private. Files are streamed through Next.js server with
 * authenticated session & intern ownership checks. No public URLs are ever exposed.
 */
export class CloudflareR2StorageAdapter implements StorageAdapter {
  private client: S3Client;
  private bucketName: string;

  constructor(options: {
    accountId?: string;
    endpoint?: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
  }) {
    const endpoint =
      options.endpoint ||
      (options.accountId
        ? `https://${options.accountId}.r2.cloudflarestorage.com`
        : undefined);

    if (!endpoint) {
      throw new Error(
        "Cloudflare R2 Adapter configuration error: missing endpoint or accountId"
      );
    }

    this.bucketName = options.bucketName;
    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
    });
  }

  async saveFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<{ fileKey: string; fileSize: number }> {
    const ext = path.extname(originalName);
    const randomKey = `${Date.now()}-${crypto.randomBytes(16).toString("hex")}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: randomKey,
      Body: buffer,
      ContentType: mimeType || "application/octet-stream",
    });

    await this.client.send(command);

    return {
      fileKey: randomKey,
      fileSize: buffer.length,
    };
  }

  async getFileStream(fileKey: string): Promise<Buffer | null> {
    // Sanitize key
    const safeKey = path.basename(fileKey);
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: safeKey,
      });

      const response = await this.client.send(command);
      if (!response.Body) {
        return null;
      }

      // Transform stream to Buffer
      const byteArray = await response.Body.transformToByteArray();
      return Buffer.from(byteArray);
    } catch (err: unknown) {
      const error = err as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
      if (
        error.name === "NoSuchKey" ||
        error.Code === "NoSuchKey" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return null;
      }
      console.error("Cloudflare R2 getFileStream error:", err);
      throw err;
    }
  }

  async deleteFile(fileKey: string): Promise<void> {
    const safeKey = path.basename(fileKey);
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: safeKey,
      });
      await this.client.send(command);
    } catch (err) {
      console.error("Cloudflare R2 deleteFile error:", err);
      // Non-blocking for deletions
    }
  }
}

// Cached adapter singleton
let cachedAdapter: StorageAdapter | null = null;

// Factory to allow pluggable local or cloud (Cloudflare R2 / S3) providers
export function getStorageAdapter(): StorageAdapter {
  if (cachedAdapter) {
    return cachedAdapter;
  }

  const validation = validateStorageEnv();
  if (!validation.isValid) {
    const errorMsg = `Storage configuration error: ${validation.errors.join("; ")}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (validation.adapter === "local") {
    const subFolder = validation.config?.localStorageDir || "uploads";
    cachedAdapter = new LocalPrivateStorageAdapter(subFolder);
    return cachedAdapter;
  }

  if (validation.adapter === "r2" || validation.adapter === "s3") {
    const r2Config = validation.config?.r2;
    if (!r2Config) {
      throw new Error("Missing R2 configuration details despite passing validation.");
    }

    cachedAdapter = new CloudflareR2StorageAdapter({
      accountId: r2Config.accountId,
      endpoint: r2Config.endpoint,
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey,
      bucketName: r2Config.bucketName,
    });
    return cachedAdapter;
  }

  // Fallback to local
  cachedAdapter = new LocalPrivateStorageAdapter();
  return cachedAdapter;
}

/**
 * Resets cached adapter instance (useful in unit tests)
 */
export function resetStorageAdapter(): void {
  cachedAdapter = null;
}
