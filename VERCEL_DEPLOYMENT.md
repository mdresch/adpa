# 🚀 Vercel Deployment Guide for ADPA

## Prerequisites

1. ✅ Vercel CLI installed (`vercel --version` shows 48.1.6)
2. ⏳ Vercel account login required

## Deployment Steps

### 1. Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate via the browser.

### 2. Set Environment Variables

Before deploying, you need to configure environment variables in Vercel:

```bash
# Set backend API URL (update with your actual backend URL)
vercel env add NEXT_PUBLIC_API_URL

# Set other required environment variables
vercel env add DATABASE_URL
vercel env add REDIS_URL
vercel env add JWT_SECRET
```

**Important Environment Variables:**
- `NEXT_PUBLIC_API_URL` - Your backend API URL (e.g., `https://adpa-backend.railway.app` or `https://your-backend.onrender.com`)
- `DATABASE_URL` - Neon PostgreSQL connection string (already have this)
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT token signing

### 3. Deploy to Vercel

For **production** deployment:
```bash
vercel --prod
```

For **preview** deployment (staging):
```bash
vercel
```

### 4. Post-Deployment Configuration

After deployment, you need to:

1. **Update API URL**: In your Vercel project settings, set the `NEXT_PUBLIC_API_URL` environment variable to point to your backend
2. **CORS Configuration**: Update your backend's CORS settings to allow requests from your Vercel domain:
   ```javascript
   // In server/src/server.ts
   origin: process.env.FRONTEND_URL || "https://your-app.vercel.app"
   ```

## Important Notes

### Frontend-Only Deployment

This deployment **only deploys the Next.js frontend**. Your backend needs to be deployed separately to:
- **Railway** (recommended for Node.js)
- **Render**
- **Heroku**
- **DigitalOcean App Platform**
- Or keep it running on your own server

### Backend Deployment Options

For the backend (`server/` directory), consider:

1. **Railway** (easiest):
   ```bash
   cd server
   railway init
   railway up
   ```

2. **Render** (free tier):
   - Connect your GitHub repo
   - Select `server` as the root directory
   - Set build command: `npm install && npm run build`
   - Set start command: `npm start`

3. **Docker** (for any platform):
   ```bash
   docker build -t adpa-backend -f Dockerfile.backend .
   docker push your-registry/adpa-backend
   ```

### Database & Redis

Your current setup uses:
- ✅ **Neon PostgreSQL** (already cloud-hosted, serverless)
- ⚠️ **Redis** (currently localhost:6379)

For production Redis, use:
- **Upstash** (serverless Redis, free tier)
- **Redis Labs**
- **Railway Redis**

## Quick Deploy Commands

### Option 1: Interactive Deployment
```bash
vercel
```

### Option 2: Production Deployment
```bash
vercel --prod
```

### Option 3: Deploy with Specific Settings
```bash
vercel --prod --confirm --name adpa-frontend
```

## Vercel Project Settings

After first deployment, configure in Vercel Dashboard:

1. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL` → Your backend URL
   
2. **Build Settings**:
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

3. **Domains**:
   - Configure custom domain if needed
   - Default: `your-project.vercel.app`

## Troubleshooting

### Build Errors

If build fails, check:
1. All dependencies are in `package.json`
2. Environment variables are set
3. TypeScript compilation succeeds locally: `npm run build`

### API Connection Issues

If frontend can't connect to backend:
1. Verify `NEXT_PUBLIC_API_URL` is set correctly
2. Check backend CORS settings allow your Vercel domain
3. Ensure backend is running and accessible

### 401 Unauthorized Errors

This means authentication is working - users need to login at `/login`

## Next Steps After Deployment

1. ✅ Test the deployment
2. ⚠️ Deploy backend to production
3. ✅ Update `NEXT_PUBLIC_API_URL` to point to production backend
4. ✅ Configure custom domain (optional)
5. ✅ Set up CI/CD with GitHub integration

## Current Status

- ✅ Frontend build succeeds locally (all 119 errors fixed!)
- ✅ Backend running locally on port 5000
- ✅ Database: Neon PostgreSQL (production-ready)
- ⚠️ Redis: localhost (needs production solution)
- ⚠️ Backend: localhost (needs deployment)

Would you like help deploying the backend as well?

