# Vercel and Railway Environment Variables

Set these in each platform so the frontend (Vercel) and backend (Railway) talk to each other and to your database/Redis/Neo4j.

---

## Vercel (Next.js frontend)

Configure in **Vercel → Project → Settings → Environment Variables**. Use **Production** (and optionally Preview/Development) and the same values for the deployed backend URL.

| Variable | Description | Example |
|---------|-------------|---------|
| **NEXT_PUBLIC_API_URL** | Backend base URL (no trailing slash). Frontend appends `/api` for REST. **Must be your Railway backend URL.** | `https://your-app.railway.app` |
| **NEXT_PUBLIC_WS_URL** | (Optional) WebSocket base URL. If unset, derived from `NEXT_PUBLIC_API_URL`. Set if WS uses a different host/port. | Same as `NEXT_PUBLIC_API_URL` or leave empty |
| **NEXT_PUBLIC_DEBUG_WS** | (Optional) Set to `true` to log WebSocket events in the browser console. | `false` or omit |

**Important:** `NEXT_PUBLIC_API_URL` must point to the **Railway backend** (e.g. `https://adpa-backend.railway.app`). Do not include `/api` in the value; the app adds it.

**Optional (if you use these features):**

| Variable | Description |
|----------|-------------|
| POSTGRES_URL / POSTGRES_* | Only if Vercel serverless/API routes connect to Postgres (e.g. server-side). Often the backend on Railway owns DB; then omit on Vercel. |
| KV_URL, KV_REST_API_* | If using Vercel KV (Redis) from the frontend. |
| NEXT_PUBLIC_ITWIN_CLIENT_ID | Bentley iTwin Viewer client ID. |
| NEXT_PUBLIC_ITWIN_REDIRECT_URI | Callback URL for iTwin (e.g. `https://your-app.vercel.app/signin-callback`). |
| JWT_SECRET | Only if you validate JWT on Vercel; usually backend owns auth, so omit. |

---

## Railway (Express backend)

Configure in **Railway → Your backend service → Variables**. These are the main ones for a correct deployment.

### Required for frontend ↔ backend

| Variable | Description | Example |
|----------|-------------|---------|
| **FRONTEND_URL** | Full URL of the Next.js app (Vercel). Used for CORS, redirects, links in emails/notifications. | `https://your-app.vercel.app` |
| **PORT** | Port the server listens on. Railway often sets this automatically (e.g. `5000`). | `5000` or leave to Railway |
| **NODE_ENV** | Environment. Use `production` on Railway. | `production` |

### Database (PostgreSQL)

Use one of:

- **DATABASE_URL** (preferred): Full connection string.  
  Example: `postgres://user:password@host:5432/dbname?sslmode=require`
- Or **POSTGRES_URL**: Same idea; some stacks use this name.
- Or split: **DB_HOST**, **DB_PORT**, **DB_NAME**, **DB_USER**, **DB_PASSWORD**.  
  If using Neon/Supabase, **DB_SSL**=`true` and optionally **ADPA_ALLOW_INSECURE_TLS**=`false`.

### Auth and security

| Variable | Description | Example |
|----------|-------------|---------|
| **JWT_SECRET** | Secret used to sign/verify JWTs. **Must be strong and unique in production.** | Long random string (e.g. 32+ chars) |
| **SESSION_SECRET** | Session encryption key (if using server sessions). | Long random string |
| **BCRYPT_ROUNDS** | Cost factor for password hashing (e.g. 12). | `12` |

### Redis (optional but recommended)

| Variable | Description | Example |
|----------|-------------|---------|
| **REDIS_URL** | Redis connection URL. Used for cache/sessions/queues if configured. | `redis://default:password@host:6379` or Upstash `rediss://...` |

### RabbitMQ (optional – job queues)

| Variable | Description | Example |
|----------|-------------|---------|
| **RABBITMQ_URL** | AMQP URL for job queues. Omit if not using RabbitMQ. | `amqp://user:pass@host:5672` |

### Neo4j (optional – GKG / graph) – **Railway only**

Neo4j is used only by the **backend** (GKG sync, context injection, GKG summary). **Do not set any Neo4j variables on Vercel.** Set them only on **Railway** (backend service).

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| **NEO4J_URI** | Yes (to enable Neo4j) | Connection URI. Use **NEO4J_URL** as alias if you prefer. Leave **unset** to disable Neo4j (server runs normally without it). | **Aura:** `neo4j+s://xxxxxxxx.databases.neo4j.io` (from [console.neo4j.io](https://console.neo4j.io) → instance → Connect) |
| **NEO4J_USERNAME** | Yes (when Neo4j enabled) | Neo4j user. **NEO4J_USER** is also accepted. | `neo4j` |
| **NEO4J_PASSWORD** | Yes (when Neo4j enabled) | Neo4j password (from Aura / your instance). | Your instance password |
| **NEO4J_DATABASE** | No | Database name for sessions. Default `neo4j`. | `neo4j` |
| **NEO4J_CONNECT_TIMEOUT_MS** | No | Connection timeout in ms. Default `15000`. Aura can need ~60s after creation; increase if you see timeouts. | `15000` or `60000` |

**Where to get the values (Neo4j Aura):**

1. Go to [console.neo4j.io](https://console.neo4j.io) and create or open an Aura instance.
2. **Connect** → copy the **URI** (e.g. `neo4j+s://xxxx.databases.neo4j.io`) → set as **NEO4J_URI** (or **NEO4J_URL**).
3. Use the **username** (usually `neo4j`) and **password** you set for the instance → **NEO4J_USERNAME**, **NEO4J_PASSWORD**.
4. New Aura instances can take ~60 seconds to accept connections; if the backend fails at startup, wait and redeploy or set **NEO4J_CONNECT_TIMEOUT_MS** to `60000`.

**If Neo4j is not set:** GKG sync, GKG summary, and GKG context injection APIs return a clear “Neo4j is not configured” response; the rest of the app works.

### AI providers (optional)

| Variable | Description |
|----------|-------------|
| OPENAI_API_KEY | OpenAI API key |
| GOOGLE_AI_API_KEY | Google AI (Gemini) key |
| AZURE_OPENAI_API_KEY | Azure OpenAI key |
| AZURE_OPENAI_ENDPOINT | Azure OpenAI endpoint URL |

### Other optional (integrations, logging, etc.)

- **LOG_LEVEL**: `info` or `debug`
- **CONFLUENCE_BASE_URL**, **GITHUB_CLIENT_ID/SECRET**, **SLACK_***, **SMTP_***, etc.: See `server/.env.example`
- **UPLOAD_MAX_SIZE**, **UPLOAD_ALLOWED_TYPES**: If you need different limits
- **RATE_LIMIT_WINDOW_MS**, **RATE_LIMIT_MAX_REQUESTS**: Rate limiting
- **SENTRY_DSN**: Error tracking
- **TRACING_ENABLED**, **OTLP_ENDPOINT**, **SERVICE_NAME**: OpenTelemetry

---

## Checklist: correct details

1. **Vercel**
   - `NEXT_PUBLIC_API_URL` = your **Railway backend** URL (e.g. `https://adpa-backend.railway.app`), no `/api` suffix.

2. **Railway**
   - `FRONTEND_URL` = your **Vercel app** URL (e.g. `https://adpa.vercel.app`).
   - `DATABASE_URL` (or `POSTGRES_URL` / split DB_*) = your Postgres connection string (e.g. Neon, Supabase, Railway Postgres).
   - `JWT_SECRET` = same strong secret you use for auth (and match if you ever validate on Vercel).
   - If using Redis/RabbitMQ: set **REDIS_URL** / **RABBITMQ_URL**.
   - **Neo4j (GKG):** set **NEO4J_URI**, **NEO4J_USERNAME**, **NEO4J_PASSWORD** on Railway only (not on Vercel). Leave **NEO4J_URI** unset to disable GKG.

3. **CORS**
   - Backend uses `FRONTEND_URL` for allowed origins. So `FRONTEND_URL` must exactly match the Vercel deployment URL (including `https://` and no trailing slash).

4. **WebSocket**
   - Frontend connects to `NEXT_PUBLIC_WS_URL` or the same host as `NEXT_PUBLIC_API_URL`. Ensure Railway serves Socket.io on the same host/port as the API so the same URL works for REST and WS.

---

## References

- Backend env template: `server/.env.example`
- Frontend/local env template: `.env.local.example`
- API URL helper (frontend): `lib/api-url.ts` (`getApiBaseUrl()`, `getWsUrl()`)
- CORS (backend): `server/src/server.ts` (uses `FRONTEND_URL`)
