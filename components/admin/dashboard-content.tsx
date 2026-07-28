"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
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

/**
 * SAMPLE DATA — preserved as initial values so the dashboard still shows
 * the static example data until live events arrive. Incoming SSE payloads
 * are merged with these arrays instead of replacing them.
 */
const initialVisitorsData = [
  { date: "Jul 1", visitors: 1180, signups: 42 },
  { date: "Jul 5", visitors: 1340, signups: 51 },
  { date: "Jul 9", visitors: 1290, signups: 47 },
  { date: "Jul 13", visitors: 1520, signups: 63 },
  { date: "Jul 17", visitors: 1610, signups: 58 },
  { date: "Jul 21", visitors: 1780, signups: 71 },
  { date: "Jul 25", visitors: 1940, signups: 84 },
];

const initialTrafficSources = [
  { source: "Organic search", value: 4200 },
  { source: "Direct", value: 2600 },
  { source: "Social", value: 1450 },
  { source: "Referral", value: 980 },
  { source: "Email", value: 520 },
];

const pieColors = ["#67e8f9", "#a78bfa", "#eca8d6", "#fbbf24", "#4ade80"];

const initialSummaryStats = [
  { label: "Visitors (30d)", value: "18.4K", delta: "+12.3%" },
  { label: "Unique visitors", value: "12.1K", delta: "+8.7%" },
  { label: "Signups (30d)", value: "416", delta: "+15.1%" },
  { label: "Avg. bounce rate", value: "38.2%", delta: "-2.4%" },
];

export function DashboardContent() {
  const [visitorsData, setVisitorsData] = useState(() => [...initialVisitorsData]);
  const [trafficSources, setTrafficSources] = useState(() => [...initialTrafficSources]);
  const [summaryStats, setSummaryStats] = useState(() => [...initialSummaryStats]);

  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // connect to SSE endpoint
    const url = "/api/admin/stream";
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        const t = new Date(payload.time);
        const dateLabel = t.toLocaleTimeString();

        // 1) Add visitors point (keep last N) — merge with existing historic sample
        setVisitorsData((prev) => {
          const next = [...prev, { date: dateLabel, visitors: payload.visitors ?? 0, signups: payload.signups ?? 0 }];
          // Keep a reasonable length (combine sample + live): keep last 28 points
          if (next.length > 28) next.shift();
          return next;
        });

        // 2) Merge traffic sources: replace values for known sources, add unknowns
        if (Array.isArray(payload.trafficSources)) {
          setTrafficSources((prev) => {
            const map = new Map(prev.map((s) => [s.source, s.value]));
            for (const s of payload.trafficSources) map.set(s.source, s.value);
            return Array.from(map.entries()).map(([source, value]) => ({ source, value }));
          });
        }

        // 3) Update summary cards conservatively — keep labels, update values if payload provides them
        setSummaryStats((prev) => {
          // Example: use payload.visitors/signups to update two fields; leave others unchanged
          return prev.map((stat) => {
            if (stat.label.includes("Visitors") && payload.visitors != null) {
              return { ...stat, value: (payload.visitors).toLocaleString() };
            }
            if (stat.label.includes("Signups") && payload.signups != null) {
              return { ...stat, value: (payload.signups).toLocaleString() };
            }
            return stat;
          });
        });
      } catch (err) {
        // ignore malformed messages
        console.error("Invalid SSE payload", err);
      }
    };

    es.onerror = (err) => {
      console.error("SSE error", err);
      // EventSource will attempt to reconnect automatically.
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-2 text-xs text-amber-200/80">
        Showing live data from the server — updates appear in real time. Sample data is preserved as historic context.
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryStats.map((stat) => (
          <Card key={stat.label} className="border-white/10 bg-white/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-white/50">{stat.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl text-white">{stat.value}</span>
                <span
                  className={
                    stat.delta.startsWith("-")
                      ? "text-xs text-red-400"
                      : "text-xs text-emerald-400"
                  }
                >
                  {stat.delta}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visitors + signups over time */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-white">Visitors & signups</CardTitle>
          <CardDescription className="text-white/50">Last N updates (real time)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitorsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                />
                <Line type="monotone" dataKey="visitors" stroke="#67e8f9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="signups" stroke="#eca8d6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Traffic sources bar chart */}
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Traffic sources</CardTitle>
            <CardDescription className="text-white/50">Sessions by channel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trafficSources} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                  <YAxis dataKey="source" type="category" stroke="rgba(255,255,255,0.4)" fontSize={12} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="value" fill="#a78bfa" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Traffic sources pie chart */}
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Share of traffic</CardTitle>
            <CardDescription className="text-white/50">By channel, real time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={trafficSources} dataKey="value" nameKey="source" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {trafficSources.map((entry, index) => (
                      <Cell key={entry.source} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      color: "#fff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
