# Seed Skills and Competencies Script
# 
# Populates the database with comprehensive skills and competencies
# covering technical skills, PMBOK competencies, BABOK competencies,
# and common project management capabilities.
#
# Usage: .\server\scripts\seed-skills-competencies.ps1

Write-Host "🛠️  Seeding Skills and Competencies..." -ForegroundColor Cyan
Write-Host ""

# Change to server directory
Push-Location $PSScriptRoot\..

try {
    # Check if Node.js is available
    $nodeVersion = node --version 2>$null
    if (-not $nodeVersion) {
        Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
        exit 1
    }

    # Check if ts-node is available
    $tsNodeCheck = npx ts-node --version 2>$null
    if (-not $tsNodeCheck) {
        Write-Host "⚠️  ts-node not found, installing..." -ForegroundColor Yellow
        npm install -g ts-node typescript
    }

    # Run the seed script
    Write-Host "📦 Running skills and competencies seed script..." -ForegroundColor Yellow
    npx ts-node server/src/database/seed-skills-competencies.ts

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Skills and competencies seeding completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Summary:" -ForegroundColor Cyan
        Write-Host "   - Technical Skills (Programming, Tools, Frameworks)" -ForegroundColor White
        Write-Host "   - Project Management Skills" -ForegroundColor White
        Write-Host "   - Business Analysis Skills" -ForegroundColor White
        Write-Host "   - Data Management Skills" -ForegroundColor White
        Write-Host "   - PMBOK 8 Performance Domains (Competencies)" -ForegroundColor White
        Write-Host "   - BABOK Underlying Competencies" -ForegroundColor White
        Write-Host "   - BABOK Knowledge Areas" -ForegroundColor White
        Write-Host "   - DMBOK Competencies" -ForegroundColor White
        Write-Host "   - General Professional Competencies" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "❌ Seeding failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error running seed script: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

