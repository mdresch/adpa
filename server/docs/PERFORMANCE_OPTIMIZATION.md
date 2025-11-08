# Performance Optimization Guide

## Client Onboarding Assessment System

This guide covers performance optimization strategies for the assessment system to handle high-volume workloads efficiently.

---

## 🎯 **Current Performance**

### **Baseline Metrics:**
- **Document Upload**: 100 files in 2-3 minutes
- **Conversion Time**: 10-15 seconds per document
- **Assessment Generation**: 30-60 seconds for portfolio
- **PDF Report**: 5-10 seconds

### **Bottlenecks Identified:**
1. PDF conversion (CPU-intensive)
2. AI document classification (API calls)
3. Database queries for assessment aggregation
4. PDF report generation (Puppeteer)

---

## 🚀 **Optimization Strategies**

### **1. Bull Queue Configuration**

#### **Current:**
```typescript
concurrency: 5  // Process 5 documents simultaneously
```

#### **Optimized (Production):**
```typescript
import Bull from 'bull';

export const documentUploadQueue = new Bull('document-upload', {
  redis: process.env.REDIS_URL,
  settings: {
    maxStalledCount: 3,
    stalledInterval: 30000,
    guardInterval: 5000,
    retryProcessDelay: 5000
  },
  limiter: {
    max: 100,      // Max 100 jobs
    duration: 1000  // per second
  }
});

// Increase workers for production
const WORKER_COUNT = process.env.WORKER_COUNT || 20;
for (let i = 0; i < WORKER_COUNT; i++) {
  documentUploadQueue.process(processUploadedFile);
}
```

### **2. Database Connection Pooling**

#### **Optimized Pool Configuration:**
```typescript
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  // Production optimizations
  max: 50,                    // Max 50 connections
  min: 10,                    // Min 10 connections always alive
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 10000,  // Timeout if no connection in 10s
  statement_timeout: 60000    // Query timeout 60s
});

// Connection lifecycle
pool.on('connect', client => {
  client.query('SET search_path TO public');
});

pool.on('error', (err, client) => {
  logger.error('Unexpected pool error', { error: err });
  process.exit(-1);
});
```

### **3. Redis Caching Strategy**

#### **Cache Frequently Accessed Data:**
```typescript
import { redis } from '../utils/redis';

// Cache assessment results (1 hour)
export async function getAssessmentCached(
  assessmentId: string
): Promise<Assessment | null> {
  const cacheKey = `assessment:${assessmentId}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Query database
  const assessment = await pool.query(
    'SELECT * FROM assessments WHERE id = $1',
    [assessmentId]
  );
  
  // Cache for 1 hour
  if (assessment.rows[0]) {
    await redis.setex(cacheKey, 3600, JSON.stringify(assessment.rows[0]));
  }
  
  return assessment.rows[0] || null;
}

// Invalidate cache on update
export async function updateAssessment(
  assessmentId: string,
  data: Partial<Assessment>
): Promise<void> {
  await pool.query(
    'UPDATE assessments SET ... WHERE id = $1',
    [assessmentId, ...Object.values(data)]
  );
  
  // Invalidate cache
  await redis.del(`assessment:${assessmentId}`);
}
```

### **4. PDF Generation Optimization**

#### **Reuse Browser Instance:**
```typescript
import puppeteer, { Browser } from 'puppeteer';

// Singleton browser instance
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
  }
  return browserInstance;
}

// Reuse browser for all PDF generations
export async function generatePDF(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true
    });
    return Buffer.from(pdf);
  } finally {
    await page.close(); // Close page, not browser
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (browserInstance) {
    await browserInstance.close();
  }
});
```

### **5. Database Query Optimization**

#### **Use Indexes:**
```sql
-- Indexes for assessment system
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_upload_batch_id ON documents(upload_batch_id);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_assessments_project_id ON assessments(project_id);
CREATE INDEX idx_upload_batches_status ON upload_batches(status);

-- Composite indexes for common queries
CREATE INDEX idx_documents_project_status ON documents(project_id, status);
CREATE INDEX idx_assessments_created ON assessments(project_id, created_at DESC);
```

#### **Optimize Queries:**
```typescript
// BAD: Multiple queries
const documents = await pool.query(
  'SELECT * FROM documents WHERE project_id = $1',
  [projectId]
);
for (const doc of documents.rows) {
  const audit = await pool.query(
    'SELECT * FROM quality_audits WHERE document_id = $1',
    [doc.id]
  );
  // Process audit...
}

// GOOD: Single query with JOIN
const result = await pool.query(`
  SELECT 
    d.*,
    qa.score as quality_score,
    qa.grade as quality_grade
  FROM documents d
  LEFT JOIN quality_audits qa ON d.id = qa.document_id
  WHERE d.project_id = $1
`, [projectId]);
```

### **6. Batch Processing Optimization**

#### **Process in Chunks:**
```typescript
// Process large batches in smaller chunks
async function processBatch(files: File[]): Promise<void> {
  const CHUNK_SIZE = 10;
  
  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    const chunk = files.slice(i, i + CHUNK_SIZE);
    
    // Process chunk in parallel
    await Promise.all(
      chunk.map(file => enqueueFileProcessing(file))
    );
    
    // Small delay between chunks to prevent overload
    if (i + CHUNK_SIZE < files.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

### **7. WebSocket Optimization**

#### **Room-Based Broadcasting:**
```typescript
io.on('connection', (socket) => {
  socket.on('subscribe', ({ batchId }) => {
    // Join batch-specific room
    socket.join(`batch:${batchId}`);
  });
});

// Broadcast only to relevant clients
function emitBatchProgress(batchId: string, data: any) {
  io.to(`batch:${batchId}`).emit('batch-progress', data);
}
```

---

## 📊 **Monitoring & Metrics**

### **Key Metrics to Track:**

#### **Application Metrics:**
```typescript
import { Counter, Histogram } from 'prom-client';

// Upload metrics
const uploadCounter = new Counter({
  name: 'documents_uploaded_total',
  help: 'Total number of documents uploaded'
});

const conversionDuration = new Histogram({
  name: 'document_conversion_duration_seconds',
  help: 'Time taken to convert documents',
  buckets: [1, 5, 10, 30, 60, 120]
});

// Track in code
uploadCounter.inc();
const end = conversionDuration.startTimer();
// ... conversion logic ...
end();
```

#### **Database Metrics:**
```sql
-- Monitor slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 1000  -- queries slower than 1s
ORDER BY total_time DESC
LIMIT 20;
```

#### **Redis Metrics:**
```bash
# Monitor Redis performance
redis-cli info stats
redis-cli info memory
redis-cli slowlog get 10
```

---

## 🎯 **Performance Targets**

### **Production Goals:**

| Metric | Target | Current |
|--------|--------|---------|
| **Upload Response** | < 500ms | ~800ms |
| **Conversion Time** | < 10s/doc | ~15s/doc |
| **Assessment Generation** | < 30s | ~60s |
| **PDF Generation** | < 5s | ~10s |
| **Concurrent Users** | 100+ | 20 |
| **Documents/Hour** | 10,000+ | ~2,000 |

### **Scaling Plan:**

#### **Phase 1: Vertical Scaling**
- Increase server CPU/RAM
- Optimize Bull worker count
- Increase database connections

#### **Phase 2: Horizontal Scaling**
- Load balancer (Nginx/AWS ALB)
- Multiple app servers
- Shared Redis cluster
- Read replicas for database

#### **Phase 3: Microservices**
- Separate upload service
- Separate conversion service
- Separate assessment service
- Message queue (RabbitMQ/Kafka)

---

## 🔧 **Production Configuration**

### **Environment Variables:**
```bash
# Performance settings
NODE_ENV=production
WORKER_COUNT=20
DB_POOL_SIZE=50
REDIS_CLUSTER=true

# Optimization flags
ENABLE_CACHING=true
CACHE_TTL=3600
PDF_BROWSER_POOL_SIZE=5
CONCURRENT_CONVERSIONS=10

# Monitoring
SENTRY_DSN=your-sentry-dsn
PROMETHEUS_PORT=9090
```

### **Docker Compose (Scaled):**
```yaml
version: '3.8'
services:
  app:
    image: adpa-backend
    deploy:
      replicas: 3  # 3 app instances
      resources:
        limits:
          cpus: '2'
          memory: 4G
    environment:
      - WORKER_COUNT=20
      - DB_POOL_SIZE=50
    
  redis:
    image: redis:7-alpine
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G
    command: redis-server --maxmemory 1gb --maxmemory-policy allkeys-lru
    
  postgres:
    image: postgres:15
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
    environment:
      - POSTGRES_MAX_CONNECTIONS=200
      - POSTGRES_SHARED_BUFFERS=2GB
```

---

## ✅ **Optimization Checklist**

- [x] Bull queue workers increased to 20+
- [x] Database connection pooling optimized
- [x] Redis caching implemented
- [x] PDF browser instance reused
- [x] Database indexes created
- [x] Queries optimized (JOINs, batching)
- [x] WebSocket rooms implemented
- [x] Monitoring metrics added
- [ ] Load testing performed (>100 concurrent)
- [ ] Auto-scaling configured
- [ ] CDN setup for static assets
- [ ] Database read replicas configured

---

**Status:** ✅ Ready for Production Load Testing  
**Next:** Perform load testing with 100+ concurrent users

