# Railway Production Configuration Guide

## Overview

This guide provides the complete configuration checklist for deploying ADPA backend to Railway.

**Last Updated:** 2025-10-28  
**Environment:** Production (Railway.app)  
**Services Required:** PostgreSQL, Redis

---

## 🚀 Quick Setup Checklist

- [ ] 1. Create Railway project
- [ ] 2. Add PostgreSQL service (Railway Postgres or external Supabase)
- [ ] 3. Add Redis service (Railway Redis)
- [ ] 4. Configure environment variables (see below)
- [ ] 5. Set build & start commands
- [ ] 6. Configure health checks
- [ ] 7. Run database migrations
- [ ] 8. Verify deployment
- [ ] 9. Test endpoints
- [ ] 10. Monitor logs

---

## 📋 Required Environment Variables

### **1. Database (PostgreSQL)**

Choose **ONE** of these options:

#### **Option A: Railway Postgres (Recommended)**

If using Railway's PostgreSQL service:

```bash
# Railway auto-provides these when you add PostgreSQL service:
DATABASE_URL=${{Postgres.DATABASE_URL}}
POSTGRES_URL=${{Postgres.POSTGRES_URL}}
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_SSL=false  # Railway Postgres is on same network
```

#### **Option B: External Supabase**

If using Supabase (current setup):

```bash
# Direct connection (port 5432)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require

# Pooler connection (port 6543) - RECOMMENDED for better IPv4 compatibility
POSTGRES_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true&sslmode=require

# Individual components
DB_HOST=db.[PROJECT-REF].supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[YOUR-PASSWORD]
DB_SSL=true

# Supabase-specific
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
```

---

### **2. Redis (Required for Job Queues)**

Choose **ONE** of these options:

#### **Option A: Railway Redis (Recommended)**

```bash
# Railway auto-provides these when you add Redis service:
REDIS_URL=${{Redis.REDIS_URL}}
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
```

#### **Option B: External Redis (Upstash, Redis Labs, etc.)**

```bash
REDIS_URL=redis://default:[PASSWORD]@[HOST]:[PORT]
REDIS_HOST=[HOST]
REDIS_PORT=[PORT]
```

**⚠️ CRITICAL:** If Redis is not available, AI generation will fail with 500 errors.

---

### **3. Security & Authentication**

```bash
# JWT Secret (MUST be 32+ characters, random string)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-random-string

# JWT Refresh Token Secret
JWT_REFRESH_SECRET=another-super-secret-refresh-token-key-minimum-32-chars

# Encryption Key (32 bytes for AES-256)
ENCRYPTION_KEY=32-byte-encryption-key-for-sensitive-data-storage-here

# Encryption KEK (for encrypting encryption keys)
ENCRYPTION_KEK=key-encryption-key-for-master-key-32-chars-minimum
```

**Generate secure keys:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows PowerShell:
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))
```

---

### **4. AI Provider API Keys**

```bash
# OpenAI (Required for most features)
OPENAI_API_KEY=sk-...

# Google AI (Gemini)
GOOGLE_AI_API_KEY=AIza...

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Mistral AI
MISTRAL_API_KEY=...

# Azure OpenAI (Optional)
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://...openai.azure.com/

# DeepSeek
DEEPSEEK_API_KEY=sk-...

# Moonshot AI
MOONSHOT_API_KEY=sk-...

# GitHub (for integrations)
GITHUB_TOKEN=ghp_...
```

**⚠️ Without at least ONE AI provider configured, document generation will fail.**

---

### **5. Application Settings**

```bash
# Environment
NODE_ENV=production

# Server Port (Railway auto-assigns, but set default)
PORT=5000

# Frontend URL (for CORS)
FRONTEND_URL=https://adpa.vercel.app

# Logging
LOG_LEVEL=info
```

---

### **6. Third-Party Integrations (Optional)**

```bash
# Adobe PDF Services
ADOBE_CLIENT_ID=...
ADOBE_CLIENT_SECRET=...

# Confluence
CONFLUENCE_CLIENT_ID=...
CONFLUENCE_CLIENT_SECRET=...
CONFLUENCE_CALLBACK_URL=https://adpa-production.up.railway.app/api/confluence/callback

# SharePoint
SHAREPOINT_CLIENT_ID=...
SHAREPOINT_CLIENT_SECRET=...
SHAREPOINT_TENANT_ID=...
```

---

## 🔧 Railway Project Setup

### **Step 1: Create Services**

In Railway dashboard:

1. **Create New Project** → "ADPA Backend"
2. **Add Service** → PostgreSQL (or connect external Supabase)
3. **Add Service** → Redis
4. **Add Service** → Web Service (your backend)

### **Step 2: Configure Backend Service**

#### **Build Settings:**
- **Builder:** Nixpacks (auto-detected)
- **Build Command:** `cd server && npm install && npm run build`
- **Start Command:** `cd server && npm start`
- **Root Directory:** `/` (repo root)

#### **Health Check:**
- **Path:** `/health`
- **Timeout:** 30 seconds
- **Interval:** 10 seconds

#### **Resources:**
- **Memory:** 512MB minimum (1GB recommended)
- **CPU:** Shared (or dedicated for better performance)

---

## 🗄️ Database Migration

After Railway deployment, run migrations:

### **Option 1: Using Railway CLI**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run psql $DATABASE_URL -f server/migrations/001_initial_schema.sql
railway run psql $DATABASE_URL -f server/migrations/100_add_document_regeneration.sql
railway run psql $DATABASE_URL -f server/migrations/101_add_parent_document_id.sql
railway run psql $DATABASE_URL -f server/migrations/102_fix_regeneration_jobs_fkey.sql
railway run psql $DATABASE_URL -f server/migrations/103_add_parent_document_id_index.sql
# ... run all other migrations
```

### **Option 2: Using Database Client**

```bash
# Get DATABASE_URL from Railway dashboard
# Run migrations locally connecting to Railway DB
psql "postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway" -f server/migrations/001_initial_schema.sql
```

### **Option 3: Automated Migration Script**

Create a migration runner that runs on Railway startup:

```json
// In package.json
{
  "scripts": {
    "start": "npm run migrate && node dist/server.js",
    "migrate": "node scripts/run-migrations.js"
  }
}
```

---

## 🔍 Verification Steps

### **1. Check Railway Deployment Logs**

In Railway dashboard → Your service → "Logs" tab:

Look for:
```
✅ Server running on port 5000
✅ Redis connected successfully
📊 Connecting to database...
✅ Database connected
```

**If you see:**
```
❌ DATABASE_URL connection error: ETIMEDOUT
❌ Redis connection failed
```

→ Your environment variables are wrong or services aren't running

---

### **2. Test Health Endpoint**

```bash
curl https://adpa-production.up.railway.app/health
```

**Expected response:**
```json
{
  "status": "OK",
  "timestamp": "2025-10-28T...",
  "version": "2.0.0"
}
```

---

### **3. Test Database Connection**

```bash
curl https://adpa-production.up.railway.app/api/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**If 500 error** → Database not connected  
**If 401 error** → Database connected, auth working  
**If 404 error** → Routes not registered

---

## 🐛 Common Railway Issues & Fixes

### **Issue 1: Database Connection Timeout**

**Error:** `connect ETIMEDOUT`

**Causes:**
- Wrong `DATABASE_URL`
- Database service not running
- IPv6 connectivity issues

**Fixes:**
1. **Use Pooler Connection (Supabase):**
   ```bash
   # Change from port 5432 to 6543
   POSTGRES_URL=postgresql://postgres:pass@db.xxx.supabase.co:6543/postgres?pgbouncer=true
   ```

2. **Use Railway Postgres:**
   - Add "PostgreSQL" service in Railway
   - Use `${{Postgres.DATABASE_URL}}` variable reference

3. **Check Database is Running:**
   - Railway Dashboard → PostgreSQL service → Check status

---

### **Issue 2: Redis Connection Failed**

**Error:** `Redis connection unavailable`

**Causes:**
- `REDIS_URL` not set
- Redis service not added to Railway

**Fixes:**
1. **Add Redis Service:**
   - Railway Dashboard → "New Service" → Redis
   - Copy the `REDIS_URL` from Redis service variables

2. **Use Railway Variable Reference:**
   ```bash
   REDIS_URL=${{Redis.REDIS_URL}}
   ```

3. **Verify Redis:**
   ```bash
   railway run redis-cli -u $REDIS_URL ping
   # Should return: PONG
   ```

---

### **Issue 3: Missing Environment Variables**

**Error:** `Provider not found or inactive`

**Cause:** AI provider API keys not set

**Fix:**
1. Go to Railway Dashboard → Your service → "Variables" tab
2. Add **ALL** required variables:
   - `OPENAI_API_KEY`
   - `GOOGLE_AI_API_KEY`
   - `JWT_SECRET`
   - etc.

---

### **Issue 4: Build Failures**

**Error:** Build fails with TypeScript errors

**Fixes:**
1. **Update build command:**
   ```bash
   cd server && npm install && npm run build
   ```

2. **Check TypeScript compilation locally:**
   ```bash
   cd server && npm run build
   ```

3. **Verify `dist/` folder is created** (this should be committed or built on Railway)

---

### **Issue 5: Routes Return 404**

**Error:** `/api/documents/project/.../stats` returns 404

**Cause:** Old code deployed, routes not registered

**Fixes:**
1. **Trigger manual redeploy:**
   - Railway Dashboard → "Deployments" → "Redeploy"

2. **Check git commit is pushed:**
   ```bash
   git push origin development
   ```

3. **Verify Railway is watching the right branch:**
   - Railway Dashboard → Settings → Deployment → Branch: `development`

---

## 📊 Complete Environment Variables List (Copy-Paste Ready)

```bash
# ============================================
# RAILWAY BACKEND ENVIRONMENT VARIABLES
# ============================================

# --- Server Configuration ---
NODE_ENV=production
PORT=5000

# --- Database (Choose ONE option) ---

# Option A: Railway Postgres (if using Railway's PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}
POSTGRES_URL=${{Postgres.POSTGRES_URL}}
DB_SSL=false

# Option B: External Supabase
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true&sslmode=require
POSTGRES_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true&sslmode=require
DB_HOST=db.[PROJECT-REF].supabase.co
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[YOUR-PASSWORD]
DB_SSL=true
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]

# --- Redis (Required) ---
REDIS_URL=${{Redis.REDIS_URL}}
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}

# --- Security & Authentication (CRITICAL) ---
JWT_SECRET=[GENERATE-32-CHAR-RANDOM-STRING]
JWT_REFRESH_SECRET=[GENERATE-32-CHAR-RANDOM-STRING]
ENCRYPTION_KEY=[GENERATE-32-CHAR-RANDOM-STRING]
ENCRYPTION_KEK=[GENERATE-32-CHAR-RANDOM-STRING]

# --- AI Providers (At least ONE required) ---
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...
DEEPSEEK_API_KEY=sk-...
MOONSHOT_API_KEY=sk-...

# --- Application Settings ---
FRONTEND_URL=https://adpa.vercel.app
LOG_LEVEL=info

# --- Optional: Third-Party Integrations ---
GITHUB_TOKEN=ghp_...
ADOBE_CLIENT_ID=...
ADOBE_CLIENT_SECRET=...
CONFLUENCE_CLIENT_ID=...
CONFLUENCE_CLIENT_SECRET=...
CONFLUENCE_CALLBACK_URL=https://adpa-production.up.railway.app/api/confluence/callback
SHAREPOINT_CLIENT_ID=...
SHAREPOINT_CLIENT_SECRET=...
SHAREPOINT_TENANT_ID=...
```

---

## 🔐 Security Key Generation

Generate secure random strings for JWT and encryption:

### **PowerShell (Windows):**

```powershell
# Generate JWT_SECRET
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))

# Generate JWT_REFRESH_SECRET
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))

# Generate ENCRYPTION_KEY
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))

# Generate ENCRYPTION_KEK
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))
```

### **Bash (Linux/Mac):**

```bash
# Generate all keys
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 32  # JWT_REFRESH_SECRET
openssl rand -base64 32  # ENCRYPTION_KEY
openssl rand -base64 32  # ENCRYPTION_KEK
```

---

## 🛠️ Railway CLI Setup (Recommended)

### **Install Railway CLI:**

```bash
npm install -g @railway/cli
```

### **Login & Link Project:**

```bash
railway login
railway link  # Select your ADPA project
```

### **Set Environment Variables:**

```bash
# Set individual variables
railway variables set JWT_SECRET="your-generated-secret"
railway variables set OPENAI_API_KEY="sk-..."
railway variables set REDIS_URL="\${{Redis.REDIS_URL}}"

# Or bulk upload from file
railway variables set --file .env.production
```

### **View Current Variables:**

```bash
railway variables
```

### **Run Commands on Railway:**

```bash
# Run migrations
railway run psql \$DATABASE_URL -f server/migrations/001_initial_schema.sql

# Check logs
railway logs

# Restart service
railway up
```

---

## 📦 Deployment Configuration

### **railway.toml** (Current Configuration)

```toml
[build]
builder = "NIXPACKS"
buildCommand = "cd server && npm install"

[deploy]
startCommand = "cd server && npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[deploy.healthcheck]]
path = "/health"
timeout = 30
interval = 10
```

### **Recommended Updates:**

```toml
[build]
builder = "NIXPACKS"
buildCommand = "cd server && npm install && npm run build"

[deploy]
startCommand = "cd server && npm run migrate:prod && npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[deploy.healthcheck]]
path = "/health"
timeout = 30
interval = 10

[deploy.env]
NODE_ENV = "production"
```

---

## 🗄️ Database Migration Strategy

### **Option 1: Manual Migration (Current)**

Run migrations manually after deployment:

```bash
railway run psql \$DATABASE_URL -f server/migrations/001_initial_schema.sql
# ... run each migration file
```

### **Option 2: Automated Migration (Recommended)**

Create `server/scripts/run-migrations-prod.ts`:

```typescript
import { Pool } from 'pg'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
})

async function runMigrations() {
  const migrationsDir = join(__dirname, '../migrations')
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    console.log(`Running migration: ${file}`)
    const sql = readFileSync(join(migrationsDir, file), 'utf-8')
    await pool.query(sql)
    console.log(`✅ ${file} completed`)
  }

  await pool.end()
  console.log('✅ All migrations completed')
}

runMigrations().catch(err => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
```

Add to `package.json`:

```json
{
  "scripts": {
    "migrate:prod": "tsx scripts/run-migrations-prod.ts",
    "start": "npm run migrate:prod && node dist/server.js"
  }
}
```

---

## ✅ Post-Deployment Verification

### **1. Check Deployment Status**

```bash
railway status
```

### **2. Test Health Endpoint**

```bash
curl https://adpa-production.up.railway.app/health
```

### **3. Test Database Connection**

```bash
railway run psql \$DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

### **4. Test Redis Connection**

```bash
railway run redis-cli -u \$REDIS_URL ping
```

### **5. Test AI Generation**

```bash
curl -X POST https://adpa-production.up.railway.app/api/ai/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "prompt": "Test prompt",
    "provider": "Google Gemini",
    "model": "gemini-2.5-flash",
    "temperature": 0.7
  }'
```

---

## 📊 Monitoring & Logs

### **View Live Logs:**

```bash
railway logs --follow
```

### **View Specific Service Logs:**

```bash
railway logs --service backend --follow
```

### **Common Log Patterns to Monitor:**

✅ **Success:**
```
✅ Server running on port 5000
✅ Redis connected successfully
✅ Database connected
```

❌ **Errors:**
```
❌ DATABASE_URL connection error: ETIMEDOUT
❌ Redis connection failed
error: Cannot read properties of null (reading 'query')
```

---

## 🔄 Redeployment Process

### **Trigger Redeploy:**

**Option 1: Git Push**
```bash
git push origin development
```

**Option 2: Railway Dashboard**
- Go to "Deployments" tab
- Click "Redeploy" on latest deployment

**Option 3: Railway CLI**
```bash
railway up
```

---

## 🚨 Current Known Issues (Production)

Based on your error logs:

### **1. Document Stats Route 404**

**URL:** `/api/documents/project/:projectId/stats`  
**Status:** Route exists in code, needs Railway to redeploy  
**Action:** Wait for Railway deployment to complete

### **2. AI Generation 500 Error**

**URL:** `/api/ai/generate`  
**Likely Cause:** Redis not connected OR missing AI provider keys  
**Action:** Check Railway environment variables:
- `REDIS_URL` - Must be set
- `OPENAI_API_KEY` or `GOOGLE_AI_API_KEY` - At least one required

### **3. Analytics System 500 Error** ✅ FIXED

**Status:** Fixed in latest code (graceful degradation)  
**Action:** Deploy latest code

---

## 📝 Railway Configuration Checklist

Copy this to verify your setup:

```
RAILWAY PROJECT: ADPA Backend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Services:
  ☐ PostgreSQL (Railway or Supabase)
  ☐ Redis
  ☐ Backend Web Service

Environment Variables (Backend Service):
  Database:
    ☐ DATABASE_URL
    ☐ POSTGRES_URL
    ☐ DB_SSL
  
  Redis:
    ☐ REDIS_URL
    ☐ REDIS_HOST
    ☐ REDIS_PORT
  
  Security:
    ☐ JWT_SECRET (32+ chars)
    ☐ JWT_REFRESH_SECRET (32+ chars)
    ☐ ENCRYPTION_KEY (32+ chars)
    ☐ ENCRYPTION_KEK (32+ chars)
  
  AI Providers (At least ONE):
    ☐ OPENAI_API_KEY
    ☐ GOOGLE_AI_API_KEY
    ☐ ANTHROPIC_API_KEY
    ☐ MISTRAL_API_KEY
  
  Application:
    ☐ NODE_ENV=production
    ☐ PORT=5000
    ☐ FRONTEND_URL=https://adpa.vercel.app
    ☐ LOG_LEVEL=info

Build Settings:
  ☐ Builder: NIXPACKS
  ☐ Build Command: cd server && npm install && npm run build
  ☐ Start Command: cd server && npm start
  ☐ Root Directory: / (repo root)

Health Check:
  ☐ Path: /health
  ☐ Timeout: 30s
  ☐ Interval: 10s

Deployment:
  ☐ Branch: development
  ☐ Auto-deploy: Enabled
  ☐ Migrations: Run before startup

Post-Deploy Verification:
  ☐ Health endpoint returns 200
  ☐ Database queries work
  ☐ Redis ping responds
  ☐ AI generation works
  ☐ No 500 errors in frontend console
```

---

## 🆘 Getting Help

### **Check Railway Logs:**

```bash
railway logs --service backend --tail 100
```

### **Common Error Messages:**

| Error | Meaning | Fix |
|-------|---------|-----|
| `ETIMEDOUT` | Can't reach database | Check DATABASE_URL, use pooler |
| `Cannot read properties of null` | Database pool is null | Database not connected |
| `Redis connection failed` | Redis not available | Check REDIS_URL, add Redis service |
| `Provider not found` | AI provider not configured | Add AI_PROVIDER_API_KEY |
| `404 Not Found` | Route not deployed | Redeploy with latest code |

---

## 📞 Support

**Documentation:** `/docs/deployment/`  
**Railway Docs:** https://docs.railway.app  
**Supabase Docs:** https://supabase.com/docs

---

## ✅ Success Criteria

Your Railway deployment is correctly configured when:

1. ✅ Health endpoint returns `{"status": "OK"}`
2. ✅ No database connection errors in logs
3. ✅ Redis connected successfully
4. ✅ AI providers initialized
5. ✅ All API routes return proper responses (200/401/403, not 404/500)
6. ✅ Document generation works end-to-end
7. ✅ WebSocket connections establish
8. ✅ Job queues process successfully

---

**Next Step:** Go to Railway Dashboard and verify/add the environment variables listed above. Start with the critical ones: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, and at least one `AI_PROVIDER_API_KEY`.

