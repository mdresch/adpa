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
        Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
        return $false
    }
    
    # Check if Jest is installed
    try {
        $jestVersion = npx jest --version
        Write-Host "✅ Jest: $jestVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Jest not found. Installing Jest..." -ForegroundColor Yellow
        npm install --save-dev jest @types/jest ts-jest
    }
    
    return $true
}

# Function to run simple E2E tests
function Run-SimpleE2ETests {
    Write-Host "`n🧪 Running Simple E2E Tests" -ForegroundColor Yellow
    
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
            Write-Host "✅ Simple E2E tests passed in $($duration.TotalSeconds.ToString('F1')) seconds" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Simple E2E tests failed after $($duration.TotalSeconds.ToString('F1')) seconds" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "💥 Simple E2E tests crashed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to test database connectivity
function Test-DatabaseConnectivity {
    Write-Host "`n🔍 Testing Database Connectivity" -ForegroundColor Blue
    
    try {
        node -e "
        const { pool } = require('./dist/database/connection');
        pool.query('SELECT 1').then(() => {
            console.log('✅ Database connection successful');
            process.exit(0);
        }).catch(err => {
            console.log('❌ Database connection failed:', err.message);
            process.exit(1);
        });
        "
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database connectivity test passed" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Database connectivity test failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Database connectivity test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to generate test report
function New-TestReport {
    param(
        [bool]$TestsPassed,
        [bool]$DatabaseConnected,
        [string]$Duration
    )
    
    $reportPath = "test-results/simple-e2e-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').html"
    
    # Create test-results directory if it doesn't exist
    if (!(Test-Path "test-results")) {
        New-Item -ItemType Directory -Path "test-results" | Out-Null
    }
    
    $status = if ($TestsPassed) { "PASSED" } else { "FAILED" }
    $statusColor = if ($TestsPassed) { "#27ae60" } else { "#e74c3c" }
    $statusIcon = if ($TestsPassed) { "PASS" } else { "FAIL" }
    
    $html = @"
<!DOCTYPE html>
<html>
<head>
    <title>ADPA Simple E2E Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
        .summary { background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .test-item { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        .passed { border-left: 5px solid #27ae60; }
        .failed { border-left: 5px solid #e74c3c; }
        .status { font-size: 1.5em; font-weight: bold; color: $statusColor; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 ADPA Simple E2E Test Report</h1>
        <p>Generated on: $(Get-Date)</p>
    </div>
    
    <div class="summary">
        <h2>📊 Test Summary</h2>
        <div class="status">$statusIcon $status</div>
        <p><strong>Duration:</strong> $Duration</p>
        <p><strong>Database Connection:</strong> $(if ($DatabaseConnected) { "Connected" } else { "Failed" })</p>
    </div>
    
    <h2>🧪 Test Results</h2>
    <div class="test-item $(if ($TestsPassed) { "passed" } else { "failed" })">
        <h3>Simple E2E Tests</h3>
        <p><strong>Status:</strong> $status</p>
        <p><strong>Duration:</strong> $Duration</p>
    </div>
    
    <div class="test-item $(if ($DatabaseConnected) { "passed" } else { "failed" })">
        <h3>Database Connectivity</h3>
        <p><strong>Status:</strong> $(if ($DatabaseConnected) { "PASSED" } else { "FAILED" })</p>
    </div>
</body>
</html>
"@
    
    $html | Out-File -FilePath $reportPath -Encoding UTF8
    Write-Host "📄 Test report generated: $reportPath" -ForegroundColor Blue
    return $reportPath
}

# Main execution
function Main {
    Write-Host "🚀 Starting Simple E2E Test Execution" -ForegroundColor Green
    
    # Check prerequisites
    if (!(Test-Prerequisites)) {
        Write-Host "❌ Prerequisites check failed. Exiting." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ All prerequisites met. Starting tests..." -ForegroundColor Green
    
    $overallStartTime = Get-Date
    
    # Test database connectivity
    $databaseConnected = Test-DatabaseConnectivity
    
    # Run simple E2E tests
    $testsPassed = Run-SimpleE2ETests
    
    $overallEndTime = Get-Date
    $totalDuration = $overallEndTime - $overallStartTime
    
    # Display summary
    Write-Host "`n🏁 Test Execution Complete" -ForegroundColor Green
    Write-Host "===============================" -ForegroundColor Cyan
    Write-Host "Total Duration: $($totalDuration.TotalMinutes.ToString('F1')) minutes" -ForegroundColor White
    Write-Host "Database Connection: $(if ($databaseConnected) { "✅ Connected" } else { "❌ Failed" })" -ForegroundColor White
    Write-Host "Simple E2E Tests: $(if ($testsPassed) { "✅ Passed" } else { "❌ Failed" })" -ForegroundColor White
    
    if ($testsPassed -and $databaseConnected) {
        Write-Host "🎉 All simple E2E tests passed!" -ForegroundColor Green
        $exitCode = 0
    } else {
        Write-Host "⚠️  Some tests failed. Please review the output above." -ForegroundColor Yellow
        $exitCode = 1
    }
    
    # Generate report
    $reportPath = New-TestReport -TestsPassed $testsPassed -DatabaseConnected $databaseConnected -Duration "$($totalDuration.TotalSeconds.ToString('F1')) seconds"
    
    $successText = if ($testsPassed -and $databaseConnected) { "100%" } else { "Partial" }
    Write-Host "Overall Success: $successText" -ForegroundColor Blue
    
    exit $exitCode
}

# Run main function
Main
