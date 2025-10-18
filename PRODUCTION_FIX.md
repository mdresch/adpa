# Production Login Fix - Environment Variable Issue

## Problem
The production frontend at `adpa-production.up.railway.app` is returning 404 errors for `/auth/login` because the `NEXT_PUBLIC_API_URL` environment variable is not configured correctly in Vercel.

**Error:**
```
Failed to load resource: the server responded with a status of 404 ()
API request failed: /auth/login SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

This means the frontend is getting an HTML 404 page instead of the backend API response.

## Root Cause
1. The `NEXT_PUBLIC_API_URL` environment variable is either:
   - Not set in Vercel production environment, OR
   - Set incorrectly (missing `/api` suffix)

2. Without this variable, the frontend API client falls back to `http://localhost:5000/api`, which doesn't work in production

3. The backend expects all API calls at `/api/*` (e.g., `/api/auth/login`)

## Solution

### Step 1: Set Environment Variable in Vercel

Run these commands to set the production environment variable:

```powershell
# Set the production API URL
vercel env add NEXT_PUBLIC_API_URL production
# When prompted, enter: https://adpa-production.up.railway.app/api

# Verify it's set
vercel env ls
```

### Step 2: Redeploy Frontend

After setting the environment variable, redeploy:

```powershell
# Trigger a new production deployment
vercel --prod
```

### Step 3: Verify in Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Select your ADPA project
3. Go to **Settings** → **Environment Variables**
4. Verify `NEXT_PUBLIC_API_URL` exists with value: `https://adpa-production.up.railway.app/api`
5. Ensure it's enabled for **Production** environment

### Alternative: Quick Fix via Vercel CLI

```powershell
# Remove any existing incorrect value
vercel env rm NEXT_PUBLIC_API_URL production --yes

# Add the correct value
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://adpa-production.up.railway.app/api

# Force redeploy
vercel --prod --force
```

## Expected Behavior After Fix

Once fixed, the frontend will:
1. Use `https://adpa-production.up.railway.app/api` as the base URL
2. Call `https://adpa-production.up.railway.app/api/auth/login` for login
3. Receive proper JSON responses instead of HTML 404 errors

## Testing After Deployment

1. Open browser console at: `https://adpa-production.up.railway.app/auth/login`
2. Check Network tab when logging in
3. Verify the API request goes to: `https://adpa-production.up.railway.app/api/auth/login`
4. Should receive JSON response with `user` and `token` fields

## Current Architecture

```
Frontend (Vercel)                    Backend (Railway)
https://adpa-*.vercel.app     →      https://adpa-production.up.railway.app
  │                                    │
  ├─ /                                 ├─ /health
  ├─ /login                            ├─ /api/auth/login  ✅
  ├─ /projects                         ├─ /api/projects
  └─ /documents                        └─ /api/documents
```

## Prevention

To prevent this in the future:
1. Always set `NEXT_PUBLIC_API_URL` for new Vercel projects
2. Include `/api` suffix in the URL
3. Test with preview deployments before promoting to production
4. Add environment variable checks to CI/CD

## Additional Notes

- Environment variables starting with `NEXT_PUBLIC_` are embedded at build time
- Changing them requires a new deployment (not just a restart)
- The backend Railway URL is stable: `https://adpa-production.up.railway.app`
- CORS is already configured in backend to accept Vercel origins (server.ts lines 74-110)

## Quick Verification Commands

```powershell
# Check current environment variables
vercel env ls

# Pull current env to local .env.production.local (optional)
vercel env pull .env.production.local --environment=production

# Check if frontend is actually deployed
vercel list

# Check backend health
curl https://adpa-production.up.railway.app/health
```

## Backend Confirmation

The backend is correctly configured and running:
- ✅ Auth routes registered at `/api/auth` (server.ts:139)
- ✅ CORS allows Vercel origins (server.ts:74-110)
- ✅ Login endpoint exists at `/api/auth/login` (routes/auth.ts:125)
- ✅ Returns JSON with user and token (routes/auth.ts:176-186)

## Frontend Confirmation

The frontend API client is correctly implemented:
- ✅ API_BASE_URL uses `NEXT_PUBLIC_API_URL` (lib/api.ts:4)
- ✅ Login method calls `/auth/login` (lib/api.ts:241)
- ✅ Full URL becomes: `${API_BASE_URL}/auth/login`

**The only missing piece is the environment variable!**


