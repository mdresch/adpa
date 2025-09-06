@echo off
REM Docker Configuration Validator for ADPA Project
REM This script validates that Docker configurations are correct and haven't been accidentally modified

echo 🔍 Validating Docker Configuration...

REM Colors for output (Windows CMD)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "NC=[0m"

set ERROR_COUNT=0

:check_file
REM Function to check if a file contains expected content
REM Usage: call :check_file "filename" "pattern" "description"
setlocal enabledelayedexpansion
set "file=%~1"
set "pattern=%~2"
set "description=%~3"

if not exist "%file%" (
    echo ❌ File not found: %file%
    set /a ERROR_COUNT+=1
    goto :eof
)

findstr /c:"%pattern%" "%file%" >nul 2>&1
if errorlevel 1 (
    echo ❌ %description% not found in %file%
    echo    Expected pattern: %pattern%
    set /a ERROR_COUNT+=1
) else (
    echo ✅ %description% found in %file%
)
goto :eof

echo.
echo 📋 Checking Docker Compose Files...

echo.
echo 🔧 Checking docker-compose.yml...
call :check_file "docker-compose.yml" "container_name: adpa-postgres" "PostgreSQL service"
call :check_file "docker-compose.yml" "container_name: adpa-redis" "Redis service"
call :check_file "docker-compose.yml" "container_name: adpa-backend" "Backend service"
call :check_file "docker-compose.yml" "container_name: adpa-frontend" "Frontend service"
call :check_file "docker-compose.yml" "DB_HOST=postgres" "Database host configuration"
call :check_file "docker-compose.yml" "REDIS_URL=redis://redis:6379" "Redis URL configuration"

echo.
echo 🔧 Checking docker-compose.dev.yml...
call :check_file "docker-compose.dev.yml" "volumes:" "Volume mounts for development"
call :check_file "docker-compose.dev.yml" "./server/src:/app/src" "Backend source volume mount"
call :check_file "docker-compose.dev.yml" "command: npm run dev" "Development command for backend"
call :check_file "docker-compose.dev.yml" "command: pnpm run dev" "Development command for frontend"

echo.
echo 🔧 Checking Server Configuration...

REM Check server database connection
call :check_file "server\src\database\connection.ts" "host: process.env.DB_HOST" "Database host environment variable"
call :check_file "server\src\database\connection.ts" "DB_HOST.*postgres" "PostgreSQL host reference"

REM Check server Redis connection
call :check_file "server\src\utils\redis.ts" "redis://redis:6379" "Redis Docker service URL"

echo.
echo 🔧 Checking Environment Configuration...

REM Check .env file for Docker-compatible settings
if exist "server\.env" (
    call :check_file "server\.env" "DB_HOST=host.docker.internal" "Docker-compatible database host"
    call :check_file "server\.env" "REDIS_URL=redis://host.docker.internal:6379" "Docker-compatible Redis URL"
) else (
    echo ⚠️  server/.env not found - this is expected in production
)

echo.
echo 🔧 Checking Docker Images...

REM Check if Docker images exist
docker images 2>nul | findstr "adpa" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ ADPA Docker images found
) else (
    echo ⚠️  No ADPA Docker images found - run 'docker-compose build' to build them
)

echo.
echo 🔧 Checking Running Containers...

REM Check if containers are running
docker ps 2>nul | findstr "adpa" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ ADPA containers are running
) else (
    echo ⚠️  No ADPA containers running - run 'docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d' to start them
)

echo.
if %ERROR_COUNT% gtr 0 (
    echo ❌ Docker Configuration Validation Failed! Found %ERROR_COUNT% issues.
    echo.
    echo 🔧 Please fix the issues above before proceeding.
    exit /b 1
) else (
    echo ✅ Docker Configuration Validation Complete!
)

echo.
echo 💡 Quick Commands:
echo    Start services: docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
echo    Stop services:  docker-compose down
echo    View logs:      docker-compose logs -f
echo    Rebuild:        docker-compose build --no-cache
echo.
echo 🔒 Remember: Always use Docker service names (postgres, redis) in configurations,
echo    never localhost or 127.0.0.1 when running in Docker containers.
