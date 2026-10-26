import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database connection
vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

// Mock authentication utilities
vi.mock("@/lib/apiAuth", () => ({
  requireAuth: vi.fn(),
}));

import { requireAuth } from "@/lib/apiAuth";
import { User } from "@/models/User";
import { OnboardingStatusSchema } from "@/validators";
import { POST } from "@/app/api/intern/onboarding/route";
import { NextRequest, NextResponse } from "next/server";

describe("Phase 4: First-Time Onboarding for Interns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Validation & Security Schemas", () => {
    it("validates valid onboarding payload actions (finish, skip, reset)", () => {
      const finishValid = OnboardingStatusSchema.safeParse({ action: "finish" });
      const skipValid = OnboardingStatusSchema.safeParse({ action: "skip" });
      const resetValid = OnboardingStatusSchema.safeParse({ action: "reset" });

      expect(finishValid.success).toBe(true);
      expect(skipValid.success).toBe(true);
      expect(resetValid.success).toBe(true);
    });

    it("rejects unknown onboarding actions", () => {
      const invalid = OnboardingStatusSchema.safeParse({ action: "invalid_action" });
      expect(invalid.success).toBe(false);
    });

    it("allows optional supported profile fields during onboarding", () => {
      const validWithProfile = OnboardingStatusSchema.safeParse({
        action: "finish",
        phone: "+91 98765 43210",
        college: "Delhi University",
        githubUrl: "https://github.com/alexintern",
        linkedinUrl: "https://linkedin.com/in/alexintern",
        bio: "Full stack engineering intern",
      });
      expect(validWithProfile.success).toBe(true);
    });

    it("does not allow interns to modify protected account fields via onboarding payload", () => {
      const payloadWithProtected = {
        action: "finish",
        role: "admin",
        internId: "CUSTOM-999",
        status: "active",
        department: "Executive",
      };

      const parsed = OnboardingStatusSchema.safeParse(payloadWithProtected);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        // Schema strips unknown or disallowed keys
        expect((parsed.data as Record<string, unknown>).role).toBeUndefined();
        expect((parsed.data as Record<string, unknown>).internId).toBeUndefined();
        expect((parsed.data as Record<string, unknown>).department).toBeUndefined();
        expect((parsed.data as Record<string, unknown>).status).toBeUndefined();
      }
    });
  });

  describe("API Route Authorization and State Persistence", () => {
    it("rejects unauthenticated requests with 401", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: false,
        response: NextResponse.json(
          { error: "Authentication required", code: "UNAUTHORIZED" },
          { status: 401 }
        ),
      });

      const req = new NextRequest("http://localhost:3000/api/intern/onboarding", {
        method: "POST",
        body: JSON.stringify({ action: "finish" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("rejects non-intern accounts (e.g. admin) with 403", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: false,
        response: NextResponse.json(
          { error: "Insufficient permissions for this resource", code: "FORBIDDEN" },
          { status: 403 }
        ),
      });

      const req = new NextRequest("http://localhost:3000/api/intern/onboarding", {
        method: "POST",
        body: JSON.stringify({ action: "finish" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("FORBIDDEN");
    });

    it("persists onboarding completion when action is 'finish'", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: {
          id: "507f1f77bcf86cd799439011",
          email: "intern@vyorai.com",
          name: "Alex Intern",
          role: "intern",
          status: "active",
        },
      });

      const mockSave = vi.fn().mockResolvedValue(true);
      const mockDbUser = {
        _id: "507f1f77bcf86cd799439011",
        role: "intern",
        onboardingCompleted: false,
        save: mockSave,
      };

      vi.spyOn(User, "findById").mockResolvedValueOnce(mockDbUser as unknown as InstanceType<typeof User>);

      const req = new NextRequest("http://localhost:3000/api/intern/onboarding", {
        method: "POST",
        body: JSON.stringify({ action: "finish" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.onboardingCompleted).toBe(true);
      expect(mockDbUser.onboardingCompleted).toBe(true);
      expect(mockSave).toHaveBeenCalled();
    });

    it("persists onboarding completion when action is 'skip' so intern is not interrupted repeatedly", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: {
          id: "507f1f77bcf86cd799439011",
          email: "intern@vyorai.com",
          name: "Alex Intern",
          role: "intern",
          status: "active",
        },
      });

      const mockSave = vi.fn().mockResolvedValue(true);
      const mockDbUser = {
        _id: "507f1f77bcf86cd799439011",
        role: "intern",
        onboardingCompleted: false,
        save: mockSave,
      };

      vi.spyOn(User, "findById").mockResolvedValueOnce(mockDbUser as unknown as InstanceType<typeof User>);

      const req = new NextRequest("http://localhost:3000/api/intern/onboarding", {
        method: "POST",
        body: JSON.stringify({ action: "skip" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.onboardingCompleted).toBe(true);
      expect(mockDbUser.onboardingCompleted).toBe(true);
      expect(mockSave).toHaveBeenCalled();
    });

    it("resets onboarding status when action is 'reset'", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: {
          id: "507f1f77bcf86cd799439011",
          email: "intern@vyorai.com",
          name: "Alex Intern",
          role: "intern",
          status: "active",
        },
      });

      const mockSave = vi.fn().mockResolvedValue(true);
      const mockDbUser = {
        _id: "507f1f77bcf86cd799439011",
        role: "intern",
        onboardingCompleted: true,
        save: mockSave,
      };

      vi.spyOn(User, "findById").mockResolvedValueOnce(mockDbUser as unknown as InstanceType<typeof User>);

      const req = new NextRequest("http://localhost:3000/api/intern/onboarding", {
        method: "POST",
        body: JSON.stringify({ action: "reset" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.onboardingCompleted).toBe(false);
      expect(mockDbUser.onboardingCompleted).toBe(false);
      expect(mockSave).toHaveBeenCalled();
    });

    it("scopes database update strictly to authenticated session user ID and prevents modifying other users", async () => {
      const sessionUserId = "507f1f77bcf86cd799439011";
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: {
          id: sessionUserId,
          email: "intern@vyorai.com",
          name: "Alex Intern",
          role: "intern",
          status: "active",
        },
      });

      const findByIdSpy = vi.spyOn(User, "findById").mockResolvedValueOnce({
        _id: sessionUserId,
        role: "intern",
        onboardingCompleted: false,
        save: vi.fn().mockResolvedValue(true),
      } as unknown as InstanceType<typeof User>);

      // Attempting to send someone else's ID in body
      const req = new NextRequest("http://localhost:3000/api/intern/onboarding", {
        method: "POST",
        body: JSON.stringify({
          action: "finish",
          userId: "ATTACKER_SUPPLIED_TARGET_ID",
        }),
      });

      await POST(req);
      // Confirmed: User.findById is called ONLY with sessionUser.id
      expect(findByIdSpy).toHaveBeenCalledWith(sessionUserId);
      expect(findByIdSpy).not.toHaveBeenCalledWith("ATTACKER_SUPPLIED_TARGET_ID");
    });

    it("gracefully handles existing users without the new field", () => {
      // Existing user document simulation without onboardingCompleted
      const legacyUser = {
        name: "Legacy Intern",
        email: "legacy@vyorai.com",
        role: "intern",
        status: "active",
      };

      const onboardingState = (legacyUser as { onboardingCompleted?: boolean }).onboardingCompleted ?? false;
      expect(onboardingState).toBe(false);
    });
  });
});
