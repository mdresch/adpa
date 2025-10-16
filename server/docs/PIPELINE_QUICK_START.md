# 🚀 Pipeline Quick Start Guide

## Test the Full 6-Stage Pipeline in 5 Minutes

**Prerequisites**:
- ✅ Server running (`npm run dev`)
- ✅ Redis connected (Upstash)
- ✅ PostgreSQL connected (Neon)
- ✅ AI Gateway API key configured

---

## Step 1: Verify Server Health

```bash
curl http://localhost:5000/health
```

**Expected**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-15T17:30:00.000Z",
  "database": "connected",
  "redis": "connected"
}
```

---

## Step 2: Login and Get Token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@adpa.com",
    "password": "admin123"
  }'
```

**Expected**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "...", "email": "admin@adpa.com", "role": "admin" }
}
```

**Save the token** for next steps!

---

## Step 3: Get Available Templates

```bash
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:5000/api/document-templates
```

**Expected**:
```json
[
  {
    "id": "template-uuid-1",
    "name": "Project Charter (PMBOK)",
    "category": "Project Management",
    "framework": "PMBOK"
  },
  ...
]
```

**Copy a `templateId`** for the next step.

---

## Step 4: Get Available Projects

```bash
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:5000/api/projects
```

**Expected**:
```json
[
  {
    "id": "project-uuid-1",
    "name": "Enterprise CRM Implementation",
    "description": "...",
    "status": "active"
  },
  ...
]
```

**Copy a `projectId`** for the next step.

---

## Step 5: Start Pipeline Processing 🎯

```bash
curl -X POST http://localhost:5000/api/pipeline/start \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "<template-uuid-from-step-3>",
    "projectId": "<project-uuid-from-step-4>",
    "userId": "<your-user-id>",
    "contextBundle": {},
    "processingConfig": {
      "enable_ai_enhancement": true,
      "enable_methodology_alignment": true,
      "quality_thresholds": {
        "overall_quality": 0.7
      }
    },
    "output_config": {
      "primary_format": "markdown",
      "secondary_formats": ["pdf", "docx"],
      "page_settings": {
        "format": "A4",
        "orientation": "portrait"
      }
    }
  }'
```

**Expected**:
```json
{
  "jobId": "job_1729012345_abc123",
  "requestId": "req_1729012345_def456",
  "status": "running",
  "progress": 0,
  "currentStage": "context_gathering",
  "createdAt": "2025-10-15T17:30:00.000Z"
}
```

**Copy the `jobId`** for tracking!

---

## Step 6: Monitor Job Progress

```bash
# Check every 5 seconds
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:5000/api/pipeline/job/<JOB_ID>/status
```

**Expected Progress**:

```json
// After 5 seconds
{
  "jobId": "job_...",
  "status": "running",
  "progress": 33,
  "currentStage": "ai_generation",
  "stagesCompleted": ["context_gathering", "template_processing"]
}

// After 15 seconds
{
  "jobId": "job_...",
  "status": "running",
  "progress": 66,
  "currentStage": "quality_assurance",
  "stagesCompleted": ["context_gathering", "template_processing", "ai_generation", "context_injection"]
}

// After 25 seconds
{
  "jobId": "job_...",
  "status": "completed",
  "progress": 100,
  "stagesCompleted": [
    "context_gathering",
    "template_processing",
    "ai_generation",
    "context_injection",
    "quality_assurance",
    "output_formatting"
  ],
  "completedAt": "2025-10-15T17:30:25.000Z"
}
```

---

## Step 7: View Detailed Logs

```bash
# Get all stage logs for the job
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:5000/api/pipeline/job/<JOB_ID>/logs
```

**Expected**:
```json
{
  "jobId": "job_...",
  "logs": [
    {
      "stageId": "context_gathering",
      "status": "completed",
      "progress": 100,
      "startedAt": "2025-10-15T17:30:00.000Z",
      "completedAt": "2025-10-15T17:30:03.000Z",
      "duration": 3000,
      "metadata": {
        "contexts_gathered": 5,
        "quality_score": 0.92
      }
    },
    {
      "stageId": "template_processing",
      "status": "completed",
      ...
    },
    ...
  ]
}
```

---

## Step 8: Get the Generated Document

```bash
# Get job export
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:5000/api/pipeline/job/<JOB_ID>/export?format=json \
  > pipeline-result.json
```

**The result includes**:
- Generated markdown content
- PDF buffer (base64)
- DOCX buffer (base64)
- Quality scores for each stage
- Processing metrics
- Stakeholder analysis
- Project context used

---

## Step 9: View Pipeline Metrics

```bash
# Get overall pipeline performance
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:5000/api/pipeline/metrics
```

**Expected**:
```json
{
  "jobStats": {
    "completed": { "count": 5, "avgDuration": 23.4 },
    "failed": { "count": 0 },
    "running": { "count": 1 }
  },
  "stageStats": {
    "context_gathering": { "count": 5, "avgQuality": 0.91, "avgDuration": 3.2 },
    "template_processing": { "count": 5, "avgQuality": 0.94, "avgDuration": 2.1 },
    "ai_generation": { "count": 5, "avgQuality": 0.87, "avgDuration": 15.3 },
    ...
  },
  "qualityTrends": [
    { "hour": "2025-10-15T17:00:00Z", "avgQuality": 0.89 },
    ...
  ]
}
```

---

## 🐛 Troubleshooting

### "AI Gateway API key not configured"

**Solution**: Go to Settings → AI Gateway → Enter your Vercel AI Gateway key

```bash
curl -X POST http://localhost:5000/api/settings/ai-gateway \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "vck_38EtPhxVHuISczLXTu59Tgq5F2uAlRJsu2rLYG0VQaLq6Js6F700wtAy",
    "enabled": true
  }'
```

### "Template not found"

**Solution**: Create a template first or use the template creation endpoint

```bash
curl -X POST http://localhost:5000/api/document-templates \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Template",
    "category": "Testing",
    "framework": "PMBOK",
    "content": "# {{project_name}} Project Charter\n\n## Executive Summary\n{{ai:executive_summary}}",
    "context_injection_rules": {},
    "prompt_buildup_instructions": {},
    "system_prompt": "You are a professional business analyst."
  }'
```

### "Project not found"

**Solution**: Create a project first

```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "description": "Testing the pipeline",
    "status": "active"
  }'
```

### Job Status Shows "failed"

**Check the error**:
```bash
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:5000/api/pipeline/job/<JOB_ID>/logs
```

**Common issues**:
- AI Gateway API key missing/invalid
- Template has no AI prompts (`{{ai:...}}`)
- Network timeout to AI provider
- Database connection lost

---

## ✅ Success Indicators

You'll know it's working when you see:

### In Server Logs:
```
info: Starting document processing {"requestId":"req_...", "templateId":"..."}
info: Starting context injection stage
info: Enriching context with project data {"project_id":"..."}
info: Enriching context with stakeholder data {"project_id":"..."}
info: Injection opportunities identified {"opportunities":5, "project_data_available":true, "stakeholder_data_available":true}
info: Document processing pipeline completed {"requestId":"...", "stagesCompleted":6}
```

### In API Response:
```json
{
  "status": "completed",
  "progress": 100,
  "stagesCompleted": [
    "context_gathering",
    "template_processing", 
    "ai_generation",
    "context_injection",
    "quality_assurance",
    "output_formatting"
  ],
  "quality_report": {
    "overall_score": 0.89
  }
}
```

---

## 🎉 You're Ready!

The full pipeline is implemented and ready to generate documents. Just:

1. Configure AI Gateway API key (if not done)
2. Run the test command above
3. Watch the magic happen! ✨

**Estimated time for first document**: ~20-30 seconds  
**Output formats**: Markdown, PDF, DOCX  
**Quality scoring**: Multi-dimensional quality assessment  
**Stakeholder targeting**: Automatic personalization

---

**Happy Document Generation!** 🚀

For issues or questions, check:
- `server/logs/combined.log` - Detailed server logs
- `server/logs/error.log` - Error logs only
- `server/docs/CORE_PIPELINE_COMPLETION_SUMMARY.md` - Full technical details

