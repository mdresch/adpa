# Create Supabase .env file for ADPA
# Your Supabase project: blxzjbxczpmmgiwbtmdo

Write-Host "🚀 Creating Supabase Environment Configuration" -ForegroundColor Cyan
Write-Host ""

# Your Supabase connection details
$SUPABASE_PROJECT_REF = "blxzjbxczpmmgiwbtmdo"
$DATABASE_PASSWORD = "QueIQ4Klopman$"
$SUPABASE_URL = "https://blxzjbxczpmmgiwbtmdo.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJseHpqYnhjenBtbWdpd2J0bWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjIwMzAsImV4cCI6MjA3NjQ5ODAzMH0.2U4c5wrUBAD6BM8yRwJcS0MwgcSEVpzfS3gXUeVtNYM"

Write-Host "Select your Supabase region:" -ForegroundColor Yellow
Write-Host "1. US East (N. Virginia) - us-east-1 [RECOMMENDED if Vercel in iad1]" -ForegroundColor White
Write-Host "2. US West (Oregon) - us-west-2 [If Vercel in sfo1]" -ForegroundColor White
Write-Host "3. South America (São Paulo) - sa-east-1" -ForegroundColor White
Write-Host ""

$regionChoice = Read-Host "Enter choice (1/2/3) [default: 1]"

$region = switch ($regionChoice) {
    "2" { "us-west-2" }
    "3" { "sa-east-1" }
    default { "us-east-1" }
}

Write-Host "✅ Selected region: $region" -ForegroundColor Green
Write-Host ""

# Build connection strings
$POOLING_URL = "postgresql://postgres.${SUPABASE_PROJECT_REF}:${DATABASE_PASSWORD}@aws-0-${region}.pooler.supabase.com:6543/postgres"
$DIRECT_URL = "postgresql://postgres:${DATABASE_PASSWORD}@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres"

# Create server/.env content
$envContent = @"
# ADPA Backend Environment Configuration
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# Database: Supabase (CBA/ADPA)
# Region: $region

# ==================== DATABASE CONFIGURATION ====================

# Supabase PostgreSQL - Connection Pooling (RECOMMENDED)
DATABASE_URL=$POOLING_URL

# Alternative: Direct Connection (use if pooling has issues)
# DATABASE_URL=$DIRECT_URL

# ==================== SUPABASE CONFIGURATION ====================

SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_PROJECT_REF=$SUPABASE_PROJECT_REF

# ==================== REDIS CONFIGURATION ====================

REDIS_URL=redis://localhost:6379
# Update with your Redis Cloud/Upstash URL if using cloud Redis

# ==================== SERVER CONFIGURATION ====================

PORT=5000
NODE_ENV=development

# ==================== JWT & SESSION ====================

JWT_SECRET=your-super-secret-jwt-key-change-in-production-$(Get-Random -Maximum 999999)
SESSION_SECRET=your-super-secret-session-key-change-in-production-$(Get-Random -Maximum 999999)

# ==================== AI PROVIDER CONFIGURATION ====================

# AI Gateway API Key (stored in database)
# Individual provider keys for direct fallback:
# OPENAI_API_KEY=
# GOOGLE_AI_API_KEY=
# MISTRAL_API_KEY=
# ANTHROPIC_API_KEY=
# GROQ_API_KEY=

# ==================== FILE UPLOAD CONFIGURATION ====================

MAX_FILE_SIZE=52428800
UPLOAD_DIR=./uploads

# ==================== LOGGING ====================

LOG_LEVEL=info
LOG_DIR=./logs

# ================================================================
"@

# Write server/.env
$envPath = "server\.env"
Set-Content -Path $envPath -Value $envContent
Write-Host "✅ Created server\.env with Supabase configuration" -ForegroundColor Green
Write-Host ""

# Create frontend .env.local
$frontendEnvContent = @"
# ADPA Frontend Environment Configuration
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# ==================== SUPABASE CONFIGURATION ====================

NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# ==================== API CONFIGURATION ====================

# Development
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Production (update when deploying)
# NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api

# ==================== WEBSOCKET CONFIGURATION ====================

NEXT_PUBLIC_WS_URL=http://localhost:5000

# ================================================================
"@

$frontendEnvPath = ".env.local"
Set-Content -Path $frontendEnvPath -Value $frontendEnvContent
Write-Host "✅ Created .env.local with Supabase configuration" -ForegroundColor Green
Write-Host ""

# Display summary
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "📋 Configuration Summary" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database Connection:" -ForegroundColor Yellow
Write-Host "   Mode: Connection Pooling (port 6543)" -ForegroundColor White
Write-Host "   Region: $region" -ForegroundColor White
Write-Host "   URL: $POOLING_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "Files Created:" -ForegroundColor Yellow
Write-Host "   ✅ server\.env" -ForegroundColor Green
Write-Host "   ✅ .env.local" -ForegroundColor Green
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "🎯 Next Steps" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Run migrations:" -ForegroundColor Yellow
Write-Host "   cd server" -ForegroundColor White
Write-Host "   node scripts/apply-baseline-migration.js" -ForegroundColor White
Write-Host "   node scripts/create-change-request-template.js" -ForegroundColor White
Write-Host ""
Write-Host "2. Verify tables:" -ForegroundColor Yellow
Write-Host "   node scripts/check-baseline-tables.js" -ForegroundColor White
Write-Host ""
Write-Host "3. Start backend:" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "4. Start frontend (new terminal):" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "5. Access application:" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Backend: http://localhost:5000/health" -ForegroundColor Cyan
Write-Host "   Supabase: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF" -ForegroundColor Cyan
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

