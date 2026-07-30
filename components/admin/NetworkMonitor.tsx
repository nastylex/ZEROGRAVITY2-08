"use client";

import { useEffect, useRef, useState } from "react";

type Entry = {
  id: string;
  url: string;
  method: string;
  status?: number;
  duration?: number;
  timestamp: number;
  type: "fetch" | "xhr" | "resource" | "performance";
  isLikelyBot?: boolean;
};

export default function NetworkMonitor() {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    // instrument fetch
    const origFetch = window.fetch;
    (window as any).fetch = async function (input: RequestInfo, init?: RequestInit) {
      const id = (crypto as any).randomUUID?.() ?? String(Math.random());
      const method = (init && (init as any).method) || (typeof input === "string" ? "GET" : (input as Request).method) || "GET";
      const url = typeof input === "string" ? input : (input as Request).url;
      const t0 = performance.now();
      const res = await origFetch.apply(this, arguments as any);
      const t1 = performance.now();

      const status = res.status;
      const entry: Entry = {
        id,
        url,
        method,
        status,
        duration: Math.round(t1 - t0),
        timestamp: Date.now(),
        type: "fetch",
        isLikelyBot: detectBotCandidate(String(url), status, method),
      };
      setEntries((s) => [entry, ...s].slice(0, 200));
      return res;
    };

    // instrument XHR
    const origOpen = (XMLHttpRequest.prototype as any).open;
    const origSend = (XMLHttpRequest.prototype as any).send;
    (XMLHttpRequest.prototype as any).open = function (method: string, url: string) {
      (this as any).__nm = { method, url, start: 0 };
      return origOpen.apply(this, arguments as any);
    };
    (XMLHttpRequest.prototype as any).send = function () {
      (this as any).__nm.start = performance.now();
      const xhr = this;
      const onLoadend = function () {
        try {
          const meta = (xhr as any).__nm;
          const duration = Math.round(performance.now() - meta.start);
          const entry: Entry = {
            id: (crypto as any).randomUUID?.() ?? String(Math.random()),
            url: meta.url,
            method: meta.method,
            status: (xhr as any).status,
            duration,
            timestamp: Date.now(),
            type: "xhr",
            isLikelyBot: detectBotCandidate(meta.url, (xhr as any).status, meta.method),
          };
          setEntries((s) => [entry, ...s].slice(0, 200));
        } catch (e) {
          // ignore
        }
      };
      xhr.addEventListener("loadend", onLoadend);
      return origSend.apply(this, arguments as any);
    };

    // also capture resource timing entries periodically
    const perfInterval = setInterval(() => {
      const perfEntries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const results: Entry[] = perfEntries.slice(-50).map((p) => ({
        id: `${p.name}-${p.startTime}`,
        url: p.name,
        method: "GET",
        status: undefined,
        duration: Math.round(p.duration),
        timestamp: Date.now(),
        type: "resource",
        isLikelyBot: false,
      }));
      if (results.length) setEntries((s) => [...results.reverse(), ...s].slice(0, 200));
    }, 3000);

    return () => {
      (window as any).fetch = origFetch;
      (XMLHttpRequest.prototype as any).open = origOpen;
      (XMLHttpRequest.prototype as any).send = origSend;
      clearInterval(perfInterval);
    };
  }, []);

  function detectBotCandidate(url: string, status?: number, method?: string) {
    try {
      const u = new URL(url, location.href);
      if (u.searchParams.get("bot") === "1") return true;
      if (u.pathname.includes("/bot") || u.pathname.includes("/detect")) return true;
      if (status && status >= 500) return true;
      return false;
    } catch {
      return false;
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm text-slate-300">Live network requests (most recent first)</div>
        <div className="text-xs text-slate-400">max 200 entries</div>
      </div>

      <div className="max-h-[360px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-400 sticky top-0 bg-slate-800">
            <tr>
              <th className="text-left py-2">When</th>
              <th className="text-left py-2">Method</th>
              <th className="text-left py-2">URL</th>
              <th className="text-left py-2">Status</th>
              <th className="text-left py-2">ms</th>
              <th className="text-left py-2">Bot?</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="odd:bg-slate-900/40">
                <td className="py-2">{new Date(e.timestamp).toLocaleTimeString()}</td>
                <td>{e.method}</td>
                <td className="truncate max-w-[480px]">{e.url}</td>
                <td>{e.status ?? "-"}</td>
                <td>{e.duration ?? "-"}</td>
                <td>{e.isLikelyBot ? "⚠️" : "—"}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-slate-400">No requests captured yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
