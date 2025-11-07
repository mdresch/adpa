# ADPA Issue Automation - Quick Setup Script (PowerShell)

Write-Host "🤖 ADPA Issue Automation - Setup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Run this from scripts/issue-automation/ directory" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  cd scripts/issue-automation"
    Write-Host "  .\setup.ps1"
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Check for briefing documents
Write-Host "🔍 Scanning for briefing documents..." -ForegroundColor Yellow
Set-Location ..\..
$briefingFiles = Get-ChildItem -Recurse -Include "BRIEFING*.md","AGENT*BRIEFING*.md" -Exclude "node_modules" | Where-Object { $_.FullName -notlike "*node_modules*" }
$briefingCount = $briefingFiles.Count

Write-Host "📄 Found $briefingCount briefing document(s)" -ForegroundColor Cyan
Write-Host ""

# Validate all briefings
if ($briefingCount -gt 0) {
    Write-Host "📋 Validating briefing documents..." -ForegroundColor Yellow
    Set-Location scripts/issue-automation
    npm run validate:all
    
    Write-Host ""
    Write-Host "👀 Preview issues that would be created:" -ForegroundColor Yellow
    npm run preview:all
}

Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Create a new briefing:" -ForegroundColor White
Write-Host "   cd scripts/issue-automation && npm run create" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Validate your briefing:" -ForegroundColor White
Write-Host "   npm run validate ../../YOUR_BRIEFING.md" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Preview the issue:" -ForegroundColor White
Write-Host "   npm run preview ../../YOUR_BRIEFING.md" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Push to GitHub:" -ForegroundColor White
Write-Host "   git add YOUR_BRIEFING.md && git push" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Watch the magic happen in GitHub Actions!" -ForegroundColor Yellow
Write-Host ""
Write-Host "📖 Full guide: ../../AUTOMATION_GUIDE.md" -ForegroundColor Cyan
Write-Host ""

