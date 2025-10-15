#!/usr/bin/env pwsh
# ADPA v2.0.0 Release Testing Script
# Tests all major features before release

$ErrorActionPreference = "Stop"

Write-Host "🚀 ADPA v2.0.0 Release Testing Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:5000"
$frontendUrl = "http://localhost:3000"

# Test credentials (update with actual test user)
$testEmail = "test@adpa.com"
$testPassword = "Test123!@#"

# Initialize results
$results = @{
    Health = $false
    Auth = $false
    Templates = $false
    AIProviders = $false
    Projects = $false
    DocumentGeneration = @()
    MetadataTracking = $false
    TemplateStats = $false
}

# 1. Health Check
Write-Host "1️⃣  Testing Backend Health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    if ($health.status -eq "OK") {
        Write-Host "   ✅ Backend is healthy" -ForegroundColor Green
        $results.Health = $true
    }
} catch {
    Write-Host "   ❌ Backend health check failed: $_" -ForegroundColor Red
    exit 1
}

# 2. Authentication
Write-Host "`n2️⃣  Testing Authentication..." -ForegroundColor Yellow
try {
    # Try to login
    $loginBody = @{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    
    if ($token) {
        Write-Host "   ✅ Authentication successful" -ForegroundColor Green
        $results.Auth = $true
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
    }
} catch {
    Write-Host "   ⚠️  Login failed (may need to create test user): $_" -ForegroundColor Yellow
    Write-Host "   Creating test user..." -ForegroundColor Yellow
    
    try {
        $registerBody = @{
            name = "Test User"
            email = $testEmail
            password = $testPassword
            role = "admin"
        } | ConvertTo-Json

        $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
        $token = $registerResponse.token
        
        if ($token) {
            Write-Host "   ✅ User created and authenticated" -ForegroundColor Green
            $results.Auth = $true
            $headers = @{
                "Authorization" = "Bearer $token"
                "Content-Type" = "application/json"
            }
        }
    } catch {
        Write-Host "   ❌ Registration failed: $_" -ForegroundColor Red
        exit 1
    }
}

# 3. Test Templates
Write-Host "`n3️⃣  Testing Templates..." -ForegroundColor Yellow
try {
    $templates = Invoke-RestMethod -Uri "$baseUrl/api/templates" -Method GET -Headers $headers
    $templateCount = ($templates | Measure-Object).Count
    Write-Host "   ✅ Found $templateCount templates" -ForegroundColor Green
    $results.Templates = $true
    
    # Show first 5 templates
    Write-Host "   📋 Sample templates:" -ForegroundColor Cyan
    $templates | Select-Object -First 5 | ForEach-Object {
        Write-Host "      - $($_.name) ($($_.framework))" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Failed to fetch templates: $_" -ForegroundColor Red
}

# 4. Test AI Providers
Write-Host "`n4️⃣  Testing AI Providers..." -ForegroundColor Yellow
try {
    $providersResponse = Invoke-RestMethod -Uri "$baseUrl/api/ai/providers" -Method GET -Headers $headers
    $providers = $providersResponse.providers
    $providerCount = ($providers | Measure-Object).Count
    Write-Host "   ✅ Found $providerCount AI providers" -ForegroundColor Green
    $results.AIProviders = $true
    
    # Show configured providers
    Write-Host "   🤖 Available AI providers:" -ForegroundColor Cyan
    $providers | ForEach-Object {
        $status = if ($_.enabled) { "✅" } else { "⏸️ " }
        Write-Host "      $status $($_.name) - $($_.type)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Failed to fetch AI providers: $_" -ForegroundColor Red
}

# 5. Test Projects
Write-Host "`n5️⃣  Testing Projects..." -ForegroundColor Yellow
try {
    $projects = Invoke-RestMethod -Uri "$baseUrl/api/projects" -Method GET -Headers $headers
    $projectCount = ($projects | Measure-Object).Count
    Write-Host "   ✅ Found $projectCount projects" -ForegroundColor Green
    $results.Projects = $true
    
    if ($projectCount -eq 0) {
        Write-Host "   ⚠️  No projects found. Creating test project..." -ForegroundColor Yellow
        $projectBody = @{
            name = "v2.0.0 Release Test Project"
            description = "Automated testing for ADPA v2.0.0 release"
            framework = "TOGAF"
            start_date = (Get-Date -Format "yyyy-MM-dd")
            status = "active"
        } | ConvertTo-Json
        
        $newProject = Invoke-RestMethod -Uri "$baseUrl/api/projects" -Method POST -Headers $headers -Body $projectBody
        Write-Host "   ✅ Created test project: $($newProject.id)" -ForegroundColor Green
        $testProjectId = $newProject.id
    } else {
        $testProjectId = $projects[0].id
        Write-Host "   📁 Using project: $($projects[0].name) (ID: $testProjectId)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ❌ Failed to test projects: $_" -ForegroundColor Red
}

# 6. Test Document Generation with Multiple AI Providers
Write-Host "`n6️⃣  Testing Document Generation..." -ForegroundColor Yellow
Write-Host "   This will generate 5-10 documents with different providers..." -ForegroundColor Cyan

# Define test scenarios
$testScenarios = @(
    @{ Provider = "Google"; Model = "gemini-2.5-flash"; Template = "Resource Management Plan"; Temp = 0.7 }
    @{ Provider = "Groq"; Model = "llama-3.3-70b-versatile"; Template = "Risk Management Plan"; Temp = 0.7 }
    @{ Provider = "OpenAI"; Model = "gpt-4-turbo"; Template = "Quality Management Plan"; Temp = 0.7 }
    @{ Provider = "Google"; Model = "gemini-2.5-flash"; Template = "Stakeholder Management Plan"; Temp = 0.7 }
    @{ Provider = "Groq"; Model = "llama-3.3-70b-versatile"; Template = "Communications Management Plan"; Temp = 0.6 }
)

$generationResults = @()

foreach ($scenario in $testScenarios) {
    Write-Host "`n   🔄 Testing: $($scenario.Template) with $($scenario.Provider)..." -ForegroundColor Yellow
    
    try {
        # Find template ID
        $template = $templates | Where-Object { $_.name -eq $scenario.Template } | Select-Object -First 1
        
        if (-not $template) {
            Write-Host "      ⚠️  Template not found: $($scenario.Template)" -ForegroundColor Yellow
            continue
        }
        
        # Find provider ID
        $provider = $providers | Where-Object { $_.name -like "*$($scenario.Provider)*" -or $_.provider_type -eq $scenario.Provider.ToLower() } | Select-Object -First 1
        
        if (-not $provider) {
            Write-Host "      ⚠️  Provider not found: $($scenario.Provider)" -ForegroundColor Yellow
            continue
        }
        
        # Generate document
        $generateBody = @{
            project_id = $testProjectId
            template_id = $template.id
            ai_provider_id = $provider.id
            model_name = $scenario.Model
            temperature = $scenario.Temp
            max_tokens = 16384
        } | ConvertTo-Json
        
        $startTime = Get-Date
        $document = Invoke-RestMethod -Uri "$baseUrl/api/documents/generate" -Method POST -Headers $headers -Body $generateBody -TimeoutSec 120
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        if ($document.id) {
            Write-Host "      ✅ Document generated successfully!" -ForegroundColor Green
            Write-Host "         ID: $($document.id)" -ForegroundColor Gray
            Write-Host "         Duration: $([Math]::Round($duration, 2)) seconds" -ForegroundColor Gray
            
            # Get full document details for metadata
            $docDetails = Invoke-RestMethod -Uri "$baseUrl/api/documents/$($document.id)" -Method GET -Headers $headers
            
            if ($docDetails.generation_metadata) {
                $meta = $docDetails.generation_metadata
                Write-Host "         Provider: $($meta.provider) ($($meta.model))" -ForegroundColor Gray
                Write-Host "         Tokens: $($meta.tokens_used)" -ForegroundColor Gray
                Write-Host "         Cost: `$$($meta.cost_usd)" -ForegroundColor Gray
                
                if ($meta.quality_metrics) {
                    Write-Host "         Quality: $($meta.quality_metrics.overall_score)% ($($meta.quality_metrics.grade))" -ForegroundColor Gray
                }
            }
            
            $generationResults += @{
                Template = $scenario.Template
                Provider = $scenario.Provider
                Model = $scenario.Model
                Success = $true
                Duration = $duration
                DocumentId = $document.id
                Metadata = $docDetails.generation_metadata
            }
        }
    } catch {
        Write-Host "      ❌ Generation failed: $_" -ForegroundColor Red
        $generationResults += @{
            Template = $scenario.Template
            Provider = $scenario.Provider
            Success = $false
            Error = $_.Exception.Message
        }
    }
    
    # Wait a bit between generations
    Start-Sleep -Seconds 2
}

$results.DocumentGeneration = $generationResults

# 7. Test Metadata Tracking
Write-Host "`n7️⃣  Testing Metadata Tracking..." -ForegroundColor Yellow
$successfulDocs = $generationResults | Where-Object { $_.Success -eq $true }

if ($successfulDocs.Count -gt 0) {
    $metadataCount = 0
    foreach ($doc in $successfulDocs) {
        if ($doc.Metadata) {
            $metadataCount++
        }
    }
    
    if ($metadataCount -gt 0) {
        Write-Host "   ✅ Metadata tracked for $metadataCount/$($successfulDocs.Count) documents" -ForegroundColor Green
        $results.MetadataTracking = $true
    } else {
        Write-Host "   ❌ No metadata found" -ForegroundColor Red
    }
} else {
    Write-Host "   ⚠️  No successful documents to check metadata" -ForegroundColor Yellow
}

# 8. Test Template Statistics
Write-Host "`n8️⃣  Testing Template Statistics..." -ForegroundColor Yellow
try {
    $statsResponse = Invoke-RestMethod -Uri "$baseUrl/api/template-stats" -Method GET -Headers $headers
    $stats = $statsResponse.statistics
    $statsCount = ($stats | Measure-Object).Count
    
    if ($statsCount -gt 0) {
        Write-Host "   ✅ Template statistics available for $statsCount templates" -ForegroundColor Green
        $results.TemplateStats = $true
        
        # Show top 3 by usage
        Write-Host "   📊 Top used templates:" -ForegroundColor Cyan
        $stats | Sort-Object -Property total_uses -Descending | Select-Object -First 3 | ForEach-Object {
            Write-Host "      - $($_.name): $($_.total_uses) uses, Avg Quality: $([Math]::Round($_.avg_quality_score, 1))%" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  No template statistics found yet (expected for first run)" -ForegroundColor Yellow
        $results.TemplateStats = $true
    }
} catch {
    Write-Host "   ❌ Failed to fetch template statistics: $_" -ForegroundColor Red
}

# Generate Test Report
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "📊 TEST RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

$passCount = 0
$totalTests = 8

Write-Host "`nCore Functionality:" -ForegroundColor Yellow
Write-Host "  Health Check:        $(if ($results.Health) { '✅ PASS' } else { '❌ FAIL' })"
Write-Host "  Authentication:      $(if ($results.Auth) { '✅ PASS' } else { '❌ FAIL' })"
Write-Host "  Templates:           $(if ($results.Templates) { '✅ PASS' } else { '❌ FAIL' })"
Write-Host "  AI Providers:        $(if ($results.AIProviders) { '✅ PASS' } else { '❌ FAIL' })"
Write-Host "  Projects:            $(if ($results.Projects) { '✅ PASS' } else { '❌ FAIL' })"
Write-Host "  Metadata Tracking:   $(if ($results.MetadataTracking) { '✅ PASS' } else { '❌ FAIL' })"
Write-Host "  Template Stats:      $(if ($results.TemplateStats) { '✅ PASS' } else { '❌ FAIL' })"

if ($results.Health) { $passCount++ }
if ($results.Auth) { $passCount++ }
if ($results.Templates) { $passCount++ }
if ($results.AIProviders) { $passCount++ }
if ($results.Projects) { $passCount++ }
if ($results.MetadataTracking) { $passCount++ }
if ($results.TemplateStats) { $passCount++ }

Write-Host "`nDocument Generation:" -ForegroundColor Yellow
$successfulGens = ($generationResults | Where-Object { $_.Success -eq $true }).Count
$totalGens = $generationResults.Count
Write-Host "  Success Rate:        $successfulGens/$totalGens documents generated"

if ($successfulGens -gt 0) {
    $passCount++
    Write-Host "  Status:              ✅ PASS" -ForegroundColor Green
} else {
    Write-Host "  Status:              ❌ FAIL" -ForegroundColor Red
}

# Provider breakdown
Write-Host "`n  By Provider:" -ForegroundColor Cyan
$providerGroups = $generationResults | Where-Object { $_.Success } | Group-Object -Property Provider
foreach ($group in $providerGroups) {
    Write-Host "    - $($group.Name): $($group.Count) successful" -ForegroundColor Gray
}

Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Cyan
$passPercentage = [Math]::Round(($passCount / $totalTests) * 100, 0)
Write-Host "Overall Score: $passCount/$totalTests tests passed ($passPercentage%)" -ForegroundColor $(if ($passPercentage -ge 80) { 'Green' } elseif ($passPercentage -ge 60) { 'Yellow' } else { 'Red' })
Write-Host "=" * 60 -ForegroundColor Cyan

# Save detailed results to JSON
$results | ConvertTo-Json -Depth 5 | Out-File "test-results-v2.0.0.json"
Write-Host "`n💾 Detailed results saved to: test-results-v2.0.0.json" -ForegroundColor Cyan

# Determine if ready for release
if ($passPercentage -ge 80) {
    Write-Host "`n🎉 System is ready for v2.0.0 release!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️  System needs attention before release" -ForegroundColor Yellow
    exit 1
}

