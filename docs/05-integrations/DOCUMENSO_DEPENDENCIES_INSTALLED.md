# Documenso Dependencies Installation - Complete ✅

**Date**: 2025-01-XX  
**Status**: ✅ All Dependencies Installed Successfully

---

## 📦 Installed Packages

All required dependencies for PDF signing integration have been installed in `server/`:

### **Core PDF Signing**
- ✅ `@documenso/pdf-sign@0.1.0`
  - **License**: AGPL-3.0
  - **Purpose**: Core PDF signing functionality (P12 certificates, private keys, Google Cloud)
  - **Size**: 61.7 kB unpacked

### **PDF Manipulation**
- ✅ `@cantoo/pdf-lib@2.5.3`
  - **Purpose**: PDF document manipulation library
  - **Used for**: Adding signature fields, updating PDFs, form handling

### **Pattern Matching**
- ✅ `ts-pattern@5.9.0`
  - **Purpose**: Pattern matching for TypeScript
  - **Used for**: Transport selection (local-cert vs google-cloud-hsm)

---

## ✅ Verification

```bash
cd server
npm list @documenso/pdf-sign @cantoo/pdf-lib ts-pattern --depth=0
```

**Output**:
```
adpa-backend@2.0.0 D:\source\repos\adpa\server
+-- @cantoo/pdf-lib@2.5.3
+-- @documenso/pdf-sign@0.1.0
`-- ts-pattern@5.9.0
```

**Status**: ✅ All packages installed correctly

---

## 📋 Next Steps

Now that dependencies are installed, we can proceed with:

1. **Extract Signing Package** (Next Step)
   - Copy `packages/signing/` from Documenso
   - Adapt to ADPA's architecture
   - Remove Next.js/tRPC dependencies

2. **Create Database Migration**
   - Add signature tables
   - Link to existing documents and users

3. **Create API Routes**
   - Express.js endpoints for signing
   - Integrate with approval workflows

4. **Create Frontend Components**
   - Signature capture UI
   - Document signing interface

---

## 🔍 Package Details

### `@documenso/pdf-sign`

**Main Export**: `signWithP12()`
```typescript
import { signWithP12 } from '@documenso/pdf-sign';

const signature = signWithP12({
  cert: Buffer,        // P12 certificate file
  content: Buffer,     // PDF content to sign
  password?: string    // Optional certificate password
});
```

**Usage**: Used in `packages/signing/transports/local-cert.ts`

### `@cantoo/pdf-lib`

**Main Exports**: PDF manipulation functions
```typescript
import { PDFDocument, PDFSignature, rectangle } from '@cantoo/pdf-lib';

// Load PDF
const doc = await PDFDocument.load(pdfBuffer);

// Add signature field
const form = doc.getForm();
const signatureField = form.createSignature('Signature1');
```

**Usage**: Used in `packages/signing/helpers/add-signing-placeholder.ts`

### `ts-pattern`

**Main Export**: Pattern matching
```typescript
import { match } from 'ts-pattern';

const result = await match(transport)
  .with('local', () => signWithLocalCert({ pdf }))
  .with('gcloud-hsm', () => signWithGoogleCloudHSM({ pdf }))
  .otherwise(() => {
    throw new Error(`Unsupported transport: ${transport}`);
  });
```

**Usage**: Used in `packages/signing/index.ts` for transport selection

---

## ⚠️ Notes

- **License**: `@documenso/pdf-sign` is AGPL-3.0 licensed
- **Vulnerabilities**: Some npm audit warnings (17 moderate) - review separately
- **Compatibility**: All packages are compatible with Node.js 18+ (ADPA's requirement)

---

**Status**: ✅ Ready for Package Extraction

