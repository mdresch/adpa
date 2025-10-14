# Run Analytics Tables Migration
# This script creates all the analytics tracking tables

Write-Host "📊 Running Analytics Migration..." -ForegroundColor Cyan
Write-Host ""

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ ERROR: DATABASE_URL environment variable not set" -ForegroundColor Red
    Write-Host "Please run: " -ForegroundColor Yellow
    Write-Host "  `$env:DATABASE_URL = 'your-database-url'" -ForegroundColor Yellow
    exit 1
}

# Get the migration file path
$migrationFile = Join-Path $PSScriptRoot ".." "migrations" "007_analytics_tables.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ ERROR: Migration file not found at: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found migration file" -ForegroundColor Green
Write-Host "📁 Path: $migrationFile" -ForegroundColor Gray
Write-Host ""

# Run the migration using psql
Write-Host "🔄 Executing migration..." -ForegroundColor Yellow

try {
    psql $env:DATABASE_URL -f $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Analytics migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Created tables:" -ForegroundColor Cyan
        Write-Host "  • ai_usage_logs" -ForegroundColor White
        Write-Host "  • api_request_logs" -ForegroundColor White
        Write-Host "  • user_activity_logs" -ForegroundColor White
        Write-Host "  • document_analytics" -ForegroundColor White
        Write-Host "  • system_metrics" -ForegroundColor White
        Write-Host "  • job_execution_logs" -ForegroundColor White
        Write-Host "  • daily_statistics" -ForegroundColor White
        Write-Host ""
        Write-Host "📊 Materialized views:" -ForegroundColor Cyan
        Write-Host "  • mv_provider_performance" -ForegroundColor White
        Write-Host "  • mv_model_performance" -ForegroundColor White
        Write-Host ""
        Write-Host "🎉 Analytics tracking is now ready!" -ForegroundColor Green
        Write-Host "   Restart your backend to start collecting data." -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error running migration: $_" -ForegroundColor Red
    exit 1
}

