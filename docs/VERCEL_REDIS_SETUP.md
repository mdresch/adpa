# 🚀 Vercel + Upstash Redis Setup Guide

## Overview

Your setup:
- ✅ **Neon PostgreSQL**: Already running (Azure West Coast - `gwc.azure.neon.tech`)
- ⏳ **Upstash Redis**: Need to set up in same region

## Option 1: Quick Setup via Vercel Dashboard (Recommended)

### Step 1: Add Upstash Redis Integration

1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **Create Database**
4. Select **KV (Redis)** by Upstash
5. Choose database name: `adpa-redis`
6. Select region: **US West** (same as Neon for lowest latency)
7. Click **Create**

Vercel will automatically:
- Create Upstash Redis database
- Set environment variables:
  - `KV_REST_API_URL`
  - `KV_REST_API_TOKEN`
  - `KV_REST_API_READ_ONLY_TOKEN`
  - `KV_URL`

### Step 2: Update Backend Environment Variables

Add to your Vercel project environment variables:

```env
# Redis Configuration
REDIS_URL=<KV_URL from Vercel>
# Or use REST API
UPSTASH_REDIS_REST_URL=<KV_REST_API_URL>
UPSTASH_REDIS_REST_TOKEN=<KV_REST_API_TOKEN>
```

## Option 2: Manual Upstash Setup via CLI

### Step 1: Install Vercel CLI (already done ✅)

```bash
vercel --version  # 48.1.6
```

### Step 2: Login and Link Project

```bash
vercel login
vercel link
```

### Step 3: Add KV Storage

```bash
vercel env add KV_URL
vercel env add KV_REST_API_URL
vercel env add KV_REST_API_TOKEN
```

## Option 3: Direct Upstash Setup

1. Visit https://console.upstash.com
2. Sign in with GitHub (or create account)
3. Create new Redis database:
   - Name: `adpa-redis`
   - Region: **US West 1 (AWS)** or **West US 2 (Azure)** (to match Neon)
   - Type: **Regional**
4. Copy connection details:
   - REST URL
   - REST Token
   - Redis URL

## Update Backend Code for Upstash

Your current Redis setup uses `ioredis`. For Upstash compatibility:

### Option A: Use Upstash Redis SDK (Recommended for Vercel)

```bash
cd server
npm install @upstash/redis
```

Then update `server/src/utils/redis.ts`:

```typescript
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export default redis
```

### Option B: Keep ioredis (Works with Upstash)

Your current setup will work! Just update the connection URL:

```typescript
// In server/.env
REDIS_URL=rediss://default:<password>@<region>.upstash.io:6379
```

## Environment Variables Needed

### For Vercel Frontend (.env.production)

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

### For Backend (Railway/Render/etc)

```env
# Database (already have)
DATABASE_URL=postgresql://neondb_owner:...@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require

# Redis (new - from Upstash)
REDIS_URL=rediss://default:<password>@us1-merry-macaw-12345.upstash.io:6379

# Or use REST API
UPSTASH_REDIS_REST_URL=https://us1-merry-macaw-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your-token>

# Other
JWT_SECRET=<your-secret>
FRONTEND_URL=https://your-app.vercel.app
```

## Deployment Steps

### 1. Set Up Upstash Redis

Choose one of the options above to create Redis database.

### 2. Configure Environment Variables

```bash
# Add to Vercel project
vercel env add REDIS_URL
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add DATABASE_URL
vercel env add JWT_SECRET
```

### 3. Deploy Frontend to Vercel

```bash
vercel --prod
```

### 4. Deploy Backend

**Recommended: Railway**
```bash
cd server
npm install -g @railway/cli
railway login
railway init
railway up
```

**Or: Render**
- Connect GitHub repo
- Select `server` as root directory
- Add environment variables
- Deploy

### 5. Update Frontend Environment

```bash
# Update NEXT_PUBLIC_API_URL to point to deployed backend
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://your-backend.railway.app
```

## Testing the Setup

### Test Upstash Redis Connection

```bash
# Install Upstash CLI
npm install -g @upstash/cli

# Test connection
upstash redis ping
```

### Test from Backend

```typescript
// In server, test Redis
import redis from './utils/redis'

async function testRedis() {
  await redis.set('test', 'Hello from Upstash!')
  const value = await redis.get('test')
  console.log('Redis test:', value) // Should print: Hello from Upstash!
}
```

## Region Selection for Lowest Latency

Your Neon DB is in: **Azure West Coast (gwc.azure.neon.tech)**

Choose Upstash region:
1. **Best**: Azure West US 2 (same cloud provider, same region)
2. **Good**: AWS US West 1 (different cloud, but west coast)
3. **OK**: Any US region

## Cost Estimate

### Upstash Redis (Serverless)
- **Free Tier**: 
  - 10,000 commands/day
  - 256 MB storage
  - Good for development

- **Pay-as-you-go**:
  - $0.2 per 100K requests
  - ~$10/month for typical app

### Neon PostgreSQL
- Already set up ✅
- Free tier or current plan

### Vercel
- **Hobby**: Free (non-commercial)
- **Pro**: $20/month (commercial)

## Quick Command Reference

```bash
# Setup
vercel login
vercel link

# Add environment variables
vercel env add REDIS_URL
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add NEXT_PUBLIC_API_URL

# Deploy
vercel --prod

# Check deployment
vercel ls
vercel logs
```

## Next Steps

1. ✅ Choose Upstash setup method (Dashboard or Manual)
2. ✅ Create Redis database in West US region
3. ✅ Add environment variables to Vercel
4. ✅ Deploy frontend: `vercel --prod`
5. ✅ Deploy backend to Railway/Render
6. ✅ Test the deployment

Would you like me to help you with any specific step?

