# 🚀 Quick Start Guide - Client Onboarding Assessment

**Complete these steps to integrate and test the new Client Onboarding Assessment system.**

---

## ✅ Pre-Integration Checklist

### Required Environment
- [x] Node.js 18+ installed
- [x] PostgreSQL/Supabase accessible
- [x] Redis running (locally or cloud)
- [x] ADPA backend server working

### Required API Keys (Optional but Recommended)
- [ ] Google AI API Key (for AI document type detection)
- [ ] Adobe PDF Services credentials (for premium PDF conversion)

---

## 📝 Integration Steps (15 minutes)

### Step 1: Run Database Migration (2 minutes)

```bash
# From project root
psql $DATABASE_URL -f server/migrations/058_client_onboarding_assessment.sql

# OR using Supabase CLI
supabase db push server/migrations/058_client_onboarding_assessment.sql
```

**Expected Output:**
```
CREATE TABLE
CREATE TABLE
CREATE TABLE
ALTER TABLE
INSERT 0 5
✅ Migration completed successfully
```

**Verify:**
```sql
-- Check tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('upload_batches', 'portfolio_assessments', 'industry_benchmarks');

-- Should return 3 rows
```

---

### Step 2: Install Missing Dependencies (1 minute)

```bash
cd server
npm install pdf-parse adm-zip
```

**Optional (for premium PDF conversion):**
```bash
npm install @adobe/pdfservices-node-sdk
```

---

### Step 3: Update Environment Variables (2 minutes)

Add to `server/.env`:

```bash
# Document Upload Configuration
UPLOAD_WORKER_CONCURRENCY=5
UPLOAD_MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_MAX_FILES=100

# AI Document Type Detection (Recommended)
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Adobe PDF Services (Optional - Premium)
ADOBE_CLIENT_ID=your_adobe_client_id
ADOBE_CLIENT_SECRET=your_adobe_client_secret
```

**Fallback:** System works without API keys but with reduced functionality:
- No Google AI key → Uses keyword-based document type detection
- No Adobe credentials → Uses pdf-parse library

---

### Step 4: Register Routes in Server (3 minutes)

Edit `server/src/server.ts`:

**Add imports (near top of file):**
```typescript
import documentUploadRoutes from './routes/documentUploadRoutes';
import portfolioAssessmentRoutes from './routes/portfolioAssessmentRoutes';
```

**Register routes (after existing routes, before error handlers):**
```typescript
// Client Onboarding Assessment Routes
app.use('/api/onboarding', documentUploadRoutes);
app.use('/api/onboarding', portfolioAssessmentRoutes);

console.log('✅ Client Onboarding Assessment routes registered');
```

---

### Step 5: Start Services (2 minutes)

**Terminal 1: Main Server**
```bash
cd server
npm run dev
```

**Terminal 2: Worker Process**
```bash
cd server
npx tsx watch src/jobs/documentConversionJob.ts
```

**Expected Output (Worker):**
```
Starting document conversion worker
Worker: document-conversion-worker-12345
Concurrency: 5
✓ Connected to Redis
✓ Connected to PostgreSQL
Queue: document-upload ready
```

---

### Step 6: Verify Integration (5 minutes)

#### Test 1: Health Check
```bash
curl http://localhost:5000/health
```

**Expected:** `{ "status": "healthy", "services": { "database": "up", "redis": "up" } }`

#### Test 2: Check Benchmarks
```bash
curl -X GET http://localhost:5000/api/onboarding/benchmarks/industries \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "industries": [
      { "name": "IT", "benchmark_count": 3, "avg_score": 82.5 },
      { "name": "Healthcare", "benchmark_count": 2, "avg_score": 78.0 },
      { "name": "Finance", "benchmark_count": 2, "avg_score": 80.0 },
      { "name": "Manufacturing", "benchmark_count": 2, "avg_score": 75.0 }
    ]
  }
}
```

#### Test 3: Upload Test Documents

**Create a test project first** (if you don't have one):
```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Client Onboarding", "description": "Test project for onboarding assessment"}'
```

**Upload documents:**
```bash
curl -X POST http://localhost:5000/api/onboarding/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "projectId=YOUR_PROJECT_ID" \
  -F "industryVertical=IT" \
  -F "files=@path/to/document1.pdf" \
  -F "files=@path/to/document2.docx"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "batch_id": "uuid-here",
    "total_files": 2,
    "status": "processing",
    "created_at": "2025-11-03T..."
  }
}
```

#### Test 4: Check Upload Progress

```bash
curl -X GET http://localhost:5000/api/onboarding/upload/BATCH_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected (while processing):**
```json
{
  "success": true,
  "data": {
    "batchId": "uuid",
    "totalFiles": 2,
    "processedFiles": 1,
    "successfulFiles": 1,
    "failedFiles": 0,
    "status": "processing",
    "files": [
      {
        "filename": "document1.pdf",
        "status": "completed",
        "documentId": "uuid",
        "detectedType": "Project Charter",
        "qualityScore": 85.5
      },
      {
        "filename": "document2.docx",
        "status": "processing",
        "progress": 70
      }
    ]
  }
}
```

#### Test 5: Generate Assessment (after upload completes)

```bash
curl -X GET "http://localhost:5000/api/onboarding/assessment/YOUR_PROJECT_ID?industry_vertical=IT" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "portfolio_summary": {
      "total_documents": 2,
      "avg_quality_score": 78.5,
      "avg_grade": "C+",
      "maturity_level": 3,
      "maturity_label": "Defined",
      "industry_benchmark": 82.5,
      "gap_percentage": -4.0
    },
    "breakdown": {
      "by_framework": { "PMBOK 7": { "avg_score": 80, "count": 1 } },
      "by_document_type": { "Project Charter": { "avg_score": 85, "count": 1 } },
      "by_quality_grade": { "B": 1, "C": 1 },
      "quality_distribution": { "80-89": 1, "70-79": 1 }
    },
    "gap_analysis": {
      "critical_gaps": [],
      "high_priority_gaps": [],
      "medium_priority_gaps": [...],
      "improvement_opportunities": [...]
    },
    "top_documents": [...],
    "roi_calculation": {
      "estimated_hours_saved": 14,
      "estimated_cost_savings": 1050,
      "potential_improvement_value": 120,
      "payback_period_months": 10
    }
  },
  "cached": false,
  "generated_at": "2025-11-03T..."
}
```

---

## ✅ Success Indicators

After completing all steps, you should see:

### Database
- [x] 3 new tables created (`upload_batches`, `portfolio_assessments`, `industry_benchmarks`)
- [x] 5 industry benchmarks seeded
- [x] `documents` table has new columns

### Services
- [x] Main server running on port 5000
- [x] Worker process running and connected to Redis
- [x] No errors in console logs

### API Endpoints
- [x] All 9 endpoints responding
- [x] File upload working
- [x] Document conversion succeeding
- [x] Quality audits running
- [x] Assessments generating

### Real-time Features
- [x] WebSocket events firing
- [x] Progress updates in real-time
- [x] Bull queue processing jobs

---

## 🐛 Troubleshooting

### Issue: Migration fails

**Solution:**
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check if tables already exist
psql $DATABASE_URL -c "\dt upload_batches"

# If exists, drop and re-run (CAUTION: Development only)
psql $DATABASE_URL -c "DROP TABLE IF EXISTS upload_batches CASCADE;"
```

---

### Issue: Worker not starting

**Check:**
```bash
# Redis connection
redis-cli ping  # Should return PONG

# PostgreSQL connection
psql $DATABASE_URL -c "SELECT 1;"
```

**Solution:**
```bash
# Restart Redis
docker restart redis
# OR
brew services restart redis  # macOS

# Check worker logs
tail -f server/logs/combined.log
```

---

### Issue: Files not converting

**Check Worker Logs:**
```bash
tail -f server/logs/combined.log | grep "document-conversion"
```

**Check Queue Status:**
```bash
redis-cli
> KEYS bull:document-upload:*
> LLEN bull:document-upload:wait
> LLEN bull:document-upload:failed
```

**Common Causes:**
1. Worker not running
2. Redis connection issue
3. Unsupported file format
4. File too large (>10MB)

**Solution:**
```bash
# Restart worker
npm run worker:dev

# Check failed jobs
redis-cli LRANGE bull:document-upload:failed 0 -1
```

---

### Issue: AI detection not working

**Symptoms:**
- All documents detected as "Unknown Document"
- Low confidence scores

**Solution:**
1. Add `GOOGLE_AI_API_KEY` to `.env`
2. Restart server
3. System will fall back to keyword detection if no key

---

### Issue: Assessment returns "No audit data"

**Cause:** Documents haven't been audited yet

**Solution:**
1. Wait for upload to complete
2. Verify quality audits ran:
```sql
SELECT COUNT(*) FROM quality_audits 
WHERE document_id IN (
  SELECT id FROM documents WHERE project_id = 'YOUR_PROJECT_ID'
);
```
3. Manually trigger audit if needed (check `qualityAuditService`)

---

## 📊 Monitoring

### Check System Health

**Database:**
```sql
-- Check upload batches
SELECT id, total_files, processed_files, status, created_at
FROM upload_batches
ORDER BY created_at DESC
LIMIT 5;

-- Check assessments
SELECT id, project_id, total_documents, maturity_level, assessment_date
FROM portfolio_assessments
ORDER BY assessment_date DESC
LIMIT 5;

-- Check uploaded documents
SELECT d.id, d.title, d.detected_type, qa.overall_score
FROM documents d
LEFT JOIN quality_audits qa ON qa.document_id = d.id
WHERE d.source = 'uploaded'
ORDER BY d.created_at DESC
LIMIT 10;
```

**Redis Queue:**
```bash
redis-cli
> LLEN bull:document-upload:wait     # Jobs waiting
> LLEN bull:document-upload:active   # Jobs processing
> LLEN bull:document-upload:completed  # Jobs done
> LLEN bull:document-upload:failed   # Jobs failed
```

**Server Logs:**
```bash
# Real-time logs
tail -f server/logs/combined.log

# Error logs only
tail -f server/logs/error.log

# Search for specific errors
grep "ERROR" server/logs/combined.log
```

---

## 🎯 Next Steps

After successful integration:

1. **Test with real documents** - Upload 10-50 actual project documents
2. **Review assessment results** - Validate maturity calculations
3. **Check industry benchmarks** - Compare against seeded data
4. **Test error scenarios** - Upload invalid files, cancel batches
5. **Monitor performance** - Check processing times, queue lengths

---

## 📚 Additional Resources

**Detailed Documentation:**
- `IMPLEMENTATION_SUMMARY_CLIENT_ONBOARDING.md` - Complete implementation details
- `server/ONBOARDING_INTEGRATION.md` - Backend integration guide
- `AGENT_1_BRIEFING_CLIENT_ONBOARDING.md` - Full project briefing

**Code References:**
- Document Conversion: `server/src/services/documentConversionService.ts`
- Upload Service: `server/src/services/documentUploadService.ts`
- Assessment Service: `server/src/services/portfolioAssessmentService.ts`

---

## ✅ Completion Checklist

### Integration Complete When:
- [ ] Database migration successful
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Routes registered in server
- [ ] Main server running
- [ ] Worker process running
- [ ] Health check passes
- [ ] Upload endpoint works
- [ ] Documents convert successfully
- [ ] Quality audits run automatically
- [ ] Assessment generates correctly

### Ready for Frontend Development When:
- [ ] All backend endpoints tested
- [ ] Upload flow working end-to-end
- [ ] Assessment data structure validated
- [ ] WebSocket events confirmed
- [ ] Performance acceptable (< 30s per file)

---

**Estimated Time to Complete:** 15-20 minutes  
**Difficulty:** Medium  
**Prerequisites:** ADPA backend already running

**Status:** Ready for integration! 🚀

---

*Last Updated: November 3, 2025*  
*Quick Start Guide - Client Onboarding Assessment*

