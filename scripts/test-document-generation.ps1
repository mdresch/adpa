#!/usr/bin/env pwsh
# Quick Document Generation Test for v2.0.0
# Tests AI providers with actual document generation

$ErrorActionPreference = "Stop"

Write-Host "🧪 ADPA v2.0.0 Document Generation Test" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:5000"
$testEmail = "test@adpa.com"
$testPassword = "Test123!@#"

# Step 1: Login
Write-Host "1️⃣  Authenticating..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    
    if ($token) {
        Write-Host "   ✅ Authenticated successfully" -ForegroundColor Green
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
    }
} catch {
    Write-Host "   ❌ Authentication failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Get projects
Write-Host "`n2️⃣  Getting projects..." -ForegroundColor Yellow
try {
    $projects = Invoke-RestMethod -Uri "$baseUrl/api/projects" -Method GET -Headers $headers
    
    if ($projects.Count -eq 0) {
        Write-Host "   ⚠️  No projects found. Creating test project..." -ForegroundColor Yellow
        $projectBody = @{
            name = "v2.0.0 Release Test Project"
            description = "Testing document generation for v2.0.0 release"
            framework = "TOGAF"
            start_date = (Get-Date -Format "yyyy-MM-dd")
            status = "active"
        } | ConvertTo-Json
        
        $project = Invoke-RestMethod -Uri "$baseUrl/api/projects" -Method POST -Headers $headers -Body $projectBody
        $projectId = $project.id
        Write-Host "   ✅ Created test project: $projectId" -ForegroundColor Green
    } else {
        $projectId = $projects[0].id
        Write-Host "   ✅ Using project: $($projects[0].name)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Failed to get projects: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Get templates
Write-Host "`n3️⃣  Getting templates..." -ForegroundColor Yellow
try {
    $templates = Invoke-RestMethod -Uri "$baseUrl/api/templates" -Method GET -Headers $headers
    Write-Host "   ✅ Found $($templates.Count) templates" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed to get templates: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Get AI providers
Write-Host "`n4️⃣  Getting AI providers..." -ForegroundColor Yellow
try {
    $providersResponse = Invoke-RestMethod -Uri "$baseUrl/api/ai/providers" -Method GET -Headers $headers
    $providers = $providersResponse.providers
    $activeProviders = $providers | Where-Object { $_.is_active -eq $true }
    
    Write-Host "   ✅ Found $($activeProviders.Count) active providers:" -ForegroundColor Green
    foreach ($p in $activeProviders) {
        Write-Host "      - $($p.name) ($($p.type))" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Failed to get AI providers: $_" -ForegroundColor Red
    exit 1
}

# Step 5: Generate test documents
Write-Host "`n5️⃣  Generating test documents..." -ForegroundColor Yellow
Write-Host "   This will test each AI provider with document generation" -ForegroundColor Cyan
Write-Host ""

$results = @()

# Test with first available template
$testTemplate = $templates | Select-Object -First 1

foreach ($provider in $activeProviders | Select-Object -First 3) {
    Write-Host "   🤖 Testing: $($provider.name)" -ForegroundColor Cyan
    
    try {
        $generateBody = @{
            project_id = $projectId
            template_id = $testTemplate.id
            ai_provider_id = $provider.id
            model_name = $provider.models[0]
            temperature = 0.7
            max_tokens = 2000
        } | ConvertTo-Json
        
        Write-Host "      Generating..." -NoNewline
        $startTime = Get-Date
        
        $document = Invoke-RestMethod -Uri "$baseUrl/api/documents/generate" -Method POST -Headers $headers -Body $generateBody -TimeoutSec 120
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        Write-Host " Done!" -ForegroundColor Green
        Write-Host "      ✅ Document ID: $($document.id)" -ForegroundColor Green
        Write-Host "      ⏱️  Duration: $([Math]::Round($duration, 2))s" -ForegroundColor Gray
        
        # Get document details
        if ($document.id) {
            $docDetails = Invoke-RestMethod -Uri "$baseUrl/api/documents/$($document.id)" -Method GET -Headers $headers
            
            if ($docDetails.generation_metadata) {
                $meta = $docDetails.generation_metadata
                Write-Host "      📊 Quality: $($meta.quality_metrics.overall_score)% ($($meta.quality_metrics.grade))" -ForegroundColor Gray
                Write-Host "      💰 Cost: `$$($meta.cost_usd)" -ForegroundColor Gray
                Write-Host "      📝 Words: $($meta.content_metrics.word_count)" -ForegroundColor Gray
            }
        }
        
        $results += @{
            Provider = $provider.name
            Success = $true
            Duration = $duration
            DocumentId = $document.id
        }
        
    } catch {
        Write-Host " Failed!" -ForegroundColor Red
        Write-Host "      ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        
        $results += @{
            Provider = $provider.name
            Success = $false
            Error = $_.Exception.Message
        }
    }
    
    Write-Host ""
    Start-Sleep -Seconds 2
}

# Summary
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "📊 TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

$successful = ($results | Where-Object { $_.Success }).Count
$total = $results.Count

Write-Host "`nResults: $successful/$total providers tested successfully" -ForegroundColor $(if ($successful -eq $total) { 'Green' } else { 'Yellow' })

foreach ($result in $results) {
    if ($result.Success) {
        Write-Host "  ✅ $($result.Provider) - $([Math]::Round($result.Duration, 1))s" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($result.Provider) - $($result.Error)" -ForegroundColor Red
    }
}

Write-Host ""
if ($successful -eq $total) {
    Write-Host "🎉 All tests passed! System ready for v2.0.0 release!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some tests failed. Review errors above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review generated documents in the UI" -ForegroundColor White
Write-Host "  2. Verify metadata tracking" -ForegroundColor White
Write-Host "  3. Check template statistics" -ForegroundColor White
Write-Host "  4. Push release tag: git push origin v2.0.0" -ForegroundColor White
Write-Host ""

