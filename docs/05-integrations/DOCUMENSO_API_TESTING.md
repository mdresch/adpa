# Documenso API Endpoints Testing Guide

**Date**: 2025-01-XX  
**Status**: ✅ Test Scripts Created  
**Related Task**: Documenso Integration - PDF Signing

---

## 📋 Overview

Comprehensive testing guide for all signature API endpoints, including PowerShell, Bash/curl, and Postman collection options.

---

## 🚀 Quick Start

### **Prerequisites**:
1. Backend server running on `http://localhost:5000`
2. Test user created (`test@adpa.com` / `Test123!@#`)
3. At least one document in the database

### **Run Tests**:

**PowerShell** (Windows):
```powershell
cd scripts
.\test-signature-endpoints.ps1
```

**Bash** (Linux/Mac):
```bash
chmod +x scripts/test-signature-endpoints.sh
./scripts/test-signature-endpoints.sh
```

---

## 📝 Manual Testing with curl

### **1. Authenticate**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@adpa.com","password":"Test123!@#"}'
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {...}
}
```

**Save token**:
```bash
TOKEN="your-token-here"
```

---

### **2. Get Test Document ID**
```bash
curl -X GET "http://localhost:5000/api/documents?limit=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Save document ID**:
```bash
DOCUMENT_ID="your-document-id"
```

---

### **3. Create Signature Fields**
```bash
curl -X POST http://localhost:5000/api/signatures/create-fields \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "'$DOCUMENT_ID'",
    "fields": [{
      "field_name": "sponsor_signature",
      "field_label": "Sponsor Signature",
      "page_number": 1,
      "x_position": 100.0,
      "y_position": 700.0,
      "width": 200.0,
      "height": 50.0,
      "field_type": "signature",
      "is_required": true,
      "assigned_to_email": "sponsor@example.com"
    }]
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Signature fields created successfully",
  "data": [
    {
      "id": "field-uuid",
      "document_id": "document-uuid",
      "field_name": "sponsor_signature",
      "status": "pending",
      ...
    }
  ]
}
```

---

### **4. Initiate Signature Request**
```bash
curl -X POST http://localhost:5000/api/signatures/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "'$DOCUMENT_ID'",
    "title": "Project Charter Approval",
    "signature_fields": [{
      "field_name": "sponsor_signature",
      "page_number": 1,
      "x_position": 100.0,
      "y_position": 700.0,
      "field_type": "signature",
      "assigned_to_email": "sponsor@example.com"
    }],
    "recipients": [{
      "email": "sponsor@example.com",
      "name": "Project Sponsor",
      "role": "Signer",
      "signing_order": 1
    }],
    "require_all_signatures": true
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Signature request initiated successfully",
  "data": {
    "id": "signature-uuid",
    "signature_request_id": "request-uuid",
    "status": "pending",
    "fields": [...],
    "recipients": [
      {
        "id": "recipient-uuid",
        "email": "sponsor@example.com",
        "invitation_token": "token-here",
        ...
      }
    ]
  }
}
```

**Save invitation token**:
```bash
INVITATION_TOKEN="token-from-response"
```

---

### **5. Get Document Signature Status**
```bash
curl -X GET "http://localhost:5000/api/signatures/document/$DOCUMENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "signature-uuid",
    "document_id": "document-uuid",
    "status": "pending",
    "total_fields": 1,
    "signed_fields": 0,
    "total_recipients": 1,
    "signed_recipients": 0,
    "fields": [...],
    "recipients": [...]
  }
}
```

---

### **6. Sign a Field**
```bash
# Get field ID from previous response
FIELD_ID="field-uuid"

# Create a simple base64 signature image (1x1 red pixel)
SIGNATURE_IMAGE="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

curl -X POST http://localhost:5000/api/signatures/sign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "signature_field_id": "'$FIELD_ID'",
    "signature_data": {
      "signature_type": "handwritten",
      "signature_image": "data:image/png;base64,'$SIGNATURE_IMAGE'"
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Signature added successfully",
  "data": {
    "id": "field-uuid",
    "status": "signed",
    "signed_at": "2025-01-XX...",
    ...
  }
}
```

---

### **7. Get Recipient Details (by Token)**
```bash
curl -X GET "http://localhost:5000/api/signatures/recipient/$INVITATION_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "recipient": {
      "id": "recipient-uuid",
      "email": "sponsor@example.com",
      "status": "pending",
      "invitation_token": "token-here",
      ...
    },
    "fields": [
      {
        "id": "field-uuid",
        "field_name": "sponsor_signature",
        "page_number": 1,
        ...
      }
    ]
  }
}
```

---

### **8. Get Audit Log**
```bash
curl -X GET "http://localhost:5000/api/signatures/audit/$DOCUMENT_ID?limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "audit-uuid",
      "action": "signature_added",
      "action_type": "sign",
      "performed_by": "user-uuid",
      "performed_at": "2025-01-XX...",
      "details": {...}
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 10,
    "offset": 0
  }
}
```

---

## 📦 Postman Collection

### **Import Collection**:

1. Open Postman
2. Click **Import**
3. Paste the collection JSON (see below)
4. Set environment variables:
   - `baseUrl`: `http://localhost:5000`
   - `token`: (will be set automatically after login)
   - `documentId`: (set after getting documents)
   - `fieldId`: (set after creating fields)
   - `invitationToken`: (set after initiating request)

### **Collection JSON**:

```json
{
  "info": {
    "name": "ADPA Signature API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Auth - Login",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"test@adpa.com\",\n  \"password\": \"Test123!@#\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/api/auth/login",
          "host": ["{{baseUrl}}"],
          "path": ["api", "auth", "login"]
        }
      },
      "event": [{
        "listen": "test",
        "script": {
          "exec": [
            "if (pm.response.code === 200) {",
            "  var jsonData = pm.response.json();",
            "  pm.environment.set('token', jsonData.token);",
            "}"
          ]
        }
      }]
    },
    {
      "name": "2. Get Documents",
      "request": {
        "method": "GET",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "url": {
          "raw": "{{baseUrl}}/api/documents?limit=1",
          "host": ["{{baseUrl}}"],
          "path": ["api", "documents"],
          "query": [{"key": "limit", "value": "1"}]
        }
      }
    },
    {
      "name": "3. Create Signature Fields",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"document_id\": \"{{documentId}}\",\n  \"fields\": [{\n    \"field_name\": \"sponsor_signature\",\n    \"field_label\": \"Sponsor Signature\",\n    \"page_number\": 1,\n    \"x_position\": 100.0,\n    \"y_position\": 700.0,\n    \"width\": 200.0,\n    \"height\": 50.0,\n    \"field_type\": \"signature\",\n    \"is_required\": true,\n    \"assigned_to_email\": \"sponsor@example.com\"\n  }]\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/api/signatures/create-fields",
          "host": ["{{baseUrl}}"],
          "path": ["api", "signatures", "create-fields"]
        }
      }
    },
    {
      "name": "4. Initiate Signature Request",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"document_id\": \"{{documentId}}\",\n  \"title\": \"Project Charter Approval\",\n  \"signature_fields\": [{\n    \"field_name\": \"sponsor_signature\",\n    \"page_number\": 1,\n    \"x_position\": 100.0,\n    \"y_position\": 700.0,\n    \"field_type\": \"signature\",\n    \"assigned_to_email\": \"sponsor@example.com\"\n  }],\n  \"recipients\": [{\n    \"email\": \"sponsor@example.com\",\n    \"name\": \"Project Sponsor\",\n    \"role\": \"Signer\",\n    \"signing_order\": 1\n  }],\n  \"require_all_signatures\": true\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/api/signatures/initiate",
          "host": ["{{baseUrl}}"],
          "path": ["api", "signatures", "initiate"]
        }
      }
    },
    {
      "name": "5. Get Signature Status",
      "request": {
        "method": "GET",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "url": {
          "raw": "{{baseUrl}}/api/signatures/document/{{documentId}}",
          "host": ["{{baseUrl}}"],
          "path": ["api", "signatures", "document", "{{documentId}}"]
        }
      }
    },
    {
      "name": "6. Sign Field",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"signature_field_id\": \"{{fieldId}}\",\n  \"signature_data\": {\n    \"signature_type\": \"handwritten\",\n    \"signature_image\": \"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==\"\n  }\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/api/signatures/sign",
          "host": ["{{baseUrl}}"],
          "path": ["api", "signatures", "sign"]
        }
      }
    },
    {
      "name": "7. Get Recipient (by Token)",
      "request": {
        "method": "GET",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "url": {
          "raw": "{{baseUrl}}/api/signatures/recipient/{{invitationToken}}",
          "host": ["{{baseUrl}}"],
          "path": ["api", "signatures", "recipient", "{{invitationToken}}"]
        }
      }
    },
    {
      "name": "8. Get Audit Log",
      "request": {
        "method": "GET",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "url": {
          "raw": "{{baseUrl}}/api/signatures/audit/{{documentId}}?limit=10",
          "host": ["{{baseUrl}}"],
          "path": ["api", "signatures", "audit", "{{documentId}}"],
          "query": [{"key": "limit", "value": "10"}]
        }
      }
    }
  ]
}
```

---

## ✅ Expected Test Results

### **All Tests Should Pass**:
- ✅ Authentication
- ✅ Create Signature Fields
- ✅ Initiate Signature Request
- ✅ Get Document Signature Status
- ✅ Sign a Field
- ✅ Get Recipient Details (by token)
- ✅ Get Audit Log

### **Common Issues**:

1. **"Document not found"**
   - Create a document first via `/api/documents`
   - Or set `TEST_DOCUMENT_ID` manually in the script

2. **"User not authenticated"**
   - Check that login endpoint returns a valid token
   - Verify token is being sent in Authorization header

3. **"Field already signed"**
   - This is OK - field can only be signed once
   - Create a new signature request for testing

4. **"Invalid invitation token"**
   - Token expires after 7 days
   - Create a new signature request to get a fresh token

---

## 📋 Test Checklist

- [ ] Backend server running (`http://localhost:5000`)
- [ ] Test user created (`test@adpa.com`)
- [ ] At least one document exists in database
- [ ] All endpoints return expected status codes
- [ ] Authentication works correctly
- [ ] Signature fields can be created
- [ ] Signature requests can be initiated
- [ ] Fields can be signed
- [ ] Status can be retrieved
- [ ] Audit log is populated

---

**Status**: ✅ Test Scripts Ready - Run `.\scripts\test-signature-endpoints.ps1` to test all endpoints

