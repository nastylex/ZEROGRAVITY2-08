/**
 * Server-side parsing helpers for the self-hosted analytics tracker.
 * Lightweight, dependency-free UA parsing + traffic source derivation.
 */

export interface ParsedUa {
  deviceType: string; // "desktop" | "mobile" | "tablet" | "bot" | "unknown"
  browser: string;
  os: string;
}

const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|headless|monitor|prerender|python-requests|curl|wget|go-http-client|java\/|node-fetch|facebookexternalhit|linkedinbot|twitterbot|whatsapp/i;

export function parseUa(ua?: string): ParsedUa {
  const u = (ua ?? "").toLowerCase();

  if (!u || BOT_RE.test(u)) {
    return { deviceType: u ? "bot" : "unknown", browser: "Other", os: "Other" };
  }

  let deviceType = "desktop";
  if (/ipad|tablet|kindle|silk/i.test(u)) deviceType = "tablet";
  else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|windows phone/i.test(u)) {
    deviceType = "mobile";
  }

  let browser = "Other";
  if (/edg\//i.test(u)) browser = "Edge";
  else if (/opr\/|opera/i.test(u)) browser = "Opera";
  else if (/samsungbrowser/i.test(u)) browser = "Samsung Internet";
  else if (/chrome|crios/i.test(u)) browser = "Chrome";
  else if (/firefox|fxios/i.test(u)) browser = "Firefox";
  else if (/safari/i.test(u)) browser = "Safari";

  let os = "Other";
  if (/windows nt/i.test(u)) os = "Windows";
  else if (/iphone|ipad|ipod/i.test(u)) os = "iOS";
  else if (/android/i.test(u)) os = "Android";
  else if (/mac os x|macintosh/i.test(u)) os = "macOS";
  else if (/cros/i.test(u)) os = "Chrome OS";
  else if (/linux/i.test(u)) os = "Linux";

  return { deviceType, browser, os };
}

export function hostnameOf(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

/**
 * Buckets a referrer URL into a high-level traffic source.
 * Same-site / internal navigations count as "Direct".
 */
export function deriveSource(referrer?: string, ownHost?: string): string {
  if (!referrer) return "Direct";
  const host = hostnameOf(referrer);
  if (!host) return "Direct";

  const h = host.toLowerCase();
  const own = ownHost?.toLowerCase();
  if (own && (h === own || h === `www.${own}`)) return "Direct";

  if (/^mail\./i.test(h) || /(^|\.)(gmail|outlook|protonmail|zoho|icloud)\./i.test(h)) {
    return "Email";
  }
  if (/(^|\.)(google|bing|duckduckgo|yahoo|ecosia|brave|startpage|ask)\./i.test(h)) {
    return "Search";
  }
  if (
    /(^|\.)(facebook|instagram|twitter|linkedin|reddit|youtube|tiktok|pinterest|whatsapp|telegram|snapchat|discord)\./i.test(h) ||
    /t\.co$/.test(h)
  ) {
    return "Social";
  }
  return "Referral";
}
