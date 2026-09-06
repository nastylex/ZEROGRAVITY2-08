/**
 * Postgres-backed analytics store.
 *
 * Pageviews are persisted in the `pageviews` table through the shared pg pool
 * in lib/db.ts (DATABASE_URL). The table is created automatically on first
 * use, and rows older than RETENTION_DAYS (1230) are purged automatically so
 * storage self-expires: data is kept for 1230 days, then deleted.
 *
 * Only real pageviews are stored — no sample/seed data is generated.
 */

import { query } from "@/lib/db";
import { deriveSource, hostnameOf, parseUa } from "./parse";

export interface PageViewRecord {
  id: string;
  path: string;
  title?: string;
  referrer?: string;
  referrerDomain?: string;
  source: string;
  ua?: string;
  ip?: string;
  deviceType: string;
  browser: string;
  os: string;
  language?: string;
  visitorKey: string;
  sample?: boolean;
  timestamp: number;
}

export interface Slice {
  label: string;
  value: number;
}

export interface SeriesPoint {
  label: string;
  views: number;
  visitors: number;
}

export interface TopPage {
  path: string;
  title?: string;
  views: number;
  visitors: number;
}

export interface RecentEvent {
  id: string;
  time: string;
  path: string;
  title?: string;
  source: string;
  referrerDomain?: string;
  deviceType: string;
  browser: string;
  os: string;
  sample?: boolean;
}

export interface Summary {
  pageviews: number;
  pageviews30d: number;
  uniqueVisitors: number;
  unique30d: number;
  liveNow: number;
  today: number;
  avgDaily: number;
  viewsDelta7d: number;
  visitorsDelta7d: number;
}

export interface UserMetric {
  id: string;
  name: string;
  email: string;
  files: number;
  bytes: number;
  shared: number;
  lastSignup: string;
}

export interface AdminMetrics {
  users: number;
  newUsers30d: number;
  activeUsers30d: number;
  files: number;
  bytes: number;
  sharedFiles: number;
  folders: number;
  uploads30d: number;
  signups: Array<{ label: string; value: number }>;
  storage: Array<{ label: string; value: number }>;
  fileTypes: Slice[];
  topUsers: UserMetric[];
  recentSignups: Array<{ name: string; email: string; createdAt: string }>;
}

export interface AnalyticsSnapshot {
  generatedAt: string;
  admin: AdminMetrics;
  summary: Summary;
  hourly: SeriesPoint[];
  daily: SeriesPoint[];
  topPages: TopPage[];
  trafficSources: Slice[];
  referrers: Slice[];
  devices: Slice[];
  browsers: Slice[];
  os: Slice[];
  recent: RecentEvent[];
  structureViews: Record<string, { views: number; visitors: number }>;
}

const DAY = 86_400_000;
const HOUR = 3_600_000;
const LIVE_WINDOW = 5 * 60_000;

/** Analytics rows are retained for 1230 days, then automatically deleted. */
export const RETENTION_DAYS = 1230;
const RETENTION_MS = RETENTION_DAYS * DAY;

// Auto-purge runs at most once per hour per process.
declare global {
  // eslint-disable-next-line no-var
  var __analyticsPurgedAt: number | undefined;
}

let tableReady: Promise<void> | null = null;

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfHour(ts: number): number {
  const d = new Date(ts);
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

function formatHourLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDayLabel(ts: number): string {
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

function uniqueCount(list: Array<{ visitorKey: string }>): number {
  const s = new Set<string>();
  for (const e of list) s.add(e.visitorKey);
  return s.size;
}

function pct(prev: number, cur: number): number {
  if (prev <= 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

function slices(list: PageViewRecord[], key: (e: PageViewRecord) => string | undefined): Slice[] {
  const m = new Map<string, number>();
  for (const e of list) {
    const k = key(e);
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return Array.from(m.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

async function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS pageviews (
          id TEXT PRIMARY KEY,
          path TEXT NOT NULL,
          title TEXT,
          referrer TEXT,
          referrer_domain TEXT,
          source TEXT NOT NULL,
          ua TEXT,
          ip TEXT,
          device_type TEXT NOT NULL,
          browser TEXT NOT NULL,
          os TEXT NOT NULL,
          language TEXT,
          visitor_key TEXT NOT NULL,
          sample BOOLEAN NOT NULL DEFAULT FALSE,
          timestamp BIGINT NOT NULL
        )
      `);
      await query(
        `CREATE INDEX IF NOT EXISTS idx_pageviews_timestamp ON pageviews (timestamp)`,
      );
      await query(
        `CREATE INDEX IF NOT EXISTS idx_pageviews_visitor_key ON pageviews (visitor_key)`,
      );
      await query(`CREATE INDEX IF NOT EXISTS idx_pageviews_path ON pageviews (path)`);
    })().catch((err) => {
      tableReady = null;
      throw err;
    });
  }
  return tableReady;
}

/** Deletes rows older than the 1230-day retention window (at most once/hour). */
async function purgeExpired(): Promise<void> {
  const now = Date.now();
  if (globalThis.__analyticsPurgedAt && now - globalThis.__analyticsPurgedAt < HOUR) return;
  globalThis.__analyticsPurgedAt = now;
  await query(`DELETE FROM pageviews WHERE timestamp < $1`, [now - RETENTION_MS]);
}

interface Row {
  id: string;
  path: string;
  title: string | null;
  referrer_domain: string | null;
  source: string;
  device_type: string;
  browser: string;
  os: string;
  visitor_key: string;
  sample: boolean;
  timestamp: string;
}

function toRecord(r: Row): PageViewRecord {
  return {
    id: uid(),
    path: r.path,
    title: r.title ?? undefined,
    referrerDomain: r.referrer_domain ?? undefined,
    source: r.source,
    deviceType: r.device_type,
    browser: r.browser,
    os: r.os,
    visitorKey: r.visitor_key,
    sample: r.sample,
    timestamp: Number(r.timestamp),
  };
}

export async function record(input: {
  path: string;
  title?: string;
  referrer?: string;
  ua?: string;
  ip?: string;
  language?: string;
  ownHost?: string;
}): Promise<PageViewRecord> {
  await ensureTable();

  const parsed = parseUa(input.ua);
  const visitorKey =
    input.ip && input.ip !== "unknown"
      ? `${input.ip}|${parsed.deviceType}|${parsed.browser}`
      : input.ua
        ? `ua|${input.ua.slice(0, 128)}`
        : uid();

  const rec: PageViewRecord = {
    id: uid(),
    path: input.path,
    title: input.title || undefined,
    referrer: input.referrer || undefined,
    referrerDomain: hostnameOf(input.referrer),
    source: deriveSource(input.referrer, input.ownHost),
    ua: input.ua,
    ip: input.ip,
    deviceType: parsed.deviceType,
    browser: parsed.browser,
    os: parsed.os,
    language: input.language,
    visitorKey,
    sample: false,
    timestamp: Date.now(),
  };

  await query(
    `INSERT INTO pageviews
      (id, path, title, referrer, referrer_domain, source, ua, ip, device_type, browser, os, language, visitor_key, sample, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      rec.id,
      rec.path,
      rec.title ?? null,
      rec.referrer ?? null,
      rec.referrerDomain ?? null,
      rec.source,
      rec.ua ?? null,
      rec.ip ?? null,
      rec.deviceType,
      rec.browser,
      rec.os,
      rec.language ?? null,
      rec.visitorKey,
      rec.sample ?? false,
      rec.timestamp,
    ],
  );

  await purgeExpired().catch(() => {});
  return rec;
}

export async function snapshot(): Promise<AnalyticsSnapshot> {
  await ensureTable();

  const now = Date.now();
  const last30d = now - 30 * DAY;

  const totals = await query(
    `SELECT COUNT(*)::int AS total, COUNT(DISTINCT visitor_key)::int AS uniq FROM pageviews`,
  );
  const totalAll = Number(totals.rows[0]?.total ?? 0);
  const uniqAll = Number(totals.rows[0]?.uniq ?? 0);

  const e30Res = await query(
    `SELECT path, title, referrer_domain, source, device_type, browser, os, visitor_key, sample, timestamp
     FROM pageviews WHERE timestamp >= $1`,
    [last30d],
  );
  const e30 = (e30Res.rows as unknown as Row[]).map(toRecord);

  const last7d = now - 7 * DAY;
  const prev7dStart = now - 14 * DAY;
  const e7 = e30.filter((e) => e.timestamp >= last7d);
  const p7 = e30.filter((e) => e.timestamp >= prev7dStart && e.timestamp < last7d);

  const unique7 = uniqueCount(e7);
  const uniqueP7 = uniqueCount(p7);

  const live = e30.filter((e) => e.timestamp >= now - LIVE_WINDOW);
  const todayStart = startOfDay(now);

  const summary: Summary = {
    pageviews: totalAll,
    pageviews30d: e30.length,
    uniqueVisitors: uniqAll,
    unique30d: uniqueCount(e30),
    liveNow: uniqueCount(live),
    today: e30.filter((e) => e.timestamp >= todayStart).length,
    avgDaily: Math.round(e30.length / 30),
    viewsDelta7d: pct(p7.length, e7.length),
    visitorsDelta7d: pct(uniqueP7, unique7),
  };

  const hourly: SeriesPoint[] = [];
  for (let i = 23; i >= 0; i--) {
    const start = startOfHour(now) - i * HOUR;
    const end = start + HOUR;
    const bucket = e30.filter((e) => e.timestamp >= start && e.timestamp < end);
    hourly.push({ label: formatHourLabel(start), views: bucket.length, visitors: uniqueCount(bucket) });
  }

  const daily: SeriesPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const start = startOfDay(now) - i * DAY;
    const end = start + DAY;
    const bucket = e30.filter((e) => e.timestamp >= start && e.timestamp < end);
    daily.push({ label: formatDayLabel(start), views: bucket.length, visitors: uniqueCount(bucket) });
  }

  // All-time per-page aggregation for top pages + structure view.
  const pagesRes = await query(
    `SELECT path, MAX(title) AS title, COUNT(*)::int AS views, COUNT(DISTINCT visitor_key)::int AS visitors
     FROM pageviews GROUP BY path`,
  );
  const pages = pagesRes.rows as unknown as Array<{
    path: string;
    title: string | null;
    views: number;
    visitors: number;
  }>;
  const pagesByViews = [...pages].sort((a, b) => b.views - a.views);

  const topPages: TopPage[] = pagesByViews.slice(0, 8).map((p) => ({
    path: p.path,
    title: p.title ?? undefined,
    views: p.views,
    visitors: p.visitors,
  }));

  const structureViews: Record<string, { views: number; visitors: number }> = {};
  for (const p of pages) {
    structureViews[p.path] = { views: p.views, visitors: p.visitors };
  }

  const recentRes = await query(
    `SELECT id, timestamp, path, title, referrer_domain, source, device_type, browser, os, sample
     FROM pageviews ORDER BY timestamp DESC LIMIT 14`,
  );
  const recent: RecentEvent[] = (recentRes.rows as unknown as Row[]).map((r) => ({
    id: r.id,
    time: new Date(Number(r.timestamp)).toISOString(),
    path: r.path,
    title: r.title ?? undefined,
    source: r.source,
    referrerDomain: r.referrer_domain ?? undefined,
    deviceType: r.device_type,
    browser: r.browser,
    os: r.os,
    sample: r.sample,
  }));

  const appUserRows = await query(`
    SELECT u.id, u.name, u.email, u.created_at,
      COUNT(f.id)::int AS files,
      COALESCE(SUM(f.size), 0)::bigint AS bytes,
      COUNT(f.id) FILTER (WHERE f.is_shared = TRUE)::int AS shared
    FROM app_users u
    LEFT JOIN stored_files f ON f.user_id = u.id
    GROUP BY u.id, u.name, u.email, u.created_at
    ORDER BY bytes DESC, u.created_at DESC
  `);
  const userRows = appUserRows.rows as Array<{ id: string; name: string; email: string; created_at: Date; files: number; bytes: string; shared: number }>;
  const recentUserRows = [...userRows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const fileTotals = await query(`SELECT COUNT(*)::int AS files, COALESCE(SUM(size), 0)::bigint AS bytes, COUNT(*) FILTER (WHERE is_shared = TRUE)::int AS shared FROM stored_files`);
  const folderTotals = await query(`SELECT COUNT(*)::int AS folders FROM file_folders`);
  const uploadRows = await query(`SELECT created_at, size, content_type FROM stored_files WHERE created_at >= NOW() - INTERVAL '30 days' ORDER BY created_at ASC`);
  const signupRows = await query(`SELECT created_at FROM app_users WHERE created_at >= NOW() - INTERVAL '30 days' ORDER BY created_at ASC`);
  const activeRows = await query(`SELECT COUNT(DISTINCT user_id)::int AS count FROM stored_files WHERE created_at >= NOW() - INTERVAL '30 days'`);
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(now - (29 - index) * DAY);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const labelFor = (date: Date) => date.toLocaleDateString([], { month: "short", day: "numeric" });
  const signups = days.map((date) => ({ label: labelFor(date), value: signupRows.rows.filter((row) => new Date(row.created_at).toDateString() === date.toDateString()).length }));
  const storage = days.map((date) => ({ label: labelFor(date), value: uploadRows.rows.filter((row) => new Date(row.created_at).toDateString() === date.toDateString()).reduce((total, row) => total + Number(row.size), 0) }));
  const typeCounts = new Map<string, number>();
  for (const row of uploadRows.rows) typeCounts.set(row.content_type || "unknown", (typeCounts.get(row.content_type || "unknown") ?? 0) + 1);
  const fileCount = Number(fileTotals.rows[0]?.files ?? 0);
  const admin: AdminMetrics = {
    users: userRows.length,
    newUsers30d: signupRows.rowCount ?? 0,
    activeUsers30d: Number(activeRows.rows[0]?.count ?? 0),
    files: fileCount,
    bytes: Number(fileTotals.rows[0]?.bytes ?? 0),
    sharedFiles: Number(fileTotals.rows[0]?.shared ?? 0),
    folders: Number(folderTotals.rows[0]?.folders ?? 0),
    uploads30d: uploadRows.rowCount ?? 0,
    signups,
    storage,
    fileTypes: Array.from(typeCounts.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    topUsers: userRows.slice(0, 8).map((row) => ({ id: row.id, name: row.name, email: row.email, files: Number(row.files), bytes: Number(row.bytes), shared: Number(row.shared), lastSignup: new Date(row.created_at).toISOString() })),
    recentSignups: recentUserRows.slice(0, 8).map((row) => ({ name: row.name, email: row.email, createdAt: new Date(row.created_at).toISOString() })),
  };

  return {
    generatedAt: new Date(now).toISOString(),
    admin,
    summary,
    hourly,
    daily,
    topPages,
    trafficSources: slices(e30, (e) => e.source),
    referrers: slices(e30, (e) => (e.source === "Direct" ? undefined : e.referrerDomain)).slice(0, 6),
    devices: slices(e30, (e) => e.deviceType),
    browsers: slices(e30, (e) => e.browser),
    os: slices(e30, (e) => e.os),
    recent,
    structureViews,
  };
}
