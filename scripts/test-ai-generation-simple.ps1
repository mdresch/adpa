#!/usr/bin/env pwsh
# Simple AI Generation Test - Mimics Frontend Flow

$ErrorActionPreference = "Stop"

Write-Host "🧪 Testing AI Document Generation" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000"
$testEmail = "test@adpa.com"
$testPassword = "Test123!@#"

# Login
Write-Host "1️⃣  Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
Write-Host "   ✅ Logged in" -ForegroundColor Green

# Get providers
Write-Host "`n2️⃣  Getting AI providers..." -ForegroundColor Yellow
$providersResponse = Invoke-RestMethod -Uri "$baseUrl/api/ai/providers" -Method GET -Headers $headers
$providers = $providersResponse.providers | Where-Object { $_.is_active }
Write-Host "   ✅ Found $($providers.Count) active providers" -ForegroundColor Green

# Test each provider
Write-Host "`n3️⃣  Testing AI generation..." -ForegroundColor Yellow
$testPrompt = "Write a short executive summary about digital transformation. Include 2-3 key benefits. Use professional tone. Approximately 150 words."

$results = @()

foreach ($provider in $providers | Select-Object -First 3) {
    Write-Host "`n   🤖 $($provider.name)..." -NoNewline
    
    try {
        $genBody = @{
            prompt = $testPrompt
            provider = $provider.name
            model = $provider.models[0]
            temperature = 0.7
            max_tokens = 500
        } | ConvertTo-Json
        
        $startTime = Get-Date
        $genResponse = Invoke-RestMethod -Uri "$baseUrl/api/ai/generate" -Method POST -Headers $headers -Body $genBody -TimeoutSec 60
        $duration = ((Get-Date) - $startTime).TotalSeconds
        
        Write-Host " ✅ Success!" -ForegroundColor Green
        Write-Host "      Duration: $([Math]::Round($duration, 2))s" -ForegroundColor Gray
        Write-Host "      Words: $($genResponse.result.content_length)" -ForegroundColor Gray
        
        $results += @{
            Provider = $provider.name
            Success = $true
            Duration = $duration
        }
    } catch {
        Write-Host " ❌ Failed" -ForegroundColor Red
        Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Red
        
        $results += @{
            Provider = $provider.name
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# Summary
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Cyan
$successful = ($results | Where-Object { $_.Success }).Count
$total = $results.Count

if ($successful -eq $total) {
    Write-Host "🎉 All $total providers tested successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  $successful/$total providers passed" -ForegroundColor Yellow
}
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

