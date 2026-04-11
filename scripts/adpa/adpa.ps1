<#
.SYNOPSIS
    ADPA CLI — RPAS-CM Operational Command Suite

.DESCRIPTION
    Provides sub-commands for managing the ADPA Aspire stack.
    Must be run from the repository root (f:\Source\Repos\adpa).

.EXAMPLE
    .\scripts\adpa\adpa.ps1 up        # Start the stack
    .\scripts\adpa\adpa.ps1 down      # Stop all services
    .\scripts\adpa\adpa.ps1 rebuild   # Clean + build + start
    .\scripts\adpa\adpa.ps1 health    # Preflight check
    .\scripts\adpa\adpa.ps1 validate  # Run RPAS validation pipeline
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet("up", "down", "rebuild", "health", "validate", "help")]
    [string]$Command = "help"
)

# Import the module
Import-Module "$PSScriptRoot\adpa.psm1" -Force

switch ($Command) {
    "up"       { Invoke-AdpaUp }
    "down"     { Invoke-AdpaDown }
    "rebuild"  { Invoke-AdpaRebuild }
    "health"   { Invoke-AdpaHealth }
    "validate" {
        # Delegate to the RPAS validation pipeline
        & "$PSScriptRoot\..\validate-rpas.ps1" @args
    }
    "help" {
        Write-Host ""
        Write-Host "ADPA CLI - RPAS-CM Command Suite" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  Usage: .\scripts\adpa\adpa.ps1 [command]" -ForegroundColor White
        Write-Host ""
        Write-Host "  Commands:" -ForegroundColor Yellow
        Write-Host "    up        Start Aspire AppHost (kill orphans, build, launch)"
        Write-Host "    down      Stop all ADPA services"
        Write-Host "    rebuild   Full clean, build, run cycle"
        Write-Host "    health    Preflight checks (env vars, orphan processes)"
        Write-Host "    validate  Run RPAS validation pipeline (G1-G4)"
        Write-Host "    help      Show this help message"
        Write-Host ""
    }
}