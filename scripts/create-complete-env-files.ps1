# Create Complete ADPA Environment Files
# All infrastructure configured: Supabase + Upstash + Railway

Write-Host "🚀 Creating Complete ADPA Environment Configuration" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# Your infrastructure details
$SUPABASE_URL = "https://blxzjbxczpmmgiwbtmdo.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJseHpqYnhjenBtbWdpd2J0bWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjIwMzAsImV4cCI6MjA3NjQ5ODAzMH0.2U4c5wrUBAD6BM8yRwJcS0MwgcSEVpzfS3gXUeVtNYM"
$SUPABASE_PROJECT_REF = "blxzjbxczpmmgiwbtmdo"
$DATABASE_PASSWORD = "QueIQ4Klopman$"
$DATABASE_URL = "postgresql://postgres:${DATABASE_PASSWORD}@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres"

$UPSTASH_REDIS_REST_URL = "https://natural-vulture-7034.upstash.io"
$UPSTASH_REDIS_REST_TOKEN = "ARt6AAImcDIwMjg1MzZkM2Y0ZTE0MGVhOTIzNTRjOWQ3NmIyMDUxM3AyNzAzNA"
$REDIS_HOST = "natural-vulture-7034.upstash.io"

$RAILWAY_URL = "https://adpa-production.up.railway.app"

Write-Host "📋 Infrastructure Summary:" -ForegroundColor Yellow
Write-Host "   Database: Supabase PostgreSQL" -ForegroundColor White
Write-Host "   Cache: Upstash Redis" -ForegroundColor White
Write-Host "   Backend: Railway" -ForegroundColor White
Write-Host "   Frontend: Vercel" -ForegroundColor White
Write-Host ""

# Note: For standard Redis (ioredis), we need the Redis protocol URL with password
# Get from Upstash console: https://console.upstash.com
Write-Host "⚠️  IMPORTANT: Get your Redis password from Upstash" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to: https://console.upstash.com" -ForegroundColor Cyan
Write-Host "2. Find database: natural-vulture-7034" -ForegroundColor White
Write-Host "3. Copy the 'Redis Connect' URL (format: rediss://default:PASSWORD@...)" -ForegroundColor White
Write-Host ""
$redisPassword = Read-Host "Paste Redis password (from rediss://default:PASSWORD@...)"

if ($redisPassword) {
    $REDIS_URL = "rediss://default:${redisPassword}@${REDIS_HOST}:6379"
    Write-Host "✅ Redis URL configured" -ForegroundColor Green
} else {
    Write-Host "⚠️  Skipping Redis URL - you'll need to add it manually" -ForegroundColor Yellow
    $REDIS_URL = "rediss://default:YOUR_PASSWORD@${REDIS_HOST}:6379"
}
Write-Host ""

# Create server/.env
$serverEnvContent = @"
# ==================== ADPA BACKEND CONFIGURATION ====================
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# Environment: Development
# Infrastructure: Supabase + Upstash + Railway

# ==================== DATABASE (SUPABASE) ====================

DATABASE_URL=$DATABASE_URL

# Supabase Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_PROJECT_REF=$SUPABASE_PROJECT_REF

# ==================== REDIS CACHE (UPSTASH) ====================

# Standard Redis protocol (for ioredis)
REDIS_URL=$REDIS_URL
REDIS_HOST=$REDIS_HOST
REDIS_PORT=6379
REDIS_TLS=true

# REST API (alternative)
UPSTASH_REDIS_REST_URL=$UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN=$UPSTASH_REDIS_REST_TOKEN

# ==================== SERVER CONFIGURATION ====================

PORT=5000
NODE_ENV=development

# ==================== SECURITY ====================

JWT_SECRET=adpa-jwt-secret-dev-$(Get-Random -Maximum 999999)
SESSION_SECRET=adpa-session-secret-dev-$(Get-Random -Maximum 999999)

# ==================== FRONTEND URL ====================

FRONTEND_URL=http://localhost:3000

# ==================== FILE UPLOADS ====================

MAX_FILE_SIZE=52428800
UPLOAD_DIR=./uploads

# ==================== LOGGING ====================

LOG_LEVEL=info
LOG_DIR=./logs

# ==================== AI PROVIDERS (OPTIONAL) ====================

# AI keys stored in database, fallbacks here:
# OPENAI_API_KEY=
# GOOGLE_AI_API_KEY=
# MISTRAL_API_KEY=
# ANTHROPIC_API_KEY=
# GROQ_API_KEY=

# ================================================================
"@

# Create frontend .env.local
$frontendEnvContent = @"
# ==================== ADPA FRONTEND CONFIGURATION ====================
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# ==================== SUPABASE ====================

NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# ==================== API ENDPOINTS ====================

# Development (local backend)
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WS_URL=http://localhost:5000

# Production (Railway backend) - uncomment for production build
# NEXT_PUBLIC_API_URL=$RAILWAY_URL/api
# NEXT_PUBLIC_WS_URL=$RAILWAY_URL

# ================================================================
"@

# Write files
Set-Content -Path "server\.env" -Value $serverEnvContent -Encoding UTF8
Set-Content -Path ".env.local" -Value $frontendEnvContent -Encoding UTF8

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "✅ Environment Files Created!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files created:" -ForegroundColor Yellow
Write-Host "   ✅ server\.env" -ForegroundColor Green
Write-Host "   ✅ .env.local" -ForegroundColor Green
Write-Host ""

if (-not $redisPassword) {
    Write-Host "⚠️  ACTION REQUIRED: Update REDIS_URL in server\.env" -ForegroundColor Yellow
    Write-Host "   Get password from: https://console.upstash.com" -ForegroundColor White
    Write-Host ""
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Run migrations:" -ForegroundColor Yellow
Write-Host "   cd D:\source\repos\adpa" -ForegroundColor White
Write-Host "   node scripts/apply-baseline-migration.js" -ForegroundColor White
Write-Host "   node scripts/create-change-request-template.js" -ForegroundColor White
Write-Host ""
Write-Host "2. Verify setup:" -ForegroundColor Yellow
Write-Host "   node scripts/check-baseline-tables.js" -ForegroundColor White
Write-Host ""
Write-Host "3. Start backend:" -ForegroundColor Yellow
Write-Host "   cd server" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "4. Start frontend (new terminal):" -ForegroundColor Yellow
Write-Host "   cd D:\source\repos\adpa" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "5. Test application:" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Backend: http://localhost:5000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "6. Upload Change Requests:" -ForegroundColor Yellow
Write-Host "   Projects → Select Project → Documents → Upload Document" -ForegroundColor White
Write-Host "   Select 'Change Request (CR)' template" -ForegroundColor White
Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

