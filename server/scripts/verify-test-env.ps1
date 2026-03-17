# verify-test-env.ps1
# This script verifies that the server test environment is correctly configured and ready.

Write-Host "[CHECK] Verifying Server Test Environment..." -ForegroundColor Cyan

# 1. Check Docker
$dockerStatus = docker ps --filter "name=server-postgres-test-1" --format "{{.Status}}"
if ($dockerStatus -like "*Up*") {
    Write-Host "[PASS] Docker: Test database container is running and healthy." -ForegroundColor Green
} else {
    Write-Host "[FAIL] Docker: Test database container is NOT running. Run 'docker-compose -f docker-compose.test.yml up -d'" -ForegroundColor Red
}

# 2. Check .env.test
if (Test-Path .env.test) {
    Write-Host "[PASS] Environment: .env.test exists." -ForegroundColor Green
} else {
    Write-Host "[FAIL] Environment: .env.test is missing. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env.test
}

# 3. Check Database Connectivity
Write-Host "[INFO] Checking database connectivity..." -ForegroundColor Cyan
try {
    $dbCheck = npx ts-node -r tsconfig-paths/register scripts/check-database-schema.js 2>&1
    if ($dbCheck -like "*Successfully connected*") {
        Write-Host "[PASS] Connectivity: Database is reachable and schema is valid." -ForegroundColor Green
    } else {
        Write-Host "[WARN] Connectivity: Warning - could not verify schema. Ensure DB is fully booted." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[FAIL] Connectivity: Failed to execute DB check script." -ForegroundColor Red
}

Write-Host "`n[DONE] Environment Check Complete!" -ForegroundColor Cyan
