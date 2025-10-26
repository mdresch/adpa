# Railway + Supabase IPv6 Connection Fix

## The Problem

Railway's infrastructure **does not support IPv6**. When Supabase's database hostname resolves to an IPv6 address, Railway gets `ENETUNREACH` error.

## Solution: Use Supabase's IPv4 Connection Pooler

Supabase provides **two connection endpoints**:

### 1. Direct Connection (Port 5432) - Has IPv6 Issues on Railway
```
db.blxzjbxczpmmgiwbtmdo.supabase.co:5432
```
❌ This resolves to IPv6, causing Railway connection failures

### 2. Connection Pooler (Port 6543) - IPv4 Compatible ✅
```
db.blxzjbxczpmmgiwbtmdo.supabase.co:6543
```
✅ Uses PgBouncer pooler, more likely to work with Railway

## Railway Environment Variable Fix

Update your `DATABASE_URL` in Railway to use **port 6543** (pooler):

```bash
DATABASE_URL=postgresql://postgres.blxzjbxczpmmgiwbtmdo:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Alternative format (Transaction mode pooler):**
```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.blxzjbxczpmmgiwbtmdo.supabase.co:6543/postgres?pgbouncer=true
```

## How to Get the Correct Connection String

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: blxzjbxczpmmgiwbtmdo
3. **Go to Settings** → **Database**
4. **Find "Connection Pooling"** section
5. **Copy the "Connection string" for Transaction mode**
6. **It should use port 6543** (not 5432)

## Update in Railway

1. Go to Railway dashboard
2. Select ADPA backend service
3. Variables tab
4. Update `DATABASE_URL` with the pooler URL (port 6543)
5. Railway will auto-redeploy

## Alternative: Use IPv4-only DNS

If pooler doesn't work, you can also try:

```bash
# Force IPv4 by using the pooler subdomain
DATABASE_URL=postgresql://postgres:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```

## Verification

After updating, Railway logs should show:
```
✅ Database connected successfully via DATABASE_URL
```

No more IPv6 ENETUNREACH errors!

---

**Note**: The code fix (family: 4) helps but may not be sufficient if Node.js DNS resolves IPv6 before pg gets the hostname. Using Supabase's pooler endpoint is the most reliable solution for Railway.

