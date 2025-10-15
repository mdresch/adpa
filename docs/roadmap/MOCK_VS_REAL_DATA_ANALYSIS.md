# 🎭 Mock vs Real Data Analysis

## Summary

Most of the **analytics and visualizations** added in the recent UI enhancements use **mock/placeholder data** because the backend endpoints don't exist yet. Here's a complete breakdown:

---

## ✅ Pages Using REAL Data

### 1. **Process Flow Page** (`/process-flow`)
- ✅ **Real:** Template list, selected templates, project metadata
- ✅ **Real:** Document compression (when executed)
- ✅ **Real:** Workflow execution status
- ✅ **Real:** Generated document content
- ✅ **Real:** Token counting (after backend restart)

### 2. **Projects List** (`/projects`)
- ✅ **Real:** Project list from database
- ✅ **Real:** Project names, descriptions, statuses
- ✅ **Real:** Creation dates, team members

### 3. **AI Providers List** (`/ai-providers`)
- ✅ **Real:** Provider list (OpenAI, Google, Azure, etc.)
- ✅ **Real:** Provider status, API keys (masked)
- ✅ **Real:** Model configurations
- ✅ **Real:** Model discovery

### 4. **Document Viewer** (`/projects/[id]/documents/[docId]/view`)
- ✅ **Real:** Document content (when exists in DB)
- ✅ **Real:** Document metadata
- ❌ **Mock:** Version history, comments, analytics

---

## ❌ Pages Using MOCK Data

### 1. **Main Dashboard** (`/`)
- ❌ **Mock:** Quick stats (Total Projects, Active Documents, Team Members, Tasks)
- ❌ **Mock:** Recent activity timeline
- ❌ **Mock:** System Performance metrics (Avg Response Time, Success Rate, Active Providers, Documents Today)
- ✅ **Real:** AI Provider status cards (uses real provider data)

**Mock Data Location:**
```typescript
// app/page.tsx lines 115-155
const stats = {
  totalProjects: 24,
  activeDocuments: 156,
  teamMembers: 12,
  totalTasks: 89,
}

const recentActivity = [
  { id: 1, action: "Document generated", project: "...", time: "..." },
  // ... more mock activities
]
```

---

### 2. **AI Analytics Page** (`/ai-analytics`)
- ❌ **Mock:** ALL visualizations and metrics
- ❌ **Mock:** Total Requests, Total Tokens, Active Models
- ❌ **Mock:** Provider usage charts
- ❌ **Mock:** Model performance comparisons
- ❌ **Mock:** Usage timeline
- ❌ **Mock:** Insights (Top Performer, Speed Champion, Quality Leader)
- ❌ **Mock:** Cost Analysis
- ❌ **Mock:** Optimization Recommendations

**API Call Status:**
```typescript
// Attempts to call: GET /ai-analytics/models?period=30d
// Backend returns 404 - endpoint doesn't exist yet
// Falls back to empty arrays: [], [], []
```

---

### 3. **AI Providers Page - Enhanced Tabs** (`/ai-providers`)

#### Testing Suite Tab
- ❌ **Mock:** Provider health metrics
- ❌ **Mock:** Latency, success rate, last tested
- ❌ **Mock:** Test results

#### Failover Settings Tab
- ❌ **Mock:** Retry configuration
- ❌ **Mock:** Failure detection thresholds
- ❌ **Mock:** Recent failover events
- ❌ **Mock:** Provider priority order

#### Usage Analytics Tab
- ❌ **Mock:** Total requests, tokens, response times
- ❌ **Mock:** Usage distribution by provider
- ❌ **Mock:** Cost breakdown
- ❌ **Mock:** Performance comparison
- ❌ **Mock:** 7-day usage timeline

**Mock Data Location:**
```typescript
// app/ai-providers/page.tsx lines ~1100-1300
const mockHealthData = [
  { provider: "OpenAI", status: "healthy", latency: 245, successRate: 99.8 },
  // ...
]

const mockFailoverEvents = [...]
const mockUsageData = [...]
```

---

### 4. **Project Detail Page - Enhanced Tabs** (`/projects/[id]`)

#### Documents Tab
- ✅ **Real:** Document list
- ❌ **Mock:** Document stats (Total, Draft, Published, In Review)

#### Overview Tab
- ❌ **Mock:** Document status distribution (pie chart)
- ❌ **Mock:** Project health indicators (Schedule Performance, Documentation Complete, Team Engagement, Stakeholder Coverage)
- ✅ **Real:** Project information (name, description, dates)
- ❌ **Mock:** Team members

#### Stakeholders Tab
- ❌ **Mock:** Stakeholder summary stats
- ❌ **Mock:** Power/Interest Matrix visualization
- ❌ **Mock:** Stakeholder list

#### Timeline Tab
- ❌ **Mock:** Timeline stats (Duration, Days Elapsed, Days Remaining)
- ❌ **Mock:** Project phases with progress
- ❌ **Mock:** Key milestones
- ❌ **Mock:** Visual project timeline

**Mock Data Location:**
```typescript
// app/projects/[id]/page.tsx lines ~200-400
const mockStakeholders = [...]
const mockMilestones = [...]
const mockPhases = [...]
```

---

### 5. **System Analytics Page** (`/analytics`)
- ❌ **Mock:** User activity over time
- ❌ **Mock:** Document type distribution
- ❌ **Mock:** System performance (CPU, memory, disk)
- ❌ **Mock:** Project status distribution
- ❌ **Mock:** AI usage by week
- ❌ **Mock:** Top users

**Mock Data Location:**
```typescript
// app/analytics/page.tsx lines 53-100
const userActivityData = [...]
const documentTypeData = [...]
const systemPerformanceData = [...]
```

---

### 6. **Jobs Page** (`/jobs`)
- ❌ **Mock:** All job data
- ❌ **Mock:** Queue statistics
- ❌ **Mock:** Worker status

**Mock Data Location:**
```typescript
// app/jobs/page.tsx lines 74-187
const mockJobs = [...]
const mockQueues = [...]
```

---

## 🔧 Backend Endpoints Needed

To make the analytics **REAL**, these backend endpoints need to be created:

### AI Analytics Endpoints
```
GET  /api/ai-analytics/overview?period=7d|30d|90d
     → Returns: total_requests, total_tokens, active_models, avg_response_time, success_rate

GET  /api/ai-analytics/models?period=7d|30d|90d  
     → Returns: usageOverTime[], providerStats[], modelStats[]

GET  /api/ai-analytics/insights?period=7d|30d|90d
     → Returns: topPerformer, speedChampion, qualityLeader, costAnalysis, recommendations
```

### Provider Analytics Endpoints
```
GET  /api/ai-providers/health
     → Returns: [{provider, status, latency, successRate, lastTested}]

GET  /api/ai-providers/usage?period=7d|30d|90d
     → Returns: usage distribution, cost breakdown, performance metrics

GET  /api/ai-providers/failover
     → Returns: configuration, recent events, priority order
```

### Project Analytics Endpoints
```
GET  /api/projects/:id/stats
     → Returns: document counts, status distribution, health metrics

GET  /api/projects/:id/stakeholders
     → Returns: stakeholder list with power/interest/influence data

GET  /api/projects/:id/timeline
     → Returns: phases, milestones, duration, progress

GET  /api/projects/:id/team
     → Returns: team members with roles and activity
```

### System Analytics Endpoints
```
GET  /api/analytics/system?period=7d|30d|90d
     → Returns: user activity, document types, system performance

GET  /api/analytics/users
     → Returns: top users, activity stats

GET  /api/analytics/documents
     → Returns: document statistics, types, trends
```

### Job Queue Endpoints
```
GET  /api/jobs
     → Returns: list of jobs with status, progress, logs

GET  /api/jobs/queues
     → Returns: queue statistics, worker status

POST /api/jobs/:id/retry
     → Retry a failed job

DELETE /api/jobs/:id
     → Cancel/delete a job
```

---

## 🎯 Recommendation

### Option 1: **Keep Mock Data for Now (UI/UX Preview)**
- The mock data serves as a **design preview**
- Shows stakeholders what features will look like
- Focus on getting core functionality working first
- Replace with real data incrementally

### Option 2: **Implement Backend Endpoints**
- Create the backend analytics services
- Add database queries for metrics
- Implement caching for performance
- Connect frontend to real APIs

### Option 3: **Hybrid Approach** (Recommended)
- Keep mock data for features not yet prioritized
- Implement real endpoints for high-priority features:
  1. **AI Analytics** - Critical for monitoring AI usage/costs
  2. **Provider Health** - Important for reliability
  3. **Project Stats** - Useful for stakeholders
  4. **Document Analytics** - Later priority
  5. **System Performance** - Later priority

---

## 📝 Current Status

| Feature | Data Source | Priority | Effort |
|---------|------------|----------|--------|
| Process Flow | ✅ Real | Critical | Done |
| AI Analytics Overview | ❌ Mock | High | 2-3 days |
| Provider Health/Testing | ❌ Mock | High | 1-2 days |
| Project Stats | ❌ Mock | Medium | 1 day |
| Stakeholder Matrix | ❌ Mock | Low | 2 days |
| System Performance | ❌ Mock | Low | 2-3 days |
| Job Queue | ❌ Mock | Medium | 1-2 days |

---

## 🚀 Next Steps

1. **Document this clearly** ✅ (this file)
2. **Decide priority** - Which analytics are most important?
3. **Implement backend endpoints** - Start with AI analytics
4. **Update frontend** - Remove mock data, connect to real APIs
5. **Add error handling** - Fallback to "No data" instead of mock
6. **Test thoroughly** - Ensure real data flows correctly

---

Would you like me to:
1. **Start implementing backend endpoints** for AI analytics?
2. **Add "DEMO" badges** to mock data sections in the UI?
3. **Create a database schema** for analytics tables?
4. **Replace mock with empty states** showing "No data yet"?

