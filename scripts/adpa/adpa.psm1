# =============================================================
# ADPA PowerShell Module — RPAS-CM Operational Command Suite
# Commands:
#   adpa up
#   adpa down
#   adpa rebuild
#   adpa health
# =============================================================

function Invoke-AdpaKillAppHost {
    Write-Host "Killing orphaned ADPA processes..." -ForegroundColor Yellow

    $targetNames = @("Adpa.AppHost", "Adpa.Orchestrator", "Adpa.Web", "dcp", "dcpctrl")
    $totalKilled = 0

    foreach ($name in $targetNames) {
        $procs = Get-Process -Name $name -ErrorAction SilentlyContinue
        if ($procs) {
            $count = $procs.Count
            $procs | Stop-Process -Force -ErrorAction SilentlyContinue
            Write-Host "  Terminated $count x $name" -ForegroundColor Green
            $totalKilled += $count
        }
    }

    # Also kill anything holding our ports (5002 = Orchestrator, 5173 = Web)
    foreach ($port in @(5002, 5173)) {
        $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conn) {
            $conn | ForEach-Object {
                Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-Host "  Freed port $port (PID $($_.OwningProcess))" -ForegroundColor Green
                $totalKilled++
            }
        }
    }

    if ($totalKilled -eq 0) {
        Write-Host "  No orphaned processes detected." -ForegroundColor DarkGray
    }
}

function Invoke-AdpaClean {
    Write-Host "Cleaning bin and obj directories..." -ForegroundColor Yellow

    $paths = @(
        "orchestrator/Adpa.AppHost",
        "orchestrator/Adpa.Orchestrator",
        "orchestrator/Adpa.Web"
    )

    foreach ($p in $paths) {
        if (Test-Path ($p + "/bin")) {
            Remove-Item ($p + "/bin") -Recurse -Force -ErrorAction SilentlyContinue
        }
        if (Test-Path ($p + "/obj")) {
            Remove-Item ($p + "/obj") -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    Write-Host "Build directories cleaned." -ForegroundColor Green
}

function Invoke-AdpaBuild {
    Write-Host "Building ADPA AppHost..." -ForegroundColor Yellow

    dotnet build orchestrator/Adpa.AppHost/Adpa.AppHost.csproj /nologo
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed. Aborting." -ForegroundColor Red
        exit 1
    }

    Write-Host "Build succeeded." -ForegroundColor Green
}

function Invoke-AdpaUp {
    Write-Host "=== ADPA UP (RPAS-CM Startup Ritual) ===" -ForegroundColor Cyan

    Invoke-AdpaKillAppHost
    Invoke-AdpaBuild

    Write-Host "Launching Aspire AppHost..." -ForegroundColor Yellow
    aspire run orchestrator/Adpa.AppHost/Adpa.AppHost.csproj --launch-profile http
}

function Invoke-AdpaDown {
    Write-Host "=== ADPA DOWN (RPAS-CM Shutdown Ritual) ===" -ForegroundColor Cyan

    Invoke-AdpaKillAppHost

    $child = Get-Process node, python, uvicorn -ErrorAction SilentlyContinue
    if ($child) {
        $child | Stop-Process -Force
        Write-Host "Terminated Node.js/Python child processes." -ForegroundColor Green
    }

    Write-Host "ADPA services unloaded." -ForegroundColor Green
}

function Invoke-AdpaRebuild {
    Write-Host "=== ADPA REBUILD (Full Clean -> Build -> Run) ===" -ForegroundColor Cyan

    Invoke-AdpaDown
    Invoke-AdpaClean
    Invoke-AdpaBuild
    Invoke-AdpaUp
}

function Invoke-AdpaHealth {
    Write-Host "=== ADPA HEALTH CHECK (RPAS Gate 1-2 Preflight) ===" -ForegroundColor Cyan

    # Check env var
    if (-not $env:AI_PROVIDER) {
        Write-Host "Missing AI_PROVIDER environment variable." -ForegroundColor Red
    }
    else {
        Write-Host ("AI_PROVIDER = " + $env:AI_PROVIDER) -ForegroundColor Green
    }

    # Check orphaned processes
    $procs = Get-Process Adpa.AppHost -ErrorAction SilentlyContinue
    if ($procs) {
        Write-Host ("Orphaned Adpa.AppHost running: " + ($procs.Id -join ", ")) -ForegroundColor Red
    }
    else {
        Write-Host "No orphaned Adpa.AppHost processes." -ForegroundColor Green
    }

    Write-Host "Health check complete." -ForegroundColor Cyan
}

Export-ModuleMember -Function Invoke-AdpaUp, Invoke-AdpaDown, Invoke-AdpaRebuild, Invoke-AdpaHealth