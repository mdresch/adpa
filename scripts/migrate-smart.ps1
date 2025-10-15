# ADPA Smart Database Migration: Docker PostgreSQL to Neon
# This script intelligently merges data from Docker PostgreSQL to Neon database
# It handles conflicts by using UPSERT operations

param(
    [switch]$DryRun = $false,
    [switch]$Backup = $true
)

Write-Host "ADPA Smart Database Migration: Docker PostgreSQL to Neon" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
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

function Test-NeonConnection {
    Write-Host "Testing Neon database connection..." -ForegroundColor Yellow
    
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
}

function Get-CurrentCounts {
    param($connectionString, $description)
    
    Write-Host "Getting current $description row counts..." -ForegroundColor Yellow
    
    $tables = @("users", "projects", "documents", "templates", "audit_logs")
    $counts = @{}
    
    foreach ($table in $tables) {
        try {
            $count = psql $connectionString -t -c "SELECT COUNT(*) FROM $table;" 2>$null
            if ($count) {
                $counts[$table] = $count.Trim()
                Write-Host "   $table : $($counts[$table]) rows" -ForegroundColor Gray
            } else {
                $counts[$table] = "0"
                Write-Host "   $table : Error accessing table" -ForegroundColor Red
            }
        } catch {
            $counts[$table] = "0"
            Write-Host "   $table : Error accessing table" -ForegroundColor Red
        }
    }
    
    return $counts
}

function Migrate-TableData {
    param($tableName, $connectionString)
    
    Write-Host "Migrating $tableName data..." -ForegroundColor Yellow
    
    # Create a temporary table for the migration
    $tempTable = "${tableName}_temp_migration"
    
    # First, export data from Docker to a temporary file
    $tempFile = "$BACKUP_DIR/${tableName}_data.sql"
    
    # Export data from Docker
    docker exec -i $DOCKER_CONTAINER pg_dump -U $DOCKER_USER -d $DOCKER_DB --data-only --inserts -t $tableName > $tempFile
    
    if (-not (Test-Path $tempFile) -or (Get-Content $tempFile).Count -lt 2) {
        Write-Host "   No data to migrate for $tableName" -ForegroundColor Gray
        return $true
    }
    
    # Read the SQL file and modify it for UPSERT operations
    $sqlContent = Get-Content $tempFile -Raw
    
    if ($sqlContent -match "INSERT INTO") {
        # Convert INSERT statements to UPSERT (INSERT ... ON CONFLICT)
        $upsertSql = @"
-- Migrating $tableName data with UPSERT operations
BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

"@
        
        # Modify INSERT statements to use ON CONFLICT
        $modifiedContent = $sqlContent -replace "INSERT INTO $tableName \(([^)]+)\) VALUES \(([^)]+)\);", "INSERT INTO $tableName (`$1) VALUES (`$2) ON CONFLICT (id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;"
        
        $upsertSql += $modifiedContent
        $upsertSql += "`n`nCOMMIT;"
        
        # Execute the UPSERT operations
        if (-not $DryRun) {
            $upsertSql | psql $connectionString
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   $tableName migrated successfully" -ForegroundColor Green
                return $true
            } else {
                Write-Host "   $tableName migration failed" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "   DRY RUN: Would migrate $tableName data" -ForegroundColor Yellow
            return $true
        }
    } else {
        Write-Host "   No INSERT statements found for $tableName" -ForegroundColor Gray
        return $true
    }
}

function Migrate-Documents {
    param($connectionString)
    
    Write-Host "Migrating documents (special handling for content)..." -ForegroundColor Yellow
    
    # Get all documents from Docker
    $dockerDocs = docker exec -i $DOCKER_CONTAINER psql -U $DOCKER_USER -d $DOCKER_DB -t -c "SELECT id, project_id, name, content::text, template_id, version, status, file_path, file_size, mime_type, framework, metadata::text, created_by, updated_by, created_at, updated_at FROM documents ORDER BY created_at;"
    
    if (-not $dockerDocs) {
        Write-Host "   No documents found in Docker" -ForegroundColor Gray
        return $true
    }
    
    $env:PGPASSWORD = $NEON_PASSWORD
    
    # Process each document
    $docCount = 0
    foreach ($line in $dockerDocs) {
        if ($line.Trim()) {
            $fields = $line -split '\|'
            if ($fields.Count -ge 16) {
                $id = $fields[0].Trim()
                $projectId = $fields[1].Trim()
                $name = $fields[2].Trim()
                $content = $fields[3].Trim()
                $templateId = $fields[4].Trim()
                $version = $fields[5].Trim()
                $status = $fields[6].Trim()
                $filePath = $fields[7].Trim()
                $fileSize = $fields[8].Trim()
                $mimeType = $fields[9].Trim()
                $framework = $fields[10].Trim()
                $metadata = $fields[11].Trim()
                $createdBy = $fields[12].Trim()
                $updatedBy = $fields[13].Trim()
                $createdAt = $fields[14].Trim()
                $updatedAt = $fields[15].Trim()
                
                # Handle NULL values
                if ($projectId -eq '') { $projectId = 'NULL' }
                if ($templateId -eq '') { $templateId = 'NULL' }
                if ($createdBy -eq '') { $createdBy = 'NULL' }
                if ($updatedBy -eq '') { $updatedBy = 'NULL' }
                
                # Escape single quotes in content and metadata
                $content = $content -replace "'", "''"
                $metadata = $metadata -replace "'", "''"
                $name = $name -replace "'", "''"
                $filePath = $filePath -replace "'", "''"
                
                $upsertSql = @"
INSERT INTO documents (id, project_id, name, content, template_id, version, status, file_path, file_size, mime_type, framework, metadata, created_by, updated_by, created_at, updated_at)
VALUES ('$id', $projectId, '$name', '$content'::jsonb, $templateId, $version, '$status', '$filePath', $fileSize, '$mimeType', '$framework', '$metadata'::jsonb, $createdBy, $updatedBy, '$createdAt', '$updatedAt')
ON CONFLICT (id) DO UPDATE SET
    project_id = EXCLUDED.project_id,
    name = EXCLUDED.name,
    content = EXCLUDED.content,
    template_id = EXCLUDED.template_id,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    file_path = EXCLUDED.file_path,
    file_size = EXCLUDED.file_size,
    mime_type = EXCLUDED.mime_type,
    framework = EXCLUDED.framework,
    metadata = EXCLUDED.metadata,
    created_by = EXCLUDED.created_by,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;
"@
                
                if (-not $DryRun) {
                    $upsertSql | psql $connectionString
                    if ($LASTEXITCODE -eq 0) {
                        $docCount++
                    }
                } else {
                    $docCount++
                }
            }
        }
    }
    
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    
    Write-Host "   Documents processed: $docCount" -ForegroundColor Green
    return $true
}

# Main execution
try {
    Write-Host "Starting smart migration process..." -ForegroundColor Cyan
    Write-Host "Dry Run: $DryRun" -ForegroundColor Gray
    Write-Host "Backup: $Backup" -ForegroundColor Gray
    Write-Host ""
    
    # Create backup directory
    if ($Backup) {
        New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
        Write-Host "Backup directory created: $BACKUP_DIR" -ForegroundColor Green
    }
    
    # Step 1: Check Docker container
    if (-not (Test-DockerContainer)) {
        throw "Docker container check failed"
    }
    
    # Step 2: Test Neon connection
    if (-not (Test-NeonConnection)) {
        throw "Neon connection test failed"
    }
    
    # Step 3: Get current counts
    $env:PGPASSWORD = $NEON_PASSWORD
    $connectionString = "host=$NEON_HOST port=$NEON_PORT dbname=$NEON_DB user=$NEON_USER sslmode=$NEON_SSL"
    
    Write-Host ""
    $neonCounts = Get-CurrentCounts $connectionString "Neon"
    
    Write-Host ""
    $dockerCounts = Get-CurrentCounts "docker exec -i $DOCKER_CONTAINER psql -U $DOCKER_USER -d $DOCKER_DB" "Docker"
    
    # Step 4: Migrate data table by table
    Write-Host ""
    Write-Host "Starting table-by-table migration..." -ForegroundColor Cyan
    
    # Migrate users first (they're referenced by other tables)
    if (-not (Migrate-TableData "users" $connectionString)) {
        throw "Users migration failed"
    }
    
    # Migrate projects
    if (-not (Migrate-TableData "projects" $connectionString)) {
        throw "Projects migration failed"
    }
    
    # Migrate templates
    if (-not (Migrate-TableData "templates" $connectionString)) {
        throw "Templates migration failed"
    }
    
    # Migrate documents with special handling
    if (-not (Migrate-Documents $connectionString)) {
        throw "Documents migration failed"
    }
    
    # Migrate audit logs
    if (-not (Migrate-TableData "audit_logs" $connectionString)) {
        throw "Audit logs migration failed"
    }
    
    # Step 5: Verify final counts
    Write-Host ""
    Write-Host "Final verification..." -ForegroundColor Cyan
    $finalCounts = Get-CurrentCounts $connectionString "Final"
    
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    
    Write-Host ""
    Write-Host "Migration completed successfully!" -ForegroundColor Green
    Write-Host "Backup files saved in: $BACKUP_DIR" -ForegroundColor Gray
    
    if (-not $DryRun) {
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Test your application with the migrated data" -ForegroundColor White
        Write-Host "2. Verify all documents are accessible" -ForegroundColor White
        Write-Host "3. Once verified, you can stop using Docker PostgreSQL" -ForegroundColor White
    }
    
} catch {
    Write-Host ""
    Write-Host "Migration failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Check backup files in: $BACKUP_DIR" -ForegroundColor Gray
    exit 1
}
