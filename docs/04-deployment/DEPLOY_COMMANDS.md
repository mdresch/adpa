# 🚀 Quick Deploy Commands

Copy and paste these commands in order:

---

## 🔧 Backend Deployment (Railway)

```bash
# 1. Login to Railway
railway login

# 2. Initialize project
railway init

# 3. Set environment variables (UPDATE THESE!)
railway variables set DATABASE_URL="postgresql://neondb_owner:npg_2wXJF8j1rB7W@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require"

railway variables set JWT_SECRET="adpa-secret-key-change-in-production-2025"

railway variables set REDIS_URL="redis://localhost:6379"

railway variables set NODE_ENV="production"

railway variables set PORT="5000"

railway variables set FRONTEND_URL="http://localhost:3000"

# 4. Deploy backend
cd server
railway up

# 5. Get backend URL
railway domain
# Save this URL! You'll need it for Vercel

# 6. Generate custom domain (optional)
railway domain
```

---

## 🎨 Frontend Deployment (Vercel)

```bash
# 1. Go back to project root
cd ..

# 2. Login to Vercel
vercel login

# 3. Link project
vercel link

# 4. Set backend URL (use URL from railway domain command)
vercel env add NEXT_PUBLIC_API_URL production
# When prompted, enter: https://your-app.up.railway.app

# 5. Deploy frontend
vercel --prod

# 6. Get frontend URL
vercel domains ls
# Save this URL!
```

---

## 🔄 Update Backend with Frontend URL

```bash
# After getting Vercel URL, update Railway
cd server
railway variables set FRONTEND_URL="https://your-app.vercel.app"

# Redeploy backend
railway up
```

---

## 🧪 Test Deployments

```bash
# Test backend
curl https://your-app.up.railway.app/health

# Test frontend (open in browser)
# https://your-app.vercel.app

# Check Railway logs
railway logs

# Check Vercel logs
vercel logs
```

---

## 📊 Status Commands

```bash
# Railway
railway status
railway logs
railway variables

# Vercel
vercel ls
vercel logs
vercel env ls
```

---

## 🔴 Rollback Commands (if needed)

```bash
# Railway
railway rollback

# Vercel
vercel rollback
```

---

## 🌐 Upstash Redis Setup (Recommended)

1. Visit: https://console.upstash.com
2. Sign in with GitHub
3. Create Database:
   - Name: `adpa-redis`
   - Region: **US West** (same as Neon)
4. Copy Redis URL
5. Update Railway:

```bash
railway variables set REDIS_URL="rediss://default:password@us1-xxxxx.upstash.io:6379"
railway up
```

---

## ✅ Quick Verification

After deployment:

1. ✅ Backend health: `curl https://your-app.up.railway.app/health`
2. ✅ Frontend loads: Open `https://your-app.vercel.app`
3. ✅ Login works: Test login page
4. ✅ Process Flow: Navigate to `/process-flow`
5. ✅ Template tokens: Check "Template Base" shows tokens (not 0!)

---

## 🆘 Troubleshooting

### Backend Build Fails
```bash
# Check logs
railway logs --build

# Verify package.json scripts
cat server/package.json | grep -A 3 scripts
```

### Frontend Build Fails
```bash
# Check build logs
vercel logs

# Try local build first
npm run build
```

### Can't Connect
- Verify environment variables are set
- Check CORS settings (FRONTEND_URL in Railway)
- Verify database connection string
- Check Redis URL format

---

Start with: `railway login` 🚀

