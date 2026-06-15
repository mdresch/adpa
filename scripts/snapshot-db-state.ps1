# scripts/snapshot-db-state.ps1
$ErrorActionPreference = "Continue"

$BackupDir = "backups/agent_snapshots"
if (-not (Test-Path -Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}

function Get-EnvVar {
    param([string]$FilePath, [string]$VarName)
    if (Test-Path $FilePath) {
        $Match = Select-String -Path $FilePath -Pattern "^$VarName=(.*)$" | Select-Object -First 1
        if ($Match) {
            $Value = $Match.Matches.Groups[1].Value.Trim()
            # Remove wrapping quotes if any
            if ($Value -match '^"(.*)"$') { $Value = $matches[1] }
            if ($Value -match "^'(.*)'$") { $Value = $matches[1] }
            return $Value
        }
    }
    return $null
}

$MorphicDbUrl = Get-EnvVar ".env" "MORPHIC_DATABASE_URL"
$ServerDbUrl = Get-EnvVar "server/.env" "DATABASE_URL"

Write-Host "Creating agent execution snapshots..."

if ($MorphicDbUrl) {
    Write-Host "Snapshotting Morphic Database..."
    # Use -Fc for custom format, allowing pg_restore --clean
    try {
        pg_dump --clean -Fc -f "$BackupDir/morphic_db.dump" $MorphicDbUrl
        if ($LASTEXITCODE -eq 0) { Write-Host "Morphic Database Snapshotted." -ForegroundColor Green }
    } catch {
        Write-Warning "Could not snapshot Morphic DB. Ensure pg_dump is in PATH."
    }
}

if ($ServerDbUrl) {
    Write-Host "Snapshotting Server Database..."
    try {
        pg_dump --clean -Fc -f "$BackupDir/server_db.dump" $ServerDbUrl
        if ($LASTEXITCODE -eq 0) { Write-Host "Server Database Snapshotted." -ForegroundColor Green }
    } catch {
        Write-Warning "Could not snapshot Server DB. Ensure pg_dump is in PATH."
    }
}

Write-Host "Snapshot execution complete."
