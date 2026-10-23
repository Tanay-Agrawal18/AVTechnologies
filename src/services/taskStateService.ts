import { TaskStatus, UserRole } from "@/types";

export interface StatusTransitionRule {
  from: TaskStatus[];
  allowedRoles: UserRole[];
}

export const VALID_STATUS_TRANSITIONS: Record<TaskStatus, StatusTransitionRule> = {
  assigned: {
    from: [], // Initial state upon task creation
    allowedRoles: ["admin"],
  },
  in_progress: {
    from: ["assigned", "changes_requested"],
    allowedRoles: ["intern", "admin"],
  },
  submitted: {
    from: ["in_progress", "changes_requested"],
    allowedRoles: ["intern"],
  },
  changes_requested: {
    from: ["submitted"],
    allowedRoles: ["admin"],
  },
  approved: {
    from: ["submitted"],
    allowedRoles: ["admin"],
  },
  unassigned: {
    from: ["assigned", "in_progress", "submitted", "changes_requested"],
    allowedRoles: ["admin"],
  },
  transferred: {
    from: ["assigned", "in_progress", "submitted", "changes_requested"],
    allowedRoles: ["admin"],
  },
};

export function canTransitionStatus(
  currentStatus: TaskStatus,
  targetStatus: TaskStatus,
  actorRole: UserRole
): { valid: boolean; reason?: string } {
  if (currentStatus === targetStatus) {
    return { valid: false, reason: `Task is already in status '${targetStatus}'` };
  }

  const rule = VALID_STATUS_TRANSITIONS[targetStatus];
  if (!rule) {
    return { valid: false, reason: `Unknown target status '${targetStatus}'` };
  }

  if (!rule.allowedRoles.includes(actorRole)) {
    return {
      valid: false,
      reason: `Role '${actorRole}' is not permitted to transition task to '${targetStatus}'`,
    };
  }

  if (!rule.from.includes(currentStatus)) {
    return {
      valid: false,
      reason: `Cannot transition task from '${currentStatus}' to '${targetStatus}'`,
    };
  }

  return { valid: true };
}
