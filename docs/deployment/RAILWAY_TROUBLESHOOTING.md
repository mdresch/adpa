# Railway Backend Troubleshooting Guide

**Issue:** Login returning 500 Internal Server Error on production (Railway)

---

## 🔍 **Quick Diagnosis**

### **Backend Health Check:**
```bash
curl https://adpa-production.up.railway.app/health
```

**✅ If returns:** `{"status":"OK","timestamp":"..."}`  
**Diagnosis:** Backend is running, specific endpoint issue

**❌ If fails:** Backend not running or not accessible

---

## 🐛 **Common Issue: Login 500 Error**

### **Symptoms:**
```
POST /api/auth/login 500 (Internal Server Error)
```

### **Most Common Causes:**

**1. Database Not Connected** (90% of cases!)
- Railway backend can't reach Neon database
- Environment variable `POSTGRES_URL` missing or wrong

**2. Old Code Deployed**
- Railway is running old code without latest fixes
- Need to redeploy with latest commit

**3. Missing Environment Variables**
- `JWT_SECRET` not set
- `SESSION_SECRET` not set

**4. CORS Issue**
- Railway not allowing Vercel domain
- Missing CORS configuration

---

## ✅ **Solution Steps**

### **Step 1: Check Railway Logs**

**In Railway Dashboard:**
1. Go to: https://railway.app/dashboard
2. Select your **ADPA backend** project
3. Click **Deployments** tab
4. Click latest deployment
5. Click **View Logs**

**Look for:**
```
❌ Database connection failed
❌ POSTGRES_URL not set
❌ JWT_SECRET not set
❌ Error: Cannot read properties of null
```

---

### **Step 2: Verify Environment Variables**

**In Railway Dashboard → Variables tab, you MUST have:**

```bash
# Database (Neon)
POSTGRES_URL=postgresql://neondb_owner:npg_1nieXl3ZDxsw@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require

# Redis (Upstash)
REDIS_URL=rediss://default:ARt6AAImcDIwMjg1MzZkM2Y0ZTE0MGVhOTIzNTRjOWQ3NmIyMDUxM3AyNzAzNA@natural-vulture-7034.upstash.io:6379

# Authentication
JWT_SECRET=<your-production-jwt-secret-at-least-32-chars>
SESSION_SECRET=<your-production-session-secret>

# Encryption (REQUIRED for production!)
ENCRYPTION_KEK=<generate-with-crypto.randomBytes(32).toString('hex')>

# Node Environment
NODE_ENV=production
PORT=5000

# CORS (Allow your Vercel domain)
FRONTEND_URL=https://adpa.vercel.app
CORS_ORIGIN=https://adpa.vercel.app
```

---

### **Step 3: Generate Production Secrets**

**If you don't have them yet:**

```bash
# Generate ENCRYPTION_KEK (32-byte hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: 64-character hex string

# Generate JWT_SECRET (random string, 32+ chars)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Add these to Railway → Variables**

---

### **Step 4: Update CORS for Vercel Domain**

**Check `server/src/server.ts` has:**

```typescript
const allowedOrigins = [
  'http://localhost:3000',          // Local dev
  'https://adpa.vercel.app',        // Your Vercel production
  'https://*.vercel.app',            // Vercel preview deployments
  process.env.FRONTEND_URL,          // From env var
]

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true)
    
    // Check if origin is allowed
    const allowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        // Handle wildcard domains
        const regex = new RegExp(allowed.replace('*', '.*'))
        return regex.test(origin)
      }
      return allowed === origin
    })
    
    if (allowed) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
```

---

### **Step 5: Redeploy Railway Backend**

**Option A: Trigger Redeploy in Railway Dashboard**
1. Go to Railway Dashboard
2. Deployments tab
3. Click "Deploy" or "Redeploy latest"

**Option B: Push Latest Code**
```bash
# Make sure you're on development branch
git branch

# Push latest (triggers automatic Railway deploy)
git push origin development

# Railway will auto-deploy from GitHub
```

---

## 🔧 **Specific Fix for Login 500 Error**

### **Check Railway Has These Environment Variables:**

```bash
# CRITICAL for login to work:
POSTGRES_URL=postgresql://...  (Must be set!)
JWT_SECRET=...                 (Must be at least 32 chars!)
```

**Without these, login will fail with 500!**

---

### **How to Add in Railway:**

**Method 1: Railway Dashboard**
1. Project → Variables tab
2. Click "New Variable"
3. Name: `POSTGRES_URL`
4. Value: `postgresql://neondb_owner:npg_1nieXl3ZDxsw@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require`
5. Click "Add"
6. Repeat for `JWT_SECRET`, `ENCRYPTION_KEK`, etc.
7. **Click "Deploy"** to apply changes

**Method 2: Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Add variables
railway variables set POSTGRES_URL="postgresql://..."
railway variables set JWT_SECRET="your-secret-here"
railway variables set ENCRYPTION_KEK="your-kek-here"

# Redeploy
railway up
```

---

## 📋 **Complete Railway Environment Variables Checklist**

### **Required (Production Won't Work Without These!):**

```bash
# Database
✅ POSTGRES_URL=postgresql://neondb_owner:npg_1nieXl3ZDxsw@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require

# Redis  
✅ REDIS_URL=rediss://default:ARt6AAImcDIwMjg1MzZkM2Y0ZTE0MGVhOTIzNTRjOWQ3NmIyMDUxM3AyNzAzNA@natural-vulture-7034.upstash.io:6379

# Authentication
✅ JWT_SECRET=<your-32-char-secret>
✅ SESSION_SECRET=<your-32-char-secret>

# Encryption (CRITICAL!)
✅ ENCRYPTION_KEK=<64-char-hex-from-crypto.randomBytes>

# Environment
✅ NODE_ENV=production
✅ PORT=5000

# CORS
✅ FRONTEND_URL=https://adpa.vercel.app
✅ CORS_ORIGIN=https://adpa.vercel.app
```

---

## 🎯 **Quick Fix Steps**

### **Most Likely Fix (Database Connection):**

**1. Add POSTGRES_URL to Railway:**
```
Variable: POSTGRES_URL
Value: postgresql://neondb_owner:npg_1nieXl3ZDxsw@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require
```

**2. Add ENCRYPTION_KEK:**
```bash
# Generate KEK
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to Railway
Variable: ENCRYPTION_KEK
Value: <paste the generated hex string>
```

**3. Add JWT_SECRET:**
```bash
# Generate secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Add to Railway
Variable: JWT_SECRET
Value: <paste the generated string>
```

**4. Redeploy:**
Click "Deploy" in Railway dashboard

**5. Wait 2-3 minutes for deployment**

**6. Test login again:**
Should work now! ✅

---

## 📊 **Verification Commands**

### **After Adding Variables:**

```bash
# 1. Check health (should work)
curl https://adpa-production.up.railway.app/health
# ✅ {"status":"OK","timestamp":"...","version":"2.0.0"}

# 2. Check database connection (if you have endpoint)
curl https://adpa-production.up.railway.app/api/health/db
# ✅ {"database":"connected","timestamp":"..."}

# 3. Try login (from terminal)
curl -X POST https://adpa-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@adpa.local","password":"Admin123!"}'

# ✅ Should return: {"token":"...","user":{...}}
# ❌ If 500: Check Railway logs for specific error
```

---

## 🚨 **Critical: Railway Must Have ALL These Variables**

Copy-paste this checklist into Railway → Variables:

```bash
POSTGRES_URL=postgresql://neondb_owner:npg_1nieXl3ZDxsw@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require
REDIS_URL=rediss://default:ARt6AAImcDIwMjg1MzZkM2Y0ZTE0MGVhOTIzNTRjOWQ3NmIyMDUxM3AyNzAzNA@natural-vulture-7034.upstash.io:6379
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://adpa.vercel.app
CORS_ORIGIN=https://adpa.vercel.app
JWT_SECRET=GENERATE_ME_WITH_CRYPTO_RANDOMBYTES
SESSION_SECRET=GENERATE_ME_WITH_CRYPTO_RANDOMBYTES
ENCRYPTION_KEK=GENERATE_ME_WITH_CRYPTO_RANDOMBYTES_HEX
```

**Generate the secrets marked with "GENERATE_ME" using the node commands above!**

---

## 🔍 **Next Steps:**

**1. Check Railway Logs** (most important!)
   - See actual error message
   - Identify missing variable or connection issue

**2. Add Missing Variables**
   - Copy from local `.env.local`
   - Generate new production secrets

**3. Redeploy**
   - Click "Deploy" in Railway

**4. Test Again**
   - Login should work!

---

**The Railway backend is running (health OK) but missing configuration. Check the logs first to see the specific error!** 🔍
