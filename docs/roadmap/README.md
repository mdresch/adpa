# ADPA Roadmap 2026: Strategic Vision & Innovation

This document outlines the strategic roadmap for the ADPA platform, focusing on achieving 95%+ compliance with PMBOK 8th Edition Performance Domains and expanding into Portfolio and Program Management.

---

## � Top Priorities (Q1 2026)

### 1. � Performance Actuals & Measurement Domain
**Status**: 🔵 Planned | **Priority**: CRITICAL (P0)  
**Target Domain**: Measurement Performance Domain  
**File**: [`ENTITY_TYPE_PERFORMANCE_ACTUALS.md`](./ENTITY_TYPE_PERFORMANCE_ACTUALS.md)

**Goal**: Close the "Actuals Gap" by tracking what actually happened (cost, schedule, scope) vs. what was planned. This enables automated SPI/CPI calculation and variance alerts.

---

### 2. 🟢 Team Performance Domain (Deepening)
**Status**: � **In Progress** | **Priority**: HIGH (P0)  
**Target Domain**: Team Performance Domain  
**File**: [`ENTITY_TYPE_TEAM_AGREEMENTS.md`](./ENTITY_TYPE_TEAM_AGREEMENTS.md)

**Goal**: Move beyond resource tracking to capture team culture, norms, and psychological safety through automated extraction of "Team Agreements".
- ✅ Database Schema & Migration complete
- ✅ AI Extraction (14th Entity Type) integrated
- ✅ Frontend display by category implemented

---

### 3. 🛡️ Lifecycle Performance & Governance
**Status**: 🔵 Planned | **Priority**: HIGH (P1)  
**File**: [`SMART_DOCUMENT_VERSIONING.md`](./SMART_DOCUMENT_VERSIONING.md)

**Goal**: Implement enterprise-grade version control to prevent "Document Clutter" and maintain clear audit trails during AI regeneration.

---

## 🏛️ Strategic Foundations (Portfolio & Program Management)

ADPA is expanding from a project-centric tool to a strategic enterprise platform.

### 📊 Program Management Strategic Foundation
**Status**: � Planning Complete | **Next**: Phase 3 (Financials)  
**Documents**:
- [`PROGRAM_RESOURCE_COST_MANAGEMENT.md`](./PROGRAM_RESOURCE_COST_MANAGEMENT.md) - Resource & Cost Domain mapping.
- [`PROGRAM_ARCHIVE_FEATURE.md`](./PROGRAM_ARCHIVE_FEATURE.md) - Program-level archiving logic.

### 💼 Portfolio Management Strategic Foundation
**Status**: 📋 Planning Complete | **Priority**: Strategic  
**Documents**:
- [`PORTFOLIO_PRIORITIZATION_SYSTEM.md`](./PORTFOLIO_PRIORITIZATION_SYSTEM.md) - Weighted scoring & MCDA for selection.
- [`PORTFOLIO_TASKS_IMPLEMENTATION_MATRIX.md`](./PORTFOLIO_TASKS_IMPLEMENTATION_MATRIX.md) - 61 specific portfolio tasks mapped.
- [`PORTFOLIO_STRATEGIC_FRAMEWORKS.md`](./PORTFOLIO_STRATEGIC_FRAMEWORKS.md) - Support for OKRs, Balanced Scorecard, etc.

---

## 🎉 Recently Completed (December 18, 2025)

These major stability and visibility hurdles have been cleared:

### ✅ Automatic Drift Detection & AI Resolution
**Status**: ✅ **COMPLETED** (Dec 2025)  
**File**: [`DRIFT_AUTO_RESOLUTION_FEATURE.md`](./DRIFT_AUTO_RESOLUTION_FEATURE.md)  
**Impact**: Document-baseline realignment is now automated. Users can "Resolve with AI" using Conservative, Balanced, or Permissive strategies with full change previews.

### ✅ Job Monitor & Worker Visibility
**Status**: ✅ **COMPLETED** (Dec 18, 2025)  
**Archive**: [`archive/2025/JOB_MONITOR_IMPLEMENTATION_PLAN.md`](./archive/2025/JOB_MONITOR_IMPLEMENTATION_PLAN.md)  
**Impact**: Real-time visibility into Bull queues, unique worker tracking, and project-specific job context.

### ✅ Extraction Stability & System Recovery
**Status**: ✅ **COMPLETED** (Dec 18, 2025)  
**Impact**: Resolved long-standing "Pending" job blockage. Integrated Moonshot (Kimi K2) for stable large-scale extractions and implemented state-sync listeners.

---

## 📅 Roadmap Timeline

### Q1 2026 - PMBOK 8 Compliance Completion
- 🔴 Performance Actuals (Measurement Domain)
- 🔴 Team Agreements (Team Domain - Final Polish)
- 🟡 Lessons Learned & Issues Log Entities
- 🟡 Development Approach & Life Cycle Metadata

### Q2 2026 - Strategic Core
- 🟢 Program Financial Management (Budget Rollups, EVM)
- � Portfolio Prioritization Engine
- � Advanced AI Summarization (Monthly Portfolio Reports)

---

## 🔄 Feature Status Legend

- � **Critical Priority (P0)**: Essential for PMBOK 8 / Strategic expansion
- 🟢 **In Progress**: Currently active development
- 🔵 **Planned**: Specification ready, pending sprint allocation
- ✅ **Completed**: Live and verified
- 🟡 **High Priority (P1)**: Next in queue after P0s

---

**Last Updated**: December 18, 2025  
*Previous Roadmap (2025) Archived at: [`archive/2025/ROADMAP_README_COMPLETE_2025.md`](./archive/2025/ROADMAP_README_COMPLETE_2025.md)*
