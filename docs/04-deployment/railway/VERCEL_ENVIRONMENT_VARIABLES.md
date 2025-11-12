# Vercel Environment Variables Configuration

**For ADPA Frontend Deployment**

---

## 🎯 **Quick Summary**

**What to Set in Vercel Dashboard:**
- Backend API URL
- Public configuration flags
- Analytics keys (optional)

**What NOT to Set in Vercel:**
- ❌ Database credentials (backend only!)
- ❌ Encryption keys (backend only!)
- ❌ AI provider keys (backend only!)

**Vercel hosts the FRONTEND (Next.js) only. Backend runs separately on Railway/Render.**

---

## 📋 **Required Environment Variables**

### **In Vercel Dashboard → Settings → Environment Variables:**

| Variable Name | Value | Environment | Description |
|---------------|-------|-------------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.railway.app` | Production | Backend API endpoint |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000` | Development | Local backend for dev |
| `NEXT_PUBLIC_WS_URL` | `wss://your-backend.railway.app` | Production | WebSocket endpoint |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:5000` | Development | Local WebSocket for dev |
| `NEXT_PUBLIC_APP_NAME` | `ADPA` | All | Application name |
| `NEXT_PUBLIC_APP_VERSION` | `2.0.0` | All | Current version |

---

## 🔧 **How to Set in Vercel**

### **Method 1: Vercel Dashboard (Recommended)**

**Step 1: Go to Project Settings**
1. Login to https://vercel.com/dashboard
2. Select your ADPA project
3. Click **Settings** tab
4. Click **Environment Variables** in sidebar

**Step 2: Add Each Variable**
1. Click **"Add New"** button
2. Enter **Name:** `NEXT_PUBLIC_API_URL`
3. Enter **Value:** `https://your-backend.railway.app`
4. Select **Environment:**
   - ✅ Production
   - ✅ Preview
   - ⬜ Development (uses localhost)
5. Click **"Save"**

**Step 3: Repeat for Each Variable**

---

### **Method 2: Vercel CLI**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project (if not already)
cd frontend
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_API_URL production
# Enter value when prompted: https://your-backend.railway.app

vercel env add NEXT_PUBLIC_WS_URL production
# Enter value: wss://your-backend.railway.app

# Pull env vars locally (for testing)
vercel env pull
```

---

## 🎯 **Complete Variable List**

### **1. Backend API URL** ⭐ REQUIRED

**Variable:**
```bash
NEXT_PUBLIC_API_URL
```

**Values by Environment:**
```bash
# Production
NEXT_PUBLIC_API_URL=https://adpa-backend.railway.app

# Preview (Staging)
NEXT_PUBLIC_API_URL=https://adpa-backend-staging.railway.app

# Development (Local)
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Used For:**
- All API calls from frontend
- Authentication endpoints
- Document generation requests
- Settings configuration

---

### **2. WebSocket URL** ⭐ REQUIRED

**Variable:**
```bash
NEXT_PUBLIC_WS_URL
```

**Values by Environment:**
```bash
# Production (MUST use wss:// for secure WebSocket!)
NEXT_PUBLIC_WS_URL=wss://adpa-backend.railway.app

# Preview
NEXT_PUBLIC_WS_URL=wss://adpa-backend-staging.railway.app

# Development
NEXT_PUBLIC_WS_URL=ws://localhost:5000
```

**Used For:**
- Real-time document processing updates
- Live collaboration features
- Job queue status notifications

---

### **3. Application Metadata** (Optional but Recommended)

**Variables:**
```bash
NEXT_PUBLIC_APP_NAME=ADPA
NEXT_PUBLIC_APP_VERSION=2.0.0
NEXT_PUBLIC_ENVIRONMENT=production
```

**Used For:**
- Branding
- Version display in UI
- Analytics tracking
- Error reporting context

---

### **4. Analytics** (Optional)

**Vercel Analytics** (Already enabled if you see it):
```bash
# No configuration needed - Vercel handles automatically
# Just enable in Vercel Dashboard → Analytics tab
```

**Google Analytics** (If using):
```bash
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX
```

---

### **5. Feature Flags** (Optional)

**Variables:**
```bash
NEXT_PUBLIC_ENABLE_BETA_FEATURES=false
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_WEBSOCKETS=true
```

**Used For:**
- Toggle beta features on/off
- Enable/disable optional functionality
- A/B testing capabilities

---

## ⚠️ **IMPORTANT: What NOT to Put in Vercel**

### **❌ DO NOT SET THESE IN VERCEL:**

These are **BACKEND-ONLY** and should ONLY be in Railway/Render/Backend host:

```bash
# ❌ Database credentials
POSTGRES_URL
DB_PASSWORD
DB_HOST

# ❌ Redis credentials  
REDIS_URL

# ❌ Encryption keys
ENCRYPTION_KEK
ENCRYPTION_KEY

# ❌ AI provider keys
AI_GATEWAY_API_KEY
GOOGLE_AI_API_KEY
OPENAI_API_KEY

# ❌ JWT secrets
JWT_SECRET
SESSION_SECRET

# ❌ OAuth secrets
GITHUB_CLIENT_SECRET
GOOGLE_CLIENT_SECRET
```

**Why?**
- Frontend is public (code visible in browser!)
- These secrets MUST stay on backend server
- Vercel frontend only makes API calls to backend
- Backend handles all security/encryption/AI

---

## 🏗️ **Architecture Reminder**

```
┌─────────────────────┐
│   Vercel (Frontend) │
│   ✅ NEXT_PUBLIC_*  │ ← Only public vars
│   ❌ No secrets!    │
└──────────┬──────────┘
           │ HTTPS API Calls
           ↓
┌─────────────────────┐
│ Railway (Backend)   │
│ ✅ All secrets      │ ← Database, AI keys, encryption
│ ✅ POSTGRES_URL     │
│ ✅ ENCRYPTION_KEK   │
│ ✅ AI_GATEWAY_KEY   │
└─────────────────────┘
```

**Frontend:** Public-safe environment variables only  
**Backend:** All sensitive credentials

---

## 📝 **Step-by-Step Vercel Setup**

### **Complete Checklist:**

**1. Create Vercel Project**
- [ ] Import from GitHub
- [ ] Select `frontend` directory as root
- [ ] Framework: Next.js (auto-detected)
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `.next`

**2. Set Environment Variables**
- [ ] Add `NEXT_PUBLIC_API_URL` (production backend URL)
- [ ] Add `NEXT_PUBLIC_WS_URL` (production WebSocket URL)
- [ ] Add `NEXT_PUBLIC_APP_NAME` = `ADPA`
- [ ] Add `NEXT_PUBLIC_APP_VERSION` = `2.0.0`

**3. Configure Domains** (Optional)
- [ ] Add custom domain (e.g., `app.adpa.com`)
- [ ] Configure DNS
- [ ] Enable HTTPS (automatic)

**4. Deploy**
- [ ] Click "Deploy"
- [ ] Wait for build (2-5 min)
- [ ] Verify deployment works
- [ ] Test API connectivity

**5. Verify**
- [ ] Open deployed URL
- [ ] Check browser console (no errors)
- [ ] Test login (connects to backend)
- [ ] Test document generation
- [ ] Verify WebSocket connection

---

## 🔒 **Security Best Practices**

### **✅ DO:**
- Use `NEXT_PUBLIC_` prefix for any variable accessed in browser
- Set production URLs to HTTPS/WSS (secure)
- Use different values for Production vs Preview
- Test with `vercel env pull` before deploying

### **❌ DON'T:**
- Put backend secrets in Vercel environment
- Use HTTP in production (must be HTTPS)
- Commit `.env.local` to git
- Share production URLs publicly before launch

---

## 🧪 **Testing Environment Variables**

### **Local Testing:**

**Create `frontend/.env.local`:**
```bash
# Frontend Environment Variables (Local Development)
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000
NEXT_PUBLIC_APP_NAME=ADPA
NEXT_PUBLIC_APP_VERSION=2.0.0-dev
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_ENABLE_BETA_FEATURES=true
```

**Test:**
```bash
cd frontend
npm run dev
# Open http://localhost:3000
# Check console for correct API_URL
```

---

## 🚀 **Production Deployment Checklist**

### **Before First Deploy:**

**1. Backend Must Be Running:**
- [ ] Backend deployed to Railway/Render
- [ ] Health check endpoint working: `https://your-backend.railway.app/health`
- [ ] CORS configured to allow Vercel domain
- [ ] Database connected
- [ ] Redis connected
- [ ] AI providers configured

**2. Get Backend URLs:**
```bash
# Your backend URL (replace with actual)
Backend API: https://adpa-backend.railway.app
WebSocket: wss://adpa-backend.railway.app

# Test health check
curl https://adpa-backend.railway.app/health
# Should return: {"status":"ok","timestamp":"..."}
```

**3. Configure Vercel Environment:**
- [ ] Set `NEXT_PUBLIC_API_URL`
- [ ] Set `NEXT_PUBLIC_WS_URL`
- [ ] Set app metadata variables

**4. Deploy to Vercel:**
```bash
cd frontend
vercel --prod
```

**5. Verify Deployment:**
- [ ] Open Vercel URL
- [ ] Check Network tab (API calls to correct backend)
- [ ] Test login
- [ ] Test document generation
- [ ] Check WebSocket connection

---

## 🔧 **Common Issues & Solutions**

### **Issue 1: API calls failing (CORS)**

**Error:**
```
Access to fetch at 'https://backend.railway.app' from origin 'https://your-app.vercel.app' 
has been blocked by CORS policy
```

**Solution:**
Add to backend `server/src/server.ts`:
```typescript
app.use(cors({
  origin: [
    'http://localhost:3000',           // Local dev
    'https://your-app.vercel.app',     // Vercel production
    'https://*.vercel.app'             // Vercel previews
  ],
  credentials: true
}))
```

---

### **Issue 2: Environment variables not updating**

**Problem:**
Changed vars in Vercel but frontend still uses old values

**Solution:**
```bash
# Redeploy to apply new environment variables
vercel --prod --force

# Or in Vercel Dashboard:
# Deployments → ... (menu) → Redeploy
```

---

### **Issue 3: WebSocket not connecting**

**Error:**
```
WebSocket connection failed
```

**Checklist:**
- [ ] Used `wss://` not `ws://` in production
- [ ] Backend WebSocket port exposed
- [ ] CORS allows WebSocket upgrade
- [ ] No firewall blocking WebSocket

---

## 📊 **Environment Variable Matrix**

### **Complete Reference:**

| Variable | Frontend (Vercel) | Backend (Railway) | Notes |
|----------|-------------------|-------------------|-------|
| `NEXT_PUBLIC_API_URL` | ✅ **REQUIRED** | ❌ No | Points to backend |
| `NEXT_PUBLIC_WS_URL` | ✅ **REQUIRED** | ❌ No | WebSocket endpoint |
| `NEXT_PUBLIC_APP_NAME` | ✅ Optional | ❌ No | Branding |
| `POSTGRES_URL` | ❌ **NEVER!** | ✅ **REQUIRED** | Database secret |
| `REDIS_URL` | ❌ **NEVER!** | ✅ **REQUIRED** | Redis secret |
| `ENCRYPTION_KEK` | ❌ **NEVER!** | ✅ **REQUIRED** (prod) | Encryption key |
| `AI_GATEWAY_API_KEY` | ❌ **NEVER!** | ✅ Optional | Configured via UI |
| `JWT_SECRET` | ❌ **NEVER!** | ✅ **REQUIRED** | Auth secret |
| `SESSION_SECRET` | ❌ **NEVER!** | ✅ **REQUIRED** | Session secret |

---

## 🚀 **Quick Setup Script**

### **For Vercel CLI:**

```bash
#!/bin/bash
# setup-vercel-env.sh
# Run this after deploying backend to Railway

# Get your backend URL from Railway
BACKEND_URL="https://adpa-backend.railway.app"

# Set production environment variables
vercel env add NEXT_PUBLIC_API_URL production
# When prompted, enter: $BACKEND_URL

vercel env add NEXT_PUBLIC_WS_URL production  
# When prompted, enter: wss://adpa-backend.railway.app

vercel env add NEXT_PUBLIC_APP_NAME production
# When prompted, enter: ADPA

vercel env add NEXT_PUBLIC_APP_VERSION production
# When prompted, enter: 2.0.0

# Set preview/staging environment
vercel env add NEXT_PUBLIC_API_URL preview
# Enter staging backend URL if you have one

# Deploy with new variables
vercel --prod
```

---

## 🎯 **Minimum Required Setup**

### **Absolute Minimum (to get frontend working):**

**Just 2 variables:**
```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_WS_URL=wss://your-backend-url.railway.app
```

That's it! Everything else is handled by the backend.

---

## 📖 **What Each Variable Does**

### **`NEXT_PUBLIC_API_URL`**

**Purpose:** Tells frontend where to send API requests

**Frontend Code:**
```typescript
// frontend/lib/api.ts
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// Used in:
fetch(`${apiUrl}/api/auth/login`, { ... })
fetch(`${apiUrl}/api/ai/generate`, { ... })
fetch(`${apiUrl}/api/documents`, { ... })
```

**Critical:** Without this, frontend can't talk to backend!

---

### **`NEXT_PUBLIC_WS_URL`**

**Purpose:** WebSocket connection for real-time updates

**Frontend Code:**
```typescript
// frontend/contexts/WebSocketContext.tsx
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000'

// Used for:
- Real-time document processing updates
- Live collaboration
- Job queue notifications
```

**Optional:** System works without WebSockets, just no real-time updates

---

### **`NEXT_PUBLIC_APP_NAME` & Version**

**Purpose:** Branding and version display

**Frontend Code:**
```typescript
// Used in headers, footers, about pages
const appName = process.env.NEXT_PUBLIC_APP_NAME || 'ADPA'
const version = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
```

**Optional:** Defaults work fine

---

## 🏗️ **Deployment Architecture**

### **Your Current Setup:**

```
┌──────────────────────────────────────┐
│  Vercel (Frontend - Next.js)         │
│  ✅ NEXT_PUBLIC_API_URL             │
│  ✅ NEXT_PUBLIC_WS_URL              │
│  ❌ No backend secrets!             │
│                                      │
│  URL: https://adpa.vercel.app       │
└──────────────┬───────────────────────┘
               │
               │ HTTPS API Calls
               │
               ↓
┌──────────────────────────────────────┐
│  Railway (Backend - Express)         │
│  ✅ POSTGRES_URL (Neon)             │
│  ✅ REDIS_URL (Upstash)             │
│  ✅ ENCRYPTION_KEK                  │
│  ✅ AI_GATEWAY_API_KEY              │
│  ✅ JWT_SECRET                      │
│                                      │
│  URL: https://adpa-backend.railway.app│
└──────────────┬───────────────────────┘
               │
               ├─→ Neon PostgreSQL (Database)
               ├─→ Upstash Redis (Cache/Sessions)
               └─→ Vercel AI Gateway (AI providers)
```

---

## ✅ **Verification Steps**

### **After Setting Variables in Vercel:**

**1. Check in Vercel Dashboard:**
```
Settings → Environment Variables

Should see:
✅ NEXT_PUBLIC_API_URL (Production, Preview)
✅ NEXT_PUBLIC_WS_URL (Production, Preview)
✅ NEXT_PUBLIC_APP_NAME (All)
✅ NEXT_PUBLIC_APP_VERSION (All)
```

**2. Trigger Redeploy:**
```bash
# In Vercel Dashboard:
Deployments → (Latest) → ... → Redeploy

# Or via CLI:
vercel --prod --force
```

**3. Test Deployment:**
```bash
# Open your Vercel URL
https://your-app.vercel.app

# Open browser console (F12)
# Check for correct API URL:
console.log(process.env.NEXT_PUBLIC_API_URL)
# Should show: https://your-backend.railway.app

# Test API call
# Network tab should show requests to Railway backend
```

**4. Verify Backend Connection:**
```bash
# In browser console on your Vercel app:
fetch(process.env.NEXT_PUBLIC_API_URL + '/health')
  .then(r => r.json())
  .then(console.log)

# Should return:
# { status: "ok", timestamp: "..." }
```

---

## 🎯 **Production Checklist**

### **Before Vercel Deploy:**

**Backend (Railway) Ready:**
- [x] ✅ Backend deployed and running
- [x] ✅ Database connected (Neon)
- [x] ✅ Redis connected (Upstash)
- [x] ✅ All encryption working
- [x] ✅ AI providers configured
- [x] ✅ Health endpoint responding
- [x] ✅ CORS allows Vercel domain

**Vercel Configuration:**
- [ ] Environment variables set (NEXT_PUBLIC_API_URL, etc.)
- [ ] Domain configured (optional)
- [ ] Analytics enabled (optional)
- [ ] Build settings correct

**Post-Deploy Verification:**
- [ ] Frontend loads without errors
- [ ] API calls reach backend
- [ ] Login works
- [ ] Document generation works
- [ ] WebSocket connects (if enabled)

---

## 📋 **Quick Reference Card**

### **Copy-Paste for Vercel Dashboard:**

```
# Replace YOUR_BACKEND_URL with actual Railway URL

Name: NEXT_PUBLIC_API_URL
Value: https://YOUR_BACKEND_URL.railway.app
Environment: Production, Preview

Name: NEXT_PUBLIC_WS_URL  
Value: wss://YOUR_BACKEND_URL.railway.app
Environment: Production, Preview

Name: NEXT_PUBLIC_APP_NAME
Value: ADPA
Environment: Production, Preview, Development

Name: NEXT_PUBLIC_APP_VERSION
Value: 2.0.0
Environment: Production, Preview, Development
```

---

## 🆘 **Troubleshooting**

### **Frontend can't reach backend:**

**Check:**
```bash
# 1. Backend is running
curl https://your-backend.railway.app/health

# 2. CORS is configured
# In backend server.ts, must have:
app.use(cors({
  origin: 'https://your-app.vercel.app',
  credentials: true
}))

# 3. Environment variable is correct
# In Vercel deployment logs, check:
echo $NEXT_PUBLIC_API_URL
```

### **Changes not applying:**

**Solution:**
1. Save environment variables in Vercel
2. **Redeploy** (changes don't apply to existing deployments!)
3. Hard refresh browser (Ctrl+Shift+R)

---

## 🎊 **You're Ready!**

### **To Deploy Frontend to Vercel:**

**Just set these 2 variables:**
1. `NEXT_PUBLIC_API_URL` → Your Railway backend URL
2. `NEXT_PUBLIC_WS_URL` → Your Railway WebSocket URL

**Then deploy:**
```bash
vercel --prod
```

**Done!** 🚀

---

## 📞 **Need Help?**

**Common Questions:**
- Q: Do I need a paid Vercel plan?
  - A: No, Free tier works for beta testing!

- Q: Can I use a custom domain?
  - A: Yes! Configure in Vercel → Settings → Domains

- Q: How do I update variables later?
  - A: Dashboard → Settings → Environment Variables → Edit → Redeploy

- Q: Why are my changes not showing?
  - A: Must redeploy after changing environment variables!

---

**That's it! Vercel configuration is simple because all secrets stay on the backend!** ✅

---

*Last Updated: October 16, 2025*  
*Maintained by: ADPA Development Team*

