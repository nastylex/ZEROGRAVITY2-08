# Analytics setup

The site now has **two** analytics layers:

1. **Vercel Analytics** (`@vercel/analytics`) — privacy-first pageviews that
   report to the Vercel dashboard. Only active on Vercel deployments.
2. **Self-hosted analytics** — an in-memory store powering the **admin
   dashboard** at `/admin`. This is what makes the admin panel show real,
   live analytics and a web-structure view.

## How the self-hosted analytics works

```
Browser pageview ──beacon──▶ POST /api/track ──▶ lib/analytics/store.ts
                                                       │ (in-memory, on globalThis)
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
- `lib/analytics/store.ts` — the in-memory store + aggregation. Seeds ~30 days
  of deterministic, clearly-labelled **sample history** so charts render
  immediately; real visits append on top.
- `app/api/admin/analytics/route.ts` — authenticated JSON snapshot endpoint.
- `app/api/admin/stream/route.ts` — authenticated SSE stream pushing a fresh
  snapshot every 2 seconds (the dashboard merges these live).
- `components/admin/site-structure.tsx` + `lib/analytics/site-map.ts` — the
  "Web structure" panel: a tree of all site routes with each page's section
  breakdown and live visit counts.

### Storage caveat (important)

The store is **in-memory by design** (zero setup). It lives on `globalThis`,
so it survives hot reloads during `next dev`, but it **resets when the server
restarts** and does **not** sync across multiple serverless instances on
Vercel. Sample history is re-seeded on every cold start.

If you want persistent analytics, swap the store for a database-backed
implementation (the rest of the pipeline — beacon, endpoints, dashboard —
stays the same). `lib/db.ts` already has a Postgres pool helper wired for
`DATABASE_URL`.

## How to verify locally

1. Configure admin auth (see `.env.local.example`):
   - `AUTH_SECRET`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD_HASH` (bcrypt; escape `$` as `\$`)
2. `npm run dev` and open `http://localhost:3000`.
3. Browse the landing page or `/filters` — each page load fires a beacon.
4. Sign in to `/admin`. The dashboard shows the seeded history plus your real
   visits in "Recent activity" (they are marked as *not* sample), summary
   cards, live counters, charts, and the Web structure panel.
5. Open the dashboard in a second browser tab while browsing the public site
   in the first — the "Live right now" counter and Recent activity update in
   real time via SSE.

## Notes

- The tracker respects the same admin exclusion: `/admin*` requests are never
  recorded.
- Static assets and `/api/*` are filtered out server-side.
- Sample events carry a `sample: true` flag and are shown with a "sample"
  badge in the activity feed.
