"use client";

import Link from "next/link";
import { useState } from "react";
import NetworkMonitor from "@/components/admin/NetworkMonitor";
import { useSession } from "next-auth/react";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [monitorEnabled, setMonitorEnabled] = useState(false);

  if (status === "loading") return <div className="min-h-screen p-8">Checking session...</div>;

  if (!session) {
    return (
      <div className="min-h-screen p-8 bg-slate-900 text-white">
        <header className="max-w-[1200px] mx-auto mb-8">
          <h1 className="text-3xl font-bold">Admin — Sign in required</h1>
          <p className="text-sm text-slate-400 mt-2">You must sign in to access the admin tools.</p>
        </header>

        <main className="max-w-[1200px] mx-auto">
          <a
            href="/api/auth/signin"
            className="inline-block px-5 py-3 bg-indigo-600 rounded-md text-white"
          >
            Sign in
          </a>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-slate-900 text-white">
      <header className="max-w-[1200px] mx-auto mb-8">
        <h1 className="text-3xl font-bold">Admin — Visitor Metrics & Network Monitor</h1>
        <p className="text-sm text-slate-400 mt-2">
          Quick links and tools for QA: open the live landing page to inspect the How It Works section, and enable the network monitor to watch requests.
        </p>
      </header>

      <main className="max-w-[1200px] mx-auto grid gap-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <a
            href="/#how-it-works"
            target="_blank"
            rel="noreferrer"
            className="inline-block px-5 py-3 bg-indigo-600 rounded-md text-white"
          >
            Open Landing → How It Works
          </a>

          <button
            onClick={() => setMonitorEnabled((s) => !s)}
            className={`px-4 py-3 rounded-md ${monitorEnabled ? "bg-red-600" : "bg-emerald-600"}`}
          >
            {monitorEnabled ? "Disable Network Monitor" : "Enable Network Monitor"}
          </button>

          <a
            href="/api/metrics?exclude_bots=true"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-3 rounded-md bg-gray-700"
          >
            Test metrics API (exclude bots)
          </a>
        </div>

        {monitorEnabled && (
          <section className="bg-slate-800 rounded-md p-4">
            <NetworkMonitor />
          </section>
        )}

        <section className="bg-slate-800 rounded-md p-4">
          <h2 className="text-lg font-semibold mb-2">Notes</h2>
          <ul className="text-sm text-slate-400 list-disc pl-5">
            <li>Monitoring runs only on this page when enabled and does not send captured data to any external service.</li>
            <li>Server-side metrics filtering is supported by /api/metrics?exclude_bots=true — implement DB join to apply detection server-side.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
