# Complete Environment Setup for ADPA
**All Your Infrastructure Details**

---

## 🗄️ **Your Current Infrastructure**

| Service | Provider | Status | Details |
|---------|----------|--------|---------|
| **Database** | Supabase | ✅ Ready | blxzjbxczpmmgiwbtmdo |
| **Redis Cache** | Upstash (via Railway) | ✅ Configured | natural-vulture-7034.upstash.io |
| **Backend** | Railway | ✅ Deployed | adpa-production.up.railway.app |
| **Frontend** | Vercel | ✅ Deployed | (your-domain.vercel.app) |

---

## 📋 **Get Your Redis URL**

### Method 1: Railway Dashboard (Fastest)

1. Go to: https://railway.app/dashboard
2. Select your ADPA project
3. Click on your **backend service**
4. Go to **Variables** tab
5. Find `REDIS_URL`
6. Click the value to reveal full string
7. Copy: `rediss://default:PASSWORD@natural-vulture-7034.upstash.io:6379`

### Method 2: Upstash Console

1. Go to: https://console.upstash.com
2. Sign in
3. Find database: **natural-vulture-7034**
4. **Details** section → **Redis Connect**
5. Copy: `rediss://default:PASSWORD@natural-vulture-7034.upstash.io:6379`

---

## 📝 **Your Complete server/.env File**

Create `server/.env` with this content (fill in Redis password):

```env
# ==================== ADPA BACKEND CONFIGURATION ====================
# Generated: 2025-10-20
# Environment: Development
# Infrastructure: Supabase + Upstash + Railway

# ==================== DATABASE (SUPABASE) ====================

# Primary Database - Supabase PostgreSQL
DATABASE_URL=postgresql://postgres:QueIQ4Klopman$@db.blxzjbxczpmmgiwbtmdo.supabase.co:5432/postgres

# Supabase Project Details
SUPABASE_URL=https://blxzjbxczpmmgiwbtmdo.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJseHpqYnhjenBtbWdpd2J0bWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjIwMzAsImV4cCI6MjA3NjQ5ODAzMH0.2U4c5wrUBAD6BM8yRwJcS0MwgcSEVpzfS3gXUeVtNYM
SUPABASE_PROJECT_REF=blxzjbxczpmmgiwbtmdo

# ==================== REDIS CACHE (UPSTASH) ====================

# Get full URL from Railway dashboard or Upstash console
REDIS_URL=rediss://default:YOUR_UPSTASH_PASSWORD@natural-vulture-7034.upstash.io:6379

# Alternative: Use component values (backend will construct URL)
REDIS_HOST=natural-vulture-7034.upstash.io
REDIS_PORT=6379
REDIS_TLS=true
# REDIS_PASSWORD=YOUR_UPSTASH_PASSWORD

# ==================== SERVER CONFIGURATION ====================

PORT=5000
NODE_ENV=development

# ==================== SECURITY ====================

JWT_SECRET=adpa-jwt-secret-development-12345
SESSION_SECRET=adpa-session-secret-development-67890

# ==================== FRONTEND URL ====================

FRONTEND_URL=http://localhost:3000

# ==================== FILE UPLOADS ====================

MAX_FILE_SIZE=52428800
UPLOAD_DIR=./uploads

# ==================== LOGGING ====================

LOG_LEVEL=info
LOG_DIR=./logs

# ==================== AI PROVIDERS (OPTIONAL) ====================

# AI keys are stored in database, but can add fallbacks:
# OPENAI_API_KEY=
# GOOGLE_AI_API_KEY=
# MISTRAL_API_KEY=
# ANTHROPIC_API_KEY=
# GROQ_API_KEY=

# ================================================================
```

---

## 🎯 **Quick Setup Steps**

### 1. Get Redis Password

**Easiest:** Check Railway dashboard Variables tab → Click REDIS_URL to reveal

### 2. Create server/.env

Copy the template above and replace `YOUR_UPSTASH_PASSWORD` with actual password.

### 3. Create .env.local (frontend)

```env
NEXT_PUBLIC_SUPABASE_URL=https://blxzjbxczpmmgiwbtmdo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJseHpqYnhjenBtbWdpd2J0bWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjIwMzAsImV4cCI6MjA3NjQ5ODAzMH0.2U4c5wrUBAD6BM8yRwJcS0MwgcSEVpzfS3gXUeVtNYM
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WS_URL=http://localhost:5000
```

### 4. Run Migrations

```powershell
cd D:\source\repos\adpa
node scripts/apply-baseline-migration.js
node scripts/create-change-request-template.js
node scripts/check-baseline-tables.js
```

### 5. Start Services

```powershell
# Terminal 1: Backend
cd D:\source\repos\adpa\server
npm run dev

# Terminal 2: Frontend  
cd D:\source\repos\adpa
npm run dev
```

---

## ✅ **Complete Infrastructure Summary**

```
┌─────────────────────────────────────────────────┐
│         ADPA Production Architecture            │
└─────────────────────────────────────────────────┘

[Users/Stakeholders - Multi-Location]
            ↓
[Vercel Frontend - Next.js]
  NEXT_PUBLIC_SUPABASE_URL=https://blxzjbxczpmmgiwbtmdo.supabase.co
  NEXT_PUBLIC_API_URL=https://adpa-production.up.railway.app
            ↓
[Railway Backend - Express.js]
  DATABASE_URL → Supabase PostgreSQL (db.blxzjbxczpmmgiwbtmdo.supabase.co)
  REDIS_URL → Upstash Redis (natural-vulture-7034.upstash.io)
            ↓
    ┌───────┴────────┐
    ↓                ↓
[Supabase DB]   [Upstash Redis]
 US East         US East (probably)
```

**All cloud-based → Perfect for multi-location access!** ✅

---

## 🚀 **Fastest Path Forward**

**Just need the Redis password:**

1. **Go to Railway:** https://railway.app/dashboard
2. **Find ADPA project** → Backend service
3. **Variables tab** → Click on `REDIS_URL` value
4. **Copy the complete URL** (starts with `rediss://`)
5. **Paste into server/.env**

**Or:**

1. **Go to Upstash:** https://console.upstash.com
2. **Find database:** natural-vulture-7034
3. **Copy Redis URL** from Details

**Then:**
```powershell
cd D:\source\repos\adpa
# Add REDIS_URL to server/.env
node scripts/apply-baseline-migration.js
cd server && npm run dev
```

**Done!** 🎉

