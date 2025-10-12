# Generate Document Migration SQL
# This script exports documents from Docker and creates UPSERT statements for Neon

Write-Host "Generating Document Migration SQL" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$DOCKER_CONTAINER = "adpa-postgres"
$DOCKER_DB = "adpa_db"
$DOCKER_USER = "postgres"

$OUTPUT_FILE = "./document-migration-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"

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

function Export-Documents {
    Write-Host "Exporting documents from Docker..." -ForegroundColor Yellow
    
    # Export documents with proper formatting
    $exportFile = "./temp_documents_export.sql"
    docker exec -i $DOCKER_CONTAINER pg_dump -U $DOCKER_USER -d $DOCKER_DB --data-only --inserts -t documents > $exportFile
    
    if (-not (Test-Path $exportFile)) {
        Write-Host "Failed to export documents" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Documents exported to temporary file" -ForegroundColor Green
    return $exportFile
}

function Generate-UpsertSQL {
    param($exportFile)
    
    Write-Host "Generating UPSERT SQL statements..." -ForegroundColor Yellow
    
    # Read the export file
    $content = Get-Content $exportFile -Raw
    
    if (-not $content -or $content -notmatch "INSERT INTO") {
        Write-Host "No INSERT statements found in export" -ForegroundColor Red
        return $false
    }
    
    # Create the migration SQL file
    $migrationSQL = @"
-- ADPA Document Migration SQL
-- Generated: $(Get-Date)
-- This script migrates documents from Docker PostgreSQL to Neon database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Begin transaction
BEGIN;

-- Document migration with UPSERT (INSERT ... ON CONFLICT)
-- This will insert new documents or update existing ones

"@
    
    # Process each INSERT statement
    $insertStatements = $content -split "INSERT INTO documents"
    $processedCount = 0
    
    foreach ($statement in $insertStatements) {
        if ($statement.Trim() -and $statement -match "VALUES") {
            # Convert INSERT to UPSERT
            $upsertStatement = "INSERT INTO documents" + $statement.Trim()
            $upsertStatement = $upsertStatement -replace ";$", " ON CONFLICT (id) DO UPDATE SET
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
    updated_at = EXCLUDED.updated_at;"
            
            $migrationSQL += $upsertStatement + "`n`n"
            $processedCount++
        }
    }
    
    $migrationSQL += @"

-- Commit the transaction
COMMIT;

-- Verification query
SELECT COUNT(*) as total_documents FROM documents;
SELECT name, created_at FROM documents ORDER BY created_at DESC LIMIT 10;

-- Migration completed
-- Total documents processed: $processedCount
"@
    
    # Save the migration file
    $migrationSQL | Out-File $OUTPUT_FILE -Encoding UTF8
    
    Write-Host "Migration SQL generated: $OUTPUT_FILE" -ForegroundColor Green
    Write-Host "Processed $processedCount document statements" -ForegroundColor Gray
    
    return $true
}

function Show-MigrationInstructions {
    Write-Host ""
    Write-Host "Migration Instructions:" -ForegroundColor Cyan
    Write-Host "======================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. The migration SQL file has been created: $OUTPUT_FILE" -ForegroundColor White
    Write-Host ""
    Write-Host "2. To execute the migration, run one of these commands:" -ForegroundColor White
    Write-Host ""
    Write-Host "   Option A - Using psql command line:" -ForegroundColor Yellow
    Write-Host "   psql 'postgresql://neondb_owner:npg_6H1YnZiDleEV@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require' -f $OUTPUT_FILE" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Option B - Using pgAdmin or any PostgreSQL client:" -ForegroundColor Yellow
    Write-Host "   Connect to your Neon database and execute the contents of $OUTPUT_FILE" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. The migration will:" -ForegroundColor White
    Write-Host "   - Insert new documents that don't exist in Neon" -ForegroundColor Gray
    Write-Host "   - Update existing documents if they already exist (by ID)" -ForegroundColor Gray
    Write-Host "   - Preserve all document content and metadata" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. After migration, verify the results:" -ForegroundColor White
    Write-Host "   - Check that you have 48 documents in Neon" -ForegroundColor Gray
    Write-Host "   - Test your application to ensure documents are accessible" -ForegroundColor Gray
}

# Main execution
try {
    # Check Docker container
    if (-not (Test-DockerContainer)) {
        throw "Docker container check failed"
    }
    
    # Export documents
    $exportFile = Export-Documents
    if (-not $exportFile) {
        throw "Document export failed"
    }
    
    # Generate migration SQL
    if (-not (Generate-UpsertSQL $exportFile)) {
        throw "SQL generation failed"
    }
    
    # Show instructions
    Show-MigrationInstructions
    
    # Clean up temporary file
    if (Test-Path $exportFile) {
        Remove-Item $exportFile
    }
    
    Write-Host ""
    Write-Host "Document migration SQL generation completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "Generation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
