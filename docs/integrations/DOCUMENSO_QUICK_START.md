# Documenso Integration - Quick Start Guide

**Status**: 🚀 Ready to Clone & Integrate  
**Estimated Time**: 9-13 days for full integration

---

## 🎯 Quick Decision Matrix

| Question | Answer |
|----------|--------|
| **Can we clone it?** | ✅ Yes - AGPL-3.0 license allows cloning |
| **Is it compatible?** | ✅ 85% compatible - minor adaptations needed |
| **Can we integrate?** | ✅ Yes - extract PDF signing library and adapt |
| **Will it work with ADPA?** | ✅ Yes - integrates with existing approval workflows |

---

## 🚀 Step 1: Fork & Clone Documenso

### **1.1 Fork to Your Personal Repository**

1. Go to https://github.com/documenso/documenso
2. Click the **"Fork"** button in the top right
3. Select your personal GitHub account/organization
4. Wait for the fork to complete

**Why fork?**
- ✅ You own your copy of the code
- ✅ Can make modifications without affecting original
- ✅ Can sync updates from upstream Documenso
- ✅ Can create branches for ADPA-specific changes

### **1.2 Clone Your Fork**

```bash
# Navigate to ADPA project root
cd d:\source\repos\adpa

# Clone YOUR fork (replace YOUR_USERNAME with your GitHub username)
git clone https://github.com/YOUR_USERNAME/documenso.git documenso-integration

# Explore the structure
cd documenso-integration
ls -la

# Key directories to explore:
# - packages/pdf-sign/          # Core PDF signing library
# - apps/web/                   # Frontend signing UI
# - packages/prisma/            # Database schema
```

### **1.3 Create ADPA Integration Branch**

Since we're doing a one-time extraction (not tracking upstream), just create a branch for reference:

```bash
cd documenso-integration

# Create a branch for reference (optional)
git checkout -b adpa-extraction-reference

# Note: We're extracting specific components, not maintaining a fork
# No need for upstream tracking - this is a one-time integration
```

---

## 🔍 Step 2: Identify Key Components to Extract

**Approach**: One-time extraction - we'll copy only what we need, then adapt it to ADPA.

### **Core PDF Signing Library**
**Location**: `packages/pdf-sign/`

**What it does**:
- PDF signature embedding
- Signature field placement
- Signature validation
- Certificate management

**How to extract** (one-time copy):
```bash
# Navigate back to ADPA root
cd d:\source\repos\adpa

# Copy the PDF signing package (one-time extraction)
cp -r documenso-integration/packages/pdf-sign server/src/lib/documenso-pdf-sign

# Note: This is a one-time copy - no need to maintain link to original
# We'll adapt it to work with ADPA's architecture
```

### **Frontend Signing Components**
**Location**: `apps/web/app/(dashboard)/documents/`

**Key Components**:
- Signature field placement UI
- Signature capture (draw/type/upload)
- Signing workflow management
- Document preview with signatures

**How to adapt**:
- Extract React components
- Adapt from tRPC to Express.js API calls
- Integrate with ADPA's Radix UI components

### **Database Schema**
**Location**: `packages/prisma/schema.prisma`

**Key Tables**:
- `Document` - Document storage
- `DocumentSignature` - Signature records
- `Recipient` - Signing recipients
- `Field` - Signature field positions

**How to adapt**:
- Convert Prisma schema to PostgreSQL migrations
- Link to ADPA's existing `documents` table
- Link to ADPA's existing `users` table

---

## 📋 Step 3: Create Integration Branch

```bash
# Create a new branch for Documenso integration
git checkout -b feature/documenso-integration

# Create integration directory structure
mkdir -p server/src/lib/documenso
mkdir -p server/src/services/documenso
mkdir -p server/src/routes/documenso
mkdir -p components/documenso
```

---

## 🔧 Step 4: Extract PDF Signing Library

### **4.1 Copy Core Library**

```bash
# Copy PDF signing package
cp -r documenso-integration/packages/pdf-sign server/src/lib/documenso/pdf-sign

# Install dependencies (if needed)
cd server/src/lib/documenso/pdf-sign
npm install
```

### **4.2 Create Express.js Wrapper**

Create `server/src/services/documenso/pdfSigningService.ts`:

```typescript
/**
 * PDF Signing Service - Wrapper around Documenso PDF signing library
 * Adapts Documenso's PDF signing to work with ADPA's Express.js backend
 */

import { PDFDocument } from 'pdf-lib'
// Import Documenso's PDF signing utilities
// import { embedSignature, validateSignature } from '../lib/documenso/pdf-sign'

export class PDFSigningService {
  /**
   * Prepare document for signing
   * Adds signature fields to PDF
   */
  async prepareDocumentForSigning(
    documentId: string,
    signatureFields: Array<{
      page: number
      x: number
      y: number
      width: number
      height: number
      signerEmail: string
    }>
  ): Promise<Buffer> {
    // TODO: Implement using Documenso's PDF signing library
    // 1. Load PDF from ADPA's documents table
    // 2. Add signature fields using PDF-Lib
    // 3. Return modified PDF buffer
    throw new Error('Not implemented yet')
  }

  /**
   * Embed signature into PDF
   */
  async embedSignature(
    pdfBuffer: Buffer,
    signatureFieldId: string,
    signatureData: string | Buffer, // Base64 image or typed text
    signerInfo: {
      name: string
      email: string
      signedAt: Date
    }
  ): Promise<Buffer> {
    // TODO: Implement using Documenso's PDF signing library
    // 1. Load PDF
    // 2. Embed signature image/text at field position
    // 3. Add signature metadata
    // 4. Return signed PDF buffer
    throw new Error('Not implemented yet')
  }

  /**
   * Validate signature
   */
  async validateSignature(
    pdfBuffer: Buffer,
    signatureFieldId: string
  ): Promise<boolean> {
    // TODO: Implement signature validation
    throw new Error('Not implemented yet')
  }
}

export const pdfSigningService = new PDFSigningService()
```

---

## 🗄️ Step 5: Create Database Migration

Create `server/migrations/335_add_document_signing_tables.sql`:

```sql
-- Migration 335: Add document signing tables (Documenso integration)
-- Enables digital signatures for document approvals

-- Document signatures table
CREATE TABLE IF NOT EXISTS document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES users(id),
  signature_type VARCHAR(20) NOT NULL CHECK (signature_type IN ('draw', 'type', 'upload')),
  signature_data TEXT NOT NULL, -- Base64 encoded signature image or typed text
  signature_field_position JSONB NOT NULL, -- {x, y, page, width, height}
  signed_at TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  certificate_data JSONB, -- Optional: certificate info
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Document signing workflows
CREATE TABLE IF NOT EXISTS document_signing_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  workflow_type VARCHAR(20) DEFAULT 'sequential' CHECK (workflow_type IN ('sequential', 'parallel')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES users(id),
  approval_request_id UUID REFERENCES approval_requests(id), -- Link to ADPA's approval workflow
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Signing recipients
CREATE TABLE IF NOT EXISTS document_signing_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES document_signing_workflows(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  signer_id UUID REFERENCES users(id), -- If user exists in ADPA
  signing_order INTEGER, -- For sequential workflows
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'declined')),
  signature_id UUID REFERENCES document_signatures(id),
  signature_field_position JSONB, -- Where to place signature
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  signed_at TIMESTAMP,
  reminder_sent_count INTEGER DEFAULT 0,
  last_reminder_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_signatures_document_id ON document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_signer_id ON document_signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_document_signing_workflows_document_id ON document_signing_workflows(document_id);
CREATE INDEX IF NOT EXISTS idx_document_signing_workflows_approval_request_id ON document_signing_workflows(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_document_signing_recipients_workflow_id ON document_signing_recipients(workflow_id);
CREATE INDEX IF NOT EXISTS idx_document_signing_recipients_signer_id ON document_signing_recipients(signer_id);
CREATE INDEX IF NOT EXISTS idx_document_signing_recipients_status ON document_signing_recipients(status);

-- Comments
COMMENT ON TABLE document_signatures IS 'Stores digital signatures for documents. Integrated with Documenso PDF signing library.';
COMMENT ON TABLE document_signing_workflows IS 'Manages multi-party document signing workflows. Links to ADPA approval workflows.';
COMMENT ON TABLE document_signing_recipients IS 'Tracks individual signers in a signing workflow.';
```

---

## 🛣️ Step 6: Create API Routes

Create `server/src/routes/documensoSigning.ts`:

```typescript
/**
 * Document Signing API Routes (Documenso Integration)
 * Integrates digital signatures with ADPA's document and approval system
 */

import express from 'express'
import { authenticateToken } from '../middleware/auth'
import { pdfSigningService } from '../services/documenso/pdfSigningService'
import { pool } from '../database/connection'

const router = express.Router()

router.use(authenticateToken)

/**
 * POST /api/documents/:id/prepare-for-signing
 * Prepare a document for signing by adding signature fields
 */
router.post('/:id/prepare-for-signing', async (req, res) => {
  try {
    const { id: documentId } = req.params
    const { signatureFields } = req.body // Array of signature field positions
    
    // TODO: Implement
    // 1. Load document from database
    // 2. Generate PDF if needed (from Markdown)
    // 3. Add signature fields using pdfSigningService
    // 4. Store prepared PDF
    // 5. Create signing workflow
    
    res.json({ success: true, message: 'Document prepared for signing' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to prepare document for signing' })
  }
})

/**
 * POST /api/documents/:id/signatures
 * Create a new signature workflow for a document
 */
router.post('/:id/signatures', async (req, res) => {
  try {
    const { id: documentId } = req.params
    const { recipients, workflowType, approvalRequestId } = req.body
    
    // TODO: Implement
    // 1. Create signing workflow
    // 2. Add recipients
    // 3. Send email notifications
    // 4. Link to approval request if provided
    
    res.json({ success: true, workflowId: '...' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create signing workflow' })
  }
})

/**
 * POST /api/documents/:id/signatures/:signatureId/sign
 * Sign a document
 */
router.post('/:id/signatures/:signatureId/sign', async (req, res) => {
  try {
    const { id: documentId, signatureId } = req.params
    const { signatureData, signatureType } = req.body // Base64 image or text
    
    // TODO: Implement
    // 1. Load document PDF
    // 2. Embed signature using pdfSigningService
    // 3. Update signature record
    // 4. Check if all signatures complete
    // 5. Update workflow status
    // 6. Trigger approval workflow if linked
    
    res.json({ success: true, message: 'Document signed successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to sign document' })
  }
})

export default router
```

---

## 🎨 Step 7: Create Frontend Components

Create `components/documenso/SignatureFieldPlacer.tsx`:

```typescript
/**
 * Signature Field Placement Component
 * Allows users to place signature fields on PDF documents
 */

'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface SignatureField {
  id: string
  page: number
  x: number
  y: number
  width: number
  height: number
  signerEmail: string
}

export function SignatureFieldPlacer({ documentId }: { documentId: string }) {
  const [fields, setFields] = useState<SignatureField[]>([])
  const [selectedPage, setSelectedPage] = useState(1)

  // TODO: Implement signature field placement UI
  // - PDF preview
  // - Click to place signature fields
  // - Drag to resize fields
  // - Assign signers to fields

  return (
    <Card>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Place Signature Fields</h3>
        {/* PDF Preview */}
        <div className="border-2 border-dashed border-gray-300 p-8 mb-4">
          <p className="text-center text-gray-500">PDF Preview (Page {selectedPage})</p>
          {/* TODO: Render PDF using react-pdf */}
        </div>
        {/* Field List */}
        <div className="space-y-2">
          {fields.map(field => (
            <div key={field.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span>Field for {field.signerEmail}</span>
              <Button variant="outline" size="sm">Remove</Button>
            </div>
          ))}
        </div>
        <Button className="mt-4">Add Signature Field</Button>
      </div>
    </Card>
  )
}
```

---

## ✅ Step 8: Integration Checklist

- [ ] Clone Documenso repository
- [ ] Explore codebase structure
- [ ] Extract PDF signing library
- [ ] Create database migration
- [ ] Create Express.js API routes
- [ ] Create frontend components
- [ ] Integrate with approval workflows
- [ ] Test signature workflows
- [ ] Test PDF generation with signatures
- [ ] Test email notifications
- [ ] Document integration

---

## 📚 Next Steps

1. **Review**: Read `DOCUMENSO_INTEGRATION_ANALYSIS.md` for detailed analysis
2. **Clone**: Follow Step 1 above to clone Documenso
3. **Explore**: Explore the codebase to understand structure
4. **Extract**: Start extracting PDF signing library
5. **Integrate**: Follow phased approach in analysis document

---

**Ready to start?** Begin with Step 1: Clone Documenso repository!

