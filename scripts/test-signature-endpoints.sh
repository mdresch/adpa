#!/bin/bash
# ADPA Signature API Endpoints Test Script (Bash/curl)
# Tests all signature-related endpoints

set -e

echo "🚀 ADPA Signature API Endpoints Test Script"
echo "==========================================="
echo ""

# Configuration
BASE_URL="http://localhost:5000"
TEST_EMAIL="test@adpa.com"
TEST_PASSWORD="Test123!@#"

# Test data
TEST_DOCUMENT_ID=""
TEST_SIGNATURE_FIELD_ID=""
TEST_SIGNATURE_REQUEST_ID=""
TEST_INVITATION_TOKEN=""

# Results
AUTH_PASSED=false
CREATE_FIELDS_PASSED=false
INITIATE_REQUEST_PASSED=false
GET_STATUS_PASSED=false
SIGN_FIELD_PASSED=false
GET_RECIPIENT_PASSED=false
GET_AUDIT_PASSED=false

# ============================================================================
# 1. Authentication
# ============================================================================
echo "1️⃣  Testing Authentication..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token // empty')

if [ -n "$TOKEN" ]; then
  echo "   ✅ Authentication successful"
  AUTH_PASSED=true
else
  echo "   ❌ Authentication failed"
  echo "   💡 Make sure you have a test user: $TEST_EMAIL"
  exit 1
fi

# ============================================================================
# 2. Get a test document ID
# ============================================================================
echo ""
echo "2️⃣  Getting test document..."
DOCUMENTS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/documents?limit=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

TEST_DOCUMENT_ID=$(echo $DOCUMENTS_RESPONSE | jq -r '.documents[0].id // empty')

if [ -n "$TEST_DOCUMENT_ID" ]; then
  echo "   ✅ Found document: $TEST_DOCUMENT_ID"
else
  echo "   ⚠️  No documents found. Please create a document first or set TEST_DOCUMENT_ID manually"
  exit 1
fi

# ============================================================================
# 3. Create Signature Fields
# ============================================================================
echo ""
echo "3️⃣  Testing Create Signature Fields..."
CREATE_FIELDS_RESPONSE=$(curl -s -X POST "$BASE_URL/api/signatures/create-fields" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"document_id\": \"$TEST_DOCUMENT_ID\",
    \"fields\": [{
      \"field_name\": \"test_signer\",
      \"field_label\": \"Test Signer\",
      \"page_number\": 1,
      \"x_position\": 100.0,
      \"y_position\": 700.0,
      \"width\": 200.0,
      \"height\": 50.0,
      \"field_type\": \"signature\",
      \"is_required\": true,
      \"assigned_to_email\": \"$TEST_EMAIL\"
    }]
  }")

SUCCESS=$(echo $CREATE_FIELDS_RESPONSE | jq -r '.success // false')
if [ "$SUCCESS" = "true" ]; then
  TEST_SIGNATURE_FIELD_ID=$(echo $CREATE_FIELDS_RESPONSE | jq -r '.data[0].id // empty')
  echo "   ✅ Signature fields created successfully"
  echo "      Field ID: $TEST_SIGNATURE_FIELD_ID"
  CREATE_FIELDS_PASSED=true
else
  echo "   ❌ Failed to create signature fields"
  echo "   Response: $CREATE_FIELDS_RESPONSE"
fi

# ============================================================================
# 4. Initiate Signature Request
# ============================================================================
echo ""
echo "4️⃣  Testing Initiate Signature Request..."
INITIATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/signatures/initiate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"document_id\": \"$TEST_DOCUMENT_ID\",
    \"title\": \"Test Signature Request\",
    \"signature_fields\": [{
      \"field_name\": \"sponsor_signature\",
      \"page_number\": 1,
      \"x_position\": 100.0,
      \"y_position\": 650.0,
      \"field_type\": \"signature\",
      \"assigned_to_email\": \"$TEST_EMAIL\"
    }],
    \"recipients\": [{
      \"email\": \"$TEST_EMAIL\",
      \"name\": \"Test User\",
      \"role\": \"Signer\",
      \"signing_order\": 1
    }],
    \"require_all_signatures\": true
  }")

SUCCESS=$(echo $INITIATE_RESPONSE | jq -r '.success // false')
if [ "$SUCCESS" = "true" ]; then
  TEST_SIGNATURE_REQUEST_ID=$(echo $INITIATE_RESPONSE | jq -r '.data.signature_request_id // empty')
  TEST_INVITATION_TOKEN=$(echo $INITIATE_RESPONSE | jq -r '.data.recipients[0].invitation_token // empty')
  echo "   ✅ Signature request initiated successfully"
  echo "      Request ID: $TEST_SIGNATURE_REQUEST_ID"
  echo "      Invitation Token: $TEST_INVITATION_TOKEN"
  INITIATE_REQUEST_PASSED=true
else
  echo "   ❌ Failed to initiate signature request"
  echo "   Response: $INITIATE_RESPONSE"
fi

# ============================================================================
# 5. Get Document Signature Status
# ============================================================================
echo ""
echo "5️⃣  Testing Get Document Signature Status..."
STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/signatures/document/$TEST_DOCUMENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

SUCCESS=$(echo $STATUS_RESPONSE | jq -r '.success // false')
if [ "$SUCCESS" = "true" ]; then
  STATUS=$(echo $STATUS_RESPONSE | jq -r '.data.status // empty')
  SIGNED_FIELDS=$(echo $STATUS_RESPONSE | jq -r '.data.signed_fields // 0')
  TOTAL_FIELDS=$(echo $STATUS_RESPONSE | jq -r '.data.total_fields // 0')
  echo "   ✅ Signature status retrieved successfully"
  echo "      Status: $STATUS"
  echo "      Fields: $SIGNED_FIELDS/$TOTAL_FIELDS"
  GET_STATUS_PASSED=true
else
  echo "   ⚠️  No signature request found for this document"
fi

# ============================================================================
# 6. Sign a Field
# ============================================================================
if [ -n "$TEST_SIGNATURE_FIELD_ID" ]; then
  echo ""
  echo "6️⃣  Testing Sign Field..."
  # Simple base64 signature image (1x1 red pixel)
  SIGNATURE_IMAGE="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  
  SIGN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/signatures/sign" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"signature_field_id\": \"$TEST_SIGNATURE_FIELD_ID\",
      \"signature_data\": {
        \"signature_type\": \"handwritten\",
        \"signature_image\": \"data:image/png;base64,$SIGNATURE_IMAGE\"
      }
    }")

  SUCCESS=$(echo $SIGN_RESPONSE | jq -r '.success // false')
  if [ "$SUCCESS" = "true" ]; then
    echo "   ✅ Signature added successfully"
    SIGN_FIELD_PASSED=true
  else
    echo "   ⚠️  Failed to add signature (field may already be signed)"
  fi
else
  echo ""
  echo "6️⃣  Skipping Sign Field (no field ID available)"
fi

# ============================================================================
# 7. Get Recipient Details (by token)
# ============================================================================
if [ -n "$TEST_INVITATION_TOKEN" ]; then
  echo ""
  echo "7️⃣  Testing Get Recipient Details (by token)..."
  RECIPIENT_RESPONSE=$(curl -s -X GET "$BASE_URL/api/signatures/recipient/$TEST_INVITATION_TOKEN")

  SUCCESS=$(echo $RECIPIENT_RESPONSE | jq -r '.success // false')
  if [ "$SUCCESS" = "true" ]; then
    EMAIL=$(echo $RECIPIENT_RESPONSE | jq -r '.data.recipient.email // empty')
    STATUS=$(echo $RECIPIENT_RESPONSE | jq -r '.data.recipient.status // empty')
    echo "   ✅ Recipient details retrieved successfully"
    echo "      Email: $EMAIL"
    echo "      Status: $STATUS"
    GET_RECIPIENT_PASSED=true
  else
    echo "   ⚠️  Failed to get recipient details"
  fi
else
  echo ""
  echo "7️⃣  Skipping Get Recipient (no invitation token available)"
fi

# ============================================================================
# 8. Get Audit Log
# ============================================================================
echo ""
echo "8️⃣  Testing Get Audit Log..."
AUDIT_RESPONSE=$(curl -s -X GET "$BASE_URL/api/signatures/audit/$TEST_DOCUMENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

SUCCESS=$(echo $AUDIT_RESPONSE | jq -r '.success // false')
if [ "$SUCCESS" = "true" ]; then
  TOTAL=$(echo $AUDIT_RESPONSE | jq -r '.pagination.total // 0')
  echo "   ✅ Audit log retrieved successfully"
  echo "      Total entries: $TOTAL"
  GET_AUDIT_PASSED=true
else
  echo "   ⚠️  No audit log entries found"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "📊 Test Results Summary"
echo "======================"
echo ""

TOTAL_TESTS=7
PASSED_TESTS=0

[ "$AUTH_PASSED" = "true" ] && echo "   ✅ PASS - Auth" && ((PASSED_TESTS++)) || echo "   ❌ FAIL - Auth"
[ "$CREATE_FIELDS_PASSED" = "true" ] && echo "   ✅ PASS - Create Fields" && ((PASSED_TESTS++)) || echo "   ❌ FAIL - Create Fields"
[ "$INITIATE_REQUEST_PASSED" = "true" ] && echo "   ✅ PASS - Initiate Request" && ((PASSED_TESTS++)) || echo "   ❌ FAIL - Initiate Request"
[ "$GET_STATUS_PASSED" = "true" ] && echo "   ✅ PASS - Get Status" && ((PASSED_TESTS++)) || echo "   ❌ FAIL - Get Status"
[ "$SIGN_FIELD_PASSED" = "true" ] && echo "   ✅ PASS - Sign Field" && ((PASSED_TESTS++)) || echo "   ❌ FAIL - Sign Field"
[ "$GET_RECIPIENT_PASSED" = "true" ] && echo "   ✅ PASS - Get Recipient" && ((PASSED_TESTS++)) || echo "   ❌ FAIL - Get Recipient"
[ "$GET_AUDIT_PASSED" = "true" ] && echo "   ✅ PASS - Get Audit" && ((PASSED_TESTS++)) || echo "   ❌ FAIL - Get Audit"

echo ""
echo "   Total: $PASSED_TESTS/$TOTAL_TESTS tests passed"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
  echo ""
  echo "🎉 All tests passed!"
  exit 0
else
  echo ""
  echo "⚠️  Some tests failed. Check the output above for details."
  exit 1
fi

