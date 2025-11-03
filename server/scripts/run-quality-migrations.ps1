# PowerShell Script: run-quality-migrations.ps1
# Description: Run quality audit and template improvement migrations
# Author: ADPA Development Team
# Date: 2025-11-03

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Quality Audit System - Database Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables
$envFile = Join-Path $PSScriptRoot ".." ".env"
if (Test-Path $envFile) {
    Write-Host "Loading environment variables from .env..." -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, 'Process')
        }
    }
} else {
    Write-Host "Warning: .env file not found at $envFile" -ForegroundColor Red
    Write-Host "Please create .env file with DATABASE_URL" -ForegroundColor Red
    exit 1
}

# Get DATABASE_URL from environment
$DATABASE_URL = $env:DATABASE_URL
if (-not $DATABASE_URL) {
    Write-Host "Error: DATABASE_URL not found in environment" -ForegroundColor Red
    Write-Host "Please set DATABASE_URL in server/.env file" -ForegroundColor Red
    exit 1
}

Write-Host "Database: $($DATABASE_URL -replace 'postgresql://[^:]+:[^@]+@', 'postgresql://***:***@')" -ForegroundColor Gray
Write-Host ""

# Define migration files in order
$migrations = @(
    "310_create_quality_audits.sql",
    "311_create_template_improvements.sql"
)

# Function to run a migration
function Run-Migration {
    param(
        [string]$migrationFile,
        [string]$databaseUrl
    )
    
    $migrationPath = Join-Path $PSScriptRoot ".." "migrations" $migrationFile
    
    if (-not (Test-Path $migrationPath)) {
        Write-Host "Error: Migration file not found: $migrationPath" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Running migration: $migrationFile" -ForegroundColor Cyan
    
    # Check if psql is available
    $psqlCommand = Get-Command psql -ErrorAction SilentlyContinue
    if (-not $psqlCommand) {
        Write-Host "Error: psql command not found" -ForegroundColor Red
        Write-Host "Please install PostgreSQL client tools" -ForegroundColor Red
        Write-Host "Download from: https://www.postgresql.org/download/" -ForegroundColor Yellow
        return $false
    }
    
    # Run migration
    $output = & psql $databaseUrl -f $migrationPath 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Success" -ForegroundColor Green
        Write-Host "    $($output -split "`n" | Select-Object -First 5 -Join "`n    ")" -ForegroundColor Gray
        return $true
    } else {
        Write-Host "  ✗ Failed" -ForegroundColor Red
        Write-Host "    $output" -ForegroundColor Red
        return $false
    }
}

# Run migrations
Write-Host "Starting migrations..." -ForegroundColor Yellow
Write-Host ""

$allSuccess = $true
foreach ($migration in $migrations) {
    $success = Run-Migration -migrationFile $migration -databaseUrl $DATABASE_URL
    if (-not $success) {
        $allSuccess = $false
        Write-Host ""
        Write-Host "Migration failed: $migration" -ForegroundColor Red
        Write-Host "Stopping migration process" -ForegroundColor Red
        break
    }
    Write-Host ""
}

# Summary
Write-Host "========================================" -ForegroundColor Cyan
if ($allSuccess) {
    Write-Host "All migrations completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Tables created:" -ForegroundColor Yellow
    Write-Host "  • quality_audits" -ForegroundColor White
    Write-Host "  • template_improvement_suggestions" -ForegroundColor White
    Write-Host "  • template_versions" -ForegroundColor White
    Write-Host ""
    Write-Host "Documents table updated with quality columns" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run test script: ./test-quality-schema.ps1" -ForegroundColor White
    Write-Host "  2. Implement QualityAuditService" -ForegroundColor White
    Write-Host "  3. Integrate with document generation" -ForegroundColor White
} else {
    Write-Host "Migrations failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To rollback, run:" -ForegroundColor Yellow
    Write-Host "  psql `$env:DATABASE_URL -f migrations/312_rollback_quality_system.sql" -ForegroundColor White
}
Write-Host "========================================" -ForegroundColor Cyan

