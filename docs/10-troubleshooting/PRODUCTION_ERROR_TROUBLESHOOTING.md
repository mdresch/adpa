# Production Error Troubleshooting - AI Generation Failure

## Date
October 15, 2025

## Errors Detected

### 🔴 Critical Errors

1. **AI Generation Endpoint Failure (500)**
   ```
   Failed to load resource: the server responded with a status of 500
   URL: /api/ai/generate
   Error: AI generation failed
   ```

2. **Job Queue Endpoint Not Available (405)**
   ```
   Failed to load resource: the server responded with a status of 405
   URL: /api/jobs/ai-generate
   Method Not Allowed
   ```

### ⚠️ Warning (Non-Critical)

3. **Dialog Accessibility Warnings**
   - Missing `DialogTitle` for screen readers
   - Missing `Description` or `aria-describedby`

---

## Immediate Troubleshooting Steps

### Step 1: Check Railway Backend Logs

```bash
# View recent logs
railway logs --tail 100

# Or via Railway Dashboard:
# 1. Go to https://railway.app/dashboard
# 2. Select ADPA project
# 3. Click on backend service
# 4. View "Deployments" tab → "View Logs"
```

**Look for:**
- AI provider API key errors
- Database connection issues
- Missing environment variables
- Rate limiting errors
- Timeout errors

### Step 2: Verify Environment Variables

Check if these are set in Railway:

**Required AI Variables:**
```bash
# AI Provider Keys (at least one required)
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...
ANTHROPIC_API_KEY=...
AI_GATEWAY_API_KEY=...

# Or Gateway Mode
AI_GATEWAY_ENABLED=true
AI_GATEWAY_API_KEY=...
AI_GATEWAY_BASE_URL=https://...
```

**Database Variables:**
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### Step 3: Test AI Provider Connection

Create a test script to verify AI connectivity:

```bash
# SSH into Railway container (if available)
railway run bash

# Or create a health check endpoint and call it
curl https://adpa-production.up.railway.app/api/health
```

### Step 4: Check AI Provider Status

Verify the AI providers are working:

**Frontend Check:**
1. Go to `/ai-providers` page
2. Check provider status indicators
3. Look for any "Unavailable" or "Error" states

**Backend Check:**
Query the database:
```sql
SELECT 
  name, 
  is_enabled, 
  api_base_url, 
  priority,
  last_used_at
FROM ai_providers
WHERE is_enabled = true
ORDER BY priority;
```

---

## Diagnostic Queries

### Check Recent AI Generation Attempts

```sql
-- Check recent document generation attempts
SELECT 
  id,
  name,
  status,
  error_message,
  created_at
FROM documents
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

### Check AI Provider Health

```sql
-- Check which providers are enabled
SELECT 
  name,
  is_enabled,
  api_key IS NOT NULL as has_api_key,
  priority
FROM ai_providers
WHERE is_enabled = true;
```

### Check Job Queue Status (if using Bull)

```bash
# Check Redis connection
redis-cli ping

# Check job queues
redis-cli KEYS "bull:*"

# Check failed jobs
redis-cli LLEN "bull:ai-generation:failed"
```

---

## Common Root Causes & Solutions

### 🔧 Issue 1: Missing or Invalid API Keys

**Symptoms:**
- 500 error on /api/ai/generate
- Backend logs show "API key not configured" or "Invalid API key"

**Solution:**
```bash
# Add to Railway environment variables
railway variables set OPENAI_API_KEY=sk-...
railway variables set GOOGLE_AI_API_KEY=...

# Restart the service
railway up --detach
```

### 🔧 Issue 2: AI Gateway Misconfiguration

**Symptoms:**
- AI Gateway enabled but not accessible
- Connection timeout errors

**Solution:**
Check AI Gateway configuration:
```bash
# Verify gateway settings
railway variables get AI_GATEWAY_ENABLED
railway variables get AI_GATEWAY_API_KEY
railway variables get AI_GATEWAY_BASE_URL

# If misconfigured, update:
railway variables set AI_GATEWAY_ENABLED=true
railway variables set AI_GATEWAY_BASE_URL=https://your-gateway-url
```

### 🔧 Issue 3: Database Connection Issues

**Symptoms:**
- 500 errors on multiple endpoints
- "Cannot connect to database" in logs

**Solution:**
```bash
# Test database connection
railway run -- node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()').then(console.log).catch(console.error);"

# If failing, check DATABASE_URL
railway variables get DATABASE_URL

# Verify Neon/PostgreSQL is accessible
```

### 🔧 Issue 4: Redis/Job Queue Not Available

**Symptoms:**
- 405 error on /api/jobs/ai-generate
- Jobs endpoint not responding

**Solution:**

**Option A: Enable Job Queue**
```bash
# Ensure Redis is configured
railway variables set REDIS_URL=redis://...

# Ensure job routes are enabled in server
# Check server/src/index.ts or server/src/app.ts
```

**Option B: Disable Job Queue (Use Direct Generation)**
```javascript
// In frontend code, skip job queue attempt
// Or set environment variable
railway variables set ENABLE_JOB_QUEUE=false
```

### 🔧 Issue 5: Rate Limiting

**Symptoms:**
- Intermittent 500 errors
- "Rate limit exceeded" in logs

**Solution:**
```bash
# Check AI provider rate limits
# Add retry logic or switch to different provider

# Or enable request queuing
railway variables set AI_REQUEST_QUEUE_ENABLED=true
```

### 🔧 Issue 6: Memory/Resource Limits

**Symptoms:**
- 500 errors during large document generation
- "Out of memory" in logs

**Solution:**
```bash
# Increase Railway service resources
# Go to Railway Dashboard → Service → Settings → Resource Limits
# Increase Memory allocation

# Or optimize prompt size
railway variables set MAX_PROMPT_LENGTH=10000
```

---

## Quick Fix Commands

### Restart Backend Service
```bash
# Via Railway CLI
railway restart

# Or via dashboard
# Railway → Project → Backend → Settings → Restart
```

### Clear Redis Cache (if issues persist)
```bash
railway run -- redis-cli FLUSHDB
```

### Re-deploy Backend
```bash
# Force new deployment
git commit --allow-empty -m "Force redeploy"
git push origin development

# Or via Railway dashboard
# Railway → Project → Backend → Deployments → Redeploy
```

---

## Immediate Action Plan

### Priority 1: Get Backend Logs
```bash
railway logs --tail 200 > backend-error-logs.txt
```

**Send me the logs showing:**
- Any errors around the time of the 500 error
- AI provider initialization logs
- Database connection logs

### Priority 2: Verify Environment
```bash
# Check all environment variables are set
railway variables

# Specifically check:
# - DATABASE_URL
# - REDIS_URL (if using job queue)
# - At least one AI provider API key
```

### Priority 3: Test Health Endpoints
```bash
# Test backend health
curl https://adpa-production.up.railway.app/api/health

# Test AI providers endpoint
curl https://adpa-production.up.railway.app/api/ai/providers

# Test specific generation (if auth not required)
curl -X POST https://adpa-production.up.railway.app/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test", "provider": "groq"}'
```

---

## Frontend Accessibility Fixes (Secondary)

### Fix Dialog Warnings

**File:** `app/documents/page.tsx` (or wherever Dialog is used)

```tsx
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

// In your Dialog component:
<Dialog>
  <DialogContent>
    <VisuallyHidden>
      <DialogTitle>Generate Document</DialogTitle>
    </VisuallyHidden>
    <DialogDescription>
      Fill out the form below to generate a new document
    </DialogDescription>
    {/* Rest of your dialog content */}
  </DialogContent>
</Dialog>
```

---

## Monitoring & Prevention

### Set Up Alerts
```javascript
// Add to backend error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Send to monitoring service (e.g., Sentry)
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
  
  res.status(500).json({ error: 'Internal server error' });
});
```

### Add Health Checks
```javascript
// server/src/routes/health.ts
app.get('/api/health/ai', async (req, res) => {
  try {
    const providers = await AIProvider.findAll({ where: { is_enabled: true } });
    const status = await Promise.all(
      providers.map(async (p) => ({
        name: p.name,
        hasKey: !!p.api_key,
        isEnabled: p.is_enabled
      }))
    );
    res.json({ status: 'ok', providers: status });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});
```

---

## Next Steps

1. **Immediate:** Get backend logs and check for specific error messages
2. **Quick Fix:** Verify environment variables are set correctly
3. **Testing:** Test health endpoints to isolate the issue
4. **Long-term:** Add comprehensive error logging and monitoring

---

## Need Help?

If the issue persists after these steps, please provide:

1. Backend error logs (last 100 lines around the error)
2. List of environment variables (redact sensitive values)
3. Database connection test results
4. AI provider status from dashboard

I can help analyze and provide specific fixes based on the actual error messages.

