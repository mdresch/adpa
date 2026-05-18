# Backend URL Configuration

## Purpose

ADPA deploys a Next.js frontend separately from the Express backend. The frontend needs a server-side backend URL for route rewrites, proxy handlers, and scheduled keep-alive pings.

Use the deployed Express API origin as `BACKEND_URL`:

```env
BACKEND_URL=https://adpa.onrender.com
```

Set `NEXT_PUBLIC_API_URL` only for browser-facing code that explicitly needs a public API origin. The keep-alive route falls back to `NEXT_PUBLIC_API_URL` when `BACKEND_URL` is missing, but production deployments should prefer `BACKEND_URL` because it is server-side configuration.

## Where the URL Is Used

| Codepath | Source | Behavior |
| --- | --- | --- |
| Next.js API rewrites | `next.config.mjs` | Rewrites most `/api/*` requests to `${BACKEND_URL}/api/:path*`; defaults to `https://adpa.onrender.com` if unset. |
| OpenUI chat cookie proxies | `app/api/chat/route.ts`, `app/api/openui-chat/threads/*` | Proxy to `${BACKEND_URL}/api/v1/openui-chat/...`; default is `http://localhost:5000` for local development. |
| Backend keep-alive cron | `app/api/keepalive/route.ts`, `vercel.json` | Vercel calls `/api/keepalive` every 10 minutes; the route pings `${BACKEND_URL}/health` with a 15 second timeout. |

## Request Flow

```txt
Browser or Vercel Cron
    |
    v
Vercel Next.js frontend
    |
    |-- local route handlers: /api/chat, /api/openui-chat/*, /api/keepalive
    |
    `-- rewritten backend routes: /api/* except paths beginning with morphic, auth, chat, openui-chat
            |
            v
        Express backend at BACKEND_URL
            |
            v
        PostgreSQL, Redis, AI providers, integrations
```

## Keep-Alive Cron

`vercel.json` defines:

```json
{
  "crons": [
    {
      "path": "/api/keepalive",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

`app/api/keepalive/route.ts` builds a target of `${BACKEND_URL}/health`, sends `User-Agent: ADPA-Keepalive/1.0`, and returns:

```json
{
  "ok": true,
  "status": 200,
  "target": "https://adpa.onrender.com/health",
  "backend": {
    "status": "healthy"
  },
  "ts": "2026-05-18T16:00:00.000Z"
}
```

Use `/health` for this cron because it is a liveness endpoint mounted before the backend readiness gate. Use `/health/ready` for strict dependency readiness checks; it can return `503` while the database is still connecting.

## Environment Setup

### Vercel Frontend

```bash
vercel env add BACKEND_URL production
```

When prompted, enter the deployed Express API origin, for example:

```txt
https://adpa.onrender.com
```

Redeploy the frontend after changing the value:

```bash
vercel --prod
```

### Express Backend

Set the frontend origin on the backend for CORS:

```env
FRONTEND_URL=https://your-vercel-domain.vercel.app
```

The backend still needs its own database, Redis, JWT, and integration secrets in `server/.env` or the hosting provider's environment settings.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `/api/keepalive` returns `500 BACKEND_URL not configured` | Set `BACKEND_URL` in the Vercel project environment and redeploy. |
| `/api/keepalive` returns `502` | The frontend reached the route, but the backend health ping failed or exceeded the 15 second timeout. Check the `target` and backend logs. |
| Browser calls hit the wrong host | Confirm whether the path is a local Next.js route (`/api/chat`, `/api/openui-chat/*`) or a rewritten backend route (`/api/v1/...`, `/api/projects`, etc.). |
| Backend returns `503 Service Unavailable` | The backend process is alive, but the readiness gate is still closed. Check `/health/ready` and startup logs. |
