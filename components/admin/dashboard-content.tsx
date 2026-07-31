"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ExternalLink,
  Globe,
  MapIcon,
  MousePointerClick,
  Radio,
  Users,
  Zap,
} from "lucide-react";
import type { AnalyticsSnapshot } from "@/lib/analytics/store";
import { SiteStructure } from "./site-structure";

const PIE_COLORS = ["#67e8f9", "#a78bfa", "#eca8d6", "#fbbf24", "#4ade80", "#60a5fa"];

const tooltipStyle = {
  backgroundColor: "rgba(0,0,0,0.92)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  color: "#fff",
  fontSize: 12,
};

function fmt(n: number): string {
  return n.toLocaleString();
}

function fmtDelta(d: number): string {
  const sign = d > 0 ? "+" : d < 0 ? "-" : "";
  return `${sign}${Math.abs(d)}%`;
}

function deltaClass(d: number): string {
  return d >= 0 ? "text-emerald-400" : "text-rose-400";
}

type ConnState = "connecting" | "live" | "offline";

const SOURCE_STYLES: Record<string, string> = {
  Direct: "bg-white/5 text-white/60 border-white/10",
  Search: "bg-cyan-400/10 text-cyan-300 border-cyan-400/20",
  Social: "bg-pink-400/10 text-pink-300 border-pink-400/20",
  Referral: "bg-violet-400/10 text-violet-300 border-violet-400/20",
  Email: "bg-amber-400/10 text-amber-300 border-amber-400/20",
};

export function DashboardContent() {
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [conn, setConn] = useState<ConnState>("connecting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;
    let loaded = false;

    const fail = (message: string) => {
      if (cancelled) return;
      clearTimeout(timeout);
      setError(message);
      setConn("offline");
    };

    // Safety net: never leave the skeleton spinning forever.
    // Declared here so `fail` can clear it (all call sites run async,
    // after this line assigns the timer).
    const timeout = setTimeout(() => {
      fail("Analytics is taking too long to load. Is DATABASE_URL configured?");
    }, 10_000);

    // Initial snapshot via REST, then live updates via SSE.
    fetch("/api/admin/analytics", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          let message = `Analytics API returned ${r.status}`;
          try {
            const body = await r.json();
            if (body?.error) message = body.error;
          } catch {
            // keep fallback message
          }
          fail(message);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data && !cancelled) {
          loaded = true;
          clearTimeout(timeout);
          setSnapshot(data);
          setError(null);
          setConn("live");
        }
      })
      .catch(() => fail("Couldn't reach the analytics API."));

    es = new EventSource("/api/admin/stream");
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.summary) {
          loaded = true;
          clearTimeout(timeout);
          setSnapshot(data);
          setError(null);
          setConn("live");
        }
      } catch {
        // ignore malformed messages
      }
    };
    es.addEventListener("analytics-error", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        fail(data?.error ?? "Analytics stream failed.");
      } catch {
        fail("Analytics stream failed.");
      }
    });
    es.onerror = () => {
      // EventSource auto-reconnects; only flag it if nothing has loaded yet.
      if (!loaded && !cancelled) setConn("offline");
    };

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      es?.close();
    };
  }, []);

  if (error && !snapshot) {
    return <DashboardError message={error} />;
  }

  if (!snapshot) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <ConnectionBanner conn={conn} />

      <SummaryCards summary={snapshot.summary} />

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Activity className="size-4 text-cyan-300" />
            Pageviews &amp; unique visitors — last 24 hours
          </CardTitle>
          <CardDescription className="text-white/50">
            Live via server-sent events, refreshed every 2 seconds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={snapshot.hourly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="label"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="views" name="Pageviews" stroke="#67e8f9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="visitors" name="Unique visitors" stroke="#a78bfa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MapIcon className="size-4 text-violet-300" />
            Traffic volume — last 30 days
          </CardTitle>
          <CardDescription className="text-white/50">
            Daily pageviews — real tracked visits, last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snapshot.daily} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#67e8f9" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#67e8f9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="label"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={36}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="views" name="Pageviews" stroke="#67e8f9" strokeWidth={2} fill="url(#viewsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Globe className="size-4 text-cyan-300" />
              Traffic sources
            </CardTitle>
            <CardDescription className="text-white/50">Sessions by channel, last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snapshot.trafficSources} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    stroke="rgba(255,255,255,0.4)"
                    fontSize={12}
                    width={90}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Sessions" fill="#a78bfa" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Zap className="size-4 text-pink-300" />
              Share of traffic
            </CardTitle>
            <CardDescription className="text-white/50">By channel, last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="h-56 w-56 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={snapshot.trafficSources}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {snapshot.trafficSources.map((entry, index) => (
                        <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full space-y-2">
                {snapshot.trafficSources.map((s, i) => (
                  <li key={s.label} className="flex items-center gap-2 text-sm text-white/70">
                    <span className="size-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="flex-1">{s.label}</span>
                    <span className="font-mono text-white/50">{fmt(s.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <MousePointerClick className="size-4 text-cyan-300" />
              Top pages
            </CardTitle>
            <CardDescription className="text-white/50">Most-viewed routes, all time</CardDescription>
          </CardHeader>
          <CardContent>
            <TopPagesList data={snapshot.topPages} />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <ExternalLink className="size-4 text-violet-300" />
              Top referrers
            </CardTitle>
            <CardDescription className="text-white/50">
              External domains sending visits (direct excluded)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReferrersList data={snapshot.referrers} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ShareBars title="Devices" data={snapshot.devices} color="#67e8f9" />
        <ShareBars title="Browsers" data={snapshot.browsers} color="#a78bfa" />
        <ShareBars title="Operating systems" data={snapshot.os} color="#eca8d6" />
      </div>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Radio className="size-4 text-emerald-300" />
            Recent activity
          </CardTitle>
          <CardDescription className="text-white/50">Latest tracked pageviews, newest first</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentActivity data={snapshot.recent} />
        </CardContent>
      </Card>

      <SiteStructure structureViews={snapshot.structureViews} />
    </div>
  );
}

function ConnectionBanner({ conn }: { conn: ConnState }) {
  const chip =
    conn === "live"
      ? { text: "● Live", cls: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20" }
      : conn === "connecting"
        ? { text: "● Connecting…", cls: "bg-amber-400/10 text-amber-300 border-amber-400/20" }
        : { text: "● Reconnecting…", cls: "bg-rose-400/10 text-rose-300 border-rose-400/20" };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-2.5 text-xs text-amber-200/80">
      <span className="flex items-center gap-1.5">
        <Activity className="size-3.5" />
        Self-hosted analytics — Postgres store: real data only, retained 1230 days, then auto-purged.
      </span>
      <Badge variant="outline" className={`ml-auto border ${chip.cls}`}>
        {chip.text}
      </Badge>
    </div>
  );
}

function SummaryCards({ summary }: { summary: AnalyticsSnapshot["summary"] }) {
  const cards = [
    {
      label: "Pageviews (30d)",
      value: fmt(summary.pageviews30d),
      delta: fmtDelta(summary.viewsDelta7d),
      deltaClass: deltaClass(summary.viewsDelta7d),
      foot: `avg ${fmt(summary.avgDaily)} / day`,
      icon: MousePointerClick,
      accent: "text-cyan-300",
    },
    {
      label: "Unique visitors (30d)",
      value: fmt(summary.unique30d),
      delta: fmtDelta(summary.visitorsDelta7d),
      deltaClass: deltaClass(summary.visitorsDelta7d),
      foot: `${fmt(summary.uniqueVisitors)} all-time`,
      icon: Users,
      accent: "text-violet-300",
    },
    {
      label: "Live right now",
      value: fmt(summary.liveNow),
      delta: null,
      deltaClass: "",
      foot: "in the last 5 minutes",
      icon: Radio,
      accent: "text-emerald-300",
    },
    {
      label: "Visits today",
      value: fmt(summary.today),
      delta: null,
      deltaClass: "",
      foot: `${fmt(summary.pageviews)} total tracked`,
      icon: Zap,
      accent: "text-amber-300",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card
          key={c.label}
          className="border-white/10 bg-white/5 transition-colors hover:border-white/20"
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-white/50">
              <c.icon className={`size-4 ${c.accent}`} />
              {c.label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl text-white">{c.value}</span>
              {c.delta && (
                <span className={`text-xs ${c.deltaClass}`}>
                  {c.delta}
                  <span className="ml-0.5 text-white/30">7d</span>
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-white/40">{c.foot}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TopPagesList({ data }: { data: AnalyticsSnapshot["topPages"] }) {
  const max = data[0]?.views ?? 1;
  if (data.length === 0) {
    return <EmptyNote>No pageviews tracked yet.</EmptyNote>;
  }
  return (
    <ul className="space-y-3">
      {data.map((p) => (
        <li key={p.path}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-mono text-white/85">{p.path}</span>
            <span className="shrink-0 text-xs text-white/40">
              {fmt(p.views)} views · {fmt(p.visitors)} uniq
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-cyan-400/80 transition-all"
              style={{ width: `${Math.max(4, (p.views / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ReferrersList({ data }: { data: AnalyticsSnapshot["referrers"] }) {
  const max = data[0]?.value ?? 1;
  if (data.length === 0) {
    return <EmptyNote>No external referrers yet.</EmptyNote>;
  }
  return (
    <ul className="space-y-3">
      {data.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-white/85">{r.label}</span>
            <span className="shrink-0 font-mono text-xs text-white/40">{fmt(r.value)}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-violet-400/80 transition-all"
              style={{ width: `${Math.max(4, (r.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ShareBars({
  title,
  data,
  color,
}: {
  title: string;
  data: AnalyticsSnapshot["devices"];
  color: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="text-sm text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {data.map((d) => (
            <li key={d.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize text-white/70">{d.label}</span>
                <span className="text-xs text-white/40">
                  {Math.round((d.value / total) * 100)}% · {fmt(d.value)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.max(4, (d.value / total) * 100)}%`, background: color }}
                />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RecentActivity({ data }: { data: AnalyticsSnapshot["recent"] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-white/40">
            <th className="pb-2 pr-3 font-medium">Time</th>
            <th className="pb-2 pr-3 font-medium">Page</th>
            <th className="pb-2 pr-3 font-medium">Source</th>
            <th className="pb-2 pr-3 font-medium">Device</th>
            <th className="pb-2 pr-3 font-medium">Referrer</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.map((e) => (
            <tr key={e.id} className="text-white/70">
              <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs text-white/50">
                {new Date(e.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
              </td>
              <td className="whitespace-nowrap py-2 pr-3">
                <span className="font-mono text-cyan-200/80">{e.path}</span>
                {e.sample && (
                  <Badge variant="outline" className="ml-2 border-white/10 text-white/35">
                    sample
                  </Badge>
                )}
              </td>
              <td className="py-2 pr-3">
                <Badge variant="outline" className={SOURCE_STYLES[e.source] ?? SOURCE_STYLES.Direct}>
                  {e.source}
                </Badge>
              </td>
              <td className="whitespace-nowrap py-2 pr-3 text-xs capitalize text-white/50">
                {e.deviceType} · {e.browser}
              </td>
              <td className="max-w-[160px] truncate py-2 pr-3 text-xs text-white/40">
                {e.referrerDomain ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-white/40">{children}</p>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-full animate-pulse rounded-lg bg-white/5" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="h-72 w-full animate-pulse rounded-xl bg-white/5" />
      <div className="h-56 w-full animate-pulse rounded-xl bg-white/5" />
    </div>
  );
}

function DashboardError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-6 py-10 text-center">
      <AlertTriangle className="mx-auto size-7 text-rose-300" />
      <p className="mt-3 text-sm font-medium text-white">Couldn&apos;t load analytics</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-white/50">{message}</p>
      <p className="mt-2 text-xs text-white/40">
        Make sure DATABASE_URL is set and the server can reach Postgres, then retry.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-5 rounded-md border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/10"
      >
        Retry
      </button>
    </div>
  );
}
