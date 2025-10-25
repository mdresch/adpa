# Execute Document Migration to Neon
# This script extracts documents from Docker and migrates them to Neon

Write-Host "Executing Document Migration to Neon" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$DOCKER_CONTAINER = "adpa-postgres"
$DOCKER_DB = "adpa_db"
$DOCKER_USER = "postgres"

# Neon Database Configuration
$NEON_HOST = "ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech"
$NEON_PORT = "5432"
$NEON_DB = "adpa_db"
$NEON_USER = "neondb_owner"
$NEON_PASSWORD = "npg_6H1YnZiDleEV"
$NEON_SSL = "require"

$MIGRATION_FILE = "./final-document-migration.sql"

function Test-DockerContainer {
    Write-Host "Checking Docker container..." -ForegroundColor Yellow
    
    $containerStatus = docker ps -a --filter "name=$DOCKER_CONTAINER" --format "{{.Status}}"
    if ($containerStatus -notlike "*Up*") {
        Write-Host "Starting Docker container..." -ForegroundColor Yellow
        docker start $DOCKER_CONTAINER
        Start-Sleep -Seconds 3
    }
    
    Write-Host "Docker container is running" -ForegroundColor Green
    return $true
}

function Generate-MigrationSQL {
    Write-Host "Generating migration SQL..." -ForegroundColor Yellow
    
    # Create the migration SQL file
    $migrationSQL = @"
-- Final Document Migration to Neon
-- Generated: $(Get-Date)
-- This script migrates all documents from Docker PostgreSQL to Neon database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Begin transaction
BEGIN;

-- Create a temporary table to hold the migrated documents
CREATE TEMP TABLE documents_temp (
    id UUID,
    project_id UUID,
    name VARCHAR(255),
    content JSONB,
    template_id UUID,
    version INTEGER,
    status VARCHAR(20),
    file_path VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    framework VARCHAR(50),
    metadata JSONB,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

"@
    
    # Export documents from Docker and convert to INSERT statements
    Write-Host "Exporting documents from Docker..." -ForegroundColor Yellow
    
    # Get document count first
    $docCount = docker exec -i $DOCKER_CONTAINER psql -U $DOCKER_USER -d $DOCKER_DB -t -c "SELECT COUNT(*) FROM documents;"
    $docCount = $docCount.Trim()
    Write-Host "Found $docCount documents to migrate" -ForegroundColor Gray
    
    # Export documents data in a format we can process
    $tempFile = "./temp_docs.csv"
    docker exec -i $DOCKER_CONTAINER psql -U $DOCKER_USER -d $DOCKER_DB -c "\COPY (SELECT id, COALESCE(project_id::text, '') as project_id, name, COALESCE(content::text, '') as content, COALESCE(template_id::text, '') as template_id, version, status, COALESCE(file_path, '') as file_path, COALESCE(file_size::text, '') as file_size, COALESCE(mime_type, '') as mime_type, COALESCE(framework, '') as framework, COALESCE(metadata::text, '{}') as metadata, COALESCE(created_by::text, '') as created_by, COALESCE(updated_by::text, '') as updated_by, created_at, updated_at FROM documents ORDER BY created_at) TO STDOUT WITH CSV HEADER" > $tempFile
    
    if (-not (Test-Path $tempFile)) {
        Write-Host "Failed to export documents" -ForegroundColor Red
        return $false
    }
    
    # Process the CSV file and generate INSERT statements
    Write-Host "Processing document data..." -ForegroundColor Yellow
    
    $csvData = Import-Csv $tempFile
    $processedCount = 0
    
    foreach ($row in $csvData) {
        # Escape single quotes in text fields
        $name = $row.name -replace "'", "''"
        $content = $row.content -replace "'", "''"
        $filePath = $row.file_path -replace "'", "''"
        $metadata = $row.metadata -replace "'", "''"
        
        # Handle NULL values
        $projectId = if ($row.project_id) { "'$($row.project_id)'" } else { "NULL" }
        $templateId = if ($row.template_id) { "'$($row.template_id)'" } else { "NULL" }
        $createdBy = if ($row.created_by) { "'$($row.created_by)'" } else { "NULL" }
        $updatedBy = if ($row.updated_by) { "'$($row.updated_by)'" } else { "NULL" }
        $filePath = if ($row.file_path) { "'$($row.file_path)'" } else { "NULL" }
        $fileSize = if ($row.file_size) { $row.file_size } else { "NULL" }
        $mimeType = if ($row.mime_type) { "'$($row.mime_type)'" } else { "NULL" }
        $framework = if ($row.framework) { "'$($row.framework)'" } else { "NULL" }
        
        $insertStatement = @"
INSERT INTO documents_temp (id, project_id, name, content, template_id, version, status, file_path, file_size, mime_type, framework, metadata, created_by, updated_by, created_at, updated_at)
VALUES ('$($row.id)', $projectId, '$name', '$content'::jsonb, $templateId, $($row.version), '$($row.status)', $filePath, $fileSize, $mimeType, $framework, '$metadata'::jsonb, $createdBy, $updatedBy, '$($row.created_at)', '$($row.updated_at)');
"@
        
        $migrationSQL += $insertStatement + "`n`n"
        $processedCount++
    }
    
    # Add the merge statement
    $migrationSQL += @"

-- Merge documents from temp table to main table with UPSERT
INSERT INTO documents (id, project_id, name, content, template_id, version, status, file_path, file_size, mime_type, framework, metadata, created_by, updated_by, created_at, updated_at)
SELECT id, project_id, name, content, template_id, version, status, file_path, file_size, mime_type, framework, metadata, created_by, updated_by, created_at, updated_at
FROM documents_temp
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

-- Clean up temp table
DROP TABLE documents_temp;

-- Verify the migration
SELECT 'Documents after migration:' as info, COUNT(*) as count FROM documents;
SELECT 'Sample documents:' as info, name, created_at FROM documents ORDER BY created_at DESC LIMIT 5;

-- Commit the transaction
COMMIT;

-- Migration completed
-- Total documents processed: $processedCount
"@
    
    # Save the migration file
    $migrationSQL | Out-File $MIGRATION_FILE -Encoding UTF8
    
    # Clean up temp file
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    
    Write-Host "Migration SQL generated: $MIGRATION_FILE" -ForegroundColor Green
    Write-Host "Processed $processedCount documents" -ForegroundColor Gray
    
    return $true
}

function Execute-Migration {
    Write-Host "Executing migration..." -ForegroundColor Yellow
    
    $connectionString = "postgresql://$NEON_USER`:$NEON_PASSWORD@$NEON_HOST`:$NEON_PORT/$NEON_DB?sslmode=$NEON_SSL"
    
    try {
        # Execute the migration
        psql $connectionString -f $MIGRATION_FILE
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Migration executed successfully!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Migration failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main execution
try {
    # Check Docker container
    if (-not (Test-DockerContainer)) {
        throw "Docker container check failed"
    }
    
    # Generate migration SQL
    if (-not (Generate-MigrationSQL)) {
        throw "Migration SQL generation failed"
    }
    
    # Execute migration
    if (-not (Execute-Migration)) {
        throw "Migration execution failed"
    }
    
    Write-Host ""
    Write-Host "Document migration completed successfully!" -ForegroundColor Green
    Write-Host "Migration file: $MIGRATION_FILE" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Test your application to ensure documents are accessible" -ForegroundColor White
    Write-Host "2. Verify that all 48 documents are now available in Neon" -ForegroundColor White
    Write-Host "3. Once verified, you can stop using Docker PostgreSQL" -ForegroundColor White
    
} catch {
    Write-Host ""
    Write-Host "Migration failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Check migration file: $MIGRATION_FILE" -ForegroundColor Gray
    exit 1
}
