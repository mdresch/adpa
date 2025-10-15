# 🚀 Vercel Deployment - Database & Redis Setup

## Current Status

✅ **Vercel Deployment**: Complete
⏳ **Neon Database**: Need to connect
⏳ **Redis Cache**: Need to add Vercel KV

---

## 🗄️ Option 1: Add Vercel KV (Upstash Redis) - Recommended

Vercel KV is the easiest way to add Redis to your Vercel deployment:

### Via Vercel Dashboard

1. **Go to your Vercel project**:
   - Visit https://vercel.com/dashboard
   - Select your `adpa-frontend` project

2. **Navigate to Storage tab**

3. **Click "Create Database"**

4. **Select "KV (Redis)"**:
   - Database name: `adpa-redis`
   - Region: **Washington, D.C. (US East)** or **San Francisco (US West)**
     - Choose West to match your Neon DB region (gwc = Azure West Coast)

5. **Click "Create"**

Vercel will automatically add these environment variables:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`
- `KV_URL`

### Via Vercel CLI

```bash
vercel integration add upstash
```

Or manually add KV:

```bash
vercel env add KV_URL production
vercel env add KV_REST_API_URL production
vercel env add KV_REST_API_TOKEN production
```

---

## 🗄️ Neon Database Connection

### Important: Frontend Doesn't Need Direct Database Access!

Your **frontend** (Vercel) should **NOT** connect directly to the database.
Instead:
- ✅ Frontend calls **Backend API** (Railway)
- ✅ Backend connects to **Neon Database**

### If You Need Database on Vercel (for API routes)

```bash
# Add Neon connection string
vercel env add DATABASE_URL production
# Enter your Neon URL:
# postgresql://neondb_owner:npg_2wXJF8j1rB7W@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require

# Or use Vercel Postgres integration
vercel integration add neon
```

---

## 🔧 Backend Configuration

Your Railway backend also needs Redis. Let's add Upstash Redis there too:

### Add Redis to Railway

```bash
railway variables --set "REDIS_URL=<your-upstash-redis-url>"
```

**Get Upstash Redis URL**:
1. Go to https://console.upstash.com
2. Create database (if not done):
   - Name: `adpa-redis`
   - Region: **US West** (same as Neon)
3. Copy the connection string
4. Add to Railway:

```bash
railway variables --set "REDIS_URL=rediss://default:password@us1-xxxxx.upstash.io:6379"
```

---

## 🔗 Connect Frontend to Backend

Make sure your frontend has the backend URL:

```bash
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://adpa-production.up.railway.app
```

Then redeploy:

```bash
vercel --prod
```

---

## ✅ Complete Setup Checklist

### Vercel (Frontend)
- [x] Deployed to Vercel
- [ ] Add Vercel KV (Redis)
- [ ] Set `NEXT_PUBLIC_API_URL=https://adpa-production.up.railway.app`
- [ ] Redeploy with environment variables

### Railway (Backend)
- [x] Deployed to Railway
- [x] Environment variables set
- [ ] Configure root directory to `server` (in dashboard)
- [ ] Add Upstash Redis URL
- [ ] Redeploy

### Upstash (Redis)
- [ ] Create Redis database (US West region)
- [ ] Get connection URL
- [ ] Add to Railway backend
- [ ] Add KV credentials to Vercel

---

## 🎯 Quick Commands

### Check Vercel Environment

```bash
vercel env ls
vercel domains ls
```

### Add Backend URL to Vercel

```bash
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://adpa-production.up.railway.app

vercel --prod
```

### Add Redis to Railway

```bash
# After creating Upstash Redis
railway variables --set "REDIS_URL=rediss://default:xxx@us1-xxx.upstash.io:6379"
```

### Test Everything

```bash
# Test backend
curl https://adpa-production.up.railway.app/health

# Test frontend (in browser)
# Visit your Vercel URL
# Login and test Process Flow
```

---

## 🚨 Important Notes

### Frontend Architecture

```
Frontend (Vercel)
  ↓ API Calls
Backend (Railway)
  ↓ Queries
Neon PostgreSQL + Upstash Redis
```

**The frontend does NOT connect directly to the database!**
- All data access goes through the backend API
- Frontend only needs: `NEXT_PUBLIC_API_URL`

### Vercel KV vs Backend Redis

- **Vercel KV**: For frontend caching, session management
- **Backend Redis**: For backend queues, cache, pub/sub

You might want **two Redis instances**:
1. Vercel KV for frontend
2. Upstash Redis for backend

Or **share one Upstash Redis** between both.

---

## 🎉 Next Steps

1. **Add Vercel KV** (easiest: via Vercel dashboard)
2. **Set `NEXT_PUBLIC_API_URL`** in Vercel
3. **Create Upstash Redis** for backend
4. **Update Railway** root directory to `server`
5. **Test the deployment**!

Which would you like help with first?

