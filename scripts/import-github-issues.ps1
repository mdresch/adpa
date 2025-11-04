# GitHub Issues Importer - PowerShell Wrapper
# 
# This script provides a Windows-friendly interface to the TypeScript importer
# 
# Prerequisites:
# - Node.js and npm installed
# - tsx installed: npm install -g tsx
# - GitHub Personal Access Token
# 
# Usage:
#   .\import-github-issues.ps1 -Stats
#   .\import-github-issues.ps1 -Batch "sprint-1" -DryRun
#   .\import-github-issues.ps1 -Priority "high" -Status "planned" -Limit 50

param(
    [string]$Batch = "",
    [string]$Priority = "",
    [string]$Status = "",
    [int]$Limit = 0,
    [string]$Labels = "",
    [string]$Milestone = "",
    [string]$Assignee = "",
    [switch]$DryRun = $false,
    [switch]$Stats = $false,
    [switch]$Help = $false
)

# Colors for output
$ErrorColor = "Red"
$SuccessColor = "Green"
$InfoColor = "Cyan"
$WarningColor = "Yellow"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Check for GitHub token
if (-not $env:GITHUB_TOKEN -and -not $Stats -and -not $Help) {
    Write-ColorOutput "❌ Error: GITHUB_TOKEN environment variable is not set" $ErrorColor
    Write-ColorOutput "`nTo set your GitHub token:" $InfoColor
    Write-ColorOutput '  $env:GITHUB_TOKEN = "ghp_your_token_here"' $InfoColor
    Write-ColorOutput "`nOr add it to your PowerShell profile for persistence" $InfoColor
    exit 1
}

# Build command arguments
$scriptPath = Join-Path $PSScriptRoot "import-github-issues.ts"
$args = @()

if ($Help) {
    $args += "--help"
}
elseif ($Stats) {
    $args += "--stats"
}
else {
    if ($DryRun) { $args += "--dry-run" }
    if ($Batch) { $args += "--batch", $Batch }
    if ($Priority) { $args += "--priority", $Priority }
    if ($Status) { $args += "--status", $Status }
    if ($Limit -gt 0) { $args += "--limit", $Limit }
    if ($Labels) { $args += "--labels", $Labels }
    if ($Milestone) { $args += "--milestone", $Milestone }
    if ($Assignee) { $args += "--assignee", $Assignee }
}

# Check if tsx is installed
$tsxInstalled = Get-Command tsx -ErrorAction SilentlyContinue
if (-not $tsxInstalled) {
    Write-ColorOutput "⚠ tsx is not installed. Installing globally..." $WarningColor
    npm install -g tsx
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "❌ Failed to install tsx" $ErrorColor
        exit 1
    }
}

# Execute the TypeScript script
Write-ColorOutput "`n🚀 Running GitHub Issues Importer..." $InfoColor
Write-ColorOutput "   Script: $scriptPath" $InfoColor
Write-ColorOutput "   Arguments: $($args -join ' ')" $InfoColor
Write-ColorOutput ""

try {
    tsx $scriptPath @args
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "`n✅ Script completed successfully" $SuccessColor
    } else {
        Write-ColorOutput "`n❌ Script failed with exit code $LASTEXITCODE" $ErrorColor
        exit $LASTEXITCODE
    }
}
catch {
    Write-ColorOutput "`n❌ Error executing script: $_" $ErrorColor
    exit 1
}

