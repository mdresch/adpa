<#
.SYNOPSIS
    Run Railway CLI to confirm latest repo state and deploy / verify ADPA backend.

.DESCRIPTION
    - Prints current branch and latest commits (so you know what "latest" means).
    - Optionally checks sync with origin (ahead/behind).
    - Runs railway status, then railway up --detach to deploy local → Railway.
    - Shows recent logs to confirm deployment.

    Run from repo root, or from scripts/ (it will cd to repo root).
    Requires: railway CLI, git. Run 'railway login' first if not yet authenticated.

.PARAMETER SkipDeploy
    Only run status + logs. Do not run railway up.

.PARAMETER DeployOnly
    Only run railway up --detach. Skip status and logs.

.PARAMETER LinkProject
    If set, run railway link with ADPA project ID before deploy. Use when not yet linked.

.EXAMPLE
    .\scripts\railway-deploy-and-verify.ps1

.EXAMPLE
    .\scripts\railway-deploy-and-verify.ps1 -SkipDeploy
#>

param(
    [switch] $SkipDeploy,
    [switch] $DeployOnly,
    [switch] $LinkProject
)

$ErrorActionPreference = "Stop"
$ProjectId = "2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3"

# Repo root: script in scripts/ -> parent of scripts
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path
Set-Location $RepoRoot

Write-Host "=== Railway Deploy & Verify ===" -ForegroundColor Cyan
Write-Host "Repo root: $RepoRoot`n" -ForegroundColor Gray

# --- Git state ---
Write-Host "--- Git (latest repo state) ---" -ForegroundColor Yellow
$branch = git branch --show-current 2>$null
if (-not $branch) { Write-Warning "Not a git repo or no branch." } else {
    Write-Host "Branch: $branch"
    try { git fetch origin 2>&1 | Out-Null } catch { }
    $ahead = git rev-list --count "origin/$branch..HEAD" 2>$null
    $behind = git rev-list --count "HEAD..origin/$branch" 2>$null
    if (-not $ahead) { $ahead = 0 }; if (-not $behind) { $behind = 0 }
    if ($ahead -gt 0) { Write-Host "Ahead of origin/$branch : $ahead commit(s). Consider pushing." -ForegroundColor Yellow }
    if ($behind -gt 0) { Write-Host "Behind origin/$branch : $behind commit(s). Consider pulling." -ForegroundColor Yellow }
    if ($ahead -eq 0 -and $behind -eq 0) { Write-Host "In sync with origin/$branch" -ForegroundColor Green }
    Write-Host "`nLatest 3 commits:"
    git log -3 --oneline
    Write-Host ""
}

# --- Railway link (optional) ---
if ($LinkProject) {
    Write-Host "--- Railway link ---" -ForegroundColor Yellow
    railway link $ProjectId
    if ($LASTEXITCODE -ne 0) { throw "railway link failed" }
    Write-Host ""
}

# --- Railway status ---
if (-not $DeployOnly) {
    Write-Host "--- Railway status ---" -ForegroundColor Yellow
    $railwayStatus = railway status 2>&1
    $railwayStatus | ForEach-Object { Write-Host $_ }
    $railwayStatusText = $railwayStatus -join "`n"
    if ($LASTEXITCODE -ne 0) {
        if ($railwayStatusText -match 'Unauthorized|Please login|login with') {
            throw "Railway CLI not logged in. Run 'railway login' first, then re-run this script."
        }
        throw "railway status failed (not linked? run with -LinkProject or 'railway link')"
    }
    Write-Host ""
}

# --- Deploy ---
if (-not $SkipDeploy) {
    Write-Host "--- Railway deploy (railway up --detach) ---" -ForegroundColor Yellow
    $deployOut = railway up --detach 2>&1
    $deployOut | ForEach-Object { Write-Host $_ }
    $deployText = $deployOut -join "`n"
    if ($LASTEXITCODE -ne 0) {
        if ($deployText -match 'timed out|operation timed out|timeout') {
            Write-Host ""
            throw "Deploy upload finished but the request to Railway timed out. " +
                "Check the Railway dashboard - a deploy may have been triggered anyway. " +
                "Retry with: railway up --detach"
        }
        throw "railway up failed"
    }
    Write-Host "Deploy triggered. Waiting 10s before fetching logs..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
}

# --- Logs ---
if (-not $DeployOnly) {
    Write-Host "`n--- Recent Railway logs ---" -ForegroundColor Yellow
    railway logs 2>&1 | Select-Object -Last 50
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
Write-Host "Health:  curl https://adpa-production.up.railway.app/health" -ForegroundColor Gray
