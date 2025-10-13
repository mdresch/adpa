# End-to-End Test Runner Script
# Comprehensive testing of the 6-stage document generation pipeline

param(
    [string]$TestSuite = "all",
    [switch]$Verbose = $false,
    [switch]$Coverage = $false,
    [int]$Timeout = 1800  # 30 minutes default timeout
)

Write-Host "🚀 Starting ADPA End-to-End Testing Suite" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan

# Set up environment
$env:NODE_ENV = "test"
$env:LOG_LEVEL = if ($Verbose) { "debug" } else { "info" }

# Test configuration
$testConfig = @{
    "pipeline" = @{
        "description" = "Core Pipeline Integration Tests"
        "file" = "src/tests/e2e/pipeline.test.ts"
        "timeout" = 600  # 10 minutes
    }
    "performance" = @{
        "description" = "Performance and Load Tests"
        "file" = "src/tests/e2e/performance.test.ts"
        "timeout" = 900  # 15 minutes
    }
    "stress" = @{
        "description" = "Stress and Resilience Tests"
        "file" = "src/tests/e2e/stress.test.ts"
        "timeout" = 1200  # 20 minutes
    }
}

# Function to run a specific test suite
function Run-TestSuite {
    param(
        [string]$SuiteName,
        [hashtable]$SuiteConfig
    )
    
    Write-Host "`n🧪 Running $($SuiteConfig.description)" -ForegroundColor Yellow
    Write-Host "File: $($SuiteConfig.file)" -ForegroundColor Gray
    Write-Host "Timeout: $($SuiteConfig.timeout) seconds" -ForegroundColor Gray
    
    $testCommand = "npx jest `"$($SuiteConfig.file)`" --testTimeout=$($SuiteConfig.timeout * 1000)"
    
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
            Write-Host "✅ $SuiteName tests passed in $($duration.TotalSeconds.ToString('F1')) seconds" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $SuiteName tests failed after $($duration.TotalSeconds.ToString('F1')) seconds" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "💥 $SuiteName tests crashed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to check prerequisites
function Test-Prerequisites {
    Write-Host "🔍 Checking prerequisites..." -ForegroundColor Blue
    
    # Check if Node.js is installed
    try {
        $nodeVersion = node --version
        Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
        return $false
    }
    
    # Check if npm is installed
    try {
        $npmVersion = npm --version
        Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ npm not found. Please install npm first." -ForegroundColor Red
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
    
    # Check if database is accessible
    try {
        Write-Host "🔍 Checking database connection..." -ForegroundColor Blue
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
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Database connection failed. Please ensure the database is running." -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Database check failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    
    return $true
}

# Function to generate test report
function New-TestReport {
    param(
        [hashtable]$Results
    )
    
    $reportPath = "test-results/e2e-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').html"
    
    # Create test-results directory if it doesn't exist
    if (!(Test-Path "test-results")) {
        New-Item -ItemType Directory -Path "test-results" | Out-Null
    }
    
    $html = @"
<!DOCTYPE html>
<html>
<head>
    <title>ADPA End-to-End Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
        .summary { background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .test-suite { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .passed { border-left: 5px solid #27ae60; }
        .failed { border-left: 5px solid #e74c3c; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat { text-align: center; padding: 10px; }
        .stat-number { font-size: 2em; font-weight: bold; }
        .passed-stat { color: #27ae60; }
        .failed-stat { color: #e74c3c; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 ADPA End-to-End Test Report</h1>
        <p>Generated on: $(Get-Date)</p>
    </div>
    
    <div class="summary">
        <h2>📊 Test Summary</h2>
        <div class="stats">
            <div class="stat">
                <div class="stat-number passed-stat">$($Results.Passed)</div>
                <div>Passed</div>
            </div>
            <div class="stat">
                <div class="stat-number failed-stat">$($Results.Failed)</div>
                <div>Failed</div>
            </div>
            <div class="stat">
                <div class="stat-number">$($Results.Total)</div>
                <div>Total</div>
            </div>
        </div>
    </div>
    
    <h2>🧪 Test Suite Results</h2>
"@

    foreach ($suite in $Results.Suites.GetEnumerator()) {
        $status = if ($suite.Value) { "passed" } else { "failed" }
        $statusClass = if ($suite.Value) { "passed" } else { "failed" }
        $icon = if ($suite.Value) { "✅" } else { "❌" }
        
        $html += @"
    <div class="test-suite $statusClass">
        <h3>$icon $($suite.Key) - $($testConfig[$suite.Key].description)</h3>
        <p><strong>Status:</strong> $status</p>
        <p><strong>File:</strong> $($testConfig[$suite.Key].file)</p>
    </div>
"@
    }
    
    $html += @"
</body>
</html>
"@
    
    $html | Out-File -FilePath $reportPath -Encoding UTF8
    Write-Host "📄 Test report generated: $reportPath" -ForegroundColor Blue
    return $reportPath
}

# Main execution
function Main {
    # Check prerequisites
    if (!(Test-Prerequisites)) {
        Write-Host "❌ Prerequisites check failed. Exiting." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ All prerequisites met. Starting tests..." -ForegroundColor Green
    
    # Initialize results tracking
    $results = @{
        "Passed" = 0
        "Failed" = 0
        "Total" = 0
        "Suites" = @{}
        "StartTime" = Get-Date
    }
    
    # Determine which test suites to run
    $suitesToRun = @()
    if ($TestSuite -eq "all") {
        $suitesToRun = $testConfig.Keys
    } else {
        if ($testConfig.ContainsKey($TestSuite)) {
            $suitesToRun = @($TestSuite)
        } else {
            Write-Host "❌ Unknown test suite: $TestSuite" -ForegroundColor Red
            Write-Host "Available suites: $($testConfig.Keys -join ', ')" -ForegroundColor Yellow
            exit 1
        }
    }
    
    # Run test suites
    foreach ($suiteName in $suitesToRun) {
        $suiteConfig = $testConfig[$suiteName]
        $success = Run-TestSuite -SuiteName $suiteName -SuiteConfig $suiteConfig
        
        $results.Suites[$suiteName] = $success
        $results.Total++
        
        if ($success) {
            $results.Passed++
        } else {
            $results.Failed++
        }
    }
    
    # Calculate total time
    $results.EndTime = Get-Date
    $totalDuration = $results.EndTime - $results.StartTime
    
    # Display summary
    Write-Host "`n🏁 Test Execution Complete" -ForegroundColor Green
    Write-Host "===============================" -ForegroundColor Cyan
    Write-Host "Total Duration: $($totalDuration.TotalMinutes.ToString('F1')) minutes" -ForegroundColor White
    Write-Host "Tests Passed: $($results.Passed)/$($results.Total)" -ForegroundColor White
    Write-Host "Tests Failed: $($results.Failed)/$($results.Total)" -ForegroundColor White
    
    if ($results.Failed -eq 0) {
        Write-Host "🎉 All tests passed!" -ForegroundColor Green
        $exitCode = 0
    } else {
        Write-Host "⚠️  Some tests failed. Please review the output above." -ForegroundColor Yellow
        $exitCode = 1
    }
    
    # Generate report
    $reportPath = New-TestReport -Results $results
    Write-Host "📊 Overall Success Rate: $(($results.Passed / $results.Total * 100).ToString('F1'))%" -ForegroundColor Blue
    
    exit $exitCode
}

# Run main function
Main
