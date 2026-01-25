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
