// Pageview beacon for the self-hosted analytics store.
// POST /api/track with JSON { path, title?, referrer? } — used by the client
// tracker. GET /api/track?path=...&title=... is kept as a script-less fallback.

import { NextRequest } from "next/server";
import { record } from "@/lib/analytics/store";

export const dynamic = "force-dynamic";

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function shouldTrack(path: string): boolean {
  if (!path || path.length > 200) return false;
  // Never track the admin panel or API/static assets — they would pollute the data.
  if (path.startsWith("/admin") || path.startsWith("/api") || path.startsWith("/_next")) return false;
  if (/\.(png|jpe?g|gif|svg|webp|ico|css|js|txt|xml|json|mp4|webm|woff2?|ttf|otf|pdf|zip)$/i.test(path)) return false;
  return true;
}

export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  const ip = getClientIp(req);
  const ownHost = req.headers.get("host") ?? undefined;
  const language = req.headers.get("accept-language")?.split(",")[0] ?? undefined;

  let body: { path?: string; title?: string; referrer?: string } = {};
  try {
    const parsed: unknown = await req.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      body = parsed as typeof body;
    }
  } catch {
    // malformed body — ignore
  }

  const path = typeof body.path === "string" ? body.path : "";
  if (!shouldTrack(path)) return new Response(null, { status: 204 });

  await record({
    path,
    title: typeof body.title === "string" ? body.title.slice(0, 200) : undefined,
    referrer: typeof body.referrer === "string" && body.referrer ? body.referrer.slice(0, 500) : undefined,
    ua,
    ip,
    language,
    ownHost,
  });

  return new Response(null, { status: 204 });
}

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") ?? "";
  if (!shouldTrack(path)) return new Response(null, { status: 204 });

  await record({
    path,
    title: req.nextUrl.searchParams.get("title")?.slice(0, 200) ?? undefined,
    referrer: req.nextUrl.searchParams.get("referrer")?.slice(0, 500) ?? undefined,
    ua: req.headers.get("user-agent") ?? "",
    ip: getClientIp(req),
    language: req.headers.get("accept-language")?.split(",")[0] ?? undefined,
    ownHost: req.headers.get("host") ?? undefined,
  });

  return new Response(null, { status: 204 });
}
