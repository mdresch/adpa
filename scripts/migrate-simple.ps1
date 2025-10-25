# ADPA Database Migration Script: Docker PostgreSQL to Neon
# Simple version without emoji characters

param(
    [switch]$DryRun = $false,
    [switch]$Backup = $true
)

Write-Host "ADPA Database Migration: Docker PostgreSQL to Neon" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$DOCKER_CONTAINER = "adpa-postgres"
$DOCKER_DB = "adpa_db"
$DOCKER_USER = "postgres"
$DOCKER_PASSWORD = "password"

# Neon Database Configuration
$NEON_HOST = "ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech"
$NEON_PORT = "5432"
$NEON_DB = "adpa_db"
$NEON_USER = "neondb_owner"
$NEON_PASSWORD = "npg_6H1YnZiDleEV"
$NEON_SSL = "require"

$BACKUP_DIR = "./migration-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$EXPORT_FILE = "$BACKUP_DIR/docker_data_export.sql"
$MODIFIED_EXPORT = "$BACKUP_DIR/modified_export.sql"

function Test-DockerContainer {
    Write-Host "Checking Docker container status..." -ForegroundColor Yellow
    
    $containerStatus = docker ps -a --filter "name=$DOCKER_CONTAINER" --format "{{.Status}}"
    if (-not $containerStatus) {
        Write-Host "Docker container '$DOCKER_CONTAINER' not found!" -ForegroundColor Red
        return $false
    }
    
    if ($containerStatus -notlike "*Up*") {
        Write-Host "Starting Docker container..." -ForegroundColor Yellow
        docker start $DOCKER_CONTAINER
        Start-Sleep -Seconds 5
    }
    
    Write-Host "Docker container is running" -ForegroundColor Green
    return $true
}

function Export-DockerData {
    Write-Host "Exporting data from Docker PostgreSQL..." -ForegroundColor Yellow
    
    # Create backup directory
    if ($Backup) {
        New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
        Write-Host "Backup directory created: $BACKUP_DIR" -ForegroundColor Green
    }
    
    # Export schema and data
    Write-Host "Exporting schema..." -ForegroundColor Yellow
    docker exec -i $DOCKER_CONTAINER pg_dump -U $DOCKER_USER -d $DOCKER_DB --schema-only > "$BACKUP_DIR/schema_export.sql"
    
    Write-Host "Exporting data..." -ForegroundColor Yellow
    docker exec -i $DOCKER_CONTAINER pg_dump -U $DOCKER_USER -d $DOCKER_DB --data-only --inserts > $EXPORT_FILE
    
    # Get row counts for verification
    Write-Host "Getting row counts for verification..." -ForegroundColor Yellow
    $tables = @("users", "projects", "documents", "templates", "audit_logs")
    $rowCounts = @{}
    
    foreach ($table in $tables) {
        $count = docker exec -i $DOCKER_CONTAINER psql -U $DOCKER_USER -d $DOCKER_DB -t -c "SELECT COUNT(*) FROM $table;"
        $rowCounts[$table] = $count.Trim()
        Write-Host "   $table : $($rowCounts[$table]) rows" -ForegroundColor Gray
    }
    
    # Save row counts for verification
    $rowCounts | ConvertTo-Json | Out-File "$BACKUP_DIR/row_counts.json"
    
    Write-Host "Data export completed" -ForegroundColor Green
    Write-Host "Export file: $EXPORT_FILE" -ForegroundColor Gray
    Write-Host "Schema file: $BACKUP_DIR/schema_export.sql" -ForegroundColor Gray
    Write-Host "Row counts: $BACKUP_DIR/row_counts.json" -ForegroundColor Gray
    
    return $rowCounts
}

function Modify-ExportFile {
    Write-Host "Modifying export file for Neon compatibility..." -ForegroundColor Yellow
    
    if (-not (Test-Path $EXPORT_FILE)) {
        Write-Host "Export file not found: $EXPORT_FILE" -ForegroundColor Red
        return $false
    }
    
    $content = Get-Content $EXPORT_FILE -Raw
    
    # Remove any schema references that might cause issues
    $content = $content -replace 'SET search_path = [^;]+;', ''
    
    # Add transaction wrapper for safety
    $modifiedContent = @"
-- Migration to Neon Database
-- Generated: $(Get-Date)
BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

$content

COMMIT;
"@
    
    $modifiedContent | Out-File $MODIFIED_EXPORT -Encoding UTF8
    Write-Host "Modified export file created: $MODIFIED_EXPORT" -ForegroundColor Green
    
    return $true
}

function Test-NeonConnection {
    Write-Host "Testing Neon database connection..." -ForegroundColor Yellow
    
    # Test connection using psql if available, otherwise skip
    $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlPath) {
        $env:PGPASSWORD = $NEON_PASSWORD
        $connectionString = "host=$NEON_HOST port=$NEON_PORT dbname=$NEON_DB user=$NEON_USER sslmode=$NEON_SSL"
        
        try {
            $result = psql $connectionString -c "SELECT NOW();" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Neon database connection successful" -ForegroundColor Green
                return $true
            } else {
                Write-Host "Neon database connection failed: $result" -ForegroundColor Red
                return $false
            }
        } catch {
            Write-Host "Neon database connection failed: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        } finally {
            Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        }
    } else {
        Write-Host "psql not found. Skipping connection test." -ForegroundColor Yellow
        return $true
    }
}

function Import-ToNeon {
    if ($DryRun) {
        Write-Host "DRY RUN: Would import data to Neon database" -ForegroundColor Yellow
        Write-Host "Import file: $MODIFIED_EXPORT" -ForegroundColor Gray
        return $true
    }
    
    Write-Host "Importing data to Neon database..." -ForegroundColor Yellow
    
    $env:PGPASSWORD = $NEON_PASSWORD
    $connectionString = "host=$NEON_HOST port=$NEON_PORT dbname=$NEON_DB user=$NEON_USER sslmode=$NEON_SSL"
    
    try {
        # Import the modified export file
        Get-Content $MODIFIED_EXPORT | psql $connectionString
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Data import completed successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "Data import failed with exit code: $LASTEXITCODE" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Data import failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Verify-Migration {
    Write-Host "Verifying migration..." -ForegroundColor Yellow
    
    # Load expected row counts
    $expectedCounts = Get-Content "$BACKUP_DIR/row_counts.json" | ConvertFrom-Json
    
    $env:PGPASSWORD = $NEON_PASSWORD
    $connectionString = "host=$NEON_HOST port=$NEON_PORT dbname=$NEON_DB user=$NEON_USER sslmode=$NEON_SSL"
    
    $allVerified = $true
    
    foreach ($table in $expectedCounts.PSObject.Properties.Name) {
        $expectedCount = $expectedCounts.$table
        $actualCount = psql $connectionString -t -c "SELECT COUNT(*) FROM $table;" 2>$null
        
        if ($actualCount) {
            $actualCount = $actualCount.Trim()
            if ($actualCount -eq $expectedCount) {
                Write-Host "   $table : $actualCount rows (verified)" -ForegroundColor Green
            } else {
                Write-Host "   $table : Expected $expectedCount, got $actualCount" -ForegroundColor Red
                $allVerified = $false
            }
        } else {
            Write-Host "   $table : Could not verify" -ForegroundColor Red
            $allVerified = $false
        }
    }
    
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    
    if ($allVerified) {
        Write-Host "Migration verification successful!" -ForegroundColor Green
    } else {
        Write-Host "Migration verification failed!" -ForegroundColor Red
    }
    
    return $allVerified
}

# Main execution
try {
    Write-Host "Starting migration process..." -ForegroundColor Cyan
    Write-Host "Dry Run: $DryRun" -ForegroundColor Gray
    Write-Host "Backup: $Backup" -ForegroundColor Gray
    Write-Host ""
    
    # Step 1: Check Docker container
    if (-not (Test-DockerContainer)) {
        throw "Docker container check failed"
    }
    
    # Step 2: Export data from Docker
    $rowCounts = Export-DockerData
    if (-not $rowCounts) {
        throw "Data export failed"
    }
    
    # Step 3: Modify export file
    if (-not (Modify-ExportFile)) {
        throw "Export file modification failed"
    }
    
    # Step 4: Test Neon connection
    if (-not (Test-NeonConnection)) {
        throw "Neon connection test failed"
    }
    
    # Step 5: Import to Neon
    if (-not (Import-ToNeon)) {
        throw "Data import failed"
    }
    
    # Step 6: Verify migration
    if (-not $DryRun -and -not (Verify-Migration)) {
        throw "Migration verification failed"
    }
    
    Write-Host ""
    Write-Host "Migration completed successfully!" -ForegroundColor Green
    Write-Host "Backup files saved in: $BACKUP_DIR" -ForegroundColor Gray
    
    if (-not $DryRun) {
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Update your application to use Neon database" -ForegroundColor White
        Write-Host "2. Test your application with the migrated data" -ForegroundColor White
        Write-Host "3. Once verified, you can stop using Docker PostgreSQL" -ForegroundColor White
    }
    
} catch {
    Write-Host ""
    Write-Host "Migration failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Check backup files in: $BACKUP_DIR" -ForegroundColor Gray
    exit 1
}
