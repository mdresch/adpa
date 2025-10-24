# Remove All Duplicate Content From Files
# Fixes files where content is repeated 2x, 3x, or 4x

Write-Host "🔍 Scanning for duplicate content..." -ForegroundColor Cyan

$filesToCheck = @(
    "docs/11-user-guides/UPLOAD_CHANGE_REQUESTS_GUIDE.md",
    "docs/07-architecture/CRITICAL_NON_COMPLIANCE_ADPA_BUDGET.md",
    "docs/06-features/CR-2026-001_PHASE1_IMPLEMENTATION_COMPLETE.md",
    "docs/roadmap/change-requests/CR-2026-001_Baseline_Drift_Detection.md",
    "scripts/setup-supabase-env.ps1",
    "scripts/check-baseline-tables.js",
    "server/migrations/058_create_feedback_system.sql"
)

$fixed = 0
$errors = 0

foreach ($file in $filesToCheck) {
    if (Test-Path $file) {
        Write-Host "`n📄 Checking: $file" -ForegroundColor Yellow
        
        $content = Get-Content $file -Raw
        $lines = Get-Content $file
        $totalLines = $lines.Count
        
        # Check if content is duplicated (4x, 3x, or 2x)
        $quarter = [math]::Floor($totalLines / 4)
        $third = [math]::Floor($totalLines / 3)
        $half = [math]::Floor($totalLines / 2)
        
        $isDuplicate = $false
        $keepLines = $totalLines
        
        # Check for 4x duplication
        if ($quarter -gt 10) {
            $firstQuarter = $lines[0..($quarter-1)] -join "`n"
            $secondQuarter = $lines[$quarter..(2*$quarter-1)] -join "`n"
            
            if ($firstQuarter -eq $secondQuarter) {
                Write-Host "  ⚠️  Found 4x duplication! Original: $quarter lines, Total: $totalLines lines" -ForegroundColor Red
                $keepLines = $quarter
                $isDuplicate = $true
            }
        }
        
        # Check for 3x duplication
        if (-not $isDuplicate -and $third -gt 10) {
            $firstThird = $lines[0..($third-1)] -join "`n"
            $secondThird = $lines[$third..(2*$third-1)] -join "`n"
            
            if ($firstThird -eq $secondThird) {
                Write-Host "  ⚠️  Found 3x duplication! Original: $third lines, Total: $totalLines lines" -ForegroundColor Red
                $keepLines = $third
                $isDuplicate = $true
            }
        }
        
        # Check for 2x duplication
        if (-not $isDuplicate -and $half -gt 10) {
            $firstHalf = $lines[0..($half-1)] -join "`n"
            $secondHalf = $lines[$half..($totalLines-1)] -join "`n"
            
            if ($firstHalf -eq $secondHalf) {
                Write-Host "  ⚠️  Found 2x duplication! Original: $half lines, Total: $totalLines lines" -ForegroundColor Red
                $keepLines = $half
                $isDuplicate = $true
            }
        }
        
        if ($isDuplicate) {
            # Keep only the first occurrence
            $fixedContent = $lines[0..($keepLines-1)] -join "`n"
            
            # Backup original
            $backupFile = "$file.backup"
            Copy-Item $file $backupFile -Force
            
            # Write fixed content
            Set-Content -Path $file -Value $fixedContent -NoNewline
            
            Write-Host "  ✅ Fixed! Kept first $keepLines lines, removed duplicates" -ForegroundColor Green
            Write-Host "  💾 Backup saved: $backupFile" -ForegroundColor Gray
            $fixed++
        } else {
            Write-Host "  ✓ No duplicates found" -ForegroundColor Green
        }
    } else {
        Write-Host "`n⚠️  File not found: $file" -ForegroundColor Yellow
        $errors++
    }
}

Write-Host "`n=================================" -ForegroundColor Cyan
Write-Host "✅ Fixed $fixed files" -ForegroundColor Green
if ($errors -gt 0) {
    Write-Host "⚠️  $errors files not found" -ForegroundColor Yellow
}
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔍 Next steps:" -ForegroundColor Cyan
Write-Host "1. Review the fixed files" -ForegroundColor White
Write-Host "2. Delete .backup files if satisfied" -ForegroundColor White
Write-Host "3. Commit the changes: git add . && git commit -m 'fix: Remove duplicate content'" -ForegroundColor White

