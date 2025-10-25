# ADPA Document Migration: Focus on moving documents from Docker to Neon
# This script specifically migrates documents with proper conflict handling

param(
    [switch]$DryRun = $false
)

Write-Host "ADPA Document Migration: Docker PostgreSQL to Neon" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
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

$BACKUP_DIR = "./document-migration-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

function Test-Connections {
    Write-Host "Testing connections..." -ForegroundColor Yellow
    
    # Test Docker
    $containerStatus = docker ps -a --filter "name=$DOCKER_CONTAINER" --format "{{.Status}}"
    if ($containerStatus -notlike "*Up*") {
        Write-Host "Starting Docker container..." -ForegroundColor Yellow
        docker start $DOCKER_CONTAINER
        Start-Sleep -Seconds 3
    }
    
    # Test Neon
    $env:PGPASSWORD = $NEON_PASSWORD
    $connectionString = "host=$NEON_HOST port=$NEON_PORT dbname=$NEON_DB user=$NEON_USER sslmode=$NEON_SSL"
    
    try {
        $result = psql $connectionString -c "SELECT NOW();" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Both connections successful" -ForegroundColor Green
            return $connectionString
        } else {
            Write-Host "Neon connection failed" -ForegroundColor Red
            return $null
        }
    } catch {
        Write-Host "Neon connection failed: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Get-DocumentCounts {
    param($connectionString, $source)
    
    Write-Host "Getting document counts from $source..." -ForegroundColor Yellow
    
    if ($source -eq "Docker") {
        $count = docker exec -i $DOCKER_CONTAINER psql -U $DOCKER_USER -d $DOCKER_DB -t -c "SELECT COUNT(*) FROM documents;"
    } else {
        $count = psql $connectionString -t -c "SELECT COUNT(*) FROM documents;"
    }
    
    $count = $count.Trim()
    Write-Host "   Documents in $source : $count" -ForegroundColor Gray
    return $count
}

function Export-DocumentsFromDocker {
    Write-Host "Exporting documents from Docker..." -ForegroundColor Yellow
    
    # Create backup directory
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    
    # Export documents data
    $exportFile = "$BACKUP_DIR/documents_export.sql"
    docker exec -i $DOCKER_CONTAINER pg_dump -U $DOCKER_USER -d $DOCKER_DB --data-only --inserts -t documents > $exportFile
    
    Write-Host "Documents exported to: $exportFile" -ForegroundColor Green
    return $exportFile
}

function Migrate-DocumentsToNeon {
    param($connectionString, $exportFile)
    
    Write-Host "Migrating documents to Neon..." -ForegroundColor Yellow
    
    # Read the export file
    $content = Get-Content $exportFile -Raw
    
    if (-not $content -or $content -notmatch "INSERT INTO") {
        Write-Host "No INSERT statements found in export file" -ForegroundColor Yellow
        return $true
    }
    
    # Convert INSERT to UPSERT for conflict handling
    $upsertContent = @"
-- Document migration with UPSERT
BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

"@
    
    # Replace INSERT with UPSERT
    $upsertContent += $content -replace "INSERT INTO documents \(([^)]+)\) VALUES \(([^)]+)\);", 'INSERT INTO documents ($1) VALUES ($2) ON CONFLICT (id) DO UPDATE SET project_id = EXCLUDED.project_id, name = EXCLUDED.name, content = EXCLUDED.content, template_id = EXCLUDED.template_id, version = EXCLUDED.version, status = EXCLUDED.status, file_path = EXCLUDED.file_path, file_size = EXCLUDED.file_size, mime_type = EXCLUDED.mime_type, framework = EXCLUDED.framework, metadata = EXCLUDED.metadata, created_by = EXCLUDED.created_by, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at;'
    
    $upsertContent += "`n`nCOMMIT;"
    
    # Save the upsert file
    $upsertFile = "$BACKUP_DIR/documents_upsert.sql"
    $upsertContent | Out-File $upsertFile -Encoding UTF8
    
    if ($DryRun) {
        Write-Host "DRY RUN: Would execute upsert operations" -ForegroundColor Yellow
        Write-Host "Upsert file created: $upsertFile" -ForegroundColor Gray
        return $true
    }
    
    # Execute the upsert operations
    $env:PGPASSWORD = $NEON_PASSWORD
    try {
        $upsertContent | psql $connectionString
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Documents migrated successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "Document migration failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Document migration failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Verify-Migration {
    param($connectionString)
    
    Write-Host "Verifying migration..." -ForegroundColor Yellow
    
    $dockerCount = Get-DocumentCounts $connectionString "Docker"
    $neonCount = Get-DocumentCounts $connectionString "Neon"
    
    Write-Host ""
    if ($dockerCount -eq $neonCount) {
        Write-Host "Migration verification successful!" -ForegroundColor Green
        Write-Host "Docker: $dockerCount documents" -ForegroundColor Gray
        Write-Host "Neon: $neonCount documents" -ForegroundColor Gray
        return $true
    } else {
        Write-Host "Migration verification failed!" -ForegroundColor Red
        Write-Host "Docker: $dockerCount documents" -ForegroundColor Gray
        Write-Host "Neon: $neonCount documents" -ForegroundColor Gray
        return $false
    }
}

# Main execution
try {
    Write-Host "Starting document migration..." -ForegroundColor Cyan
    Write-Host "Dry Run: $DryRun" -ForegroundColor Gray
    Write-Host ""
    
    # Test connections
    $connectionString = Test-Connections
    if (-not $connectionString) {
        throw "Connection test failed"
    }
    
    # Get initial counts
    Write-Host ""
    $dockerCount = Get-DocumentCounts $connectionString "Docker"
    $neonCount = Get-DocumentCounts $connectionString "Neon"
    
    Write-Host ""
    Write-Host "Docker has $dockerCount documents, Neon has $neonCount documents" -ForegroundColor Cyan
    
    if ($dockerCount -eq "0") {
        Write-Host "No documents to migrate from Docker" -ForegroundColor Yellow
        return
    }
    
    # Export documents from Docker
    $exportFile = Export-DocumentsFromDocker
    
    # Migrate to Neon
    if (-not (Migrate-DocumentsToNeon $connectionString $exportFile)) {
        throw "Document migration failed"
    }
    
    # Verify migration
    if (-not $DryRun) {
        if (-not (Verify-Migration $connectionString)) {
            throw "Migration verification failed"
        }
    }
    
    Write-Host ""
    Write-Host "Document migration completed successfully!" -ForegroundColor Green
    Write-Host "Backup files saved in: $BACKUP_DIR" -ForegroundColor Gray
    
    if (-not $DryRun) {
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Test your application to ensure documents are accessible" -ForegroundColor White
        Write-Host "2. Check that all 48 documents are now available in Neon" -ForegroundColor White
        Write-Host "3. Once verified, you can stop using Docker PostgreSQL" -ForegroundColor White
    }
    
} catch {
    Write-Host ""
    Write-Host "Migration failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Check backup files in: $BACKUP_DIR" -ForegroundColor Gray
    exit 1
}
