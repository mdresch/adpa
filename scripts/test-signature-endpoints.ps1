#!/usr/bin/env pwsh
# ADPA Signature API Endpoints Test Script
# Tests all signature-related endpoints

$ErrorActionPreference = "Stop"

Write-Host "🚀 ADPA Signature API Endpoints Test Script" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:5000"
$testEmail = "test@adpa.com"
$testPassword = "Test123!@#"

# Test data
$testDocumentId = ""
$testSignatureFieldId = ""
$testSignatureRequestId = ""
$testInvitationToken = ""

# Initialize results
$results = @{
    Auth = $false
    CreateFields = $false
    InitiateRequest = $false
    GetStatus = $false
    SignField = $false
    SignPdf = $false
    GetRecipient = $false
    GetAudit = $false
}

$headers = @{
    "Content-Type" = "application/json"
}

# ============================================================================
# 1. Authentication
# ============================================================================
Write-Host "1️⃣  Testing Authentication..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    
    if ($token) {
        Write-Host "   ✅ Authentication successful" -ForegroundColor Green
        $results.Auth = $true
        $headers["Authorization"] = "Bearer $token"
    } else {
        Write-Host "   ❌ No token received" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Authentication failed: $_" -ForegroundColor Red
    Write-Host "   💡 Make sure you have a test user: $testEmail" -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# 2. Get a test document ID (or use provided one)
# ============================================================================
Write-Host "`n2️⃣  Getting test document..." -ForegroundColor Yellow
try {
    $documentsResponse = Invoke-RestMethod -Uri "$baseUrl/api/documents?limit=1" -Method GET -Headers $headers
    if ($documentsResponse.documents -and $documentsResponse.documents.Count -gt 0) {
        $testDocumentId = $documentsResponse.documents[0].id
        Write-Host "   ✅ Found document: $testDocumentId" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No documents found. Please create a document first or set `$testDocumentId manually" -ForegroundColor Yellow
        Write-Host "   💡 You can create a document via: POST $baseUrl/api/documents" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "   ⚠️  Could not fetch documents: $_" -ForegroundColor Yellow
    Write-Host "   💡 Set `$testDocumentId manually if you have one" -ForegroundColor Yellow
}

if (-not $testDocumentId) {
    Write-Host "   ❌ No document ID available. Exiting." -ForegroundColor Red
    exit 1
}

# ============================================================================
# 3. Create Signature Fields
# ============================================================================
Write-Host "`n3️⃣  Testing Create Signature Fields..." -ForegroundColor Yellow
try {
    $createFieldsBody = @{
        document_id = $testDocumentId
        fields = @(
            @{
                field_name = "test_signer"
                field_label = "Test Signer"
                page_number = 1
                x_position = 100.0
                y_position = 700.0
                width = 200.0
                height = 50.0
                field_type = "signature"
                is_required = $true
                assigned_to_email = $testEmail
            }
        )
    } | ConvertTo-Json -Depth 10

    $createFieldsResponse = Invoke-RestMethod -Uri "$baseUrl/api/signatures/create-fields" -Method POST -Body $createFieldsBody -Headers $headers
    
    if ($createFieldsResponse.success -and $createFieldsResponse.data) {
        $testSignatureFieldId = $createFieldsResponse.data[0].id
        Write-Host "   ✅ Signature fields created successfully" -ForegroundColor Green
        Write-Host "      Field ID: $testSignatureFieldId" -ForegroundColor Gray
        $results.CreateFields = $true
    } else {
        Write-Host "   ❌ Failed to create signature fields" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Error creating signature fields: $_" -ForegroundColor Red
    Write-Host "   Response: $($_.Exception.Response)" -ForegroundColor Gray
}

# ============================================================================
# 4. Initiate Signature Request
# ============================================================================
Write-Host "`n4️⃣  Testing Initiate Signature Request..." -ForegroundColor Yellow
try {
    $initiateBody = @{
        document_id = $testDocumentId
        title = "Test Signature Request"
        signature_fields = @(
            @{
                field_name = "sponsor_signature"
                page_number = 1
                x_position = 100.0
                y_position = 650.0
                field_type = "signature"
                assigned_to_email = $testEmail
            }
        )
        recipients = @(
            @{
                email = $testEmail
                name = "Test User"
                role = "Signer"
                signing_order = 1
            }
        )
        require_all_signatures = $true
    } | ConvertTo-Json -Depth 10

    $initiateResponse = Invoke-RestMethod -Uri "$baseUrl/api/signatures/initiate" -Method POST -Body $initiateBody -Headers $headers
    
    if ($initiateResponse.success -and $initiateResponse.data) {
        $testSignatureRequestId = $initiateResponse.data.signature_request_id
        $testInvitationToken = $initiateResponse.data.recipients[0].invitation_token
        Write-Host "   ✅ Signature request initiated successfully" -ForegroundColor Green
        Write-Host "      Request ID: $testSignatureRequestId" -ForegroundColor Gray
        Write-Host "      Invitation Token: $testInvitationToken" -ForegroundColor Gray
        $results.InitiateRequest = $true
    } else {
        Write-Host "   ❌ Failed to initiate signature request" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Error initiating signature request: $_" -ForegroundColor Red
    Write-Host "   Response: $($_.Exception.Response)" -ForegroundColor Gray
}

# ============================================================================
# 5. Get Document Signature Status
# ============================================================================
Write-Host "`n5️⃣  Testing Get Document Signature Status..." -ForegroundColor Yellow
try {
    $statusResponse = Invoke-RestMethod -Uri "$baseUrl/api/signatures/document/$testDocumentId" -Method GET -Headers $headers
    
    if ($statusResponse.success -and $statusResponse.data) {
        Write-Host "   ✅ Signature status retrieved successfully" -ForegroundColor Green
        Write-Host "      Status: $($statusResponse.data.status)" -ForegroundColor Gray
        Write-Host "      Fields: $($statusResponse.data.signed_fields)/$($statusResponse.data.total_fields)" -ForegroundColor Gray
        $results.GetStatus = $true
    } else {
        Write-Host "   ⚠️  No signature request found for this document" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Error getting signature status: $_" -ForegroundColor Yellow
    # This is OK if no signature request exists yet
}

# ============================================================================
# 6. Sign a Field (if we have a field ID)
# ============================================================================
if ($testSignatureFieldId) {
    Write-Host "`n6️⃣  Testing Sign Field..." -ForegroundColor Yellow
    try {
        # Create a simple base64 signature image (1x1 red pixel)
        $signatureImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        $signBody = @{
            signature_field_id = $testSignatureFieldId
            signature_data = @{
                signature_type = "handwritten"
                signature_image = "data:image/png;base64,$signatureImage"
            }
        } | ConvertTo-Json -Depth 10

        $signResponse = Invoke-RestMethod -Uri "$baseUrl/api/signatures/sign" -Method POST -Body $signBody -Headers $headers
        
        if ($signResponse.success) {
            Write-Host "   ✅ Signature added successfully" -ForegroundColor Green
            $results.SignField = $true
        } else {
            Write-Host "   ❌ Failed to add signature" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ⚠️  Error signing field: $_" -ForegroundColor Yellow
        Write-Host "   💡 Field may already be signed or not found" -ForegroundColor Gray
    }
} else {
    Write-Host "`n6️⃣  Skipping Sign Field (no field ID available)" -ForegroundColor Yellow
}

# ============================================================================
# 7. Get Recipient Details (by token)
# ============================================================================
if ($testInvitationToken) {
    Write-Host "`n7️⃣  Testing Get Recipient Details (by token)..." -ForegroundColor Yellow
    try {
        $recipientResponse = Invoke-RestMethod -Uri "$baseUrl/api/signatures/recipient/$testInvitationToken" -Method GET
        
        if ($recipientResponse.success -and $recipientResponse.data) {
            Write-Host "   ✅ Recipient details retrieved successfully" -ForegroundColor Green
            Write-Host "      Email: $($recipientResponse.data.recipient.email)" -ForegroundColor Gray
            Write-Host "      Status: $($recipientResponse.data.recipient.status)" -ForegroundColor Gray
            $results.GetRecipient = $true
        } else {
            Write-Host "   ❌ Failed to get recipient details" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ⚠️  Error getting recipient details: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n7️⃣  Skipping Get Recipient (no invitation token available)" -ForegroundColor Yellow
}

# ============================================================================
# 8. Get Audit Log
# ============================================================================
Write-Host "`n8️⃣  Testing Get Audit Log..." -ForegroundColor Yellow
try {
    $auditResponse = Invoke-RestMethod -Uri "$baseUrl/api/signatures/audit/$testDocumentId" -Method GET -Headers $headers
    
    if ($auditResponse.success) {
        Write-Host "   ✅ Audit log retrieved successfully" -ForegroundColor Green
        Write-Host "      Total entries: $($auditResponse.pagination.total)" -ForegroundColor Gray
        $results.GetAudit = $true
    } else {
        Write-Host "   ⚠️  No audit log entries found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Error getting audit log: $_" -ForegroundColor Yellow
}

# ============================================================================
# Summary
# ============================================================================
Write-Host "`n" -NoNewline
Write-Host "📊 Test Results Summary" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

$totalTests = $results.Count
$passedTests = ($results.Values | Where-Object { $_ -eq $true }).Count

foreach ($test in $results.GetEnumerator() | Sort-Object Name) {
    $status = if ($test.Value) { "✅ PASS" } else { "❌ FAIL" }
    $color = if ($test.Value) { "Green" } else { "Red" }
    Write-Host "   $status - $($test.Key)" -ForegroundColor $color
}

Write-Host ""
Write-Host "   Total: $passedTests/$totalTests tests passed" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Yellow" })

if ($passedTests -eq $totalTests) {
    Write-Host "`n🎉 All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️  Some tests failed. Check the output above for details." -ForegroundColor Yellow
    exit 1
}

