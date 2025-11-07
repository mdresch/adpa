<#
Run create_issues.js with GITHUB_TOKEN loaded from a .env file (if present).

Usage:
  PowerShell.exe -ExecutionPolicy Bypass -File .\.github\scripts\run_create_issues.ps1 mdresch/adpa

This script will:
 - look for a `.env` file in the repository root
 - load any KEY=VALUE lines into the current process environment
 - run the Node script `create_issues.js` with the provided owner/repo argument

Security: keep your .env file access-restricted and do not commit secrets to source control.
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$OwnerRepo
)

$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)
$EnvFile = Join-Path $RepoRoot '.env'

if (Test-Path $EnvFile) {
    Write-Host "Loading environment variables from $EnvFile"
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq '' -or $line.StartsWith('#')) { return }
        if ($line -match '^(?<k>[^=]+)=(?<v>.*)$') {
            $k = $matches['k'].Trim()
            $v = $matches['v'].Trim('"')
            Write-Host "Setting environment variable: $k"
            [System.Environment]::SetEnvironmentVariable($k, $v, 'Process')
        }
    }
} else {
    Write-Host ".env not found at $EnvFile — expecting GITHUB_TOKEN to be present in environment"
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Error "Node.js not found in PATH. Install Node.js and rerun."
    exit 2
}

$scriptPath = Join-Path $RepoRoot '.github\scripts\create_issues.js'
if (-not (Test-Path $scriptPath)) {
    Write-Error "create_issues.js not found at $scriptPath"
    exit 3
}

Write-Host "Running: node $scriptPath $OwnerRepo"
& node $scriptPath $OwnerRepo
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
    Write-Error "create_issues.js exited with code $exitCode"
}
exit $exitCode
