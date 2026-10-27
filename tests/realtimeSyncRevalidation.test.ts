/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

describe("Bounded Background Revalidation (useRealtimeSync)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Default document visibility to visible
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });

    // Mock global EventSource
    class MockEventSource {
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
      close = vi.fn();
      onerror = null;
    }
    vi.stubGlobal("EventSource", MockEventSource);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("triggers periodic iwms:revalidate approximately every 30 seconds while tab is visible", () => {
    const revalidateListener = vi.fn();
    window.addEventListener("iwms:revalidate", revalidateListener);

    renderHook(() => useRealtimeSync());

    // Initially, no revalidate event fired yet
    expect(revalidateListener).toHaveBeenCalledTimes(0);

    // Fast-forward 30 seconds
    vi.advanceTimersByTime(30000);
    expect(revalidateListener).toHaveBeenCalledTimes(1);

    // Fast-forward another 30 seconds
    vi.advanceTimersByTime(30000);
    expect(revalidateListener).toHaveBeenCalledTimes(2);

    window.removeEventListener("iwms:revalidate", revalidateListener);
  });

  it("suspends periodic revalidation when tab is hidden", () => {
    const revalidateListener = vi.fn();
    window.addEventListener("iwms:revalidate", revalidateListener);

    renderHook(() => useRealtimeSync());

    // Switch tab to hidden
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    // Advance 60 seconds while hidden
    vi.advanceTimersByTime(60000);
    // Should NOT have received periodic revalidate events while hidden
    expect(revalidateListener).toHaveBeenCalledTimes(0);

    window.removeEventListener("iwms:revalidate", revalidateListener);
  });

  it("triggers immediate revalidation and resumes 30s timer when tab becomes visible again", () => {
    const revalidateListener = vi.fn();
    window.addEventListener("iwms:revalidate", revalidateListener);

    renderHook(() => useRealtimeSync());

    // Switch tab to hidden
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(revalidateListener).toHaveBeenCalledTimes(0);

    // Switch tab back to visible
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    // Immediate revalidation on visibility change
    expect(revalidateListener).toHaveBeenCalledTimes(1);

    // 30 seconds later, periodic timer fires again
    vi.advanceTimersByTime(30000);
    expect(revalidateListener).toHaveBeenCalledTimes(2);

    window.removeEventListener("iwms:revalidate", revalidateListener);
  });

  it("cleans up polling intervals, reconnect timers, and event listeners on unmount", () => {
    const revalidateListener = vi.fn();
    window.addEventListener("iwms:revalidate", revalidateListener);

    const { unmount } = renderHook(() => useRealtimeSync());

    unmount();

    // Advance timers after unmount
    vi.advanceTimersByTime(60000);
    expect(revalidateListener).toHaveBeenCalledTimes(0);

    // Visibility change after unmount should not trigger revalidate
    document.dispatchEvent(new Event("visibilitychange"));
    expect(revalidateListener).toHaveBeenCalledTimes(0);

    window.removeEventListener("iwms:revalidate", revalidateListener);
  });

  it("dispatches iwms:realtime events when SSE messages arrive without interfering with polling", () => {
    const realtimeListener = vi.fn();
    window.addEventListener("iwms:realtime", realtimeListener);

    let eventCallback: ((e: { data: string }) => void) | null = null;
    class CapturingEventSource {
      addEventListener = vi.fn((name, cb) => {
        if (name === "task_created") {
          eventCallback = cb;
        }
      });
      removeEventListener = vi.fn();
      close = vi.fn();
      onerror = null;
    }
    vi.stubGlobal("EventSource", CapturingEventSource);

    renderHook(() => useRealtimeSync());

    expect(eventCallback).toBeDefined();
    // Simulate incoming SSE event
    eventCallback!({
      data: JSON.stringify({
        type: "task_created",
        data: { taskId: "123", title: "New Task" },
      }),
    });

    expect(realtimeListener).toHaveBeenCalledTimes(1);
    expect(realtimeListener.mock.calls[0][0].detail).toEqual({
      type: "task_created",
      data: { taskId: "123", title: "New Task" },
    });

    window.removeEventListener("iwms:realtime", realtimeListener);
  });
});
