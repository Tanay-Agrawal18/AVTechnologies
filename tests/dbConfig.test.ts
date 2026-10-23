import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { validateDatabaseEnv } from "@/lib/dbConfig";

describe("Database Environment Validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("permits local fallback URI in development when MONGODB_URI is empty", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    delete process.env.MONGODB_URI;

    const result = validateDatabaseEnv();
    expect(result.isValid).toBe(true);
    expect(result.uri).toContain("mongodb://127.0.0.1:27017/iwms_dev");
    expect(result.isAtlas).toBe(false);
  });

  it("fails validation in production if MONGODB_URI is missing", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.MONGODB_URI;

    const result = validateDatabaseEnv();
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Missing required MONGODB_URI"))).toBe(true);
  });

  it("fails validation if MONGODB_URI has invalid protocol schema", () => {
    process.env.MONGODB_URI = "postgres://user:pass@localhost:5432/db";

    const result = validateDatabaseEnv();
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("must start with either"))).toBe(true);
  });

  it("validates MongoDB Atlas connection strings with credentials", () => {
    process.env.MONGODB_URI =
      "mongodb+srv://admin_user:secret123@cluster0.abcde.mongodb.net/iwms?retryWrites=true&w=majority";

    const result = validateDatabaseEnv();
    expect(result.isValid).toBe(true);
    expect(result.isAtlas).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("fails MongoDB Atlas connection string when credentials missing", () => {
    process.env.MONGODB_URI = "mongodb+srv://cluster0.abcde.mongodb.net/iwms";

    const result = validateDatabaseEnv();
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("requires authentication credentials"))).toBe(true);
  });
});
