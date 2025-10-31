# ADPA Canonical Entity Catalog - Portfolio & Program Management

**Date**: October 31, 2025  
**Status**: 📋 **NAMING STANDARD** (Entities to be created)  
**Purpose**: Define canonical names and structure for all Portfolio/Program entities  
**Total Entities**: 85 (Strategic + Portfolio + Program + Project)  
**Implementation**: Weeks 1-12 (phased creation)

---

## 🎯 **NAMING CONVENTIONS**

### **Standards**:
- ✅ PascalCase for entity types (e.g., `BusinessCase`, `RiskRegister`)
- ✅ snake_case for database tables (e.g., `business_cases`, `risk_registers`)
- ✅ Singular for entity names (e.g., `Benefit` not `Benefits`)
- ✅ Descriptive, unambiguous names (e.g., `AcceptanceCriteria` not `Criteria`)
- ✅ Consistent across PMBOK 8, PMI, and ECS terminology

---

## 📊 **ENTITY HIERARCHY**

### **Level 1: Strategic (Organization)**

```yaml
Strategic Entities (8):
  Vision:
    table: portfolio_vision
    fields: [vision_statement, mission_statement, core_values]
    created: Week 9
    
  StrategicGoal:
    table: portfolio_strategic_goals
    fields: [goal_title, goal_category, target_year, priority_rank]
    created: Week 9
    
  Objective:
    table: portfolio_objectives
    fields: [objective_title, smart_criteria, success_metrics]
    created: Week 9
    
  OKR:
    table: portfolio_okrs
    fields: [objective_title, level, okr_period, confidence_level]
    created: Week 9
    
  KeyResult:
    table: portfolio_key_results
    fields: [key_result_title, baseline_value, target_value, current_value]
    created: Week 9
    
  KPI:
    table: portfolio_kpis
    fields: [kpi_name, metric_formula, target_value, current_value, rag_status]
    created: Week 9
    
  KSF:
    table: portfolio_key_success_factors
    fields: [ksf_name, criticality, success_criteria, achievement_status]
    created: Week 10
    
  StrategicRoadmap:
    table: portfolio_roadmaps
    fields: [roadmap_name, roadmap_type, time_horizon]
    created: Week 12
```

---

### **Level 2: Portfolio (Programs)**

```yaml
Portfolio Entities (25):
  
  # Governance
  Governance:
    table: program_governance
    fields: [governance_model, steering_committee, policies]
    created: Week 6
    
  Decision:
    table: portfolio_decisions
    fields: [decision_type, decision_date, decided_by, rationale]
    created: Week 6
    
  Approval:
    table: approval_workflow
    fields: [approver_id, approval_step, status, approved_at]
    created: Week 6
    
  Policy:
    table: portfolio_policies
    fields: [policy_name, policy_document, effective_date]
    created: Week 6
    
  StageGate:
    table: portfolio_stage_gates
    fields: [gate_name, gate_number, entry_criteria, exit_criteria]
    created: Week 6
    
  # Financial
  Budget:
    table: program_budgets
    fields: [total_budget, labor_budget, materials_budget, contingency_budget]
    created: Week 1
    
  CostItem:
    table: program_cost_items
    fields: [cost_category, amount, account_code, transaction_date]
    created: Week 1
    
  CostPerformance:
    table: program_cost_performance
    fields: [planned_value, earned_value, actual_cost, cpi, spi]
    created: Week 1
    
  FundingTranche:
    table: program_funding
    fields: [source_name, committed_amount, availability_date]
    created: Week 2
    
  FinancialAnalysis:
    table: program_financial_analysis
    fields: [roi_percent, npv, irr_percent, payback_period_months]
    created: Week 2
    
  Forecast:
    table: program_forecasts
    fields: [forecast_date, forecast_total_cost, confidence_level]
    created: Week 2
    
  # Benefits
  Benefit:
    table: program_benefits
    fields: [benefit_name, expected_value, actual_value, realization_status]
    created: Week 7
    
  BenefitsRealizationReport:
    table: benefits_realization_reports
    fields: [reporting_period, total_expected, total_realized, realization_rate]
    created: Week 7
    
  # Resources
  Resource:
    table: program_resources
    fields: [resource_name, resource_type, total_capacity, utilization_percent]
    created: Week 3
    
  ResourceAllocation:
    table: program_resource_allocations
    fields: [resource_id, project_id, allocated_amount, allocation_percentage]
    created: Week 3
    
  CapacityPlan:
    table: program_capacity_forecast
    fields: [forecast_period, human_capacity_fte, financial_capacity]
    created: Week 3
    
  Skill:
    table: program_skills_inventory
    fields: [skill_name, proficiency_level, years_experience]
    created: Week 3
    
  ResourceBreakdownStructure:
    table: portfolio_resource_breakdown_structure
    fields: [rbs_code, rbs_level, rbs_name, department]
    created: Week 3
    
  TimePhasedAllocation:
    table: portfolio_resource_timephasing
    fields: [time_period, available_capacity, allocated_capacity]
    created: Week 4
    
  # Risk
  Risk:
    table: program_risks
    fields: [risk_title, probability, impact_financial, severity, mitigation_strategy]
    created: Week 5
    
  RiskRegister:
    table: program_risk_register
    fields: [program_id, total_risks, critical_risks, total_exposure]
    created: Week 5
    
  Control:
    table: program_controls
    fields: [control_name, control_type, effectiveness_rating]
    created: Week 5
    
  Issue:
    table: program_issues
    fields: [issue_title, severity, status, assigned_to]
    created: Week 5
    
  # Stakeholders
  Stakeholder:
    table: program_stakeholders
    fields: [name, role, interest_level, influence_level, satisfaction_score]
    created: Week 6
    
  RACI:
    table: program_raci_matrix
    fields: [activity, responsible, accountable, consulted, informed]
    created: Week 6
    
  CommunicationPlan:
    table: program_communication_plans
    fields: [stakeholder_id, frequency, method, content_type]
    created: Week 6
```

---

### **Level 3: Program/Project Specific**

```yaml
Program/Project Entities (30):
  
  # Initiation
  BusinessCase:
    table: business_cases
    fields: [problem_statement, solution_approach, financial_justification, roi_analysis]
    created: Week 10
    
  Charter:
    table: project_charters
    fields: [project_purpose, objectives, success_criteria, authority_levels]
    created: Week 10
    
  ProblemStatement:
    table: problem_statements
    fields: [problem_description, affected_stakeholders, business_impact]
    created: Week 10
    
  ValueHypothesis:
    table: value_hypotheses
    fields: [hypothesis_statement, expected_value, validation_criteria]
    created: Week 10
    
  # Scope
  Requirement:
    table: requirements
    fields: [requirement_text, requirement_type, priority, status]
    created: Future (exists in ADPA?)
    
  AcceptanceCriteria:
    table: acceptance_criteria
    fields: [criteria_text, measurable, testable, linked_requirement_id]
    created: Week 10
    
  TraceLink:
    table: trace_links
    fields: [source_entity_id, target_entity_id, link_type, bidirectional]
    created: Week 10
    
  ScopeStatement:
    table: scope_statements
    fields: [in_scope, out_of_scope, assumptions, constraints]
    created: Week 10
    
  Epic:
    table: epics
    fields: [epic_title, epic_description, business_value]
    created: Future
    
  Feature:
    table: features
    fields: [feature_name, feature_description, acceptance_criteria]
    created: Future
    
  Story:
    table: user_stories
    fields: [story_text, story_points, acceptance_criteria]
    created: Future
    
  # Schedule
  Schedule:
    table: project_schedules
    fields: [schedule_name, start_date, end_date, baseline_date]
    created: Week 12
    
  Task:
    table: project_tasks
    fields: [task_name, duration, dependencies, assigned_to]
    created: Week 12
    
  Milestone:
    table: project_milestones
    fields: [milestone_name, target_date, status, completion_date]
    created: Week 12
    
  Dependency:
    table: project_dependencies
    fields: [predecessor_id, successor_id, dependency_type, lag_days]
    created: Week 12
    
  Baseline:
    table: project_baselines
    fields: [baseline_name, baseline_type, baselined_at, is_current]
    created: Exists (baselines table)
    
  # Change
  ChangeRequest:
    table: change_requests
    fields: [change_title, change_type, impact_assessment, approval_status]
    created: Week 6
    
  ChangeImpactAssessment:
    table: change_impact_assessments
    fields: [affected_areas, cost_impact, schedule_impact, risk_impact]
    created: Week 6
    
  # Quality
  QualityStandard:
    table: program_quality_standards
    fields: [standard_name, measurement_criteria, target_value]
    created: Future
    
  QualityAudit:
    table: program_quality_audits
    fields: [audit_date, findings, conformance_score]
    created: Future
    
  # Operations
  Runbook:
    table: operational_runbooks
    fields: [runbook_name, procedures, escalation_procedures]
    created: Future
    
  Playbook:
    table: operational_playbooks
    fields: [playbook_name, scenarios, response_procedures]
    created: Future
    
  SupportModel:
    table: support_models
    fields: [support_tier, sla, escalation_path]
    created: Future
    
  SLA:
    table: service_level_agreements
    fields: [sla_name, target_metric, target_value]
    created: Future
    
  # Lessons Learned
  LessonsLearned:
    table: lessons_learned
    fields: [lesson_title, situation, action_taken, result, recommendation]
    created: Future (PMBOK 8 roadmap)
    
  BestPractice:
    table: best_practices
    fields: [practice_name, practice_description, applicability]
    created: Exists
    
  Retrospective:
    table: retrospectives
    fields: [what_went_well, what_to_improve, action_items]
    created: Future
    
  # Integration
  IntegrationPoint:
    table: integration_points
    fields: [source_project, target_project, interface_type, data_exchanged]
    created: Future
    
  Handoff:
    table: project_handoffs
    fields: [from_project, to_project, handoff_type, handoff_date]
    created: Future
```

---

### **Level 4: Compliance & Regulatory**

```yaml
Compliance Entities (15):
  
  ComplianceObligation:
    table: compliance_obligations
    fields: [regulation, obligation_text, due_date, status]
    created: Week 8
    
  RegulatoryRequirement:
    table: regulatory_requirements
    fields: [regulation_name, requirement_type, applicability]
    created: Week 8
    
  ESGMetric:
    table: portfolio_esg_metrics
    fields: [carbon_footprint, diversity_score, governance_score]
    created: Week 8
    
  AIActCompliance:
    table: ai_act_compliance
    fields: [ai_system_name, risk_category, compliance_status]
    created: Week 8
    
  CSRDReport:
    table: csrd_reports
    fields: [reporting_period, esrs_datapoints, assured_by]
    created: Week 8
    
  NIS2Control:
    table: nis2_controls
    fields: [control_name, control_category, implementation_status]
    created: Week 8
    
  DORACompliance:
    table: dora_compliance
    fields: [ict_risk_framework, resilience_testing, third_party_mgmt]
    created: Week 8
    
  PolicyGate:
    table: portfolio_policy_gates
    fields: [gate_id, gate_name, required_evidence, gate_status]
    created: Week 6
    
  ComplianceEvidence:
    table: compliance_evidence
    fields: [evidence_type, evidence_url, verified_by, verified_at]
    created: Week 8
    
  AuditTrail:
    table: audit_logs
    fields: [action, resource_type, user_id, timestamp]
    created: Exists
    
  ConformityAssessment:
    table: conformity_assessments
    fields: [assessment_type, assessment_date, outcome, assessor]
    created: Week 8
    
  RegulatoryGate:
    table: regulatory_gates
    fields: [regulation, requirements, gate_status, assessor_id]
    created: Week 8
    
  TransparencyReport:
    table: ai_transparency_reports
    fields: [ai_system, disclosure_items, published_date]
    created: Week 8
    
  DataGovernance:
    table: data_governance
    fields: [data_classification, retention_policy, access_controls]
    created: Week 8
    
  IncidentReport:
    table: incident_reports
    fields: [incident_type, severity, reported_to, resolution]
    created: Week 8
```

---

### **Level 5: Prioritization & Decision-Making**

```yaml
Prioritization Entities (7):
  
  PrioritizationCriteria:
    table: prioritization_criteria
    fields: [criteria_name, weight, scoring_method, is_active]
    created: Week 1
    
  ProjectScore:
    table: project_priority_scores
    fields: [project_id, criteria_id, raw_score, weighted_score, justification]
    created: Week 1
    
  PriorityRanking:
    table: portfolio_priority_rankings
    fields: [project_id, total_score, rank_position, priority_tier]
    created: Week 1
    
  Scenario:
    table: portfolio_scenarios
    fields: [scenario_name, included_projects, total_budget, expected_roi]
    created: Week 5
    
  OptimizationConstraint:
    table: optimization_constraints
    fields: [constraint_type, constraint_value, priority]
    created: Week 11
    
  BusinessDriver:
    table: business_drivers
    fields: [driver_name, driver_category, strategic_importance]
    created: Week 9
    
  ValueMetric:
    table: value_metrics
    fields: [metric_name, measurement_method, target_value]
    created: Week 7
```

---

## 🗓️ **ENTITY CREATION ROADMAP**

### **Week 1: Financial Foundation** (8 entities)

```sql
-- Created in Migration 203
CREATE TABLE program_budgets (...)
CREATE TABLE program_cost_performance (...)  -- EVM
CREATE TABLE program_cost_items (...)
CREATE TABLE prioritization_criteria (...)   -- For prioritization matrix
CREATE TABLE project_priority_scores (...)
CREATE TABLE portfolio_priority_rankings (...)
CREATE TABLE portfolio_cost_constraints (...)
CREATE TABLE program_financial_transactions (...)
```

**Entities Defined**: `Budget`, `CostItem`, `CostPerformance`, `PrioritizationCriteria`, `ProjectScore`, `PriorityRanking`

---

### **Week 2: Financial Analysis** (4 entities)

```sql
-- Created in Migration 204
CREATE TABLE program_forecasts (...)
CREATE TABLE program_financial_analysis (...)  -- ROI/NPV/IRR
CREATE TABLE program_funding (...)
CREATE TABLE program_cash_flow (...)
```

**Entities Defined**: `Forecast`, `FinancialAnalysis`, `FundingTranche`, `CashFlow`

---

### **Week 3: Resource Management** (6 entities)

```sql
-- Created in Migration 205
CREATE TABLE program_resources (...)
CREATE TABLE program_resource_allocations (...)
CREATE TABLE program_capacity_forecast (...)
CREATE TABLE program_skills_inventory (...)
CREATE TABLE portfolio_resource_breakdown_structure (...)  -- RBS
CREATE TABLE program_resource_performance (...)
```

**Entities Defined**: `Resource`, `ResourceAllocation`, `CapacityPlan`, `Skill`, `ResourceBreakdownStructure`, `ResourcePerformance`

---

### **Week 4: Performance & Health** (3 entities)

```sql
-- Created in Migration 206
CREATE TABLE program_health_metrics (...)     -- Your 5 metrics
CREATE TABLE portfolio_resource_timephasing (...)  -- Time-phased
CREATE TABLE program_performance_kpis (...)
```

**Entities Defined**: `HealthMetric`, `TimePhasedAllocation`, `PerformanceKPI`

---

### **Week 5: Risk Management** (5 entities)

```sql
-- Created in Migration 207
CREATE TABLE program_risks (...)
CREATE TABLE program_risk_register (...)
CREATE TABLE program_controls (...)
CREATE TABLE program_issues (...)
CREATE TABLE risk_mitigation_plans (...)
```

**Entities Defined**: `Risk`, `RiskRegister`, `Control`, `Issue`, `MitigationPlan`

---

### **Week 6: Governance & Stakeholders** (9 entities)

```sql
-- Created in Migration 208
CREATE TABLE program_governance (...)
CREATE TABLE portfolio_decisions (...)
CREATE TABLE approval_workflow (...)
CREATE TABLE portfolio_stage_gates (...)
CREATE TABLE portfolio_gate_reviews (...)
CREATE TABLE program_stakeholders (...)
CREATE TABLE program_raci_matrix (...)
CREATE TABLE program_communication_plans (...)
CREATE TABLE change_requests (...)
```

**Entities Defined**: `Governance`, `Decision`, `Approval`, `StageGate`, `GateReview`, `Stakeholder`, `RACI`, `CommunicationPlan`, `ChangeRequest`

---

### **Week 7: Benefits & Value** (4 entities)

```sql
-- Created in Migration 209
CREATE TABLE program_benefits (...)           -- Your template
CREATE TABLE benefits_realization_reports (...)
CREATE TABLE value_metrics (...)
CREATE TABLE value_stream_maps (...)
```

**Entities Defined**: `Benefit`, `BenefitsRealizationReport`, `ValueMetric`, `ValueStream`

---

### **Week 8: Compliance & Regulatory** (15 entities) 🔴 **CRITICAL**

```sql
-- Created in Migration 210 (EU Compliance)
CREATE TABLE compliance_obligations (...)
CREATE TABLE regulatory_requirements (...)
CREATE TABLE portfolio_esg_metrics (...)
CREATE TABLE ai_act_compliance (...)
CREATE TABLE csrd_reports (...)
CREATE TABLE nis2_controls (...)
CREATE TABLE dora_compliance (...)
CREATE TABLE portfolio_policy_gates (...)
CREATE TABLE portfolio_regulatory_gates (...)
CREATE TABLE compliance_evidence (...)
CREATE TABLE conformity_assessments (...)
CREATE TABLE ai_transparency_reports (...)
CREATE TABLE data_governance (...)
CREATE TABLE incident_reports (...)
CREATE TABLE audit_trails (...)               -- Enhanced
```

**Entities Defined**: `ComplianceObligation`, `RegulatoryRequirement`, `ESGMetric`, `AIActCompliance`, `CSRDReport`, `NIS2Control`, `DORACompliance`, `PolicyGate`, `RegulatoryGate`, `ComplianceEvidence`, `ConformityAssessment`, `TransparencyReport`, `DataGovernance`, `IncidentReport`, `AuditTrail`

---

### **Week 9-10: Strategic Frameworks** (8 entities)

```sql
-- Created in Migration 211
CREATE TABLE portfolio_vision (...)
CREATE TABLE portfolio_strategic_goals (...)
CREATE TABLE portfolio_objectives (...)
CREATE TABLE portfolio_okrs (...)
CREATE TABLE portfolio_key_results (...)
CREATE TABLE portfolio_kpis (...)
CREATE TABLE portfolio_key_success_factors (...)
CREATE TABLE business_drivers (...)
```

**Entities Defined**: `Vision`, `StrategicGoal`, `Objective`, `OKR`, `KeyResult`, `KPI`, `KSF`, `BusinessDriver`

---

### **Week 11-12: Advanced Features** (10 entities)

```sql
-- Created in Migration 212
CREATE TABLE portfolio_scenarios (...)
CREATE TABLE optimization_constraints (...)
CREATE TABLE portfolio_roadmaps (...)
CREATE TABLE portfolio_roadmap_items (...)
CREATE TABLE business_cases (...)             -- Full implementation
CREATE TABLE project_charters (...)
CREATE TABLE project_schedules (...)
CREATE TABLE project_dependencies (...)
CREATE TABLE acceptance_criteria (...)
CREATE TABLE trace_links (...)
```

**Entities Defined**: `Scenario`, `OptimizationConstraint`, `StrategicRoadmap`, `RoadmapItem`, `BusinessCase` (full), `Charter` (full), `Schedule`, `Dependency`, `AcceptanceCriteria`, `TraceLink`

---

## 📋 **PMBOK 8 POLICY PACK (YAML)** - **Final Version**

### **Ready for Implementation** (Use these exact names):

```yaml
version: 1.0
name: "ADPA PMBOK-8 + EU Compliance Policy Pack"
standards:
  - PMBOK_Guide_8th_Edition
  - PMI_Portfolio_Standard_4th
  - PMI_Program_Standard_4th
  - EU_AI_Act_2024
  - EU_CSRD_ESRS
  - EU_NIS2_Directive
  - EU_DORA_Regulation

metadata:
  organization: "ADPA"
  owner: "EPMO"
  effective_date: "2026-01-01"
  review_frequency: "quarterly"
  last_updated: "2025-10-31"

# ============================================================================
# STAGE GATES (8 Gates Aligned with PMBOK 8 Focus Areas)
# ============================================================================

gates:
  - id: G0
    name: "Intake Triage"
    pmbok8_focus_areas: ["Initiating"]
    pmbok8_domains: ["Governance", "Stakeholders"]
    
    required_entities:
      - ProblemStatement
      - ValueHypothesis
      - Stakeholder
      
    conditions:
      - type: "duplicate-check"
        description: "Ensure not duplicate of existing Initiative"
        entity: "Initiative"
        automation: "semantic_search"
        
      - type: "link-check"
        description: "Must link to at least one strategic objective"
        entity: "OKR"
        required_links: 1
        
      - type: "stakeholder-salience"
        description: "At least one high-influence stakeholder identified"
        min_influence: "medium"
        
    approvals:
      - role: "ProductOwner"
        level: 1
        sla_hours: 48
      - role: "PortfolioOwner"
        level: 1
        sla_hours: 72
        
    automated_actions:
      - action: "assign_tracking_id"
      - action: "create_intake_record"
      - action: "notify_stakeholders"

  # ─────────────────────────────────────────────────────────────────────
  
  - id: G1
    name: "Business Case Approval"
    pmbok8_focus_areas: ["Initiating", "Planning"]
    pmbok8_domains: ["Governance", "Finance", "Scope"]
    
    required_entities:
      - BusinessCase
      - HighLevelScope
      - Benefit
      - RoughOrderOfMagnitude
      - RiskRegister
      
    conditions:
      - type: "metric-check"
        description: "Financial metrics meet minimum thresholds"
        metrics:
          - name: "NPV"
            operator: ">"
            value: 0
          - name: "ROI"
            operator: ">="
            value: 15  # percentage
          - name: "PaybackPeriod"
            operator: "<="
            value: 36  # months
            
      - type: "esg-materiality-check"
        description: "ESG impact assessed if material"
        regulation: "CSRD-ESRS"
        required_if: "double_materiality_threshold_met"
        
      - type: "compliance-tagging"
        description: "Auto-tag applicable regulations"
        regulations:
          - name: "EU-AI-Act"
            check: "uses_ai_systems"
            tags: ["AI-ACT-LIMITED-RISK", "AI-ACT-TRANSPARENCY"]
          - name: "NIS2"
            check: "sector_in_scope"
            tags: ["NIS2-ESSENTIAL", "NIS2-IMPORTANT"]
          - name: "DORA"
            check: "is_financial_entity"
            tags: ["DORA-ICT-RISK", "DORA-RESILIENCE"]
            
      - type: "capacity-check"
        description: "Owner has capacity to lead"
        entity: "Owner"
        required_capacity: 0.25  # 25% FTE minimum
        
    approvals:
      - role: "InvestmentBoard"
        level: 2
        sla_hours: 168  # 1 week
        voting: "majority"
        
    automated_actions:
      - action: "calculate_priority_score"
      - action: "check_portfolio_balance"
      - action: "reserve_budget"

  # ─────────────────────────────────────────────────────────────────────
  
  - id: G2
    name: "Charter & Governance Approval"
    pmbok8_focus_areas: ["Planning"]
    pmbok8_domains: ["Governance", "Stakeholders"]
    
    required_entities:
      - Charter
      - Decision
      - Approval
      - RACI
      - CommunicationPlan
      
    conditions:
      - type: "decision-ledger-check"
        description: "Authorization decision recorded"
        required_fields: ["decision_type", "decided_by", "rationale"]
        
      - type: "escalation-path-check"
        description: "Clear escalation path defined"
        min_levels: 3
        
      - type: "ai-usage-declaration"
        description: "If AI used, declare and classify per AI Act"
        regulation: "EU-AI-Act"
        if_yes:
          required_entities: ["AISystemInventory", "RiskClassification", "TransparencyNotice"]
          
    approvals:
      - role: "ExecutiveSponsor"
        level: 3
        sla_hours: 72
        
    automated_actions:
      - action: "create_program_record"
      - action: "assign_tracking_code"
      - action: "initialize_governance_board"

  # ─────────────────────────────────────────────────────────────────────
  
  - id: G3
    name: "Solution Scope Ready"
    pmbok8_focus_areas: ["Planning"]
    pmbok8_domains: ["Scope", "Stakeholders"]
    
    required_entities:
      - Requirement
      - AcceptanceCriteria
      - TraceLink
      - ArchitectureSketch
      
    conditions:
      - type: "conflict-resolution-check"
        description: "All requirement conflicts resolved via ECS"
        engine: "ecs_evidence_weighted"
        max_unresolved: 0
        
      - type: "temporal-decay-revalidate"
        description: "Old requirements revalidated or removed"
        entity: "Requirement"
        max_age_days: 180
        action_if_stale: "flag_for_revalidation"
        
      - type: "traceability-coverage"
        description: "Requirements traced to acceptance criteria"
        min_coverage: 90  # percentage
        
    approvals:
      - role: "DesignAuthority"
        level: 2
        sla_hours: 120  # 5 days
        
    automated_actions:
      - action: "generate_traceability_matrix"
      - action: "check_architecture_patterns"

  # ─────────────────────────────────────────────────────────────────────
  
  - id: G4
    name: "Plan & Baselines Approved"
    pmbok8_focus_areas: ["Planning"]
    pmbok8_domains: ["Schedule", "Finance", "Resources"]
    
    required_entities:
      - Schedule
      - Baseline
      - Budget
      - CapacityPlan
      
    conditions:
      - type: "critical-path-exists"
        description: "Schedule has identified critical path"
        required: true
        
      - type: "capacity-coverage"
        description: "Resource capacity meets demand"
        operator: ">="
        threshold: 100  # percentage
        
      - type: "variance-explainer-enabled"
        description: "Baseline variance tracking configured"
        required_fields: ["baseline_date", "variance_threshold", "alert_recipients"]
        
      - type: "budget-reconciliation"
        description: "Budget matches cost estimates +/- tolerance"
        tolerance_percent: 10
        
    approvals:
      - role: "PMO"
        level: 2
        sla_hours: 96  # 4 days
        
    automated_actions:
      - action: "create_baseline_snapshot"
      - action: "enable_variance_tracking"
      - action: "schedule_health_checks"

  # ─────────────────────────────────────────────────────────────────────
  
  - id: G5
    name: "Risk & Control Coverage"
    pmbok8_focus_areas: ["Planning", "Executing"]
    pmbok8_domains: ["Risk", "Governance"]
    
    required_entities:
      - RiskRegister
      - Control
      - TestPlan
      
    conditions:
      - type: "regulatory-coverage"
        description: "All applicable regulations addressed"
        packs:
          - name: "EU-AI-Act"
            applicable_if: "uses_ai_systems == true"
            required_evidence:
              - "AISystemInventory"
              - "RiskClassification"
              - "TransparencyReport"
              - "HumanOversightPlan"
              - "ProviderAttestations"
            reference: "https://europarl.europa.eu/RegData/etudes/ATAG/2025/772906/EPRS_ATA(2025)772906_EN.pdf"
            
          - name: "NIS2"
            applicable_if: "sector IN ['energy','transport','banking','health','digital','water','waste','space']"
            required_evidence:
              - "CyberRiskManagementFramework"
              - "IncidentReportingProcedure"
              - "BusinessContinuityPlan"
              - "SupplyChainSecurityControls"
              - "BoardOversightEvidence"
            reference: "https://digital-strategy.ec.europa.eu/en/policies/nis2-directive"
            
          - name: "DORA"
            applicable_if: "is_financial_entity == true"
            required_evidence:
              - "ICTRiskManagementFramework"
              - "IncidentReportingProcess"
              - "DigitalResilienceTestingPlan"
              - "ThirdPartyICTRegister"
              - "ICTContractualArrangements"
            reference: "https://www.eiopa.europa.eu/digital-operational-resilience-act-dora_en"
            
          - name: "CSRD-ESRS"
            applicable_if: "company_size >= 'large' OR publicly_listed == true"
            required_evidence:
              - "DoubleMaterialityAssessment"
              - "ESGDatapointCollection"
              - "SustainabilityGovernance"
            reference: "https://www.ethicaesg.com/wp-content/uploads/2025/09/ESRS-Insights-2-ESRS-Applicability-Timelines.pdf"
            
      - type: "control-effectiveness"
        description: "High/critical risks have effective controls"
        min_effectiveness: 70  # percentage
        
    approvals:
      - role: "RiskOfficer"
        level: 2
        sla_hours: 120
      - role: "ComplianceOfficer"
        level: 2
        sla_hours: 120
        required_if: "regulatory_obligations_present"
        
    automated_actions:
      - action: "generate_risk_heatmap"
      - action: "calculate_risk_exposure"
      - action: "check_control_coverage"

  # ─────────────────────────────────────────────────────────────────────
  
  - id: G6
    name: "Release / PI Go"
    pmbok8_focus_areas: ["Executing"]
    pmbok8_domains: ["Scope", "Quality", "Risk"]
    
    required_entities:
      - IncrementPlan
      - ScopeCommit
      - TestEvidence
      - RollbackPlan
      
    conditions:
      - type: "change-approval-ledger"
        description: "All changes approved and documented"
        max_unapproved_changes: 0
        
      - type: "control-to-feature-link"
        description: "Security/compliance controls linked to features"
        min_coverage: 95  # percentage
        
      - type: "test-coverage"
        description: "Automated test coverage meets threshold"
        min_coverage: 80  # percentage
        
    approvals:
      - role: "ReleaseAuthority"
        level: 2
        sla_hours: 24
        
    automated_actions:
      - action: "create_release_tag"
      - action: "trigger_deployment_pipeline"
      - action: "notify_stakeholders"

  # ─────────────────────────────────────────────────────────────────────
  
  - id: G7
    name: "Operational Readiness"
    pmbok8_focus_areas: ["Monitoring & Controlling"]
    pmbok8_domains: ["Risk", "Resources", "Quality"]
    
    required_entities:
      - Runbook
      - Playbook
      - SupportModel
      - MonitoringKPIs
      - SLA
      - SecurityReview
      
    conditions:
      - type: "oncall-coverage"
        description: "24/7 support coverage defined"
        required_coverage: "24x7"
        
      - type: "observability-kpis"
        description: "Monitoring KPIs configured"
        required_kpis: ["availability", "latency", "error_rate", "throughput"]
        
      - type: "vulnerability-backlog"
        description: "No critical vulnerabilities unaddressed"
        max_critical: 0
        max_high: 3
        
      - type: "incident-response-plan"
        description: "Incident response procedures tested"
        last_test_max_age_days: 90
        
    approvals:
      - role: "ServiceOwner"
        level: 2
        sla_hours: 48
      - role: "CISO"
        level: 3
        sla_hours: 72
        required_if: "handles_sensitive_data OR regulated_system"
        
    automated_actions:
      - action: "enable_monitoring"
      - action: "configure_alerts"
      - action: "activate_oncall_rotation"

  # ─────────────────────────────────────────────────────────────────────
  
  - id: G8
    name: "Value Realization & Closure"
    pmbok8_focus_areas: ["Closing"]
    pmbok8_domains: ["Finance", "Governance"]
    pmbok8_principles: ["Focus on Value", "Integrate Sustainability"]
    
    required_entities:
      - BenefitsRealizationReport
      - ESGMetricUpdate
      - LessonsLearned
      - DecisionPostMortem
      
    conditions:
      - type: "outcome-benefit-linkage"
        description: "Outcomes linked to planned benefits"
        min_linkage: 90  # percentage
        
      - type: "esg-delta-recorded"
        description: "ESG impact measured and reported"
        regulation: "CSRD-ESRS"
        required_if: "csrd_applicable == true"
        metrics: ["carbon_footprint_change", "diversity_impact", "governance_improvements"]
        
      - type: "knowledge-capture"
        description: "Lessons learned documented"
        min_lessons: 5
        categories: ["technical", "process", "team", "stakeholder", "risk"]
        
      - type: "temporal-decay-timer"
        description: "Knowledge has decay timer for refresh"
        default_decay_days: 365
        
    approvals:
      - role: "PortfolioBoard"
        level: 3
        sla_hours: 168  # 1 week
        voting: "consensus"
        
    automated_actions:
      - action: "calculate_benefit_realization_rate"
      - action: "generate_closure_report"
      - action: "archive_program"
      - action: "schedule_knowledge_refresh"

# ============================================================================
# REGULATORY COMPLIANCE PACKS
# ============================================================================

compliance_packs:
  - name: "EU-AI-Act-2024"
    regulation_id: "EU-2024-1689"
    effective_date: "2026-08-02"  # General application
    applicability_check: "uses_ai_systems == true"
    
    risk_categories:
      - category: "prohibited"
        controls: ["immediate_halt", "decommission"]
        
      - category: "high-risk"
        controls:
          - "conformity_assessment"
          - "ce_marking"
          - "technical_documentation"
          - "risk_management_system"
          - "data_governance"
          - "transparency_obligations"
          - "human_oversight"
          - "accuracy_robustness"
          
      - category: "limited-risk"
        controls:
          - "transparency_notification"
          - "user_awareness"
          
      - category: "minimal-risk"
        controls: ["voluntary_code_of_conduct"]
        
    gates_affected: ["G1", "G2", "G5"]
    
  # ─────────────────────────────────────────────────────────────────────
  
  - name: "CSRD-ESRS"
    regulation_id: "EU-2022-2464"
    effective_date: "2025-01-01"  # Phased by company size
    applicability_check: "company_size IN ['large', 'listed-sme'] OR parent_meets_criteria == true"
    
    required_assessments:
      - "double_materiality_assessment"
      - "stakeholder_engagement"
      - "esg_datapoint_collection"
      
    reporting_requirements:
      - domain: "Environmental"
        metrics: ["carbon_footprint", "energy_consumption", "waste_generation"]
      - domain: "Social"
        metrics: ["diversity_inclusion", "employee_wellbeing", "community_impact"]
      - domain: "Governance"
        metrics: ["board_diversity", "ethics_compliance", "data_privacy"]
        
    gates_affected: ["G1", "G5", "G8"]
    
  # ─────────────────────────────────────────────────────────────────────
  
  - name: "NIS2-Directive"
    regulation_id: "EU-2022-2555"
    effective_date: "2024-10-17"  # In force, national transposition ongoing
    applicability_check: "sector IN ['energy','transport','banking','health','digital','water','waste','space','manufacturing','post','food']"
    
    required_controls:
      - "cyber_risk_management_measures"
      - "incident_handling_procedures"
      - "business_continuity_plans"
      - "supply_chain_security"
      - "security_in_acquisition"
      - "vulnerability_management"
      - "incident_reporting_24h"  # 24 hours for significant incidents
      - "board_level_accountability"
      
    gates_affected: ["G2", "G5", "G7"]
    
  # ─────────────────────────────────────────────────────────────────────
  
  - name: "DORA-Regulation"
    regulation_id: "EU-2022-2554"
    effective_date: "2025-01-17"  # In force (no transition period)
    applicability_check: "is_financial_entity == true"
    
    required_frameworks:
      - "ict_risk_management_framework"
      - "incident_classification_taxonomy"
      - "digital_resilience_testing_plan"  # TLPT for critical entities
      - "third_party_ict_service_provider_register"
      
    monitoring_requirements:
      - "major_incident_reporting"  # To supervisory authority
      - "cyber_threat_intelligence_sharing"
      - "ict_related_incident_log"
      
    gates_affected: ["G5", "G7"]

# ============================================================================
# ECS INTEGRATION HOOKS
# ============================================================================

ecs_integration:
  authority_model:
    description: "Hierarchical authority for gate approvals"
    levels:
      - level: 1
        roles: ["ProductOwner", "PortfolioOwner", "TeamLead"]
        scope: "tactical_decisions"
        
      - level: 2
        roles: ["PMO", "InvestmentBoard", "DesignAuthority", "RiskOfficer"]
        scope: "program_approvals"
        
      - level: 3
        roles: ["ExecutiveSponsor", "PortfolioBoard", "CISO"]
        scope: "strategic_decisions"
        
  evidence_graph:
    description: "Link entities to evidence for automated validation"
    enabled: true
    conflict_resolution: "ecs_weighted_voting"
    
  temporal_decay:
    description: "Auto-expire stale entities unless revalidated"
    enabled: true
    default_ttl_days: 180
    entities:
      - entity: "Requirement"
        ttl_days: 180
      - entity: "Skill"
        ttl_days: 365
      - entity: "Risk"
        ttl_days: 90
        
  decision_ledger:
    description: "Record all gate decisions with rationale"
    enabled: true
    immutable: true
    audit_trail: true

# ============================================================================
# AUTOMATION & AI INTEGRATION
# ============================================================================

ai_automation:
  - gate_id: "G0"
    automation: "semantic_duplicate_detection"
    model: "text-embedding-3-large"
    threshold: 0.85
    
  - gate_id: "G1"
    automation: "strategic_fit_scoring"
    model: "gpt-4"
    criteria: ["strategic_alignment", "value_contribution", "feasibility"]
    
  - gate_id: "G3"
    automation: "requirement_conflict_detection"
    engine: "ecs_evidence_weighted"
    
  - gate_id: "G5"
    automation: "regulatory_compliance_check"
    models: ["gpt-4", "compliance_rules_engine"]
    
  - gate_id: "G8"
    automation: "lessons_learned_extraction"
    model: "gpt-4"
    sources: ["retrospectives", "incident_reports", "decision_logs"]

# ============================================================================
# NOTIFICATION & ESCALATION
# ============================================================================

notifications:
  channels: ["email", "dashboard", "slack", "teams"]
  
  templates:
    - id: "gate_pending_approval"
      trigger: "gate_submitted"
      recipients: ["approvers"]
      sla_reminder_hours: [24, 48, 72]
      
    - id: "gate_approved"
      trigger: "gate_approved"
      recipients: ["submitter", "stakeholders"]
      
    - id: "gate_rejected"
      trigger: "gate_rejected"
      recipients: ["submitter", "sponsor"]
      include: ["rejection_rationale", "recommended_actions"]
      
    - id: "sla_breach"
      trigger: "approval_sla_exceeded"
      recipients: ["approver", "approver_manager", "pmo"]
      escalation: true

# ============================================================================
# METRICS & REPORTING
# ============================================================================

metrics:
  gate_performance:
    - "avg_approval_time_by_gate"
    - "approval_rate_by_gate"
    - "sla_compliance_by_gate"
    - "rejection_rate_by_gate"
    
  compliance_coverage:
    - "ai_act_compliance_rate"
    - "csrd_readiness_score"
    - "nis2_control_coverage"
    - "dora_compliance_rate"
    
  portfolio_health:
    - "programs_at_each_gate"
    - "avg_time_gate_to_gate"
    - "bottleneck_gates"
    - "gate_bypass_rate"

# ============================================================================
# TOOL-SPECIFIC EXPORT FORMATS
# ============================================================================

export_formats:
  servicenow_spm:
    format: "xml"
    mappings:
      gates: "spm_policy_compliance"
      approvals: "approval_flows"
      conditions: "business_rules"
      
  jira_align:
    format: "json"
    mappings:
      gates: "workflow_transitions"
      approvals: "approval_steps"
      conditions: "validators"
      
  microsoft_planner:
    format: "power_automate_json"
    mappings:
      gates: "planner_checkpoints"
      approvals: "approval_workflows"
      conditions: "dataverse_rules"
```

---

## ✅ **ENTITY CREATION SUMMARY**

### **By Week**:

```
Week 1:  8 entities (Financial + Prioritization)
Week 2:  4 entities (Forecasting)
Week 3:  6 entities (Resources)
Week 4:  3 entities (Performance)
Week 5:  5 entities (Risk)
Week 6:  9 entities (Governance + Stakeholders)
Week 7:  4 entities (Benefits)
Week 8: 15 entities (Compliance + Regulatory)
Week 9: 8 entities (Strategic)
Week 10: 4 entities (Business Case + Scope)
Week 11: 2 entities (Optimization)
Week 12: 7 entities (Schedule + Integration)
───────────────────────────────────────────
TOTAL: 75 new entities (across 12 migrations)
```

### **By Domain**:

```
Strategic & OKRs:    8 entities
Portfolio Mgmt:     25 entities
Program/Project:    30 entities
Compliance:         15 entities
Prioritization:      7 entities
───────────────────────────────────────────
TOTAL:              85 entities
```

---

## 🚀 **NEXT STEPS**

### **Immediate** (This Week):

1. ✅ **Approve Entity Names** - Use these canonical names
2. ✅ **Review YAML Policy Pack** - Ready for Week 6 implementation
3. ✅ **Begin Week 1** - Create first 8 entities (Financial + Prioritization)

### **Week 1 Entities**:
```sql
-- Migration 203: Week 1 Entities
CREATE TABLE program_budgets (...)              -- Budget
CREATE TABLE program_cost_performance (...)     -- CostPerformance (EVM)
CREATE TABLE program_cost_items (...)           -- CostItem
CREATE TABLE prioritization_criteria (...)      -- PrioritizationCriteria
CREATE TABLE project_priority_scores (...)      -- ProjectScore
CREATE TABLE portfolio_priority_rankings (...)  -- PriorityRanking
CREATE TABLE portfolio_cost_constraints (...)   -- CostConstraint
CREATE TABLE program_financial_transactions (...) -- FinancialTransaction
```

---

## 📝 **DOCUMENTATION STATUS**

**Created Today**: 13 strategic documents (~7,500 lines total!)

1. ✅ PMI domain mapping
2. ✅ Microsoft PPM competitive analysis
3. ✅ Portfolio strategic frameworks
4. ✅ Program resource & cost management
5. ✅ Program activities implementation
6. ✅ Portfolio prioritization system
7. ✅ Portfolio tasks matrix
8. ✅ Market readiness 2026
9. ✅ Master strategic plan 2026
10. ✅ **Canonical entity catalog** (this document)
11. ✅ Plus implementation summaries

**Status**: ✅ **Complete strategic foundation** - Ready to build!

---

**Next Action**: Use these canonical entity names in all Week 1-12 implementations  
**Policy Pack**: Ready to import when entities are created  
**EU Compliance**: Built into gates from Day 1  
**PMBOK 8 Aligned**: Focus areas mapped to gates  

**Let's start Week 1 implementation with these canonical names!** 🚀
