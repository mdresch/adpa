# Pipeline 403 Forbidden - Authentication Fix

## Current Status

✅ **Routes Working**: The pipeline routes are registered and responding (changed from 404 to 403)  
❌ **Authentication Issue**: JWT token is malformed or invalid

## Quick Fixes

### Fix 1: Refresh Your Authentication (Recommended)

1. **Log out** of the application
2. **Clear browser localStorage**:
   ```javascript
   // In browser console
   localStorage.clear()
   ```
3. **Log back in** with your credentials
4. **Navigate to** `/process-flow/visual-pipeline`

### Fix 2: Verify Your Token

Check if you have a valid token:

```javascript
// In browser console
const token = localStorage.getItem('token')
console.log('Token:', token)

// Should see a JWT token like: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
// If you see 'null' or undefined, you need to log in
```

### Fix 3: Check Token Expiration

The backend log shows:
```
error: Token verification failed: jwt malformed
```

This usually means:
- Token is not a valid JWT format
- Token has extra characters or is truncated
- localStorage has wrong key name

### Fix 4: Verify Authentication Flow

1. **Open DevTools** (F12)
2. **Go to Application tab** → **Local Storage**
3. **Look for** `token` key
4. **Verify** it exists and looks like a JWT (three parts separated by dots)

## Backend Logs Analysis

From your logs:
```
Line 171-176: error: Token verification failed: jwt malformed
```

The pipeline routes ARE working (no "route not found" errors), but authentication is failing.

## Expected Success Flow

Once authentication is fixed, you should see:

**Browser Console:**
```
GET http://localhost:5000/api/pipeline/templates 200 (OK)
GET http://localhost:5000/api/pipeline/projects 200 (OK)
GET http://localhost:5000/api/pipeline/jobs 200 (OK)
```

**Backend Logs:**
```
info: Getting templates for pipeline...
info: Getting projects for pipeline...
info: Getting jobs for pipeline...
```

## Temporary Testing Solution

If you want to test the routes without fixing auth right now, I can create a health check endpoint that doesn't require authentication:

```typescript
// In server/src/routes/pipeline.ts
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    message: 'Pipeline API is running',
    timestamp: new Date()
  })
})
```

Test it:
```bash
curl http://localhost:5000/api/pipeline/health
```

## After Fixing Authentication

Once you have a valid token, the visual pipeline page will:

1. ✅ Load available templates
2. ✅ Load available projects  
3. ✅ Show template/project dropdowns populated
4. ✅ Enable "Start Pipeline" button
5. ✅ Allow you to start actual pipeline processing

## Need More Help?

If logging out/in doesn't work, check:

1. **Are you accessing the app at the right URL?**
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:5000`

2. **Do you have a user account?**
   - You might need to create a user first

3. **Is the auth endpoint working?**
   ```bash
   curl http://localhost:5000/api/auth/login \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"email":"your@email.com","password":"yourpassword"}'
   ```

---

**Bottom Line:** The pipeline integration is working! You just need a valid JWT token. Log out and log back in to get a fresh one. 🚀

