# Railway Database Connection Fix

## Problem
Railway backend is connecting to the **wrong database** (probably old Neon or Railway's own Postgres instead of Supabase).

---

## ✅ Solution: Update Railway Environment Variables

### **Step 1: Go to Railway Dashboard**

1. Visit: https://railway.app/dashboard
2. Click your **backend service** (the Express API server)
3. Go to **"Variables"** tab

---

### **Step 2: Check Current DATABASE_URL**

Look for these variables:
- `DATABASE_URL`
- `POSTGRES_URL`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

**Problem indicators:**
- ❌ URL contains `neon.tech` (old Neon database)
- ❌ URL contains `railway.app` (Railway's own Postgres)
- ❌ URL doesn't contain your Supabase project reference

---

### **Step 3: Get Correct Supabase Connection String**

From your Supabase dashboard:

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/database
2. Find **"Connection string"** section
3. Select **"URI"** tab
4. Copy the connection string (looks like):
   ```
   postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
   ```
5. **Replace `[YOUR-PASSWORD]`** with your actual database password

**Example correct Supabase URL:**
```
postgresql://postgres.abcdefghijklmnop:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require
```

---

### **Step 4: Update Railway Variables**

In Railway, **update or add** these variables:

#### **Required:**

```bash
DATABASE_URL = postgresql://postgres.YOUR_REF:[PASSWORD]@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require

POSTGRES_URL = postgresql://postgres.YOUR_REF:[PASSWORD]@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require
```

#### **Alternative (if using separate components):**

```bash
DB_HOST = aws-0-us-west-1.pooler.supabase.com
DB_PORT = 6543
DB_NAME = postgres
DB_USER = postgres.YOUR_PROJECT_REF
DB_PASSWORD = your_actual_password
DB_SSL = true
```

#### **Also update Supabase-specific vars:**

```bash
SUPABASE_URL = https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY = your_anon_key
SUPABASE_SERVICE_ROLE_KEY = your_service_role_key
```

#### **And ensure JWT_SECRET is set:**

```bash
JWT_SECRET = adpa-secret-key-change-in-production-2025
```

**Note:** This MUST match the JWT_SECRET in Vercel (frontend) for authentication to work.

---

### **Step 5: Important SSL Settings**

Supabase requires SSL. Make sure your connection string has:
```
?sslmode=require
```

Or set separately:
```bash
DB_SSL = true
```

---

### **Step 6: Remove Old Variables (if present)**

**Remove these if they exist** (they point to old databases):

- Any URL containing `neon.tech`
- Any URL containing `railway.internal` or `railway.app`
- Old `NEON_DATABASE_URL`
- Old pooling configurations

---

### **Step 7: Trigger Redeploy**

After updating variables:

1. Railway will automatically redeploy
2. Watch the deployment logs
3. Look for successful database connection messages

Or manually trigger:
```bash
# In your local repo
git commit --allow-empty -m "trigger: redeploy with Supabase connection"
git push railway main  # or your railway branch
```

---

## 🧪 Verify Connection

### **Check Railway Logs:**

1. Go to Railway dashboard → your backend service
2. Click "Deployments" tab
3. Click latest deployment
4. Check logs for:
   ```
   ✅ Database connected successfully
   ✅ Pool created with host: aws-0-*.pooler.supabase.com
   ```

### **Error indicators:**

```
❌ connection refused to postgresql://postgres@localhost:5432
❌ ECONNREFUSED
❌ password authentication failed
❌ SSL connection required
```

---

## 🔍 Test Database Connection

Once deployed, test the connection:

### **Method 1: Health Check Endpoint**

Visit: `https://your-backend.railway.app/health`

Should return:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected"
}
```

### **Method 2: Railway Terminal**

1. In Railway dashboard, click your backend service
2. Click "..." → "Open Shell"
3. Run:
   ```bash
   echo $DATABASE_URL
   # Should show Supabase URL
   
   # Test connection
   node -e "const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});p.query('SELECT NOW()').then(r=>console.log('✅ Connected:',r.rows[0])).catch(e=>console.error('❌ Error:',e.message))"
   ```

---

## 🎯 Quick Copy-Paste Template

Replace `YOUR_PROJECT_REF`, `YOUR_PASSWORD`, and `REGION`:

```bash
# Add these to Railway:

DATABASE_URL=postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require

POSTGRES_URL=postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require

SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co

SUPABASE_ANON_KEY=your_anon_key_from_supabase_dashboard

SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_supabase_dashboard

JWT_SECRET=adpa-secret-key-change-in-production-2025

DB_SSL=true
```

---

## 🆘 Still Not Working?

### **Check 1: Password Special Characters**

If your password has special characters (e.g., `#`, `@`, `%`), you need to URL-encode them:
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`

Example:
```
Password: my#pass@word
Encoded:  my%23pass%40word
```

### **Check 2: Correct Pooler Port**

Supabase uses:
- **Port 6543** for connection pooler (PgBouncer) - **USE THIS for Railway**
- Port 5432 for direct connections (not recommended for serverless)

Make sure your URL has `:6543`

### **Check 3: Check Supabase Project Status**

1. Go to Supabase dashboard
2. Check if project is "Active" (not paused)
3. Check if database is running

### **Check 4: Firewall / IP Restrictions**

1. In Supabase, go to "Database" → "Settings"
2. Check "Connection pooling" is enabled
3. Check "Restrict connections" - should allow Railway's IPs or be disabled

---

## 📝 Expected Railway Logs After Fix

After redeployment with correct Supabase URL, you should see:

```
✅ Starting ADPA backend server...
✅ Database connection pool created
✅ Connected to Supabase PostgreSQL
✅ Redis connection established
✅ Server listening on port 5000
✅ Health: /health endpoint ready
```

---

## Next Steps After Fixing Railway

Once Railway backend connects to Supabase:

1. ✅ Update `NEXT_PUBLIC_API_URL` in Vercel to point to Railway backend URL
2. ✅ Ensure `JWT_SECRET` matches between Railway and Vercel
3. ✅ Test frontend → backend → database flow
4. ✅ Run database migrations if needed:
   ```bash
   # In Railway shell or locally pointing to Supabase
   psql $DATABASE_URL -f server/migrations/XXX_migration.sql
   ```

---

Would you like me to:
1. Show you how to check your current Railway database URL?
2. Generate the exact connection string for your Supabase project?
3. Create a script to test the connection locally?

