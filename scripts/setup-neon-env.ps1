# Setup Neon Database Environment Configuration
# This script creates .env files for both frontend and backend

Write-Host "🔧 Setting up Neon Database Environment Configuration..." -ForegroundColor Cyan
Write-Host ""

# Backend .env file
$backendEnv = @"
# Neon PostgreSQL Database Configuration
DB_HOST=ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech
DB_PORT=5432
DB_NAME=adpa_db
DB_USER=neondb_owner
DB_PASSWORD=npg_6H1YnZiDleEV
DB_SSL=true

# Full connection URL
POSTGRES_URL=postgresql://neondb_owner:npg_6H1YnZiDleEV@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require

# Redis Configuration (optional - comment out if not using)
# REDIS_URL=redis://localhost:6379

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=dev-secret-change-in-production-$(Get-Random -Maximum 99999)
JWT_EXPIRES_IN=24h

# AI Provider API Keys (add your keys as needed)
# OPENAI_API_KEY=
# GOOGLE_AI_API_KEY=
# ANTHROPIC_API_KEY=
# MISTRAL_API_KEY=

# File Upload Configuration
MAX_FILE_SIZE=50mb
UPLOAD_DIR=./uploads

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Logging Configuration
LOG_LEVEL=info
"@

# Frontend .env.local file
$frontendEnv = @"
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000

# Neon PostgreSQL Database Configuration
POSTGRES_URL=postgresql://neondb_owner:npg_6H1YnZiDleEV@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require
POSTGRES_PRISMA_URL=postgresql://neondb_owner:npg_6H1YnZiDleEV@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require&pgbouncer=true&connect_timeout=15
POSTGRES_URL_NON_POOLING=postgresql://neondb_owner:npg_6H1YnZiDleEV@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require

# Redis Configuration (optional)
# REDIS_URL=redis://localhost:6379

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-change-in-production-$(Get-Random -Maximum 99999)
"@

# Create backend .env file
try {
    $backendEnv | Out-File -FilePath "server\.env" -Encoding UTF8 -NoNewline
    Write-Host "✅ Created server/.env" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create server/.env: $_" -ForegroundColor Red
    exit 1
}

# Create frontend .env.local file
try {
    $frontendEnv | Out-File -FilePath ".env.local" -Encoding UTF8 -NoNewline
    Write-Host "✅ Created .env.local" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create .env.local: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Environment files created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Configuration Details:" -ForegroundColor Cyan
Write-Host "   - Database: adpa_db @ Neon (ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech)"
Write-Host "   - Backend Port: 5000"
Write-Host "   - Frontend Port: 3000"
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Start Backend:  cd server && npm run dev"
Write-Host "   2. Start Frontend: npm run dev (in new terminal)"
Write-Host ""
Write-Host "📚 For more details, see NEON_DATABASE_SETUP.md" -ForegroundColor Cyan
Write-Host ""

