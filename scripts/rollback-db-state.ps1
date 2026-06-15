# scripts/rollback-db-state.ps1
$ErrorActionPreference = "Continue"

$BackupDir = "backups/agent_snapshots"
if (-not (Test-Path -Path $BackupDir)) {
    Write-Warning "No snapshots found in $BackupDir. Nothing to rollback."
    exit 0
}

function Get-EnvVar {
    param([string]$FilePath, [string]$VarName)
    if (Test-Path $FilePath) {
        $Match = Select-String -Path $FilePath -Pattern "^$VarName=(.*)$" | Select-Object -First 1
        if ($Match) {
            $Value = $Match.Matches.Groups[1].Value.Trim()
            if ($Value -match '^"(.*)"$') { $Value = $matches[1] }
            if ($Value -match "^'(.*)'$") { $Value = $matches[1] }
            return $Value
        }
    }
    return $null
}

$MorphicDbUrl = Get-EnvVar ".env" "MORPHIC_DATABASE_URL"
$ServerDbUrl = Get-EnvVar "server/.env" "DATABASE_URL"

Write-Host "Rolling back to pre-execution state..."

if ($MorphicDbUrl -and (Test-Path "$BackupDir/morphic_db.dump")) {
    Write-Host "Restoring Morphic Database..."
    try {
        pg_restore --clean --if-exists --no-owner --no-acl -d $MorphicDbUrl "$BackupDir/morphic_db.dump"
        Write-Host "Morphic Database Restored." -ForegroundColor Green
    } catch {
        Write-Warning "Morphic DB restore failed. Check pg_restore PATH."
    }
}

if ($ServerDbUrl -and (Test-Path "$BackupDir/server_db.dump")) {
    Write-Host "Restoring Server Database..."
    try {
        pg_restore --clean --if-exists --no-owner --no-acl -d $ServerDbUrl "$BackupDir/server_db.dump"
        Write-Host "Server Database Restored." -ForegroundColor Green
    } catch {
        Write-Warning "Server DB restore failed. Check pg_restore PATH."
    }
}

Write-Host "Database state successfully rolled back."
