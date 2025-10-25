@echo off
REM ADPA Development Environment Startup Script
REM This script helps developers quickly start the Docker development environment

echo ========================================
echo   ADPA Docker Development Environment
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Check if docker-compose files exist
if not exist "docker-compose.yml" (
    echo ERROR: docker-compose.yml not found in current directory.
    pause
    exit /b 1
)

if not exist "docker-compose.dev.yml" (
    echo ERROR: docker-compose.dev.yml not found in current directory.
    pause
    exit /b 1
)

echo Starting ADPA development environment...
echo.

REM Start services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

if %errorlevel% neq 0 (
    echo ERROR: Failed to start Docker services.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Services Started Successfully!
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo Database: localhost:5432
echo Redis:    localhost:6379
echo.
echo To view logs: docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
echo To stop: docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
echo.
echo Press any key to exit...
pause >nul
