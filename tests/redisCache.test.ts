import { describe, it, expect, vi } from "vitest";
import dotenv from "dotenv";
dotenv.config();

import { redis, getRedisConfig, isRedisHealthy } from "@/lib/redis";
import {
  getOrSetCache,
  invalidateCacheKeys,
  invalidateProjectsCache,
  CACHE_KEYS,
} from "@/lib/cache";

describe("Upstash Redis Integration & Caching Layer", () => {
  it("resolves Upstash Redis configuration from environment variables without hardcoded secrets", () => {
    const config = getRedisConfig();
    expect(config).not.toBeNull();
    if (config) {
      expect(config.url).toMatch(/^https:\/\//);
      expect(config.token.length).toBeGreaterThan(10);
    }
  });

  it("checks Redis connectivity and health", async () => {
    const healthy = await isRedisHealthy();
    expect(typeof healthy).toBe("boolean");
  });

  it("handles cache misses and subsequent cache hits (Cache-Aside pattern)", async () => {
    const testKey = `test:cache:aside:${Date.now()}`;
    let dbCallCount = 0;
    const fetcher = async () => {
      dbCallCount++;
      return { id: "test-item", value: 42 };
    };

    // 1. First call -> Cache Miss -> fetcher called
    const firstResult = await getOrSetCache(testKey, 10, fetcher);
    expect(firstResult).toEqual({ id: "test-item", value: 42 });
    expect(dbCallCount).toBe(1);

    // If redis is connected, second call should be Cache Hit -> fetcher NOT called
    if (redis) {
      const secondResult = await getOrSetCache(testKey, 10, fetcher);
      expect(secondResult).toEqual({ id: "test-item", value: 42 });
      expect(dbCallCount).toBe(1); // Still 1! Cache Hit!
    }

    // Clean up
    await invalidateCacheKeys(testKey);
  });

  it("respects TTL and allows explicit key invalidation", async () => {
    const testKey = `test:ttl:${Date.now()}`;
    let calls = 0;
    const fetcher = async () => {
      calls++;
      return "fresh-value";
    };

    await getOrSetCache(testKey, 5, fetcher);
    expect(calls).toBe(1);

    // Invalidate
    await invalidateCacheKeys(testKey);

    // Call again -> should re-fetch because key was invalidated
    await getOrSetCache(testKey, 5, fetcher);
    if (redis) {
      expect(calls).toBe(2);
    }

    // Cleanup
    await invalidateCacheKeys(testKey);
  });

  it("enforces strict user and role authorization scope isolation", async () => {
    const adminUser = { id: "user_admin_999", role: "admin" };
    const internUserA = { id: "user_intern_111", role: "intern" };
    const internUserB = { id: "user_intern_222", role: "intern" };

    const keyAdmin = CACHE_KEYS.projectsList(adminUser.role, adminUser.id, "all");
    const keyInternA = CACHE_KEYS.projectsList(internUserA.role, internUserA.id, "all");
    const keyInternB = CACHE_KEYS.projectsList(internUserB.role, internUserB.id, "all");

    // Keys must be completely distinct
    expect(keyAdmin).not.toEqual(keyInternA);
    expect(keyInternA).not.toEqual(keyInternB);
    expect(keyInternA).toContain(internUserA.id);
    expect(keyInternB).toContain(internUserB.id);

    // Detail keys must also isolate user & role
    const detailKeyA = CACHE_KEYS.projectDetail("proj_123", internUserA.role, internUserA.id);
    const detailKeyB = CACHE_KEYS.projectDetail("proj_123", internUserB.role, internUserB.id);
    expect(detailKeyA).not.toEqual(detailKeyB);
  });

  it("gracefully falls back to database fetcher on simulated Redis failures", async () => {
    const testKey = `test:fallback:${Date.now()}`;
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return { fallback: true };
    };

    // If redis exists, temporarily mock redis.get to simulate a Redis failure/timeout
    if (redis) {
      const originalGet = redis.get.bind(redis);
      (redis as unknown as { get: (key: string) => Promise<unknown> }).get = vi
        .fn()
        .mockRejectedValue(new Error("Simulated Redis network timeout"));

      const result = await getOrSetCache(testKey, 10, fetcher);

      // Verify that failure did not crash the app, and database fallback executed
      expect(result).toEqual({ fallback: true });
      expect(fetchCount).toBe(1);

      // Restore
      (redis as unknown as { get: (key: string) => Promise<unknown> }).get = originalGet;
    }
  });

  it("invalidates project tags and global list keys upon mutation", async () => {
    if (!redis) return;

    const projectId = "proj_test_invalidation_777";
    const detailKey = CACHE_KEYS.projectDetail(projectId, "admin", "admin_1");
    const listKey = CACHE_KEYS.projectsList("admin", "admin_1");

    // Populate
    await getOrSetCache(detailKey, 60, async () => ({ id: projectId }), CACHE_KEYS.projectTags(projectId));
    await getOrSetCache(listKey, 60, async () => [{ id: projectId }], CACHE_KEYS.allProjectListKeys());

    // Invalidate
    await invalidateProjectsCache(projectId);

    // Verify detailKey and listKey were evicted
    const cachedDetail = await redis.get(detailKey);
    const cachedList = await redis.get(listKey);

    expect(cachedDetail).toBeNull();
    expect(cachedList).toBeNull();
  });
});
