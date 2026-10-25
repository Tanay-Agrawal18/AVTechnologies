/**
 * Centralized, Strictly-Validated JWT Configuration for Vyorai (IWMS).
 *
 * Requirements:
 * - Never use weak fallback secrets in production.
 * - Key length must be at least 32 characters (256 bits).
 * - Fails closed if missing in production.
 * - Reusable across Edge middleware and Node.js server runtimes.
 */

const FALLBACK_DEV_SECRET = "dev_secret_vyorai_intern_management_system_secure_key_2026";

export function validateJwtEnv(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const secret = (process.env.JWT_SECRET || "").trim();

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      errors.push("Missing required JWT_SECRET environment variable in production.");
    }
  } else {
    if (secret.length < 32) {
      errors.push("JWT_SECRET must be at least 32 characters long for HS256 security.");
    }
    if (process.env.NODE_ENV === "production" && (secret.includes("default") || secret.includes("super_secret"))) {
      errors.push("JWT_SECRET must not use a default or insecure placeholder secret in production.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getValidatedJwtSecret(): Uint8Array {
  const secret = (process.env.JWT_SECRET || "").trim();
  const validation = validateJwtEnv();

  // In production runtime, NEVER allow fallback to dev secret
  if (process.env.NODE_ENV === "production") {
    if (!validation.isValid) {
      const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build";
      if (!isBuildPhase) {
        throw new Error(`[Security Critical] JWT Configuration error: ${validation.errors.join("; ")}`);
      }
      // During build time only, return a build dummy, but runtime execution must fail
      return new TextEncoder().encode("build_time_ephemeral_placeholder_do_not_use_in_runtime");
    }
    return new TextEncoder().encode(secret);
  }

  const effectiveSecret = validation.isValid && secret ? secret : FALLBACK_DEV_SECRET;
  return new TextEncoder().encode(effectiveSecret);
}

export const JWT_SECRET_KEY = getValidatedJwtSecret();

export const SESSION_COOKIE_NAME = "iwms_session";

export const SESSION_DURATION_SECONDS =
  Number(process.env.SESSION_EXPIRY_DAYS || 7) * 24 * 60 * 60;
