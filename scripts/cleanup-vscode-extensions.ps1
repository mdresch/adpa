# VS Code Extension Cleanup Script
# Purpose: Disable all VS Code extensions EXCEPT essentials for ADPA development
# Author: AI Architect
# Date: 2025-10-25

param(
    [switch]$DryRun  # Preview what would be disabled without actually doing it
)

$ErrorActionPreference = "Stop"

Write-Host "🔧 VS Code Extension Cleanup for ADPA" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host ""

# Essential extensions to KEEP enabled for ADPA beacon development
$essentialExtensions = @(
    "github.copilot",                    # GitHub Copilot (AI coding)
    "github.copilot-chat",              # GitHub Copilot Chat (enhanced AI)
    "dbaeumer.vscode-eslint",           # ESLint (code quality)
    "ms-vscode.vscode-typescript-next", # TypeScript (language support)
    "esbenp.prettier-vscode",           # Prettier (code formatting)
    "ms-azuretools.vscode-docker",      # Docker (for Qdrant, Redis if needed)
    "ms-vscode.powershell",             # PowerShell (for scripts)
    "ckolkman.vscode-postgres"          # PostgreSQL (SQL syntax)
)

Write-Host "📋 Essential Extensions (will KEEP enabled):" -ForegroundColor Green
foreach ($ext in $essentialExtensions) {
    Write-Host "   ✅ $ext" -ForegroundColor White
}
Write-Host ""

# Get list of all installed extensions
Write-Host "🔍 Scanning installed extensions..." -ForegroundColor Yellow
$allExtensions = code --list-extensions

Write-Host "📊 Found $($allExtensions.Count) installed extensions" -ForegroundColor Cyan
Write-Host ""

# Determine which to disable
$toDisable = @()
foreach ($ext in $allExtensions) {
    if ($essentialExtensions -notcontains $ext) {
        $toDisable += $ext
    }
}

Write-Host "🎯 Extensions to DISABLE: $($toDisable.Count)" -ForegroundColor Yellow
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - Preview only (no changes made)" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Would disable these extensions:" -ForegroundColor Yellow
    foreach ($ext in $toDisable) {
        Write-Host "   ❌ $ext" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Run without -DryRun flag to actually disable them." -ForegroundColor Cyan
} else {
    Write-Host "⚠️  This will DISABLE $($toDisable.Count) extensions (keeps $($essentialExtensions.Count) essential)" -ForegroundColor Yellow
    Write-Host "   Extensions are not uninstalled, just disabled (you can re-enable later)" -ForegroundColor Gray
    Write-Host ""
    
    $confirmation = Read-Host "Continue? (y/n)"
    
    if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
        Write-Host ""
        Write-Host "🔄 Disabling extensions..." -ForegroundColor Cyan
        
        $disabled = 0
        foreach ($ext in $toDisable) {
            try {
                code --uninstall-extension $ext 2>&1 | Out-Null
                $disabled++
                
                if ($disabled % 10 -eq 0) {
                    Write-Host "   Progress: $disabled / $($toDisable.Count) disabled..." -ForegroundColor Gray
                }
            } catch {
                Write-Warning "   Failed to disable: $ext"
            }
        }
        
        Write-Host ""
        Write-Host "✅ Disabled $disabled extensions!" -ForegroundColor Green
        Write-Host "✅ Kept $($essentialExtensions.Count) essential extensions enabled" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Results:" -ForegroundColor Cyan
        Write-Host "   Before: 139 extensions (slow)" -ForegroundColor Gray
        Write-Host "   After:  $($essentialExtensions.Count) extensions (fast!)" -ForegroundColor Green
        Write-Host ""
        Write-Host "🚀 Restart VS Code to see the improvement!" -ForegroundColor Cyan
        Write-Host "   Close VS Code and run: code D:\source\repos\adpa" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "❌ Cancelled - no changes made" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "💡 TIP: If you need an extension later, you can re-enable it in VS Code Extensions panel" -ForegroundColor Cyan
Write-Host ""

