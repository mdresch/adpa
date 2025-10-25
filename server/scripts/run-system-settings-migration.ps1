# PowerShell script to run system_settings table migration
# This creates the system_settings table for encryption key persistence

Write-Host "🔄 Running System Settings Migration..." -ForegroundColor Cyan
Write-Host ""

# Get the directory where the script is located
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Split-Path -Parent $scriptDir
$migrationFile = Join-Path $serverDir "migrations\009_create_system_settings.sql"

# Verify the migration file exists
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ ERROR: Migration file not found at $migrationFile" -ForegroundColor Red
    exit 1
}

# Check if DATABASE_URL or POSTGRES_URL is set
$dbUrl = $env:DATABASE_URL
if ([string]::IsNullOrEmpty($dbUrl)) {
    $dbUrl = $env:POSTGRES_URL
}

if ([string]::IsNullOrEmpty($dbUrl)) {
    Write-Host "❌ ERROR: DATABASE_URL or POSTGRES_URL environment variable not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "  `$env:DATABASE_URL = 'your-database-url'" -ForegroundColor Yellow
    Write-Host "  `$env:POSTGRES_URL = 'your-database-url'" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "📊 Database URL found" -ForegroundColor Green
Write-Host "📄 Migration file: $migrationFile" -ForegroundColor Gray
Write-Host ""

# Run the migration
Write-Host "⚙️  Executing migration..." -ForegroundColor Yellow

try {
    # Use psql to execute the migration
    $output = & psql $dbUrl -f $migrationFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "The system_settings table has been created." -ForegroundColor Cyan
        Write-Host "Encrypted API keys will now persist across server restarts." -ForegroundColor Cyan
        Write-Host ""
        
        # Verify the table was created
        Write-Host "🔍 Verifying table creation..." -ForegroundColor Yellow
        $verifyOutput = & psql $dbUrl -c "SELECT table_name FROM information_schema.tables WHERE table_name = 'system_settings';" 2>&1
        
        if ($verifyOutput -match "system_settings") {
            Write-Host "✅ Verification successful - system_settings table exists" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Warning: Could not verify table creation" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "📖 Next Steps:" -ForegroundColor Cyan
        Write-Host "  1. Restart your backend server" -ForegroundColor Gray
        Write-Host "  2. The encryption key will be automatically managed" -ForegroundColor Gray
        Write-Host "  3. For production, set ENCRYPTION_KEY environment variable" -ForegroundColor Gray
        Write-Host ""
        Write-Host "📚 See server/docs/ENCRYPTION_KEY_MANAGEMENT.md for details" -ForegroundColor Gray
        
    } else {
        Write-Host "❌ Migration failed with exit code $LASTEXITCODE" -ForegroundColor Red
        Write-Host ""
        Write-Host "Error output:" -ForegroundColor Red
        Write-Host $output -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ ERROR: Failed to execute migration" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

