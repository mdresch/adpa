# Force unlock git and complete merge
# Run this script as Administrator if needed

$repoPath = "D:\source\repos\adpa"
$lockFile = Join-Path $repoPath ".git\index.lock"

Write-Host "=== Git Force Unlock Script ===" -ForegroundColor Cyan
Write-Host "Repository: $repoPath" -ForegroundColor Yellow

# Step 1: Check for git processes
Write-Host "`n[1/4] Checking for git processes..." -ForegroundColor Cyan
$gitProcesses = Get-Process | Where-Object {
    $_.ProcessName -match "git" -or 
    $_.Path -like "*git*" -or
    $_.CommandLine -like "*git*"
}
if ($gitProcesses) {
    Write-Host "Found git-related processes:" -ForegroundColor Yellow
    $gitProcesses | Format-Table ProcessName, Id, Path -AutoSize
    Write-Host "Consider closing these processes." -ForegroundColor Yellow
} else {
    Write-Host "No git processes found." -ForegroundColor Green
}

# Step 2: Force remove lock file
Write-Host "`n[2/4] Attempting to remove lock file..." -ForegroundColor Cyan
if (Test-Path $lockFile) {
    Write-Host "Lock file found: $lockFile" -ForegroundColor Yellow
    try {
        # Try normal delete
        Remove-Item $lockFile -Force -ErrorAction Stop
        Write-Host "Lock file removed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "Normal delete failed. Trying .NET method..." -ForegroundColor Yellow
        try {
            # Try .NET File.Delete
            [System.IO.File]::Delete($lockFile)
            Write-Host "Lock file removed using .NET method!" -ForegroundColor Green
        } catch {
            Write-Host "Failed to remove lock file: $_" -ForegroundColor Red
            Write-Host "You may need to:" -ForegroundColor Yellow
            Write-Host "  1. Close Cursor/VS Code and all editors" -ForegroundColor Yellow
            Write-Host "  2. Run this script as Administrator" -ForegroundColor Yellow
            Write-Host "  3. Or manually delete: $lockFile" -ForegroundColor Yellow
            exit 1
        }
    }
} else {
    Write-Host "No lock file found (this is good)." -ForegroundColor Green
}

# Step 3: Check git status
Write-Host "`n[3/4] Checking git status..." -ForegroundColor Cyan
Set-Location $repoPath
$status = git status --porcelain
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git command failed. Lock file may still be present." -ForegroundColor Red
    exit 1
}

# Step 4: Complete merge or pull
Write-Host "`n[4/4] Attempting to complete merge/pull..." -ForegroundColor Cyan

# Check if we're in a merge state
$mergeHead = Join-Path $repoPath ".git\MERGE_HEAD"
if (Test-Path $mergeHead) {
    Write-Host "Merge in progress. Completing merge..." -ForegroundColor Yellow
    git commit -m "Merge remote-tracking branch 'origin/adpa-project-charter'"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Merge completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Merge commit failed. Error code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host "You may need to resolve this manually." -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "No merge in progress. Pulling latest changes..." -ForegroundColor Yellow
    git pull
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Pull completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Pull failed. Error code: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n=== Script Complete ===" -ForegroundColor Green
Write-Host "Current status:" -ForegroundColor Cyan
git status
