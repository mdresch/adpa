# New Entity Type: Issues Log (Completed)

**Status**: ✅ Completed  
**Priority**: 🟡 **MEDIUM-HIGH** (P1)  
**PMBOK 8 Domain**: Project Work Performance Domain, Uncertainty Domain  
**Target Release**: Q1 2026  
**Completed**: February 2026

---

## 📋 Feature Overview

Add **Issues** entity type to track problems, blockers, and impediments encountered during project execution. Issues are distinct from Risks (future events) - Issues are current problems requiring immediate resolution.

---

## ✅ Acceptance Criteria (Completed)

- [x] Database schema created with triggers
- [x] AI extraction identifies issues from documents
- [x] Issues categorized and prioritized correctly
- [x] Frontend displays open/critical issues prominently
- [x] Manual issue creation and editing works
- [x] Status workflow (open → resolved → closed) functional
- [x] Integration with risks (materialization)
- [x] Integration with baseline drift
- [x] Notification system for new/critical issues
- [x] PMBOK 8 Project Work Domain requirements met

---

## 🔗 Implementation Notes

- Issues schema, status history, and triggers are implemented in migrations.
- API routes and service logic provide full CRUD and analytics support.
- Project UI includes an Issues tab with list, filters, and edit workflow.

---

**Created**: October 31, 2025  
**Archived**: February 11, 2026  
**PMBOK 8 Impact**: Project Work Domain 65% → 80%, Uncertainty Domain 95% → 100%
