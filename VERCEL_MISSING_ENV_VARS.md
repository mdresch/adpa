# Vercel Environment Variables Status

## 🎯 Quick Summary

**✅ Already configured by Supabase & Upstash:** 14+ variables  
**⚠️ You need to add manually:** Only **2 variables**

1. `NEXT_PUBLIC_API_URL` → Railway backend URL
2. `JWT_SECRET` → `3f8a2b1c-4e5d-6f7a-8b9c-0d1e2f3a4b5c`

Everything else (AI keys, integrations) is stored in the database!

---

## ✅ Already Set (by Integrations)

These are automatically configured and **don't need manual setup**:

### **Supabase (Database)**
```
✅ POSTGRES_URL                      (all envs)
✅ POSTGRES_PRISMA_URL               (prod/preview/dev)
✅ POSTGRES_URL_NON_POOLING          (prod/preview/dev)
✅ POSTGRES_HOST                     (all envs)
✅ POSTGRES_USER                     (all envs)
✅ POSTGRES_PASSWORD                 (all envs)
✅ POSTGRES_DATABASE                 (all envs)
✅ SUPABASE_URL                      (all envs)
✅ SUPABASE_ANON_KEY                 (all envs)
✅ SUPABASE_SERVICE_ROLE_KEY         (prod/preview)
✅ SUPABASE_JWT_SECRET               (prod/preview)
✅ NEXT_PUBLIC_SUPABASE_URL          (all envs)
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY     (all envs)
```

### **Upstash (Redis/KV)**
```
✅ ADPA_KV_URL                       (from Upstash integration)
✅ KV_REST_API_URL                   (probably also set by Upstash)
✅ KV_REST_API_TOKEN                 (probably also set by Upstash)
```

**Note:** The app uses `@vercel/kv` which automatically reads `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
If Upstash set these, **you're all good** - no action needed for Redis!

**Check in Vercel dashboard if you have:**
- `KV_REST_API_URL` ✅
- `KV_REST_API_TOKEN` ✅

If you only have `ADPA_KV_URL` (legacy format), you may need to add the REST API vars.

---

## ⚠️ REQUIRED - Must Add Manually to Vercel

### **Critical (Only 2 variables needed!):**

1. **NEXT_PUBLIC_API_URL**
   - Value: `https://your-railway-backend.up.railway.app` (see Railway dashboard)
   - Environment: **Production, Preview, Development**
   - Used by: Frontend to connect to Express backend
   - **Action:** Get Railway backend URL from Railway → Settings → Domains

2. **JWT_SECRET**
   - Value: `3f8a2b1c-4e5d-6f7a-8b9c-0d1e2f3a4b5c`
   - Environment: **Production, Preview, Development**
   - Used by: App authentication (different from Supabase JWT)
   - **⚠️ CRITICAL**: Must match Railway backend **exactly**

### **Optional (for advanced features):**

6. **GITHUB_TOKEN** (for GitHub integration, if using)
   - Value: `ghp_...`
   - Environment: Production, Preview

**Note:** The following are stored in the database via their respective integration UIs, **not as environment variables**:
- ✅ AI API keys (OpenAI, Google AI, Anthropic) → via AI Providers page
- ✅ Confluence credentials → via Integrations page
- ✅ SharePoint credentials → via Integrations page  
- ✅ Adobe PDF Services credentials → via Integrations page

---

## 🚀 How to Add Missing Variables to Vercel

### Method 1: Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/your-team/adpa/settings/environment-variables
2. For each missing variable above:
   - Click **"Add New"**
   - **Key**: Variable name (e.g., `NEXT_PUBLIC_API_URL`)
   - **Value**: The actual value
   - **Environments**: Select Production, Preview, and Development
   - Click **"Save"**

### Method 2: Vercel CLI

```bash
# Add to all environments
vercel env add NEXT_PUBLIC_API_URL

# Or specify environment
vercel env add NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_API_URL preview
vercel env add NEXT_PUBLIC_API_URL development
```

### Method 3: Pull from Local .env (bulk import)

```bash
# If you have .env.local with all variables
vercel env pull .env.vercel.local  # Pull current
vercel env push .env.local          # Push your local vars
```

---

## 🔍 Quick Checks Before Deployment

### **Check 1: Do you have Redis REST API vars?**

In Vercel dashboard, verify you have:
- ✅ `KV_REST_API_URL` 
- ✅ `KV_REST_API_TOKEN`

If you only see `ADPA_KV_URL`, you'll need to:
1. Go to Upstash dashboard: https://console.upstash.com/
2. Click your database
3. Find "REST API" section
4. Copy `UPSTASH_REDIS_REST_URL` → add as `KV_REST_API_URL` to Vercel
5. Copy `UPSTASH_REDIS_REST_TOKEN` → add as `KV_REST_API_TOKEN` to Vercel

### **Check 2: What's Your Railway Backend URL?**

Your Railway backend should be deployed at a URL like:
- `https://adpa-production.up.railway.app`
- `https://adpa-backend-production.up.railway.app`

To find it:
1. Go to Railway dashboard: https://railway.app/dashboard
2. Click your backend service
3. Go to "Settings" → "Domains"
4. Copy the `.up.railway.app` URL

Then set in Vercel:
```
NEXT_PUBLIC_API_URL = https://your-backend.up.railway.app
```

### **Check 3: What's Your JWT Secret?**

Your JWT secret should be the **same in both Railway (backend) and Vercel (frontend)**.

To find it in Railway:
1. Go to Railway dashboard
2. Click backend service
3. Go to "Variables" tab
4. Find `JWT_SECRET`
5. Copy the exact value to Vercel

**⚠️ CRITICAL**: Frontend and backend MUST use the same JWT_SECRET or auth will fail!

---

## ⚡ After Adding Variables

1. Trigger a new deployment:
   ```bash
   git commit --allow-empty -m "trigger: redeploy with env vars"
   git push origin development
   ```

2. Or use Vercel dashboard:
   - Go to "Deployments" tab
   - Click "Redeploy" on latest deployment

---

## 🧪 Verify Setup

After redeployment, check:
1. Frontend build succeeds ✅
2. Frontend can connect to backend ✅
3. Database queries work ✅
4. AI generation works ✅

Check browser console for errors:
```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)
```

---

## 📝 Current Deployment Error

Based on your earlier logs, the deployment fails at the `git diff` command in `vercel.json`. 

**Solution**: The `vercel.json` fix has already been committed. Just need to:
1. Push the commit to GitHub
2. Add the missing env vars above
3. Trigger a redeploy

---

## Priority Order

**Do these first (critical):**
1. ✅ Add `NEXT_PUBLIC_API_URL` pointing to Railway backend
2. ✅ Add `JWT_SECRET` (same as Railway backend)
3. ✅ Push the `vercel.json` fix to GitHub
4. ✅ Trigger redeploy

**Then add (for full functionality):**
5. Add AI API keys (OpenAI, Google AI, etc.)
6. Add integration keys (GitHub, Confluence, etc.) if using those features

---

Would you like me to:
1. Generate a script to bulk-add these to Vercel CLI?
2. Help you find your Railway backend URL?
3. Test the local build with Vercel's build command?

