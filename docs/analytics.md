# Vercel Analytics setup

This repository already includes @vercel/analytics in package.json and the Analytics component has been added to the root App Router layout.

What I changed

- Created this documentation file explaining the current analytics setup and how to verify it.
- Added a client-side forwarder that posts pageview events to `/api/forward-analytics`.
- Added an API route that forwards incoming events to your admin dashboard webhook when configured.

What is present in the codebase

- package.json lists "@vercel/analytics": "1.3.1".
- app/layout.tsx imports and includes <Analytics /> from "@vercel/analytics/next".
- app/components/AnalyticsForwarder.tsx sends a minimal pageview payload on navigation.
- app/api/forward-analytics/route.ts receives payloads and forwards them.

How to wire to your admin dashboard (Option A)

1) Provide a webhook endpoint in your admin dashboard that accepts POST requests with a JSON body. Example shape (the forwarder currently sends):

```json
{
  "path": "/dashboard",
  "url": "https://example.com/dashboard",
  "referrer": "https://google.com/",
  "ts": 1680000000000,
  "ua": "Mozilla/5.0 (...)"
}
```

2) In your Vercel project settings, add the following Environment Variables (Project or Production scope as needed):
- `ADMIN_ANALYTICS_WEBHOOK` = `https://your-admin.example.com/api/ingest-analytics`
- (optional) `ADMIN_ANALYTICS_WEBHOOK_SECRET` = a long random token

The API route will forward events to `ADMIN_ANALYTICS_WEBHOOK`. If you set `ADMIN_ANALYTICS_WEBHOOK_SECRET`, the server will include an `Authorization: Bearer <secret>` header when forwarding for simple verification.

Do NOT commit secrets or the webhook URL into source code. Use Vercel Environment Variables.

How to test the forwarding endpoint locally (or after deploy)

- Locally: the client forwarder runs only in the browser; you can simulate a POST to the webhook endpoint directly with curl:

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"path":"/test","url":"http://localhost:3000/test","referrer":"","ts":'"$(date +%s%3N)"',"ua":"test-agent"}' \
  https://your-admin.example.com/api/ingest-analytics
```

- After deploy: set `ADMIN_ANALYTICS_WEBHOOK` in Vercel and visit your deployed site; the forwarder will POST real events to your admin webhook when users visit pages.

Security recommendations

- Protect the ingest endpoint on your admin dashboard by validating the `Authorization` header with the `ADMIN_ANALYTICS_WEBHOOK_SECRET` value.
- Rate-limit the ingest endpoint and validate payload shape before storing.
- Respect privacy: do not log or store unnecessary PII. Consider hashing or omitting sensitive fields.

Next steps I can take for you

- If you provide the webhook URL and want me to add a test/smoke check file or an integration test in the branch, I can add a small script that hits your webhook with a sample payload (the secret will not be stored in the repo; instead we will leave instructions to set it in Vercel).
- I can also implement server-side storage (DB) in a follow-up PR if you want historical retention and aggregation.

