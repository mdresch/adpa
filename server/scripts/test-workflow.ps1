# =============================================================================
# Test Docker Image Workflow (Windows PowerShell)
# =============================================================================
# This script:
#   1. Starts the test PostgreSQL container
#   2. Waits for it to be healthy
#   3. Clones schema from dev database (if needed)
#   4. Seeds minimal test data
#   5. Runs authentication and other tests
#   6. Reports results
#   7. Cleans up (stops and removes container)
# =============================================================================

param(
    [switch]$SkipCleanup,
    [switch]$KeepServer
)

# Configuration
$ContainerName = "adpa-test-workflow"
$TestDbName = "adpa_test_db"
$TestUser = "test_user"
$TestPass = "test_pass"
$TestPort = 5433
$DevContainerName = "adpa-postgres_db"
$ServerPort = 5000
$SchemaFile = ".\schema-dev.sql"
$DataFile = ".\data-seed.sql"
$SeedScript = ".\scripts\seed-test-users.js"

# Colors for output
function Write-Info { param([string]$m) Write-Host "[INFO] $m" -ForegroundColor Green }
function Write-Warn { param([string]$m) Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Write-Error { param([string]$m) Write-Host "[ERROR] $m" -ForegroundColor Red }

$ErrorActionPreference = "Stop"

# =============================================================================
# Cleanup Function
# =============================================================================
function Cleanup {
    Write-Info "Cleaning up..."
    
    # Kill server if running on test port
    $serverProc = Get-NetTCPConnection -LocalPort $ServerPort -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
    if ($serverProc) {
        Write-Info "Stopping test server on port $ServerPort"
        $serverProc | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    }
    
    # Stop and remove test container
    $container = docker ps -a --format '{{.Names}}' | Where-Object { $_ -eq $ContainerName }
    if ($container) {
        Write-Info "Stopping container $ContainerName"
        docker stop $ContainerName 2>$null | Out-Null
        Write-Info "Removing container $ContainerName"
        docker rm -f $ContainerName 2>$null | Out-Null
    }
    
    Write-Info "Cleanup complete"
}

# Set trap to cleanup on exit
if (-not $SkipCleanup) {
    trap { Cleanup }
}

# =============================================================================
# Step 1: Start Test Docker Container
# =============================================================================
Write-Info "=============================================="
Write-Info "Step 1: Starting test Docker container"
Write-Info "=============================================="

# Check if container already exists and remove
$existingContainer = docker ps -a --format '{{.Names}}' | Where-Object { $_ -eq $ContainerName }
if ($existingContainer) {
    Write-Warn "Container $ContainerName exists, removing..."
    docker rm -f $ContainerName 2>$null | Out-Null
}

# Also check if something is using the test port and remove it
$portInUse = Get-NetTCPConnection -LocalPort $TestPort -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Warn "Port $TestPort is in use, cleaning up..."
    $portInUse | ForEach-Object { 
        try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
    }
    Start-Sleep -Seconds 2
}

# Start test PostgreSQL container
$dockerArgs = @(
    "run", "-d", "--name", $ContainerName,
    "-e", "POSTGRES_USER=$TestUser",
    "-e", "POSTGRES_PASSWORD=$TestPass",
    "-e", "POSTGRES_DB=$TestDbName",
    "-p", "$TestPort`:5432",
    "--health-cmd=pg_isready -U $TestUser -d $TestDbName",
    "--health-interval=2s",
    "--health-timeout=5s",
    "--health-retries=10",
    "postgres:15-alpine"
)
docker @dockerArgs | Out-Null

Write-Info "Container $ContainerName started"

# =============================================================================
# Step 2: Wait for Container to be Healthy
# =============================================================================
Write-Info "=============================================="
Write-Info "Step 2: Waiting for container to be healthy"
Write-Info "=============================================="

$attempts = 0
$maxAttempts = 30

while ($attempts -lt $maxAttempts) {
    $inspect = docker inspect $ContainerName 2>$null | ConvertFrom-Json
    $state = $inspect.State.Status
    $health = $inspect.State.Health.Status
    
    if ($state -eq "running") {
        if ($health -eq "healthy" -or $health -eq $null) {
            Write-Info "Container is running!"
            break
        }
    }
    
    Write-Info "Waiting for container to start... (state: $state, health: $health)"
    Start-Sleep -Seconds 2
    $attempts++
    
    if ($attempts -eq $maxAttempts) {
        Write-Error "Container failed to start"
        exit 1
    }
}

# Additional wait for PostgreSQL to be fully ready
Start-Sleep -Seconds 2
Write-Info "Test database ready on port $TestPort"

# =============================================================================
# Step 3: Clone Schema from Dev Database
# =============================================================================
Write-Info "=============================================="
Write-Info "Step 3: Cloning schema from dev database"
Write-Info "=============================================="

# Check if schema file exists, if not create it
if (-not (Test-Path $SchemaFile)) {
    Write-Info "Schema file not found, dumping from dev database..."
    docker exec $DevContainerName pg_dump -U myuser -d adpa --schema-only --no-owner --no-privileges 2>$null | Out-File -FilePath $SchemaFile -Encoding UTF8
    Write-Info "Schema saved to $SchemaFile"
} else {
    Write-Info "Using existing schema file: $SchemaFile"
}

# Import schema to test database
Write-Info "Importing schema to test database..."
Get-Content $SchemaFile | docker exec -i $ContainerName psql -U $TestUser -d $TestDbName 2>$null | Out-Null
Write-Info "Schema imported successfully"

# =============================================================================
# Step 4: Seed Test Data
# =============================================================================
Write-Info "=============================================="
Write-Info "Step 4: Seeding test data"
Write-Info "=============================================="

# Check if data file exists, if not create minimal seed
if (-not (Test-Path $DataFile)) {
    Write-Info "Data file not found, seeding from dev database..."
    docker exec $DevContainerName pg_dump -U myuser -d adpa --data-only --no-owner --no-privileges --table=companies --table=ai_providers 2>$null | Out-File -FilePath $DataFile -Encoding UTF8
}

# Import seed data
if (Test-Path $DataFile) {
    Write-Info "Importing seed data..."
    Get-Content $DataFile | docker exec -i $ContainerName psql -U $TestUser -d $TestDbName 2>$null | Out-Null
}

# Seed test users
Write-Info "Seeding test users..."
$env:DATABASE_URL = "postgresql://${TestUser}:${TestPass}@localhost:${TestPort}/${TestDbName}"
Push-Location .\server
node $SeedScript 2>$null | Out-Null
Pop-Location

Write-Info "Test data seeded successfully"

# =============================================================================
# Step 5: Run Tests
# =============================================================================
Write-Info "=============================================="
Write-Info "Step 5: Running tests"
Write-Info "=============================================="

# Set environment for tests
$env:DATABASE_URL = "postgresql://${TestUser}:${TestPass}@localhost:${TestPort}/${TestDbName}"
$env:JWT_SECRET = "test-jwt-secret"
$env:NODE_ENV = "test"

# Start server in background
Write-Info "Starting test server..."
$serverJob = Start-Job -ScriptBlock {
    param($port, $dbUrl, $jwt)
    $env:DATABASE_URL = $dbUrl
    $env:JWT_SECRET = $jwt
    $env:NODE_ENV = "test"
    Set-Location ".\server"
    pnpm start
} -ArgumentList $ServerPort, $env:DATABASE_URL, $env:JWT_SECRET

# Wait for server to start
Write-Info "Waiting for server to start..."
Start-Sleep -Seconds 12

# Check if server is running
try {
    $null = Invoke-WebRequest -Uri "http://localhost`:$ServerPort/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Info "Server running on port $ServerPort"
} catch {
    Write-Error "Server failed to start"
    Receive-Job $serverJob | Select-Object -First 20
    exit 1
}

# Test results tracking
$testsPassed = 0
$testsFailed = 0

# -----------------------------------------------------------------------------
# Test 1: Authentication - Valid Login
# -----------------------------------------------------------------------------
Write-Info "Test 1: Authentication - Valid Login"
$response = Invoke-RestMethod -Uri "http://localhost`:$ServerPort/api/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"email":"admin@adpa.com","password":"admin123"}' `
    -ErrorAction SilentlyContinue

if ($response.success -eq $true) {
    Write-Info "  [OK] Valid login works"
    $testsPassed++
    $token = $response.token
} else {
    Write-Error "  [FAIL] Valid login failed"
    $testsFailed++
}

# -----------------------------------------------------------------------------
# Test 2: Authentication - Invalid Password
# -----------------------------------------------------------------------------
Write-Info "Test 2: Authentication - Invalid Password"
try {
    $response = Invoke-RestMethod -Uri "http://localhost`:$ServerPort/api/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body '{"email":"admin@adpa.com","password":"wrongpassword"}' `
        -ErrorAction SilentlyContinue
    
    if ($response.error -eq "Invalid credentials") {
        Write-Info "  [OK] Invalid password rejected"
        $testsPassed++
    } else {
        Write-Error "  [FAIL] Invalid password not rejected"
        $testsFailed++
    }
} catch {
    Write-Error "  [FAIL] Invalid password not rejected"
    $testsFailed++
}

# -----------------------------------------------------------------------------
# Test 3: Authentication - Get Current User
# -----------------------------------------------------------------------------
Write-Info "Test 3: Authentication - Get Current User"
try {
    $response = Invoke-RestMethod -Uri "http://localhost`:$ServerPort/api/auth/me" `
        -Headers @{ Authorization = "Bearer $token" } `
        -ErrorAction SilentlyContinue
    
    if ($response.success -eq $true) {
        Write-Info "  [OK] Get current user works"
        $testsPassed++
    } else {
        Write-Error "  [FAIL] Get current user failed"
        $testsFailed++
    }
} catch {
    Write-Error "  [FAIL] Get current user failed"
    $testsFailed++
}

# -----------------------------------------------------------------------------
# Test 4: Authentication - Invalid Token
# -----------------------------------------------------------------------------
Write-Info "Test 4: Authentication - Invalid Token"
try {
    $response = Invoke-RestMethod -Uri "http://localhost`:$ServerPort/api/auth/me" `
        -Headers @{ Authorization = "Bearer invalid-token" } `
        -ErrorAction SilentlyContinue
    
    if ($response.error) {
        Write-Info "  [OK] Invalid token rejected"
        $testsPassed++
    } else {
        Write-Error "  [FAIL] Invalid token not rejected"
        $testsFailed++
    }
} catch {
    Write-Info "  [OK] Invalid token rejected"
    $testsPassed++
}

# -----------------------------------------------------------------------------
# Test 5: Authentication - Missing Token
# -----------------------------------------------------------------------------
Write-Info "Test 5: Authentication - Missing Token"
try {
    $response = Invoke-RestMethod -Uri "http://localhost`:$ServerPort/api/auth/me" `
        -ErrorAction SilentlyContinue
    
    if ($response.error -eq "Access token required") {
        Write-Info "  [OK] Missing token rejected"
        $testsPassed++
    } else {
        Write-Error "  [FAIL] Missing token not rejected"
        $testsFailed++
    }
} catch {
    Write-Error "  [FAIL] Missing token not rejected"
    $testsFailed++
}

# -----------------------------------------------------------------------------
# Test 6: Health Check
# -----------------------------------------------------------------------------
Write-Info "Test 6: Health Check"
try {
    $response = Invoke-RestMethod -Uri "http://localhost`:$ServerPort/health" `
        -ErrorAction SilentlyContinue
    
    if ($response.status -eq "healthy") {
        Write-Info "  [OK] Health check passes"
        $testsPassed++
    } else {
        Write-Error "  [FAIL] Health check failed"
        $testsFailed++
    }
} catch {
    Write-Error "  [FAIL] Health check failed"
    $testsFailed++
}

# -----------------------------------------------------------------------------
# Test 7: Database Connection
# -----------------------------------------------------------------------------
Write-Info "Test 7: Database Connection"
$result = docker exec $ContainerName psql -U $TestUser -d $TestDbName -c "SELECT COUNT(*) FROM users" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Info "  [OK] Database connection works"
    $testsPassed++
} else {
    Write-Error "  [FAIL] Database connection failed"
    $testsFailed++
}

# =============================================================================
# Step 6: Summary
# =============================================================================
Write-Info "=============================================="
Write-Info "Test Results Summary"
Write-Info "=============================================="
Write-Info "Tests Passed: $testsPassed"
Write-Info "Tests Failed: $testsFailed"

if ($testsFailed -eq 0) {
    Write-Info "All tests passed!"
    $exitCode = 0
} else {
    Write-Error "Some tests failed!"
    $exitCode = 1
}

# =============================================================================
# Step 7: Cleanup
# =============================================================================
if (-not $SkipCleanup) {
    Write-Info "=============================================="
    Write-Info "Cleaning up..."
    Write-Info "=============================================="
    
    # Stop server job
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -Force -ErrorAction SilentlyContinue
    
    # Kill any process on server port
    $serverProc = Get-NetTCPConnection -LocalPort $ServerPort -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
    if ($serverProc) {
        $serverProc | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    }
    
    # Stop and remove container
    docker stop $ContainerName 2>$null | Out-Null
    docker rm -f $ContainerName 2>$null | Out-Null
    
    Write-Info "Workflow complete!"
}

exit $exitCode
