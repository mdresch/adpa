# Pipeline Routes 404 Error - Troubleshooting Guide

## Issue
Getting 404 errors for pipeline API endpoints:
- `/api/pipeline/jobs`
- `/api/pipeline/templates`
- `/api/pipeline/projects`

## Root Cause
The backend server is running old code that doesn't include the new pipeline routes.

## Solution Steps

### 1. Stop the Current Backend Server

**Windows (PowerShell):**
```powershell
# Find the Node process running on port 5000
Get-Process -Name node | Where-Object { $_.MainWindowTitle -like "*5000*" } | Stop-Process -Force

# Or use netstat to find and kill the process
$port = netstat -ano | findstr :5000
# Note the PID and kill it
Stop-Process -Id <PID> -Force
```

**Or simply press `Ctrl+C` in the terminal where the server is running**

### 2. Restart the Backend Server

```bash
cd server
npm run dev
```

### 3. Verify Routes are Loaded

Watch the server console output for:
```
✅ All API routes registered
```

You should see the pipeline routes being registered.

### 4. Test the Routes

**Option A: Use the test script**
```bash
cd server
node test-pipeline-routes.js
```

Expected output:
```
🧪 Testing Pipeline Routes...

Testing GET /api/pipeline/templates...
  ✅ 401 - Route exists but needs authentication (expected)
Testing GET /api/pipeline/projects...
  ✅ 401 - Route exists but needs authentication (expected)
Testing GET /api/pipeline/jobs...
  ✅ 401 - Route exists but needs authentication (expected)

✨ Done!
```

**Option B: Use curl**
```bash
# Should get 401 (unauthorized) not 404
curl http://localhost:5000/api/pipeline/templates
```

### 5. Check for TypeScript Compilation Errors

If routes still don't work after restart:

```bash
cd server
npx tsx src/server.ts
```

Look for any errors in the console related to `pipeline.ts`.

### 6. Verify the Database Migration

The pipeline routes need the database tables to exist:

```bash
cd server
psql $DATABASE_URL -f migrations/011_pipeline_tables.sql
```

Should show:
```
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
... (etc)
```

### 7. Check Redis Connection

The pipeline worker needs Redis to be running:

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG
```

If not running:
```bash
# Windows (WSL or Docker)
docker run -d -p 6379:6379 redis:7-alpine

# Or use the existing Redis container
docker start redis
```

## Quick Verification Checklist

- [ ] Backend server restarted successfully
- [ ] No TypeScript compilation errors in console
- [ ] Database migration applied (tables exist)
- [ ] Redis is running
- [ ] Routes return 401 (not 404) when unauthenticated
- [ ] Routes return data when authenticated

## Common Issues

### Issue: "Cannot find module './routes/pipeline'"

**Solution:** Make sure the file exists at `server/src/routes/pipeline.ts`

```bash
ls -la server/src/routes/pipeline.ts
```

### Issue: "PipelineOrchestrator is not a constructor"

**Solution:** Check the import path in pipeline.ts:
```typescript
import { PipelineOrchestrator } from '../modules/multiStageDocumentProcessor/services/pipelineOrchestrator'
```

### Issue: Database connection errors

**Solution:** Verify DATABASE_URL in `server/.env`:
```bash
cd server
cat .env | grep DATABASE_URL
```

### Issue: Routes still return 404 after restart

**Solution:** Check if the routes are actually being registered:

Add a console.log in `server/src/server.ts` after the pipeline routes:
```typescript
app.use("/api/pipeline", pipelineRoutes)
console.log('✅ Pipeline routes registered at /api/pipeline')
```

## Testing the Full Flow

Once routes are working (returning 401, not 404):

1. Open frontend: http://localhost:3000/process-flow/visual-pipeline
2. Login if needed
3. Should see templates and projects dropdowns
4. Select template and project
5. Click "Start Pipeline"
6. Should see job being created and stages executing

## Debugging Tips

### Enable Debug Logging

In `server/src/routes/pipeline.ts`, add more logging:

```typescript
router.get('/templates', authenticateToken, requirePermission('templates.read'), async (req, res) => {
  console.log('📋 GET /api/pipeline/templates called')
  // ... rest of handler
})
```

### Check Server Logs

```bash
tail -f server/logs/combined.log
```

Look for:
- Route registration messages
- Request logs
- Any errors

### Test Without Authentication (Temporarily)

Comment out `authenticateToken` middleware temporarily to test:

```typescript
router.get('/templates',
  // authenticateToken,  // Comment out temporarily
  requirePermission('templates.read'),
  async (req, res) => {
```

**Remember to re-enable authentication after testing!**

## Next Steps After Routes Work

1. Verify templates endpoint returns templates
2. Verify projects endpoint returns projects
3. Test starting a pipeline job
4. Monitor job execution in database
5. Check worker logs

## Still Not Working?

1. **Check the server is actually running:**
   ```bash
   curl http://localhost:5000/health
   ```

2. **Verify port 5000 is available:**
   ```bash
   netstat -ano | findstr :5000
   ```

3. **Check for conflicting routes:**
   Search for other routes that might be conflicting:
   ```bash
   cd server/src/routes
   grep -r "'/pipeline'" .
   ```

4. **Restart everything from scratch:**
   ```bash
   # Stop backend
   # Stop frontend
   # Stop Redis
   
   # Start Redis
   docker start redis
   
   # Start backend
   cd server && npm run dev
   
   # Start frontend
   cd .. && npm run dev
   ```

## Environment Variables Check

Make sure these are set in `server/.env`:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=5000
```

## Success Indicators

✅ Server starts without errors  
✅ Routes return 401 (unauthorized) not 404  
✅ Database tables exist  
✅ Redis is connected  
✅ Worker is processing jobs  
✅ Frontend loads templates/projects  

---

**Need More Help?**

Check:
- Server logs: `server/logs/combined.log`
- Browser console for frontend errors
- Network tab in DevTools for API calls
- Database for data: `psql $DATABASE_URL -c "SELECT * FROM pipeline_executions LIMIT 5;"`

