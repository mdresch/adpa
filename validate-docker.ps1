# ADPA Docker Configuration Validator
# This script validates that Docker configurations are correct

Write-Host "Validating Docker Configuration..." -ForegroundColor Cyan

$ErrorCount = 0

function Test-FileContent {
    param(
        [string]$FilePath,
        [string]$Pattern,
        [string]$Description
    )

    if (!(Test-Path $FilePath)) {
        Write-Host "ERROR: File not found: $FilePath" -ForegroundColor Red
        $script:ErrorCount++
        return
    }

    $content = Get-Content $FilePath -Raw
    if ($content -match $Pattern) {
        Write-Host "OK: $Description found in $FilePath" -ForegroundColor Green
    } else {
        Write-Host "ERROR: $Description not found in $FilePath" -ForegroundColor Red
        Write-Host "   Expected pattern: $Pattern" -ForegroundColor Yellow
        $script:ErrorCount++
    }
}

Write-Host ""
Write-Host "Checking Docker Compose Files..."

Test-FileContent "docker-compose.yml" "container_name: adpa-postgres" "PostgreSQL service"
Test-FileContent "docker-compose.yml" "container_name: adpa-redis" "Redis service"
Test-FileContent "docker-compose.yml" "container_name: adpa-backend" "Backend service"
Test-FileContent "docker-compose.yml" "container_name: adpa-frontend" "Frontend service"
Test-FileContent "docker-compose.yml" "DB_HOST=postgres" "Database host configuration"
Test-FileContent "docker-compose.yml" "REDIS_URL=redis://redis:6379" "Redis URL configuration"

Write-Host ""
Write-Host "Checking Development Overrides..."

Test-FileContent "docker-compose.dev.yml" "volumes:" "Volume mounts for development"
Test-FileContent "docker-compose.dev.yml" "./server/src:/app/src" "Backend source volume mount"
Test-FileContent "docker-compose.dev.yml" "command: npm run dev" "Development command for backend"
Test-FileContent "docker-compose.dev.yml" "command: pnpm run dev" "Development command for frontend"

Write-Host ""
Write-Host "Checking Server Configuration..."

Test-FileContent "server/src/database/connection.ts" "host: process.env.DB_HOST" "Database host environment variable"
Test-FileContent "server/src/database/connection.ts" "DB_HOST.*postgres" "PostgreSQL host reference"
Test-FileContent "server/src/utils/redis.ts" "redis://redis:6379" "Redis Docker service URL"

Write-Host ""
Write-Host "Checking Docker Services..."

# Check if Docker is running
try {
    $null = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK: Docker is installed and running" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Docker is not available" -ForegroundColor Red
        $ErrorCount++
    }
} catch {
    Write-Host "ERROR: Docker is not available" -ForegroundColor Red
    $ErrorCount++
}

# Check running containers
try {
    $containers = docker ps --format "{{.Names}}" 2>$null
    $adpaContainers = $containers | Where-Object { $_ -like "*adpa*" }
    if ($adpaContainers.Count -gt 0) {
        Write-Host "OK: ADPA containers are running ($($adpaContainers.Count) found)" -ForegroundColor Green
    } else {
        Write-Host "WARNING: No ADPA containers running - run 'docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d' to start them" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR: Cannot check running containers" -ForegroundColor Red
}

Write-Host ""
if ($ErrorCount -gt 0) {
    Write-Host "VALIDATION FAILED: Found $ErrorCount issues." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix the issues above before proceeding." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "VALIDATION COMPLETE: All checks passed!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Quick Commands:" -ForegroundColor Cyan
Write-Host "   Start services: docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d"
Write-Host "   Stop services:  docker-compose down"
Write-Host "   View logs:      docker-compose logs -f"
Write-Host "   Rebuild:        docker-compose build --no-cache"
Write-Host ""
Write-Host "IMPORTANT: Always use Docker service names (postgres, redis) in configurations," -ForegroundColor Magenta
Write-Host "   never localhost or 127.0.0.1 when running in Docker containers." -ForegroundColor Magenta
