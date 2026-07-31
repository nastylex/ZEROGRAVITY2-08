/**
 * In-memory analytics store.
 *
 * Data lives on `globalThis` so it survives Next.js HMR during development.
 * It is intentionally ephemeral — it resets whenever the server (re)starts or
 * redeploys, and does not sync across serverless instances. Swap this module
 * for a database-backed store if you need persistent analytics.
 *
 * A deterministic seed run populates ~30 days of clearly-labelled sample
 * history so the dashboard renders meaningful charts immediately; real
 * pageviews are appended on top of it as they arrive.
 */

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

export interface AnalyticsSnapshot {
  generatedAt: string;
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
const MAX_EVENTS = 20_000;
const LIVE_WINDOW = 5 * 60_000;

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

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedIndex(rng: () => number, weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

function uniqueCount(list: PageViewRecord[]): number {
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

class AnalyticsStore {
  private events: PageViewRecord[] = [];

  /** Deterministic sample history so charts are meaningful from the first load. */
  seed(): void {
    if (this.events.length > 0) return;
    const rng = mulberry32(0x5eed);
    const now = Date.now();

    const pages = [
      { path: "/", title: "Home — AirSPACEx", weight: 52 },
      { path: "/filters", title: "Filtering System", weight: 30 },
      { path: "/admin/login", title: "Admin sign in", weight: 12 },
      { path: "/admin", title: "Admin dashboard", weight: 6 },
    ];
    const pageWeights = pages.map((p) => p.weight);

    const sources = [
      { label: "Direct", weight: 30 },
      { label: "Search", weight: 32 },
      { label: "Social", weight: 18 },
      { label: "Referral", weight: 14 },
      { label: "Email", weight: 6 },
    ];
    const sourceWeights = sources.map((s) => s.weight);

    const devices = [
      { label: "desktop", weight: 62 },
      { label: "mobile", weight: 33 },
      { label: "tablet", weight: 5 },
    ];
    const deviceWeights = devices.map((d) => d.weight);

    const browsers = [
      { label: "Chrome", weight: 58 },
      { label: "Safari", weight: 20 },
      { label: "Firefox", weight: 11 },
      { label: "Edge", weight: 8 },
      { label: "Opera", weight: 3 },
    ];
    const browserWeights = browsers.map((b) => b.weight);

    const oss = [
      { label: "Windows", weight: 42 },
      { label: "macOS", weight: 30 },
      { label: "Android", weight: 14 },
      { label: "iOS", weight: 10 },
      { label: "Linux", weight: 4 },
    ];
    const osWeights = oss.map((o) => o.weight);

    const referrersBySource: Record<string, string[]> = {
      Search: ["google.com", "bing.com", "duckduckgo.com", "search.brave.com"],
      Social: ["facebook.com", "twitter.com", "linkedin.com", "reddit.com"],
      Referral: ["github.com", "news.ycombinator.com", "medium.com"],
      Email: ["outlook.com", "gmail.com"],
    };

    // Bounded pool of fake client IPs so "unique visitors" < pageviews.
    const ips = Array.from(
      { length: 120 },
      () =>
        `${40 + Math.floor(rng() * 60)}.${Math.floor(rng() * 256)}.${Math.floor(rng() * 256)}.${Math.floor(
          rng() * 256,
        )}`,
    );

    for (let day = 29; day >= 0; day--) {
      const dayStart = startOfDay(now) - day * DAY;
      const weekend = [0, 6].includes(new Date(dayStart).getDay());
      const isToday = day === 0;
      const base = isToday ? 5 : weekend ? 22 : 42;
      const dayViews = Math.round(base * (0.6 + rng() * 0.8));

      for (let i = 0; i < dayViews; i++) {
        let ts: number;
        if (isToday) {
          // A few visits spread over the last 1–4 hours, never "live now".
          ts = now - Math.floor((1 + rng() * 3) * HOUR) - Math.floor(rng() * 1_200_000);
        } else {
          const hour = 8 + Math.floor(Math.pow(rng(), 1.6) * 15); // skewed 8–22h
          ts = dayStart + hour * HOUR + Math.floor(rng() * HOUR);
        }
        if (ts >= now) continue;

        const page = pages[weightedIndex(rng, pageWeights)];
        const sourceLabel = sources[weightedIndex(rng, sourceWeights)].label;
        const device = devices[weightedIndex(rng, deviceWeights)].label;
        const browser = browsers[weightedIndex(rng, browserWeights)].label;
        const os = oss[weightedIndex(rng, osWeights)].label;

        const referrerOptions = referrersBySource[sourceLabel];
        const referrer =
          sourceLabel === "Direct" || !referrerOptions
            ? undefined
            : `https://${referrerOptions[Math.floor(rng() * referrerOptions.length)]}/`;

        const ip = ips[Math.floor(rng() * ips.length)];
        const visitorKey = `${ip}|${device}|${browser}`;

        this.events.push({
          id: uid(),
          path: page.path,
          title: page.title,
          referrer,
          referrerDomain: referrer ? hostnameOf(referrer) : undefined,
          source: sourceLabel,
          ip,
          deviceType: device,
          browser,
          os,
          visitorKey,
          sample: true,
          timestamp: ts,
        });
      }
    }
  }

  record(input: {
    path: string;
    title?: string;
    referrer?: string;
    ua?: string;
    ip?: string;
    language?: string;
    ownHost?: string;
  }): PageViewRecord {
    const parsed = parseUa(input.ua);
    const visitorKey =
      input.ip && input.ip !== "unknown"
        ? `${input.ip}|${parsed.deviceType}|${parsed.browser}`
        : input.ua
          ? `ua|${input.ua.slice(0, 128)}`
          : uid();

    const record: PageViewRecord = {
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
      timestamp: Date.now(),
    };

    this.events.push(record);
    if (this.events.length > MAX_EVENTS) {
      this.events.splice(0, this.events.length - MAX_EVENTS);
    }
    return record;
  }

  snapshot(): AnalyticsSnapshot {
    const now = Date.now();
    const events = this.events;

    const last30d = now - 30 * DAY;
    const e30 = events.filter((e) => e.timestamp >= last30d);

    const last7d = now - 7 * DAY;
    const prev7dStart = now - 14 * DAY;
    const e7 = e30.filter((e) => e.timestamp >= last7d);
    const p7 = e30.filter((e) => e.timestamp >= prev7dStart && e.timestamp < last7d);

    const unique7 = uniqueCount(e7);
    const uniqueP7 = uniqueCount(p7);

    const live = events.filter((e) => e.timestamp >= now - LIVE_WINDOW);
    const todayStart = startOfDay(now);

    const summary: Summary = {
      pageviews: events.length,
      pageviews30d: e30.length,
      uniqueVisitors: uniqueCount(events),
      unique30d: uniqueCount(e30),
      liveNow: uniqueCount(live),
      today: events.filter((e) => e.timestamp >= todayStart).length,
      avgDaily: Math.round(e30.length / 30),
      viewsDelta7d: pct(p7.length, e7.length),
      visitorsDelta7d: pct(uniqueP7, unique7),
    };

    const hourly: SeriesPoint[] = [];
    for (let i = 23; i >= 0; i--) {
      const start = startOfHour(now) - i * HOUR;
      const end = start + HOUR;
      const bucket = events.filter((e) => e.timestamp >= start && e.timestamp < end);
      hourly.push({ label: formatHourLabel(start), views: bucket.length, visitors: uniqueCount(bucket) });
    }

    const daily: SeriesPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const start = startOfDay(now) - i * DAY;
      const end = start + DAY;
      const bucket = events.filter((e) => e.timestamp >= start && e.timestamp < end);
      daily.push({ label: formatDayLabel(start), views: bucket.length, visitors: uniqueCount(bucket) });
    }

    const titleByPath = new Map<string, string>();
    const byPath = new Map<string, { views: number; visitors: Set<string> }>();
    for (const e of events) {
      if (e.title && !titleByPath.has(e.path)) titleByPath.set(e.path, e.title);
      let agg = byPath.get(e.path);
      if (!agg) {
        agg = { views: 0, visitors: new Set<string>() };
        byPath.set(e.path, agg);
      }
      agg.views++;
      agg.visitors.add(e.visitorKey);
    }

    const topPages: TopPage[] = Array.from(byPath.entries())
      .map(([path, agg]) => ({
        path,
        title: titleByPath.get(path),
        views: agg.views,
        visitors: agg.visitors.size,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);

    const structureViews: Record<string, { views: number; visitors: number }> = {};
    for (const [path, agg] of byPath) {
      structureViews[path] = { views: agg.views, visitors: agg.visitors.size };
    }

    const recent: RecentEvent[] = [...events]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 14)
      .map((e) => ({
        id: e.id,
        time: new Date(e.timestamp).toISOString(),
        path: e.path,
        title: e.title,
        source: e.source,
        referrerDomain: e.referrerDomain,
        deviceType: e.deviceType,
        browser: e.browser,
        os: e.os,
        sample: e.sample,
      }));

    return {
      generatedAt: new Date(now).toISOString(),
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
}

declare global {
  // eslint-disable-next-line no-var
  var __analyticsStore: AnalyticsStore | undefined;
}

export function getStore(): AnalyticsStore {
  if (!globalThis.__analyticsStore) {
    globalThis.__analyticsStore = new AnalyticsStore();
    globalThis.__analyticsStore.seed();
  }
  return globalThis.__analyticsStore;
}
