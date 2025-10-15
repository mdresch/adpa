# 🚂 Connect to Existing Railway Project

Your Railway Project: https://railway.com/project/2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3

## Quick Setup for Existing Project

### Option 1: Link via CLI (Recommended)

```bash
# 1. Login to Railway
railway login
# Press Y to open browser and authenticate

# 2. Link to your existing project
railway link 2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3

# 3. Set environment variables
cd server

railway variables set DATABASE_URL="postgresql://neondb_owner:npg_2wXJF8j1rB7W@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require"

railway variables set JWT_SECRET="adpa-secret-key-change-in-production-2025"

railway variables set REDIS_URL="redis://localhost:6379"

railway variables set NODE_ENV="production"

railway variables set PORT="5000"

railway variables set FRONTEND_URL="http://localhost:3000"

# 4. Deploy
railway up
```

### Option 2: Connect via GitHub

1. Push your code to GitHub:
```bash
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

2. In Railway Dashboard:
   - Go to https://railway.com/project/2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3
   - Click **New** → **GitHub Repo**
   - Select your repository
   - Set root directory: `server`
   - Railway will auto-deploy on every push!

### Option 3: Manual via Railway Dashboard

1. Go to your project: https://railway.com/project/2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3
2. Click **Variables** tab
3. Add environment variables:
   - `DATABASE_URL`: Your Neon PostgreSQL URL
   - `JWT_SECRET`: Your secret key
   - `REDIS_URL`: Redis connection string
   - `NODE_ENV`: production
   - `PORT`: 5000
   - `FRONTEND_URL`: Your Vercel URL (will update later)
4. Click **Settings** → **Service**
5. Set:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
6. Deploy manually or connect GitHub

## Environment Variables Needed

```env
DATABASE_URL=postgresql://neondb_owner:npg_2wXJF8j1rB7W@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require
JWT_SECRET=adpa-secret-key-change-in-production-2025
REDIS_URL=redis://localhost:6379
NODE_ENV=production
PORT=5000
FRONTEND_URL=http://localhost:3000
```

## Get Your Backend URL

After deployment:
```bash
railway domain
```

Or visit: https://railway.com/project/2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3/service

Your backend will be available at something like:
`https://adpa-backend-production.up.railway.app`

## Next Steps

1. ✅ Complete Railway login
2. ✅ Link local project to Railway
3. ✅ Set environment variables
4. ✅ Deploy backend
5. ✅ Get backend URL
6. ⏩ Continue with Vercel frontend deployment

## Quick Command Reference

```bash
# Link to existing project
railway link 2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3

# Deploy
cd server
railway up

# View logs
railway logs

# Get domain
railway domain

# Check status
railway status

# Open in browser
railway open
```

Ready to continue? Press **Y** when prompted to login to Railway!

