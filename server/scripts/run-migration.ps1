# Database Migration Script
# Applies the add_missing_columns.sql migration

Write-Host "🔄 Running database migration: add_missing_columns.sql" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env file
$envFile = Join-Path $PSScriptRoot ".." ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+?)\s*=\s*(.+?)\s*$') {
            $name = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "✅ Loaded environment variables from .env" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found, using existing environment variables" -ForegroundColor Yellow
}

$DATABASE_URL = $env:DATABASE_URL

if (-not $DATABASE_URL) {
    Write-Host "❌ DATABASE_URL environment variable not set" -ForegroundColor Red
    exit 1
}

# Parse the connection string
if ($DATABASE_URL -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
    $dbUser = $matches[1]
    $dbPassword = $matches[2]
    $dbHost = $matches[3]
    $dbPort = $matches[4]
    $dbName = $matches[5]
    
    Write-Host "📊 Database: $dbName" -ForegroundColor Cyan
    Write-Host "🌐 Host: ${dbHost}:${dbPort}" -ForegroundColor Cyan
    Write-Host ""
}

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $dbPassword

# Run the migration
$migrationFile = Join-Path $PSScriptRoot ".." "migrations" "add_missing_columns.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Migration file: add_missing_columns.sql" -ForegroundColor Cyan
Write-Host "🚀 Executing migration..." -ForegroundColor Cyan
Write-Host ""

# Execute the migration using psql
try {
    $psqlCommand = "psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f `"$migrationFile`""
    
    # Check if psql is available
    $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
    
    if (-not $psqlPath) {
        Write-Host "❌ psql command not found. Please install PostgreSQL client tools." -ForegroundColor Red
        Write-Host ""
        Write-Host "Alternative: Run the migration manually:" -ForegroundColor Yellow
        Write-Host "  1. Open the migration file: migrations/add_missing_columns.sql" -ForegroundColor Yellow
        Write-Host "  2. Execute it in your database client (pgAdmin, DBeaver, etc.)" -ForegroundColor Yellow
        exit 1
    }
    
    # Execute psql
    $output = Invoke-Expression $psqlCommand 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Output:" -ForegroundColor Cyan
        Write-Host $output
    } else {
        Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host ""
        Write-Host "Error output:" -ForegroundColor Red
        Write-Host $output
        exit 1
    }
} catch {
    Write-Host "❌ Error executing migration: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "🎉 Migration process complete!" -ForegroundColor Green
