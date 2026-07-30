import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  const secret = request.headers.get("x-detection-secret");
  if (!process.env.DETECTION_SECRET || process.env.DETECTION_SECRET !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { sessionId, isBot, botScore, reason } = body;
    if (!sessionId) return NextResponse.json({ error: "missing sessionId" }, { status: 400 });

    const meta = { reason: reason ?? null, updatedAt: new Date().toISOString(), source: "detection-webhook" };

    const res = await query(
      `UPDATE sessions SET is_bot = $2, bot_score = $3, detection_meta = COALESCE(detection_meta, '{}'::jsonb) || $4::jsonb WHERE id = $1`,
      [sessionId, isBot === true, typeof botScore === "number" ? botScore : null, JSON.stringify(meta)]
    );

    if (res.rowCount && res.rowCount > 0) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "session not found" }, { status: 404 });
  } catch (err) {
    console.error("detection mark error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
