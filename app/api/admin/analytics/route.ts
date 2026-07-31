// Authenticated analytics snapshot for the admin dashboard.
// Returns the full aggregated snapshot from the Postgres-backed store.

import { auth } from "@/lib/auth";
import { snapshot } from "@/lib/analytics/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snap = await snapshot();
    return Response.json(snap, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analytics unavailable";
    return Response.json({ error: message }, {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
