# 🚀 Complete ADPA Deployment Guide
## Frontend (Vercel) + Backend (Railway) + Upstash Redis

---

## 📋 Prerequisites Checklist

- ✅ Vercel CLI installed (v48.1.6)
- ✅ Backend running locally on port 5000
- ✅ Frontend build successful (all errors fixed!)
- ✅ Neon PostgreSQL connected
- ⏳ Railway CLI (will install)
- ⏳ Upstash Redis (will create)

---

## 🎯 PART 1: Deploy Backend to Railway

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```

This will open a browser for authentication.

### Step 3: Initialize Railway Project

```bash
cd server
railway init
```

When prompted:
- **Project name**: `adpa-backend`
- **Environment**: `production`

### Step 4: Add Environment Variables

```bash
# Database (your existing Neon)
railway variables set DATABASE_URL="postgresql://neondb_owner:npg_2wXJF8j1rB7W@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require"

# JWT Secret
railway variables set JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Redis (will add after Upstash setup)
railway variables set REDIS_URL="redis://localhost:6379"

# Node environment
railway variables set NODE_ENV="production"

# Port
railway variables set PORT="5000"

# Frontend URL (will update after Vercel deployment)
railway variables set FRONTEND_URL="https://your-app.vercel.app"
```

### Step 5: Create railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Step 6: Add Upstash Redis to Railway

```bash
# Railway can provision Redis for you
railway add redis

# Or use external Upstash (recommended for same region as Neon)
# We'll set this up in Part 2
```

### Step 7: Deploy Backend

```bash
railway up
```

This will:
- Build your backend
- Deploy to Railway
- Give you a URL like: `https://adpa-backend-production.up.railway.app`

### Step 8: Get Backend URL

```bash
railway status
railway domain
```

Copy the backend URL - you'll need it for Vercel!

---

## 🎯 PART 2: Set Up Upstash Redis

### Option A: Via Railway (Easiest)

Railway can provision Redis automatically:

```bash
railway add
# Select: Redis
```

### Option B: Via Upstash Console (Recommended - Same Region as Neon)

1. Visit https://console.upstash.com
2. Sign in with GitHub
3. **Create Database**:
   - Name: `adpa-redis`
   - Type: Regional
   - Region: **US West** (or Azure West to match Neon)
   - Click Create
4. **Copy credentials**:
   - REST URL: `https://us1-xxxxx.upstash.io`
   - REST Token: `AXXXxxx...`
   - Redis URL: `rediss://default:xxxxx@us1-xxxxx.upstash.io:6379`

### Update Railway with Redis URL

```bash
railway variables set REDIS_URL="rediss://default:password@us1-xxxxx.upstash.io:6379"
```

---

## 🎯 PART 3: Deploy Frontend to Vercel

### Step 1: Login to Vercel

```bash
vercel login
```

Press ENTER or visit the device URL shown.

### Step 2: Link Project (from root directory)

```bash
cd ..  # Go back to project root
vercel link
```

When prompted:
- **Set up and deploy**: Yes
- **Which scope**: Select your account
- **Link to existing project**: No (create new)
- **Project name**: `adpa-frontend`
- **Directory**: `.` (current directory)

### Step 3: Add Upstash Redis to Vercel

```bash
# Vercel can integrate with Upstash
vercel integration add upstash

# Or manually add environment variables
vercel env add KV_REST_API_URL
vercel env add KV_REST_API_TOKEN
vercel env add KV_URL
```

Enter the values from your Upstash console.

### Step 4: Set Backend URL

```bash
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://adpa-backend-production.up.railway.app
```

### Step 5: Deploy to Vercel

```bash
vercel --prod
```

This will:
- Build your Next.js app
- Deploy to Vercel
- Give you a URL like: `https://adpa-frontend.vercel.app`

### Step 6: Update Backend CORS

Update Railway environment variable:

```bash
railway variables set FRONTEND_URL="https://adpa-frontend.vercel.app"
```

Then redeploy backend:

```bash
cd server
railway up
```

---

## 🎯 PART 4: Verification & Testing

### Test Backend

```bash
curl https://adpa-backend-production.up.railway.app/health
```

Should return:
```json
{
  "status": "OK",
  "timestamp": "2025-10-14T...",
  "version": "2.0.0"
}
```

### Test Frontend

Visit: `https://adpa-frontend.vercel.app`

1. Click **Login**
2. Use demo credentials or sign up
3. Navigate to **Process Flow Workflow**
4. Verify templates load and show token counts

### Test Redis Connection

Check Railway logs:

```bash
railway logs
```

Look for: `Redis connected successfully`

---

## 📊 Final Architecture

```
┌─────────────────────────────────────────────────┐
│  Users                                          │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Frontend (Vercel)                              │
│  • Next.js App                                  │
│  • https://adpa-frontend.vercel.app             │
│  • Region: Auto (Edge Network)                  │
└────────────────┬────────────────────────────────┘
                 │ HTTPS
                 ▼
┌─────────────────────────────────────────────────┐
│  Backend (Railway)                              │
│  • Express/Node.js API                          │
│  • https://adpa-backend-production.railway.app  │
│  • Region: US West                              │
└──────┬────────────────────────┬─────────────────┘
       │                        │
       │ PostgreSQL             │ Redis
       ▼                        ▼
┌──────────────┐        ┌──────────────────┐
│ Neon DB      │        │ Upstash Redis    │
│ Azure West   │        │ US West          │
│ (gwc region) │        │ Serverless       │
└──────────────┘        └──────────────────┘
```

---

## 🔧 Environment Variables Summary

### Railway Backend
```env
DATABASE_URL=postgresql://neondb_owner:...@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require
REDIS_URL=rediss://default:password@us1-xxxxx.upstash.io:6379
JWT_SECRET=your-secret-key
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://adpa-frontend.vercel.app
```

### Vercel Frontend
```env
NEXT_PUBLIC_API_URL=https://adpa-backend-production.up.railway.app
KV_REST_API_URL=https://us1-xxxxx.upstash.io
KV_REST_API_TOKEN=AXXXxxx...
KV_URL=rediss://default:password@us1-xxxxx.upstash.io:6379
```

---

## 🚨 Troubleshooting

### Backend won't connect to Redis
```bash
# Check Redis URL is correct
railway variables

# Test Redis connection manually
redis-cli -u "rediss://default:password@us1-xxxxx.upstash.io:6379" PING
```

### Frontend can't reach Backend
```bash
# Check CORS settings in backend
# Verify FRONTEND_URL is set correctly in Railway
railway variables

# Check backend logs
railway logs
```

### Build Failures
```bash
# Vercel build logs
vercel logs

# Railway build logs
railway logs --build
```

---

## 📈 Post-Deployment

### Monitor Deployments

**Vercel Dashboard**: https://vercel.com/dashboard  
**Railway Dashboard**: https://railway.app/dashboard  
**Upstash Dashboard**: https://console.upstash.com  
**Neon Dashboard**: https://console.neon.tech

### Set Up Custom Domain (Optional)

**Vercel:**
```bash
vercel domains add yourdomain.com
```

**Railway:**
```bash
railway domain
```

### Enable CI/CD

Both Vercel and Railway support automatic deployments from Git:

1. Connect GitHub repo to Vercel
2. Connect GitHub repo to Railway
3. Push to `main` → Auto deploy!

---

## 💰 Cost Estimate

- **Vercel**: Free (Hobby) or $20/month (Pro)
- **Railway**: ~$5-20/month (pay-as-you-go)
- **Neon PostgreSQL**: Free tier or current plan
- **Upstash Redis**: Free tier (10K requests/day) or ~$10/month

**Total**: $0-50/month depending on usage

---

## ✅ Deployment Checklist

- [ ] Railway CLI installed
- [ ] Backend deployed to Railway
- [ ] Backend URL obtained
- [ ] Upstash Redis created (US West region)
- [ ] Redis URL added to Railway
- [ ] Vercel login completed
- [ ] Frontend deployed to Vercel
- [ ] Frontend URL obtained
- [ ] Backend CORS updated with Frontend URL
- [ ] Test login at frontend URL
- [ ] Test Process Flow page
- [ ] Verify Template Base shows token count (not 0!)

---

Ready to start? Let's begin! 🚀

