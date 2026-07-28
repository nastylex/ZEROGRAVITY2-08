// SSE stream for admin dashboard (Vercel-compatible)
// Streams events as `data: <json>\n\n`
// Requires server-side auth to ensure only admins can open the stream.

import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // send a comment to establish the connection (optional)
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Example: send periodic updates. Replace with real metrics fetch.
      const sendUpdate = () => {
        const payload = {
          time: new Date().toISOString(),
          // Replace these simulated fields with real values from your analytics/event store
          visitors: Math.floor(Math.random() * 3000),
          signups: Math.floor(Math.random() * 200),
          trafficSources: [
            { source: "Organic search", value: Math.floor(Math.random() * 5000) },
            { source: "Direct", value: Math.floor(Math.random() * 3000) },
            { source: "Social", value: Math.floor(Math.random() * 1500) },
            { source: "Referral", value: Math.floor(Math.random() * 1000) },
            { source: "Email", value: Math.floor(Math.random() * 600) },
          ],
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      // initial send
      sendUpdate();
      const iv = setInterval(sendUpdate, 2000);

      // Close when client disconnects
      const abortHandler = () => {
        clearInterval(iv);
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener?.("abort", abortHandler);
    },
    cancel() {
      // client cancelled — nothing extra needed here
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
