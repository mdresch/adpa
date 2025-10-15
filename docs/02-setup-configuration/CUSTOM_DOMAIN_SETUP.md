# 🌐 Custom Domain Setup: adpa.railway.app

## Your Custom Domain

✅ **Custom Domain**: `adpa.railway.app`
🔗 **Default Domain**: `adpa-production.up.railway.app`

---

## Setup Railway Custom Domain

### Via Railway Dashboard (Easiest)

1. **Open Railway Project**:
   https://railway.com/project/2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3

2. **Click on "ADPA" service**

3. **Go to Settings tab**

4. **Scroll to "Networking" section**

5. **Under "Domains"**:
   - Click **"+ Custom Domain"**
   - Enter: `adpa.railway.app`
   - Click **"Add Domain"**

6. **DNS Configuration**:
   Railway will show you CNAME records to add:
   ```
   CNAME: adpa.railway.app → your-service.up.railway.app
   ```

### Via Railway CLI

```bash
# Add custom domain
railway domain add adpa.railway.app

# Remove default domain (optional)
railway domain remove adpa-production.up.railway.app
```

---

## Update Vercel with New Backend URL

Once the custom domain is active:

### Option 1: Via Vercel Dashboard

1. Go to: https://vercel.com/menno-dreschers-projects/adpa/settings/environment-variables
2. Find `NEXT_PUBLIC_API_URL`
3. Click **Edit**
4. Change value to: `https://adpa.railway.app`
5. Save
6. Redeploy: `vercel --prod`

### Option 2: Via Vercel CLI

```bash
# Remove old value
vercel env rm NEXT_PUBLIC_API_URL production

# Add new value
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://adpa.railway.app

# Redeploy
vercel --prod
```

---

## Update Railway Backend CORS

Once you have your Vercel URL, update Railway:

```bash
railway variables --set "FRONTEND_URL=https://your-app.vercel.app"
```

---

## Complete URLs

### For Vercel Environment Variables

```env
NEXT_PUBLIC_API_URL=https://adpa.railway.app
```

### For Railway Environment Variables

```env
FRONTEND_URL=https://your-app.vercel.app
DATABASE_URL=postgresql://neondb_owner:...@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require
REDIS_URL=<your-upstash-redis-url>
JWT_SECRET=adpa-secret-key-change-in-production-2025
NODE_ENV=production
PORT=5000
```

---

## Verify Custom Domain

After setup:

```bash
# Test the custom domain
curl https://adpa.railway.app/health

# Should return:
# {"status":"OK","timestamp":"...","version":"2.0.0"}
```

---

## Quick Summary

✅ **Backend API**: `https://adpa.railway.app`  
✅ **Use this URL in**: Vercel's `NEXT_PUBLIC_API_URL`  
✅ **Frontend**: (Your Vercel URL)  
✅ **Use this URL in**: Railway's `FRONTEND_URL`

Clean and simple! 🎉

