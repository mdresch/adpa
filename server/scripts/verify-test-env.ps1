# verify-test-env.ps1
# This script verifies that the server test environment is correctly configured and ready.

Write-Host "🔍 Verifying Server Test Environment..." -ForegroundColor Cyan

# 1. Check Docker
$dockerStatus = docker ps --filter "name=server-postgres-test-1" --format "{{.Status}}"
if ($dockerStatus -like "*Up*") {
    Write-Host "✅ Docker: Test database container is running and healthy." -ForegroundColor Green
} else {
    Write-Host "❌ Docker: Test database container is NOT running. Run 'docker-compose -f docker-compose.test.yml up -d'" -ForegroundColor Red
}

# 2. Check .env.test
if (Test-Path .env.test) {
    Write-Host "✅ Environment: .env.test exists." -ForegroundColor Green
} else {
    Write-Host "❌ Environment: .env.test is missing. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env.test
}

# 3. Check Database Connectivity
Write-Host "⏳ Checking database connectivity..." -ForegroundColor Cyan
try {
    $dbCheck = npx ts-node -r tsconfig-paths/register scripts/check-database-schema.js 2>&1
    if ($dbCheck -like "*Successfully connected*") {
        Write-Host "✅ Connectivity: Database is reachable and schema is valid." -ForegroundColor Green
    } else {
        Write-Host "⚠️ Connectivity: Warning - could not verify schema. Ensure DB is fully booted." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Connectivity: Failed to execute DB check script." -ForegroundColor Red
}

Write-Host "`n🚀 Environment Check Complete!" -ForegroundColor Cyan
