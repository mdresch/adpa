# ADPA Sitemap & Navigation Structure

**Document Version:** 1.0  
**Date:** Week 1, Phase 1  
**Status:** Current State Analysis & Recommendations

---

## Executive Summary

This document provides a comprehensive mapping of the ADPA application's current route structure, navigation hierarchy, and recommended URL patterns. It serves as the foundation for navigation improvements and route organization.

---

## 1. Current Navigation Structure

### 1.1 Primary Navigation (Sidebar)

Based on `components/sidebar.tsx`, the main navigation includes:

| Order | Name | Route | Icon | Badge |
|-------|------|-------|------|-------|
| 1 | Dashboard | `/` | LayoutDashboard | - |
| 2 | Projects | `/projects` | FolderOpen | - |
| 3 | Approvals | `/approvals` | CheckCircle | Pending count |
| 4 | Search | `/search` | Search | - |
| 5 | AI Providers | `/ai-providers` | Zap | - |
| 6 | AI Analytics | `/ai-analytics` | TrendingUp | - |
| 7 | Integrations | `/integrations` | LinkIcon | - |
| 8 | Templates | `/templates` | FileText | - |
| 9 | Template Builder | `/templates/builder` | Layers | - |
| 10 | Process Flow Workflow | `/process-flow` | Workflow | - |
| 11 | Users & Roles | `/users` | Users | - |
| 12 | Job Monitor | `/jobs` | Activity | - |
| 13 | Analytics | `/analytics` | BarChart3 | - |
| 14 | Security | `/security` | Shield | - |
| 15 | System Settings | `/settings` | Settings | - |

---

## 2. Complete Route Mapping

### 2.1 Public/Authentication Routes

```
/auth/login          → Authentication login page
/login               → Alternative login route (redirects to /auth/login)
```

**Status:** ✅ Both routes exist  
**Recommendation:** Consolidate to single `/login` route

---

### 2.2 Landing & Dashboard

```
/                    → Main dashboard/homepage
```

**File:** `app/page.tsx`  
**Status:** ✅ Active  
**Purpose:** Main landing page and dashboard overview

---

### 2.3 Projects Section

#### Main Routes
```
/projects                    → Projects list/grid view
/projects/[id]               → Project detail page (with tabs)
/projects/[id]/dashboard     → Project dashboard view
/projects/[id]/documents      → Project documents list
/projects/[id]/documents/[docId]           → Document detail/metadata
/projects/[id]/documents/[docId]/entities  → Document extracted entities
/projects/[id]/documents/[docId]/view      → Document viewer
/projects/[id]/documents/deleted            → Deleted documents
/projects/[id]/drift                        → Project drift analysis
/projects/[id]/tasks                        → Project tasks management
/projects/[id]/baseline/approval            → Baseline approval workflow
```

**Status:** ✅ All routes implemented  
**Navigation:** Accessible via sidebar "Projects" → individual project

---

### 2.4 Programs Section

```
/programs                    → Programs list
/programs/[id]               → Program detail page
/programs/[id]/dashboard     → Program dashboard
/programs/[id]/prioritize    → Program prioritization matrix
/programs/[id]/settings      → Program settings
```

**Status:** ✅ All routes implemented  
**Navigation:** Not in main sidebar (accessible via portfolio or direct URL)

---

### 2.5 Portfolio Section

```
/portfolio                   → Portfolio overview
/portfolio/prioritize        → Portfolio prioritization
/portfolio/okrs              → Portfolio OKRs dashboard
```

**Status:** ✅ All routes implemented  
**Navigation:** Not in main sidebar (may be accessed via programs)

---

### 2.6 Documents Section

```
/documents                   → Documents list (if exists)
/documents/new               → Create new document
/documents/[id]/view         → Document viewer
/documents/[id]/sign         → Document signing interface
/documents/[id]/collaborate  → Document collaboration
```

**Status:** ✅ All routes implemented  
**Navigation:** Documents are primarily accessed via projects

---

### 2.7 Templates Section

```
/templates                   → Templates list
/templates/builder           → Template builder (visual editor)
/templates/[id]              → Template detail/view
/templates/[id]/edit        → Template editor
```

**Status:** ✅ All routes implemented  
**Navigation:** Accessible via sidebar "Templates" and "Template Builder"

---

### 2.8 Integrations Section

```
/integrations                → Integrations hub/overview
/integrations/confluence     → Confluence integration
/integrations/github         → GitHub integration
/integrations/sharepoint     → SharePoint integration
```

**Status:** ✅ All routes implemented  
**Navigation:** Accessible via sidebar "Integrations"

---

### 2.9 AI & Analytics Section

```
/ai                          → AI overview/dashboard
/ai-providers                → AI providers list
/ai-providers/[id]           → AI provider detail
/ai-providers/[id]/model/[modelId]  → Model analytics
/ai-analytics                → AI usage analytics
/analytics                   → System analytics dashboard
```

**Status:** ✅ All routes implemented  
**Navigation:** Accessible via sidebar "AI Providers", "AI Analytics", and "Analytics"

---

### 2.10 Process Flow & Workflows

```
/process-flow                → Process flow workflow dashboard
/process-flow/visual-pipeline → Visual pipeline monitor
```

**Status:** ✅ All routes implemented  
**Navigation:** Accessible via sidebar "Process Flow Workflow"

---

### 2.11 Onboarding & Assessment

```
/onboarding/upload           → Document upload onboarding
/onboarding/assessments      → Assessments list
/onboarding/assessment/[batchId] → Assessment batch detail
```

**Status:** ✅ All routes implemented  
**Navigation:** Not in main sidebar (likely accessed via direct links or email)

---

### 2.12 Approvals Section

```
/approvals                   → Approvals list
/approvals/[id]              → Approval detail
```

**Status:** ✅ All routes implemented  
**Navigation:** Accessible via sidebar "Approvals" (with badge count)

---

### 2.13 Admin Section

```
/admin/prioritization-criteria → Prioritization criteria management
/admin/quality/dashboard      → Quality dashboard
/admin/quality/template-improvements → Template quality improvements
/admin/quality-trends         → Quality trends analysis
```

**Status:** ✅ All routes implemented  
**Navigation:** Not in main sidebar (admin-only, likely accessed via direct URL or admin menu)

---

### 2.14 System Management

```
/users                       → User management
/jobs                        → Job queue monitor
/security                    → Security dashboard
/settings                    → System settings
/search                      → Global search
```

**Status:** ✅ All routes implemented  
**Navigation:** Accessible via sidebar

---

### 2.15 Demo/Development Routes

```
/demo-document-viewer        → Demo document viewer (dev)
/demo-rag-status            → Demo RAG status (dev)
/ecs-ai                      → ECS AI demo (dev)
```

**Status:** ✅ Routes exist  
**Recommendation:** Move to `/demo/*` prefix or remove in production

---

## 3. Route Organization Analysis

### 3.1 Current Structure Strengths

✅ **Clear separation** of concerns (projects, programs, templates, etc.)  
✅ **Consistent nesting** for detail pages (`/[resource]/[id]`)  
✅ **Logical grouping** of related functionality  
✅ **RESTful patterns** for resource access

### 3.2 Areas for Improvement

⚠️ **Missing from sidebar:**
- Programs (`/programs`)
- Portfolio (`/portfolio`)
- Onboarding routes (`/onboarding/*`)
- Admin routes (`/admin/*`)

⚠️ **Inconsistent patterns:**
- Some routes use `/dashboard` sub-route (projects, programs)
- Some routes use tabs within detail page (projects)
- Mixed use of `/view` vs direct access

⚠️ **Demo routes** should be organized under `/demo/*` prefix

---

## 4. Recommended URL Structure

### 4.1 Proposed Route Organization

```
# Public Routes
/login                      → Authentication
/register                   → User registration (if needed)

# Dashboard & Landing
/                           → Main dashboard
/dashboard                  → Alternative dashboard route (redirects to /)

# Core Resources
/projects                   → Projects list
/projects/[id]              → Project detail (with tabs)
/projects/[id]/documents    → Project documents
/projects/[id]/tasks        → Project tasks
/projects/[id]/stakeholders → Project stakeholders
/projects/[id]/baseline     → Project baseline
/projects/[id]/drift        → Project drift analysis
/projects/[id]/settings     → Project settings

/programs                   → Programs list
/programs/[id]              → Program detail (with tabs)
/programs/[id]/projects     → Program projects
/programs/[id]/risks        → Program risks
/programs/[id]/reports      → Program reports
/programs/[id]/settings     → Program settings

/portfolio                  → Portfolio overview
/portfolio/okrs            → Portfolio OKRs
/portfolio/prioritize       → Portfolio prioritization

# Documents
/documents                  → All documents (cross-project)
/documents/[id]             → Document detail
/documents/[id]/view        → Document viewer
/documents/[id]/sign        → Document signing
/documents/[id]/metadata    → Document metadata
/documents/[id]/entities    → Extracted entities

# Templates
/templates                  → Templates list
/templates/builder          → Template builder
/templates/[id]             → Template detail
/templates/[id]/edit        → Template editor

# Integrations
/integrations               → Integrations hub
/integrations/confluence    → Confluence
/integrations/github        → GitHub
/integrations/sharepoint    → SharePoint

# AI & Analytics
/ai                         → AI overview
/ai/providers               → AI providers (consolidate from /ai-providers)
/ai/providers/[id]          → Provider detail
/ai/analytics               → AI analytics (consolidate from /ai-analytics)
/analytics                  → System analytics

# Workflows
/workflows                  → Workflows list (rename from /process-flow)
/workflows/[id]             → Workflow detail
/workflows/visual-pipeline  → Visual pipeline

# Onboarding
/onboarding                 → Onboarding hub
/onboarding/upload          → Document upload
/onboarding/assessments     → Assessments
/onboarding/assessment/[id] → Assessment detail

# Approvals
/approvals                  → Approvals list
/approvals/[id]             → Approval detail

# Admin (Admin-only)
/admin                      → Admin dashboard
/admin/users                → User management (consolidate from /users)
/admin/quality              → Quality management
/admin/prioritization       → Prioritization criteria
/admin/settings             → Admin settings

# System
/jobs                       → Job monitor
/security                   → Security dashboard
/settings                   → User settings
/search                     → Global search

# Demo/Dev (Development only)
/demo/document-viewer       → Demo document viewer
/demo/rag-status           → Demo RAG status
```

---

## 5. Navigation Hierarchy Recommendations

### 5.1 Proposed Sidebar Structure

```
📊 Dashboard
📁 Projects
📋 Programs
📑 Portfolio
📄 Documents
📝 Templates
   └─ Template Builder
🔗 Integrations
   ├─ Confluence
   ├─ GitHub
   └─ SharePoint
🤖 AI & Analytics
   ├─ AI Providers
   ├─ AI Analytics
   └─ System Analytics
⚙️ Workflows
   └─ Visual Pipeline
✅ Approvals (with badge)
👥 Users & Roles
📊 Job Monitor
🔒 Security
⚙️ Settings
🔍 Search
```

### 5.2 Breadcrumb Structure

Example for project document:
```
Home > Projects > [Project Name] > Documents > [Document Name] > Metadata
```

Example for program:
```
Home > Programs > [Program Name] > Settings
```

---

## 6. Route Group Recommendations

### 6.1 Current Route Groups

- `(dashboard)` - Dashboard-specific components (not a route group in Next.js sense)

### 6.2 Proposed Route Groups

Consider using Next.js route groups for organization:

```
app/
├── (auth)/
│   ├── login/
│   └── register/
├── (dashboard)/
│   ├── page.tsx (main dashboard)
│   ├── projects/
│   ├── programs/
│   └── portfolio/
├── (admin)/
│   ├── admin/
│   └── users/
└── (demo)/
    └── demo/
```

---

## 7. URL Naming Conventions

### 7.1 Current Patterns

✅ **Resource lists:** `/resources` (plural)  
✅ **Resource detail:** `/resources/[id]`  
✅ **Nested resources:** `/resources/[id]/sub-resources`  
✅ **Actions:** `/resources/[id]/action` (e.g., `/approve`, `/sign`)

### 7.2 Recommended Patterns

- **Use kebab-case** for multi-word routes: `/ai-providers` ✅
- **Use singular** for detail pages: `/project/[id]` (but current `/projects/[id]` is acceptable)
- **Use verbs** for actions: `/documents/[id]/sign`, `/approvals/[id]/approve`
- **Use nouns** for resources: `/templates`, `/integrations`

---

## 8. Missing Routes (To Consider)

### 8.1 User-Facing Routes

- `/register` - User registration
- `/forgot-password` - Password reset
- `/profile` - User profile
- `/notifications` - Notifications center (currently in header)

### 8.2 Admin Routes

- `/admin/dashboard` - Admin dashboard
- `/admin/audit-logs` - Audit logs
- `/admin/system-health` - System health monitoring

### 8.3 Documentation Routes

- `/docs` - Documentation hub
- `/docs/api` - API documentation
- `/docs/guides` - User guides

---

## 9. Route Access Control

### 9.1 Public Routes

- `/login`
- `/register` (if implemented)

### 9.2 Authenticated Routes

- All routes except `/login` and `/register`

### 9.3 Admin-Only Routes

- `/admin/*`
- `/users` (user management)
- `/security`
- `/settings` (system settings)

### 9.4 Role-Based Access

- **Manager:** Projects, Programs, Portfolio, Approvals
- **Admin:** All routes + Admin section
- **User:** Projects (assigned), Documents, Templates

---

## 10. Proposed Changes to `app/` Structure

### 10.1 Consolidations

1. **AI Routes:**
   - Move `/ai-providers` → `/ai/providers`
   - Move `/ai-analytics` → `/ai/analytics`
   - Keep `/ai` as overview

2. **Admin Routes:**
   - Move `/users` → `/admin/users`
   - Keep `/admin/*` structure

3. **Demo Routes:**
   - Move `/demo-*` → `/demo/*`

### 10.2 New Routes to Add

```
/app/register/page.tsx
/app/profile/page.tsx
/app/notifications/page.tsx
/app/admin/dashboard/page.tsx
/app/admin/audit-logs/page.tsx
/app/docs/page.tsx
```

---

## 11. Navigation Component Updates

### 11.1 Sidebar Updates Needed

Add missing routes to sidebar navigation:
- Programs
- Portfolio
- Admin section (for admin users)

### 11.2 Breadcrumb Component

Consider adding breadcrumb navigation component for deep navigation.

---

## 12. Implementation Priority

### Phase 1 (High Priority)
1. ✅ Document current routes (this document)
2. Add missing routes to sidebar
3. Consolidate AI routes (`/ai-providers` → `/ai/providers`)
4. Add breadcrumb navigation

### Phase 2 (Medium Priority)
1. Consolidate admin routes
2. Organize demo routes
3. Add user profile route
4. Add notifications page

### Phase 3 (Low Priority)
1. Add documentation routes
2. Add registration route
3. Implement route groups for better organization

---

## 13. Route Statistics

### Current Route Count

- **Total Routes:** 57+ page routes
- **Top-Level Routes:** 25+
- **Nested Routes:** 32+
- **Dynamic Routes:** 15+ (`[id]`, `[docId]`, `[batchId]`, etc.)

### Route Categories

| Category | Count | Examples |
|---------|-------|----------|
| Projects | 10+ | `/projects`, `/projects/[id]/*` |
| Programs | 5+ | `/programs`, `/programs/[id]/*` |
| Documents | 6+ | `/documents`, `/documents/[id]/*` |
| Templates | 4+ | `/templates`, `/templates/[id]/*` |
| Integrations | 4+ | `/integrations/*` |
| AI/Analytics | 6+ | `/ai-*`, `/analytics` |
| Admin | 4+ | `/admin/*` |
| System | 5+ | `/settings`, `/security`, `/jobs` |
| Onboarding | 3+ | `/onboarding/*` |
| Demo/Dev | 3+ | `/demo-*` |

---

## 14. Next Steps

1. **Review this document** with product/design team
2. **Prioritize route consolidations** based on user impact
3. **Update sidebar navigation** to include missing routes
4. **Implement breadcrumb navigation** for better UX
5. **Create route group structure** for better organization
6. **Add missing routes** (profile, notifications, etc.)

---

## Appendix A: Complete Route List

### A.1 All Existing Routes

```
/ (root)
/login
/auth/login
/projects
/projects/[id]
/projects/[id]/dashboard
/projects/[id]/documents
/projects/[id]/documents/[docId]
/projects/[id]/documents/[docId]/entities
/projects/[id]/documents/[docId]/view
/projects/[id]/documents/deleted
/projects/[id]/drift
/projects/[id]/tasks
/projects/[id]/baseline/approval
/programs
/programs/[id]
/programs/[id]/dashboard
/programs/[id]/prioritize
/programs/[id]/settings
/portfolio
/portfolio/prioritize
/portfolio/okrs
/documents/new
/documents/[id]/view
/documents/[id]/sign
/documents/[id]/collaborate
/templates
/templates/builder
/templates/[id]
/templates/[id]/edit
/integrations
/integrations/confluence
/integrations/github
/integrations/sharepoint
/ai
/ai-providers
/ai-providers/[id]
/ai-providers/[id]/model/[modelId]
/ai-analytics
/analytics
/process-flow
/process-flow/visual-pipeline
/onboarding/upload
/onboarding/assessments
/onboarding/assessment/[batchId]
/approvals
/approvals/[id]
/admin/prioritization-criteria
/admin/quality/dashboard
/admin/quality/template-improvements
/admin/quality-trends
/users
/jobs
/security
/settings
/search
/demo-document-viewer
/demo-rag-status
/ecs-ai
```

---

## Appendix B: Route Mapping to Files

### B.1 File Structure Reference

All routes correspond to `app/**/page.tsx` files. The Next.js App Router automatically creates routes based on the file structure.

**Example:**
- `app/projects/[id]/page.tsx` → `/projects/[id]`
- `app/templates/builder/page.tsx` → `/templates/builder`

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Week 1, Phase 1 | Initial sitemap documentation | ADPA Team |

---

**End of Document**

