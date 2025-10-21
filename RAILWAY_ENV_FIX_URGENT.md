# 🚨 URGENT: Railway Backend Configuration Fix

**Issue**: Railway backend cannot connect to database or Redis
**Impact**: Login fails with 500 error, no data access
**Status**: Server running but non-functional

## Current Errors on Railway

```
❌ DATABASE_URL connection error: ENETUNREACH (IPv6 issue)
❌ Redis connection timeout after 5000ms
⚠️  Server running WITHOUT database and Redis
```

## Required Environment Variables for Railway Backend

Add/update these in your Railway backend service:

### 1. Database Connection (Supabase)

**CRITICAL**: Railway needs the DIRECT connection string (port 5432), not pooled:

```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project-ref.supabase.co:5432/postgres?sslmode=require

# Alternative format if Supabase:
POSTGRES_URL=postgresql://postgres:[PASSWORD]@db.your-project-ref.supabase.co:5432/postgres?sslmode=require

# Individual components (if needed):
DB_HOST=db.your-project-ref.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=true
```

### 2. Redis Connection (Upstash)

```bash
REDIS_URL=rediss://default:[PASSWORD]@natural-vulture-7034.upstash.io:6379
```

### 3. Other Critical Variables

```bash
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long
FRONTEND_URL=https://adpa-jn9kv3ykv-menno-dreschers-projects.vercel.app
```

## How to Fix in Railway Dashboard

1. Go to https://railway.app/dashboard
2. Select your ADPA backend service
3. Click **Variables** tab
4. Update/add the environment variables above
5. Click **Deploy** or wait for auto-redeploy
6. Check logs for successful connections:
   ```
   ✅ Database connected successfully
   ✅ Redis connected successfully
   ```

## Quick Verification

After updating variables, test:

```bash
# Health check (should work)
curl https://adpa-production.up.railway.app/health

# Login test (should work after fix)
curl -X POST https://adpa-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@adpa.com","password":"admin123"}'
```

## Alternative: Deploy Latest Code to Railway

If you have a Railway CLI or GitHub integration:

```bash
# If connected to GitHub, push to trigger deploy
git push origin development

# Railway will auto-deploy the latest code
```

## Common Issues

**IPv6 Connection Error**:
- Railway might be trying IPv6 first
- Ensure connection string uses hostname, not IP
- Add `?sslmode=require` to force SSL

**Redis Timeout**:
- Verify Upstash Redis URL is correct
- Check if firewall/IP restrictions block Railway
- Ensure URL format: `rediss://` (with double 's' for TLS)

## Current Working Configuration (Local)

Your local environment works perfectly with:
- ✅ Supabase PostgreSQL
- ✅ Upstash Redis  
- ✅ All AI features operational

You need to **replicate this configuration in Railway**.

---

**Priority**: Fix Railway backend environment variables BEFORE the Vercel deployment completes, or users will see errors.

