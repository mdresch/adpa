# Entity Definitions and Implementation Status

This document captures the definitions, implementation status, and proposed structures for all entities identified in the frontend UI. It serves as a guide for future implementation and alignment with the backend extraction logic.

## 1. Implemented Entities

These entities are already registered in the `ExtractionRegistry` and have defined schemas in the codebase.

### Stakeholders
- **Status**: Implemented (`stakeholders`)
- **Location**: `server/src/services/extraction/entities/stakeholders`
- **Description**: Individuals or organizations actively involved in the project or whose interests may be affected by the execution or completion of the project.
- **Current Structure**:
  - `name`: string
  - `role`: string
  - `interest_level`: 'high' | 'medium' | 'low'
  - `influence_level`: 'high' | 'medium' | 'low'
  - `expectations`: string
  - `concerns`: string

### Requirements
- **Status**: Implemented (`requirements`)
- **Location**: `server/src/services/extraction/entities/requirements`
- **Description**: Conditions or capabilities that must be met or possessed by a system, product, service, result, or component to satisfy an agreement, standard, specification, or other formally imposed documents.
- **Current Structure**:
  - `title`: string
  - `description`: string
  - `type`: 'functional' | 'non-functional' | 'business' | 'technical'
  - `priority`: 'critical' | 'high' | 'medium' | 'low'
  - `status`: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'deferred'
  - `acceptance_criteria`: string | string[]

### Risks
- **Status**: Implemented (`risks`)
- **Location**: `server/src/services/extraction/entities/risks`
- **Description**: Uncertain events or conditions that, if they occur, have a positive or negative effect on one or more project objectives.
- **Estimated Structure**:
  - `description`: string
  - `probability`: number | string
  - `impact`: number | string
  - `mitigation_strategy`: string
  - `owner`: string

### Milestones
- **Status**: Implemented (`milestones`)
- **Location**: `server/src/services/extraction/entities/milestones`
- **Description**: Significant points or events in the project, usually completion of major deliverables.

### Constraints
- **Status**: Implemented (`constraints`)
- **Location**: `server/src/services/extraction/entities/constraints`
- **Description**: Limiting factors that affect the execution of a project, program, portfolio, or process.

### Success Criteria
- **Status**: Implemented (`success_criteria`)
- **Location**: `server/src/services/extraction/entities/success_criteria`
- **Description**: Quantifiable standards used to judge the success of a project or deliverable.

### Best Practices
- **Status**: Implemented (`best_practices`)
- **Location**: `server/src/services/extraction/entities/best_practices`
- **Description**: Proven methods or techniques that consistently show superior results.

### Phases
- **Status**: Implemented (`phases`)
- **Location**: `server/src/services/extraction/entities/phases`
- **Description**: Distinct stages of the project lifecycle (e.g., Initiation, Planning, Execution).

### Resources
- **Status**: Implemented (`resources`)
- **Location**: `server/src/services/extraction/entities/resources`
- **Description**: Personnel, equipment, facilities, etc., required to perform project activities.

### Technologies
- **Status**: Implemented (`technologies`)
- **Location**: `server/src/services/extraction/entities/technologies`
- **Description**: Tools, frameworks, and platforms used in the project.

### Quality Standards
- **Status**: Implemented (`quality_standards`)
- **Location**: `server/src/services/extraction/entities/quality_standards`
- **Description**: Organizational or industry standards the project must adhere to.

### Deliverables
- **Status**: Implemented (`deliverables`)
- **Location**: `server/src/services/extraction/entities/deliverables`
- **Description**: Any unique and verifiable product, result, or capability to perform a service that is required to be produced to complete a process, phase, or project.

### Scope Items
- **Status**: Implemented (`scope_items`)
- **Location**: `server/src/services/extraction/entities/scope_items`
- **Description**: Specific items that define the project boundaries.

### Activities
- **Status**: Implemented (`activities`)
- **Location**: `server/src/services/extraction/entities/activities`
- **Description**: Distinct, scheduled portions of work performed during the course of a project.

### Team Agreements
- **Status**: Implemented (`team_agreements`)
- **Location**: `server/src/services/extraction/entities/team_agreements`
- **Description**: Guidelines and norms established by the team to govern their behavior and interactions.

### Development Approach
- **Status**: Implemented (`development_approaches`)
- **Location**: `server/src/services/extraction/entities/development_approaches`
- **Description**: The method used to create and evolve the product, service, or result (e.g., Predictive, Adaptive, Hybrid).

### Project Iterations
- **Status**: Implemented (`project_iterations`)
- **Location**: `server/src/services/extraction/entities/project_iterations`
- **Description**: Time-boxed cycles of development in adaptive life cycles.

### Work Items
- **Status**: Implemented (`work_items`)
- **Location**: `server/src/services/extraction/entities/work_items`
- **Description**: Individual units of work to be done, often tracked in a board.

### Capacity Plans
- **Status**: Implemented (`capacity_plans`)
- **Location**: `server/src/services/extraction/entities/capacity_plans`
- **Description**: Plans outlining the available resources vs. demand over time.

### Performance Measurements
- **Status**: Implemented (`performance_measurements`)
- **Location**: `server/src/services/extraction/entities/performance_measurements`
- **Description**: Quantified data about project performance.

### Earned Value Metrics
- **Status**: Implemented (`earned_value_metrics`)
- **Location**: `server/src/services/extraction/entities/earned_value_metrics`
- **Description**: Metrics like PV, EV, AC, SPI, CPI used for performance analysis.

### Opportunities
- **Status**: Implemented (`opportunities`)
- **Location**: `server/src/services/extraction/entities/opportunities`
- **Description**: Risks with positive impacts.

### Risk Responses
- **Status**: Implemented (`risk_responses`)
- **Location**: `server/src/services/extraction/entities/risk_responses`
- **Description**: Actions taken to address identified risks.

### Performance Actuals
- **Status**: Implemented (`performance_actuals`)
- **Location**: `server/src/services/extraction/entities/performance_actuals`
- **Description**: Realized performance data compared against baselines.

---

## 2. Planned Entities (To Be Implemented)

These entities exist in the frontend UI or PMBOK types but strictly lack a dedicated extraction module in `server/src/services/extraction/entities`.

### Governance Decisions
- **Proposed System Name**: `governance_decisions`
- **Description**: Formal decisions made by governance bodies affecting the project.
- **Proposed Structure**:
  - `decision_id`: string
  - `title`: string
  - `decision_date`: date
  - `approved_by`: string[]
  - `impact`: string
  - `status`: 'approved' | 'rejected' | 'deferred'

### Approval Workflows
- **Proposed System Name**: `approval_workflows`
- **Description**: Structured sequences of approvals required for project artifacts.
- **Proposed Structure**:
  - `workflow_name`: string
  - `steps`: { step_name: string, approver_role: string }[]
  - `trigger_condition`: string

### Steering Committees
- **Proposed System Name**: `steering_committees`
- **Description**: Executive-level bodies providing strategic direction.
- **Proposed Structure**:
  - `name`: string
  - `members`: { name: string, role: string }[]
  - `meeting_cadence`: string
  - `responsibilities`: string[]

### Change Control Boards
- **Proposed System Name**: `change_control_boards`
- **Description**: Groups responsible for reviewing and approving change requests.
- **Proposed Structure**:
  - `name`: string
  - `members`: string[]
  - `authority_level`: string

### Policy Compliance
- **Proposed System Name**: `policy_compliance`
- **Description**: Records of adherence to organizational policies.
- **Proposed Structure**:
  - `policy_name`: string
  - `compliance_status`: 'compliant' | 'non_compliant' | 'partial'
  - `audit_date`: date
  - `findings`: string

### Scope Baselines
- **Proposed System Name**: `scope_baselines`
- **Description**: The approved version of the scope statement, WBS, and WBS dictionary.
- **Proposed Structure**:
  - `version`: string
  - `approval_date`: date
  - `components`: link[] (to Scope Items, WBS)

### WBS Nodes
- **Proposed System Name**: `wbs_nodes`
- **Description**: Hierarchical decomposition of the total scope of work.
- **Proposed Structure**:
  - `wbs_code`: string (e.g., 1.1.2)
  - `name`: string
  - `parent_id`: string
  - `deliverable_id`: string (link)

### Scope Change Requests
- **Proposed System Name**: `scope_change_requests`
- **Description**: Requests to expand or reduce project scope.
- **Proposed Structure**:
  - `request_id`: string
  - `description`: string
  - `justification`: string
  - `impact_analysis`: string
  - `status`: 'pending' | 'approved' | 'rejected'

### Requirements Traceability
- **Proposed System Name**: `requirements_traceability`
- **Description**: Links between requirements and deliverables/tests.
- **Proposed Structure**:
  - `requirement_id`: string
  - `deliverable_id`: string
  - `test_case_id`: string

### Scope Verification
- **Proposed System Name**: `scope_verification`
- **Description**: Formal acceptance of completed project deliverables.
- **Proposed Structure**:
  - `deliverable_id`: string
  - `verified_by`: string
  - `verification_date`: date
  - `status`: 'accepted' | 'rejected'

### Schedule Baselines
- **Proposed System Name**: `schedule_baselines`
- **Description**: The approved version of the schedule model.
- **Proposed Structure**:
  - `version`: string
  - `start_date`: date
  - `end_date`: date
  - `critical_path_id`: string

### Schedule Activities (Note: Distinct from 'Activities'?)
- **Proposed System Name**: `schedule_activities`
- **Description**: May define the specific timeline aspects of activities if `activities` entity is generic.
- **Proposed Structure**:
  - `activity_id`: string
  - `planned_start`: date
  - `planned_finish`: date
  - `actual_start`: date
  - `actual_finish`: date

### Critical Path
- **Proposed System Name**: `critical_path`
- **Description**: The sequence of activities that represents the longest path through a project.
- **Proposed Structure**:
  - `path_id`: string
  - `activity_ids`: string[]
  - `total_float`: number

### Schedule Variances
- **Proposed System Name**: `schedule_variances`
- **Description**: Differences between planned and actual schedule performance.

### Schedule Forecasts
- **Proposed System Name**: `schedule_forecasts`
- **Description**: Estimates or predictions of conditions and events in the project's future.

### Budget Baselines
- **Proposed System Name**: `budget_baselines`
- **Description**: The approved version of the time-phased project budget.

### Cost Actuals
- **Proposed System Name**: `cost_actuals`
- **Description**: Total cost actually incurred and recorded in accomplishing work.

### Cost Estimates
- **Proposed System Name**: `cost_estimates`
- **Description**: Quantitative assessments of the likely costs for resources.

### Funding Tranches
- **Proposed System Name**: `funding_tranches`
- **Description**: Portions of funding released at specific points.

### Financial Variances
- **Proposed System Name**: `financial_variances`
- **Description**: Differences between budget/cost baselines and actuals.

### Procurement Costs
- **Proposed System Name**: `procurement_costs`
- **Description**: Costs associated with purchasing goods and services.

### Resource Assignments
- **Proposed System Name**: `resource_assignments`
- **Description**: Mapping of resources to activities.
- **Proposed Structure**:
  - `resource_id`: string
  - `activity_id`: string
  - `allocated_hours`: number
  - `role`: string

### Resource Pool
- **Proposed System Name**: `resource_pool`
- **Description**: Collection of available resources.

### Capacity Forecasts
- **Proposed System Name**: `capacity_forecasts`
- **Description**: Predictions of future resource availability.

### Utilization Records
- **Proposed System Name**: `utilization_records`
- **Description**: Historical data on how resources were used.

### Resource Conflicts
- **Proposed System Name**: `resource_conflicts`
- **Description**: Situations where demand exceeds availability.

### Onboarding/Offboarding
- **Proposed System Name**: `onboarding_offboarding`
- **Description**: Processes for adding/removing team members.

### Risk Assessments
- **Proposed System Name**: `risk_assessments`
- **Description**: Evaluation of identified risks (distinct from `risks` definition).

### Risk Triggers
- **Proposed System Name**: `risk_triggers`
- **Description**: Events or conditions that indicate a risk has occurred or is about to occur.

### Risk Reviews
- **Proposed System Name**: `risk_reviews`
- **Description**: Scheduled meetings to examine and document the effectiveness of risk responses.

### Contingency Reserves
- **Proposed System Name**: `contingency_reserves`
- **Description**: Budget or time allocated for identified risks.

### Risk Metrics
- **Proposed System Name**: `risk_metrics`
- **Description**: Quantitative measures of risk performance.

### Engagement Actions
- **Proposed System Name**: `engagement_actions`
- **Description**: Specific steps taken to involve stakeholders.

### Communication Logs
- **Proposed System Name**: `communication_logs`
- **Description**: Records of information exchanged with stakeholders.

### Satisfaction Surveys
- **Proposed System Name**: `satisfaction_surveys`
- **Description**: Tools to measure stakeholder happiness.

### Stakeholder Issues
- **Proposed System Name**: `stakeholder_issues`
- **Description**: Problems or disagreements involving stakeholders.

### Relationship Health
- **Proposed System Name**: `relationship_health`
- **Description**: Assessment of the quality of relationships with stakeholders.

## 3. Special Items

### RAG Integration Active
- **Status**: System Feature (Not an entity)
- **Description**: Likely a flag or status indicator showing if the Retrieval-Augmented Generation system is operational. This is likely not a data entity to be extracted but a configuration state.
- **Proposed Implementation**: Feature Flag or System Health API endpoint.

### Compliance & Security
- **Proposed System Name**: `compliance_security`
- **Description**: Global compliance and security framework. May overlap with `Policy Compliance`.
