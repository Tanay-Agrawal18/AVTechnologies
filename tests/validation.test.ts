import { describe, it, expect } from "vitest";
import {
  CreateInternSchema,
  CreateTaskSchema,
  PasswordSetupSchema,
} from "@/validators";

describe("Validation Schemas & Boundaries", () => {
  it("validates intern creation and rejects malformed email", () => {
    const invalid = CreateInternSchema.safeParse({
      name: "Alice",
      email: "not-an-email",
      internId: "INT-101",
    });
    expect(invalid.success).toBe(false);

    const valid = CreateInternSchema.safeParse({
      name: "Alice Johnson",
      email: "alice@company.com",
      internId: "AV-101",
      department: "Engineering",
    });
    expect(valid.success).toBe(true);

    const validAutoId = CreateInternSchema.safeParse({
      name: "Bob Builder",
      email: "bob@company.com",
      department: "Engineering",
    });
    expect(validAutoId.success).toBe(true);
  });

  it("enforces strong password policy on account setup", () => {
    // Missing number and uppercase
    const weak = PasswordSetupSchema.safeParse({
      token: "valid-token",
      password: "password",
      confirmPassword: "password",
    });
    expect(weak.success).toBe(false);

    // Mismatched confirmation
    const mismatch = PasswordSetupSchema.safeParse({
      token: "valid-token",
      password: "SecurePassword1!",
      confirmPassword: "SecurePassword2!",
    });
    expect(mismatch.success).toBe(false);

    // Valid setup
    const valid = PasswordSetupSchema.safeParse({
      token: "valid-token",
      password: "SecurePassword1!",
      confirmPassword: "SecurePassword1!",
    });
    expect(valid.success).toBe(true);
  });

  it("validates task due date is not before assignment date", () => {
    const invalidDates = CreateTaskSchema.safeParse({
      title: "Build Feature",
      description: "Comprehensive requirement description",
      priority: "medium",
      assignedInternId: "650f1234567890abcdef1234",
      assignmentDate: "2026-06-10",
      dueDate: "2026-06-01", // before assignment date
    });
    expect(invalidDates.success).toBe(false);

    const validDates = CreateTaskSchema.safeParse({
      title: "Build Feature",
      description: "Comprehensive requirement description",
      priority: "medium",
      assignedInternId: "650f1234567890abcdef1234",
      assignmentDate: "2026-06-01",
      dueDate: "2026-06-10",
    });
    expect(validDates.success).toBe(true);
  });
});
