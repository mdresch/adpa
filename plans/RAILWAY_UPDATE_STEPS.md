# Railway Backend Update - Step by Step

**Date**: 2026-01-23  
**Issue**: Railway backend running code from 2 weeks ago  
**Status**: ⚠️ Needs immediate update

---

## 🔍 Root Cause

Railway is likely:
1. Connected to `main` branch instead of `adpa-project-charter`
2. Not auto-deploying on commits
3. Needs manual deployment trigger

---

## ✅ Solution: Update Railway to Latest Code

### Step 1: Check Railway Configuration

1. **Go to Railway Dashboard**:
   - https://railway.com/project/2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3
   - Click on "ADPA" service

2. **Check Source Connection**:
   - Go to **Settings** tab
   - Look for **Source** section
   - Check which branch it's connected to
   - **If connected to `main`**: You need to either:
     - Switch to `adpa-project-charter` branch, OR
     - Merge `adpa-project-charter` into `main`

### Step 2: Update Branch Connection (If Needed)

**Option A: Switch Railway to `adpa-project-charter` branch**

1. In Railway Dashboard → Settings → Source
2. Change branch from `main` to `adpa-project-charter`
3. Railway will auto-deploy the latest code

**Option B: Merge `adpa-project-charter` into `main`**

If you prefer Railway to stay on `main`:

```bash
# 1. Switch to main branch
git checkout main

# 2. Merge adpa-project-charter into main
git merge adpa-project-charter

# 3. Push to main
git push origin main

# Railway will auto-deploy if connected to main
```

### Step 3: Manual Deployment (If Auto-Deploy Not Working)

**Via Railway Dashboard:**

1. Go to Railway Dashboard → ADPA service
2. Click **Deployments** tab
3. Click **Redeploy** on the latest deployment
4. Or click **Deploy** button (top right)

**Via Railway CLI:**

```bash
# 1. Navigate to server directory
cd server

# 2. Login to Railway
railway login

# 3. Link to project (if not already)
railway link 2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3

# 4. Deploy latest code
railway up

# 5. Monitor deployment
railway logs --follow
```

---

## 🔧 Verify Railway Settings

Before deploying, verify these settings in Railway Dashboard:

### Settings → Build:
- **Root Directory**: `server` ✅
- **Build Command**: `npm install` (or leave empty)
- **Watch Paths**: `server/**` (optional)

### Settings → Deploy:
- **Start Command**: `npm start` ✅
- **Restart Policy**: `ON_FAILURE` ✅

### Settings → Source:
- **Repository**: Your GitHub repo
- **Branch**: Should be `adpa-project-charter` (or `main` if merged)
- **Auto-Deploy**: Should be enabled

---

## 📋 What Will Be Deployed

Once Railway updates, these will be live:

### New Routes:
- ✅ `GET /api/ai-analytics/daily/:date` - Daily breakdown

### Bug Fixes:
- ✅ AI Analytics date matching (TO_CHAR)
- ✅ Database connection fixes (getDatabasePool)
- ✅ Backend aggregation improvements
- ✅ UTC date parsing fixes

### New Features:
- ✅ GitHub Copilot AI provider support
- ✅ All related route updates

---

## 🧪 Verify Deployment

After Railway redeploys:

### 1. Check Health Endpoint:
```bash
curl https://adpa-production.up.railway.app/health
```

Should return:
```json
{
  "status": "OK",
  "timestamp": "...",
  "version": "2.0.0"
}
```

### 2. Test Daily Breakdown (from frontend):
1. Go to AI Analytics page
2. Click a date in the table
3. Should load without 404 error

### 3. Check Railway Logs:
```bash
railway logs
```

Look for:
- ✅ Server started successfully
- ✅ No TypeScript errors
- ✅ Database connected
- ✅ Routes registered

---

## ⚡ Quick Fix: Force Redeploy

**Fastest way to update Railway:**

1. **Go to Railway Dashboard**:
   - https://railway.com/project/2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3
   - Click "ADPA" service

2. **Go to Deployments tab**

3. **Click "Redeploy"** on the latest deployment

4. **Wait 2-3 minutes** for deployment to complete

5. **Test the daily breakdown endpoint**

---

## 🎯 Expected Deployment Time

- **Railway Build**: 2-3 minutes
- **Railway Deploy**: 30 seconds
- **Total**: ~3-4 minutes

---

## ✅ Success Criteria

After Railway updates:

- [ ] Health endpoint responds
- [ ] Daily breakdown endpoint works (no 404)
- [ ] Frontend can fetch daily breakdown
- [ ] All bug fixes are active
- [ ] GitHub Copilot provider can be added

---

**Last Updated**: 2026-01-23  
**Status**: ⚠️ Railway needs update - follow steps above
