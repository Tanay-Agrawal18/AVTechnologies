import { redis } from "./redis";

export const CACHE_TTL = {
  // Frequently requested dashboard KPI counters (60 seconds)
  ADMIN_KPIS: 60,
  // Role-Aware Analytics caches (60 seconds)
  ADMIN_ANALYTICS: 60,
  INTERN_ANALYTICS: 60,
  // Project list for a given actor/role/filter (60 seconds)
  PROJECTS_LIST: 60,
  // Project detail by ID (120 seconds)
  PROJECT_DETAIL: 120,
  // Admin Review Queue paginated view (30 seconds)
  REVIEW_QUEUE: 30,
} as const;

export const CACHE_KEYS = {
  adminKpis: () => `cache:admin:kpis`,
  adminAnalytics: (startDate?: string, endDate?: string, department?: string, internId?: string) =>
    `cache:admin:analytics:s:${startDate || "all"}:e:${endDate || "all"}:d:${department || "all"}:i:${internId || "all"}`,
  internAnalytics: (internId: string) => `cache:intern:${internId}:analytics`,
  projectsList: (role: string, userId: string, status?: string) =>
    `cache:user:${userId}:role:${role}:projects:status:${status || "all"}`,
  projectDetail: (projectId: string, role: string, userId: string) =>
    `cache:user:${userId}:role:${role}:project:${projectId}`,
  reviewQueue: (
    role: string,
    userId: string,
    status?: string,
    internId?: string,
    department?: string,
    page?: number,
    limit?: number
  ) =>
    `cache:user:${userId}:role:${role}:rq:status:${status || "pending"}:intern:${internId || "all"}:dept:${department || "all"}:p:${page || 1}:l:${limit || 15}`,
  // Track project-associated cache keys for targeted invalidation
  projectTags: (projectId: string) => `tags:project:${projectId}`,
  userProjectListKeys: (userId: string) => `tags:user:${userId}:project_lists`,
  allProjectListKeys: () => `tags:global:project_lists`,
  allReviewQueueKeys: () => `tags:global:review_queue`,
  allAnalyticsKeys: () => `tags:global:analytics`,
};

/**
 * In-memory fallback LRU cache when Redis is unavailable or unconfigured.
 * Guarantees sub-millisecond retrieval without repetitive database loads.
 */
interface MemoryCacheEntry {
  value: unknown;
  expiresAt: number;
}

const memoryCache = new Map<string, MemoryCacheEntry>();
const MAX_MEMORY_CACHE_SIZE = 1000;

function getMemoryCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  // LRU behavior: refresh key order
  memoryCache.delete(key);
  memoryCache.set(key, entry);
  return entry.value as T;
}

function setMemoryCache(key: string, value: unknown, ttlSeconds: number) {
  if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

function deleteMemoryCache(key: string) {
  memoryCache.delete(key);
}

/**
 * In-memory in-flight promise map for request coalescing / stampede protection.
 */
const inFlightPromises = new Map<string, Promise<unknown>>();

/**
 * Cache-aside fetch wrapper with automatic error handling, logging, DB fallback,
 * and stampede protection (promise deduplication).
 */
export function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  trackingKeyTag?: string
): Promise<T> {
  // 1. Check ultra-fast in-memory cache tier first
  const memCached = getMemoryCache<T>(key);
  if (memCached !== null) {
    return Promise.resolve(memCached);
  }

  // 2. Cache stampede protection: Coalesce concurrent requests for the exact same key synchronously
  const existingPromise = inFlightPromises.get(key);
  if (existingPromise) {
    return existingPromise as Promise<T>;
  }

  if (!redis) {
    const fallbackPromise = (async () => {
      try {
        const freshData = await fetcher();
        if (freshData !== undefined && freshData !== null) {
          setMemoryCache(key, freshData, ttlSeconds);
        }
        return freshData;
      } finally {
        inFlightPromises.delete(key);
      }
    })();
    inFlightPromises.set(key, fallbackPromise);
    return fallbackPromise;
  }

  const executionPromise = (async () => {
    // 3. Try reading from Redis
    try {
      const cached = await redis.get<T>(key);
      if (cached !== null && cached !== undefined) {
        setMemoryCache(key, cached, Math.min(ttlSeconds, 30)); // sync to local memory for instant subsequent reads
        return cached;
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.warn(`[Cache] Redis GET failed for key "${key}". Falling back to DB. Error: ${errorMsg}`);
    }

    try {
      const freshData = await fetcher();

      // Populate local memory cache
      if (freshData !== undefined && freshData !== null) {
        setMemoryCache(key, freshData, ttlSeconds);
      }

      // Asynchronously populate Redis cache without blocking response if write fails
      if (redis && freshData !== undefined && freshData !== null) {
        try {
          await redis.set(key, freshData, { ex: ttlSeconds });
          if (trackingKeyTag) {
            await redis.sadd(trackingKeyTag, key);
            await redis.expire(trackingKeyTag, ttlSeconds * 2);
          }
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          console.warn(`[Cache] Redis SET failed for key "${key}". Error: ${errorMsg}`);
        }
      }

      return freshData;
    } finally {
      inFlightPromises.delete(key);
    }
  })();

  inFlightPromises.set(key, executionPromise);
  return executionPromise;
}

/**
 * Invalidate a specific key or list of keys safely across memory and Redis.
 */
export async function invalidateCacheKeys(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const validKeys = keys.filter(Boolean);

  // Invalidate local memory cache immediately
  for (const k of validKeys) {
    deleteMemoryCache(k);
  }

  if (!redis) return;
  try {
    if (validKeys.length > 0) {
      await redis.del(...validKeys);
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.warn(`[Cache] Redis DEL failed for keys [${keys.join(", ")}]. Error: ${errorMsg}`);
  }
}

/**
 * Invalidate all project-related caches across admins and interns.
 */
export async function invalidateProjectsCache(projectId?: string): Promise<void> {
  if (!redis) return;

  try {
    const keysToDelete: string[] = [];

    // Always invalidate KPI cache on project change (it impacts overall stats)
    keysToDelete.push(CACHE_KEYS.adminKpis());

    // Invalidate tracked global/user project lists if stored in set
    const trackedListKeys = await redis.smembers<string[]>(CACHE_KEYS.allProjectListKeys()).catch(() => []);
    if (Array.isArray(trackedListKeys) && trackedListKeys.length > 0) {
      keysToDelete.push(...trackedListKeys);
      keysToDelete.push(CACHE_KEYS.allProjectListKeys());
    }

    if (projectId) {
      const trackedDetailKeys = await redis.smembers<string[]>(CACHE_KEYS.projectTags(projectId)).catch(() => []);
      if (Array.isArray(trackedDetailKeys) && trackedDetailKeys.length > 0) {
        keysToDelete.push(...trackedDetailKeys);
        keysToDelete.push(CACHE_KEYS.projectTags(projectId));
      }
    }

    if (keysToDelete.length > 0) {
      await invalidateCacheKeys(...keysToDelete);
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.warn(`[Cache] Failed invalidating project caches. Error: ${errorMsg}`);
  }
}

/**
 * Invalidate KPI counters when tasks or users change.
 */
export async function invalidateKpiCache(): Promise<void> {
  await invalidateCacheKeys(CACHE_KEYS.adminKpis());
}

/**
 * Invalidate all Review Queue caches when tasks transition or submissions occur.
 */
export async function invalidateReviewQueueCache(): Promise<void> {
  if (!redis) return;
  try {
    const trackedRqKeys = await redis.smembers<string[]>(CACHE_KEYS.allReviewQueueKeys()).catch(() => []);
    if (Array.isArray(trackedRqKeys) && trackedRqKeys.length > 0) {
      await invalidateCacheKeys(...trackedRqKeys, CACHE_KEYS.allReviewQueueKeys());
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.warn(`[Cache] Failed invalidating review queue caches. Error: ${errorMsg}`);
  }
}

/**
 * Invalidate analytics caches when task state changes or submissions are reviewed.
 */
export async function invalidateAnalyticsCache(internId?: string): Promise<void> {
  if (!redis) return;
  try {
    const keysToDelete: string[] = [];
    if (internId) {
      keysToDelete.push(CACHE_KEYS.internAnalytics(internId));
    }
    const trackedAnalyticsKeys = await redis.smembers<string[]>(CACHE_KEYS.allAnalyticsKeys()).catch(() => []);
    if (Array.isArray(trackedAnalyticsKeys) && trackedAnalyticsKeys.length > 0) {
      keysToDelete.push(...trackedAnalyticsKeys, CACHE_KEYS.allAnalyticsKeys());
    }
    if (keysToDelete.length > 0) {
      await invalidateCacheKeys(...keysToDelete);
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.warn(`[Cache] Failed invalidating analytics caches. Error: ${errorMsg}`);
  }
}

