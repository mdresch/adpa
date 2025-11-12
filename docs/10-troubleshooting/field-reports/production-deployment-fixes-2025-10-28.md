# Production Deployment Issues - Fixed 2025-10-28

## Executive Summary

Fixed critical production deployment issues affecting the Vercel frontend (https://adpa.vercel.app) connecting to Railway backend (https://adpa-production.up.railway.app).

## Issues Identified

### 1. Missing API Routes (404 Errors)

**Problem:**
- `/api/ai-provider-testing/health-dashboard` - 404 Not Found
- `/api/ai-analytics/models?period=30d` - 404 Not Found  
- `/api/documents/project/.../stats` - 404 Not Found

**Root Cause:**
- The `ai-provider-testing` routes were commented out in `server/src/server.ts` (lines 49 and 203)
- Routes existed in the codebase but were not registered with Express

**Fix Applied:**
```typescript
// Before (commented out):
// import aiProviderTestingRoutes from "./routes/ai-provider-testing"
// app.use("/api/ai-provider-testing", aiProviderTestingRoutes)

// After (enabled):
import aiProviderTestingRoutes from "./routes/ai-provider-testing"
app.use("/api/ai-provider-testing", aiProviderTestingRoutes)
```

**Impact:** Resolves 404 errors for AI provider testing dashboard and health checks

---

### 2. CORS Errors - Ollama Localhost Connection

**Problem:**
```
Access to fetch at 'http://localhost:11434/api/tags' from origin 'https://adpa.vercel.app' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

**Root Cause:**
- Frontend was attempting to connect to `localhost:11434` (Ollama) from production
- Localhost is only accessible on the developer's machine, not from deployed sites
- This caused endless CORS errors and connection failures

**Fix Applied:**
Added hostname check to skip Ollama connections in production:

```typescript
// In app/ai-providers/page.tsx
const loadOllamaModels = async () => {
  // Only attempt to connect to Ollama in development
  if (typeof window !== 'undefined' && 
      !window.location.hostname.includes('localhost') && 
      !window.location.hostname.includes('127.0.0.1')) {
    console.log('Skipping Ollama connection in production environment')
    return []
  }

  // ... rest of Ollama connection logic
}
```

**Impact:** Eliminates CORS errors and failed connection attempts in production

---

### 3. 500 Internal Server Errors

**Problem:**
- `/api/analytics/system?period=30d` - 500 Internal Server Error
- `/api/ai/generate` - 500 Internal Server Error

**Root Causes:**

#### Analytics Endpoint:
- Requires `analytics.system` permission (admin-only)
- Regular users get 500 error when trying to access system analytics
- Should return 403 Forbidden, not 500 Internal Server Error

#### AI Generate Endpoint:
- Likely database query errors or missing environment variables on Railway
- Needs investigation of backend logs on Railway

**Status:** ⚠️ **Requires Further Investigation**

**Recommended Actions:**
1. Check Railway backend logs for specific error messages
2. Verify all environment variables are set correctly on Railway
3. Test with an admin account to verify permissions work correctly
4. Consider returning proper HTTP status codes (403 vs 500) for permission errors

---

## Deployment Steps

### 1. Backend Deployment (Railway)

The backend needs to be redeployed to Railway to pick up the route changes:

```bash
# Backend changes are committed
# Railway will auto-deploy when you push to the main/production branch
git push origin development  # or your production branch
```

**Railway Auto-Deploy:**
- Railway is connected to your GitHub repository
- Pushing to the configured branch will trigger automatic deployment
- Monitor deployment at: https://railway.app/project/your-project

### 2. Frontend Deployment (Vercel)

Frontend changes will auto-deploy when pushed:

```bash
# Frontend changes are committed
# Vercel will auto-deploy on git push
git push origin development  # Vercel monitors this branch
```

**Vercel Auto-Deploy:**
- Vercel is connected to your GitHub repository
- Each push triggers a new deployment
- Monitor at: https://vercel.com/your-account/adpa

---

## Testing Checklist

After deployment, test these areas:

### ✅ AI Provider Testing Routes
- [ ] Visit https://adpa.vercel.app/ai-providers
- [ ] Check browser console - should see no 404 errors for `/api/ai-provider-testing/*`
- [ ] Health dashboard should load without errors

### ✅ Ollama Integration (Production)
- [ ] Visit https://adpa.vercel.app/ai-providers
- [ ] Check browser console - should see "Skipping Ollama connection in production environment"
- [ ] NO CORS errors for localhost:11434
- [ ] Ollama provider should show as available but not attempt connection

### ✅ Ollama Integration (Development)
- [ ] Visit http://localhost:3000/ai-providers
- [ ] If Ollama is running locally, it should connect
- [ ] If Ollama is not running, should gracefully fail with warning

### ⚠️ Requires Admin Account
- [ ] System analytics endpoint (admin only)
- [ ] Document generation with full context

---

## Known Remaining Issues

### 1. System Analytics 500 Error

**Status:** 🔴 Not Fixed - Requires Investigation

**Error:**
```
GET /api/analytics/system?period=30d 500 (Internal Server Error)
```

**Possible Causes:**
- Permission check failing incorrectly
- Database query error
- Missing data in analytics tables
- Environment variable issues on Railway

**Investigation Steps:**
1. SSH into Railway container:
   ```bash
   railway logs
   ```
2. Look for error stack traces around analytics queries
3. Verify `analytics_events` table exists and has data
4. Check if admin user has correct permissions

### 2. Document Generation 500 Error

**Status:** 🔴 Not Fixed - Requires Investigation

**Error:**
```
POST /api/ai/generate 500 (Internal Server Error)
```

**Context:**
- Happening when trying to generate a "Project Charter" document
- Frontend shows: "❌ Failed to enqueue job (status 500)"
- Full prompt being sent (14732 chars, ~3683 tokens)

**Investigation Steps:**
1. Check Railway logs for AI service errors
2. Verify AI provider API keys are set in Railway environment
3. Check Redis connection (Bull queue dependency)
4. Verify database tables exist: `regeneration_jobs`, `documents`

---

## Environment Variables Checklist

Verify these are set correctly on Railway:

### Database
- [x] `DATABASE_URL` - PostgreSQL connection string
- [x] `POSTGRES_URL` - Alternate format for some queries
- [x] `DB_SSL` - Should be `true` for production

### Redis
- [x] `REDIS_URL` - Redis connection for Bull queues
- [x] `REDIS_HOST`
- [x] `REDIS_PORT`

### AI Providers (Required for Document Generation)
- [ ] `OPENAI_API_KEY` - ⚠️ Verify this is set
- [ ] `GOOGLE_AI_API_KEY` - ⚠️ Verify this is set
- [ ] `MISTRAL_API_KEY` - ⚠️ Verify this is set
- [ ] `ANTHROPIC_API_KEY` - Optional

### Security
- [ ] `JWT_SECRET` - Must be set and match between Railway and Vercel
- [ ] `ENCRYPTION_KEY` - For encrypting AI API keys in database

---

## Files Changed

### Backend
- `server/src/server.ts`
  - Uncommented `aiProviderTestingRoutes` import (line 49)
  - Uncommented route registration (line 203)

### Frontend
- `app/ai-providers/page.tsx`
  - Added hostname check in `loadOllamaModels()` function (line 376)
  - Prevents localhost connections from production deployments

---

## Commit Details

```
fix: resolve production deployment issues

- Enable ai-provider-testing routes (404 fix for /api/ai-provider-testing/health-dashboard)
- Prevent Ollama localhost calls in production (CORS fix)
- Add hostname check to skip localhost:11434 when not on localhost

Fixes:
- 404 errors for ai-provider-testing endpoints
- CORS errors when trying to connect to localhost:11434 from production
- Frontend now checks if running on localhost before attempting Ollama connection
```

**Commit SHA:** (will be added after push)

---

## Next Steps

### Immediate (Required for Production)
1. **Deploy to Railway** - Push changes to trigger auto-deploy
2. **Deploy to Vercel** - Push changes to trigger auto-deploy
3. **Verify environment variables** - Check Railway dashboard
4. **Test AI provider dashboard** - Should work without 404 errors

### Investigation Required
1. **System Analytics 500** - Check backend logs, verify permissions
2. **AI Generation 500** - Verify AI API keys, check Redis connection
3. **Document Stats 404** - May need route investigation

### Optional Enhancements
1. **Better Error Messages** - Return 403 instead of 500 for permission errors
2. **Ollama Production Support** - Consider proxy/tunnel for remote Ollama
3. **Health Check Improvements** - Add endpoint health monitoring

---

## Contact & Support

**Issue Reported:** 2025-10-28  
**Fixes Applied:** 2025-10-28  
**Status:** ✅ Partial Fix (CORS + 404) / ⚠️ 500 Errors Need Investigation

**For Further Support:**
- Check Railway logs: `railway logs --follow`
- Check Vercel deployment logs: Vercel dashboard
- Review backend logs: `server/logs/combined.log` (local)

---

## Conclusion

**✅ Fixed:**
- CORS errors for Ollama (production now skips localhost connections)
- 404 errors for AI provider testing routes (routes enabled)

**⚠️ Requires Investigation:**
- 500 errors for system analytics (permission/query issues)
- 500 errors for AI generation (likely API key or Redis issues)

**Next Action:** Deploy these changes to production and monitor the remaining 500 errors with Railway backend logs.

