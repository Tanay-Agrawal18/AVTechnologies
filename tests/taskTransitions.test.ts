import { describe, it, expect } from "vitest";
import { canTransitionStatus } from "@/services/taskStateService";

describe("Task State Transition Engine", () => {
  it("allows intern to start assigned task (assigned -> in_progress)", () => {
    const result = canTransitionStatus("assigned", "in_progress", "intern");
    expect(result.valid).toBe(true);
  });

  it("allows intern to submit in_progress task (in_progress -> submitted)", () => {
    const result = canTransitionStatus("in_progress", "submitted", "intern");
    expect(result.valid).toBe(true);
  });

  it("prevents intern from directly approving their own task (submitted -> approved)", () => {
    const result = canTransitionStatus("submitted", "approved", "intern");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("not permitted");
  });

  it("allows admin to review and approve submitted task (submitted -> approved)", () => {
    const result = canTransitionStatus("submitted", "approved", "admin");
    expect(result.valid).toBe(true);
  });

  it("allows admin to request changes on submitted task (submitted -> changes_requested)", () => {
    const result = canTransitionStatus("submitted", "changes_requested", "admin");
    expect(result.valid).toBe(true);
  });

  it("allows intern to resume working on changes_requested task (changes_requested -> in_progress)", () => {
    const result = canTransitionStatus("changes_requested", "in_progress", "intern");
    expect(result.valid).toBe(true);
  });

  it("prevents illegal transition skipping lifecycle (assigned -> approved)", () => {
    const result = canTransitionStatus("assigned", "approved", "admin");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Cannot transition task");
  });
});
