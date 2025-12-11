# 🚀 ADPA - Quick Start Guide

## ✅ Current Status: RUNNING

Your local development environment is **successfully configured and running**!

---

## 🌐 Access Your Application

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | http://localhost:3000 | ✅ Running |
| **Backend API** | http://localhost:5000 | ✅ Running |
| **Health Check** | http://localhost:5000/health | ✅ Active |
| **Database** | Supabase PostgreSQL (Cloud) | ✅ Connected |
| **Cache** | Railway Redis (Cloud) | ✅ Connected |

---

## 🛠️ Essential Commands

### Start Development Servers

```powershell
# Option 1: Manual (Recommended for development)
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
npm run dev

# Option 2: Automated Background
.\start-local-dev.ps1
```

### Stop Servers

```powershell
# Stop all Node processes
Get-Process -Name node | Stop-Process -Force
```

### Restart/Reset Environment

```powershell
# Recreate environment files
.\setup-supabase-env.ps1

# Restart servers
Get-Process -Name node | Stop-Process -Force
cd server && npm run dev  # In terminal 1
npm run dev               # In terminal 2
```

---

## 📁 Configuration Files

### Backend: `server/.env`
```env
# Database (Supabase PostgreSQL)
DB_HOST=aws-0-[REGION].pooler.supabase.com
POSTGRES_URL=postgresql://postgres:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true

# Server
PORT=5000
NODE_ENV=development

# Add AI API keys here (optional)
# OPENAI_API_KEY=sk-...
# GOOGLE_AI_API_KEY=...
```

### Frontend: `.env.local`
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000

# Database (same as backend)
POSTGRES_URL=postgresql://postgres:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

---

## 🔍 Verification & Testing

### Test Backend Health
```powershell
curl http://localhost:5000/health
# Expected: {"status":"OK","timestamp":"...","version":"1.0.0"}
```

### Test Database Connection
```powershell
cd server
node -e "require('dotenv').config(); const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } }); pool.query('SELECT NOW()', (err, res) => { if (err) { console.error('❌ Error:', err); } else { console.log('✅ Connected! Time:', res.rows[0].now); } pool.end(); });"
```

### Test Frontend
Open http://localhost:3000 in your browser
- Should display: "ADPA Admin Portal"
- Check browser console for errors (F12)

---

## 📊 Features Available

### ✅ Working Features
- ✅ Frontend UI (Next.js)
- ✅ Backend API (Express)
- ✅ Database Connection (Supabase PostgreSQL)
- ✅ Redis Caching
- ✅ Authentication System
- ✅ Multi-Stage Document Processing Pipeline
- ✅ Context Gathering & Analysis
- ✅ Variable Resolution Engine
- ✅ Multi-AI Provider Integration Framework

### ⏳ Pending Features (Add API Keys)
- ⏳ OpenAI Integration (Add `OPENAI_API_KEY`)
- ⏳ Google AI Integration (Add `GOOGLE_AI_API_KEY`)
- ⏳ Mistral AI Integration (Add `MISTRAL_API_KEY`)
- ⏳ Anthropic Claude (Add `ANTHROPIC_API_KEY`)

---

## 🔧 Development Workflow

### 1. Make Code Changes
Both servers support **hot reload** - changes appear automatically:
- **Backend**: `tsx watch` auto-restarts on file changes
- **Frontend**: Next.js Fast Refresh updates instantly

### 2. View Logs

**Backend Logs:**
```powershell
# Live terminal output
# OR view log files
Get-Content server/logs/combined.log -Tail 50 -Wait
Get-Content server/logs/error.log -Tail 50 -Wait
```

**Frontend Logs:**
- Browser DevTools Console (Press F12)
- Terminal output

### 3. Run Tests
```powershell
cd server
npm test        # Run all tests
npm run lint    # Check code quality
```

### 4. Database Operations

**Run Migrations:**
```powershell
# Connect to Supabase database
# Use the connection string from your Supabase dashboard

# Run migration file
\i server/migrations/your-migration.sql
```

**Check Tables:**
```powershell
# List tables
# psql command

# Query data
# psql command
```

---

## 🚨 Troubleshooting

### Port Already in Use
```powershell
# Check what's using port 5000
netstat -ano | findstr :5000

# Stop all Node processes
Get-Process -Name node | Stop-Process -Force
```

### Database Connection Failed
```bash
# Verify Supabase database is active in dashboard
# Check internet connection
# Confirm credentials in .env file
```

### Redis Connection Issues
```powershell
# If Redis not installed locally, comment out in .env:
# REDIS_URL=redis://localhost:6379

# Or install Redis:
# https://redis.io/docs/getting-started/installation/install-redis-on-windows/
```

### Module Not Found Errors
```powershell
# Reinstall dependencies
cd server
npm ci

# Frontend dependencies
cd ..
npm ci
```

### TypeScript Errors
```powershell
# Rebuild TypeScript
cd server
npm run build

# Check types
npx tsc --noEmit
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [LOCAL_DEVELOPMENT_SUCCESS.md](./LOCAL_DEVELOPMENT_SUCCESS.md) | Complete setup summary |
| [SUPABASE_DATABASE_SETUP.md](../02-setup-configuration/SUPABASE_DATABASE_SETUP.md) | Supabase database configuration |
| [README.md](../README.md) | Project overview |
| [DOCKER_SETUP_SUMMARY.md](../03-development/DOCKER_SETUP_SUMMARY.md) | Docker deployment guide |

---

## 🎯 Next Steps

1. **✅ DONE** - Environment configured and running
2. **Add AI Provider Keys** (Optional)
   - Edit `server/.env`
   - Add `OPENAI_API_KEY=sk-...`
   - Restart backend
3. **Test Document Generation**
   - Create a template
   - Run document generation
   - Verify AI enhancement
4. **Explore Features**
   - AI Providers Management
   - Template System
   - Project Management
   - Analytics Dashboard

---

## 💡 Tips

- 💾 **Auto-save enabled** - Changes reflect immediately
- 🔍 **Use DevTools** - Browser console shows detailed errors
- 📝 **Keep logs open** - Monitor backend terminal for issues
- 🔄 **Restart if stuck** - `Get-Process -Name node | Stop-Process -Force`
- 📖 **Read docs** - Check markdown files for detailed guides

---

## 📞 Quick Help

**Backend not starting?**
```powershell
cd server
npm ci          # Reinstall packages
npm run dev     # Start server
```

**Frontend not loading?**
```powershell
npm ci          # Reinstall packages
npm run dev     # Start server
```

**Database connection error?**
```powershell
# Verify environment variables
cd server
node -e "require('dotenv').config(); console.log('DB_HOST:', process.env.DB_HOST)"
```

---

**Status**: ✅ All Systems Operational  
**Environment**: Local Development  
**Database**: Supabase PostgreSQL (Cloud)  
**Last Updated**: December 11, 2025

🎉 **Happy Coding!**

