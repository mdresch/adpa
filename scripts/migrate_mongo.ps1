param(
    [Parameter(Mandatory = $true)]
    [string]$MongoAtlasURI
)

Write-Host "Starting MongoDB Atlas Migration..." -ForegroundColor Cyan

# The mongodump command connects to your Atlas cluster and exports all collections from the 'adpa_rag' database.
# The --archive flag streams the output instead of writing a directory of BSON files.
# The --gzip flag compresses the stream to save bandwidth.
$DumpCommand = "mongodump --uri='$MongoAtlasURI' --archive --gzip"

# The mongorestore command reads the streaming archive and imports it directly into the local adpa-mongodb container.
# We connect as the 'root' user we defined in docker-compose.yml
# --drop ensures collections are cleared before importing so you never get duplicate keys on rerun.
$RestoreCommand = "mongorestore --uri='mongodb://root:mypassword@localhost:27017/' --archive --gzip --drop"

Write-Host "Extracting from Atlas and importing to local Docker container..." -ForegroundColor Yellow

# Execute mongodump and mongorestore in a single linux shell command to prevent PowerShell from corrupting the binary gzip stream
$CombinedCommand = "$DumpCommand | $RestoreCommand"
docker exec -i adpa-mongodb sh -c $CombinedCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "Migration completed successfully!" -ForegroundColor Green
    Write-Host "Your documents are now available locally at: mongodb://root:mypassword@localhost:27017/" -ForegroundColor Green
}
else {
    Write-Host "Migration failed. Please check the error messages above." -ForegroundColor Red
}
