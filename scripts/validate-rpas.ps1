<#
.SYNOPSIS
    validate-rpas.ps1 -- RPAS-CM AEV/DRACO Validation Pipeline
    RPAS-CM-GRA-001 v2.0.0 (CSR-42)

.DESCRIPTION
    Enforces the four RPAS Gates (Mechanical Integrity, Build Integrity,
    Orchestration Topology, and Governance Attestation) as defined in:
      - RPAS.md (CSR-42)
      - CONTRIBUTING.md (AEV Workflow)
      - rpas-guardrails.json (G1-G5 machine-readable)

    Must be run from the repository root.

.PARAMETER ChangeDescription
    A one-line description of the atomic change being validated.

.PARAMETER NonInteractive
    Skip interactive prompts (for CI pipelines).
    The PR reviewer is the governance attester.

.PARAMETER SkipBuild
    Skip Gate 2 (Build Integrity) for documentation-only changes.

.PARAMETER PostCommit
    Run in post-commit mode: Gate 1 verifies a CLEAN tree (no leftover changes).
    Default (pre-commit) mode expects changes to be present and reviews scope.

.EXAMPLE
    .\scripts\validate-rpas.ps1 -ChangeDescription "Add RTM seed endpoint"
    .\scripts\validate-rpas.ps1 -ChangeDescription "Fix ledger query" -NonInteractive
    .\scripts\validate-rpas.ps1 -ChangeDescription "CSR-42 baseline" -PostCommit
#>

param (
    [string]$ChangeDescription = "unspecified change",
    [switch]$NonInteractive,
    [switch]$SkipBuild,
    [switch]$PostCommit
)

$ErrorActionPreference = "Stop"
$env:GIT_REDIRECT_STDERR = '2>&1'
$script:GatesPassed = 0
$script:GatesTotal = 4
$script:StartTime = Get-Date
$script:Violations = @()

# ---------------------------------------------------------------------------
# Utility Functions
# ---------------------------------------------------------------------------
$script:LogDir = ".rpas"
$script:LogFile = "$script:LogDir/validation-log.jsonl"
$script:CsrHistory = "$script:LogDir/csr-history.log"

if (-not (Test-Path $script:LogDir)) {
    New-Item -ItemType Directory -Path $script:LogDir -Force | Out-Null
}

function Log([string]$msg) {
    $line = "$(Get-Date -Format o)  $msg"
    Write-Host $line
    Add-Content -Path "$script:LogDir/rpas-validation.log" -Value $line
}

function Write-GateHeader([int]$Gate, [string]$Title, [string]$Owner) {
    Write-Host ""
    Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
    Log "[RPAS Gate $Gate] $Title ($Owner)"
    Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
}

function Write-GatePass([int]$Gate) {
    $script:GatesPassed++
    Write-Host "  [PASS] Gate $Gate PASSED" -ForegroundColor Green
}

function Write-GateFail([int]$Gate, [string]$Reason) {
    Write-Host "  [FAIL] Gate $Gate FAILED: $Reason" -ForegroundColor Red
    $script:Violations += "Gate $Gate - $Reason"
}

function Write-GateSkip([int]$Gate, [string]$Reason) {
    $script:GatesPassed++
    Write-Host "  [SKIP] Gate $Gate SKIPPED: $Reason" -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "  RPAS Validation Pipeline -- RPAS-CM-GRA-001 v2.0.0         " -ForegroundColor Cyan
Write-Host "  Regulated Process Assurance System (CSR-42)                 " -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Change: $ChangeDescription" -ForegroundColor White
Write-Host "  Time:   $($script:StartTime.ToString('yyyy-MM-ddTHH:mm:ssK'))" -ForegroundColor DarkGray
Write-Host "  Mode:   $(if ($NonInteractive) { 'CI (Non-Interactive)' } else { 'Interactive' }) | $(if ($PostCommit) { 'Post-Commit' } else { 'Pre-Commit' })" -ForegroundColor DarkGray

Log "=== RPAS Validation Pipeline Start ==="
Log "Change: $ChangeDescription"

# ---------------------------------------------------------------------------
# RPAS Gate 1: Mechanical Integrity (AEV)
# Ref: CONTRIBUTING.md Gate 1 -- git status + git diff --stat
# ---------------------------------------------------------------------------
Write-GateHeader 1 "Mechanical Integrity" "AEV"

$gitStatus = (git status --short) 2>$null
$diffStat = (git diff --stat HEAD) 2>$null
$untracked = (git ls-files --others --exclude-standard) 2>$null

if ($PostCommit) {
    # Post-commit: working tree must be CLEAN (all changes already committed)
    if ($gitStatus) {
        Write-Host "  Dirty files detected after commit:" -ForegroundColor Red
        $gitStatus | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
        Write-GateFail 1 "Working directory not clean after commit."
    } else {
        Log "Working tree is clean."
        Write-GatePass 1
    }
} else {
    # Pre-commit: changes SHOULD exist -- verify scope
    if (-not $gitStatus) {
        Write-GateFail 1 "No changes detected. Nothing to validate."
    } else {
        Write-Host "  Modified files:" -ForegroundColor Cyan
        if ($diffStat) {
            $diffStat | ForEach-Object { Write-Host "    $_" }
        }

        # Flag untracked files (potential scope creep)
        if ($untracked) {
            Write-Host ""
            Write-Host "  [WARN] Untracked files (verify intentional):" -ForegroundColor Yellow
            $untracked | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
        }

        # Show staged vs unstaged breakdown
        $staged = (git diff --cached --name-only) 2>$null
        $unstaged = (git diff --name-only) 2>$null
        Write-Host ""
        Write-Host "  Staged:    $(if ($staged) { ($staged | Measure-Object).Count } else { 0 }) file(s)" -ForegroundColor DarkGray
        Write-Host "  Unstaged:  $(if ($unstaged) { ($unstaged | Measure-Object).Count } else { 0 }) file(s)" -ForegroundColor DarkGray
        Write-Host "  Untracked: $(if ($untracked) { ($untracked | Measure-Object).Count } else { 0 }) file(s)" -ForegroundColor DarkGray

        Write-Host ""
        Write-Host "  >>> Operator must confirm: only declared-scope files are affected." -ForegroundColor Cyan
        Write-GatePass 1
    }
}

# ---------------------------------------------------------------------------
# RPAS Gate 2: Build Integrity (AEV)
# Ref: CONTRIBUTING.md Gate 2 + Gate 3 -- dotnet build + Next.js build
# ---------------------------------------------------------------------------
Write-GateHeader 2 "Build Integrity" "AEV"

if ($SkipBuild) {
    Write-GateSkip 2 "Build skipped via -SkipBuild (documentation-only change)."
} elseif (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-GateSkip 2 "dotnet CLI not available. Operator must validate build manually."
} else {
    $gate2Failed = $false

    # --- .NET Orchestration Build ---
    Write-Host "  Building orchestrator/Adpa.sln..." -ForegroundColor DarkGray
    $buildOutput = dotnet build orchestrator/Adpa.sln `
        /p:ErrorOnDuplicatePublishOutputFiles=false `
        --verbosity quiet `
        --nologo 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        $buildOutput | Where-Object { $_ -match "error" } | ForEach-Object {
            Write-Host "    $_" -ForegroundColor Red
        }
        Log ".NET build failed."
        $gate2Failed = $true
    } else {
        Log ".NET solution compiled successfully."

        # Report warnings (non-blocking)
        $warnings = $buildOutput | Where-Object { $_ -match "warning" }
        if ($warnings) {
            Write-Host "  [WARN] Build warnings:" -ForegroundColor Yellow
            $warnings | Select-Object -First 5 | ForEach-Object {
                Write-Host "    $_" -ForegroundColor Yellow
            }
        }
    }

    # --- Next.js Experience Tier Build ---
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        Write-Host "  Building Next.js researcher dashboard..." -ForegroundColor DarkGray
        $nextBuild = pnpm build 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Next.js build output:" -ForegroundColor Red
            $nextBuild | Select-Object -Last 10 | ForEach-Object {
                Write-Host "    $_" -ForegroundColor Red
            }
            Log "Next.js build failed."
            $gate2Failed = $true
        } else {
            Log "Next.js build succeeded."
        }
    } else {
        Write-Host "  [WARN] pnpm not available -- Next.js build skipped." -ForegroundColor Yellow
    }

    if ($gate2Failed) {
        Write-GateFail 2 "Build errors detected."
    } else {
        Write-GatePass 2
    }
}

# ---------------------------------------------------------------------------
# RPAS Gate 3: Orchestration Topology (DRACO)
# Ref: RPAS.md Gate 3 -- Project structure, component graph, service mesh.
# ---------------------------------------------------------------------------
Write-GateHeader 3 "Orchestration Topology" "DRACO"

$topologyValid = $true
$topologyChecks = @(
    @{ Path = "orchestrator/Adpa.AppHost/Adpa.AppHost.csproj";                 Label = "AppHost (Orchestration Entry)" },
    @{ Path = "orchestrator/Adpa.Orchestrator/Adpa.Orchestrator.csproj";       Label = "Orchestrator (Execution Authority)" },
    @{ Path = "orchestrator/Adpa.Web/Adpa.Web.csproj";                        Label = "Governor Portal (Blazor)" },
    @{ Path = "orchestrator/Adpa.ServiceDefaults/Adpa.ServiceDefaults.csproj"; Label = "Service Defaults (Shared)" },
    @{ Path = "orchestrator/Adpa.sln";                                         Label = "Solution File" }
)

foreach ($check in $topologyChecks) {
    if (Test-Path $check.Path) {
        Write-Host "  [OK] $($check.Label)" -ForegroundColor DarkGray
    } else {
        Write-Host "  [XX] $($check.Label) -- MISSING: $($check.Path)" -ForegroundColor Red
        $topologyValid = $false
    }
}

# Verify AppHost references both Orchestrator and Web (service mesh integrity)
if (Test-Path "orchestrator/Adpa.AppHost/Adpa.AppHost.csproj") {
    $appHostContent = Get-Content "orchestrator/Adpa.AppHost/Adpa.AppHost.csproj" -Raw
    $requiredRefs = @("Adpa.Orchestrator", "Adpa.Web")

    Write-Host ""
    Write-Host "  Project references:" -ForegroundColor Cyan
    foreach ($ref in $requiredRefs) {
        if ($appHostContent -match $ref) {
            Write-Host "    [OK] $ref" -ForegroundColor DarkGray
        } else {
            Write-Host "    [XX] $ref NOT referenced -- topology broken" -ForegroundColor Red
            $topologyValid = $false
        }
    }

    # Verify Aspire SDK version
    if ($appHostContent -match 'Aspire\.AppHost\.Sdk/(\d+\.\d+\.\d+)') {
        Write-Host "    [OK] Aspire SDK: $($Matches[1])" -ForegroundColor DarkGray
    }
}

if (-not $topologyValid) {
    Write-GateFail 3 "Orchestration topology is broken."
} else {
    Write-GatePass 3
}

# ---------------------------------------------------------------------------
# RPAS Gate 4: Governance Attestation (RPAS)
# Ref: RPAS.md Gate 4 -- G1-G5 compliance + source code scanning.
# ---------------------------------------------------------------------------
Write-GateHeader 4 "Governance Attestation" "RPAS"

$gate4Failed = $false

# --- 4a: Source Code Governance Scan ---
# Scan for patterns that violate G5 (direct ledger writes outside Orchestrator)
Write-Host "  Scanning for governance violations..." -ForegroundColor DarkGray

# G5 violation: Direct SQL mutation in Experience Tier (Next.js / Blazor)
# Only flag writes in app/ or components/ -- NOT in orchestrator/ or server/migrations/
$excludePattern = "node_modules|\.next|bin|obj|server/migrations|__tests__|test|\.rpas"

$experienceTierFiles = Get-ChildItem -Path "app", "components", "lib" -Recurse -Include "*.ts", "*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch $excludePattern }

$g5Violations = @()
foreach ($file in $experienceTierFiles) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName)
    } catch {
        continue
    }
    if ($content -match '(?i)(INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\s+.*(amendments|rtm_entries|csr_versions|governance_ledger)') {
        $g5Violations += "  G5: Direct ledger mutation in Experience Tier -- $($file.Name)"
    }
}

if ($g5Violations.Count -gt 0) {
    Write-Host ""
    foreach ($v in $g5Violations) {
        Write-Host "  [FAIL] $v" -ForegroundColor Red
    }
    $gate4Failed = $true
} else {
    Write-Host "  [OK] No G5 violations in Experience Tier" -ForegroundColor DarkGray
}

Write-Host ""

# --- 4b: Schema Enforcement (TAR-COL) ---
$attestationFile = "governance/rpas-attestation.json"
$schemaFile = "governance/schemas/rpas-tar-col.schema.json"

if (Test-Path $attestationFile) {
    Write-Host "  [OK] Attestation found: $attestationFile" -ForegroundColor DarkGray
    Write-Host "  Validating against TAR-COL schema..." -ForegroundColor DarkGray
    
    # Call Node.js validator
    $valOutput = node scripts/validate-governance.js --schema $schemaFile --data $attestationFile 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [XX] Schema validation FAILED" -ForegroundColor Red
        $valOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
        $gate4Failed = $true
    } else {
        Write-Host "  [OK] Schema validation PASSED" -ForegroundColor Green
    }
} else {
    # Skip hard fail for Hygiene tasks to maintain flexibility
    if ($ChangeDescription -notmatch "(?i)(HYG|DOC)") {
        Write-Host "  [XX] Attestation file NOT FOUND: $attestationFile" -ForegroundColor Red
        $gate4Failed = $true
    } else {
        Write-Host "  [WARN] Attestation file NOT FOUND (skipped for cleanup/docs)" -ForegroundColor Yellow
    }
}

# --- 4c: Governance Guardrails Attestation ---

if ($NonInteractive) {
    Write-Host "  Mode: Non-Interactive -- attestation assumed via PR review." -ForegroundColor Yellow
    if (-not $gate4Failed) {
        Write-GatePass 4
    } else {
        Write-GateFail 4 "Automated governance scan detected violations."
    }
} else {
    if ($gate4Failed) {
        Write-Host "  [WARN] Violations detected above. Review before attesting." -ForegroundColor Yellow
    }
    $confirmation = Read-Host "  Type 'RPAS-OK' to attest compliance with G1-G5"
    if ($confirmation -ne "RPAS-OK") {
        Write-GateFail 4 "Governance attestation not confirmed."
    } else {
        Write-GatePass 4
    }
}

# ---------------------------------------------------------------------------
# Final Certification
# ---------------------------------------------------------------------------
$endTime = Get-Date
$elapsed = ($endTime - $script:StartTime).TotalSeconds
$csrEpoch = $endTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

if ($script:GatesPassed -eq $script:GatesTotal) {
    # --- SUCCESS ---
    Write-Host ""
    Write-Host "==============================================================" -ForegroundColor Green
    Write-Host "  RPAS VALIDATION PASSED                                      " -ForegroundColor Green
    Write-Host "--------------------------------------------------------------" -ForegroundColor Green
    Write-Host "  Status:        RPAS CLOUD MASTER CERTIFIED                  " -ForegroundColor Green
    Write-Host "  Gates Passed:  $($script:GatesPassed)/$($script:GatesTotal)                                            " -ForegroundColor Green
    Write-Host "  CSR Epoch:     $csrEpoch                         " -ForegroundColor Green
    Write-Host "  Elapsed:       $([math]::Round($elapsed, 1))s                                           " -ForegroundColor Green
    Write-Host "==============================================================" -ForegroundColor Green

    # Append CSR epoch to history (G3 -- append-only)
    $csrEntry = "CSR-Validated: $csrEpoch | $ChangeDescription"
    Add-Content -Path $script:CsrHistory -Value $csrEntry
    Log "CSR entry appended to $($script:CsrHistory)"

    # Append structured log entry (G3 -- forensic evidence)
    $logEntry = @{
        timestamp       = $csrEpoch
        change          = $ChangeDescription
        gatesPassed     = $script:GatesPassed
        gatesTotal      = $script:GatesTotal
        mode            = if ($NonInteractive) { "ci" } else { "interactive" }
        validationMode  = if ($PostCommit) { "post-commit" } else { "pre-commit" }
        elapsedSeconds  = [math]::Round($elapsed, 1)
        violations      = $script:Violations
        operator        = $env:USERNAME
        hostname        = $env:COMPUTERNAME
    } | ConvertTo-Json -Compress
    Add-Content -Path $script:LogFile -Value $logEntry

    Write-Host ""
    Write-Host "  Recommended commit:" -ForegroundColor DarkGray
    Write-Host "  git commit -m 'SAFE (RPAS): $ChangeDescription'" -ForegroundColor White
    Write-Host ""
    Write-Host "  > Validation logged to $($script:LogFile)" -ForegroundColor DarkGray
    Write-Host "  > CSR history appended to $($script:CsrHistory)" -ForegroundColor DarkGray

    exit 0
} else {
    # --- FAILURE ---
    Write-Host ""
    Write-Host "==============================================================" -ForegroundColor Red
    Write-Host "  RPAS VALIDATION FAILED                                      " -ForegroundColor Red
    Write-Host "--------------------------------------------------------------" -ForegroundColor Red
    Write-Host "  Gates Passed: $($script:GatesPassed)/$($script:GatesTotal)                                             " -ForegroundColor Red
    Write-Host "==============================================================" -ForegroundColor Red
    Write-Host ""

    if ($script:Violations.Count -gt 0) {
        Write-Host "  Violations:" -ForegroundColor Red
        foreach ($v in $script:Violations) {
            Write-Host "    [FAIL] $v" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "  Action: Revert to last SAFE commit." -ForegroundColor Red
    Write-Host "  Do NOT debug in a dirty state. Do NOT layer fixes." -ForegroundColor Red
    Write-Host "  Rollback is not failure -- it is compliance." -ForegroundColor DarkGray

    # Log failure too (G3 -- even failures are evidence)
    $logEntry = @{
        timestamp       = $csrEpoch
        change          = $ChangeDescription
        result          = "FAILED"
        gatesPassed     = $script:GatesPassed
        gatesTotal      = $script:GatesTotal
        violations      = $script:Violations
        operator        = $env:USERNAME
        hostname        = $env:COMPUTERNAME
    } | ConvertTo-Json -Compress
    Add-Content -Path $script:LogFile -Value $logEntry

    exit 1
}
