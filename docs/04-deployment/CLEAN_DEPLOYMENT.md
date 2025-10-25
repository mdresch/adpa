# 🚀 Clean Deployment Guide (No Docker)

## Overview

Deploy ADPA with clean npm installs:
- **Frontend** → Vercel (Next.js)
- **Backend** → Railway (Node.js, no Docker)
- **Database** → Neon PostgreSQL (already set up)
- **Redis** → Upstash (to be configured)

---

## 🔧 Backend Deployment (Railway - Standard Node.js)

### Configure Railway for Server Directory Only

**Option 1: Via Railway Dashboard** (Recommended)

1. Go to https://railway.com/project/2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3
2. Click your service "ADPA"
3. Go to **Settings** tab
4. Under **Build & Deploy**:
   - **Watch Paths**: `server/**`
   - **Root Directory**: `server`
   - **Build Command**: Leave empty (auto-detect)
   - **Start Command**: `npm start`
5. Click **Deploy** button

**Option 2: Via Railway CLI**

Configure the service to deploy only from server directory:

```bash
railway service
# Select the ADPA service if prompted

# The service will auto-detect package.json and use npm
```

### Environment Variables Already Set ✅

```
DATABASE_URL=postgresql://neondb_owner:npg_...@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require
JWT_SECRET=adpa-secret-key-change-in-production-2025
REDIS_URL=redis://localhost:6379
NODE_ENV=production
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### Deployment URL

✅ **Your Backend**: https://adpa-production.up.railway.app

---

## 🎨 Frontend Deployment (Vercel - Clean Install)

### Step 1: Complete Vercel Login

```bash
vercel login
```

### Step 2: Deploy Frontend

```bash
vercel --prod
```

Vercel will:
- Auto-detect Next.js
- Run `npm install` (clean install)
- Run `npm run build`
- Deploy to edge network

### Step 3: Set Backend URL

After deployment, add environment variable:

```bash
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://adpa-production.up.railway.app
```

Then redeploy:

```bash
vercel --prod
```

---

## 🔄 Update Backend with Frontend URL

Once you have the Vercel URL:

```bash
railway variables --set "FRONTEND_URL=https://your-app.vercel.app"
```

No need to redeploy - Railway will auto-redeploy when variables change!

---

## ✅ Quick Deployment Flow

```bash
# 1. Deploy Backend to Railway
#    (Already done via Railway dashboard - set root directory to "server")

# 2. Test Backend
curl https://adpa-production.up.railway.app/health

# 3. Deploy Frontend to Vercel
vercel --prod

# 4. Set Frontend's backend URL
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://adpa-production.up.railway.app

#5. Redeploy frontend
vercel --prod

# 6. Update Backend's CORS with Frontend URL
railway variables --set "FRONTEND_URL=https://your-vercel-url.vercel.app"
```

---

## 🧪 Testing

### Test Backend Health

```bash
curl https://adpa-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-10-14T...",
  "version": "2.0.0"
}
```

### Test Frontend

Visit your Vercel URL and:
1. Login
2. Navigate to Process Flow
3. Verify templates load
4. Check Template Base tokens (should not be 0!)

---

## 📊 Current Status

✅ Build Errors Fixed (all 119 errors resolved)
✅ Backend URL: https://adpa-production.up.railway.app  
✅ Railway Environment Variables Set
⏳ Railway Service: Configure root directory to "server"
⏳ Frontend: Deploy to Vercel
⏳ Upstash Redis: To be configured

---

## Next Step

**Configure Railway service root directory to `server` via the dashboard**, then the backend will deploy successfully!

Dashboard: https://railway.com/project/2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3

