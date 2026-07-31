# Analytics setup

The site now has **two** analytics layers:

1. **Vercel Analytics** (`@vercel/analytics`) — privacy-first pageviews that
   report to the Vercel dashboard. Only active on Vercel deployments.
2. **Self-hosted analytics** — a **Postgres-backed** store powering the
   **admin dashboard** at `/admin`. Only real, tracked visits are shown —
   there is no sample/seed data.

## How the self-hosted analytics works

```
Browser pageview ──beacon──▶ POST /api/track ──▶ lib/analytics/store.ts
                                                       │ (Postgres, via lib/db.ts)
Admin dashboard ◀──SSE──────── /api/admin/stream ───────┘
                ◀──JSON─────── /api/admin/analytics
```

### Pieces

- `components/analytics/pageview-tracker.tsx` — client component in the root
  layout. Sends one beacon per route change via `navigator.sendBeacon`.
  Admin & API routes are excluded (both client- and server-side).
- `app/api/track/route.ts` — records pageviews with server-derived context:
  user agent (parsed into device / browser / OS), client IP, language, and
  the referrer (bucketed into Direct / Search / Social / Referral / Email).
- `lib/analytics/store.ts` — the database-backed store + aggregation. It
  writes each pageview to the `pageviews` table and computes the dashboard
  snapshot from Postgres on demand.
- `app/api/admin/analytics/route.ts` — authenticated JSON snapshot endpoint.
- `app/api/admin/stream/route.ts` — authenticated SSE stream pushing a fresh
  snapshot every 2 seconds (the dashboard merges these live).
- `components/admin/site-structure.tsx` + `lib/analytics/site-map.ts` — the
  "Web structure" panel: a tree of all site routes with each page's section
  breakdown and live visit counts.

### Storage (database)

Set `DATABASE_URL` in `.env.local` (see `.env.local.example`) to any Postgres
connection string. A `pageviews` table is created automatically on first use,
with indexes on `timestamp`, `visitor_key`, and `path`.

- **Real data only** — no sample history is seeded. The dashboard starts empty
  and fills up with real visits as they arrive.
- **Retention:** rows older than **1230 days** are automatically deleted
  (a purge runs on each recorded pageview, throttled to once per hour).

### Before you start

`DATABASE_URL` is required — the analytics store is database-backed by
design (real data only). Without it, tracking requests and dashboard
queries will error out (the tracker will log a 500 on the server), so set
it up first.

## How to verify locally

1. Configure admin auth and the database (see `.env.local.example`):
   - `AUTH_SECRET`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD_HASH` (bcrypt; escape `$` as `\$`)
   - `DATABASE_URL` (any Postgres provider — Neon, Supabase, Railway, Render)
2. `npm run dev` and open `http://localhost:3000`.
3. Browse the landing page or `/filters` — each page load fires a beacon.
4. Sign in to `/admin`. The dashboard shows your real visits: summary cards,
   live counters, charts, and the Web structure panel.
5. Open the dashboard in a second browser tab while browsing the public site
   in the first — the "Live right now" counter and Recent activity update in
   real time via SSE.

## Notes

- The tracker respects the same admin exclusion: `/admin*` requests are never
  recorded.
- Static assets and `/api/*` are filtered out server-side.
- To wipe all analytics, run `DELETE FROM pageviews;` against the database
  (or create a fresh database).
