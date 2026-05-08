param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$Token = ""
)

$ErrorActionPreference = "Stop"

function Require-Token {
  if ([string]::IsNullOrWhiteSpace($Token)) {
    throw "Token is required. Usage: .\scripts\test-portfolio-manually.ps1 -Token <JWT>"
  }
}

Require-Token

$headers = @{
  "Authorization" = "Bearer $Token"
  "Content-Type"  = "application/json"
}

Write-Host "=== Portfolio Prioritization Manual Check (SC-82) ==="
Write-Host ""

Write-Host "1) GET /api/portfolio/criteria"
$criteria = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/portfolio/criteria" -Headers $headers
$criteria | Select-Object -First 10 | Format-Table id,name,weight,min_score,max_score
Write-Host ""

Write-Host "2) GET /api/portfolio/rankings"
$rankings = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/portfolio/rankings?limit=50&offset=0" -Headers $headers
$rankings.rankings | Select-Object -First 10 | ForEach-Object {
  [pscustomobject]@{
    rank  = $_.rank
    name  = $_.project_name
    score = $_.total_score
  }
} | Format-Table -AutoSize

Write-Host ""
Write-Host "Expected ordering (given current DB ranking view = SUM(score * weight)):"
Write-Host "  1) Project Beta"
Write-Host "  2) Project Alpha"
Write-Host "  3) Project Gamma"
Write-Host "  4) Project Delta"
Write-Host ""
Write-Host "Done."

