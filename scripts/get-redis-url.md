# Get Your Redis URL for ADPA

## Your Current Setup

✅ **Provider:** Upstash Redis  
✅ **Host:** natural-vulture-7034.upstash.io  
✅ **Port:** 6379  
✅ **TLS:** Enabled (secure)

---

## 🔗 Get Full Redis URL

### Method 1: Railway Dashboard

1. Go to: https://railway.app/dashboard
2. Select your ADPA project
3. Click on your service (backend)
4. Go to **Variables** tab
5. Find `REDIS_URL` and click to reveal full value
6. Copy the complete string (format: `rediss://default:PASSWORD@natural-vulture-7034.upstash.io:6379`)

### Method 2: Upstash Console (Recommended)

1. Go to: https://console.upstash.com
2. Sign in (use same account as Railway if linked)
3. Select your Redis database (should be "natural-vulture-7034")
4. **Details** section shows connection strings:
   - **Redis Connect**: `rediss://default:YOUR_PASSWORD@natural-vulture-7034.upstash.io:6379`
   - **REST API**: `https://natural-vulture-7034.upstash.io`

**Copy the Redis Connect URL** (starts with `rediss://`)

---

## 📝 Update Your server/.env

Once you have the full Redis URL, add it to `server/.env`:

```env
# DATABASE (Supabase)
DATABASE_URL=postgresql://postgres:QueIQ4Klopman$@db.blxzjbxczpmmgiwbtmdo.supabase.co:5432/postgres

# REDIS (Upstash - get from Railway or Upstash console)
REDIS_URL=rediss://default:YOUR_PASSWORD@natural-vulture-7034.upstash.io:6379
REDIS_TLS=true

# SUPABASE
SUPABASE_URL=https://blxzjbxczpmmgiwbtmdo.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJseHpqYnhjenBtbWdpd2J0bWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjIwMzAsImV4cCI6MjA3NjQ5ODAzMH0.2U4c5wrUBAD6BM8yRwJcS0MwgcSEVpzfS3gXUeVtNYM

# SERVER
PORT=5000
NODE_ENV=development

# SECURITY
JWT_SECRET=adpa-secret-change-in-production
SESSION_SECRET=adpa-session-secret-change-in-production

# UPLOADS
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./uploads

# LOGGING
LOG_LEVEL=info
LOG_DIR=./logs
```

---

## ⚡ Temporary Workaround (If You Can't Find Redis URL)

**Use Redis from Railway variables directly:**

The backend already has logic to build from parts:

```env
# In server/.env
REDIS_HOST=natural-vulture-7034.upstash.io
REDIS_PORT=6379
REDIS_TLS=true

# Optional: Set password if you have it
# REDIS_PASSWORD=your_upstash_password
```

The backend will construct: `rediss://natural-vulture-7034.upstash.io:6379`

---

## 🔍 Alternative: Create NEW Upstash Redis (5 minutes)

**If you can't find the password:**

1. Go to https://console.upstash.com
2. Create new database:
   - Name: ADPA-Dev
   - Region: **US East** (match Supabase)
   - Type: **Regional** (free)
3. Copy connection string
4. Use in `server/.env`

**Upstash Free Tier:**
- ✅ 10,000 commands/day (plenty for development)
- ✅ 256 MB storage
- ✅ TLS enabled
- ✅ Global replication (optional)

---

## 🎯 Quick Action

**Try this in your Railway dashboard:**

1. https://railway.app/dashboard
2. Find ADPA project
3. Variables tab
4. Click on REDIS_URL value (might need to click eye icon to reveal)
5. Copy entire string starting with `rediss://`

**Then update server/.env with that full URL!**

---

Need me to create a new Upstash Redis for you? Just say "create new Redis" and I'll guide you through the 5-minute setup!

