# Vercel Environment Variables - Production Setup

**Date**: October 21, 2025
**Backend URL**: https://adpa-production.up.railway.app/
**Backend Status**: ✅ Running (200 OK)

## Required Environment Variables

Add these to your Vercel project settings:

### 1. Backend API Connection
```bash
NEXT_PUBLIC_API_URL=https://adpa-production.up.railway.app
NEXT_PUBLIC_WS_URL=https://adpa-production.up.railway.app
```

### 2. Supabase Configuration
```bash
# Get these from your Supabase project dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Database URLs (from Supabase)
POSTGRES_URL=postgresql://postgres:[PASSWORD]@db.your-project-ref.supabase.co:5432/postgres?sslmode=require
POSTGRES_PRISMA_URL=postgresql://postgres:[PASSWORD]@db.your-project-ref.supabase.co:6543/postgres?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgresql://postgres:[PASSWORD]@db.your-project-ref.supabase.co:5432/postgres
```

### 3. Redis/KV Configuration
```bash
# Vercel KV or Upstash Redis
KV_URL=redis://default:[PASSWORD]@natural-vulture-7034.upstash.io:6379
KV_REST_API_URL=https://natural-vulture-7034.upstash.io
KV_REST_API_TOKEN=your-kv-token
KV_REST_API_READ_ONLY_TOKEN=your-readonly-token
```

### 4. Authentication
```bash
# Must match the JWT_SECRET in your Railway backend
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long
```

### 5. Analytics (Optional)
```bash
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your-analytics-id
```

## How to Add Environment Variables in Vercel

### Option 1: Via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your ADPA project
3. Go to **Settings** → **Environment Variables**
4. Add each variable above
5. Select environment: **Production**, **Preview**, **Development**
6. Click **Save**

### Option 2: Via Vercel CLI
```bash
# Set a single environment variable
vercel env add NEXT_PUBLIC_API_URL

# When prompted:
# Value: https://adpa-production.up.railway.app
# Environment: Production, Preview, Development

# Or use the pull/import method
vercel env pull .env.production
```

## Verification Checklist

After adding environment variables:

- [ ] `NEXT_PUBLIC_API_URL` points to Railway backend
- [ ] Database URLs match your Supabase project
- [ ] Redis URLs are configured
- [ ] JWT_SECRET matches backend
- [ ] Redeploy triggered (automatic when env vars change)
- [ ] Test login at your Vercel URL
- [ ] Test API calls (check browser console)
- [ ] Verify WebSocket connection works

## Important Notes

⚠️ **Frontend-Backend Connection**:
- The hardcoded `http://localhost:5000` in `app/projects/[id]/page.tsx` (line 1762) needs to be changed to use `NEXT_PUBLIC_API_URL`
- This will be fixed in the next commit

⚠️ **Security**:
- Never commit `.env.production` to git
- Keep JWT_SECRET secure and matching across frontend/backend
- Rotate secrets before production use

## Testing After Deployment

1. Visit your Vercel deployment URL
2. Try logging in
3. Navigate to a project
4. Try generating a document
5. Check browser console for errors

## Current Status

✅ Frontend deployed to Vercel
✅ Backend running on Railway
⚠️ Environment variables need configuration
⚠️ Frontend code uses hardcoded localhost URL (needs fix)

