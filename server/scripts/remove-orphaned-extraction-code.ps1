# PowerShell script to remove orphaned extraction code from queueService.ts
# This removes:
# 1. Duplicate helper functions (lines 1119-1574)
# 2. Orphaned code block (lines 1582-1874)

$filePath = "src/services/queueService.ts"
$content = Get-Content $filePath -Raw
$lines = $content -split "`r?`n"

# Keep lines 0-1112 (up to child processors)
# Then keep lines 1875 onwards (after orphaned code)
$newLines = $lines[0..1112] + $lines[1875..($lines.Length-1)]

# Join and write back
$newContent = $newLines -join "`r`n"
Set-Content $filePath -Value $newContent -NoNewline

Write-Host "Removed orphaned extraction code (lines 1119-1874)"
Write-Host "Kept child processors and remaining code"

