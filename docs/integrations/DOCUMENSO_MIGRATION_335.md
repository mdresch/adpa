# Migration 335: Document Signatures System

**Date**: 2025-01-XX  
**Status**: ✅ Migration Created - Ready to Run  
**Related Task**: Documenso Integration - PDF Signing

---

## 📋 Overview

Migration 335 creates the database schema for document signing functionality, enabling digital signatures on PDF documents within ADPA. This migration integrates with existing ADPA tables (`documents`, `users`, `approval_requests`) and provides a complete signature workflow system.

---

## 🗄️ Tables Created

### **1. `signature_fields`**
Defines signature fields/placeholders on PDF documents.

**Key Columns**:
- `document_id` → `documents.id` (FK)
- `field_name`, `field_label` - Field identification
- `page_number`, `x_position`, `y_position`, `width`, `height` - PDF positioning
- `field_type` - Type: signature, initial, date, text, checkbox, stamp
- `assigned_to_user_id` → `users.id` (FK, optional)
- `assigned_to_email` - For external signers
- `status` - pending, signed, skipped, cancelled
- `signature_data` (JSONB) - Signature image/data, certificate info
- `approval_request_id` → `approval_requests.id` (FK, optional)

**Use Case**: Define where signatures should be placed on a PDF document.

---

### **2. `document_signatures`**
Main table tracking overall signing status of documents.

**Key Columns**:
- `document_id` → `documents.id` (FK)
- `signature_request_id` - Groups multiple signatures for one request
- `status` - draft, pending, in_progress, completed, cancelled, expired, rejected
- `require_all_signatures` - Must all sign or can proceed with partial
- `signing_deadline` - Optional deadline
- `signed_pdf_path` - Path to signed PDF file
- `signed_pdf_hash` - SHA-256 hash for verification
- `signing_certificate_id` - Certificate used for signing
- `signing_transport` - local or gcloud-hsm
- `approval_request_id` → `approval_requests.id` (FK, optional)
- `initiated_by` → `users.id` (FK)

**Use Case**: Track the overall signing session/request for a document.

---

### **3. `signature_recipients`**
Tracks who needs to sign a document (internal users and external signers).

**Key Columns**:
- `document_signature_id` → `document_signatures.id` (FK)
- `user_id` → `users.id` (FK, optional - for internal users)
- `email` - Required (for external signers)
- `name` - Full name
- `role` - Signer, Witness, Approver, Reviewer
- `signing_order` - 0 = parallel, 1+ = sequential order
- `status` - pending, viewed, signed, declined, expired, cancelled
- `invitation_token` - Unique token for secure signing link
- `invitation_expires_at` - Token expiration
- `signed_at` - When signature was completed
- `signature_method` - handwritten, typed, uploaded, certificate, sms, email
- `signature_data` (JSONB) - Signature-specific data

**Use Case**: Manage signers (both internal and external) and track their signing status.

---

### **4. `signature_audit_logs`**
Audit trail for all signature-related actions.

**Key Columns**:
- `document_signature_id` → `document_signatures.id` (FK, optional)
- `signature_field_id` → `signature_fields.id` (FK, optional)
- `signature_recipient_id` → `signature_recipients.id` (FK, optional)
- `document_id` → `documents.id` (FK)
- `action` - Field name (e.g., "field_created", "signature_added")
- `action_type` - create, update, sign, view, decline, cancel, expire, verify
- `performed_by` → `users.id` (FK, optional)
- `performed_by_email` - For external actors
- `details` (JSONB) - Action-specific details
- `performed_at` - Timestamp
- `ip_address`, `user_agent` - Security tracking

**Use Case**: Compliance and traceability - track all signature-related actions.

---

## 🔗 Foreign Key Relationships

```
documents
  └── signature_fields (document_id)
  └── document_signatures (document_id)
  └── signature_audit_logs (document_id)

users
  └── signature_fields (assigned_to_user_id, created_by, signed_by)
  └── document_signatures (initiated_by)
  └── signature_recipients (user_id)
  └── signature_audit_logs (performed_by)

approval_requests
  └── signature_fields (approval_request_id)
  └── document_signatures (approval_request_id)

document_signatures
  └── signature_recipients (document_signature_id)
  └── signature_audit_logs (document_signature_id)

signature_fields
  └── signature_audit_logs (signature_field_id)

signature_recipients
  └── signature_audit_logs (signature_recipient_id)
```

---

## 📊 Indexes Created

### **Performance Indexes**:
- `idx_signature_fields_document_id` - Fast lookup by document
- `idx_signature_fields_status` - Filter pending fields
- `idx_signature_fields_assigned_to` - Find fields assigned to user
- `idx_document_signatures_document_id` - Fast lookup by document
- `idx_document_signatures_status` - Filter by status
- `idx_signature_recipients_document_signature_id` - Fast lookup
- `idx_signature_recipients_invitation_token` - Secure token lookup
- `idx_signature_audit_logs_performed_at` - Time-based queries

**Total**: 15+ indexes for optimal query performance

---

## 🚀 Running the Migration

### **Command**:
```bash
cd server
npm run migrate:335
```

### **Or Direct**:
```bash
npx tsx server/scripts/run-migration-335.ts
```

### **Verification**:
The migration script will:
1. ✅ Check if tables already exist
2. ✅ Execute migration in a transaction
3. ✅ Verify table creation
4. ✅ Verify index creation
5. ✅ Verify foreign key constraints
6. ✅ Display summary

---

## 📝 Usage Examples

### **1. Create Signature Fields on a Document**:
```sql
INSERT INTO signature_fields (
    document_id, field_name, field_label, page_number,
    x_position, y_position, width, height,
    assigned_to_email, field_type
) VALUES (
    'document-uuid', 'signer_name', 'Signer Name', 1,
    100.0, 700.0, 200.0, 50.0,
    'signer@example.com', 'signature'
);
```

### **2. Create Document Signature Request**:
```sql
INSERT INTO document_signatures (
    document_id, title, status, initiated_by,
    require_all_signatures, signing_deadline
) VALUES (
    'document-uuid', 'Project Charter Approval', 'pending',
    'user-uuid', TRUE, NOW() + INTERVAL '7 days'
);
```

### **3. Add Signature Recipients**:
```sql
INSERT INTO signature_recipients (
    document_signature_id, email, name, role,
    signing_order, invitation_token
) VALUES (
    'signature-request-uuid', 'signer@example.com', 'John Doe',
    'Signer', 1, 'unique-token-here'
);
```

### **4. Record Signature Audit**:
```sql
INSERT INTO signature_audit_logs (
    document_signature_id, signature_field_id, action,
    action_type, performed_by, details
) VALUES (
    'signature-request-uuid', 'field-uuid', 'signature_added',
    'sign', 'user-uuid', '{"signature_type": "handwritten"}'
);
```

---

## 🔒 Security Features

1. **Invitation Tokens**: Unique tokens for secure signing links
2. **IP Tracking**: Records IP address and user agent for audit
3. **Hash Verification**: SHA-256 hash of signed PDF for integrity
4. **Audit Trail**: Complete audit log of all signature actions
5. **Expiration**: Invitation tokens can expire
6. **Status Tracking**: Detailed status tracking for compliance

---

## 🔄 Integration Points

### **With Approval Workflows**:
- `signature_fields.approval_request_id` → Links to approval requests
- `document_signatures.approval_request_id` → Links to approval requests
- Enables signature requirements as part of approval workflows

### **With Documents**:
- All signature tables link to `documents.id`
- Signed PDFs stored via `signed_pdf_path`
- Original document preserved, signed version stored separately

### **With Users**:
- Internal signers linked via `user_id`
- External signers identified by `email`
- All actions tracked via `performed_by` / `performed_by_email`

---

## ✅ Migration Checklist

- [x] **Migration SQL File Created** (`335_document_signatures.sql`)
- [x] **Migration Script Created** (`run-migration-335.ts`)
- [x] **Package.json Script Added** (`migrate:335`)
- [x] **Foreign Keys Defined** (documents, users, approval_requests)
- [x] **Indexes Created** (15+ indexes for performance)
- [x] **Comments Added** (Table and column documentation)
- [x] **Transaction Wrapped** (BEGIN/COMMIT for safety)
- [x] **Verification Script** (Checks tables, indexes, FKs)

---

## 📋 Next Steps

1. ✅ **Migration Created** - Ready to run
2. 📋 **Run Migration** - Execute `npm run migrate:335`
3. 📋 **Create API Routes** - Express.js endpoints for signing
4. 📋 **Create Frontend Components** - Signature capture UI
5. 📋 **Test Workflow** - End-to-end signature testing

---

## 📚 Related Documentation

- `docs/integrations/DOCUMENSO_EXTRACTION_COMPLETE.md` - Signing library extraction
- `docs/integrations/DOCUMENSO_INTEGRATION_ANALYSIS.md` - Integration analysis
- `server/src/lib/documenso/` - Extracted signing library

---

**Status**: ✅ Migration 335 Ready - Run `npm run migrate:335` to create signature tables

