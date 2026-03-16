# Client Onboarding Assessment - Backend Integration Guide

## Overview

This guide explains how to integrate the newly created Client Onboarding Assessment system into the ADPA backend server.

## ✅ What's Been Built (Phase 1 & Phase 2 - Backend)

### Database Schema ✅
- **File**: `migrations/058_client_onboarding_assessment.sql`
- **Tables Created**:
  - `upload_batches` - Track bulk document uploads
  - `portfolio_assessments` - Store maturity assessments
  - `industry_benchmarks` - Industry comparison data (seeded with 5 industries)
  - Updated `documents` table with 8 new columns

### Services ✅
1. **Document Conversion Service** (`services/documentConversionService.ts`)
   - Converts PDF, DOCX, TXT, HTML, RTF → Markdown
   - Support for Adobe PDF Services (premium) and pdf-parse (fallback)
   - Quality validation

2. **Document Upload Service** (`services/documentUploadService.ts`)
   - Bulk file upload handling
   - Bull queue integration for parallel processing
   - WebSocket progress tracking
   - AI document type detection (Google Gemini + keyword fallback)
   - Automatic quality audit triggering

3. **Portfolio Assessment Service** (`services/portfolioAssessmentService.ts`)
   - Aggregate quality metrics across project documents
   - 5-level maturity calculation (Ad-hoc → Optimized)
   - Gap analysis with priority ranking
   - Industry benchmark comparison
   - ROI calculation

### API Routes ✅
1. **Document Upload Routes** (`routes/documentUploadRoutes.ts`)
   - `POST /api/onboarding/upload` - Upload bulk documents
   - `GET /api/onboarding/upload/:batchId` - Get upload status
   - `GET /api/onboarding/documents/:projectId` - List uploaded docs
   - `DELETE /api/onboarding/upload/:batchId` - Cancel upload

2. **Portfolio Assessment Routes** (`routes/portfolioAssessmentRoutes.ts`)
   - `GET /api/onboarding/assessment/:projectId` - Get portfolio assessment
   - `GET /api/onboarding/gaps/:projectId` - Get gap analysis
   - `GET /api/onboarding/benchmarks/:industry/:type?` - Get industry benchmarks
   - `GET /api/onboarding/benchmarks/industries` - List available industries
   - `GET /api/onboarding/assessment/:projectId/history` - Assessment history

### Bull Queue Workers ✅
- **File**: `jobs/documentConversionJob.ts`
- **Purpose**: Process uploaded documents in parallel
- **Concurrency**: 5 workers (configurable via `UPLOAD_WORKER_CONCURRENCY`)
- **Features**: Auto-retry, error handling, graceful shutdown

---

## 🔧 Integration Steps

### Step 1: Run Database Migration

```bash
# Connect to your Supabase/PostgreSQL database
psql $DATABASE_URL -f server/migrations/058_client_onboarding_assessment.sql
```

**Expected Output:**
```
CREATE TABLE (upload_batches)
CREATE TABLE (portfolio_assessments)
CREATE TABLE (industry_benchmarks)
ALTER TABLE (documents)
INSERT 5 (industry benchmarks seeded)
✅ Migration completed successfully
```

### Step 2: Install Required Dependencies

Some dependencies may be missing. Add to `server/package.json`:

```bash
cd server
npm install pdf-parse adm-zip rtf-parser
```

**Already installed:**
- mammoth (DOCX conversion)
- turndown (HTML → Markdown)
- bull (job queues)
- multer (file uploads)
- @adobe/pdfservices-node-sdk (optional, for premium PDF conversion)

### Step 3: Register Routes in Main Server

Edit `server/src/server.ts` to add the new routes:

```typescript
// Add imports at top
import documentUploadRoutes from './routes/documentUploadRoutes';
import portfolioAssessmentRoutes from './routes/portfolioAssessmentRoutes';

// Register routes (add after existing routes)
app.use('/api/onboarding', documentUploadRoutes);
app.use('/api/onboarding', portfolioAssessmentRoutes);
```

### Step 4: Start Bull Queue Worker

You need to run the Bull queue worker separately (or in same process for development).

**Option A: Separate Worker Process (Production)**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "worker": "node dist/jobs/documentConversionJob.js",
    "worker:dev": "tsx watch src/jobs/documentConversionJob.ts"
  }
}
```

Then run:

```bash
# Development
npm run worker:dev

# Production
npm run build
npm run worker
```

**Option B: Same Process (Development)**

Add to `server/src/server.ts`:

```typescript
// Import worker to start it
if (process.env.NODE_ENV === 'development') {
  import('./jobs/documentConversionJob');
}
```

### Step 5: Configure Environment Variables

Add to `server/.env`:

```bash
# Document Upload Configuration
UPLOAD_WORKER_CONCURRENCY=5
UPLOAD_MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_MAX_FILES=100

# AI Provider for Document Type Detection
GOOGLE_AI_API_KEY=your_google_ai_key  # Required for AI detection
# Fallback: Keyword-based detection if not provided

# Adobe PDF Services (Optional - Premium)
ADOBE_CLIENT_ID=your_adobe_client_id
ADOBE_CLIENT_SECRET=your_adobe_client_secret
# Fallback: pdf-parse library if not provided
```

### Step 6: Test the Integration

**Test 1: Health Check**

```bash
curl http://localhost:5000/health
```

**Test 2: Upload Documents**

```bash
# Create a test project first, then upload files
curl -X POST http://localhost:5000/api/onboarding/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "projectId=YOUR_PROJECT_ID" \
  -F "industryVertical=IT" \
  -F "files=@test-document.pdf" \
  -F "files=@project-charter.docx"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "batch_id": "uuid",
    "total_files": 2,
    "status": "processing",
    "created_at": "2025-11-03T..."
  }
}
```

**Test 3: Check Upload Status**

```bash
curl -X GET http://localhost:5000/api/onboarding/upload/BATCH_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Test 4: Get Portfolio Assessment**

```bash
# Wait for files to be processed, then generate assessment
curl -X GET "http://localhost:5000/api/onboarding/assessment/PROJECT_ID?industry_vertical=IT" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "portfolio_summary": {
      "total_documents": 2,
      "avg_quality_score": 72.5,
      "maturity_level": 3,
      "maturity_label": "Defined",
      "industry_benchmark": 82.5,
      "gap_percentage": -10
    },
    "breakdown": { ... },
    "gap_analysis": { ... },
    "top_documents": [ ... ],
    "roi_calculation": { ... }
  }
}
```

---

## 📊 Database Queries for Monitoring

### Check Upload Batches

```sql
SELECT 
  id, project_id, total_files, processed_files, 
  successful_files, failed_files, status, created_at
FROM upload_batches
ORDER BY created_at DESC
LIMIT 10;
```

### Check Assessments

```sql
SELECT 
  id, project_id, total_documents, avg_quality_score,
  maturity_level, maturity_label, assessment_date
FROM portfolio_assessments
ORDER BY assessment_date DESC
LIMIT 10;
```

### Check Uploaded Documents

```sql
SELECT 
  d.id, d.title, d.original_filename, d.detected_type,
  d.detection_confidence, qa.overall_score, qa.grade
FROM documents d
LEFT JOIN quality_audits qa ON qa.document_id = d.id
WHERE d.source = 'uploaded'
ORDER BY d.created_at DESC
LIMIT 20;
```

### Check Queue Status (Redis CLI)

```bash
redis-cli
> LLEN bull:document-upload:wait
> LLEN bull:document-upload:active
> LLEN bull:document-upload:completed
> LLEN bull:document-upload:failed
```

---

## 🐛 Troubleshooting

### Issue: Files not converting

**Check:**
1. Worker process running? `ps aux | grep documentConversionJob`
2. Redis connection working? `redis-cli ping`
3. Check worker logs: `server/logs/combined.log`

**Solution:**
```bash
# Restart worker
npm run worker:dev

# Check Redis
redis-cli
> KEYS bull:document-upload:*
```

### Issue: AI detection not working

**Check:**
1. `GOOGLE_AI_API_KEY` environment variable set?
2. Check logs for "AI document type detection failed"

**Solution:**
- If no API key, system will use keyword-based fallback (lower confidence)
- Add Google AI API key to enable AI detection

### Issue: Quality audits not running

**Check:**
1. Quality audit service available?
2. Check if `qualityAuditService.auditDocument()` is being called

**Solution:**
- Ensure `qualityAuditService` is properly imported in `documentUploadService.ts`
- Verify quality audit is enabled for project

### Issue: WebSocket progress not updating

**Check:**
1. Socket.io initialized in `server.ts`?
2. Client connected to WebSocket?

**Solution:**
```typescript
// In server.ts, ensure Socket.io is exported
export const io = socketIo(server);

// Client should listen to these events:
socket.on('upload:batch:progress', (data) => { ... });
socket.on('upload:file:progress', (data) => { ... });
```

---

## 🚀 Next Steps

### Phase 3: Frontend UI (Week 5-6)

**To be built:**
1. Bulk upload component with drag & drop
2. Assessment dashboard
3. Gap analysis table
4. Improvement planner

**Files to create:**
- `app/onboarding/upload/page.tsx`
- `app/onboarding/assessment/[projectId]/page.tsx`
- `components/onboarding/BulkUploader.tsx`
- `components/onboarding/AssessmentDashboard.tsx`

### Phase 4: Polish & Production (Week 7-8)

1. Performance optimization
2. Error handling improvements
3. Security audit
4. Beta client testing

---

## 📝 API Reference Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/onboarding/upload` | POST | Upload bulk documents |
| `/api/onboarding/upload/:batchId` | GET | Get upload status |
| `/api/onboarding/documents/:projectId` | GET | List uploaded docs |
| `/api/onboarding/upload/:batchId` | DELETE | Cancel upload |
| `/api/onboarding/assessment/:projectId` | GET | Get assessment |
| `/api/onboarding/gaps/:projectId` | GET | Get gap analysis |
| `/api/onboarding/benchmarks/:industry` | GET | Get benchmarks |
| `/api/onboarding/benchmarks/industries` | GET | List industries |
| `/api/onboarding/assessment/:projectId/history` | GET | Assessment history |

---

## ✅ Success Metrics

**Phase 1 Complete When:**
- ✅ 50 files uploaded successfully
- ✅ 45+ files converted to Markdown (>90% success rate)
- ✅ Document types detected with >85% confidence
- ✅ Quality audits completed for all files
- ✅ Average processing time < 30 seconds per file

**Phase 2 Complete When:**
- ✅ Portfolio assessment generated
- ✅ Maturity level calculated correctly
- ✅ Top 5 gaps identified
- ✅ Industry benchmarks loaded (5 verticals seeded)
- ✅ Assessment API returns valid data

---

## 📞 Support

For questions or issues:
1. Check logs: `server/logs/combined.log`
2. Review briefing: `AGENT_1_BRIEFING_CLIENT_ONBOARDING.md`
3. Test with Postman/Thunder Client

**Status:** Backend implementation for Phase 1 & 2 complete! ✅
**Next:** Frontend UI (Phase 3)

