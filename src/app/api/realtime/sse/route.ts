import { requireAuth } from "@/lib/apiAuth";
import { realtimeBus, RealtimeEventPayload } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) {
    return auth.response;
  }

  const user = auth.user;
  const subscriberId = `${user.id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

  const encoder = new TextEncoder();

  let cleanup: (() => void) | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Helper to enqueue SSE message
      const sendSseMessage = (event: string, data: unknown) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream might be closed
        }
      };

      // 1. Send initial connected event
      sendSseMessage("connected", {
        status: "connected",
        userId: user.id,
        role: user.role,
        serverTime: new Date().toISOString(),
      });

      // 2. Register subscriber on realtimeBus
      cleanup = realtimeBus.subscribe({
        id: subscriberId,
        userId: user.id,
        role: user.role as "admin" | "intern",
        send: (event: RealtimeEventPayload) => {
          sendSseMessage(event.type, event);
        },
      });

      // 3. Heartbeat every 15 seconds to keep connection alive across proxies
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(heartbeatTimer!);
        }
      }, 15000);
    },
    cancel() {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (cleanup) cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
