# PowerShell script to run pipeline migration on Neon database
# Uses env.local file

$envPath = Join-Path $PSScriptRoot "env.local"
if (-not (Test-Path $envPath)) {
    $envPath = Join-Path $PSScriptRoot ".env"
}

if (-not (Test-Path $envPath)) {
    Write-Host "❌ No env file found (.env or env.local)" -ForegroundColor Red
    exit 1
}

$databaseUrl = Get-Content $envPath | Where-Object { $_ -match "^DATABASE_URL=" } | ForEach-Object { $_ -replace "^DATABASE_URL=", "" }

if (-not $databaseUrl) {
    Write-Host "❌ DATABASE_URL not found in $envPath" -ForegroundColor Red
    exit 1
}

Write-Host "🔧 Running pipeline migration..." -ForegroundColor Cyan

# Run the migration
$migrationPath = Join-Path $PSScriptRoot "migrations\011_pipeline_tables.sql"
psql "$databaseUrl" -f "$migrationPath"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Pipeline tables created successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
}

