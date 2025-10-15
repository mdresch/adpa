# 🔗 Backend URL Configuration

## What URL to Enter

When Vercel prompts you for `NEXT_PUBLIC_API_URL`, enter:

```
https://adpa-production.up.railway.app
```

## Why This URL?

This is your **Railway backend API server** that handles:
- ✅ Database queries (Neon PostgreSQL)
- ✅ Redis caching
- ✅ Authentication
- ✅ Template processing
- ✅ Document generation
- ✅ All business logic

## Architecture Flow

```
User Browser
    ↓
Vercel Frontend (Next.js)
    ↓ HTTP API Calls to: https://adpa-production.up.railway.app
Railway Backend (Express API)
    ↓ Database Queries
Neon PostgreSQL (ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech)
    ↓ Redis Cache
Upstash Redis (via Vercel KV)
```

## Environment Variables Summary

### Vercel Frontend Needs:
```env
NEXT_PUBLIC_API_URL=https://adpa-production.up.railway.app
```

### Railway Backend Has:
```env
DATABASE_URL=postgresql://neondb_owner:...@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require
REDIS_URL=redis://localhost:6379  # (will update to Upstash)
FRONTEND_URL=http://localhost:3000  # (will update to your Vercel URL)
JWT_SECRET=adpa-secret-key-change-in-production-2025
NODE_ENV=production
PORT=5000
```

## Complete Setup Commands

### 1. Add Backend URL to Vercel

```bash
vercel env add NEXT_PUBLIC_API_URL production
```

**When prompted, enter:**
```
https://adpa-production.up.railway.app
```

### 2. Redeploy Frontend

```bash
vercel --prod
```

### 3. Get Your Vercel Frontend URL

```bash
vercel domains ls
```

This will show something like: `https://adpa-xxxx.vercel.app`

### 4. Update Railway with Frontend URL

```bash
railway variables --set "FRONTEND_URL=https://your-app.vercel.app"
```

Replace `your-app.vercel.app` with your actual Vercel domain!

---

## Quick Reference

**Railway Backend**: `https://adpa-production.up.railway.app`  
**Use this for**: `NEXT_PUBLIC_API_URL` in Vercel

**Your Vercel Frontend**: (get from `vercel domains ls`)  
**Use this for**: `FRONTEND_URL` in Railway

---

Ready to proceed? Just enter the Railway URL when prompted!

