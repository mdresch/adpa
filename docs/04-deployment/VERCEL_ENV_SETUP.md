# Vercel Environment Variables Setup for Supabase

**Required for Vercel deployment to work**

## Steps to Add Environment Variables in Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**: `adpa`
3. **Settings** → **Environment Variables**
4. **Add each variable below** (click "Add" for each one)

---

## Required Environment Variables

### Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Database Connection (Supabase PostgreSQL)
```bash
POSTGRES_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-ref.supabase.co:5432/postgres?sslmode=require
POSTGRES_PRISMA_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-ref.supabase.co:6543/postgres?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-ref.supabase.co:5432/postgres
```

### Redis (if using Vercel KV or Upstash)
```bash
KV_URL=redis://default:password@your-redis-url.upstash.io:6379
KV_REST_API_URL=https://your-kv-database.vercel-storage.com
KV_REST_API_TOKEN=your_api_token
```

### Authentication
```bash
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long
```

### API Configuration
```bash
NEXT_PUBLIC_API_URL=https://your-backend-api-url.com
NEXT_PUBLIC_WS_URL=wss://your-backend-api-url.com
```

### AI Providers (Optional - for AI features)
```bash
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...
ANTHROPIC_API_KEY=...
```

---

## Important Notes

1. **Copy from your local `.env.local` file** - Don't type manually
2. **Set environment** for each variable:
   - Production + Preview + Development (all three)
3. **Never commit .env files** to git
4. **After adding variables**, redeploy:
   - Deployments tab → Click "..." → Redeploy

---

## Verification

After setting variables and redeploying, check:
- ✅ Build succeeds (no errors)
- ✅ Preview URL loads
- ✅ Database connection works
- ✅ No 500 errors in browser console

---

**Need help?** Check your local `.env.local` file for the correct values.

