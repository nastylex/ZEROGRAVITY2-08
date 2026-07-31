// Authenticated analytics snapshot for the admin dashboard.
// Returns the full aggregated snapshot from the Postgres-backed store.

import { auth } from "@/lib/auth";
import { snapshot } from "@/lib/analytics/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  return Response.json(await snapshot(), {
    headers: { "Cache-Control": "no-store" },
  });
}
