import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const excludeBots = url.searchParams.get("exclude_bots") === "true";

  if (!process.env.DATABASE_URL) {
    // fallback synthetic data for QA when no DB is configured
    const now = Date.now();
    const buckets = Array.from({ length: 24 }).map((_, i) => {
      const time = new Date(now - (23 - i) * 60 * 60 * 1000).toISOString();
      const visitors = Math.max(0, Math.round(200 + Math.sin(i / 3) * 40 + (excludeBots ? -30 : 0)));
      return { bucket: time, visitors };
    });
    return NextResponse.json({ excludeBots, data: buckets });
  }

  try {
    const rows = await query(
      `SELECT date_trunc('hour', started_at) as bucket, COUNT(*) as visitors
       FROM sessions
       WHERE started_at >= now() - interval '24 hours'
       ${excludeBots ? "AND (is_bot = false OR is_bot IS NULL)" : ""}
       GROUP BY bucket ORDER BY bucket ASC;`
    );

    return NextResponse.json({ excludeBots, data: rows.rows });
  } catch (err) {
    console.error("metrics error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
