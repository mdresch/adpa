# Wireframes - Portal & Assessment Screens

**Document Version:** 1.0  
**Date:** Week 1, Phase 1  
**Status:** Wireframe Specifications & Implementation Status

---

## Executive Summary

This document provides wireframe specifications for Portal and Assessment screens based on the PM Maturity Portal vision. Since Figma setup was intentionally skipped per project decision (code-first approach), these wireframes are provided as detailed specifications that can be implemented directly in code.

---

## 1. Wireframe Status

### 1.1 Implementation Approach

**Decision:** Code-first wireframing approach
- ✅ Wireframes defined as detailed specifications
- ✅ Components implemented directly in React/TypeScript
- ✅ Design tokens guide visual implementation
- ⏭️ Figma wireframes skipped (per project decision)

**Rationale:**
- Faster iteration in code
- Components already exist and are production-ready
- Design tokens provide visual consistency
- Real implementation serves as "living wireframes"

---

## 2. Portal Landing Page

### 2.1 Page: `/portal` (Future Implementation)

**Purpose:** Customer-facing landing page for PM Maturity Portal

**Wireframe Specification:**

```
┌─────────────────────────────────────────────────────────────┐
│ ADPA - PM Maturity Portal                                    │
│ [Logo]                    [Features] [Knowledge] [Pricing]  │
│                                          [Sign In] [Get Started] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│              🎯 Assess Your PM Maturity                        │
│              in 15 Minutes                                    │
│                                                               │
│     Get instant insights, personalized roadmaps, and         │
│     comprehensive PM knowledge aligned with PMBOK             │
│                                                               │
│     [Start Free Assessment]  [Explore Knowledge Base]        │
│                                                               │
│     [Visual: Maturity level visualization or hero image]     │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ Trust Indicators                                              │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│ │ 10,000+  │  │ PMBOK    │  │ 95%      │  │ Industry │      │
│ │ Users    │  │ Aligned  │  │ Success  │  │ Leader   │      │
│ └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
├─────────────────────────────────────────────────────────────┤
│ How It Works                                                 │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│ │ Step 1       │  │ Step 2       │  │ Step 3       │        │
│ │ Upload Docs  │  │ AI Analysis  │  │ Get Results  │        │
│ │              │  │              │  │              │        │
│ │ Upload your  │  │ AI-powered   │  │ Receive      │        │
│ │ project      │  │ analysis     │  │ personalized │        │
│ │ documents    │  │ extracts     │  │ roadmap      │        │
│ │              │  │ insights     │  │              │        │
│ └──────────────┘  └──────────────┘  └──────────────┘        │
├─────────────────────────────────────────────────────────────┤
│ Knowledge Showcase                                           │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│ │ Featured     │  │ Latest       │  │ Popular      │        │
│ │ Article 1    │  │ Insights     │  │ Templates    │        │
│ │              │  │              │  │              │        │
│ │ [Read More]  │  │ [Read More]  │  │ [Browse]     │        │
│ └──────────────┘  └──────────────┘  └──────────────┘        │
├─────────────────────────────────────────────────────────────┤
│ Testimonials                                                 │
│ "ADPA helped us improve from Level 2 to Level 4 in 6 months"│
│                    - John Smith, ABC Corp                    │
├─────────────────────────────────────────────────────────────┤
│ Final CTA                                                    │
│              Ready to Transform Your PM Capability?          │
│              [Start Your Assessment Now]                     │
└─────────────────────────────────────────────────────────────┘
```

**Components Needed:**
- Hero section with headline and CTAs
- Trust indicators (metrics, badges)
- How It Works (3-step process)
- Knowledge showcase (featured content)
- Testimonials section
- Final CTA section

**Design Tokens:**
- Background: `maturityTheme.colors.background.primary`
- Primary CTA: `maturityTheme.colors.primary[500]`
- Text: `maturityTheme.colors.text.primary`
- Cards: `maturityTheme.colors.surface.default`

**Status:** 📋 **SPECIFICATION READY** (Not yet implemented)

---

## 3. Assessment Upload Page

### 3.1 Page: `/onboarding/upload` (✅ Implemented)

**Purpose:** Document upload and assessment initiation

**Current Implementation:** `app/onboarding/upload/page.tsx`

**Wireframe Specification:**

```
┌─────────────────────────────────────────────────────────────┐
│ Client Onboarding Assessment                                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Assessment Details                                            │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ Project: [Select Project ▼] [+]                    │     │
│ │          ABC Corp Implementation                    │     │
│ │                                                      │     │
│ │ Client Name: [John Smith]                          │     │
│ │ Organization: [ABC Corporation]                    │     │
│ │ Purpose: [Initial Onboarding ▼]                    │     │
│ │          • Initial Onboarding                      │     │
│ │          • Periodic Review                         │     │
│ │          • Improvement Tracking                    │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ Upload Documents                                              │
│ ┌─────────────────────────────────────────────────────┐     │
│ │                                                     │     │
│ │      📤                                             │     │
│ │                                                     │     │
│ │   Drag and drop files here                         │     │
│ │   or click to browse                               │     │
│ │                                                     │     │
│ │   Supported: PDF, DOCX, MD                         │     │
│ │   Max file size: 10MB                              │     │
│ │                                                     │     │
│ │   [Select Files]                                   │     │
│ │                                                     │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ Uploaded Files (if any)                                       │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ 📄 project-charter.pdf        [Remove]            │     │
│ │ 📄 risk-register.docx          [Remove]            │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│                    [Start Assessment]                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- Project selector dropdown
- Client information form
- File upload area (drag & drop)
- File list with remove option
- Start Assessment button

**Status:** ✅ **IMPLEMENTED**

---

## 4. Assessment Results Dashboard

### 4.1 Page: `/onboarding/assessment/[batchId]` (✅ Implemented)

**Purpose:** Display assessment results and maturity analysis

**Current Implementation:** `app/onboarding/assessment/[batchId]/page.tsx`

**Wireframe Specification:**

```
┌─────────────────────────────────────────────────────────────┐
│ Assessment Results - ABC Corporation                        │
│ [← Back]                              [Export PDF] [Share]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Overall Maturity Score                                        │
│ ┌─────────────────────────────────────────────────────┐     │
│ │                                                     │     │
│ │                    Level 2.5                        │     │
│ │                                                     │     │
│ │              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │     │
│ │              Progress: 50%                          │     │
│ │                                                     │     │
│ │              Repeatable / Managed                   │     │
│ │                                                     │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ Knowledge Area Breakdown                                      │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ Integration    ████████░░ 80%                      │     │
│ │ Scope          ██████░░░░ 60%                      │     │
│ │ Schedule       ████████░░ 80%                      │     │
│ │ Cost           ████░░░░░░ 40%                      │     │
│ │ Quality        ███████░░░ 70%                      │     │
│ │ Resource       █████░░░░░ 50%                      │     │
│ │ Communication  ████████░░ 80%                      │     │
│ │ Risk           ███████░░░ 70%                      │     │
│ │ Procurement    ████░░░░░░ 40%                      │     │
│ │ Stakeholder    ████████░░ 80%                      │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ Top Gaps                                                      │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│ │ Gap 1        │  │ Gap 2        │  │ Gap 3        │        │
│ │              │  │              │  │              │        │
│ │ Cost         │  │ Procurement  │  │ Resource     │        │
│ │ Management   │  │ Management   │  │ Management   │        │
│ │              │  │              │  │              │        │
│ │ Missing:     │  │ Missing:     │  │ Missing:     │        │
│ │ Budget       │  │ Vendor       │  │ Resource     │        │
│ │ tracking     │  │ evaluation   │  │ allocation   │        │
│ │              │  │              │  │              │        │
│ │ [View]       │  │ [View]       │  │ [View]       │        │
│ └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                               │
│ Recommended Next Steps                                        │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ 1. Implement budget tracking system                │     │
│ │ 2. Create vendor evaluation process                │     │
│ │ 3. Establish resource allocation framework         │     │
│ │                                                     │     │
│ │ [View Full Roadmap]                                │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ [Select Desired State]  [Generate Roadmap]                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- Maturity score display (large, prominent)
- Knowledge area breakdown (progress bars or radar chart)
- Top gaps cards
- Recommended next steps
- Action buttons (Export, Share, Generate Roadmap)

**Status:** ✅ **IMPLEMENTED**

---

## 5. Enhanced Assessment Dashboard (Future)

### 5.1 Page: `/portal/assessment-dashboard` (Future Implementation)

**Purpose:** Comprehensive assessment dashboard with advanced features

**Wireframe Specification:**

```
┌─────────────────────────────────────────────────────────────┐
│ Assessment Dashboard - ABC Corporation                       │
│ [Dashboard] [Gap Analysis] [Roadmap] [Knowledge] [Settings] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Current State vs Desired State                                │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ Current: Level 2.5    →    Desired: Level 4       │     │
│ │                                                      │     │
│ │ Progress: ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │     │
│ │           40% Complete                              │     │
│ │                                                      │     │
│ │ [Change Desired State]                              │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ Performance Domains (PMBOK 8)                                │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ Stakeholders    ████████░░ 80%                     │     │
│ │ Team            ██████░░░░ 60%                     │     │
│ │ Dev Approach    ████████░░ 80%                     │     │
│ │ Planning        ███████░░░ 70%                     │     │
│ │ Project Work    ██████░░░░ 60%                     │     │
│ │ Delivery        ████████░░ 80%                     │     │
│ │ Measurement     ████░░░░░░ 40%                     │     │
│ │ Uncertainty     ███████░░░ 70%                     │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ Document Quality Heatmap                                      │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ Document          Quality    Compliance   Grade    │     │
│ │ ────────────────────────────────────────────────  │     │
│ │ Project Charter   85%        90%         A        │     │
│ │ Risk Register     70%        75%         B        │     │
│ │ Requirements      60%        65%         C        │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ Benchmark Comparison                                          │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ Your Organization: Level 2.5                       │     │
│ │ Industry Average:  Level 2.8                       │     │
│ │ Top Performers:    Level 4.2                       │     │
│ │                                                     │     │
│ │ [View Detailed Benchmarks]                         │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ Historical Trends                                             │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ [Line Chart: Maturity score over time]             │     │
│ │                                                     │     │
│ │ Nov 2024: 2.0                                      │     │
│ │ Dec 2024: 2.2                                      │     │
│ │ Jan 2025: 2.5                                      │     │
│ │                                                     │     │
│ │ Trend: ↗ Improving                                 │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- Current vs Desired state comparison
- PMBOK 8 Performance Domains breakdown
- Document quality heatmap
- Benchmark comparison
- Historical trend chart

**Status:** 📋 **SPECIFICATION READY** (Not yet implemented)

---

## 6. Desired State Selector

### 6.1 Component: Desired State Selection Modal/Dialog

**Purpose:** Allow users to select target maturity level

**Wireframe Specification:**

```
┌─────────────────────────────────────────────────────────────┐
│ Select Your Desired Maturity Level                           │
│                                                               │
│ Current State: Level 2.5                                     │
│                                                               │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│ │ Level 1  │  │ Level 2  │  │ Level 3  │  │ Level 4  │        │
│ │          │  │          │  │          │  │          │        │
│ │ Initial  │  │ Repeatable│ │ Defined  │  │ Managed  │        │
│ │          │  │          │  │          │  │          │        │
│ │ [Select] │  │ [Select] │  │ [Select] │  │ [Select] │        │
│ └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│                                                               │
│ ┌──────────┐                                                 │
│ │ Level 5  │                                                 │
│ │          │                                                 │
│ │ Optimizing│                                                │
│ │          │                                                 │
│ │ [Select] │                                                 │
│ └──────────┘                                                 │
│                                                               │
│ Selected: Level 4 - Quantitatively Managed                    │
│                                                               │
│ Estimated Timeline: 12-18 months                              │
│ Estimated Investment: $50K-$100K                             │
│                                                               │
│ [Cancel]  [Confirm Selection]                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- Maturity level cards (5 levels)
- Current state indicator
- Selected state highlight
- Timeline and investment estimates
- Confirm/Cancel buttons

**Status:** 📋 **SPECIFICATION READY** (Partially implemented in `MaturityJourneyPlanner`)

---

## 7. Gap Analysis View

### 7.1 Page: `/portal/gap-analysis` (Future Implementation)

**Purpose:** Detailed gap analysis between current and desired state

**Wireframe Specification:**

```
┌─────────────────────────────────────────────────────────────┐
│ Gap Analysis - ABC Corporation                               │
│ Current: Level 2.5  →  Desired: Level 4                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Gap Summary                                                   │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ Total Gaps Identified: 24                          │     │
│ │ Critical Gaps: 8                                   │     │
│ │ High Priority: 10                                  │     │
│ │ Medium Priority: 6                                 │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ Critical Gaps                                                 │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ Gap: Quantitative Metrics Framework                 │     │
│ │ Current: No metrics collection                     │     │
│ │ Required: Statistical process control              │     │
│ │ Impact: High                                       │     │
│ │ Effort: High                                       │     │
│ │ Timeline: 6-9 months                              │     │
│ │ [View Details] [Add to Roadmap]                   │     │
│ ├─────────────────────────────────────────────────────┤     │
│ │ Gap: Process Optimization                          │     │
│ │ Current: Processes defined but not optimized      │     │
│ │ Required: Continuous improvement culture          │     │
│ │ Impact: High                                       │     │
│ │ Effort: Medium                                     │     │
│ │ Timeline: 3-6 months                              │     │
│ │ [View Details] [Add to Roadmap]                   │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ Gap Breakdown by Knowledge Area                               │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ Integration    ████████░░ 2 gaps                    │     │
│ │ Scope          ██████░░░░ 3 gaps                    │     │
│ │ Schedule       ████████░░ 1 gap                    │     │
│ │ Cost           ████░░░░░░ 4 gaps                    │     │
│ │ Quality        ███████░░░ 2 gaps                    │     │
│ │ Resource       █████░░░░░ 3 gaps                    │     │
│ │ Communication  ████████░░ 1 gap                    │     │
│ │ Risk           ███████░░░ 2 gaps                    │     │
│ │ Procurement    ████░░░░░░ 4 gaps                    │     │
│ │ Stakeholder    ████████░░ 2 gaps                    │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ [Filter by Priority] [Filter by Area] [Export Report]       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- Gap summary statistics
- Critical gaps list with details
- Gap breakdown by knowledge area
- Filtering options
- Export functionality

**Status:** 📋 **SPECIFICATION READY** (Not yet implemented)

---

## 8. Roadmap Generator

### 8.1 Page: `/portal/roadmap` (Future Implementation)

**Purpose:** Generate and display improvement roadmap

**Wireframe Specification:**

```
┌─────────────────────────────────────────────────────────────┐
│ Improvement Roadmap - ABC Corporation                        │
│ Current: Level 2.5  →  Desired: Level 4                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Timeline View                                                 │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ Q1 2025    Q2 2025    Q3 2025    Q4 2025          │     │
│ │                                                      │     │
│ │ [Phase 1]  [Phase 2]  [Phase 3]  [Phase 4]        │     │
│ │ Foundation Metrics   Optimization Excellence       │     │
│ │                                                      │     │
│ │ ─────────────────────────────────────────────────── │     │
│ │                                                     │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ Phase 1: Foundation (Months 1-3)                             │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ ✅ Week 1-2: Create metrics framework               │     │
│ │ ✅ Week 3-4: Establish baseline measurements       │     │
│ │ ⏳ Week 5-6: Implement data collection tools        │     │
│ │ ⏳ Week 7-8: Train team on metrics                  │     │
│ │ ⏳ Week 9-12: Validate metrics system               │     │
│ │                                                     │     │
│ │ Progress: ████████░░ 67%                           │     │
│ │ [View Details]                                     │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ Phase 2: Metrics (Months 4-6)                                │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ ⏳ Month 4: Implement statistical process control   │     │
│ │ ⏳ Month 5: Establish performance baselines         │     │
│ │ ⏳ Month 6: Create metrics dashboard                │     │
│ │                                                     │     │
│ │ Progress: ░░░░░░░░░░ 0%                            │     │
│ │ [View Details]                                     │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ [Export Roadmap] [Share Roadmap] [Adjust Timeline]           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- Timeline visualization (Gantt-style)
- Phase breakdowns
- Task lists with checkboxes
- Progress indicators
- Export and sharing options

**Status:** 📋 **SPECIFICATION READY** (Partially implemented in `MaturityJourneyPlanner`)

---

## 9. Quick Assessment Tool

### 9.1 Page: `/portal/assessment-quick` (Future Implementation)

**Purpose:** Public-facing quick assessment (10-15 questions)

**Wireframe Specification:**

```
┌─────────────────────────────────────────────────────────────┐
│ Quick PM Maturity Assessment                                 │
│ Complete in 5-10 minutes                                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Progress: ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 40%      │
│ Question 6 of 15                                             │
│                                                               │
│ Question 6: How do you track project costs?                  │
│                                                               │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ ○ We don't track costs systematically              │     │
│ │ ● We track costs in spreadsheets                   │     │
│ │ ○ We use project management software               │     │
│ │ ○ We have integrated cost tracking systems         │     │
│ │ ○ We use advanced analytics and forecasting        │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ [← Previous]                    [Next →]                    │
│                                                               │
│                                                               │
│ Skip to Results                                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Results Page:**

```
┌─────────────────────────────────────────────────────────────┐
│ Your Preliminary Maturity Score                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│                    Level 2.3                                  │
│                                                               │
│              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                               │
│              Repeatable / Managed                            │
│                                                               │
│ Top Strengths                                                 │
│ • Project planning                                            │
│ • Risk management                                             │
│ • Stakeholder communication                                   │
│                                                               │
│ Top Gaps                                                      │
│ • Cost tracking                                               │
│ • Quality metrics                                             │
│ • Process optimization                                        │
│                                                               │
│ Get Your Full Assessment                                      │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ Email: [your@email.com]                            │     │
│ │ Company: [Your Company]                           │     │
│ │ Industry: [Select Industry ▼]                     │     │
│ │                                                     │     │
│ │ [Get Full Assessment - Free]                      │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ [Share Results] [Download PDF]                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- Progress indicator
- Question cards with radio buttons
- Navigation (Previous/Next)
- Results display
- Lead capture form
- CTA for full assessment

**Status:** 📋 **SPECIFICATION READY** (Not yet implemented)

---

## 10. Knowledge Article Template

### 10.1 Page: `/knowledge/maturity-levels/[level]` (Future Implementation)

**Purpose:** Display maturity level content

**Wireframe Specification:**

```
┌─────────────────────────────────────────────────────────────┐
│ Knowledge Base  >  Maturity Levels  >  Level 2: Repeatable  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Level 2: Repeatable / Managed                                │
│                                                               │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ Maturity Score: 2.0                                  │     │
│ │                                                      │     │
│ │ Characteristics:                                     │     │
│ │ • Basic processes defined                           │     │
│ │ • Project management practiced                      │     │
│ │ • Some repeatability                                │     │
│ │ • Planning exists but incomplete                    │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ Overview                                                      │
│ [Content: 400-500 words about Level 2]                       │
│                                                               │
│ Assessment Criteria                                           │
│ [Content: How to identify Level 2]                           │
│                                                               │
│ Challenges & Pain Points                                      │
│ [Content: Common problems at Level 2]                        │
│                                                               │
│ Improvement Path to Level 3                                  │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ Quick Wins (0-3 months):                            │     │
│ │ • Standardize templates                             │     │
│ │ • Establish metrics collection                      │     │
│ │                                                     │     │
│ │ Strategic Initiatives (3-6 months):                │     │
│ │ • Develop comprehensive methodology                │     │
│ │ • Organizational training                          │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ Success Stories                                               │
│ [Case studies]                                                │
│                                                               │
│ Tools & Resources                                             │
│ [Templates, tools, training materials]                        │
│                                                               │
│ Related Content                                               │
│ • Level 1: Initial / Ad Hoc                                  │
│ • Level 3: Defined / Organized                               │
│ • Knowledge Area: Integration Management                     │
│                                                               │
│ [Assess Your Maturity] [View All Levels]                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- Article header with breadcrumbs
- Maturity level card/summary
- Content sections (Overview, Assessment, Challenges, etc.)
- Related content links
- CTAs (Assess, Explore)

**Status:** 📋 **SPECIFICATION READY** (Not yet implemented)

---

## 11. Implementation Status Summary

### 11.1 Completed Wireframes (Implemented)

| Page | Route | Status | File |
|------|-------|--------|------|
| Assessment Upload | `/onboarding/upload` | ✅ Implemented | `app/onboarding/upload/page.tsx` |
| Assessment Results | `/onboarding/assessment/[batchId]` | ✅ Implemented | `app/onboarding/assessment/[batchId]/page.tsx` |
| Assessments List | `/onboarding/assessments` | ✅ Implemented | `app/onboarding/assessments/page.tsx` |

### 11.2 Specified Wireframes (Not Yet Implemented)

| Page | Route | Status | Priority |
|------|-------|--------|----------|
| Portal Landing | `/portal` | 📋 Specified | High |
| Enhanced Dashboard | `/portal/assessment-dashboard` | 📋 Specified | High |
| Gap Analysis | `/portal/gap-analysis` | 📋 Specified | Medium |
| Roadmap Generator | `/portal/roadmap` | 📋 Specified | Medium |
| Quick Assessment | `/portal/assessment-quick` | 📋 Specified | High |
| Knowledge Article | `/knowledge/maturity-levels/[level]` | 📋 Specified | Medium |
| Desired State Selector | Component | 📋 Specified | Medium |

---

## 12. Component Reusability

### 12.1 Existing Components That Can Be Reused

**From Current Implementation:**
- ✅ `MaturityCard` - For maturity level displays
- ✅ `MaturityScore` - For score visualization
- ✅ `MaturityJourneyPlanner` - For roadmap planning
- ✅ `Card`, `CardHeader`, `CardContent` - For content containers
- ✅ `Button` - For CTAs
- ✅ `Badge` - For status indicators
- ✅ `Progress` - For progress bars

**Components to Create:**
- 📋 `Hero` - Hero section component
- 📋 `TrustIndicators` - Trust badges/metrics
- 📋 `HowItWorks` - Step-by-step process visualization
- 📋 `KnowledgeShowcase` - Featured content display
- 📋 `Testimonials` - Testimonial carousel
- 📋 `GapCard` - Gap display card
- 📋 `RoadmapTimeline` - Timeline visualization
- 📋 `QuestionCard` - Assessment question display

---

## 13. Design System Integration

### 13.1 Using Design Tokens

All wireframes should use design tokens from `maturity-portal-theme.ts`:

**Colors:**
- Background: `maturityTheme.colors.background.primary`
- Cards: `maturityTheme.colors.surface.default`
- Primary CTA: `maturityTheme.colors.primary[500]`
- Text: `maturityTheme.colors.text.primary`

**Spacing:**
- Use `maturityTheme.spacing` scale (xs, sm, md, lg, xl, etc.)

**Typography:**
- Headings: `maturityTheme.typography.fontSize['2xl']` to `['4xl']`
- Body: `maturityTheme.typography.fontSize.base`
- Font family: `maturityTheme.typography.fontFamily.sans`

**Maturity Colors:**
- Use `getMaturityColor(level)` for level-specific colors

---

## 14. Responsive Design Considerations

### 14.1 Breakpoints

All wireframes should be responsive using:
- Mobile: < 640px (sm)
- Tablet: 640px - 1024px (md-lg)
- Desktop: > 1024px (lg+)

**Mobile Adaptations:**
- Stack cards vertically
- Full-width CTAs
- Simplified navigation
- Collapsible sections

**Tablet Adaptations:**
- 2-column layouts where appropriate
- Maintain desktop navigation
- Optimized card sizes

**Desktop Adaptations:**
- Multi-column layouts
- Sidebar navigation
- Expanded content areas

---

## 15. Accessibility Requirements

### 15.1 WCAG Compliance

All wireframes should consider:
- **Color Contrast:** Minimum 4.5:1 for text
- **Keyboard Navigation:** All interactive elements accessible
- **Screen Readers:** Proper ARIA labels
- **Focus States:** Visible focus indicators
- **Alt Text:** Images have descriptive alt text

---

## 16. Next Steps

### 16.1 Implementation Priority

**Phase 1 (High Priority):**
1. Portal Landing Page (`/portal`)
2. Quick Assessment Tool (`/portal/assessment-quick`)
3. Enhanced Dashboard (`/portal/assessment-dashboard`)

**Phase 2 (Medium Priority):**
4. Gap Analysis View (`/portal/gap-analysis`)
5. Roadmap Generator (`/portal/roadmap`)
6. Knowledge Article Template (`/knowledge/maturity-levels/[level]`)

**Phase 3 (Enhancements):**
7. Desired State Selector improvements
8. Additional knowledge area pages
9. Advanced filtering and search

---

## 17. Wireframe Deliverables Summary

### 17.1 Completed

- ✅ Assessment Upload Page (implemented)
- ✅ Assessment Results Page (implemented)
- ✅ Assessments List Page (implemented)

### 17.2 Specified (Ready for Implementation)

- 📋 Portal Landing Page (detailed specification)
- 📋 Enhanced Assessment Dashboard (detailed specification)
- 📋 Desired State Selector (component specification)
- 📋 Gap Analysis View (detailed specification)
- 📋 Roadmap Generator (detailed specification)
- 📋 Quick Assessment Tool (detailed specification)
- 📋 Knowledge Article Template (detailed specification)

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Week 1, Phase 1 | Initial wireframe specifications | ADPA Team |

---

## Related Documents

- **Design Tokens:** `docs/design-tokens.md` - Visual design system
- **Design System Status:** `docs/design-system-setup-status.md` - Component status
- **Sitemap:** `docs/sitemap-week1.md` - URL structure
- **Information Architecture:** `docs/information-architecture-week1.md` - Content organization
- **PM Portal Vision:** `docs/strategic/PM_MATURITY_PORTAL_VISION.md` - Strategic vision

---

**Note:** These wireframes are provided as detailed specifications rather than Figma designs, aligning with the project's code-first approach. Developers can implement these directly using the design tokens and existing components.

---

**End of Document**

