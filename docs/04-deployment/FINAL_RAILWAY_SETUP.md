# 🚂 Final Railway Setup - Root Directory Configuration

## ⚠️ Current Issue

Backend is not responding because Railway is trying to deploy from the project root instead of the `server/` directory.

---

## ✅ Solution: Configure Root Directory in Railway Dashboard

### Step-by-Step Instructions:

1. **Open Railway Project**:
   https://railway.com/project/2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3

2. **Click on your "ADPA" service** (in the service list)

3. **Click "Settings" tab** (top navigation)

4. **Scroll down to "Build"** section

5. **Set these values**:

   ```
   Root Directory: server
   ```
   
   **Watch Paths** (optional):
   ```
   server/**
   ```

6. **Scroll to "Deploy"** section:
   
   **Start Command**:
   ```
   npm start
   ```
   
   **Build Command** (leave empty or set to):
   ```
   npm install
   ```

7. **Click the "Deploy" button** at the top right

Railway will now:
- ✅ Build from `server/package.json`
- ✅ Install all dependencies
- ✅ Start with `npm start` (using tsx)
- ✅ Backend will be live!

---

## 🧪 After Railway Deploys

Test the backend:

```bash
curl https://adpa-production.up.railway.app/health
```

Should return:
```json
{
  "status": "OK",
  "timestamp": "2025-10-14T...",
  "version": "2.0.0"
}
```

---

## 📊 Complete Deployment Checklist

- [x] Frontend deployed to Vercel → https://adpa.vercel.app
- [x] Backend URL set in Vercel → `NEXT_PUBLIC_API_URL=https://adpa-production.up.railway.app`
- [x] Frontend URL set in Railway → `FRONTEND_URL=https://adpa.vercel.app`
- [x] All environment variables configured
- [x] Neon PostgreSQL connected
- [x] Vercel KV (Redis) integrated
- [ ] **Railway root directory set to `server`** ← DO THIS NOW
- [ ] Test backend health endpoint
- [ ] Test frontend login and process flow

---

## 🎯 Once Backend is Live

Visit your frontend:
https://adpa.vercel.app

Then:
1. Click **Login** or **Demo Login**
2. Navigate to **Process Flow Workflow**
3. Select a template and project
4. Verify **Template Base** shows token count (not 0!)
5. Click **Start Processing** to test the full workflow

---

## Quick Reference

**Frontend**: https://adpa.vercel.app  
**Backend**: https://adpa-production.up.railway.app  
**Railway Dashboard**: https://railway.com/project/2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3  
**Vercel Dashboard**: https://vercel.com/menno-dreschers-projects/adpa

---

**Do this now**: Configure root directory in Railway → Settings → Build → Root Directory = `server` → Deploy

