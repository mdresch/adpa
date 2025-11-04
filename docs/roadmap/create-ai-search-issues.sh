#!/bin/bash
#
# AI and Search Features
# Generated: 2025-11-04T08:07:33.644Z
# Total tasks: 30
#

set -e

REPO="mdresch/adpa"
PROJECT="ADPA Roadmap"

echo "Creating 30 GitHub issues..."
echo ""

# Task 1/30: TASK-31
gh issue create \
  --repo "$REPO" \
  --title "**Technical Review Complete** - Technical Lead sign-off" \
  --body "From: Change Request CR-2025-001: RAG Integration for Intelligent Document Generation\nSection: Change Request CR-2025-001: RAG Integration for Intelligent Document Generation\n\n**Source**: CR-2025-001_RAG_INTEGRATION.md\n**Task ID**: TASK-31\n**Effort**: TBD" \
  --label "search,medium" \
  --assignee "" || echo "Failed to create TASK-31"

# Task 2/30: TASK-32
gh issue create \
  --repo "$REPO" \
  --title "**Business Case Approved** - Product Manager sign-off" \
  --body "From: Change Request CR-2025-001: RAG Integration for Intelligent Document Generation\nSection: Change Request CR-2025-001: RAG Integration for Intelligent Document Generation\n\n**Source**: CR-2025-001_RAG_INTEGRATION.md\n**Task ID**: TASK-32\n**Effort**: TBD" \
  --label "search,medium" \
  --assignee "" || echo "Failed to create TASK-32"

# Task 3/30: TASK-33
gh issue create \
  --repo "$REPO" \
  --title "**Resource Allocation Confirmed** - Engineering Manager sign-off" \
  --body "From: Change Request CR-2025-001: RAG Integration for Intelligent Document Generation\nSection: Change Request CR-2025-001: RAG Integration for Intelligent Document Generation\n\n**Source**: CR-2025-001_RAG_INTEGRATION.md\n**Task ID**: TASK-33\n**Effort**: TBD" \
  --label "search,medium" \
  --assignee "" || echo "Failed to create TASK-33"

# Task 4/30: TASK-34
gh issue create \
  --repo "$REPO" \
  --title "**Final Approval** - CTO/VP Engineering sign-off" \
  --body "From: Change Request CR-2025-001: RAG Integration for Intelligent Document Generation\nSection: Change Request CR-2025-001: RAG Integration for Intelligent Document Generation\n\n**Source**: CR-2025-001_RAG_INTEGRATION.md\n**Task ID**: TASK-34\n**Effort**: TBD" \
  --label "search,medium" \
  --assignee "" || echo "Failed to create TASK-34"

# Task 5/30: TASK-35
gh issue create \
  --repo "$REPO" \
  --title "Updated user documentation (how to interpret context sources)" \
  --body "From: Change Request CR-2025-001: RAG Integration for Intelligent Document Generation\nSection: Change Request CR-2025-001: RAG Integration for Intelligent Document Generation\n\n**Source**: CR-2025-001_RAG_INTEGRATION.md\n**Task ID**: TASK-35\n**Effort**: TBD" \
  --label "search,medium" \
  --assignee "" || echo "Failed to create TASK-35"

# Task 6/30: TASK-36
gh issue create \
  --repo "$REPO" \
  --title "Developer documentation (how to configure templates)" \
  --body "From: Change Request CR-2025-001: RAG Integration for Intelligent Document Generation\nSection: Change Request CR-2025-001: RAG Integration for Intelligent Document Generation\n\n**Source**: CR-2025-001_RAG_INTEGRATION.md\n**Task ID**: TASK-36\n**Effort**: TBD" \
  --label "search,medium" \
  --assignee "" || echo "Failed to create TASK-36"

# Task 7/30: TASK-37
gh issue create \
  --repo "$REPO" \
  --title "Release notes (what\'s new, how to use)" \
  --body "From: Change Request CR-2025-001: RAG Integration for Intelligent Document Generation\nSection: Change Request CR-2025-001: RAG Integration for Intelligent Document Generation\n\n**Source**: CR-2025-001_RAG_INTEGRATION.md\n**Task ID**: TASK-37\n**Effort**: TBD" \
  --label "search,medium" \
  --assignee "" || echo "Failed to create TASK-37"

# Task 8/30: TASK-38
gh issue create \
  --repo "$REPO" \
  --title "Training materials (optional, for power users)" \
  --body "From: Change Request CR-2025-001: RAG Integration for Intelligent Document Generation\nSection: Change Request CR-2025-001: RAG Integration for Intelligent Document Generation\n\n**Source**: CR-2025-001_RAG_INTEGRATION.md\n**Task ID**: TASK-38\n**Effort**: TBD" \
  --label "search,medium" \
  --assignee "" || echo "Failed to create TASK-38"

# Task 9/30: TASK-56
gh issue create \
  --repo "$REPO" \
  --title "Integration tests: AI provider failover" \
  --body "From: Change Request CR-2025-002: Production Readiness & Feature Polish\nSection: Change Request CR-2025-002: Production Readiness & Feature Polish\n\n**Source**: CR-2025-002_PRODUCTION_READINESS_AND_POLISH.md\n**Task ID**: TASK-56\n**Effort**: TBD" \
  --label "testing,ai,medium" \
  --assignee "" || echo "Failed to create TASK-56"

# Task 10/30: TASK-90
gh issue create \
  --repo "$REPO" \
  --title "AI extraction from charter/PMP documents" \
  --body "From: New Entity Type: Development Approach Metadata\nSection: New Entity Type: Development Approach Metadata\n\n**Source**: ENTITY_TYPE_DEVELOPMENT_APPROACH.md\n**Task ID**: TASK-90\n**Effort**: Small" \
  --label "ai,entity-types,medium" \
  --assignee "" || echo "Failed to create TASK-90"

# Task 11/30: TASK-104
gh issue create \
  --repo "$REPO" \
  --title "AI extraction identifies issues from documents" \
  --body "From: New Entity Type: Issues Log\nSection: New Entity Type: Issues Log\n\n**Source**: ENTITY_TYPE_ISSUES_LOG.md\n**Task ID**: TASK-104\n**Effort**: Small-Medium" \
  --label "ai,entity-types,medium" \
  --assignee "" || echo "Failed to create TASK-104"

# Task 12/30: TASK-114
gh issue create \
  --repo "$REPO" \
  --title "AI extraction working for lessons learned" \
  --body "From: New Entity Type: Lessons Learned\nSection: New Entity Type: Lessons Learned\n\n**Source**: ENTITY_TYPE_LESSONS_LEARNED.md\n**Task ID**: TASK-114\n**Effort**: Small-Medium" \
  --label "ai,entity-types,medium" \
  --assignee "" || echo "Failed to create TASK-114"

# Task 13/30: TASK-130
gh issue create \
  --repo "$REPO" \
  --title "AI extraction identifies actuals from documents" \
  --body "From: New Entity Type: Performance Actuals\nSection: New Entity Type: Performance Actuals\n\n**Source**: ENTITY_TYPE_PERFORMANCE_ACTUALS.md\n**Task ID**: TASK-130\n**Effort**: Medium" \
  --label "ai,entity-types,high" \
  --assignee "" || echo "Failed to create TASK-130"

# Task 14/30: TASK-139
gh issue create \
  --repo "$REPO" \
  --title "AI extraction working for team agreements" \
  --body "From: New Entity Type: Team Agreements\nSection: New Entity Type: Team Agreements\n\n**Source**: ENTITY_TYPE_TEAM_AGREEMENTS.md\n**Task ID**: TASK-139\n**Effort**: Small-Medium" \
  --label "ai,entity-types,high" \
  --assignee "" || echo "Failed to create TASK-139"

# Task 15/30: TASK-206
gh issue create \
  --repo "$REPO" \
  --title "**Implement template wizard** for guided template creation with AI enhancements (PARTIAL: template b" \
  --body "From: Implementation TODOs by Phase\nSection: Implementation TODOs by Phase\n\n**Source**: IMPLEMENTATION_TODOS_BY_PHASE.md\n**Task ID**: TASK-206\n**Effort**: TBD" \
  --label "ai,documentation,medium" \
  --assignee "" || echo "Failed to create TASK-206"

# Task 16/30: TASK-226
gh issue create \
  --repo "$REPO" \
  --title "**Create tests for AI model integration** and quality assessment accuracy (PARTIAL: some AI tests ex" \
  --body "From: Implementation TODOs by Phase\nSection: Implementation TODOs by Phase\n\n**Source**: IMPLEMENTATION_TODOS_BY_PHASE.md\n**Task ID**: TASK-226\n**Effort**: TBD" \
  --label "testing,ai,medium" \
  --assignee "" || echo "Failed to create TASK-226"

# Task 17/30: TASK-239
gh issue create \
  --repo "$REPO" \
  --title "Create a new AI generation job" \
  --body "From: Job Monitor Enhancement - Implementation Plan\nSection: Job Monitor Enhancement - Implementation Plan\n\n**Source**: JOB_MONITOR_IMPLEMENTATION_PLAN.md\n**Task ID**: TASK-239\n**Effort**: TBD" \
  --label "ai,low" \
  --assignee "" || echo "Failed to create TASK-239"

# Task 18/30: TASK-323
gh issue create \
  --repo "$REPO" \
  --title "AI-powered recommendations" \
  --body "From: Portfolio Tasks Implementation Matrix\nSection: Portfolio Tasks Implementation Matrix\n\n**Source**: PORTFOLIO_TASKS_IMPLEMENTATION_MATRIX.md\n**Task ID**: TASK-323\n**Effort**: Low" \
  --label "ai,portfolio-management,high" \
  --assignee "" || echo "Failed to create TASK-323"

# Task 19/30: TASK-726
gh issue create \
  --repo "$REPO" \
  --title "\"Resolve Drift\" button triggers AI analysis" \
  --body "From: Automatic Drift Detection & Resolution\nSection: Automatic Drift Detection & Resolution\n\n**Source**: DRIFT_AUTO_RESOLUTION_FEATURE.md\n**Task ID**: TASK-726\n**Effort**: Medium-Large" \
  --label "ai,baseline-management,high" \
  --assignee "" || echo "Failed to create TASK-726"

# Task 20/30: TASK-774
gh issue create \
  --repo "$REPO" \
  --title "Baseline data model implementation" \
  --body "From: 🔧 ADPA v2.0.0 - Future Improvements & Fine-Tuning\nSection: 🔧 ADPA v2.0.0 - Future Improvements & Fine-Tuning\n\n**Source**: FUTURE_IMPROVEMENTS.md\n**Task ID**: TASK-774\n**Effort**: TBD" \
  --label "ai,medium" \
  --assignee "" || echo "Failed to create TASK-774"

# Task 21/30: TASK-801
gh issue create \
  --repo "$REPO" \
  --title "Feedback data model and database schema" \
  --body "From: 🔧 ADPA v2.0.0 - Future Improvements & Fine-Tuning\nSection: 🔧 ADPA v2.0.0 - Future Improvements & Fine-Tuning\n\n**Source**: FUTURE_IMPROVEMENTS.md\n**Task ID**: TASK-801\n**Effort**: TBD" \
  --label "backend,ai,medium" \
  --assignee "" || echo "Failed to create TASK-801"

# Task 22/30: TASK-807
gh issue create \
  --repo "$REPO" \
  --title "AI-powered theme extraction" \
  --body "From: 🔧 ADPA v2.0.0 - Future Improvements & Fine-Tuning\nSection: 🔧 ADPA v2.0.0 - Future Improvements & Fine-Tuning\n\n**Source**: FUTURE_IMPROVEMENTS.md\n**Task ID**: TASK-807\n**Effort**: TBD" \
  --label "ai,medium" \
  --assignee "" || echo "Failed to create TASK-807"

# Task 23/30: TASK-814
gh issue create \
  --repo "$REPO" \
  --title "Feedback-driven AI fine-tuning" \
  --body "From: 🔧 ADPA v2.0.0 - Future Improvements & Fine-Tuning\nSection: 🔧 ADPA v2.0.0 - Future Improvements & Fine-Tuning\n\n**Source**: FUTURE_IMPROVEMENTS.md\n**Task ID**: TASK-814\n**Effort**: TBD" \
  --label "ai,medium" \
  --assignee "" || echo "Failed to create TASK-814"

# Task 24/30: TASK-823
gh issue create \
  --repo "$REPO" \
  --title "Hierarchical data model and database schema" \
  --body "From: 🔧 ADPA v2.0.0 - Future Improvements & Fine-Tuning\nSection: 🔧 ADPA v2.0.0 - Future Improvements & Fine-Tuning\n\n**Source**: FUTURE_IMPROVEMENTS.md\n**Task ID**: TASK-823\n**Effort**: TBD" \
  --label "backend,ai,medium" \
  --assignee "" || echo "Failed to create TASK-823"

# Task 25/30: TASK-904
gh issue create \
  --repo "$REPO" \
  --title "Works for all queue types (ai, document, baseline, pipeline)" \
  --body "From: Job Monitor Enhancement - Worker & Queue Visibility\nSection: Job Monitor Enhancement - Worker & Queue Visibility\n\n**Source**: JOB_MONITOR_WORKER_QUEUE_ENHANCEMENT.md\n**Task ID**: TASK-904\n**Effort**: Small-Medium" \
  --label "ai,documentation,medium" \
  --assignee "" || echo "Failed to create TASK-904"

# Task 26/30: TASK-908
gh issue create \
  --repo "$REPO" \
  --title "AI Act compliance tracker" \
  --body "From: ADPA Market Readiness 2026 - PMBOK 8 + EU Regulations + Competitive Response\nSection: ADPA Market Readiness 2026 - PMBOK 8 + EU Regulations + Competitive Response\n\n**Source**: MARKET_READINESS_2026.md\n**Task ID**: TASK-908\n**Effort**: TBD" \
  --label "ai,high" \
  --assignee "" || echo "Failed to create TASK-908"

# Task 27/30: TASK-916
gh issue create \
  --repo "$REPO" \
  --title "100% EU AI Act compliance" \
  --body "From: ADPA Market Readiness 2026 - PMBOK 8 + EU Regulations + Competitive Response\nSection: ADPA Market Readiness 2026 - PMBOK 8 + EU Regulations + Competitive Response\n\n**Source**: MARKET_READINESS_2026.md\n**Task ID**: TASK-916\n**Effort**: TBD" \
  --label "ai,high" \
  --assignee "" || echo "Failed to create TASK-916"

# Task 28/30: TASK-952
gh issue create \
  --repo "$REPO" \
  --title "+ AI forecasting ← **ADPA Advantage!**" \
  --body "From: Microsoft PPM Competitive Analysis & Feature Parity Roadmap\nSection: Microsoft PPM Competitive Analysis & Feature Parity Roadmap\n\n**Source**: MICROSOFT_PPM_COMPETITIVE_ANALYSIS.md\n**Task ID**: TASK-952\n**Effort**: TBD" \
  --label "ai,medium" \
  --assignee "" || echo "Failed to create TASK-952"

# Task 29/30: TASK-960
gh issue create \
  --repo "$REPO" \
  --title "+ AI conflict resolution ← **ADPA Advantage!**" \
  --body "From: Microsoft PPM Competitive Analysis & Feature Parity Roadmap\nSection: Microsoft PPM Competitive Analysis & Feature Parity Roadmap\n\n**Source**: MICROSOFT_PPM_COMPETITIVE_ANALYSIS.md\n**Task ID**: TASK-960\n**Effort**: TBD" \
  --label "ai,medium" \
  --assignee "" || echo "Failed to create TASK-960"

# Task 30/30: TASK-965
gh issue create \
  --repo "$REPO" \
  --title "+ AI-powered scenarios ← **ADPA Advantage!**" \
  --body "From: Microsoft PPM Competitive Analysis & Feature Parity Roadmap\nSection: Microsoft PPM Competitive Analysis & Feature Parity Roadmap\n\n**Source**: MICROSOFT_PPM_COMPETITIVE_ANALYSIS.md\n**Task ID**: TASK-965\n**Effort**: TBD" \
  --label "ai,medium" \
  --assignee "" || echo "Failed to create TASK-965"


echo ""
echo "✅ Completed creating 30 issues"
