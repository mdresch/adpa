# Fix Git Permissions and Complete Merge
# MUST RUN AS ADMINISTRATOR

$repoPath = "D:\source\repos\adpa"
$gitDir = Join-Path $repoPath ".git"

Write-Host "=== Git Permissions Fix Script ===" -ForegroundColor Cyan
Write-Host "Repository: $repoPath" -ForegroundColor Yellow
Write-Host "`nWARNING: This script must be run as Administrator!" -ForegroundColor Red

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "`nERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator', then run this script." -ForegroundColor Yellow
    exit 1
}

Set-Location $repoPath

# Step 1: Remove deny permissions
Write-Host "`n[1/3] Removing deny permissions from .git directory..." -ForegroundColor Cyan
$acl = Get-Acl $gitDir
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

# Remove all deny rules for current user
$denyRules = $acl.Access | Where-Object { 
    $_.IdentityReference -eq $currentUser -and 
    $_.AccessControlType -eq "Deny" 
}

foreach ($rule in $denyRules) {
    Write-Host "Removing deny rule: $($rule.FileSystemRights)" -ForegroundColor Yellow
    $acl.RemoveAccessRule($rule) | Out-Null
}

# Add allow rule
$allowRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    $currentUser, 
    "FullControl", 
    "ContainerInherit,ObjectInherit", 
    "None", 
    "Allow"
)
$acl.SetAccessRule($allowRule)
Set-Acl $gitDir $acl
Write-Host "Permissions fixed!" -ForegroundColor Green

# Step 2: Remove lock file if exists
Write-Host "`n[2/3] Removing lock file..." -ForegroundColor Cyan
$lockFile = Join-Path $gitDir "index.lock"
if (Test-Path $lockFile) {
    Remove-Item $lockFile -Force
    Write-Host "Lock file removed!" -ForegroundColor Green
} else {
    Write-Host "No lock file found." -ForegroundColor Green
}

# Step 3: Complete merge
Write-Host "`n[3/3] Completing merge..." -ForegroundColor Cyan
$mergeHead = Join-Path $gitDir "MERGE_HEAD"
if (Test-Path $mergeHead) {
    git commit -m "Merge remote-tracking branch 'origin/adpa-project-charter'"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nMerge completed successfully!" -ForegroundColor Green
        Write-Host "`nCurrent status:" -ForegroundColor Cyan
        git status
    } else {
        Write-Host "`nMerge commit failed. Error code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host "Run 'git status' to see current state." -ForegroundColor Yellow
    }
} else {
    Write-Host "No merge in progress. Pulling..." -ForegroundColor Yellow
    git pull
}

Write-Host "`n=== Script Complete ===" -ForegroundColor Green
