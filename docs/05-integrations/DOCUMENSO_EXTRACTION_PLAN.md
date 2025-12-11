# Documenso Extraction Plan - ADPA Integration

**Status**: 🚀 Ready to Extract  
**Date**: 2025-01-XX  
**Repository**: `server/documenso-integration/`  
**Branches**: `adpa-extraction-reference`, `adpa-integration` (current)

---

## 📦 Components Identified

### **1. Core Signing Package** ✅ Found
**Location**: `packages/signing/`

**Contents**:
- `index.ts` - Main signing function (`signPdf`)
- `helpers/add-signing-placeholder.ts` - Adds signature placeholder to PDF
- `helpers/update-signing-placeholder.ts` - Updates placeholder with byte range
- `transports/local-cert.ts` - Local certificate signing
- `transports/google-cloud-hsm.ts` - Google Cloud HSM signing
- `constants/byte-range.ts` - Byte range constants

**Dependencies**:
- `@documenso/pdf-sign` - Core PDF signing library (npm package)
- `@cantoo/pdf-lib` - PDF manipulation library
- `ts-pattern` - Pattern matching

### **2. PDF Utilities** ✅ Found
**Location**: `packages/lib/server-only/pdf/`

**Contents**:
- `normalize-signature-appearances.ts` - Normalizes signature appearances

### **3. Frontend Components** (To Explore)
**Location**: `apps/remix/app/(dashboard)/documents/`

**Expected**:
- Signature field placement UI
- Signature capture components (draw/type/upload)
- Document preview with signatures

---

## 🎯 Extraction Strategy

### **Phase 1: Extract Core Signing Library** (Day 1-2)

#### **Step 1.1: Copy Signing Package**

```bash
# Navigate to ADPA root
cd D:\source\repos\adpa

# Copy signing package
cp -r server/documenso-integration/packages/signing server/src/lib/documenso/signing

# Copy PDF utilities
mkdir -p server/src/lib/documenso/pdf
cp server/documenso-integration/packages/lib/server-only/pdf/normalize-signature-appearances.ts server/src/lib/documenso/pdf/
```

#### **Step 1.2: Install Dependencies**

The signing package requires:
- ✅ `@documenso/pdf-sign@0.1.0` - **AVAILABLE ON NPM** (AGPL-3.0 license)
- ✅ `@cantoo/pdf-lib` - Public npm package
- ✅ `ts-pattern` - Public npm package

**Status**: All dependencies are available! We can install `@documenso/pdf-sign` directly from npm.

**Installation**:
```bash
cd server
npm install @documenso/pdf-sign@0.1.0
npm install @cantoo/pdf-lib
npm install ts-pattern
```

#### **Step 1.3: Adapt to ADPA**

**Changes Needed**:
1. **Remove tRPC dependencies**: Replace `@documenso/lib/utils/env` with ADPA's env handling
2. **Remove Next.js dependencies**: Adapt to Express.js
3. **Simplify transports**: Start with local-cert only (remove Google Cloud HSM for now)
4. **Adapt certificate handling**: Use ADPA's configuration system

---

### **Phase 2: Database Schema** (Day 2)

Create migration for signature tables (already planned in `DOCUMENSO_QUICK_START.md`):
- `document_signatures`
- `document_signing_workflows`
- `document_signing_recipients`

---

### **Phase 3: Backend API** (Day 3-4)

Create Express.js routes:
- `POST /api/documents/:id/prepare-for-signing`
- `POST /api/documents/:id/signatures`
- `POST /api/documents/:id/signatures/:signatureId/sign`
- `GET /api/documents/:id/signing-status`

---

### **Phase 4: Frontend Components** (Day 5-7)

Extract and adapt React components:
- Signature field placement UI
- Signature capture (draw/type/upload)
- Signing workflow management

---

## 🔍 Next Steps

1. **Check `@documenso/pdf-sign` package**:
   - Is it public on npm?
   - Or is it internal to Documenso?
   - If internal, we need to extract its functionality

2. **Explore Frontend Components**:
   - Check `apps/remix/app/(dashboard)/documents/` for signing UI
   - Identify components to extract

3. **Start Extraction**:
   - Copy signing package
   - Adapt dependencies
   - Test basic PDF signing

---

## ✅ Verification Checklist

- [x] Repository cloned: `server/documenso-integration/`
- [x] Branches created: `adpa-extraction-reference`, `adpa-integration`
- [x] Signing package identified: `packages/signing/`
- [x] PDF utilities identified: `packages/lib/server-only/pdf/`
- [ ] `@documenso/pdf-sign` package availability checked
- [ ] Frontend components explored
- [ ] Extraction started

---

**Ready to proceed with extraction!**

