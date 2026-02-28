# Atlassian AI Integration: Entity Extraction & Baseline Management

## Executive Summary

This specification outlines ADPA's advanced entity extraction, baseline management, and drift detection capabilities that enhance Atlassian's AI-driven collaboration tools. The system enables proactive project management through intelligent entity recognition, baseline comparison, anomaly detection, and continuous improvement cycles.

## Table of Contents

1. [Overview](#overview)
2. [Core Features](#core-features)
3. [Architecture](#architecture)
4. [Entity Extraction System](#entity-extraction-system)
5. [Baseline Management](#baseline-management)
6. [Drift Detection](#drift-detection)
7. [Lessons Learned & Continuous Improvement](#lessons-learned--continuous-improvement)
8. [Maturity Assessment & Onboarding](#maturity-assessment--onboarding)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Technical Specifications](#technical-specifications)

---

## Overview

### Vision

Transform ADPA into an intelligent project management platform that:
- **Extracts** key entities (stakeholders, deliverables, milestones, risks, requirements) from project documents
- **Establishes** baselines for project entities to track project health
- **Detects** drift and anomalies early in project phases
- **Learns** from past projects to improve future ones
- **Enhances** Atlassian tools (Confluence, Jira) with AI-powered insights

### Value Proposition

1. **Early Drift Detection**: Identify scope creep, resource misalignment, and compliance issues before they become critical
2. **Baseline Comparison**: Compare current project state against established baselines to maintain project integrity
3. **Lessons Learned**: Capture and reuse knowledge from previous projects to improve standards and best practices
4. **Continuous Improvement**: Evolve project management standards based on real-world project data
5. **Immediate Value**: Onboarding features that deliver value from day one

---

## Core Features

### 1. Entity Extraction & Recognition

**Purpose**: Automatically identify and extract key project entities from documents

**Entities to Extract**:
- **Stakeholders**: Names, roles, responsibilities, influence, interest
- **Deliverables**: Descriptions, due dates, dependencies, owners
- **Milestones**: Dates, descriptions, success criteria
- **Risks**: Risk descriptions, probability, impact, mitigation strategies
- **Requirements**: Functional, non-functional, acceptance criteria
- **Activities/Tasks**: Descriptions, durations, resources, dependencies
- **Assumptions**: Assumption statements, validation status
- **Constraints**: Budget, time, resource limitations
- **Dependencies**: Internal and external dependencies
- **Resources**: Team members, skills, allocation

**AI Capabilities**:
- Multi-provider AI support (OpenAI, Google AI, Azure, Mistral)
- Context-aware extraction using project history
- Confidence scoring for extracted entities
- Entity relationship mapping
- Semantic understanding of entity types

### 2. Baseline Management

**Purpose**: Establish and maintain project baselines for entity comparison

**Baseline Types**:
- **Project Baseline**: Initial approved project state
- **Phase Baseline**: Baseline at each project phase gate
- **Milestone Baseline**: Baseline at key milestones
- **Version Baseline**: Baseline for each document version

**Baseline Operations**:
- Create baseline from current project state
- Compare current state against baseline
- Approve baseline changes (drift acceptance)
- Revert to baseline if needed
- Baseline versioning and history

### 3. Drift Detection & Anomaly Detection

**Purpose**: Identify deviations from established baselines and project norms

**Drift Types**:
- **Scope Drift**: New deliverables, requirements, or stakeholders not in baseline
- **Timeline Drift**: Milestone or deliverable date changes
- **Resource Drift**: Resource allocation changes
- **Risk Drift**: New risks or risk severity changes
- **Compliance Drift**: Deviation from standards (PMBOK, BABOK, DMBOK)
- **Quality Drift**: Quality metrics degradation

**Detection Methods**:
- Real-time comparison during document updates
- Scheduled baseline comparisons
- Anomaly detection using ML models
- Pattern recognition from historical projects
- Threshold-based alerts

**Alert System**:
- Immediate alerts for critical drift
- Daily/weekly summary reports
- Jira issue creation for significant drift
- Confluence page updates with drift analysis
- Email notifications to stakeholders

### 4. Lessons Learned & Knowledge Reuse

**Purpose**: Capture and leverage knowledge from completed projects

**Lessons Learned Capture**:
- Entity extraction patterns that worked well
- Common drift patterns and resolutions
- Best practices for entity management
- Compliance successes and failures
- Resource allocation optimizations

**Knowledge Reuse**:
- Suggest entity extraction improvements based on past projects
- Recommend baseline structures from similar projects
- Provide drift resolution strategies from historical data
- Offer compliance templates from successful projects
- Suggest operating model improvements

### 5. Continuous Improvement Cycle

**Purpose**: Evolve project management standards based on real-world data

**Improvement Process**:
1. **Collect**: Gather entity data, drift patterns, and outcomes from all projects
2. **Analyze**: Identify patterns, trends, and improvement opportunities
3. **Standardize**: Update company standards and best practices
4. **Implement**: Apply improved standards to new projects
5. **Measure**: Track effectiveness of improvements
6. **Iterate**: Continue the cycle

**Standardization Areas**:
- Entity extraction accuracy
- Baseline establishment procedures
- Drift detection thresholds
- Compliance requirements
- Operating model governance

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    ADPA Core Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Entity Extraction│  │ Baseline Manager │                │
│  │    Service       │  │     Service      │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                     │                            │
│           └──────────┬──────────┘                            │
│                      │                                        │
│           ┌──────────▼──────────┐                            │
│           │  Drift Detection    │                            │
│           │     Service         │                            │
│           └──────────┬──────────┘                            │
│                      │                                        │
│           ┌──────────▼──────────┐                            │
│           │ Lessons Learned &   │                            │
│           │  Improvement Engine  │                            │
│           └──────────┬──────────┘                            │
│                      │                                        │
└──────────────────────┼──────────────────────────────────────┘
                       │
                       │ Integration Layer
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Atlassian Integration                           │
├──────────────────────────────────────────────────────────────┤
│  • Confluence: Enhanced document publishing with entities    │
│  • Jira: Automated issue creation for drift detection        │
│  • Atlassian Intelligence: AI-powered insights              │
└──────────────────────────────────────────────────────────────┘
```

### Database Schema

#### New Tables

1. **project_entity_baselines**
   - Stores baseline snapshots of project entities
   - Links to projects and baseline versions
   - JSONB storage for entity data

2. **entity_extractions**
   - Stores extracted entities from documents
   - Links to documents, projects, and extraction jobs
   - Confidence scores and metadata

3. **drift_detections**
   - Records detected drift events
   - Links to baselines and current state
   - Drift type, severity, and resolution status

4. **lessons_learned**
   - Captures lessons from projects
   - Entity patterns, best practices, improvements
   - Links to projects and entities

5. **improvement_suggestions**
   - AI-generated suggestions for project improvement
   - Based on lessons learned and historical data
   - Links to projects and standards

6. **maturity_assessments**
   - Tracks project maturity levels
   - Assessment criteria and scores
   - Improvement recommendations

---

## Entity Extraction System

### Extraction Pipeline

```
Document Input
    ↓
Pre-processing (Markdown parsing, structure analysis)
    ↓
AI Entity Extraction (Multi-provider, context-aware)
    ↓
Entity Validation & Confidence Scoring
    ↓
Entity Relationship Mapping
    ↓
Entity Storage & Indexing
    ↓
Baseline Comparison (if baseline exists)
    ↓
Drift Detection
    ↓
Notification & Reporting
```

### Entity Types & Schemas

#### Stakeholder Entity
```typescript
interface StakeholderEntity {
  id: string
  name: string
  role: string
  organization?: string
  influence: 'high' | 'medium' | 'low'
  interest: 'high' | 'medium' | 'low'
  responsibilities: string[]
  contact_info?: {
    email?: string
    phone?: string
  }
  extraction_confidence: number
  source_document_id: string
  extracted_at: Date
}
```

#### Deliverable Entity
```typescript
interface DeliverableEntity {
  id: string
  name: string
  description: string
  due_date?: Date
  owner_id?: string
  status: 'planned' | 'in_progress' | 'completed' | 'blocked'
  dependencies: string[] // Other deliverable IDs
  acceptance_criteria: string[]
  extraction_confidence: number
  source_document_id: string
  extracted_at: Date
}
```

#### Risk Entity
```typescript
interface RiskEntity {
  id: string
  description: string
  category: string
  probability: 'high' | 'medium' | 'low'
  impact: 'high' | 'medium' | 'low'
  mitigation_strategy?: string
  owner_id?: string
  status: 'identified' | 'mitigated' | 'closed'
  extraction_confidence: number
  source_document_id: string
  extracted_at: Date
}
```

### AI Extraction Prompts

#### Stakeholder Extraction Prompt
```
Extract all stakeholders mentioned in this project document. For each stakeholder, identify:
- Full name
- Role or title
- Organization (if mentioned)
- Level of influence (high/medium/low)
- Level of interest (high/medium/low)
- Key responsibilities mentioned
- Contact information (if available)

Return as JSON array with confidence scores for each extraction.
```

#### Deliverable Extraction Prompt
```
Extract all deliverables, milestones, and key activities from this project document. For each, identify:
- Name or description
- Due date or timeline
- Owner or responsible party
- Dependencies on other deliverables
- Acceptance criteria or success criteria
- Current status (if mentioned)

Return as JSON array with confidence scores.
```

---

## Baseline Management

### Baseline Creation

**Trigger Events**:
- Project approval
- Phase gate approval
- Milestone completion
- Manual baseline creation
- Document version approval

**Baseline Content**:
- All extracted entities at point in time
- Entity relationships
- Project metadata (scope, budget, timeline)
- Compliance status
- Quality metrics

### Baseline Comparison

**Comparison Algorithm**:
1. Load baseline entities
2. Load current project entities
3. Match entities (fuzzy matching for names/descriptions)
4. Identify:
   - New entities (not in baseline)
   - Removed entities (in baseline, not in current)
   - Modified entities (changed attributes)
   - Unchanged entities

**Comparison Report**:
- Summary statistics
- Detailed entity-by-entity comparison
- Visual diff representation
- Drift severity assessment

---

## Drift Detection

### Detection Rules

#### Scope Drift Detection
```typescript
interface ScopeDriftRule {
  type: 'scope'
  threshold: {
    new_deliverables_percentage: number // e.g., 10% = alert if >10% new deliverables
    new_stakeholders_count: number // e.g., 5 = alert if >5 new stakeholders
    new_requirements_count: number
  }
  severity: 'critical' | 'warning' | 'info'
}
```

#### Timeline Drift Detection
```typescript
interface TimelineDriftRule {
  type: 'timeline'
  threshold: {
    milestone_delay_days: number // e.g., 7 = alert if milestone delayed >7 days
    deliverable_delay_percentage: number
  }
  severity: 'critical' | 'warning' | 'info'
}
```

### Anomaly Detection

**ML-Based Anomaly Detection**:
- Train models on historical project data
- Identify patterns that indicate problems
- Flag unusual entity patterns
- Detect compliance deviations

**Pattern Recognition**:
- Compare against similar projects
- Identify deviations from project type norms
- Flag entities that typically cause issues

---

## Lessons Learned & Continuous Improvement

### Lessons Learned Capture

**Automatic Capture**:
- Entity extraction accuracy metrics
- Drift detection effectiveness
- Baseline comparison outcomes
- Compliance success/failure rates

**Manual Capture**:
- Project retrospective insights
- Best practices identified
- Improvement opportunities
- Operating model feedback

### Knowledge Reuse

**Suggestions Engine**:
- Analyze current project against historical data
- Suggest entity extraction improvements
- Recommend baseline structures
- Provide drift resolution strategies
- Offer compliance templates

**Standardization**:
- Update company standards based on lessons learned
- Improve entity extraction prompts
- Refine drift detection thresholds
- Enhance compliance requirements

---

## Maturity Assessment & Onboarding

### Maturity Levels

1. **Level 1 - Initial**: Ad-hoc entity extraction, no baselines
2. **Level 2 - Managed**: Basic entity extraction, manual baselines
3. **Level 3 - Defined**: Automated extraction, automated baselines
4. **Level 4 - Quantitatively Managed**: Drift detection, metrics tracking
5. **Level 5 - Optimizing**: Continuous improvement, lessons learned integration

### Onboarding Flow

1. **Quick Start** (Day 1):
   - Extract entities from existing project documents
   - Create initial baseline
   - Show immediate value with entity overview

2. **Basic Usage** (Week 1):
   - Set up drift detection rules
   - Configure Confluence/Jira integration
   - Receive first drift alerts

3. **Advanced Usage** (Month 1):
   - Leverage lessons learned from other projects
   - Customize entity extraction for project type
   - Establish continuous improvement cycle

### Value Demonstration

**Immediate Value Metrics**:
- Number of entities extracted
- Baseline established
- Drift detected and resolved
- Time saved vs. manual extraction
- Compliance score improvement

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Database schema for entity storage and baselines
- [ ] Enhanced entity extraction service
- [ ] Basic baseline creation and storage
- [ ] Entity comparison algorithm

### Phase 2: Drift Detection (Weeks 5-8)
- [ ] Drift detection service
- [ ] Alert system (Jira, Confluence, email)
- [ ] Drift visualization and reporting
- [ ] Anomaly detection (basic)

### Phase 3: Lessons Learned (Weeks 9-12)
- [ ] Lessons learned capture system
- [ ] Knowledge reuse engine
- [ ] Improvement suggestions
- [ ] Historical project analysis

### Phase 4: Continuous Improvement (Weeks 13-16)
- [ ] Standardization engine
- [ ] Operating model optimization
- [ ] Compliance enhancement
- [ ] Best practices library

### Phase 5: Maturity & Onboarding (Weeks 17-20)
- [ ] Maturity assessment tool
- [ ] Onboarding wizard
- [ ] Value demonstration dashboard
- [ ] User adoption analytics

### Phase 6: Advanced Features (Weeks 21-24)
- [ ] ML-based anomaly detection
- [ ] Predictive drift modeling
- [ ] Advanced entity relationship mapping
- [ ] Cross-project pattern analysis

---

## Technical Specifications

### API Endpoints

#### Entity Extraction
```
POST /api/entities/extract
  - Extract entities from document
  - Returns: Extracted entities with confidence scores

GET /api/entities/project/:projectId
  - Get all entities for a project
  - Returns: Entity list with relationships

GET /api/entities/document/:documentId
  - Get entities extracted from specific document
  - Returns: Entity list
```

#### Baseline Management
```
POST /api/baselines/create
  - Create new baseline from current project state
  - Returns: Baseline ID and summary

GET /api/baselines/project/:projectId
  - Get all baselines for a project
  - Returns: Baseline list

POST /api/baselines/:baselineId/compare
  - Compare current state against baseline
  - Returns: Comparison report with drift details
```

#### Drift Detection
```
GET /api/drift/project/:projectId
  - Get all drift detections for a project
  - Returns: Drift list with severity

POST /api/drift/:driftId/resolve
  - Resolve drift (accept or revert)
  - Returns: Resolution status

GET /api/drift/project/:projectId/summary
  - Get drift summary statistics
  - Returns: Summary with trends
```

#### Lessons Learned
```
GET /api/lessons-learned/project/:projectId
  - Get lessons learned for a project
  - Returns: Lessons list

POST /api/lessons-learned/capture
  - Capture new lesson learned
  - Returns: Lesson ID

GET /api/lessons-learned/suggestions/:projectId
  - Get improvement suggestions for project
  - Returns: Suggestions list
```

### Integration Points

#### Confluence Integration
- Publish entity-extracted documents with metadata
- Create entity overview pages
- Update pages with drift analysis
- Link entities across documents

#### Jira Integration
- Create issues for detected drift
- Link issues to entities
- Update issues with entity changes
- Create dashboards for entity tracking

---

## Success Metrics

### Quantitative Metrics
- Entity extraction accuracy: >90%
- Drift detection time: <24 hours
- Baseline comparison time: <5 minutes
- User adoption rate: >70% within 3 months
- Time saved per project: >20 hours

### Qualitative Metrics
- User satisfaction with entity extraction
- Perceived value of drift detection
- Improvement in project compliance
- Standardization adoption rate
- Lessons learned utilization

---

## Conclusion

This specification outlines a comprehensive system for entity extraction, baseline management, and continuous improvement that enhances ADPA's integration with Atlassian tools. The phased implementation approach ensures immediate value delivery while building toward advanced capabilities.

The system transforms ADPA from a document processing tool into an intelligent project management platform that learns, improves, and helps organizations achieve better project outcomes through AI-powered insights and proactive management.

