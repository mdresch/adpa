#!/usr/bin/env pwsh
# ADPA Signature API Endpoints Test Script (Simplified)
# Tests signature endpoints with better error handling

$ErrorActionPreference = "Continue"  # Continue on errors instead of stopping

Write-Host "🚀 ADPA Signature API Endpoints Test Script (Simplified)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:5000"
$testEmail = "test@adpa.com"
$testPassword = "Test123!@#"

# Test if server is responding
Write-Host "🔍 Checking if server is responding..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "$baseUrl/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✅ Server is responding (Status: $($healthCheck.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Server health check timed out or failed" -ForegroundColor Yellow
    Write-Host "   💡 The server might be busy or having database connection issues" -ForegroundColor Gray
    Write-Host "   💡 Try: cd server && npm run dev" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Continuing anyway to test authentication..." -ForegroundColor Yellow
}

Write-Host ""

# Test Authentication
Write-Host "1️⃣  Testing Authentication..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json" `
        -TimeoutSec 5 `
        -ErrorAction Stop
    
    $token = $loginResponse.token
    
    if ($token) {
        Write-Host "   ✅ Authentication successful" -ForegroundColor Green
        Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
        
        # Test a simple endpoint
        Write-Host ""
        Write-Host "2️⃣  Testing Signature Endpoints..." -ForegroundColor Yellow
        
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
        
        # Try to get documents first
        Write-Host "   📄 Getting documents..." -ForegroundColor Gray
        try {
            $documentsResponse = Invoke-RestMethod -Uri "$baseUrl/api/documents?limit=1" `
                -Method GET `
                -Headers $headers `
                -TimeoutSec 5 `
                -ErrorAction Stop
            
            if ($documentsResponse.documents -and $documentsResponse.documents.Count -gt 0) {
                $testDocumentId = $documentsResponse.documents[0].id
                Write-Host "   ✅ Found document: $testDocumentId" -ForegroundColor Green
                
                # Test signature status endpoint
                Write-Host "   📝 Testing signature status endpoint..." -ForegroundColor Gray
                try {
                    $statusResponse = Invoke-RestMethod -Uri "$baseUrl/api/signatures/document/$testDocumentId" `
                        -Method GET `
                        -Headers $headers `
                        -TimeoutSec 5 `
                        -ErrorAction Stop
                    
                    if ($statusResponse.success) {
                        Write-Host "   ✅ Signature status endpoint working" -ForegroundColor Green
                    } else {
                        Write-Host "   ⚠️  No signature request found (this is OK)" -ForegroundColor Yellow
                    }
                } catch {
                    Write-Host "   ⚠️  Signature status endpoint: $($_.Exception.Message)" -ForegroundColor Yellow
                }
            } else {
                Write-Host "   ⚠️  No documents found. Create a document first." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   ⚠️  Error getting documents: $($_.Exception.Message)" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "✅ Basic endpoint tests completed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "💡 To test full workflow:" -ForegroundColor Cyan
        Write-Host "   1. Make sure you have a document in the database" -ForegroundColor Gray
        Write-Host "   2. Run: .\test-signature-endpoints.ps1" -ForegroundColor Gray
        Write-Host "   3. Or test manually with Postman/curl" -ForegroundColor Gray
        
    } else {
        Write-Host "   ❌ No token received" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   💡 Make sure:" -ForegroundColor Yellow
    Write-Host "      - Backend server is running (cd server && npm run dev)" -ForegroundColor Gray
    Write-Host "      - Test user exists: $testEmail" -ForegroundColor Gray
    Write-Host "      - Database is connected" -ForegroundColor Gray
}

Write-Host ""

