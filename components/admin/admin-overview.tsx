"use client";

import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Folder, HardDrive, Share2, UserPlus, Users } from "lucide-react";
import type { AdminMetrics } from "@/lib/analytics/store";

const tooltipStyle = { backgroundColor: "rgba(0,0,0,.94)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, color: "#fff", fontSize: 12 };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

export function AdminOverview({ metrics }: { metrics: AdminMetrics }) {
  const cards = useMemo(() => [
    { label: "Registered users", value: formatNumber(metrics.users), detail: `${formatNumber(metrics.newUsers30d)} new in 30d`, icon: Users, color: "text-cyan-300" },
    { label: "Storage used", value: formatBytes(metrics.bytes), detail: `${formatNumber(metrics.files)} stored files`, icon: HardDrive, color: "text-violet-300" },
    { label: "Active users", value: formatNumber(metrics.activeUsers30d), detail: "uploaded in 30d", icon: UserPlus, color: "text-emerald-300" },
    { label: "Shared files", value: formatNumber(metrics.sharedFiles), detail: `${formatNumber(metrics.folders)} folders`, icon: Share2, color: "text-amber-300" },
  ], [metrics]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300/70">Product telemetry</p>
          <h2 className="mt-1 font-display text-2xl text-white">Users &amp; storage</h2>
          <p className="mt-1 text-xs text-white/45">Live account and file-system health across the last 30 days.</p>
        </div>
        <Badge variant="outline" className="border-emerald-400/20 bg-emerald-400/5 text-emerald-300">Operational</Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return <Card key={card.label} className="border-white/10 bg-white/[0.035]">
            <CardHeader className="pb-2"><CardDescription className="flex items-center gap-2 text-white/45"><Icon className={`size-4 ${card.color}`} />{card.label}</CardDescription></CardHeader>
            <CardContent><p className="font-mono text-2xl text-white">{card.value}</p><p className="mt-1 text-[11px] text-white/35">{card.detail}</p></CardContent>
          </Card>;
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border-white/10 bg-white/[0.035] xl:col-span-2">
          <CardHeader><CardTitle className="text-sm text-white">Signup velocity</CardTitle><CardDescription className="text-white/40">New accounts per day, trailing 30 days</CardDescription></CardHeader>
          <CardContent><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={metrics.signups} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.07)" strokeDasharray="3 3" /><XAxis dataKey="label" stroke="rgba(255,255,255,.35)" fontSize={10} minTickGap={22} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} stroke="rgba(255,255,255,.35)" fontSize={10} tickLine={false} axisLine={false} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="value" name="Signups" fill="#67e8f9" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent>
        </Card>
        <Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle className="text-sm text-white">File mix</CardTitle><CardDescription className="text-white/40">Uploads by content type, last 30 days</CardDescription></CardHeader><CardContent><div className="flex flex-col gap-3">{metrics.fileTypes.length ? metrics.fileTypes.slice(0, 7).map((item, index) => <div key={item.label}><div className="flex justify-between gap-2 text-xs"><span className="truncate text-white/70">{item.label}</span><span className="font-mono text-white/40">{formatNumber(item.value)}</span></div><div className="mt-1 h-1.5 rounded-full bg-white/5"><div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.max(5, (item.value / metrics.fileTypes[0].value) * 100)}%`, opacity: 1 - index * 0.08 }} /></div></div>) : <p className="py-8 text-center text-sm text-white/35">No uploads yet.</p>}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle className="text-sm text-white">Storage growth</CardTitle><CardDescription className="text-white/40">Bytes uploaded per day, trailing 30 days</CardDescription></CardHeader><CardContent><div className="h-52"><ResponsiveContainer width="100%" height="100%"><AreaChart data={metrics.storage} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}><defs><linearGradient id="storageFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.4} /><stop offset="100%" stopColor="#a78bfa" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.07)" strokeDasharray="3 3" /><XAxis dataKey="label" stroke="rgba(255,255,255,.35)" fontSize={10} minTickGap={22} tickLine={false} axisLine={false} /><YAxis tickFormatter={formatBytes} stroke="rgba(255,255,255,.35)" fontSize={10} tickLine={false} axisLine={false} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => formatBytes(Number(value))} /><Area type="monotone" dataKey="value" name="Uploaded" stroke="#a78bfa" fill="url(#storageFill)" /></AreaChart></ResponsiveContainer></div></CardContent></Card>
        <Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle className="text-sm text-white">Largest accounts</CardTitle><CardDescription className="text-white/40">Users ranked by storage consumption</CardDescription></CardHeader><CardContent><UserTable users={metrics.topUsers} /></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle className="text-sm text-white">Recent signups</CardTitle><CardDescription className="text-white/40">Newest registered accounts</CardDescription></CardHeader><CardContent><ul className="flex flex-col gap-3">{metrics.recentSignups.map((user) => <li key={user.email} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm text-white/80">{user.name}</p><p className="truncate font-mono text-[11px] text-white/35">{user.email}</p></div><time className="shrink-0 font-mono text-[10px] text-white/35">{new Date(user.createdAt).toLocaleDateString()}</time></li>)}</ul></CardContent></Card>
        <Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle className="text-sm text-white">System inventory</CardTitle><CardDescription className="text-white/40">Current application footprint</CardDescription></CardHeader><CardContent><div className="grid grid-cols-2 gap-3"><Inventory icon={FileText} label="Files" value={formatNumber(metrics.files)} /><Inventory icon={Folder} label="Folders" value={formatNumber(metrics.folders)} /><Inventory icon={Share2} label="Shared" value={formatNumber(metrics.sharedFiles)} /><Inventory icon={HardDrive} label="Uploads (30d)" value={formatNumber(metrics.uploads30d)} /></div></CardContent></Card>
      </div>
    </section>
  );
}

function UserTable({ users }: { users: AdminMetrics["topUsers"] }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-white/35"><th className="pb-2 pr-3 font-medium">User</th><th className="pb-2 pr-3 font-medium">Files</th><th className="pb-2 font-medium">Storage</th></tr></thead><tbody className="divide-y divide-white/5">{users.map((user) => <tr key={user.id}><td className="max-w-[190px] truncate py-2.5 pr-3"><p className="truncate text-white/75">{user.name}</p><p className="truncate font-mono text-[10px] text-white/30">{user.email}</p></td><td className="py-2.5 pr-3 font-mono text-white/50">{formatNumber(user.files)}</td><td className="py-2.5 font-mono text-white/65">{formatBytes(user.bytes)}</td></tr>)}</tbody></table></div>;
}

function Inventory({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return <div className="rounded-lg border border-white/8 bg-black/20 p-3"><Icon className="size-4 text-cyan-300/80" /><p className="mt-3 font-mono text-lg text-white">{value}</p><p className="text-[11px] text-white/35">{label}</p></div>;
}
