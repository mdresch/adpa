# Railway "Skipped: No Changes" Fix

**Date**: 2026-01-23  
**Issue**: Railway showing "Skipped: No Changes to watched files?"  
**Status**: ✅ Fix applied (manual redeploy / watch paths). Use CLI script to confirm latest repo + deploy.

---

## 🔍 Problem

Railway is skipping deployment because it's not detecting changes in the watched files. This happens when:

1. **Watch paths are too restrictive** - Only watching specific files/directories that haven't changed
2. **Wrong branch** - Watching `main` branch but changes are on `adpa-project-charter`
3. **Watch paths not set correctly** - Should watch `server/**` but might be watching something else

---

## ✅ Solution: Force Deployment

### Option 1: Manual Redeploy (Fastest)

**Via Railway Dashboard:**

1. Go to: https://railway.com/project/2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3
2. Click on "ADPA" service
3. Go to **Deployments** tab
4. Click **"Redeploy"** button on the latest deployment
5. This will force a deployment regardless of file changes

### Option 2: Fix Watch Paths

**Update Railway Settings:**

1. Go to Railway Dashboard → ADPA service → **Settings**
2. Find **Build** section
3. Check **Watch Paths**:
   - Should be: `server/**` (to watch all files in server directory)
   - Or leave empty to watch all files
4. Save settings
5. Push a new commit or trigger redeploy

### Option 3: Use Railway CLI to Force Deploy

**Automated (recommended):** Run the script from repo root:

```powershell
.\scripts\railway-deploy-and-verify.ps1
```

This will:
- Show current branch and latest 3 commits (confirm "latest" repo state)
- Check ahead/behind vs `origin` (prompt to push/pull if needed)
- Run `railway status` → `railway up --detach` → recent `railway logs`

**Options:**
- `-SkipDeploy` — Only status + logs (no deploy)
- `-DeployOnly` — Only `railway up --detach`
- `-LinkProject` — Run `railway link` with ADPA project ID first (use if not yet linked)

**Manual steps** (if you prefer):

```bash
# 1. From repo root (where railway.json lives)
cd d:\source\repos\adpa

# 2. Login (once)
railway login

# 3. Link to project (if needed)
railway link 2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3

# 4. Force deploy (bypasses watch paths)
railway up --detach

# 5. Confirm latest commits / monitor
git log -3 --oneline
railway logs
```

### Option 4: Make a Dummy Change to Trigger Deploy

If Railway is watching for file changes, make a small change:

```bash
# Add a comment to trigger deployment
echo "// Deployment trigger $(date)" >> server/src/server.ts

# Commit and push
git add server/src/server.ts
git commit -m "Trigger Railway deployment"
git push origin adpa-project-charter
```

---

## 🔧 Recommended Railway Settings

### Settings → Build:
- **Root Directory**: `server` ✅
- **Build Command**: `npm install` (or leave empty)
- **Watch Paths**: `server/**` OR leave empty (watch all)

### Settings → Source:
- **Repository**: Your GitHub repo
- **Branch**: `adpa-project-charter` (or `main` if merged)
- **Auto-Deploy**: Enabled ✅

### Settings → Deploy:
- **Start Command**: `npm start` ✅

---

## 🎯 Quick Fix Steps

**Fastest solution (2 minutes):**

1. **Go to Railway Dashboard**:
   - https://railway.com/project/2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3
   - Click "ADPA" service

2. **Click "Deployments" tab**

3. **Click "Redeploy"** on the latest deployment

4. **Wait 2-3 minutes** for deployment

5. **Verify**:
   - Check logs for successful deployment
   - Test daily breakdown endpoint

---

## 📋 Why This Happens

Railway's "watch paths" feature is designed to skip deployments when only unwatched files change. However:

- If watch paths are set to `server/src/**` but you only changed `server/package.json`, it skips
- If connected to wrong branch, it never sees your changes
- If watch paths are too specific, many changes get skipped

**Best Practice**: Either:
- Set watch paths to `server/**` (watch entire server directory)
- Or leave watch paths empty (watch all files)
- Or disable watch paths and always deploy on branch updates

---

## 🚂 Railway CLI: Confirm Latest Repo & Deploy

**Cursor skill**: See [skills/railway-deploy.SKILL.md](../skills/railway-deploy.SKILL.md) for the agent skill (when to run, commands, error handling).

To **confirm the latest repo push and commits are available to Railway** and trigger a deploy from your machine:

1. **Log in to Railway** (once per machine):
   ```powershell
   railway login
   ```
   Then run the script below.

2. **Ensure latest is pushed** (optional but recommended):
   ```powershell
   git fetch origin
   git status   # ahead? → git push origin adpa-project-charter
   ```

3. **Run the verification script** (from repo root):
   ```powershell
   .\scripts\railway-deploy-and-verify.ps1
   ```
   This prints branch + latest commits, checks sync with origin, runs `railway status` → `railway up --detach` → recent logs.

4. **If not yet linked:** run once with `-LinkProject`:
   ```powershell
   .\scripts\railway-deploy-and-verify.ps1 -LinkProject
   ```

**Notes:**
- The Railway CLI must reach `https://backboard.railway.com`. If you run this from an environment where outbound access is restricted (e.g. some CI or sandboxes), run it locally in PowerShell instead.
- If `railway up` reports **"operation timed out"** after indexing/compressing: the upload often completes, but the API response times out. Check the [Railway Deployments](https://railway.com/project/2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3) tab—a new deploy may already be running. If not, retry: `railway up --detach`.

---

## ✅ After Forcing Deployment

Once Railway deploys, verify:

1. **Health Check**:
   ```bash
   curl https://adpa-production.up.railway.app/health
   ```

2. **Daily Breakdown Endpoint**:
   - Go to AI Analytics page
   - Click a date
   - Should load without 404

3. **Check Logs**:
   ```bash
   railway logs
   ```
   - Should show server started
   - Should show routes registered
   - Should show `/api/ai-analytics/daily/:date` route

---

**Last Updated**: 2026-01-23  
**Status**: Use `.\scripts\railway-deploy-and-verify.ps1` to confirm latest commits and deploy via CLI.
