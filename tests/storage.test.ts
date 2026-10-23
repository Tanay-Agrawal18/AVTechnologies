import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { validateStorageEnv } from "@/lib/storageConfig";
import {
  getStorageAdapter,
  resetStorageAdapter,
  LocalPrivateStorageAdapter,
  CloudflareR2StorageAdapter,
} from "@/lib/storage";

describe("Storage Adapter Configuration and Factory", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetStorageAdapter();
    process.env = { ...originalEnv };
  });

  afterEach(async () => {
    resetStorageAdapter();
    process.env = { ...originalEnv };
    try {
      const fs = await import("fs/promises");
      await fs.rm("./scratch_test_uploads", { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("defaults to local storage adapter when STORAGE_ADAPTER is unset or 'local'", () => {
    delete process.env.STORAGE_ADAPTER;
    const validation = validateStorageEnv();
    expect(validation.isValid).toBe(true);
    expect(validation.adapter).toBe("local");

    const adapter = getStorageAdapter();
    expect(adapter).toBeInstanceOf(LocalPrivateStorageAdapter);
  });

  it("validates missing R2 credentials when STORAGE_ADAPTER is 'r2'", () => {
    process.env.STORAGE_ADAPTER = "r2";
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;

    const validation = validateStorageEnv();
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThanOrEqual(3);
    expect(validation.errors.some((e) => e.includes("bucket name"))).toBe(true);
    expect(validation.errors.some((e) => e.includes("Access Key"))).toBe(true);

    expect(() => getStorageAdapter()).toThrowError(/Storage configuration error/);
  });

  it("validates and creates CloudflareR2StorageAdapter when valid credentials are provided", () => {
    process.env.STORAGE_ADAPTER = "r2";
    process.env.R2_ACCOUNT_ID = "test-account-id-12345";
    process.env.R2_ACCESS_KEY_ID = "test-access-key-xyz";
    process.env.R2_SECRET_ACCESS_KEY = "test-secret-key-abc";
    process.env.R2_BUCKET_NAME = "iwms-submissions-test";

    const validation = validateStorageEnv();
    expect(validation.isValid).toBe(true);
    expect(validation.adapter).toBe("r2");
    expect(validation.config?.r2?.bucketName).toBe("iwms-submissions-test");
    expect(validation.config?.r2?.endpoint).toBe(
      "https://test-account-id-12345.r2.cloudflarestorage.com"
    );

    const adapter = getStorageAdapter();
    expect(adapter).toBeInstanceOf(CloudflareR2StorageAdapter);
  });

  it("rejects unknown STORAGE_ADAPTER value safely", () => {
    process.env.STORAGE_ADAPTER = "unsupported_storage_service";

    const validation = validateStorageEnv();
    expect(validation.isValid).toBe(false);
    expect(validation.errors[0]).toContain('Invalid STORAGE_ADAPTER "unsupported_storage_service"');

    expect(() => getStorageAdapter()).toThrowError(/Invalid STORAGE_ADAPTER/);
  });

  it("local adapter correctly saves, reads, and deletes file", async () => {
    process.env.STORAGE_ADAPTER = "local";
    process.env.LOCAL_STORAGE_DIR = "./scratch_test_uploads";

    const adapter = getStorageAdapter();
    const testContent = Buffer.from("Hello Cloudflare R2 and Local Storage");
    const result = await adapter.saveFile(testContent, "sample.txt", "text/plain");

    expect(result.fileKey).toBeDefined();
    expect(result.fileSize).toBe(testContent.length);

    const readBuffer = await adapter.getFileStream(result.fileKey);
    expect(readBuffer).not.toBeNull();
    expect(readBuffer?.toString()).toBe("Hello Cloudflare R2 and Local Storage");

    await adapter.deleteFile(result.fileKey);
    const deletedBuffer = await adapter.getFileStream(result.fileKey);
    expect(deletedBuffer).toBeNull();
  });
});
