# Quick Supabase Setup for ADPA
# Run this after creating Supabase project and updating .env

Write-Host "🚀 ADPA Supabase Migration Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (!(Test-Path "server\.env")) {
    Write-Host "❌ server\.env not found!" -ForegroundColor Red
    Write-Host "Please create server\.env with DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

# Check if DATABASE_URL contains supabase
$envContent = Get-Content "server\.env" -Raw
if ($envContent -notmatch "supabase\.co") {
    Write-Host "⚠️  DATABASE_URL doesn't contain 'supabase.co'" -ForegroundColor Yellow
    Write-Host "Make sure you've updated DATABASE_URL in server\.env" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host "✅ Environment configured" -ForegroundColor Green
Write-Host ""

# Navigate to server directory
Set-Location server

# Run baseline migration
Write-Host "📊 Running baseline drift detection migration..." -ForegroundColor Cyan
node scripts/apply-baseline-migration.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Baseline migration failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Baseline tables created" -ForegroundColor Green
Write-Host ""

# Create Change Request template
Write-Host "📄 Creating Change Request template..." -ForegroundColor Cyan
node scripts/create-change-request-template.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Template creation failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Change Request template created" -ForegroundColor Green
Write-Host ""

# Verify tables
Write-Host "🔍 Verifying database tables..." -ForegroundColor Cyan
node scripts/check-baseline-tables.js
Write-Host ""

# Summary
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Supabase Migration Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Start backend: npm run dev" -ForegroundColor White
Write-Host "2. Start frontend: cd ..\frontend && npm run dev" -ForegroundColor White
Write-Host "3. Test connection: http://localhost:5000/health" -ForegroundColor White
Write-Host "4. Upload Change Requests via UI" -ForegroundColor White
Write-Host ""
Write-Host "Supabase Dashboard: https://supabase.com/dashboard" -ForegroundColor Cyan
Write-Host ""

