# Skill: Railway Deploy & Verify

**Scope**: ADPA backend deployment to Railway (production).  
**Use when**: User wants to deploy to Railway, confirm latest repo is deployed, fix "Skipped: No Changes", or verify ADPA production backend.

---

## When to use this skill

- User says: "deploy to Railway", "railway deploy", "push to Railway", "confirm latest is on Railway"
- User asks: "is production up to date?", "verify Railway deployment", "force Railway deploy"
- User hits: "Skipped: No Changes to watched files?" or deploy timeouts

---

## Prerequisites

- **Railway CLI** installed (`railway --version`)
- **Git** in repo root (branch `adpa-project-charter` or `main`)
- User must run `railway login` once per machine before first deploy
- Optionally **linked** to ADPA project (script can run `-LinkProject` if not)

## Two-service topology (API + Worker split)

`server/Procfile` defines two process types — this repo is no longer a single-service deploy:

```
web:    NODE_OPTIONS=--max-old-space-size=384 npm run start:api     (ADPA_PROCESS_ROLE=api)
worker: NODE_OPTIONS=--max-old-space-size=320 npm run start:worker  (ADPA_PROCESS_ROLE=worker)
```

This was introduced to fix OOM crashes: previously `npm start` ran with no `ADPA_PROCESS_ROLE`
(defaults to `all`), so one process ran the HTTP API **and** all 13 RabbitMQ queue consumers
**and** Puppeteer/Chromium for PDF export — on a memory-constrained instance that's the
`adpa-api-worker-split` skill's invariants being violated by the deploy config, not the code.

**If Railway only has one service today**, create a second service pointed at this same repo:

1. In the Railway dashboard, add a new service from the same GitHub repo/branch.
2. Set its start command to the `worker` Procfile process (override to
   `NODE_OPTIONS=--max-old-space-size=320 npm run start:worker` if Railway doesn't
   auto-detect the second Procfile entry).
3. Copy all env vars from the existing web service (`DATABASE_URL`, `RABBITMQ_URL`,
   `REDIS_URL`, AI provider keys, etc.) — the worker needs the same secrets, just a
   different process role.
4. Verify the two services log differently: the api service should NOT log
   "Registering queue consumers...", the worker service should log the
   `[QUEUE] Registered ...` lines for all queues.

See `adpa-api-worker-split` for the code-level invariants this enforces.

---

## Procedure

1. **Ensure you're in repo root** (`d:\source\repos\adpa` or project root).

2. **Run the verification script**:
   ```powershell
   .\scripts\railway-deploy-and-verify.ps1
   ```
   This prints git branch + latest commits, `railway status`, `railway up --detach`, and recent logs.

3. **Script options** (use if user asks):
   - `-SkipDeploy` — Only status + logs, no deploy.
   - `-DeployOnly` — Only `railway up --detach`.
   - `-LinkProject` — Link to ADPA project first (use when not yet linked).

4. **If the agent cannot run Railway CLI** (e.g. sandbox, no network to `backboard.railway.com`):
   - Tell the user to run the script **locally in PowerShell** from repo root.
   - Remind them: `railway login` first if needed.

---

## Error handling

| Output | Action |
|--------|--------|
| **"Unauthorized" / "Please login"** | User must run `railway login` in a terminal, then re-run the script. |
| **"operation timed out"** after Indexed/Compressed | Upload often succeeded. Tell user to check [Railway Deployments](https://railway.com/project/2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3); a deploy may already be running. If not, retry: `railway up --detach`. |
| **"railway status failed" / not linked** | Run script with `-LinkProject`, or user runs `railway link 2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3` manually. |

---

## Reference

- **Plan**: [plans/RAILWAY_SKIP_DEPLOYMENT_FIX.md](../plans/RAILWAY_SKIP_DEPLOYMENT_FIX.md) — full options (dashboard redeploy, watch paths, CLI, dummy commit).
- **Script**: [scripts/railway-deploy-and-verify.ps1](../scripts/railway-deploy-and-verify.ps1).
- **Health check**: `curl https://adpa-production.up.railway.app/health`

---

## Invocation

- **Slash command**: Use this skill when the user invokes `/railway-deploy` or `/deploy-railway` (if your Cursor slash menu includes it).
- **Natural language**: Apply when the user's request matches **When to use this skill** above.
