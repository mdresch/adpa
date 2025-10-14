# 📊 Analytics Tracking Implementation Guide

## Overview

This guide explains how to implement real-time analytics data collection in the ADPA application. Once implemented, all user actions, AI usage, API requests, and system metrics will be automatically tracked and stored in the database for future analytics.

---

## 🗄️ Database Setup

### 1. Run the Migration

```bash
# From the server directory
cd server

# Apply the analytics tables migration
psql $DATABASE_URL -f migrations/007_analytics_tables.sql
```

This creates:
- ✅ `ai_usage_logs` - Tracks every AI API call
- ✅ `api_request_logs` - Tracks all API requests
- ✅ `user_activity_logs` - Tracks user actions
- ✅ `document_analytics` - Document engagement metrics
- ✅ `system_metrics` - System health metrics
- ✅ `job_execution_logs` - Background job tracking
- ✅ `daily_statistics` - Pre-aggregated daily stats
- ✅ Materialized views for fast queries
- ✅ Helper functions for aggregation and cleanup

---

## 🔧 Backend Integration

### 2. Enable Analytics Middleware

**File:** `server/src/index.ts` (or `server.ts`)

```typescript
import { analyticsMiddleware } from './middleware/analyticsMiddleware';

// Add AFTER auth middleware, BEFORE routes
app.use(analyticsMiddleware);

// Your routes here...
app.use('/api', routes);
```

This automatically tracks **ALL API requests** including:
- HTTP method, path, status code
- Response time
- User ID (if authenticated)
- Request/response sizes
- IP address, user agent

---

## 📝 Tracking User Actions

### 3. Track Specific Activities

**Import the tracking helper:**

```typescript
import { trackActivity } from '../middleware/analyticsMiddleware';
```

**Track user login:**

```typescript
// In your login route
app.post('/api/auth/login', async (req, res) => {
  // ... authentication logic ...
  
  if (loginSuccessful) {
    trackActivity.login(user.id, sessionId);
  }
  
  res.json({ user, token });
});
```

**Track document views:**

```typescript
// In document viewer route
app.get('/api/documents/:id', async (req, res) => {
  const document = await getDocument(req.params.id);
  
  // Track the view
  trackActivity.viewDocument(
    req.user.id,
    document.id,
    document.project_id,
    30 // optional: estimated read time in seconds
  );
  
  res.json(document);
});
```

**Track document edits:**

```typescript
// In document update route
app.put('/api/documents/:id', async (req, res) => {
  const updated = await updateDocument(req.params.id, req.body);
  
  // Track the edit
  trackActivity.editDocument(
    req.user.id,
    updated.id,
    updated.project_id
  );
  
  res.json(updated);
});
```

**Track document exports:**

```typescript
// In export route
app.post('/api/documents/:id/export', async (req, res) => {
  const { format } = req.body; // 'pdf' or 'docx'
  
  trackActivity.exportDocument(
    req.user.id,
    req.params.id,
    document.project_id,
    format
  );
  
  // ... generate and send file ...
});
```

**All available tracking methods:**

```typescript
trackActivity.login(userId, sessionId?)
trackActivity.logout(userId, sessionId?)
trackActivity.viewDocument(userId, documentId, projectId, readTimeSeconds?)
trackActivity.editDocument(userId, documentId, projectId)
trackActivity.createDocument(userId, documentId, projectId, metadata?)
trackActivity.exportDocument(userId, documentId, projectId, format)
trackActivity.createProject(userId, projectId, metadata?)
trackActivity.viewProject(userId, projectId)
trackActivity.aiGeneration(userId, requestType, metadata?)
trackActivity.useTemplate(userId, templateId, metadata?)
```

---

## 🤖 Tracking AI Usage

### 4. Track AI API Calls

**In your AI service (e.g., `server/src/services/aiService.ts`):**

```typescript
import AnalyticsTrackingService from './analyticsTrackingService';

export async function callAIModel(params: {
  provider: AIProvider;
  model: string;
  prompt: string;
  userId?: string;
  projectId?: string;
  documentId?: string;
}) {
  const startTime = Date.now();
  
  try {
    // Make the AI API call
    const response = await provider.generateText(params.prompt);
    const responseTimeMs = Date.now() - startTime;
    
    // Calculate cost
    const estimatedCost = AnalyticsTrackingService.calculateAICost(
      params.provider.type,
      params.model,
      response.inputTokens,
      response.outputTokens
    );
    
    // Track the usage
    await AnalyticsTrackingService.trackAIUsage({
      providerId: params.provider.id,
      modelId: params.provider.activeModelId,
      providerType: params.provider.type,
      modelName: params.model,
      requestType: 'generate', // or 'analyze', 'summarize', 'compress'
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      totalTokens: response.inputTokens + response.outputTokens,
      responseTimeMs,
      success: true,
      userId: params.userId,
      projectId: params.projectId,
      documentId: params.documentId,
      estimatedCost,
      requestPayload: { prompt: params.prompt.substring(0, 500) }, // Store truncated prompt
      responseMetadata: response.metadata,
    });
    
    return response;
    
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    
    // Track the failure
    await AnalyticsTrackingService.trackAIUsage({
      providerType: params.provider.type,
      modelName: params.model,
      requestType: 'generate',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      responseTimeMs,
      success: false,
      errorMessage: error.message,
      statusCode: error.statusCode,
      userId: params.userId,
      projectId: params.projectId,
      documentId: params.documentId,
    });
    
    throw error;
  }
}
```

---

## 🎯 Tracking Background Jobs

### 5. Track Job Queue Execution

**In your Bull job processor:**

```typescript
import AnalyticsTrackingService from '../services/analyticsTrackingService';

documentQueue.process(async (job) => {
  const startTime = Date.now();
  const jobId = job.id.toString();
  
  // Track job queued
  await AnalyticsTrackingService.trackJobExecution({
    jobId,
    jobType: 'document_generation',
    queueName: 'documents',
    status: 'queued',
    queuedAt: new Date(job.timestamp),
    userId: job.data.userId,
    projectId: job.data.projectId,
    jobData: job.data,
  });
  
  try {
    // Track job started
    await AnalyticsTrackingService.trackJobExecution({
      jobId,
      jobType: 'document_generation',
      queueName: 'documents',
      status: 'running',
      startedAt: new Date(),
    });
    
    // Process the job
    const result = await generateDocument(job.data);
    
    const durationMs = Date.now() - startTime;
    
    // Track job completed
    await AnalyticsTrackingService.trackJobExecution({
      jobId,
      jobType: 'document_generation',
      queueName: 'documents',
      status: 'completed',
      completedAt: new Date(),
      durationMs,
      success: true,
      resultData: result,
    });
    
    return result;
    
  } catch (error) {
    const durationMs = Date.now() - startTime;
    
    // Track job failed
    await AnalyticsTrackingService.trackJobExecution({
      jobId,
      jobType: 'document_generation',
      queueName: 'documents',
      status: 'failed',
      completedAt: new Date(),
      durationMs,
      success: false,
      errorMessage: error.message,
    });
    
    throw error;
  }
});
```

---

## 📈 System Metrics

### 6. Track System Performance

**Create a scheduled job to collect system metrics:**

```typescript
// server/src/jobs/systemMetricsCollector.ts
import os from 'os';
import AnalyticsTrackingService from '../services/analyticsTrackingService';

export async function collectSystemMetrics() {
  // CPU Usage
  const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
  await AnalyticsTrackingService.recordSystemMetric({
    metricName: 'cpu_usage',
    metricCategory: 'system',
    value: cpuUsage,
    unit: 'percent',
    thresholdWarning: 70,
    thresholdCritical: 90,
  });
  
  // Memory Usage
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsage = ((totalMem - freeMem) / totalMem) * 100;
  await AnalyticsTrackingService.recordSystemMetric({
    metricName: 'memory_usage',
    metricCategory: 'system',
    value: memUsage,
    unit: 'percent',
    thresholdWarning: 80,
    thresholdCritical: 95,
  });
  
  // Database connections (if you have pool stats)
  if (dbPool) {
    await AnalyticsTrackingService.recordSystemMetric({
      metricName: 'database_connections',
      metricCategory: 'database',
      value: dbPool.totalCount,
      unit: 'count',
    });
  }
}

// Run every 5 minutes
setInterval(collectSystemMetrics, 5 * 60 * 1000);
```

---

## 🔄 Scheduled Maintenance

### 7. Setup Cron Jobs

**Create maintenance scheduler:**

```typescript
// server/src/jobs/analyticsScheduler.ts
import cron from 'node-cron';
import AnalyticsTrackingService from '../services/analyticsTrackingService';

export function setupAnalyticsScheduler() {
  // Aggregate daily statistics every day at 1 AM
  cron.schedule('0 1 * * *', async () => {
    console.log('Aggregating daily statistics...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await AnalyticsTrackingService.aggregateDailyStats(yesterday);
  });
  
  // Refresh materialized views every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Refreshing analytics views...');
    await AnalyticsTrackingService.refreshViews();
  });
  
  // Cleanup old logs every week (Sunday at 2 AM)
  cron.schedule('0 2 * * 0', async () => {
    console.log('Cleaning up old analytics logs...');
    await AnalyticsTrackingService.cleanupOldLogs(90); // Keep 90 days
  });
  
  console.log('Analytics scheduler initialized');
}
```

**Start the scheduler in your main server file:**

```typescript
// server/src/index.ts
import { setupAnalyticsScheduler } from './jobs/analyticsScheduler';

// After server starts
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  setupAnalyticsScheduler();
});
```

---

## 📊 Querying Analytics Data

### 8. Create Analytics API Endpoints

**File:** `server/src/routes/analytics.ts`

```typescript
import express from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Get AI usage overview
router.get('/ai-analytics/overview', authenticate, authorize('analytics.view'), async (req, res) => {
  const { period = '30d' } = req.query;
  
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  
  const result = await query(`
    SELECT 
      COUNT(*) as total_requests,
      COUNT(*) FILTER (WHERE success = true) as successful_requests,
      SUM(total_tokens) as total_tokens,
      ROUND(AVG(response_time_ms)) as avg_response_time,
      SUM(estimated_cost) as total_cost,
      COUNT(DISTINCT model_name) as active_models
    FROM ai_usage_logs
    WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
  `);
  
  res.json(result.rows[0]);
});

// Get provider performance
router.get('/ai-analytics/providers', authenticate, authorize('analytics.view'), async (req, res) => {
  const { period = '30d' } = req.query;
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  
  const result = await query(`
    SELECT 
      provider_type,
      COUNT(*) as request_count,
      ROUND(AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) * 100, 2) as success_rate,
      ROUND(AVG(response_time_ms)) as avg_response_time,
      SUM(total_tokens) as total_tokens,
      SUM(estimated_cost) as total_cost
    FROM ai_usage_logs
    WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
    GROUP BY provider_type
    ORDER BY request_count DESC
  `);
  
  res.json(result.rows);
});

// Get model statistics
router.get('/ai-analytics/models', authenticate, authorize('analytics.view'), async (req, res) => {
  const { period = '30d' } = req.query;
  
  // Use materialized view for fast queries
  const result = await query(`
    SELECT * FROM mv_model_performance
    ORDER BY usage_count DESC
    LIMIT 20
  `);
  
  res.json(result.rows);
});

// Get usage timeline
router.get('/ai-analytics/timeline', authenticate, authorize('analytics.view'), async (req, res) => {
  const { period = '30d' } = req.query;
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  
  const result = await query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as requests,
      SUM(total_tokens) as tokens,
      SUM(estimated_cost) as cost
    FROM ai_usage_logs
    WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `);
  
  res.json(result.rows);
});

export default router;
```

**Register the routes:**

```typescript
// server/src/index.ts
import analyticsRoutes from './routes/analytics';

app.use('/api/analytics', analyticsRoutes);
```

---

## ✅ Implementation Checklist

### Step 1: Database
- [ ] Run migration: `psql $DATABASE_URL -f migrations/007_analytics_tables.sql`
- [ ] Verify tables created: `\dt` in psql

### Step 2: Backend Setup
- [ ] Add analytics middleware to main server file
- [ ] Import `AnalyticsTrackingService` in AI service
- [ ] Import `trackActivity` in route handlers

### Step 3: Integration Points
- [ ] Track login/logout in auth routes
- [ ] Track document views in document routes
- [ ] Track document edits in update routes
- [ ] Track AI usage in AI service
- [ ] Track job execution in Bull processors

### Step 4: Scheduled Jobs
- [ ] Create `analyticsScheduler.ts`
- [ ] Setup cron jobs for aggregation and cleanup
- [ ] Start scheduler in main server file

### Step 5: API Endpoints
- [ ] Create analytics routes file
- [ ] Implement overview, providers, models endpoints
- [ ] Register routes in main server file

### Step 6: Testing
- [ ] Make some API calls
- [ ] Check `ai_usage_logs` table
- [ ] Check `api_request_logs` table
- [ ] Verify data is being collected

### Step 7: Frontend Connection
- [ ] Update frontend analytics pages to call real endpoints
- [ ] Replace mock data with API calls
- [ ] Add loading states
- [ ] Test analytics dashboards

---

## 🎯 Benefits

Once implemented, you'll have:

✅ **Real-time tracking** - All actions logged automatically  
✅ **Historical data** - Analytics accumulate over time  
✅ **Cost monitoring** - Track AI usage and costs  
✅ **Performance insights** - Response times, success rates  
✅ **User engagement** - See what users are doing  
✅ **System health** - Monitor system metrics  
✅ **Future-proof** - Ready for analytics dashboards  

---

## 📈 Next Steps

After implementation and data collection:

1. **Let it run** for 1-2 weeks to accumulate data
2. **Connect dashboards** to real data
3. **Create reports** for stakeholders
4. **Set up alerts** for anomalies
5. **Optimize** based on insights

---

## 🆘 Troubleshooting

**Tables not created?**
```sql
-- Check if migration ran
SELECT * FROM schema_migrations;

-- Manually run migration
\i migrations/007_analytics_tables.sql
```

**No data being collected?**
```sql
-- Check if middleware is active
SELECT COUNT(*) FROM api_request_logs WHERE created_at > NOW() - INTERVAL '1 hour';

-- Enable query logging in aiService
console.log('Tracking AI usage:', data);
```

**Slow queries?**
```sql
-- Refresh materialized views
SELECT refresh_analytics_views();

-- Check if indexes exist
\di ai_usage_logs
```

---

Ready to implement? Start with **Step 1** and work through the checklist! 🚀

