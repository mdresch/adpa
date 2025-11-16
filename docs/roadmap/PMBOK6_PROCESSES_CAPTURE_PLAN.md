# PMBOK 6th Edition - 49 Processes Capture & Management Plan

**Status**: ✅ Seed File Complete - Ready for Migration  
**Priority**: High (Foundation for PMBOK 6th Edition compliance)  
**Timeline**: Ready for execution  
**Impact**: Enables comprehensive PMBOK 6th Edition process tracking and compliance

**✅ Decision Made**: Option A - Capture PMBOK 6th Edition 49 processes using publicly available information

**✅ Seed File Status**: Migration 337 (`337_pmbok6_processes_seed.sql`) contains all 49 processes with:
- Process names and descriptions
- Inputs (ITTOs)
- Tools & Techniques (ITTOs)
- Outputs (ITTOs)
- Process Group assignments
- Knowledge Area assignments

---

## 📋 Executive Summary

This plan outlines the approach to capture, store, and manage the **49 processes** from the **PMBOK Guide 6th Edition**, organized across **5 Process Groups** and **10 Knowledge Areas**. This will serve as a reference knowledge base and enable process compliance tracking for projects using PMBOK 6th Edition framework.

---

## 🎯 Objectives

1. **Capture all 49 PMBOK 6th Edition processes** with detailed descriptions
2. **Organize processes** by Process Groups and Knowledge Areas
3. **Enable process tracking** for projects (which processes are being used/applied)
4. **Support compliance reporting** (process coverage analysis)
5. **Provide reference documentation** accessible within the application
6. **Maintain compatibility** with existing PMBOK 8th Edition features

---

## 📊 Data Structure Analysis

### Process Groups (5)
1. **Initiating Process Group** (2 processes)
2. **Planning Process Group** (24 processes)
3. **Executing Process Group** (10 processes)
4. **Monitoring and Controlling Process Group** (12 processes)
5. **Closing Process Group** (1 process)

### Knowledge Areas (10)
1. **Integration Management** (7 processes)
2. **Scope Management** (4 processes)
3. **Schedule Management** (7 processes)
4. **Cost Management** (5 processes)
5. **Quality Management** (4 processes)
6. **Resource Management** (11 processes)
7. **Communications Management** (4 processes)
8. **Risk Management** (8 processes)
9. **Procurement Management** (3 processes)
10. **Stakeholder Management** (4 processes)

### Process Distribution Matrix
| Knowledge Area | Initiating | Planning | Executing | M & C | Closing | **Total** |
|---------------|------------|----------|-----------|-------|---------|-----------|
| Integration Management | 1 | 3 | 1 | 1 | 1 | **7** |
| Scope Management | 0 | 3 | 0 | 1 | 0 | **4** |
| Schedule Management | 0 | 6 | 0 | 1 | 0 | **7** |
| Cost Management | 0 | 4 | 0 | 1 | 0 | **5** |
| Quality Management | 0 | 2 | 1 | 1 | 0 | **4** |
| Resource Management | 0 | 4 | 6 | 1 | 0 | **11** |
| Communications Management | 0 | 2 | 1 | 1 | 0 | **4** |
| Risk Management | 0 | 6 | 1 | 1 | 0 | **8** |
| Procurement Management | 0 | 1 | 1 | 1 | 0 | **3** |
| Stakeholder Management | 1 | 1 | 1 | 1 | 0 | **4** |
| **Total by Process Group** | **2** | **24** | **10** | **12** | **1** | **49** |

---

## 🗄️ Database Schema Design

### Option 1: Reference Tables (Recommended)
**Purpose**: Store PMBOK 6th Edition as a reference knowledge base

```sql
-- PMBOK 6th Edition Process Groups
CREATE TABLE pmbok6_process_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL, -- 'INIT', 'PLAN', 'EXEC', 'MON', 'CLOSE'
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PMBOK 6th Edition Knowledge Areas
CREATE TABLE pmbok6_knowledge_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL, -- 'INTEGRATION', 'SCOPE', 'SCHEDULE', etc.
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PMBOK 6th Edition Processes (49 total)
CREATE TABLE pmbok6_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL, -- e.g., '4.1 Develop Project Charter'
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL, -- Full PMBOK Guide description
  process_group_id UUID NOT NULL REFERENCES pmbok6_process_groups(id),
  knowledge_area_id UUID NOT NULL REFERENCES pmbok6_knowledge_areas(id),
  
  -- Process details
  inputs JSONB, -- Array of input artifacts
  tools_and_techniques JSONB, -- Array of tools/techniques
  outputs JSONB, -- Array of output artifacts
  
  -- Metadata
  pmbok_section VARCHAR(50), -- Section reference in PMBOK Guide
  display_order INTEGER NOT NULL,
  is_core_process BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_pmbok6_processes_group ON pmbok6_processes(process_group_id);
CREATE INDEX idx_pmbok6_processes_knowledge_area ON pmbok6_processes(knowledge_area_id);
CREATE INDEX idx_pmbok6_processes_code ON pmbok6_processes(code);
```

### Option 2: Project Process Tracking
**Purpose**: Track which processes are applied to specific projects

```sql
-- Project Process Application (Many-to-Many)
CREATE TABLE project_pmbok6_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES pmbok6_processes(id) ON DELETE CASCADE,
  
  -- Application details
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'not_applicable')),
  application_date DATE,
  completion_date DATE,
  notes TEXT,
  
  -- Compliance tracking
  compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
  evidence_document_ids UUID[], -- References to documents that demonstrate process application
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(project_id, process_id)
);

CREATE INDEX idx_project_pmbok6_processes_project ON project_pmbok6_processes(project_id);
CREATE INDEX idx_project_pmbok6_processes_status ON project_pmbok6_processes(status);
```

---

## 📝 Data Collection Strategy

### Phase 1: Manual Data Entry (Initial)
1. **Source Material**: PMBOK Guide 6th Edition official documentation
2. **Data Entry Method**: 
   - Create seed script with all 49 processes
   - Include full descriptions from PMBOK Guide
   - Include inputs, tools & techniques, outputs for each process
3. **Validation**: 
   - Cross-reference with official PMBOK Guide
   - Verify process codes match PMBOK numbering
   - Ensure all 49 processes are captured

### Phase 2: AI-Assisted Enhancement (Future)
- Use AI to extract additional context
- Link processes to related entities (risks, stakeholders, deliverables)
- Generate process application guidance

---

## 🔧 Implementation Phases

### Phase 1: Database Schema & Seed Data ✅ Foundation
**Deliverables**:
- Migration script for `pmbok6_process_groups` table
- Migration script for `pmbok6_knowledge_areas` table
- Migration script for `pmbok6_processes` table
- Seed script with all 49 processes and their descriptions
- Migration script for `project_pmbok6_processes` (project tracking)

**Estimated Effort**: 4-6 hours
- 2 hours: Schema design and migration scripts
- 2-4 hours: Data entry for 49 processes

### Phase 2: API Endpoints 🔌 Access Layer
**Deliverables**:
- `GET /api/pmbok6/process-groups` - List all process groups
- `GET /api/pmbok6/knowledge-areas` - List all knowledge areas
- `GET /api/pmbok6/processes` - List all processes (with filters)
- `GET /api/pmbok6/processes/:id` - Get process details
- `GET /api/pmbok6/processes/by-group/:groupId` - Processes by group
- `GET /api/pmbok6/processes/by-knowledge-area/:kaId` - Processes by KA
- `GET /api/projects/:id/pmbok6-processes` - Processes applied to project
- `POST /api/projects/:id/pmbok6-processes` - Apply process to project
- `PUT /api/projects/:id/pmbok6-processes/:processId` - Update process application
- `GET /api/projects/:id/pmbok6-compliance` - Compliance report

**Estimated Effort**: 3-4 hours

### Phase 3: Frontend Components 🎨 User Interface
**Deliverables**:
- **PMBOK 6 Process Library Page** (`/pmbok6/processes`)
  - Filterable table/grid of all 49 processes
  - Filter by Process Group, Knowledge Area
  - Search by name/description
  - Process detail modal/drawer
  
- **Process Detail View**
  - Process name, description
  - Process Group and Knowledge Area badges
  - Inputs, Tools & Techniques, Outputs sections
  - Related processes
  
- **Project Process Tracking** (`/projects/:id/pmbok6-processes`)
  - Matrix view: Processes vs. Status
  - Process application checklist
  - Compliance dashboard
  - Evidence linking (documents)

- **Compliance Dashboard**
  - Process coverage percentage
  - Process Group completion status
  - Knowledge Area completion status
  - Visual progress indicators

**Estimated Effort**: 8-12 hours

### Phase 4: Integration & Analytics 📊 Intelligence
**Deliverables**:
- Link PMBOK 6 processes to extracted entities (risks, stakeholders, etc.)
- Process compliance scoring algorithm
- Automated process application suggestions based on project characteristics
- PMBOK 6 vs PMBOK 8 comparison views
- Process application analytics

**Estimated Effort**: 6-8 hours

---

## 📚 Data Requirements

### For Each Process, We Need:
1. **Process Code** (e.g., "4.1", "5.1", "6.1")
2. **Process Name** (e.g., "Develop Project Charter")
3. **Full Description** (from PMBOK Guide)
4. **Process Group** (Initiating, Planning, Executing, Monitoring & Controlling, Closing)
5. **Knowledge Area** (Integration, Scope, Schedule, Cost, Quality, Resource, Communications, Risk, Procurement, Stakeholder)
6. **Inputs** (list of input artifacts)
7. **Tools & Techniques** (list of tools and techniques)
8. **Outputs** (list of output artifacts)
9. **PMBOK Section Reference** (for traceability)

### Example Process Entry:
```json
{
  "code": "4.1",
  "name": "Develop Project Charter",
  "description": "The process of developing a document that formally authorizes the existence of a project and provides the project manager with the authority to apply organizational resources to project activities.",
  "process_group": "Initiating",
  "knowledge_area": "Integration Management",
  "inputs": [
    "Business documents",
    "Agreements",
    "Enterprise environmental factors",
    "Organizational process assets"
  ],
  "tools_and_techniques": [
    "Expert judgment",
    "Data gathering",
    "Interpersonal and team skills",
    "Meetings"
  ],
  "outputs": [
    "Project charter",
    "Assumptions log"
  ],
  "pmbok_section": "Section 4.1"
}
```

---

## 🔗 Integration Points

### With Existing Features:
1. **Projects**: Link processes to projects for tracking
2. **Documents**: Link documents as evidence of process application
3. **Templates**: PMBOK 6 process-specific templates
4. **Extraction**: AI extraction can identify which processes are being applied
5. **Analytics**: Process compliance metrics
6. **PMBOK 8**: Comparison views between 6th and 8th editions

### With Future Features:
1. **Process Automation**: Automated process execution workflows
2. **Compliance Reporting**: Regulatory compliance reports
3. **Training**: Process training materials and guides
4. **Best Practices**: Process-specific best practices library

---

## 🎨 UI/UX Considerations

### Process Library View:
- **Layout**: Card grid or table view
- **Filters**: Process Group, Knowledge Area, Search
- **Sorting**: By code, name, Process Group, Knowledge Area
- **Detail View**: Expandable cards or modal/drawer

### Project Process Tracking:
- **Matrix View**: Processes (rows) vs. Status (columns)
- **Checklist View**: Simple checkbox list
- **Compliance View**: Visual progress bars and percentages
- **Evidence View**: Document links and attachments

### Navigation:
- Add to main navigation: "PMBOK 6 Processes" or "Process Library"
- Add to project sidebar: "PMBOK 6 Compliance"
- Add to project settings: "Process Application"

---

## 📊 Success Metrics

1. **Completeness**: All 49 processes captured with descriptions
2. **Accuracy**: Process descriptions match PMBOK Guide 6th Edition
3. **Usability**: Users can easily find and reference processes
4. **Adoption**: Projects are tracking process application
5. **Compliance**: Compliance reports are being generated and used

---

## 🚀 Migration Strategy

### Step 1: Create Schema
- Run migration for reference tables
- Run migration for project tracking table

### Step 2: Seed Data
- Run seed script to populate all 49 processes
- Verify data integrity (count = 49)

### Step 3: API Development
- Create API routes
- Add authentication/authorization
- Add validation

### Step 4: Frontend Development
- Create process library page
- Create project tracking page
- Create compliance dashboard

### Step 5: Testing
- Unit tests for API endpoints
- Integration tests for data flow
- E2E tests for UI workflows

### Step 6: Documentation
- API documentation
- User guide for process tracking
- Admin guide for process management

---

## ⚠️ Considerations & Risks

### Data Quality:
- **Risk**: Incomplete or inaccurate process descriptions
- **Mitigation**: Use official PMBOK Guide 6th Edition as source, peer review

### Maintenance:
- **Risk**: PMBOK Guide updates (7th, 8th editions)
- **Mitigation**: Version the process data, maintain separate tables per edition

### Performance:
- **Risk**: Large dataset queries (49 processes × many projects)
- **Mitigation**: Proper indexing, pagination, caching

### User Adoption:
- **Risk**: Low adoption if not integrated into workflows
- **Mitigation**: Integrate into project creation, document generation, compliance reporting

---

## 📋 Next Steps

1. **Review & Approve Plan** ✅ (Current step)
2. **Create Database Schema** (Migration scripts)
3. **Collect & Enter Process Data** (Seed script)
4. **Develop API Endpoints**
5. **Build Frontend Components**
6. **Integration Testing**
7. **User Acceptance Testing**
8. **Deployment**

---

## 📖 References

- PMBOK Guide 6th Edition (Official PMI Publication)
- PMBOK Guide 7th Edition (For comparison)
- PMBOK Guide 8th Edition (For comparison)
- Existing ADPA PMBOK 8 implementation

---

## ✅ Resolved Questions

1. **Data Source**: ⚠️ **UPDATE**: User has access to official PMBOK Guide **7th Edition** PDF (from PMI membership), not 6th Edition. PMBOK 6th Edition 49 processes need to be sourced from publicly available information or PMBOK 6th Edition if available elsewhere.
2. **Licensing**: ✅ PMI Member License (Menno Drescher - 3051309). Development of applications and using the guide to optimize projects and processes is **permitted**. Not for distribution, sale, or reproduction. Content usage is for reference and development purposes, aligned with PMI's intentions.
3. **Versioning**: To be determined - may support multiple PMBOK editions simultaneously (6th Edition processes + 7th Edition principles/domains)
4. **Automation**: To be determined - may automate process application based on project characteristics
5. **Integration**: To be determined - integration depth with document generation and AI extraction

## ⚠️ Important Note: PMBOK 6th vs 7th Edition Structure

**PMBOK 6th Edition** (What we're capturing):
- **5 Process Groups** (Initiating, Planning, Executing, Monitoring & Controlling, Closing)
- **10 Knowledge Areas**
- **49 Processes** (process-based approach)

**PMBOK 7th Edition** (What user has PDF for):
- **12 Principles** (principles-based approach)
- **8 Performance Domains** (similar to PMBOK 8th Edition)
- **Project Management Standards** (not 49 processes)

**Decision Needed**: 
- **Option A**: Capture PMBOK 6th Edition 49 processes using publicly available information (process names, descriptions from public sources)
- **Option B**: Capture PMBOK 7th Edition content (12 Principles, 8 Performance Domains) from user's PDF
- **Option C**: Capture both (6th Edition processes + 7th Edition principles/domains)

## 📄 Data Extraction Approach

Since the PMBOK 6th Edition is available as a PDF:
- **Manual Extraction**: Extract process descriptions, inputs, tools & techniques, outputs from PDF
- **AI-Assisted Extraction**: Use AI to parse PDF and extract structured data (if PDF is text-searchable)
- **Validation**: Cross-reference extracted data with PMBOK Guide structure
- **Storage**: Store in Markdown format (per ADPA standards) for descriptions

---

**Document Status**: Approved - Phase 1 Schema Created  
**Last Updated**: 2025-01-XX  
**Next Review**: After Phase 1 completion

---

## ✅ Phase 1 Status: Database Schema Created

### Completed:
- ✅ Migration 337: Database schema created (`337_pmbok6_processes_reference.sql`)
- ✅ Seed file structure created (`337_pmbok6_processes_seed.sql`)
- ✅ All 5 Process Groups defined
- ✅ All 10 Knowledge Areas defined
- ✅ Process structure created (47 processes currently - needs verification to reach 49)

### Next Steps for Phase 1:
1. **Verify Process Count**: Cross-reference with PMBOK 6th Edition PDF to ensure all 49 processes are included
2. **Extract Full Descriptions**: Extract detailed descriptions, inputs, tools & techniques, and outputs from PDF
3. **Populate Seed Data**: Update seed file with complete process information
4. **Run Migration**: Execute migration scripts to create tables
5. **Validate Data**: Verify all 49 processes are correctly stored

### Data Extraction from PDF:
Since you have the PMBOK 6th Edition PDF, we can:
- **Option A**: Manual extraction - You provide the process descriptions, I'll format and insert them
- **Option B**: AI-assisted extraction - If PDF is text-searchable, use AI to extract structured data
- **Option C**: Hybrid - I create a template/script, you fill in the details from PDF

**Recommendation**: Option C - I'll create a comprehensive seed script template with placeholders for all 49 processes, and you can fill in the detailed descriptions from your PDF.

