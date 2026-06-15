# scripts/build-agent-sandbox.ps1
$ErrorActionPreference = "Stop"

Write-Host "Building Agent Sandbox Docker Image..."

docker build -t adpa-agent-sandbox -f docker/agent-sandbox/Dockerfile .

if ($LASTEXITCODE -eq 0) {
    Write-Host "Sandbox successfully built. Agents can now run isolated validations." -ForegroundColor Green
} else {
    Write-Warning "Docker build failed."
}
