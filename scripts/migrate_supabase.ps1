param(
    [Parameter(Mandatory = $true)]
    [string]$SupabaseConnectionString
)

Write-Host "Starting Supabase Migration..." -ForegroundColor Cyan

# We only want the 'public' schema where Supabase stores your custom app data.
# The auth, storage, and graphql schemas are Supabase internals.
$DumpCommand = "pg_dump --clean --if-exists --quote-all-identifiers --schema=public --no-owner --no-privileges -d '$SupabaseConnectionString'"

# We pipe the output of pg_dump directly into psql connected to the local database
$RestoreCommand = "psql -U myuser -d adpa"

Write-Host "Preparing local database with Supabase dependency stubs..." -ForegroundColor Yellow
$StubCommand = "psql -U myuser -d adpa"
Get-Content "$PSScriptRoot\supabase_stub.sql" | docker exec -i adpa-postgres_db sh -c "$StubCommand"

Write-Host "Extracting from Supabase and importing to local Docker container..." -ForegroundColor Yellow

# Execute inside the running postgres container
docker exec -i adpa-postgres_db sh -c "$DumpCommand" | docker exec -i adpa-postgres_db sh -c "$RestoreCommand"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Migration completed successfully!" -ForegroundColor Green
    Write-Host "Your data is now available locally at: postgresql://myuser:mypassword@localhost:6432/adpa" -ForegroundColor Green
}
else {
    Write-Host "Migration failed. Please check the error messages above." -ForegroundColor Red
}
