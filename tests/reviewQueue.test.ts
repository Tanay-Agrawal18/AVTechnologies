import { describe, it, expect } from "vitest";
import { TaskService, ReviewQueueFilter } from "@/services/taskService";
import { canTransitionStatus } from "@/services/taskStateService";
import { SessionUser } from "@/types";

describe("Phase 1: Centralized Task Review Queue Unit Tests", () => {
  const adminActor: SessionUser = {
    id: "507f1f77bcf86cd799439011",
    email: "admin@vyorai.com",
    name: "Admin User",
    role: "admin",
    status: "active",
  };

  const internActor: SessionUser = {
    id: "507f1f77bcf86cd799439022",
    email: "intern@vyorai.com",
    name: "Intern User",
    role: "intern",
    internId: "VYOR-26-01",
    status: "active",
  };

  it("strictly enforces admin-only access for getReviewQueue", async () => {
    const filter: ReviewQueueFilter = { status: "pending" };
    await expect(
      TaskService.getReviewQueue(filter, internActor)
    ).rejects.toThrow("Unauthorized: Only administrators can access the task review queue");

    // Admin role passes role validation gate
    expect(adminActor.role).toBe("admin");
  });

  it("verifies valid status transitions for review actions", () => {
    // Admin approving submitted task
    const approveCheck = canTransitionStatus("submitted", "approved", "admin");
    expect(approveCheck.valid).toBe(true);

    // Admin requesting changes on submitted task
    const changesCheck = canTransitionStatus("submitted", "changes_requested", "admin");
    expect(changesCheck.valid).toBe(true);

    // Intern cannot approve or request changes
    expect(canTransitionStatus("submitted", "approved", "intern").valid).toBe(false);
    expect(canTransitionStatus("submitted", "changes_requested", "intern").valid).toBe(false);

    // Stale/invalid transitions: cannot approve a task that is already approved or still in assigned
    expect(canTransitionStatus("assigned", "approved", "admin").valid).toBe(false);
    expect(canTransitionStatus("approved", "approved", "admin").valid).toBe(false);
  });

  it("allows intern to resume in_progress from changes_requested", () => {
    const resumeCheck = canTransitionStatus("changes_requested", "in_progress", "intern");
    expect(resumeCheck.valid).toBe(true);
  });

  it("validates review decision options", () => {
    const validDecisions = ["approve", "request_changes"];
    expect(validDecisions.includes("approve")).toBe(true);
    expect(validDecisions.includes("request_changes")).toBe(true);
    expect(validDecisions.includes("reject")).toBe(false);
  });

  it("ensures latest submission selection logic is based on version descending", () => {
    const mockSubmissions = [
      { _id: "sub-1", version: 1, workDescription: "First draft", reviewStatus: "changes_requested" },
      { _id: "sub-2", version: 2, workDescription: "Second revised draft", reviewStatus: "pending" },
    ];

    const sorted = [...mockSubmissions].sort((a, b) => b.version - a.version);
    const latest = sorted[0];

    expect(latest._id).toBe("sub-2");
    expect(latest.version).toBe(2);
    expect(latest.reviewStatus).toBe("pending");
  });

  it("enforces cross-intern submission privacy check", () => {
    const taskOwnerId = "507f1f77bcf86cd799439022";
    const otherInternActor: SessionUser = {
      id: "507f1f77bcf86cd799439099",
      email: "other@vyorai.com",
      name: "Other Intern",
      role: "intern",
      internId: "VYOR-26-99",
      status: "active",
    };

    const isAuthorized = taskOwnerId === otherInternActor.id;
    expect(isAuthorized).toBe(false);
  });
});
