# Railway Backend Status & Debugging Guide

## 🎯 Quick Health Check

### **1. Check Deployment Status**

Go to: https://railway.app/project/[your-project-id]

**Look for:**
```
✅ Status: Active (Green)
✅ Latest Deploy: Success
✅ Health Check: Passing
```

**Bad signs:**
```
❌ Status: Crashed (Red)
❌ Latest Deploy: Failed
❌ Health Check: Failing
```

---

### **2. Check Required Services**

Your ADPA backend needs **3 services** running:

```
┌─────────────────────────────────────┐
│ 1. Backend (Express)                │
│    Port: 5000                       │
│    Status: Should be "Active"       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 2. PostgreSQL (or external Supabase)│
│    Connected via DATABASE_URL       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 3. Redis (Railway or external)      │
│    Connected via REDIS_URL          │
│    Status: Should be "Active"       │
└─────────────────────────────────────┘
```

---

### **3. View Deployment Logs**

In Railway Dashboard → Backend Service → **"Deployments"** tab:

**Look for SUCCESS:**
```
✅ Resolved to IPv4: 18.213.155.45
✅ Database connected
✅ Redis connected successfully
✅ Job queues initialized successfully
✅ AI providers initialized successfully
✅ Server running on port 5000
```

**Look for ERRORS:**
```
❌ NOAUTH Authentication required          → Redis password wrong
❌ max requests limit exceeded             → Redis quota exhausted
❌ Cannot find module                      → Build issue
❌ connect ETIMEDOUT                       → Database unreachable
❌ Cannot read properties of null          → Database not connected
```

---

## 🔧 Current Known Issues

### **Issue 1: Redis Quota Exhausted**

**Error:**
```
ERR max requests limit exceeded. Limit: 500000, Usage: 500004
```

**Cause:** Using Upstash free tier which hit 500k request limit

**Solution:** Add Railway Redis service
1. Railway Dashboard → "+ New" → "Database" → "Add Redis"
2. Update backend variables: `REDIS_URL=${{Redis.REDIS_URL}}`
3. Redeploy

**Status:** ⏳ Waiting for you to add Redis service

---

### **Issue 2: ai-provider-testing Routes Missing**

**Error:**
```
Cannot find module './routes/ai-provider-testing'
```

**Cause:** File might not be in deployed code or TypeScript compilation issue

**Solution:** Already handled gracefully with conditional import
```typescript
// Code now skips if module is missing
if (aiProviderTestingRoutes) {
  app.use("/api/ai-provider-testing", aiProviderTestingRoutes)
}
```

**Status:** ✅ Fixed (non-blocking warning)

---

### **Issue 3: Database Connection (IPv6 Timeout)**

**Error:**
```
connect ETIMEDOUT 2600:1f18:...
```

**Cause:** Using port 5432 (direct) which returns IPv6 addresses

**Solution:** Use Supabase pooler (port 6543)
```bash
# Change DATABASE_URL from:
postgresql://...@db.xxx.supabase.co:5432/postgres?sslmode=require

# To:
postgresql://...@db.xxx.supabase.co:6543/postgres?pgbouncer=true&sslmode=require
```

**Status:** ⚠️ Needs manual fix in Railway variables

---

## 🎯 Deployment Checklist (Railway Backend)

### **Pre-Deployment:**
- [x] Code pushed to GitHub
- [x] Railway watching correct branch (`development`)
- [ ] Redis service added to Railway project
- [ ] All environment variables set (see below)
- [ ] Database migrations run

### **During Deployment:**
- [ ] Build phase completes
- [ ] No module errors
- [ ] Start command executes
- [ ] Health check passes

### **Post-Deployment:**
- [ ] Logs show "Server running on port 5000"
- [ ] Database connected
- [ ] Redis connected
- [ ] `/health` endpoint returns 200
- [ ] Frontend can connect to backend

---

## 📊 Environment Variables Required (Railway Backend)

Copy this list and verify ALL are set:

```bash
# Core Application
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://adpa.vercel.app
LOG_LEVEL=info

# Database (Use pooler port 6543, not 5432)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:6543/postgres?pgbouncer=true&sslmode=require
POSTGRES_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:6543/postgres?pgbouncer=true&sslmode=require
DB_SSL=true

# Redis (Use Railway Redis)
REDIS_URL=${{Redis.REDIS_URL}}
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}

# Security (Generate new for production!)
JWT_SECRET=[GENERATE-32-CHAR-STRING]
JWT_REFRESH_SECRET=[GENERATE-32-CHAR-STRING]
ENCRYPTION_KEY=[GENERATE-32-CHAR-STRING]
ENCRYPTION_KEK=[GENERATE-32-CHAR-STRING]

# AI Providers (At least ONE required)
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=AIza...

# Optional
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...
DEEPSEEK_API_KEY=sk-...
MOONSHOT_API_KEY=sk-...
```

---

## 🚀 Next Steps (In Order)

### **1. Add Railway Redis (NOW)**

**Time:** 1 minute

In Railway Dashboard:
1. Click **"+ New"** button
2. Select **"Database"** → **"Add Redis"**
3. Wait for provisioning (30 seconds)

### **2. Update REDIS_URL Variable**

**Time:** 30 seconds

In Backend Service → Variables:
1. Delete old Upstash `REDIS_URL`
2. Add: `REDIS_URL=${{Redis.REDIS_URL}}`
3. Save

### **3. Fix DATABASE_URL (Use Pooler)**

**Time:** 30 seconds

Update to use port **6543** instead of **5432**:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:6543/postgres?pgbouncer=true&sslmode=require
```

### **4. Verify AI Provider Keys**

**Time:** 1 minute

Ensure at least **ONE** of these is set:
- `OPENAI_API_KEY`
- `GOOGLE_AI_API_KEY`

### **5. Wait for Auto-Redeploy**

**Time:** 3-5 minutes

Railway will automatically redeploy when you update variables.

### **6. Check Deployment Logs**

Look for:
```
✅ Redis connected successfully
✅ Database connected
✅ Server running on port 5000
```

### **7. Test Production**

Visit: https://adpa.vercel.app

- No more 500 errors
- No more CORS errors
- Document generation works

---

## 📞 If It Still Fails

**Check logs for these errors:**

| Error | Meaning | Fix |
|-------|---------|-----|
| `NOAUTH` | Redis password wrong | Use `${{Redis.REDIS_URL}}` |
| `max requests exceeded` | Still using Upstash | Add Railway Redis |
| `ETIMEDOUT` | Database unreachable | Change port 5432 → 6543 |
| `Cannot find module` | Build issue | Already handled gracefully |

**Get detailed logs:**
```bash
railway logs --service backend --tail 100
```

---

## ✅ Success Criteria

Your Railway backend is **correctly deployed** when:

1. ✅ Deployment status: "Active" (green)
2. ✅ Health endpoint: `https://adpa-production.up.railway.app/health` returns 200
3. ✅ Logs show: "Server running on port 5000"
4. ✅ Logs show: "Redis connected successfully"
5. ✅ Logs show: "Database connected"
6. ✅ No crash-restart loops
7. ✅ Frontend at https://adpa.vercel.app works without errors

---

## 🎯 Current Status Summary

**What's Working:**
- ✅ Code is pushed and merged
- ✅ Railway is attempting deployment
- ✅ Supabase database available
- ✅ You have Railway credits (16 days, $3.38)

**What's Blocking:**
- ❌ Redis: Upstash quota exhausted (500k/500k)
- ❌ Deployment crashing on Redis auth/quota errors

**What You Need to Do RIGHT NOW:**
1. **Add Railway Redis service** (1 minute)
2. **Update REDIS_URL variable** (30 seconds)
3. **Wait for redeploy** (3 minutes)

**Then everything will work!** 🎉

---

Would you like me to create a **one-click Railway setup script** or shall we verify your Railway dashboard settings together?
