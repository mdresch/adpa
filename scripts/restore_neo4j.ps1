param(
    [Parameter(Mandatory = $true)]
    [string]$DumpFilePath
)

if (-Not (Test-Path -Path $DumpFilePath)) {
    Write-Host "Error: The file '$DumpFilePath' does not exist." -ForegroundColor Red
    exit 1
}

Write-Host "Starting Neo4j Aura to Local Docker Migration..." -ForegroundColor Cyan

$FileName = Split-Path -Leaf $DumpFilePath
$ImportDir = "/var/lib/neo4j/import"

# 1. Copy the backup file into the neo4j container's IMPORT directory
Write-Host "1/3 Uploading backup file into the Neo4j container..." -ForegroundColor Yellow
docker cp $DumpFilePath "adpa-neo4j_db:$ImportDir/$FileName"

# 2. Fully stop the container to ensure neo4j process is definitely offline before restore
Write-Host "2/3 Stopping Neo4j container cleanly before restore..." -ForegroundColor Yellow
docker stop adpa-neo4j_db
Start-Sleep -Seconds 3

# 3. Use a temporary one-off neo4j container to run neo4j-admin with direct volume access
# NOTE: --from-path must point to the DIRECTORY containing the archive, not the file itself
# Neo4j will auto-discover the .backup/.dump file within that directory
Write-Host "3/3 Running neo4j-admin database load via temporary container..." -ForegroundColor Yellow
docker run --rm `
    -v adpa_neo4j_data:/data `
    -v "adpa-neo4j_db-import:/var/lib/neo4j/import" `
    neo4j:5-community `
    neo4j-admin database load neo4j --from-path=$ImportDir --overwrite-destination=true

# 4. Restart the container to bring the database back online
Write-Host "Bringing graph database back online..." -ForegroundColor Yellow
docker start adpa-neo4j_db
Start-Sleep -Seconds 5

if ($LASTEXITCODE -eq 0) {
    Write-Host "Migration completed successfully!" -ForegroundColor Green
    Write-Host "Nodes and relationships available at: bolt://localhost:7687" -ForegroundColor Green
    Write-Host "Browser UI available at: http://localhost:7474" -ForegroundColor Green
}
else {
    Write-Host "Migration failed. Please check the error messages above." -ForegroundColor Red
}
