# Analytics Page - Real Data Implementation Review

**Date**: 2025-01-XX  
**Status**: 📋 Analysis Complete - Ready for Implementation  
**Priority**: High

---

## 📊 Executive Summary

The analytics page (`app/analytics/page.tsx`) currently displays **mostly mock data**. However, the backend has comprehensive analytics tracking infrastructure in place. This document identifies which metrics can be implemented with **real data** from existing database tables and API endpoints.

---

## 🔍 Current State Analysis

### Frontend (`app/analytics/page.tsx`)

**Currently Mocked:**
- ✅ User Activity Trends (monthly data)
- ✅ Document Type Distribution
- ✅ System Performance (CPU, Memory, Disk, Network)
- ✅ Project Status Overview
- ✅ AI Usage Trends
- ✅ Top Active Users
- ✅ All stat cards (Total Users, Documents, Sessions, Uptime)

**Partially Real:**
- ⚠️ Key Metrics Cards - Only `total_users` and `active_users` are fetched from API
- ⚠️ API calls `getSystemAnalytics()` but only uses `total_users` and `active_users`

---

## ✅ Available Real Data Sources

### 1. **Database Tables** (from `server/migrations/007_analytics_tables.sql`)

#### **`ai_usage_logs`** ✅ Available
- **Fields**: `provider_type`, `model_name`, `request_type`, `input_tokens`, `output_tokens`, `total_tokens`, `response_time_ms`, `success`, `estimated_cost`, `created_at`
- **Can Provide**:
  - ✅ AI Processing Trends (by request_type: analysis, generation, processing)
  - ✅ AI Usage by Provider
  - ✅ AI Cost Analysis
  - ✅ AI Response Time Metrics
  - ✅ AI Success Rate

#### **`api_request_logs`** ✅ Available
- **Fields**: `method`, `path`, `endpoint`, `response_time_ms`, `status_code`, `user_id`, `created_at`
- **Can Provide**:
  - ✅ API Calls Count
  - ✅ API Response Time (avg, p95)
  - ✅ API Error Rate
  - ✅ API Usage Trends Over Time
  - ✅ Most Used Endpoints

#### **`user_activity_logs`** ✅ Available
- **Fields**: `user_id`, `session_id`, `activity_type`, `activity_category`, `entity_type`, `entity_id`, `created_at`
- **Can Provide**:
  - ✅ User Activity Trends
  - ✅ Active Users Count
  - ✅ Session Counts
  - ✅ Top Active Users
  - ✅ User Engagement Metrics

#### **`document_analytics`** ✅ Available
- **Fields**: `document_id`, `project_id`, `view_count`, `unique_viewers`, `edit_count`, `pdf_exports`, `docx_exports`, `avg_read_time_seconds`
- **Can Provide**:
  - ✅ Document Views
  - ✅ Document Edits
  - ✅ Document Exports
  - ✅ Document Engagement

#### **`daily_statistics`** ✅ Available (Pre-aggregated)
- **Fields**: `date`, `ai_requests_total`, `ai_requests_success`, `ai_tokens_total`, `ai_cost_total`, `api_requests_total`, `api_requests_2xx`, `api_requests_4xx`, `api_requests_5xx`, `api_avg_response_time_ms`, `active_users`, `new_users`, `total_sessions`, `documents_created`, `documents_edited`, `documents_viewed`, `jobs_queued`, `jobs_completed`, `jobs_failed`
- **Can Provide**:
  - ✅ All time-series charts (fast queries)
  - ✅ Daily aggregated metrics
  - ✅ Growth trends

#### **`jobs`** ✅ Available
- **Fields**: `type`, `status`, `created_at`, `started_at`, `completed_at`
- **Can Provide**:
  - ✅ Job Queue Performance
  - ✅ Job Success/Failure Rates
  - ✅ Job Processing Times

#### **`documents`** ✅ Available
- **Fields**: `template_name`, `status`, `created_at`, `project_id`
- **Can Provide**:
  - ✅ Document Type Distribution (by template_name)
  - ✅ Document Creation Trends
  - ✅ Document Status Distribution

#### **`projects`** ✅ Available
- **Fields**: `status`, `framework`, `created_at`
- **Can Provide**:
  - ✅ Project Status Overview
  - ✅ Framework Usage Distribution
  - ✅ Project Creation Trends

#### **`users`** ✅ Available
- **Fields**: `is_active`, `created_at`, `last_login`
- **Can Provide**:
  - ✅ Total Users
  - ✅ Active Users
  - ✅ User Growth Over Time
  - ✅ New Users Per Period

---

## 🎯 Implementation Recommendations

### **Priority 1: Quick Wins** (Can implement immediately)

#### 1. **Key Metrics Cards** (Top 4 cards)
**Current**: Only `total_users` and `active_users` are real  
**Can Implement**:
- ✅ **Total Users**: Already implemented ✅
- ✅ **Active Users**: Already implemented ✅
- ✅ **Total Documents**: Query `SELECT COUNT(*) FROM documents`
- ✅ **Documents Today**: Query `SELECT COUNT(*) FROM documents WHERE DATE(created_at) = CURRENT_DATE`
- ✅ **Total Sessions**: Query `SELECT COUNT(DISTINCT session_id) FROM user_activity_logs WHERE created_at >= NOW() - INTERVAL '${period}'`
- ✅ **Avg Session Time**: Calculate from `user_activity_logs` (time between first and last activity per session)
- ✅ **API Calls**: Query `SELECT COUNT(*) FROM api_request_logs WHERE created_at >= NOW() - INTERVAL '${period}'`

**API Endpoint**: Extend `/api/analytics/system` to return these fields

#### 2. **User Activity Trends Chart**
**Current**: Mock monthly data  
**Can Implement**: 
- Query `daily_statistics` table for `active_users`, `total_sessions`, `documents_created` grouped by date
- Or query raw tables:
  ```sql
  SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(DISTINCT user_id) as users,
    COUNT(DISTINCT session_id) as sessions,
    (SELECT COUNT(*) FROM documents WHERE DATE(created_at) = DATE_TRUNC('day', ual.created_at)) as documents
  FROM user_activity_logs ual
  WHERE created_at >= NOW() - INTERVAL '${period}'
  GROUP BY DATE_TRUNC('day', created_at)
  ORDER BY date
  ```

**API Endpoint**: Add to `/api/analytics/system` response as `user_activity_trends`

#### 3. **Document Type Distribution**
**Current**: Mock pie chart data  
**Can Implement**:
- Query `documents` table grouped by `template_name`:
  ```sql
  SELECT 
    COALESCE(template_name, 'Other') as name,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
  FROM documents
  WHERE created_at >= NOW() - INTERVAL '${period}'
  GROUP BY template_name
  ORDER BY count DESC
  ```

**API Endpoint**: Add to `/api/analytics/system` response as `document_types`

#### 4. **Top Active Users**
**Current**: Mock user list  
**Can Implement**:
- Query `user_activity_logs` joined with `users`:
  ```sql
  SELECT 
    u.name,
    u.email,
    COUNT(DISTINCT ual.session_id) as sessions,
    COUNT(DISTINCT ual.entity_id) FILTER (WHERE ual.entity_type = 'document') as documents,
    MAX(ual.created_at) as last_active
  FROM users u
  JOIN user_activity_logs ual ON u.id = ual.user_id
  WHERE ual.created_at >= NOW() - INTERVAL '${period}'
  GROUP BY u.id, u.name, u.email
  ORDER BY sessions DESC, documents DESC
  LIMIT 10
  ```

**API Endpoint**: Already exists in `/api/analytics/system` as `active_users` ✅

#### 5. **AI Usage Trends**
**Current**: Mock weekly data  
**Can Implement**:
- Query `ai_usage_logs` grouped by `request_type` and date:
  ```sql
  SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) FILTER (WHERE request_type = 'analyze') as analysis,
    COUNT(*) FILTER (WHERE request_type = 'generate') as generation,
    COUNT(*) FILTER (WHERE request_type IN ('process', 'summarize', 'compress')) as processing
  FROM ai_usage_logs
  WHERE created_at >= NOW() - INTERVAL '${period}'
  GROUP BY DATE_TRUNC('day', created_at)
  ORDER BY date
  ```

**API Endpoint**: Add to `/api/analytics/system` response as `ai_usage_trends`

#### 6. **Project Status Overview**
**Current**: Mock pie chart  
**Can Implement**:
- Query `projects` table:
  ```sql
  SELECT 
    status as name,
    COUNT(*) as value
  FROM projects
  GROUP BY status
  ```

**API Endpoint**: Add to `/api/analytics/system` response as `project_status`

---

### **Priority 2: Medium Effort** (Requires API endpoint updates)

#### 7. **Document Generation Trends**
**Current**: Uses same mock data as User Activity  
**Can Implement**:
- Query `documents` table:
  ```sql
  SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as documents
  FROM documents
  WHERE created_at >= NOW() - INTERVAL '${period}'
  GROUP BY DATE_TRUNC('day', created_at)
  ORDER BY date
  ```

**API Endpoint**: Add to `/api/analytics/system` response as `document_trends`

#### 8. **System Performance Metrics**
**Current**: Mock CPU/Memory/Disk/Network data  
**Can Implement**:
- Query `system_metrics` table (if populated):
  ```sql
  SELECT 
    DATE_TRUNC('hour', measured_at) as time,
    AVG(value) FILTER (WHERE metric_name = 'cpu_usage') as cpu,
    AVG(value) FILTER (WHERE metric_name = 'memory_usage') as memory,
    AVG(value) FILTER (WHERE metric_name = 'disk_usage') as disk,
    AVG(value) FILTER (WHERE metric_name = 'network_usage') as network
  FROM system_metrics
  WHERE measured_at >= NOW() - INTERVAL '24 hours'
  GROUP BY DATE_TRUNC('hour', measured_at)
  ORDER BY time
  ```

**Note**: `system_metrics` table exists but may not be populated. Need to implement metrics collection.

**API Endpoint**: Add `/api/analytics/performance` endpoint (already exists but returns placeholder data)

---

### **Priority 3: Advanced Features** (Requires new queries/aggregations)

#### 9. **API Performance Metrics**
**Current**: Not displayed (but data available)  
**Can Implement**:
- Query `api_request_logs`:
  ```sql
  SELECT 
    DATE_TRUNC('hour', created_at) as time,
    COUNT(*) as requests,
    AVG(response_time_ms) as avg_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
    COUNT(*) FILTER (WHERE status_code >= 500) * 100.0 / COUNT(*) as error_rate
  FROM api_request_logs
  WHERE created_at >= NOW() - INTERVAL '${period}'
  GROUP BY DATE_TRUNC('hour', created_at)
  ORDER BY time
  ```

**API Endpoint**: Extend `/api/analytics/performance` endpoint

#### 10. **AI Cost Analysis**
**Current**: Not displayed  
**Can Implement**:
- Query `ai_usage_logs`:
  ```sql
  SELECT 
    DATE_TRUNC('day', created_at) as date,
    SUM(estimated_cost) as total_cost,
    SUM(total_tokens) as total_tokens,
    COUNT(*) as request_count
  FROM ai_usage_logs
  WHERE created_at >= NOW() - INTERVAL '${period}'
  GROUP BY DATE_TRUNC('day', created_at)
  ORDER BY date
  ```

**API Endpoint**: Add to `/api/analytics/system` response as `ai_costs`

---

## 📋 Implementation Checklist

### **Backend Changes** (`server/src/routes/analytics.ts`)

- [x] **Extend `/api/analytics/system` endpoint** to include:
  - [x] `total_users` (from `users` table) ✅ Phase 1 Complete
  - [x] `total_documents` (from `documents` table) ✅ Phase 1 Complete
  - [x] `documents_today` (from `documents` table) ✅ Phase 1 Complete
  - [x] `total_sessions` (from `user_activity_logs`) ✅ Phase 1 Complete
  - [ ] `avg_session_time` (calculated from `user_activity_logs`) - Phase 3
  - [x] `api_calls` (from `api_request_logs`) ✅ Phase 1 Complete
  - [ ] `user_activity_trends` (time-series data from `daily_statistics` or `user_activity_logs`)
  - [ ] `document_types` (from `documents` grouped by `template_name`)
  - [ ] `document_trends` (time-series from `documents`)
  - [ ] `ai_usage_trends` (from `ai_usage_logs` grouped by `request_type`)
  - [ ] `project_status` (from `projects` grouped by `status`)
  - [ ] `ai_costs` (from `ai_usage_logs`)

- [ ] **Update `/api/analytics/performance` endpoint** to return real data:
  - [ ] Query `api_request_logs` for response times
  - [ ] Calculate p95 response time
  - [ ] Calculate error rate
  - [ ] Query `system_metrics` if available

### **Frontend Changes** (`app/analytics/page.tsx`)

- [x] **Update stat cards** to use real data from API: ✅ Phase 1 Complete
  - [x] `totalUsers` → `analyticsData.total_users` ✅
  - [x] `activeUsers` → `analyticsData.active_users` ✅
  - [x] `totalDocuments` → `analyticsData.total_documents` ✅
  - [x] `documentsToday` → `analyticsData.documents_today` ✅
  - [x] `totalSessions` → `analyticsData.total_sessions` ✅
  - [ ] `avgSessionTime` → `analyticsData.avg_session_time` - Phase 3
  - [x] `apiCalls` → `analyticsData.api_calls` ✅
  - [x] Added loading states for all cards ✅
  - [x] Updated time range selector to match backend ✅

- [ ] **Update charts** to use real data:
  - [ ] User Activity Trends → `analyticsData.user_activity_trends`
  - [ ] Document Types → `analyticsData.document_types`
  - [ ] Document Generation Trends → `analyticsData.document_trends`
  - [ ] AI Usage Trends → `analyticsData.ai_usage_trends`
  - [ ] Project Status → `analyticsData.project_status`

- [ ] **Remove mock data constants**:
  - [ ] `userActivityData`
  - [ ] `documentTypeData`
  - [ ] `aiUsageData`
  - [ ] `projectStatusData`
  - [ ] `topUsersData`
  - [ ] `systemPerformanceData` (or implement real collection)

- [ ] **Add loading states** for charts
- [ ] **Add error handling** for missing data
- [ ] **Add empty states** when no data available

---

## 🚀 Quick Start Implementation Plan

### **Phase 1: Key Metrics (1-2 hours)**
1. Update `/api/analytics/system` to return `total_documents`, `documents_today`, `total_sessions`, `api_calls`
2. Update frontend stat cards to use real data
3. Test with real database

### **Phase 2: Charts (2-3 hours)**
1. Add `user_activity_trends` query to backend
2. Add `document_types` query to backend
3. Add `ai_usage_trends` query to backend
4. Update frontend charts to use real data
5. Transform data format for Recharts compatibility

### **Phase 3: Advanced Metrics (3-4 hours)**
1. Implement `avg_session_time` calculation
2. Add `document_trends` query
3. Add `project_status` query
4. Update performance endpoint with real API metrics
5. Add AI cost analysis

---

## 📊 Data Availability Matrix

| Metric | Database Table | Status | Implementation Effort |
|--------|---------------|--------|----------------------|
| Total Users | `users` | ✅ Available | ⚡ Easy |
| Active Users | `users` + `user_activity_logs` | ✅ Available | ⚡ Easy |
| Total Documents | `documents` | ✅ Available | ⚡ Easy |
| Documents Today | `documents` | ✅ Available | ⚡ Easy |
| Total Sessions | `user_activity_logs` | ✅ Available | ⚡ Easy |
| Avg Session Time | `user_activity_logs` | ✅ Available | ⚠️ Medium (calculation) |
| API Calls | `api_request_logs` | ✅ Available | ⚡ Easy |
| User Activity Trends | `daily_statistics` or `user_activity_logs` | ✅ Available | ⚡ Easy |
| Document Types | `documents` | ✅ Available | ⚡ Easy |
| Document Trends | `documents` | ✅ Available | ⚡ Easy |
| AI Usage Trends | `ai_usage_logs` | ✅ Available | ⚡ Easy |
| AI Costs | `ai_usage_logs` | ✅ Available | ⚡ Easy |
| Project Status | `projects` | ✅ Available | ⚡ Easy |
| Top Active Users | `user_activity_logs` + `users` | ✅ Available | ⚡ Easy |
| System Performance | `system_metrics` | ⚠️ Table exists but may be empty | ⚠️ Medium (needs collection) |
| API Performance | `api_request_logs` | ✅ Available | ⚡ Easy |

---

## 🎯 Recommended Implementation Order

1. **Week 1**: Phase 1 (Key Metrics) - Immediate value
2. **Week 2**: Phase 2 (Charts) - Visual improvements
3. **Week 3**: Phase 3 (Advanced) - Complete analytics

---

## 📝 Notes

- **System Performance**: The `system_metrics` table exists but may not be populated. Consider implementing a metrics collection service or using existing monitoring tools.
- **Session Time Calculation**: Requires tracking session start/end times. May need to enhance `user_activity_logs` or use session management data.
- **Data Formatting**: Frontend charts expect specific data formats. Ensure backend transforms data correctly for Recharts.
- **Caching**: Current implementation uses Redis caching (10 minutes for system analytics). Consider cache invalidation strategy.
- **Performance**: For large datasets, use `daily_statistics` table for time-series queries instead of raw logs.

---

## ✅ Success Criteria

- [ ] All key metric cards display real data
- [ ] All charts display real data (no mock data)
- [ ] Data updates based on selected time range
- [ ] Loading states work correctly
- [ ] Empty states display when no data available
- [ ] Performance is acceptable (< 2s load time)
- [ ] No console errors

---

**Next Steps**: Review this document and prioritize which metrics to implement first.

