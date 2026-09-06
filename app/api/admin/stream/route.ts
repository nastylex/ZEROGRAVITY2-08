// SSE stream for the admin dashboard.
// Pushes a fresh analytics snapshot every 2 seconds as `data: <json>\n\n`.
// Requires server-side auth so only admins can open the stream.

import { auth } from "@/lib/auth";
import { snapshot } from "@/lib/analytics/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send a comment to establish the connection (optional).
      controller.enqueue(encoder.encode(`: connected\n\n`));

      const send = async () => {
        try {
          const payload = await snapshot();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch (err) {
          // Transient DB error — push an error event so the dashboard can show
          // the reason instead of silently skipping ticks.
          const message = err instanceof Error ? err.message : "Analytics unavailable";
          controller.enqueue(
            encoder.encode(`event: analytics-error\ndata: ${JSON.stringify({ error: message })}\n\n`),
          );
        }
      };

      void send();
      const iv = setInterval(send, 2000);

      // Close when the client disconnects.
      const abortHandler = () => {
        clearInterval(iv);
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener?.("abort", abortHandler);
    },
    cancel() {
      // Client cancelled — nothing extra needed here.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
