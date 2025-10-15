# ADPA Development Environment Startup Script
# This script helps developers quickly start the Docker development environment

param(
    [switch]$Logs,
    [switch]$Stop,
    [switch]$Rebuild
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ADPA Docker Development Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    $dockerInfo = docker info 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not running"
    }
} catch {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if docker-compose files exist
if (!(Test-Path "docker-compose.yml")) {
    Write-Host "ERROR: docker-compose.yml not found in current directory." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (!(Test-Path "docker-compose.dev.yml")) {
    Write-Host "ERROR: docker-compose.dev.yml not found in current directory." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Handle stop command
if ($Stop) {
    Write-Host "Stopping ADPA development environment..." -ForegroundColor Yellow
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Services stopped successfully." -ForegroundColor Green
    } else {
        Write-Host "Error stopping services." -ForegroundColor Red
    }
    exit
}

# Handle rebuild command
$buildArgs = ""
if ($Rebuild) {
    Write-Host "Rebuilding Docker images..." -ForegroundColor Yellow
    $buildArgs = "--build"
}

# Start services
Write-Host "Starting ADPA development environment..." -ForegroundColor Green
Write-Host ""

$startCommand = "docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d $buildArgs"
Invoke-Expression $startCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to start Docker services." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Services Started Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "Database: localhost:5432" -ForegroundColor White
Write-Host "Redis:    localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  View logs:    docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f" -ForegroundColor White
Write-Host "  Stop all:    docker-compose -f docker-compose.yml -f docker-compose.dev.yml down" -ForegroundColor White
Write-Host "  Restart:     docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart" -ForegroundColor White
Write-Host ""

# Show logs if requested
if ($Logs) {
    Write-Host "Showing logs (Ctrl+C to stop)..." -ForegroundColor Yellow
    Write-Host ""
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
} else {
    Write-Host "Press Enter to exit..." -ForegroundColor Gray
    Read-Host
}
