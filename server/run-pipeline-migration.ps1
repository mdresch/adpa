# PowerShell script to run pipeline migration on Neon database

# Load DATABASE_URL from .env
$envPath = Join-Path $PSScriptRoot ".env"
$databaseUrl = Get-Content $envPath | Where-Object { $_ -match "^DATABASE_URL=" } | ForEach-Object { $_ -replace "^DATABASE_URL=", "" }

if (-not $databaseUrl) {
    Write-Host "❌ DATABASE_URL not found in .env" -ForegroundColor Red
    exit 1
}

Write-Host "🔧 Running pipeline migration..." -ForegroundColor Cyan
Write-Host "📍 Database: $($databaseUrl.Substring(0, 50))..." -ForegroundColor Gray

# Run the migration
$migrationPath = Join-Path $PSScriptRoot "migrations\011_pipeline_tables.sql"
psql "$databaseUrl" -f "$migrationPath"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Pipeline tables created successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
}

