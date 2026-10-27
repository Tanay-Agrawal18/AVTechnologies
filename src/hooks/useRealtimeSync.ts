"use client";

import { useEffect, useRef } from "react";

export type RealtimeEventCallback = (payload: {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}) => void;

/**
 * Custom React hook that connects to the authenticated /api/realtime/sse stream.
 * Automatically handles reconnection, tab visibility detection, and dispatches
 * local custom DOM events so any component or page can react instantly.
 */
export function useRealtimeSync(onEvent?: RealtimeEventCallback) {
  const onEventRef = useRef<RealtimeEventCallback | undefined>(undefined);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isDisposed = false;

    function establishConnection() {
      if (isDisposed || eventSource) return;

      try {
        const es = new EventSource("/api/realtime/sse");
        eventSource = es;

        const handleIncoming = (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data);
            if (onEventRef.current) {
              onEventRef.current(parsed);
            }
            window.dispatchEvent(
              new CustomEvent("iwms:realtime", { detail: parsed })
            );
          } catch {
            // ping or non-json message
          }
        };

        const eventNames = [
          "notification_created",
          "notification_updated",
          "project_created",
          "project_updated",
          "project_deleted",
          "task_created",
          "task_updated",
          "task_status_changed",
          "task_unassigned",
          "calendar_event_changed",
        ];

        for (const name of eventNames) {
          es.addEventListener(name, handleIncoming as EventListener);
        }

        es.onerror = () => {
          es.close();
          eventSource = null;
          if (!reconnectTimeout && !isDisposed) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null;
              if (document.visibilityState === "visible") {
                establishConnection();
              }
            }, 3000);
          }
        };
      } catch (err) {
        console.warn("[useRealtimeSync] Connection failed, will retry:", err);
      }
    }

    establishConnection();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!eventSource) {
          establishConnection();
        }
        window.dispatchEvent(new CustomEvent("iwms:revalidate"));
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isDisposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, []);
}
