# Simple End-to-End Test Runner
# Runs basic E2E tests that don't require full pipeline compilation

param(
    [switch]$Verbose = $false,
    [switch]$Coverage = $false
)

Write-Host "Starting Simple E2E Tests" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan

# Set up environment
$env:NODE_ENV = "test"
$env:LOG_LEVEL = if ($Verbose) { "debug" } else { "info" }

# Function to check prerequisites
function Test-Prerequisites {
    Write-Host "Checking prerequisites..." -ForegroundColor Blue
    
    # Check if Node.js is installed
    try {
        $nodeVersion = node --version
        Write-Host "Node.js: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "Node.js not found. Please install Node.js first." -ForegroundColor Red
        return $false
    }
    
    # Check if Jest is installed
    try {
        $jestVersion = npx jest --version
        Write-Host "Jest: $jestVersion" -ForegroundColor Green
    } catch {
        Write-Host "Jest not found. Installing Jest..." -ForegroundColor Yellow
        npm install --save-dev jest @types/jest ts-jest
    }
    
    return $true
}

# Function to run simple E2E tests
function Run-SimpleE2ETests {
    Write-Host "Running Simple E2E Tests" -ForegroundColor Yellow
    
    $testCommand = "npx jest `"src/tests/e2e/simple-pipeline.test.ts`" --testTimeout=60000"
    
    if ($Coverage) {
        $testCommand += " --coverage"
    }
    
    if ($Verbose) {
        $testCommand += " --verbose"
    }
    
    Write-Host "Command: $testCommand" -ForegroundColor Gray
    
    try {
        $startTime = Get-Date
        Invoke-Expression $testCommand
        $endTime = Get-Date
        $duration = $endTime - $startTime
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Simple E2E tests passed in $($duration.TotalSeconds.ToString('F1')) seconds" -ForegroundColor Green
            return $true
        } else {
            Write-Host "Simple E2E tests failed after $($duration.TotalSeconds.ToString('F1')) seconds" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Simple E2E tests crashed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to test database connectivity
function Test-DatabaseConnectivity {
    Write-Host "Testing Database Connectivity" -ForegroundColor Blue
    
    try {
        node -e "
        const { pool } = require('./dist/database/connection');
        pool.query('SELECT 1').then(() => {
            console.log('Database connection successful');
            process.exit(0);
        }).catch(err => {
            console.log('Database connection failed:', err.message);
            process.exit(1);
        });
        "
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Database connectivity test passed" -ForegroundColor Green
            return $true
        } else {
            Write-Host "Database connectivity test failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Database connectivity test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main execution
function Main {
    Write-Host "Starting Simple E2E Test Execution" -ForegroundColor Green
    
    # Check prerequisites
    if (!(Test-Prerequisites)) {
        Write-Host "Prerequisites check failed. Exiting." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "All prerequisites met. Starting tests..." -ForegroundColor Green
    
    $overallStartTime = Get-Date
    
    # Test database connectivity
    $databaseConnected = Test-DatabaseConnectivity
    
    # Run simple E2E tests
    $testsPassed = Run-SimpleE2ETests
    
    $overallEndTime = Get-Date
    $totalDuration = $overallEndTime - $overallStartTime
    
    # Display summary
    Write-Host "Test Execution Complete" -ForegroundColor Green
    Write-Host "===============================" -ForegroundColor Cyan
    Write-Host "Total Duration: $($totalDuration.TotalMinutes.ToString('F1')) minutes" -ForegroundColor White
    Write-Host "Database Connection: $(if ($databaseConnected) { "Connected" } else { "Failed" })" -ForegroundColor White
    Write-Host "Simple E2E Tests: $(if ($testsPassed) { "Passed" } else { "Failed" })" -ForegroundColor White
    
    if ($testsPassed -and $databaseConnected) {
        Write-Host "All simple E2E tests passed!" -ForegroundColor Green
        $exitCode = 0
    } else {
        Write-Host "Some tests failed. Please review the output above." -ForegroundColor Yellow
        $exitCode = 1
    }
    
    $successText = if ($testsPassed -and $databaseConnected) { "100%" } else { "Partial" }
    Write-Host "Overall Success: $successText" -ForegroundColor Blue
    
    exit $exitCode
}

# Run main function
Main
