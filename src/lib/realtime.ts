/**
 * In-memory Realtime Event Bus for Server-Sent Events (SSE) and live UI synchronization.
 * Supports targeted, authorized event scoping (by userId, role, or broadcast to all active sessions).
 */

export type RealtimeEventType =
  | "notification_created"
  | "notification_updated"
  | "project_created"
  | "project_updated"
  | "project_deleted"
  | "task_created"
  | "task_updated"
  | "task_status_changed"
  | "task_unassigned"
  | "calendar_event_changed";

export interface RealtimeEventPayload {
  type: RealtimeEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface RealtimeSubscriber {
  id: string;
  userId: string;
  role: "admin" | "intern";
  send: (event: RealtimeEventPayload) => void;
}

class RealtimeBus {
  private subscribers: Map<string, RealtimeSubscriber> = new Map();

  /**
   * Register an authenticated subscriber.
   * Returns an unregister function for easy lifecycle cleanup.
   */
  public subscribe(subscriber: RealtimeSubscriber): () => void {
    this.subscribers.set(subscriber.id, subscriber);

    return () => {
      this.subscribers.delete(subscriber.id);
    };
  }

  /**
   * Emit an event targeted to specific user IDs, or role, or broadcast.
   * Strictly enforces access scoping to prevent data leakage across interns.
   */
  public emit(
    type: RealtimeEventType,
    data: Record<string, unknown>,
    scope?: {
      targetUserIds?: string[];
      targetRole?: "admin" | "intern";
      broadcast?: boolean;
    }
  ): void {
    const payload: RealtimeEventPayload = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    const targetUserSet = scope?.targetUserIds
      ? new Set(scope.targetUserIds.map((id) => id.toString()))
      : null;

    for (const sub of this.subscribers.values()) {
      try {
        if (scope?.broadcast) {
          sub.send(payload);
          continue;
        }

        // If specific target user IDs are given, check membership
        if (targetUserSet && targetUserSet.has(sub.userId)) {
          sub.send(payload);
          continue;
        }

        // If specific role is targeted
        if (scope?.targetRole && sub.role === scope.targetRole) {
          sub.send(payload);
          continue;
        }
      } catch (err) {
        console.error(`[RealtimeBus] Failed to dispatch to subscriber ${sub.id}:`, err);
      }
    }
  }

  public getSubscriberCount(): number {
    return this.subscribers.size;
  }
}

// Global singleton to survive Next.js fast reloads in dev
const globalForRealtime = global as unknown as { realtimeBus?: RealtimeBus };
export const realtimeBus = globalForRealtime.realtimeBus || new RealtimeBus();
if (process.env.NODE_ENV !== "production") {
  globalForRealtime.realtimeBus = realtimeBus;
}
