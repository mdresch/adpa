# Run Template Analytics Migration
# Creates template version control and quality metrics tables

Write-Host "📊 Running Template Analytics Migration..." -ForegroundColor Cyan
Write-Host ""

# Load .env file if it exists
$envFile = Join-Path $PSScriptRoot ".." ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    Write-Host "✅ Loaded .env file" -ForegroundColor Green
}

# Check if DATABASE_URL or POSTGRES_URL is set
$dbUrl = $env:DATABASE_URL
if (-not $dbUrl) {
    $dbUrl = $env:POSTGRES_URL
}

if (-not $dbUrl) {
    Write-Host "❌ ERROR: DATABASE_URL or POSTGRES_URL environment variable not set" -ForegroundColor Red
    exit 1
}

# Get the migration file path
$migrationFile = Join-Path $PSScriptRoot ".." "migrations" "008_template_analytics.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ ERROR: Migration file not found at: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found migration file" -ForegroundColor Green
Write-Host "📁 Path: $migrationFile" -ForegroundColor Gray
Write-Host ""

# Run the migration using psql
Write-Host "🔄 Executing migration..." -ForegroundColor Yellow
Write-Host "📡 Database: $($dbUrl.Substring(0, [Math]::Min(50, $dbUrl.Length)))..." -ForegroundColor Gray
Write-Host ""

try {
    psql $dbUrl -f $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Template analytics migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Created tables:" -ForegroundColor Cyan
        Write-Host "  • template_versions - Version history with content snapshots" -ForegroundColor White
        Write-Host "  • template_quality_metrics - Quality and performance metrics" -ForegroundColor White
        Write-Host "  • template_comparison_metrics - Template comparison data" -ForegroundColor White
        Write-Host "  • template_maintenance_log - Maintenance tracking" -ForegroundColor White
        Write-Host ""
        Write-Host "📊 Materialized views:" -ForegroundColor Cyan
        Write-Host "  • mv_template_performance - Performance summary" -ForegroundColor White
        Write-Host "  • mv_template_trends - Usage trends over time" -ForegroundColor White
        Write-Host ""
        Write-Host "⚙️  Functions created:" -ForegroundColor Cyan
        Write-Host "  • create_template_version() - Create version snapshots" -ForegroundColor White
        Write-Host "  • calculate_template_quality_metrics() - Calculate metrics" -ForegroundColor White
        Write-Host "  • determine_template_maintenance_priority() - Auto-prioritize" -ForegroundColor White
        Write-Host "  • refresh_template_analytics_views() - Refresh views" -ForegroundColor White
        Write-Host ""
        Write-Host "🎉 Template analytics is now ready!" -ForegroundColor Green
        Write-Host "   Restart your backend to start tracking template versions and metrics." -ForegroundColor Gray
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

