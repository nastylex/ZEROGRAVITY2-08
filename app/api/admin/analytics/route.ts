// Authenticated analytics snapshot for the admin dashboard.
// Returns the full aggregated snapshot from the in-memory store.

import { auth } from "@/lib/auth";
import { getStore } from "@/lib/analytics/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  return Response.json(getStore().snapshot(), {
    headers: { "Cache-Control": "no-store" },
  });
}
