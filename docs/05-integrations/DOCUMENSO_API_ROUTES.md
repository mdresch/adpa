# Documenso API Routes - Document Signing

**Date**: 2025-01-XX  
**Status**: ✅ API Routes Created - Ready for Testing  
**Related Task**: Documenso Integration - PDF Signing

---

## 📋 Overview

Complete REST API endpoints for document signing functionality, integrated with ADPA's authentication, validation, and error handling patterns.

---

## 🛣️ API Endpoints

### **1. Create Signature Fields**
**`POST /api/signatures/create-fields`**

Create signature fields/placeholders on a document.

**Authentication**: Required (`documents.update` permission)

**Request Body**:
```json
{
  "document_id": "uuid",
  "fields": [
    {
      "field_name": "signer_name",
      "field_label": "Signer Name",
      "page_number": 1,
      "x_position": 100.0,
      "y_position": 700.0,
      "width": 200.0,
      "height": 50.0,
      "field_type": "signature",
      "is_required": true,
      "assigned_to_email": "signer@example.com",
      "assigned_to_user_id": "uuid (optional)"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Signature fields created successfully",
  "data": [
    {
      "id": "uuid",
      "document_id": "uuid",
      "field_name": "signer_name",
      "status": "pending",
      ...
    }
  ]
}
```

---

### **2. Initiate Signature Request**
**`POST /api/signatures/initiate`**

Start a complete signature request with fields and recipients.

**Authentication**: Required (`documents.update` permission)

**Request Body**:
```json
{
  "document_id": "uuid",
  "title": "Project Charter Approval",
  "signature_fields": [
    {
      "field_name": "signer_name",
      "page_number": 1,
      "x_position": 100.0,
      "y_position": 700.0,
      "field_type": "signature"
    }
  ],
  "recipients": [
    {
      "email": "signer@example.com",
      "name": "John Doe",
      "role": "Signer",
      "signing_order": 1
    }
  ],
  "require_all_signatures": true,
  "signing_deadline": "2025-02-01T00:00:00Z",
  "approval_request_id": "uuid (optional)"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Signature request initiated successfully",
  "data": {
    "id": "uuid",
    "document_id": "uuid",
    "signature_request_id": "uuid",
    "status": "pending",
    "fields": [...],
    "recipients": [...]
  }
}
```

---

### **3. Sign a Field**
**`POST /api/signatures/sign`**

Add a signature to a signature field.

**Authentication**: Required (or use invitation token)

**Request Body**:
```json
{
  "signature_field_id": "uuid",
  "signature_data": {
    "signature_type": "handwritten",
    "signature_image": "base64-encoded-image",
    "signature_text": "John Doe (optional for typed)",
    "certificate_id": "uuid (optional for certificate signing)"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Signature added successfully",
  "data": {
    "id": "uuid",
    "status": "signed",
    "signed_at": "2025-01-XX...",
    ...
  }
}
```

---

### **4. Get Document Signature Status**
**`GET /api/signatures/document/:documentId`**

Get the signature status for a document.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "document_id": "uuid",
    "status": "in_progress",
    "total_fields": 3,
    "signed_fields": 2,
    "total_recipients": 2,
    "signed_recipients": 1,
    "fields": [...],
    "recipients": [...]
  }
}
```

---

### **5. Sign PDF Document**
**`POST /api/signatures/sign-pdf/:documentId`**

Sign the PDF document using Documenso library and return signed PDF.

**Authentication**: Required (`documents.update` permission)

**Request Body**:
```json
{
  "signature_field_ids": ["uuid1", "uuid2"]
}
```

**Response**: PDF file download

---

### **6. Get Recipient Details (by Token)**
**`GET /api/signatures/recipient/:token`**

Get signature request details using invitation token (for external signers).

**Authentication**: Not required (uses token)

**Response**:
```json
{
  "success": true,
  "data": {
    "recipient": {
      "id": "uuid",
      "email": "signer@example.com",
      "status": "pending",
      "invitation_token": "token",
      ...
    },
    "fields": [
      {
        "id": "uuid",
        "field_name": "signer_name",
        "page_number": 1,
        ...
      }
    ]
  }
}
```

---

### **7. Get Audit Log**
**`GET /api/signatures/audit/:documentId`**

Get audit log for a document's signatures.

**Authentication**: Required (`documents.read` permission)

**Query Parameters**:
- `limit` (default: 50)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "action": "signature_added",
      "action_type": "sign",
      "performed_by": "uuid",
      "performed_at": "2025-01-XX...",
      "details": {...}
    }
  ],
  "pagination": {
    "total": 10,
    "limit": 50,
    "offset": 0
  }
}
```

---

## 🔒 Security Features

1. **Authentication**: All endpoints require JWT authentication (except recipient token endpoint)
2. **Permissions**: Uses ADPA's permission system (`documents.update`, `documents.read`)
3. **Token-Based Access**: External signers use secure invitation tokens
4. **IP Tracking**: Records IP address and user agent for audit
5. **Audit Logging**: All actions logged to `signature_audit_logs` table

---

## 📝 Usage Examples

### **Example 1: Create Signature Request**

```typescript
const response = await fetch('/api/signatures/initiate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    document_id: 'document-uuid',
    title: 'Project Charter Approval',
    signature_fields: [
      {
        field_name: 'sponsor_signature',
        page_number: 1,
        x_position: 100,
        y_position: 700,
        field_type: 'signature',
        assigned_to_email: 'sponsor@example.com'
      }
    ],
    recipients: [
      {
        email: 'sponsor@example.com',
        name: 'Project Sponsor',
        role: 'Signer',
        signing_order: 1
      }
    ],
    require_all_signatures: true
  })
})

const result = await response.json()
console.log('Signature request created:', result.data.signature_request_id)
```

### **Example 2: Sign a Field**

```typescript
const response = await fetch('/api/signatures/sign', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    signature_field_id: 'field-uuid',
    signature_data: {
      signature_type: 'handwritten',
      signature_image: 'data:image/png;base64,...'
    }
  })
})

const result = await response.json()
console.log('Signature added:', result.data)
```

### **Example 3: Check Signature Status**

```typescript
const response = await fetch('/api/signatures/document/document-uuid', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

const result = await response.json()
console.log('Status:', result.data.status)
console.log('Progress:', `${result.data.signed_fields}/${result.data.total_fields}`)
```

---

## 🔄 Integration Points

### **With Approval Workflows**:
- `approval_request_id` can be linked to signature requests
- Signature completion can trigger approval workflow updates

### **With Documents**:
- All signatures linked to `documents.id`
- Signed PDFs stored separately from original
- Original document preserved

### **With Users**:
- Internal signers linked via `user_id`
- External signers identified by `email`
- All actions tracked via audit logs

---

## ✅ Implementation Checklist

- [x] **Signature Service Created** (`signatureService.ts`)
- [x] **API Routes Created** (`signatures.ts`)
- [x] **Routes Registered** (`server.ts`)
- [x] **Authentication Integrated** (JWT + permissions)
- [x] **Validation Added** (Joi schemas)
- [x] **Error Handling** (Try/catch with proper status codes)
- [x] **Audit Logging** (All actions logged)
- [x] **Documenso Integration** (PDF signing library used)

---

## 📋 Next Steps

1. ✅ **API Routes Created** - Ready for testing
2. 📋 **Test Endpoints** - Use Postman/curl to test all endpoints
3. 📋 **Create Frontend Components** - React components for signature capture
4. 📋 **End-to-End Testing** - Complete signature workflow testing

---

**Status**: ✅ API Routes Complete - Ready for Frontend Integration

