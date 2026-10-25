import { redis } from "./redis";

export const CACHE_TTL = {
  // Frequently requested dashboard KPI counters (60 seconds)
  ADMIN_KPIS: 60,
  // Project list for a given actor/role/filter (60 seconds)
  PROJECTS_LIST: 60,
  // Project detail by ID (120 seconds)
  PROJECT_DETAIL: 120,
} as const;

export const CACHE_KEYS = {
  adminKpis: () => `cache:admin:kpis`,
  projectsList: (role: string, userId: string, status?: string) =>
    `cache:user:${userId}:role:${role}:projects:status:${status || "all"}`,
  projectDetail: (projectId: string, role: string, userId: string) =>
    `cache:user:${userId}:role:${role}:project:${projectId}`,
  // Track project-associated cache keys for targeted invalidation
  projectTags: (projectId: string) => `tags:project:${projectId}`,
  userProjectListKeys: (userId: string) => `tags:user:${userId}:project_lists`,
  allProjectListKeys: () => `tags:global:project_lists`,
};

/**
 * Cache-aside fetch wrapper with automatic error handling, logging, and DB fallback.
 * Guarantees that if Redis fails or throws an exception, fetcher() will be executed seamlessly.
 */
export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  trackingKeyTag?: string
): Promise<T> {
  if (!redis) {
    return await fetcher();
  }

  try {
    const cached = await redis.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.warn(`[Cache] Redis GET failed for key "${key}". Falling back to DB. Error: ${errorMsg}`);
  }

  const freshData = await fetcher();

  // Asynchronously populate cache without blocking response if write fails
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
}

/**
 * Invalidate a specific key or list of keys safely.
 */
export async function invalidateCacheKeys(...keys: string[]): Promise<void> {
  if (!redis || keys.length === 0) return;
  try {
    const validKeys = keys.filter(Boolean);
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
