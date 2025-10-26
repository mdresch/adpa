# How to Get and Set SUPABASE_SERVICE_ROLE_KEY

## 🚨 Problem
Vercel has `SUPABASE_SERVICE_ROLE_KEY` variable but the value is empty.

## ⚠️ Why This Matters
The service role key gives backend **admin-level access** to Supabase. Without it:
- ❌ Backend can't create users
- ❌ Backend can't bypass Row-Level Security (RLS) when needed
- ❌ Some admin operations will fail

---

## 📍 Where to Find the Service Role Key

### **Step 1: Go to Supabase Dashboard**

1. Visit: https://supabase.com/dashboard
2. Click your **ADPA project**
3. Go to: **Settings** → **API**

### **Step 2: Find the Service Role Key**

On the API settings page, you'll see:

```
┌─────────────────────────────────────────────────┐
│ Project API keys                                 │
├─────────────────────────────────────────────────┤
│                                                  │
│ anon public                                      │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...        │
│ This key is safe to use in a browser            │
│                                                  │
│ service_role secret ⚠️                          │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...        │
│ This key has the ability to bypass Row Level    │
│ Security. Never share it publicly.               │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Copy the `service_role` key** (the one marked as "secret" with warning emoji).

---

## 🔐 Add to Vercel

### **Method 1: Vercel Dashboard (Recommended)**

1. Go to: https://vercel.com/your-team/adpa/settings/environment-variables
2. Find the existing `SUPABASE_SERVICE_ROLE_KEY` variable
3. Click **"Edit"** (pencil icon)
4. **Paste the service role key** you copied from Supabase
5. Make sure it's set for: **Production, Preview, Development**
6. Click **"Save"**

### **Method 2: Vercel CLI**

```bash
# Set the value for all environments
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste the key when prompted

vercel env add SUPABASE_SERVICE_ROLE_KEY preview
# Paste the key when prompted

vercel env add SUPABASE_SERVICE_ROLE_KEY development
# Paste the key when prompted
```

---

## ✅ Verify It's Set

After adding the key:

1. Go back to: https://vercel.com/your-team/adpa/settings/environment-variables
2. Find `SUPABASE_SERVICE_ROLE_KEY`
3. You should see:
   ```
   SUPABASE_SERVICE_ROLE_KEY
   Sensitive
   Production and Preview
   •••••••••••••••  ← Should show dots (not empty)
   Updated just now
   ```

---

## 🔄 Other Supabase Keys to Check

While you're in Supabase Dashboard → Settings → API, verify these are also set in Vercel:

### **1. SUPABASE_URL** (should already be set)
```
https://your-project-ref.supabase.co
```

### **2. SUPABASE_ANON_KEY** (should already be set)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFz...
```
This is the "anon public" key (safe to expose in frontend).

### **3. SUPABASE_JWT_SECRET** (might be empty)

In Supabase Dashboard → Settings → API, scroll down to find:
```
JWT Settings
JWT Secret: your-jwt-secret-here
```

This is **different** from your app's `JWT_SECRET` (`3f8a2b1c-4e5d-6f7a-8b9c-0d1e2f3a4b5c`).

**Add to Vercel if missing:**
- Key: `SUPABASE_JWT_SECRET`
- Value: Copy from Supabase Dashboard
- Environments: Production, Preview

---

## 🎯 Quick Checklist

After fixing, verify in Vercel you have:

```
✅ SUPABASE_URL                    = https://xxx.supabase.co
✅ SUPABASE_ANON_KEY               = eyJhbGciOi... (long string)
✅ SUPABASE_SERVICE_ROLE_KEY       = eyJhbGciOi... (long string, different from anon)
✅ SUPABASE_JWT_SECRET             = (JWT secret from Supabase settings)
✅ JWT_SECRET                      = 3f8a2b1c-4e5d-6f7a-8b9c-0d1e2f3a4b5c
✅ NEXT_PUBLIC_API_URL             = https://your-backend.railway.app
```

---

## 🚀 After Setting the Key

1. **Trigger a redeploy:**
   ```bash
   # Option 1: Push a commit
   git commit --allow-empty -m "trigger: redeploy after adding Supabase service key"
   git push origin development
   
   # Option 2: Manual redeploy in Vercel dashboard
   # Go to Deployments → Click "..." → "Redeploy"
   ```

2. **Test backend operations:**
   - User registration should work
   - Admin operations should succeed
   - No "insufficient permissions" errors

---

## 🔒 Security Note

**⚠️ NEVER commit this key to git or share it publicly!**

The service role key:
- ✅ Can bypass Row-Level Security (RLS)
- ✅ Can perform admin operations
- ✅ Has full database access
- ❌ Should never be exposed to frontend
- ❌ Should only be used in backend/server code

That's why it's:
- Set as "Sensitive" in Vercel (not visible)
- Only used in backend environment (Railway, not browser)

---

## 📝 Summary

**What you need to do:**
1. Copy `service_role` key from Supabase → Settings → API
2. Edit `SUPABASE_SERVICE_ROLE_KEY` in Vercel and paste the key
3. Save for all environments (Production, Preview, Development)
4. Redeploy

**Time needed:** 2 minutes ⏱️

---

Would you like me to create a script to verify all your Supabase keys are correctly set in Vercel?

