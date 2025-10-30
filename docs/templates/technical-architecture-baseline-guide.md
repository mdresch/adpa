# Technical Architecture Baseline - Template Guide

## Overview

The **Technical Architecture Baseline** is a PMBOK 7-compliant document that establishes the approved technology stack and technical standards for a project. It serves as the **Technical Baseline** component of the Project Baseline triad (Scope, Schedule, Cost, **Technical**).

---

## Framework Alignment

### **Primary Framework: PMBOK 7 - Technical Performance Domain**

This template aligns with **PMBOK Guide 7th Edition** and specifically addresses the **Technical Performance Domain**, which focuses on:

- Appropriate technology and tools for project work
- Technical knowledge and skills required
- Suitable physical resources for the project
- Integration of technical aspects with other project domains

### **Baseline Integration**

The Technical Architecture Baseline feeds directly into:

1. **Technical Baseline** (Project Baseline component)
   - Technology stack definition
   - Architecture patterns
   - Technical constraints
   - Integration architecture

2. **Resource Baseline**
   - Required technical skills
   - Technology expertise needs
   - Training requirements

3. **Cost Baseline**
   - Infrastructure costs
   - Licensing fees
   - Operational expenses

4. **Risk Baseline**
   - Technology risks (obsolescence, vendor lock-in, scalability)
   - Mitigation strategies

---

## When to Use This Template

### **✅ Create This Document When:**

1. **Project Initiation/Planning Phase**
   - After Project Charter approval
   - Before detailed technical work begins
   - When technology decisions need stakeholder approval

2. **Technology Selection Required**
   - Multiple technology options exist
   - Stakeholders need technical justification
   - Budget approval needed for tools/licenses

3. **Complex Technical Projects**
   - Multi-tier architecture (frontend, backend, data)
   - Cloud infrastructure required
   - DevOps/CI/CD pipeline needed
   - Regulatory/compliance requirements (GDPR, HIPAA, SOC 2)

4. **Enterprise Projects**
   - Large team (5+ developers)
   - Multi-environment deployment (dev, staging, prod)
   - Long-term maintenance (2+ years)
   - Vendor management required

### **❌ Skip This Document When:**

- Simple projects with minimal tech stack (<3 technologies)
- Proof-of-concept or prototypes
- Technology stack already standardized by organization
- No architectural decisions required

---

## Template Structure

### **Section 1: Executive Summary**
**Purpose:** High-level overview for non-technical stakeholders  
**AI Extraction:** Project name, date, baseline status

### **Section 2: Technology Stack by Layer**
**Purpose:** Detailed technology catalog organized by architectural layer  
**AI Extraction:** **Primary extraction target** - populates `technologies` table

**7 Layers Extracted:**
1. Frontend Layer (UI, components, state)
2. Backend Layer (runtime, framework, API)
3. Data Layer (database, cache, queue)
4. Infrastructure Layer (cloud, containers, orchestration)
5. DevOps & CI/CD Layer (version control, pipelines, IaC)
6. Testing & Quality Layer (unit, integration, E2E, code quality)
7. Monitoring & Observability Layer (APM, logging, metrics, alerting)

**Fields Per Technology:**
- Name, Category, Version, Purpose, License, Vendor, Deployment Environment

### **Section 3: Security & Compliance**
**Purpose:** Cross-cutting standards and requirements  
**AI Extraction:** Maps to `quality_standards` table (security-related only)

### **Section 4: Architecture Patterns**
**Purpose:** Document overall design approach  
**AI Extraction:** Populates `technical_baseline.architecture` field

### **Section 5: Technical Constraints**
**Purpose:** Limitations imposed by technology choices  
**AI Extraction:** Maps to `constraints` table (type='technical')

### **Section 6: Technology Selection Rationale**
**Purpose:** Justify technology decisions  
**AI Extraction:** Enriches technology `purpose` field

### **Section 7: Deployment Architecture**
**Purpose:** Environment configuration  
**AI Extraction:** Populates `deployment_environment` field

### **Section 8: Technical Risks**
**Purpose:** Technology-specific risks  
**AI Extraction:** Maps to `risks` table (type='technical')

### **Section 9: Technology Roadmap**
**Purpose:** Upgrade path and EOL planning  
**AI Extraction:** Currently not extracted (future enhancement)

### **Section 10: Baseline Approval**
**Purpose:** Sign-off and change control  
**AI Extraction:** Metadata only

---

## AI Extraction Behavior

### **What Gets Extracted**

When you upload a **Technical Architecture Baseline** document:

**Primary Target:** `technologies` table (14th entity type)

```sql
INSERT INTO technologies (
  project_id, name, category, description, 
  version, purpose, license, vendor, created_by
)
```

**Secondary Targets:**
- `quality_standards` (security/compliance standards)
- `constraints` (technical constraints)
- `risks` (technology risks)
- `technical_baseline.architecture` (architecture description)

### **Example Extraction**

**From Document:**
```markdown
**Frontend Layer:**
- React 18.3 (MIT License) - Component-based UI framework for building interactive dashboards
- Tailwind CSS 3.4 (MIT) - Utility-first CSS for rapid UI development
- Zustand 4.5 (MIT) - Lightweight state management for React
```

**Extracted to `technologies` Table:**
```json
[
  {
    "name": "React",
    "category": "frontend",
    "description": "Component-based UI framework for building interactive dashboards",
    "version": "18.3",
    "purpose": "Building interactive user interfaces",
    "license": "MIT License",
    "vendor": "Meta/Open Source",
    "deployment_environment": "production"
  },
  {
    "name": "Tailwind CSS",
    "category": "frontend",
    "description": "Utility-first CSS for rapid UI development",
    "version": "3.4",
    "purpose": "Styling and responsive design",
    "license": "MIT",
    "vendor": "Open Source",
    "deployment_environment": "all"
  }
  // ... etc.
]
```

---

## Integration with Phase 2 Baseline Creation

### **How Technologies Appear in Baselines**

**1. Technical Baseline → Architecture Section:**
```markdown
### 2.2 Architecture

Multi-tier application architecture comprising:

**Frontend Layer**: React 18.3, Next.js 14.2, Tailwind CSS 3.4 providing user interface and client-side logic.

**Backend Layer**: Node.js 18, Express 5.1 handling business logic, API endpoints, and server-side processing.

**Data Layer**: PostgreSQL 15, Redis 7 for data persistence and caching.

**Infrastructure**: AWS, Docker 24, Kubernetes for deployment, scaling, and cloud services.

**DevOps & CI/CD**: GitHub Actions, Terraform for automated build, test, and deployment pipelines.

**Testing & Quality**: Jest, Cypress, SonarQube for automated testing and quality assurance.

**Monitoring & Observability**: Datadog, Sentry for system monitoring and performance tracking.
```

**2. Appendix K: Technology Catalog**
```markdown
### Appendix K: Technology Catalog

**Total Technologies:** 25

| # | Name | Category | Version | Purpose | License | Vendor |
|:--|:-----|:---------|:--------|:--------|:--------|:-------|
| 1 | React | frontend | 18.3 | UI framework | MIT | Meta/Open Source |
| 2 | PostgreSQL | database | 15.x | Primary database | PostgreSQL License | Open Source |
... (all 25 technologies)
```

---

## Best Practices

### **When Creating the Document Manually**

1. **Be Specific with Versions**
   - ✅ Good: "React 18.3", "PostgreSQL 15.4"
   - ❌ Bad: "React (latest)", "PostgreSQL"

2. **Include Purpose/Rationale**
   - ✅ Good: "Redis for session caching and job queue management"
   - ❌ Bad: "Redis"

3. **Specify Deployment**
   - ✅ Good: "AWS EC2 in Frankfurt region (production)"
   - ❌ Bad: "Cloud"

4. **Document Licensing**
   - ✅ Good: "MIT License - no restrictions on commercial use"
   - ❌ Bad: "Open source"

5. **Categorize Correctly**
   - ✅ Good: Next.js → "frontend" (despite SSR backend)
   - ❌ Bad: Next.js → "backend"

### **For AI Extraction**

1. **Use Tables** - AI extracts tables more accurately
2. **Follow Template Structure** - Sections 2.1-2.7 map directly to categories
3. **Include Version Numbers** - Explicitly state versions
4. **Add Vendor Information** - Helps with licensing/procurement
5. **Document Rationale** - Populates `purpose` field

---

## Example: EcoTrack Project

**Expected Technologies to Extract (~25-30):**

**Frontend (5):**
- React 18.3, Next.js 14.2, Tailwind CSS 3.4, Recharts, Radix UI

**Backend (4):**
- Node.js 18, Express 5.1, Socket.io, Bull (Redis Queue)

**Data (4):**
- PostgreSQL 15 (Supabase), Redis 7, Elasticsearch (optional), S3 (file storage)

**Infrastructure (5):**
- AWS (EC2, RDS, S3, CloudFront), Docker 24, Nginx, Cloudflare

**DevOps (4):**
- GitHub Actions, Terraform, Docker Compose, NPM/pnpm

**Testing (4):**
- Jest, Cypress, Supertest, SonarQube

**Monitoring (4):**
- Datadog, Sentry, Winston (logging), Prometheus

**Total: ~30 technologies**

---

## Integration with ADPA Workflow

### **Step 1: Create/Upload Document**
1. Use template: `Technical Architecture Baseline`
2. Fill in technology details
3. Upload to project in ADPA

### **Step 2: Run AI Extraction**
1. Go to AI Extraction tab
2. Select provider: **OpenAI** (recommended)
3. Click "Extract Project Data"
4. Wait for extraction (14 entity types now)

### **Step 3: Verify Technologies**
1. Check extracted count in UI
2. Expected: ~25-30 technologies for typical project
3. Review categories and versions

### **Step 4: Create Baseline**
1. Click "Create Baseline from Entities"
2. View Technical Baseline → Architecture section
3. Should show categorized tech stack with versions
4. Check Appendix K for complete technology catalog

---

## Framework Comparison

| Framework | Focus | Complexity | ADPA Integration |
|-----------|-------|------------|------------------|
| **PMBOK 7** | Project management, technical domain | ⭐⭐ Simple | ✅ **Recommended** - Native support |
| **TOGAF** | Enterprise architecture | ⭐⭐⭐⭐ Complex | ⚠️ Requires custom extraction |
| **ISO 42010** | Architecture description | ⭐⭐⭐ Moderate | ⚠️ Requires custom extraction |
| **C4 Model** | Software architecture diagrams | ⭐⭐ Simple | ⚠️ Visual focus (not text) |
| **AWS Well-Architected** | Cloud architecture | ⭐⭐⭐ Moderate | ⚠️ AWS-specific |

**Verdict:** Use **PMBOK 7 Technical Baseline** for maximum ADPA compatibility

---

## Template Metadata

**Template Name:** `Technical Architecture Baseline`  
**Short Name:** `Tech Architecture Baseline`  
**Framework:** `PMBOK 7 - Technical Performance Domain`  
**Category:** `Technical Planning`  
**PMBOK Process Group:** `Planning`  
**Knowledge Area:** `Integration Management, Resource Management`  
**Baseline Component:** `Technical Baseline`  
**Entity Types Populated:** `technologies (primary), quality_standards, constraints, risks`  
**Typical Size:** `10-20 pages`  
**Creation Timing:** `After Project Charter, before detailed design`  
**Approval Required:** `Yes - CTO, Lead Architect, Security Officer`

---

## Summary

✅ **Framework:** PMBOK 7 - Technical Performance Domain  
✅ **Template Name:** "Technical Architecture Baseline"  
✅ **Purpose:** Define and approve project technology stack  
✅ **AI Extraction:** Populates 14th entity type (`technologies` table)  
✅ **Baseline Integration:** Generates Technical Baseline → Architecture section  
✅ **Phase 2 Compatible:** Creates baseline from entities in ~10 seconds  

**This template is now ready to use in ADPA!** 🚀

