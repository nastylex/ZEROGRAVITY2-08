# Vercel Analytics setup

This repository already includes @vercel/analytics in package.json and the Analytics component has been added to the root App Router layout.

What I changed

- Created this documentation file explaining the current analytics setup and how to verify it.

What is present in the codebase

- package.json lists "@vercel/analytics": "1.3.1".
- app/layout.tsx imports and includes <Analytics /> from "@vercel/analytics/next" (lines show import and component already present).

How to verify locally

- Running locally (npm run dev) will not report analytics to the Vercel dashboard. Analytics scripts are active only on Vercel deployments.

How to verify after deploy

1. Push to the main branch (or merge this branch via a PR) and deploy to Vercel.
2. Open the Vercel Dashboard for the project (https://vercel.com/dashboard) -> select the project -> Analytics.
3. Visit the deployed site from a browser (or use an incognito window) and you should start to see pageviews and metrics within a few minutes.

Notes about privacy and Do Not Track

- Vercel Analytics respects DNT and has built-in privacy-preserving measures. Review Vercel docs for details and to configure any region-specific compliance settings.

Next steps: transfer analytics data to the Admin Dashboard

You mentioned "transfer data to admin dashbord after" — please confirm the desired approach and destination:

- Where is the admin dashboard located? (I see a branch named `admin-dashboard` in this repo; do you want data pushed to that app?)
- Do you want a UI integration (embed charts in the admin dashboard) or back-end ingestion (send aggregated metrics to a database/dashboard API)?
- If you want server-side forwarding or custom metrics, we can add server endpoints or use Vercel Analytics Export (if available) or integrate with a service like PostHog/Google Analytics.

If you confirm which dashboard and method, I can:
- implement a simple endpoint to forward events/metrics,
- or add a page in the admin dashboard that reads Vercel Analytics via an API or through a configured datastore.

---

Commit: Add docs/analytics.md and next steps for transferring data to admin dashboard.
