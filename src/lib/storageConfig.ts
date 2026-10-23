/**
 * Server-side Environment Validation for Storage Providers (Local & Cloudflare R2 / S3)
 */

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint?: string;
}

export interface StorageConfig {
  adapter: "local" | "r2" | "s3";
  localStorageDir: string;
  r2?: R2Config;
}

export function validateStorageEnv(): {
  isValid: boolean;
  adapter: "local" | "r2" | "s3";
  config?: StorageConfig;
  errors: string[];
} {
  const errors: string[] = [];
  const rawAdapter = (process.env.STORAGE_ADAPTER || "local").trim().toLowerCase();

  if (rawAdapter !== "local" && rawAdapter !== "r2" && rawAdapter !== "s3") {
    errors.push(
      `Invalid STORAGE_ADAPTER "${process.env.STORAGE_ADAPTER}". Allowed values are "local", "r2", or "s3".`
    );
    return { isValid: false, adapter: "local", errors };
  }

  const adapter = rawAdapter as "local" | "r2" | "s3";

  if (adapter === "local") {
    const localStorageDir = process.env.LOCAL_STORAGE_DIR || "./uploads";
    return {
      isValid: true,
      adapter: "local",
      config: {
        adapter: "local",
        localStorageDir,
      },
      errors: [],
    };
  }

  // Cloudflare R2 or S3-compatible configuration validation
  const accountId = (process.env.R2_ACCOUNT_ID || "").trim();
  const accessKeyId = (
    process.env.R2_ACCESS_KEY_ID ||
    process.env.S3_ACCESS_KEY_ID ||
    ""
  ).trim();
  const secretAccessKey = (
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.S3_SECRET_ACCESS_KEY ||
    ""
  ).trim();
  const bucketName = (
    process.env.R2_BUCKET_NAME ||
    process.env.S3_BUCKET_NAME ||
    ""
  ).trim();
  const endpoint = (
    process.env.R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "")
  ).trim();

  if (!bucketName) {
    errors.push("Missing required bucket name: Set R2_BUCKET_NAME (or S3_BUCKET_NAME).");
  }
  if (!accessKeyId) {
    errors.push("Missing required Access Key: Set R2_ACCESS_KEY_ID (or S3_ACCESS_KEY_ID).");
  }
  if (!secretAccessKey) {
    errors.push("Missing required Secret Access Key: Set R2_SECRET_ACCESS_KEY (or S3_SECRET_ACCESS_KEY).");
  }
  if (!endpoint && !accountId) {
    errors.push(
      "Missing Cloudflare R2 endpoint: Set R2_ACCOUNT_ID (recommended) or specify custom R2_ENDPOINT."
    );
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      adapter,
      errors,
    };
  }

  return {
    isValid: true,
    adapter,
    config: {
      adapter,
      localStorageDir: process.env.LOCAL_STORAGE_DIR || "./uploads",
      r2: {
        accountId,
        accessKeyId,
        secretAccessKey,
        bucketName,
        endpoint,
      },
    },
    errors: [],
  };
}
