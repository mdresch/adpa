# 🌐 Railway Domain Types Explained

## Railway Provides 3 Types of Domains

### 1️⃣ **Public Domain** (Use this for Vercel!)
```
https://adpa-production.up.railway.app
```
- ✅ **Accessible from anywhere** (internet)
- ✅ **Use for**: Vercel's `NEXT_PUBLIC_API_URL`
- ✅ **Use for**: External API calls
- ✅ **HTTPS enabled**

### 2️⃣ **Custom Domain** (Optional, cleaner URL)
```
https://adpa.railway.app
```
- ✅ **Accessible from anywhere** (internet)
- ✅ **Requires DNS configuration**
- ✅ **Use for**: Vercel's `NEXT_PUBLIC_API_URL`
- 📝 **Status**: Need to add in Railway dashboard

### 3️⃣ **Internal Domain** (Service-to-service only)
```
adpa.railway.internal:5000
```
- ❌ **NOT accessible from internet**
- ❌ **NOT accessible from Vercel**
- ✅ **Only for**: Railway service → Railway service communication
- ✅ **Use for**: If you have multiple Railway services talking to each other
- ⚠️ **HTTP only** (not HTTPS)
- ⚠️ **Requires port number** (e.g., `:5000`)

---

## ✅ What to Use for Vercel

Since your Vercel frontend is **outside Railway**, you MUST use the **public domain**:

### Current Setup (Use This!)
```
NEXT_PUBLIC_API_URL=https://adpa-production.up.railway.app
```

### Or Custom Domain (After DNS Setup)
```
NEXT_PUBLIC_API_URL=https://adpa.railway.app
```

### ❌ Do NOT Use Internal Domain
```
❌ NEXT_PUBLIC_API_URL=http://adpa.railway.internal:5000
```
This will NOT work because Vercel is external to Railway!

---

## 🔧 To Set Up Custom Domain `adpa.railway.app`

1. **Railway Dashboard**:
   - https://railway.com/project/2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3
   - Settings → Networking → Custom Domain
   - Add: `adpa.railway.app`

2. **Configure DNS** (if you own the domain):
   - Add CNAME record:
   ```
   adpa.railway.app → adpa-production.up.railway.app
   ```

3. **Or Just Use Default**:
   The default `adpa-production.up.railway.app` works perfectly!

---

## 📌 Summary

**For Vercel `NEXT_PUBLIC_API_URL`, use:**

```bash
https://adpa-production.up.railway.app
```

**NOT:**
- ❌ `adpa.railway.internal` (internal only)
- ❌ `http://adpa.railway.internal:5000` (no external access)

---

## ✅ Correct Configuration

```bash
# Set in Vercel
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://adpa-production.up.railway.app

# Redeploy
vercel --prod
```

**This is the correct, working URL for your setup!** 🚀

