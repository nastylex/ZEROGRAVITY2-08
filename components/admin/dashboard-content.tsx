"use client";

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
 * SAMPLE DATA — this dashboard isn't wired to a real analytics source yet.
 * Replace the arrays below with data fetched from your provider, e.g.:
 *   - Vercel Analytics API (https://vercel.com/docs/analytics)
 *   - Google Analytics Data API
 *   - Your own event-logging endpoint
 * Keep the shape the same ({ date, visitors, signups } etc.) and the charts
 * below will keep working without changes.
 */
const visitorsData = [
  { date: "Jul 1", visitors: 1180, signups: 42 },
  { date: "Jul 5", visitors: 1340, signups: 51 },
  { date: "Jul 9", visitors: 1290, signups: 47 },
  { date: "Jul 13", visitors: 1520, signups: 63 },
  { date: "Jul 17", visitors: 1610, signups: 58 },
  { date: "Jul 21", visitors: 1780, signups: 71 },
  { date: "Jul 25", visitors: 1940, signups: 84 },
];

const trafficSources = [
  { source: "Organic search", value: 4200 },
  { source: "Direct", value: 2600 },
  { source: "Social", value: 1450 },
  { source: "Referral", value: 980 },
  { source: "Email", value: 520 },
];

const pieColors = ["#67e8f9", "#a78bfa", "#eca8d6", "#fbbf24", "#4ade80"];

const summaryStats = [
  { label: "Visitors (30d)", value: "18.4K", delta: "+12.3%" },
  { label: "Unique visitors", value: "12.1K", delta: "+8.7%" },
  { label: "Signups (30d)", value: "416", delta: "+15.1%" },
  { label: "Avg. bounce rate", value: "38.2%", delta: "-2.4%" },
];

export function DashboardContent() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-2 text-xs text-amber-200/80">
        Showing sample data — connect a real analytics source to replace
        these numbers (see comment in dashboard-content.tsx).
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryStats.map((stat) => (
          <Card key={stat.label} className="border-white/10 bg-white/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-white/50">
                {stat.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl text-white">
                  {stat.value}
                </span>
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
          <CardDescription className="text-white/50">
            Last 30 days
          </CardDescription>
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
                <Line
                  type="monotone"
                  dataKey="visitors"
                  stroke="#67e8f9"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="signups"
                  stroke="#eca8d6"
                  strokeWidth={2}
                  dot={false}
                />
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
            <CardDescription className="text-white/50">
              Sessions by channel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trafficSources} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                  <YAxis
                    dataKey="source"
                    type="category"
                    stroke="rgba(255,255,255,0.4)"
                    fontSize={12}
                    width={100}
                  />
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
            <CardDescription className="text-white/50">
              By channel, last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={trafficSources}
                    dataKey="value"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {trafficSources.map((entry, index) => (
                      <Cell
                        key={entry.source}
                        fill={pieColors[index % pieColors.length]}
                      />
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
