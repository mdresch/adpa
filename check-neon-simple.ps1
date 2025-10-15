# Check Neon Database Status - Simple Version
# This script verifies the current state of your Neon database

Write-Host "Checking Neon Database Status" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Neon Database Configuration
$NEON_HOST = "ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech"
$NEON_PORT = "5432"
$NEON_DB = "adpa_db"
$NEON_USER = "neondb_owner"
$NEON_PASSWORD = "npg_6H1YnZiDleEV"
$NEON_SSL = "require"

function Test-NeonConnection {
    Write-Host "Testing connection to Neon database..." -ForegroundColor Yellow
    
    $env:PGPASSWORD = $NEON_PASSWORD
    $connectionString = "host=$NEON_HOST port=$NEON_PORT dbname=$NEON_DB user=$NEON_USER sslmode=$NEON_SSL"
    
    try {
        $result = psql $connectionString -c "SELECT version();" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Connection successful" -ForegroundColor Green
            Write-Host "PostgreSQL Version: $($result[1])" -ForegroundColor Gray
            return $true
        } else {
            Write-Host "Connection failed: $result" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Connection failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Get-TableCounts {
    Write-Host "Getting table row counts..." -ForegroundColor Yellow
    
    $env:PGPASSWORD = $NEON_PASSWORD
    $connectionString = "host=$NEON_HOST port=$NEON_PORT dbname=$NEON_DB user=$NEON_USER sslmode=$NEON_SSL"
    
    $tables = @("users", "projects", "documents", "templates", "audit_logs")
    
    foreach ($table in $tables) {
        try {
            $count = psql $connectionString -t -c "SELECT COUNT(*) FROM $table;" 2>$null
            if ($count) {
                $count = $count.Trim()
                Write-Host "   $table : $count rows" -ForegroundColor Gray
            } else {
                Write-Host "   $table : Table not found or error" -ForegroundColor Red
            }
        } catch {
            Write-Host "   $table : Error accessing table" -ForegroundColor Red
        }
    }
    
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

# Main execution
try {
    # Test connection
    if (-not (Test-NeonConnection)) {
        throw "Could not connect to Neon database"
    }
    
    Write-Host ""
    
    # Get table counts
    Get-TableCounts
    
    Write-Host ""
    Write-Host "Neon database status check completed" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "Status check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
