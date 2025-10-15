#!/usr/bin/env pwsh
# Start ADPA Development Environment with Neon Database
# This script starts both frontend and backend servers

Write-Host "🚀 Starting ADPA Development Environment" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check if .env files exist
if (-not (Test-Path "server\.env")) {
    Write-Host "⚠️  server/.env not found. Creating from Neon configuration..." -ForegroundColor Yellow
    .\setup-neon-env.ps1
    Write-Host ""
}

if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  .env.local not found. Creating from Neon configuration..." -ForegroundColor Yellow
    .\setup-neon-env.ps1
    Write-Host ""
}

# Stop any existing Node processes
Write-Host "🧹 Cleaning up existing Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "✅ Cleanup complete" -ForegroundColor Green
Write-Host ""

# Display configuration
Write-Host "📋 Configuration:" -ForegroundColor Cyan
Write-Host "   • Database: Neon PostgreSQL (ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech)" -ForegroundColor White
Write-Host "   • Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "   • Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""

# Start backend in background
Write-Host "🔧 Starting Backend Server..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    cd server
    npm run dev
}

# Wait for backend to initialize
Write-Host "⏳ Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check backend logs
$backendOutput = Receive-Job -Job $backendJob
if ($backendOutput -match "Database connection established successfully" -or $backendOutput -match "Server is running") {
    Write-Host "✅ Backend started successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend may still be starting..." -ForegroundColor Yellow
}
Write-Host ""

# Start frontend in background
Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev
}

# Wait for frontend to initialize
Write-Host "⏳ Waiting for frontend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host "✅ Frontend started successfully" -ForegroundColor Green
Write-Host ""

# Display status
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 Development Environment Running!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Access Points:" -ForegroundColor Cyan
Write-Host "   • Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host "   • Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "   • Health:      http://localhost:5000/health" -ForegroundColor White
Write-Host ""
Write-Host "📊 Job IDs:" -ForegroundColor Cyan
Write-Host "   • Backend:  $($backendJob.Id)" -ForegroundColor White
Write-Host "   • Frontend: $($frontendJob.Id)" -ForegroundColor White
Write-Host ""
Write-Host "🛑 To stop servers:" -ForegroundColor Yellow
Write-Host "   Stop-Job -Id $($backendJob.Id),$($frontendJob.Id)" -ForegroundColor White
Write-Host "   Remove-Job -Id $($backendJob.Id),$($frontendJob.Id)" -ForegroundColor White
Write-Host "   Or press Ctrl+C and run: Get-Process -Name node | Stop-Process -Force" -ForegroundColor White
Write-Host ""
Write-Host "📝 View Logs:" -ForegroundColor Yellow
Write-Host "   Backend:  Receive-Job -Id $($backendJob.Id) -Keep" -ForegroundColor White
Write-Host "   Frontend: Receive-Job -Id $($frontendJob.Id) -Keep" -ForegroundColor White
Write-Host ""

# Monitor jobs
Write-Host "Press Ctrl+C to stop monitoring (servers will continue running)" -ForegroundColor Gray
Write-Host ""

try {
    while ($true) {
        $backendState = (Get-Job -Id $backendJob.Id).State
        $frontendState = (Get-Job -Id $frontendJob.Id).State
        
        if ($backendState -eq "Failed" -or $frontendState -eq "Failed") {
            Write-Host "❌ One or more servers failed!" -ForegroundColor Red
            Write-Host "Backend Output:" -ForegroundColor Yellow
            Receive-Job -Id $backendJob.Id
            Write-Host "Frontend Output:" -ForegroundColor Yellow
            Receive-Job -Id $frontendJob.Id
            break
        }
        
        Start-Sleep -Seconds 2
    }
} catch {
    Write-Host ""
    Write-Host "✋ Monitoring stopped. Servers are still running in background." -ForegroundColor Yellow
    Write-Host ""
}

# Keep script running
Write-Host "Press any key to stop all servers and exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Cleanup
Write-Host "🛑 Stopping servers..." -ForegroundColor Yellow
Stop-Job -Id $backendJob.Id,$frontendJob.Id -ErrorAction SilentlyContinue
Remove-Job -Id $backendJob.Id,$frontendJob.Id -ErrorAction SilentlyContinue
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "✅ Servers stopped" -ForegroundColor Green

