<#
.SYNOPSIS
    Sets up the 'adpa' command alias in your PowerShell profile.
    Run once: .\scripts\adpa\setup-alias.ps1
#>

$profilePath = $PROFILE.CurrentUserCurrentHost
$repoRoot = (Resolve-Path "$PSScriptRoot\..\..").Path
$aliasBlock = @"

# --- ADPA CLI (RPAS-CM) ---
function adpa {
    param([Parameter(Position=0)][string]`$Cmd, [Parameter(ValueFromRemainingArguments)]`$Rest)
    & "$repoRoot\scripts\adpa.ps1" `$Cmd @Rest
}
# --- /ADPA CLI ---
"@

# Check if already installed
if (Test-Path $profilePath) {
    $existing = Get-Content $profilePath -Raw
    if ($existing -match "ADPA CLI") {
        Write-Host "ADPA CLI alias already in profile. No changes made." -ForegroundColor Yellow
        return
    }
}

Add-Content -Path $profilePath -Value $aliasBlock
Write-Host "✅ 'adpa' command added to PowerShell profile." -ForegroundColor Green
Write-Host "   Profile: $profilePath" -ForegroundColor DarkGray
Write-Host ""
Write-Host "   Reload with:  . `$PROFILE" -ForegroundColor White
Write-Host ""
Write-Host "   Then use:" -ForegroundColor Cyan
Write-Host "     adpa up" -ForegroundColor White
Write-Host "     adpa down" -ForegroundColor White
Write-Host "     adpa rebuild" -ForegroundColor White
Write-Host "     adpa health" -ForegroundColor White
Write-Host "     adpa validate -ChangeDescription 'my change'" -ForegroundColor White
