# ADPA Deployment Architecture

**Target Audience**: Enterprise architects, DevOps engineers, IT decision-makers, and technical leadership evaluating ADPA for organizational deployment.

**Scope**: This document defines the ADPA platform's deployment model, architectural decisions, multi-tenancy strategy, security considerations, and rationale for cloud-native SaaS as the exclusive deployment option.

---

## Glossary

| Term | Definition |
|------|------------|
| **SaaS** | Software as a Service - cloud-based software delivery model |
| **RLS** | Row-Level Security - database access control at the row level |
| **JWT** | JSON Web Token - secure authentication token format |
| **RBAC** | Role-Based Access Control - authorization based on user roles |
| **CDN** | Content Delivery Network - distributed server network for fast content delivery |
| **VPC** | Virtual Private Cloud - isolated cloud network environment |
| **ECS** | Elastic Container Service (AWS) - container orchestration platform |
| **TLS** | Transport Layer Security - cryptographic protocol for secure communication |
| **UUID** | Universally Unique Identifier - 128-bit identifier |
| **OpEx** | Operating Expenses - ongoing operational costs |
| **CapEx** | Capital Expenses - upfront infrastructure investment |

---

## Overview

The ADPA team architects the platform as a **multi-tenant cloud SaaS solution** designed for enterprise document processing and AI-powered automation. The platform requires continuous connectivity to AI providers and cloud infrastructure services.

---

## Deployment Model

### **Supported: Multi-Tenant Cloud SaaS**

ADPA is deployed as a **cloud-native, multi-tenant SaaS solution** with the following characteristics:

#### **Architecture**
- **Single shared infrastructure** serving multiple client organizations
- **Tenant isolation** via database row-level security (RLS) and application-level access control
- **Centralized management** for updates, scaling, and monitoring
- **Elastic scaling** based on aggregate demand across all tenants

#### **Technology Stack**
- **Frontend**: The frontend is built using Next.js 14 and deployed via Vercel's global edge network.
- **Backend**: The backend runs on Node.js/Express within containerized environments hosted on cloud infrastructure.
- **Database**: The system uses Supabase PostgreSQL as a serverless, fully-managed database solution.
- **Cache/Queue**: Redis serves as the caching and job queue layer, deployed via managed services such as Vercel KV or Redis Labs.
- **AI Providers**: The platform integrates with multiple AI providers including OpenAI, Google AI, Anthropic, DeepSeek, Mistral, Moonshot, and xAI.

#### **Key Benefits**
- **Cost Efficiency**: Shared infrastructure reduces per-tenant cost
- **Continuous Innovation**: All tenants receive updates simultaneously
- **Scalability**: Auto-scaling based on aggregate demand
- **Simplified Operations**: Single deployment for all customers
- **AI Provider Optimization**: Centralized API key management and rate limiting

#### **Data Isolation**
- **Database-level**: Supabase Row-Level Security (RLS) policies per tenant
- **Application-level**: JWT authentication with tenant-scoped queries
- **Storage-level**: Tenant-specific prefixes for file storage
- **Encryption**: Data encrypted at rest and in transit (TLS 1.3)

---

## **Not Supported: On-Premise Deployment**

ADPA **does not support on-premise deployment** for the following architectural reasons:

### **1. AI Provider Dependency**
- ADPA's core functionality relies on **continuous internet connectivity** to AI providers:
  - OpenAI (GPT-4, GPT-4 Turbo)
  - Google AI (Gemini 2.5 Pro, Gemini Flash)
  - Anthropic (Claude 3.5 Sonnet)
  - DeepSeek, Mistral, Moonshot, xAI
- **No offline mode**: AI-powered document generation, quality audits, entity extraction, and template optimization require real-time API calls
- **API key management**: Centralized credential management for AI providers is essential for security and cost control

### **2. Cloud-Native Services**
ADPA is tightly integrated with managed cloud services:
- **Supabase PostgreSQL**: Serverless database with built-in auth, storage, and real-time subscriptions
- **Vercel KV (Redis)**: Managed Redis for caching and job queues
- **CDN & Edge Functions**: Next.js Edge runtime for global performance
- **Automatic backups**: Cloud provider handles daily automated backups

### **3. Operational Complexity**
- **Continuous updates**: ADPA receives frequent feature updates, bug fixes, and security patches
- **AI model updates**: New AI models and providers are integrated regularly
- **Dependency management**: Node.js, PostgreSQL, Redis, and 50+ npm packages require constant maintenance
- **Security**: Managing SSL certificates, firewalls, OS patches, and intrusion detection on-premise is complex

### **4. Scalability**
- **Elastic scaling**: Cloud deployment auto-scales compute resources based on demand (AI job queues, document generation)
- **On-premise limitations**: Fixed hardware limits growth potential
- **Cost**: Cloud pricing is usage-based (pay for what you use); on-premise requires upfront CapEx for peak capacity

### **5. Compliance & Security**
- **Cloud SOC 2 / ISO 27001**: Supabase and Vercel maintain enterprise compliance certifications
- **Data residency**: Cloud providers offer region-specific deployments (US, EU, APAC)
- **Disaster recovery**: Cloud providers offer built-in geo-replication and automatic failover

---

## Multi-Tenancy Architecture

### **Tenant Isolation Strategy**

#### **Database Level (Supabase RLS)**
```sql
-- Example RLS policy for documents table
CREATE POLICY "Users can only access their organization's documents"
ON documents FOR ALL
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);
```

#### **Application Level**
- **JWT tokens** include `organizationId` claim (camelCase per JavaScript conventions)
- All queries filtered by `organizationId` at application layer before being converted to `organization_id` for database queries
- WebSocket rooms scoped to `organization:${orgId}` for real-time updates

**Identifier Naming Convention**: The platform uses `organization_id` (snake_case) in the database layer per SQL conventions and `organizationId` (camelCase) in the application layer per JavaScript/TypeScript conventions. The application layer performs automatic conversion between these formats.

#### **Storage Level**
- File paths prefixed with `organizations/${orgId}/documents/`
- Supabase Storage policies enforce organization-level access

### **Tenant Onboarding**
1. Organization created with unique `organization_id` (UUID)
2. Admin user provisioned and linked to organization
3. RLS policies automatically enforce data isolation
4. AI usage quota and billing plan assigned

---

## Security Considerations

### **Multi-Tenant SaaS Security**
- **Encryption**: All data is encrypted at rest using AES-256 and in transit using TLS 1.3.
- **Authentication**: The system implements JWT authentication with refresh tokens and bcrypt password hashing.
- **Authorization**: Role-Based Access Control (RBAC) combined with Row-Level Security (RLS) enforces granular permissions.
- **Audit Logging**: The platform logs all user actions to the `audit_logs` table for compliance and forensic analysis.
- **Rate Limiting**: API throttling per tenant prevents abuse and ensures fair resource allocation.
- **Input Validation**: Joi schemas validate all endpoint inputs to prevent malformed data.
- **SQL Injection Prevention**: The application uses parameterized queries exclusively to prevent SQL injection attacks.
- **XSS Protection**: Helmet middleware and content security policies protect against cross-site scripting attacks.

### **AI Provider Security**
- The backend stores API keys in `.env` files and never exposes them to client-side code.
- The operations team rotates API keys quarterly as part of the security maintenance schedule.
- The system tracks AI usage per tenant for accurate cost allocation and billing.
- The platform enforces rate limits to prevent quota exhaustion and abuse.

---

## Future Considerations

### **Enterprise Private Cloud (Potential Future Option)**
For highly regulated industries (finance, healthcare, government), a **dedicated instance model** could be explored:

- The system would provide dedicated infrastructure for a single tenant with physical resource isolation.
- The architecture would remain cloud-native but would deploy within an isolated Virtual Private Cloud (VPC) or subscription.
- The deployment would still require continuous internet connectivity for AI provider API access.
- Premium pricing would apply to cover the additional infrastructure and operational costs.

**Status**: Not currently planned, but architecturally feasible if demand exists.

### **Hybrid Model (Unlikely)**
- A hybrid approach would combine an on-premise database with cloud-based AI services.
- **Major challenges**: This model introduces significant latency, data transfer costs, and security complexity.
- **Status**: The ADPA team does not recommend this approach due to operational overhead and architectural complexity.

---

## Deployment Environments

### **Production (SaaS)**
- **URL**: `https://adpa.app` (or customer domain)
- **Database**: Supabase Pro (99.99% uptime SLA)
- **Cache**: Vercel KV (managed Redis)
- **Frontend**: Vercel (global edge network)
- **Backend**: Docker containers on AWS ECS / Azure Container Instances
- **Monitoring**: Sentry (errors), Supabase Analytics (database), Vercel Analytics (frontend)

### **Staging**
- **URL**: `https://staging.adpa.app`
- Mirror of production with test data
- Used for QA and customer acceptance testing

### **Development**
- **Local**: Docker Compose with local Supabase (`supabase start`)
- **Remote**: Supabase cloud dev project + Vercel preview deployments

---

## Scaling Strategy

### **Horizontal Scaling**
- **Frontend**: Vercel auto-scales Next.js instances globally
- **Backend**: Container orchestration (ECS/Kubernetes) with auto-scaling groups
- **Database**: Supabase connection pooling (PgBouncer) handles 10,000+ concurrent connections
- **Cache**: Redis cluster for high-throughput caching

### **Vertical Scaling**
- **Database**: Upgrade Supabase plan for more compute/storage
- **AI Queues**: Add more Bull queue workers for parallel AI job processing

---

## Logging, Monitoring, and Alerting Strategy

### **Comprehensive Observability Stack**

The ADPA platform implements a multi-layered monitoring strategy to ensure operational excellence, rapid incident detection, and proactive issue resolution.

#### **Application Logging**
- **Backend Logging**: Winston logging framework captures structured logs at multiple severity levels (error, warn, info, debug)
- **Log Destinations**: 
  - Local development: `server/logs/combined.log` and `server/logs/error.log`
  - Production: Centralized logging via Sentry for error tracking and aggregation
- **Log Structure**: JSON-formatted logs with contextual metadata (request IDs, user IDs, timestamps, stack traces)
- **Retention**: Error logs retained for 90 days, info logs for 30 days per compliance requirements

#### **Database Monitoring**
- **Supabase Analytics**: Real-time dashboard for database performance metrics
  - Query performance and slow query detection (queries >100ms flagged)
  - Connection pool utilization and connection leak detection
  - Storage utilization and growth trends
  - Replication lag monitoring (if applicable)
- **Automated Alerts**: Supabase generates alerts for database issues including connection pool exhaustion, storage threshold breaches (>80%), and query timeout spikes

#### **Frontend Monitoring**
- **Vercel Analytics**: Tracks frontend performance metrics
  - Core Web Vitals (LCP, FID, CLS) monitored per route
  - API route response times and error rates
  - Edge function invocation metrics and cold start latency
- **Real User Monitoring (RUM)**: Captures actual user experience data including page load times, API latency, and client-side errors
- **Error Tracking**: Sentry integration captures client-side JavaScript errors with full stack traces and user context

#### **Infrastructure Monitoring**
- **Container Health**: ECS/Kubernetes health checks monitor backend container status
  - Liveness probes at `/health` endpoint (every 30 seconds)
  - Readiness probes confirm database and Redis connectivity
  - Automatic container restart on consecutive health check failures (3 failures = restart)
- **Redis Monitoring**: Redis Labs/Vercel KV provides built-in monitoring
  - Memory utilization and eviction rates
  - Command latency and throughput metrics
  - Connection count and refused connections

#### **AI Provider Monitoring**
- **Usage Tracking**: `ai_usage_logs` table tracks all AI API calls
  - Token consumption per provider, model, and tenant
  - Cost per request and aggregate daily/monthly costs
  - Response times and error rates per provider
- **Rate Limit Monitoring**: Tracks proximity to provider rate limits and triggers alerts at 80% utilization
- **Provider Health Dashboard**: Real-time status of all configured AI providers (OpenAI, Google AI, Anthropic, etc.)

#### **Security Monitoring**
- **Audit Logs**: All user actions logged to `audit_logs` table for compliance
  - User authentication events (login, logout, failed attempts)
  - Data access and modification events
  - Administrative actions (user management, configuration changes)
- **Security Event Tracking**: `security_events` table captures potential threats
  - Failed authentication attempts (>5 failures = alert)
  - Suspicious API usage patterns (rate limit violations, unusual endpoints)
  - Unauthorized access attempts

#### **Alerting Configuration**

| Alert Type | Threshold | Notification Channel | Response Time SLA |
|------------|-----------|---------------------|-------------------|
| **Critical - System Down** | Health check failures >3 consecutive | PagerDuty → On-call engineer | <5 minutes |
| **Critical - Database Down** | Supabase unreachable >60 seconds | PagerDuty → On-call engineer | <5 minutes |
| **High - Error Rate Spike** | Error rate >5% over 5 minutes | Slack #alerts channel | <15 minutes |
| **High - AI Provider Failure** | Provider errors >10 consecutive | Slack #alerts channel | <15 minutes |
| **Medium - Performance Degradation** | API response time >2s (p95) | Email to DevOps team | <1 hour |
| **Medium - Storage Threshold** | Database storage >80% | Email to DevOps team | <1 hour |
| **Low - Rate Limit Warning** | AI provider usage >80% of quota | Email to DevOps team | <24 hours |

#### **Incident Response Workflow**
1. **Detection**: Automated monitoring detects anomaly and triggers alert
2. **Notification**: Alert routed to appropriate channel (PagerDuty, Slack, Email) based on severity
3. **Acknowledgment**: On-call engineer acknowledges alert within SLA timeframe
4. **Investigation**: Engineer reviews logs, metrics, and traces to diagnose root cause
5. **Remediation**: Engineer implements fix (code deploy, configuration change, infrastructure scaling)
6. **Verification**: Automated monitoring confirms issue resolution
7. **Post-Mortem**: For critical incidents, team conducts blameless post-mortem and documents lessons learned

---

## Disaster Recovery Plan

### **ADPA Responsibilities within Cloud Provider Framework**

ADPA leverages cloud provider infrastructure for disaster recovery while maintaining specific responsibilities for data protection and business continuity.

#### **Shared Responsibility Model**

| Component | Cloud Provider Responsibility | ADPA Responsibility |
|-----------|------------------------------|---------------------|
| **Physical Infrastructure** | Data center redundancy, power, cooling, physical security | None |
| **Database Infrastructure** | Supabase manages PostgreSQL replication, failover, hardware | Database schema, data integrity, backup validation |
| **Database Backups** | Supabase performs automated daily backups, 7-day retention | Extended backup retention (30 days), backup testing, point-in-time recovery procedures |
| **Application Deployment** | Vercel/ECS manages container orchestration, auto-scaling | Application code, deployment pipelines, rollback procedures |
| **Data Encryption** | Cloud provider encrypts storage at rest (AES-256) | Encryption key management, application-level encryption for sensitive fields |
| **Network Security** | Cloud provider DDoS protection, network isolation | Application-level security, CORS policies, rate limiting |

#### **Recovery Time Objective (RTO) and Recovery Point Objective (RPO)**

| Service Tier | RTO (Maximum Downtime) | RPO (Maximum Data Loss) | Implementation |
|--------------|------------------------|-------------------------|----------------|
| **Production** | <1 hour | <15 minutes | Automated failover, continuous replication, 15-minute backup intervals |
| **Staging** | <4 hours | <1 hour | Manual failover, hourly backups |
| **Development** | <24 hours | <24 hours | On-demand restoration from backups |

#### **Backup Strategy**

##### **Database Backups (Supabase)**
- **Automated Daily Backups**: Supabase performs daily full backups at 02:00 UTC, retained for 7 days (included in Pro plan)
- **Extended Retention**: ADPA exports weekly snapshots to AWS S3 for 30-day retention
  - **Schedule**: Every Sunday at 03:00 UTC via automated script
  - **Format**: Compressed `pg_dump` files encrypted with AES-256
  - **Storage**: AWS S3 with versioning enabled and lifecycle policy for automatic deletion after 30 days
- **Point-in-Time Recovery (PITR)**: Supabase supports PITR for Pro plan (restore to any point within 7 days)
- **Backup Testing**: Monthly restore tests to staging environment verify backup integrity (first Sunday of each month)

##### **Application Code & Configuration**
- **Version Control**: All code stored in GitHub with branch protection and mandatory code reviews
- **Configuration Backups**: Environment variables and secrets stored in 1Password (DevOps team vault)
- **Infrastructure as Code**: Deployment configurations stored in Git for reproducibility

##### **Redis Persistence**
- **RDB Snapshots**: Redis Labs performs hourly snapshots for persistence (configurable)
- **AOF (Append-Only File)**: Enabled for Redis persistence with fsync every second
- **Data Volatility**: Redis primarily stores ephemeral cache data; loss of Redis data does not result in permanent data loss (data regenerates from PostgreSQL)

#### **Disaster Recovery Procedures**

##### **Scenario 1: Database Failure**
1. **Detection**: Supabase health check fails; automated alert triggers PagerDuty
2. **Automatic Failover**: Supabase automatically fails over to replica (typically <60 seconds)
3. **ADPA Verification**: On-call engineer verifies application connectivity and data consistency
4. **User Notification**: If downtime exceeds 5 minutes, status page updated and customers notified via email

##### **Scenario 2: Complete Region Outage**
1. **Detection**: All services in primary region (e.g., AWS us-east-1) become unavailable
2. **Manual Failover**: DevOps team initiates manual failover to secondary region (e.g., AWS us-west-2)
   - Update DNS records to point to secondary region (5-minute TTL)
   - Restore latest S3 backup to secondary Supabase project
   - Deploy application containers to secondary ECS cluster
3. **Estimated Recovery Time**: 30-60 minutes (manual process)
4. **Data Loss**: Maximum 15 minutes (time since last automated backup or PITR point)
5. **Post-Recovery**: Conduct root cause analysis and update disaster recovery runbook

##### **Scenario 3: Data Corruption or Accidental Deletion**
1. **Detection**: User reports data inconsistency or missing data
2. **Assessment**: On-call engineer reviews audit logs to confirm data corruption or deletion event
3. **Point-in-Time Recovery**: Restore database to point immediately before corruption event using Supabase PITR
4. **Selective Restore**: If full restore not required, selectively restore affected tables/rows from backup
5. **Data Validation**: Verify restored data integrity and user confirmation before production deployment

##### **Scenario 4: Application Deployment Failure**
1. **Detection**: Automated deployment health checks fail or error rate spike detected
2. **Automatic Rollback**: CI/CD pipeline automatically rolls back to previous stable version
3. **Manual Intervention**: If automatic rollback fails, DevOps manually deploys last known good version
4. **Root Cause Analysis**: Team reviews deployment logs and identifies failure cause before next deployment

#### **Business Continuity Communication Plan**
- **Status Page**: Public status page at `status.adpa.app` provides real-time service status and incident updates
- **Customer Notifications**: Email notifications sent to all tenant administrators for incidents affecting >10 tenants or lasting >15 minutes
- **Internal Communication**: DevOps team uses Slack #incidents channel for real-time coordination during outages
- **Executive Escalation**: Incidents lasting >1 hour trigger automatic escalation to CTO and CEO

#### **Disaster Recovery Testing Schedule**
- **Quarterly**: Simulated disaster recovery drill (database restore from backup to staging)
- **Annually**: Full regional failover test (primary region to secondary region)
- **Monthly**: Backup validation (restore test to staging environment)
- **Continuous**: Automated health checks and failover mechanisms

---

## Cost Model

### **SaaS Pricing (Per Tenant)**
- **Starter**: $99/month (5 users, 1,000 AI generations/month)
- **Professional**: $299/month (20 users, 5,000 AI generations/month)
- **Enterprise**: Custom pricing (unlimited users, custom AI quota, dedicated support)

### **Infrastructure Costs**
- **Supabase**: $25/month (Pro) + overage for storage/bandwidth
- **Vercel**: $20/month (Pro) + overage for serverless function invocations
- **Redis**: $15/month (managed Redis Labs or Vercel KV)
- **AI Providers**: Usage-based (passed through to tenants with markup)

**Margin**: 70%+ gross margin due to shared infrastructure efficiency

---

## Summary

| Aspect | Multi-Tenant SaaS | On-Premise |
|--------|-------------------|------------|
| **Deployment Model** | ✅ Supported | ❌ Not Supported |
| **AI Provider Access** | ✅ Continuous connectivity | ❌ Requires internet (defeats purpose) |
| **Scalability** | ✅ Elastic, auto-scaling | ❌ Fixed capacity, manual scaling |
| **Updates** | ✅ Continuous, automatic | ❌ Manual, complex |
| **Cost** | ✅ OpEx, usage-based | ❌ CapEx + ongoing maintenance |
| **Security** | ✅ SOC 2, ISO 27001 | ❌ Customer-managed |
| **Data Isolation** | ✅ RLS + app-level | ⚠️ Physical isolation (higher cost) |
| **Maintenance** | ✅ Vendor-managed | ❌ Customer-managed |

**Decision**: The ADPA team designed the platform exclusively for **multi-tenant cloud SaaS deployment** to maximize value, minimize operational complexity, and ensure seamless AI integration.

---

**Document Version**: 1.1.0  
**Last Updated**: November 3, 2025  
**Author**: ADPA Architecture Team  
**Status**: Approved ✅