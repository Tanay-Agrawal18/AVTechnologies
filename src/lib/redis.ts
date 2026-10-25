import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Resolves the Upstash Redis URL and Token from the environment.
 * Supports Vercel Upstash integration naming conventions:
 * - vyorai_KV_REST_API_URL / vyorai_KV_REST_API_TOKEN (present in project .env)
 * - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (standard Upstash)
 * - KV_REST_API_URL / KV_REST_API_TOKEN (standard Vercel KV)
 */
export function getRedisConfig(): { url: string; token: string } | null {
  const url =
    process.env.vyorai_KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL;

  const token =
    process.env.vyorai_KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return null;
  }

  return { url, token };
}

declare global {
  var __redisClient: Redis | null | undefined;
}

function createRedisClient(): Redis | null {
  const config = getRedisConfig();
  if (!config) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[Redis] Upstash Redis credentials not detected in environment. Caching will be disabled (fallback to DB).");
    }
    return null;
  }

  try {
    return new Redis({
      url: config.url,
      token: config.token,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Redis] Failed to initialize Upstash Redis client: ${errorMsg}`);
    return null;
  }
}

/**
 * Centralized, singleton server-only Upstash Redis client.
 */
export const redis: Redis | null =
  global.__redisClient !== undefined ? global.__redisClient : (global.__redisClient = createRedisClient());

/**
 * Helper to check if Redis is actively configured and reachable.
 */
export async function isRedisHealthy(): Promise<boolean> {
  if (!redis) return false;
  try {
    const pingResult = await redis.ping();
    return pingResult === "PONG" || pingResult === "pong";
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Redis] Health ping failed: ${errorMsg}`);
    return false;
  }
}
