/**
 * Inline Entity Extraction Prompt
 *
 * Generates the H8-tag instruction block appended to every section prompt.
 * Each entity type maps exactly to its TypeScript interface so the LLM
 * produces field names that the InlineEntityParserService can save directly.
 *
 * RULE: Only list entity types that the section is likely to introduce.
 *       The LLM decides which apply; all 61 types are documented here.
 *       Do NOT instruct the model to tag every type — only those relevant.
 */

export const INLINE_ENTITY_EXTRACTION_PROMPT = `

---

## Entity Extraction (Inline Tagging)

At the **very end** of your section output, tag any entities you have introduced or defined in this section using the H8 format below. One JSON object per line. Use only the field names exactly as shown. Skip entity types that are not relevant to this section. Do NOT duplicate entities tagged in previous sections.

Format:
\`\`\`
######## entity_type: {"field": "value", ...}
\`\`\`

### Core Entities

**stakeholders** — People or groups with interest or influence in the project
\`\`\`
######## stakeholders: {"name": "Jane Smith", "role": "Project Sponsor", "interest_level": "high", "influence_level": "high", "department": "Finance", "expectations": "On-time delivery", "concerns": "Budget overrun"}
\`\`\`
Fields: name* (string), role* (string), interest_level* (high|medium|low), influence_level* (high|medium|low), department? (string), email? (string), expectations? (string), concerns? (string)

**risks** — Uncertain events that could negatively affect the project
\`\`\`
######## risks: {"title": "Vendor delays", "description": "Third-party API may not be ready", "category": "external", "probability": "medium", "impact": "high", "mitigation_strategy": "Identify backup vendor", "contingency_plan": "Build mock layer"}
\`\`\`
Fields: title* (string), description* (string), category* (technical|schedule|budget|resource|external|quality), probability* (high|medium|low), impact* (high|medium|low), mitigation_strategy? (string), contingency_plan? (string), owner? (string)

**milestones** — Zero-duration checkpoints marking major completions
\`\`\`
######## milestones: {"name": "Phase 1 Complete", "description": "All design docs approved", "due_date": "2026-Q3", "status": "pending"}
\`\`\`
Fields: name* (string), description* (string), due_date* (YYYY-MM-DD or Quarter/Year), status* (pending|in_progress|completed|delayed), deliverables? (string[]), dependencies? (string[])

**deliverables** — Tangible outputs produced by the project
\`\`\`
######## deliverables: {"name": "API Documentation", "description": "Full REST API reference", "type": "document", "status": "planned", "due_date": "2026-08-01", "owner": "Dev Team"}
\`\`\`
Fields: name* (string), description* (string), type* (document|software|hardware|service|report|other), status* (planned|in_progress|completed|delayed|cancelled), due_date? (string), owner? (string), acceptance_criteria? (string), phase? (string)

**requirements** — Functional or non-functional project requirements
\`\`\`
######## requirements: {"title": "SSO Integration", "description": "System must support SAML 2.0", "type": "functional", "priority": "high", "acceptance_criteria": "Login via corporate IdP works end-to-end", "source": "Stakeholder Workshop"}
\`\`\`
Fields: title* (string), description* (string), type* (functional|non_functional|business|technical|regulatory), priority* (critical|high|medium|low), acceptance_criteria? (string), source? (string), status? (draft|approved|in_progress|completed|rejected)

**constraints** — Fixed limitations the project must operate within
\`\`\`
######## constraints: {"title": "GDPR Compliance", "description": "All PII must be stored in EU regions", "type": "regulatory", "impact": "Data storage architecture must change"}
\`\`\`
Fields: title* (string), description* (string), type* (budget|schedule|resource|regulatory|technical|quality), impact? (string)

**success_criteria** — Measurable KPIs defining project success
\`\`\`
######## success_criteria: {"title": "Processing Speed", "description": "System must process documents within SLA", "metric": "Document processing time", "target_value": "< 5 seconds", "measurement_method": "Automated performance test", "priority": "high"}
\`\`\`
Fields: title* (string), description* (string), metric* (string), target_value* (string), measurement_method* (string), priority* (critical|high|medium|low)

**activities** — Tasks or work packages that produce deliverables
\`\`\`
######## activities: {"name": "Design database schema", "description": "Create ERD and table definitions", "status": "planned", "estimated_hours": 16, "assigned_to": "DB Lead"}
\`\`\`
Fields: name* (string), description? (string), status? (planned|in_progress|completed|on_hold|cancelled), estimated_hours? (number), actual_hours? (number), assigned_to? (string), start_date? (string), end_date? (string)

**scope_items** — Items explicitly in or out of project scope
\`\`\`
######## scope_items: {"title": "Mobile App", "description": "Native iOS/Android app", "is_in_scope": false, "justification": "Phase 2 only", "priority": "could_have"}
\`\`\`
Fields: title* (string), description* (string), is_in_scope* (boolean), category? (string), justification? (string), priority? (must_have|should_have|could_have|wont_have)

**phases** — High-level project phases with timelines
\`\`\`
######## phases: {"name": "Initiation", "description": "Project charter and stakeholder identification", "status": "completed", "start_date": "2026-01-01", "end_date": "2026-02-28", "order": 1}
\`\`\`
Fields: name* (string), description? (string), status* (planned|in_progress|completed|on_hold|cancelled), start_date? (string), end_date? (string), order? (number)

**work_items** — Granular tasks assigned to team members
\`\`\`
######## work_items: {"name": "Write unit tests", "description": "Cover parser edge cases", "status": "todo", "assigned_to": "QA Engineer", "estimated_hours": 8}
\`\`\`
Fields: name* (string), description? (string), status? (todo|in_progress|review|done|blocked), assigned_to? (string), estimated_hours? (number), actual_hours? (number), progress_percentage? (number)

---

### Finance & Budget

**budget_baseline** — Approved total project budget
\`\`\`
######## budget_baseline: {"total_budget": 450000, "currency": "USD", "categories": {"labor": 300000, "infrastructure": 100000, "licenses": 50000}, "approval_date": "2026-01-15"}
\`\`\`
Fields: total_budget* (number), currency? (string, default "USD"), categories? (object: key→number), approval_date? (string), version? (string)

**cost_estimates** — Line-item cost estimates for work packages
\`\`\`
######## cost_estimates: {"item_name": "Cloud infrastructure", "estimated_cost": 120000, "basis_of_estimate": "Analogous estimation from similar project", "confidence_level": "medium", "contingency_buffer": 15000}
\`\`\`
Fields: item_name* (string), estimated_cost* (number), basis_of_estimate? (string), confidence_level? (low|medium|high), contingency_buffer? (number), wbs_code? (string)

**funding_tranches** — Scheduled funding releases
\`\`\`
######## funding_tranches: {"tranche_name": "Tranche 1", "amount": 150000, "release_date": "2026-03-01", "conditions": "Charter approved"}
\`\`\`
Fields: tranche_name* (string), amount* (number), release_date? (string), conditions? (string), currency? (string)

**financial_variances** — Differences between planned and actual costs
\`\`\`
######## financial_variances: {"category": "Labor", "planned_amount": 300000, "actual_amount": 320000, "variance": -20000, "explanation": "Overtime due to scope creep"}
\`\`\`
Fields: category* (string), planned_amount* (number), actual_amount* (number), variance* (number), explanation? (string), period? (string)

**procurement_costs** — Vendor/contract costs
\`\`\`
######## procurement_costs: {"vendor_name": "AWS", "contract_value": 60000, "contract_type": "subscription", "start_date": "2026-01-01", "end_date": "2026-12-31"}
\`\`\`
Fields: vendor_name* (string), contract_value* (number), contract_type? (fixed_price|time_and_materials|subscription|other), start_date? (string), end_date? (string), scope_of_work? (string)

**cost_actuals** — Actual costs incurred
\`\`\`
######## cost_actuals: {"period": "2026-Q1", "category": "Labor", "actual_cost": 85000, "description": "Developer salaries Q1"}
\`\`\`
Fields: period* (string), category* (string), actual_cost* (number), description? (string)

**contingency_reserves** — Budget held for identified risks
\`\`\`
######## contingency_reserves: {"reserve_name": "Risk Reserve", "amount": 45000, "risk_reference": "Vendor delay risk", "release_criteria": "Vendor contract signed"}
\`\`\`
Fields: reserve_name* (string), amount* (number), risk_reference? (string), release_criteria? (string)

---

### Schedule

**schedule_activities** — Scheduled tasks with dependencies
\`\`\`
######## schedule_activities: {"name": "Deploy to staging", "duration_days": 2, "start_date": "2026-07-01", "end_date": "2026-07-03", "dependencies": ["Backend integration complete"], "assigned_to": "DevOps"}
\`\`\`
Fields: name* (string), duration_days? (number), start_date? (string), end_date? (string), dependencies? (string[]), assigned_to? (string), status? (not_started|in_progress|completed|delayed)

**schedule_baseline** — Approved baseline schedule
\`\`\`
######## schedule_baseline: {"name": "Baseline v1", "approved_date": "2026-02-01", "start_date": "2026-01-01", "end_date": "2026-12-31", "total_duration_days": 365}
\`\`\`
Fields: name* (string), approved_date? (string), start_date? (string), end_date? (string), total_duration_days? (number)

**critical_path** — Sequence of tasks that determines project duration
\`\`\`
######## critical_path: {"path_name": "Main critical path", "total_duration_days": 180, "activities": ["Requirements", "Design", "Build", "UAT", "Go-live"]}
\`\`\`
Fields: path_name* (string), total_duration_days? (number), activities? (string[]), float_days? (number)

**schedule_variances** — Deviations from the schedule baseline
\`\`\`
######## schedule_variances: {"activity_name": "UAT Phase", "planned_end": "2026-09-01", "actual_end": "2026-09-15", "variance_days": 14, "reason": "More defects than expected"}
\`\`\`
Fields: activity_name* (string), planned_end? (string), actual_end? (string), variance_days? (number), reason? (string)

**schedule_forecasts** — Predicted schedule completion
\`\`\`
######## schedule_forecasts: {"forecast_date": "2026-07-15", "predicted_end": "2026-12-15", "confidence": "medium", "assumptions": "No further scope changes"}
\`\`\`
Fields: forecast_date* (string), predicted_end? (string), confidence? (low|medium|high), assumptions? (string)

---

### Resources

**resources** — People, equipment, or materials
\`\`\`
######## resources: {"name": "Solution Architect", "type": "human", "quantity": 1, "availability": "full-time", "cost_per_unit": 150, "unit": "hour"}
\`\`\`
Fields: name* (string), type* (human|equipment|material|facility), quantity? (number), availability? (string), cost_per_unit? (number), unit? (string)

**roles_and_responsibilities** — RACI-aligned role definitions
\`\`\`
######## roles_and_responsibilities: {"role": "Project Manager", "name": "Raj Patel", "responsibilities": "Overall delivery, stakeholder comms, risk management", "authority_level": "high"}
\`\`\`
Fields: role* (string), name? (string), responsibilities? (string), authority_level? (low|medium|high), reports_to? (string)

**resource_assignments** — Who is assigned to what
\`\`\`
######## resource_assignments: {"resource_name": "Raj Patel", "activity_name": "Sprint planning", "allocation_percent": 50, "start_date": "2026-03-01", "end_date": "2026-03-31"}
\`\`\`
Fields: resource_name* (string), activity_name* (string), allocation_percent? (number), start_date? (string), end_date? (string)

**resource_plans** — Planned resource requirements
\`\`\`
######## resource_plans: {"role": "Backend Developer", "quantity": 3, "start_date": "2026-02-01", "end_date": "2026-10-31", "skill_requirements": "Node.js, PostgreSQL, REST APIs"}
\`\`\`
Fields: role* (string), quantity? (number), start_date? (string), end_date? (string), skill_requirements? (string)

**team_availability** — Availability windows per person
\`\`\`
######## team_availability: {"person_name": "Sara Jones", "role": "QA Engineer", "availability_percent": 80, "start_date": "2026-04-01", "end_date": "2026-09-30"}
\`\`\`
Fields: person_name* (string), role? (string), availability_percent? (number), start_date? (string), end_date? (string)

**labor_rates** — Hourly/daily cost rates per role
\`\`\`
######## labor_rates: {"role": "Solution Architect", "rate": 150, "unit": "hour", "currency": "USD"}
\`\`\`
Fields: role* (string), rate* (number), unit* (hour|day|month), currency? (string)

**capacity_plans** — Team capacity vs demand
\`\`\`
######## capacity_plans: {"period": "2026-Q2", "team": "Backend", "capacity_hours": 480, "demand_hours": 420, "utilization_percent": 87.5}
\`\`\`
Fields: period* (string), team? (string), capacity_hours? (number), demand_hours? (number), utilization_percent? (number)

**capacity_forecasts** — Future capacity projections
\`\`\`
######## capacity_forecasts: {"period": "2026-Q3", "team": "QA", "projected_capacity": 320, "projected_demand": 380, "gap": -60}
\`\`\`
Fields: period* (string), team? (string), projected_capacity? (number), projected_demand? (number), gap? (number)

**utilization_records** — Actual utilization tracked
\`\`\`
######## utilization_records: {"person_name": "Bob Chen", "period": "2026-05", "planned_hours": 160, "actual_hours": 172, "utilization_percent": 107.5}
\`\`\`
Fields: person_name* (string), period* (string), planned_hours? (number), actual_hours? (number), utilization_percent? (number)

**resource_conflicts** — Overallocation or scheduling conflicts
\`\`\`
######## resource_conflicts: {"resource_name": "Lead Developer", "conflict_type": "overallocation", "period": "2026-Q2", "description": "Assigned to two tracks simultaneously", "resolution": "Bring in contractor"}
\`\`\`
Fields: resource_name* (string), conflict_type* (overallocation|scheduling|skill_gap|other), period? (string), description? (string), resolution? (string)

**resource_pool** — Available shared resources
\`\`\`
######## resource_pool: {"name": "Shared QA Pool", "type": "human", "total_capacity": 5, "available_capacity": 2, "skill_set": "Selenium, Postman, JIRA"}
\`\`\`
Fields: name* (string), type* (human|equipment|material), total_capacity? (number), available_capacity? (number), skill_set? (string)

**onboarding_offboarding** — Team member onboarding/offboarding events
\`\`\`
######## onboarding_offboarding: {"person_name": "Alice Martin", "type": "onboarding", "effective_date": "2026-04-01", "role": "DevOps Engineer", "notes": "Needs Azure access"}
\`\`\`
Fields: person_name* (string), type* (onboarding|offboarding), effective_date? (string), role? (string), notes? (string)

**project_org_chart** — Reporting relationships
\`\`\`
######## project_org_chart: {"role": "QA Lead", "reports_to": "Project Manager", "direct_reports": ["QA Engineer 1", "QA Engineer 2"]}
\`\`\`
Fields: role* (string), reports_to? (string), direct_reports? (string[])

---

### Risks & Issues

**opportunities** — Positive uncertain events that could benefit the project
\`\`\`
######## opportunities: {"title": "Early vendor discount", "description": "Vendor offers 20% discount if contract signed before Q2", "probability": "medium", "potential_benefit": "high", "response_strategy": "Exploit"}
\`\`\`
Fields: title* (string), description* (string), probability* (high|medium|low), potential_benefit* (high|medium|low), response_strategy? (string), owner? (string)

**risk_responses** — Planned actions to address risks
\`\`\`
######## risk_responses: {"risk_title": "Vendor delays", "response_type": "mitigate", "response_action": "Engage backup vendor", "owner": "Procurement Lead", "target_date": "2026-03-15"}
\`\`\`
Fields: risk_title* (string), response_type* (avoid|mitigate|transfer|accept|exploit), response_action* (string), owner? (string), target_date? (string)

**risk_appetite** — Organisation's tolerance for risk
\`\`\`
######## risk_appetite: {"category": "Schedule", "appetite_level": "low", "description": "Any delay beyond 2 weeks requires executive escalation"}
\`\`\`
Fields: category* (string), appetite_level* (very_low|low|medium|high|very_high), description? (string)

**risk_assessments** — Formal risk assessment records
\`\`\`
######## risk_assessments: {"risk_title": "Data breach", "assessment_date": "2026-02-10", "assessor": "CISO", "likelihood_score": 2, "impact_score": 5, "risk_score": 10}
\`\`\`
Fields: risk_title* (string), assessment_date? (string), assessor? (string), likelihood_score? (number 1-5), impact_score? (number 1-5), risk_score? (number)

**risk_response_plans** — Documented plans for risk handling
\`\`\`
######## risk_response_plans: {"plan_name": "Vendor Risk Response Plan", "risk_category": "external", "strategy": "Dual-vendor approach", "budget_allocated": 15000}
\`\`\`
Fields: plan_name* (string), risk_category? (string), strategy? (string), budget_allocated? (number)

**risk_checklists** — Pre-defined risk identification checklists
\`\`\`
######## risk_checklists: {"checklist_name": "Technology Risk Checklist", "category": "technical", "items": ["API stability", "Third-party dependencies", "Security vulnerabilities"]}
\`\`\`
Fields: checklist_name* (string), category? (string), items? (string[])

**risk_triggers** — Early warning indicators for risks
\`\`\`
######## risk_triggers: {"risk_title": "Resource overallocation", "trigger": "Sprint velocity drops below 60% for 2 consecutive sprints", "action": "Escalate to PMO"}
\`\`\`
Fields: risk_title* (string), trigger* (string), action? (string), owner? (string)

**risk_reviews** — Periodic risk register reviews
\`\`\`
######## risk_reviews: {"review_date": "2026-05-01", "reviewer": "Project Manager", "risks_reviewed": 12, "new_risks_identified": 2, "risks_closed": 3, "notes": "Vendor risk reduced after contract signed"}
\`\`\`
Fields: review_date* (string), reviewer? (string), risks_reviewed? (number), new_risks_identified? (number), risks_closed? (number), notes? (string)

**risk_metrics** — Risk KPIs and exposure metrics
\`\`\`
######## risk_metrics: {"metric_name": "Risk Exposure Index", "value": 42, "unit": "score", "period": "2026-Q1", "threshold": 60}
\`\`\`
Fields: metric_name* (string), value* (number), unit? (string), period? (string), threshold? (number)

**probability_impact_matrix** — Risk scoring matrix definition
\`\`\`
######## probability_impact_matrix: {"risk_title": "Vendor delays", "probability_score": 3, "impact_score": 4, "risk_level": "high", "quadrant": "Act Now"}
\`\`\`
Fields: risk_title* (string), probability_score* (number 1-5), impact_score* (number 1-5), risk_level* (low|medium|high|critical), quadrant? (string)

**contingency_reserves** — already documented above

**issue_log** — Active project issues requiring resolution
\`\`\`
######## issue_log: {"title": "Integration test failures", "description": "30% of API integration tests failing in staging", "severity": "high", "status": "open", "owner": "Dev Lead", "raised_date": "2026-05-20", "target_resolution": "2026-05-28"}
\`\`\`
Fields: title* (string), description? (string), severity* (low|medium|high|critical), status* (open|in_progress|resolved|closed), owner? (string), raised_date? (string), target_resolution? (string)

---

### Governance

**governance_decisions** — Formal decisions made by governance bodies
\`\`\`
######## governance_decisions: {"title": "Approved Phase 2 Funding", "decision": "Board approved additional $150k for Phase 2", "decision_date": "2026-03-10", "decision_maker": "Steering Committee", "impact": "Phase 2 can proceed"}
\`\`\`
Fields: title* (string), decision* (string), decision_date? (string), decision_maker? (string), impact? (string), status? (proposed|pending|approved|rejected|deferred)

**approval_workflows** — Formal approval chains
\`\`\`
######## approval_workflows: {"name": "Change Request Approval", "stages": ["PM Review", "Sponsor Approval", "CCB Sign-off"], "sla_days": 5, "escalation_path": "PMO Director"}
\`\`\`
Fields: name* (string), stages? (string[]), sla_days? (number), escalation_path? (string)

**steering_committees** — Project oversight bodies
\`\`\`
######## steering_committees: {"name": "Project Steering Committee", "mandate": "Quarterly strategic oversight and budget approval", "members": ["CEO", "CTO", "CFO"], "meeting_cadence": "monthly"}
\`\`\`
Fields: name* (string), mandate? (string), members? (string[]), meeting_cadence? (string), last_meeting_date? (string)

**change_control_boards** — Bodies that review change requests
\`\`\`
######## change_control_boards: {"name": "CCB", "members": ["PM", "Architect", "QA Lead"], "meeting_cadence": "bi-weekly", "scope": "All scope and budget changes > $5,000"}
\`\`\`
Fields: name* (string), members? (string[]), meeting_cadence? (string), scope? (string)

**policy_compliance** — Regulatory or internal policy requirements
\`\`\`
######## policy_compliance: {"policy_name": "ISO 27001", "compliance_status": "in_progress", "owner": "CISO", "review_date": "2026-12-01", "gap_description": "Encryption at rest not yet implemented"}
\`\`\`
Fields: policy_name* (string), compliance_status* (compliant|non_compliant|in_progress|not_applicable), owner? (string), review_date? (string), gap_description? (string)

**general_change_requests** — Requests to change any aspect of the project
\`\`\`
######## general_change_requests: {"title": "Add reporting dashboard", "description": "Stakeholders request real-time reporting", "requestor": "Business Analyst", "impact": "2 weeks extra development", "status": "pending", "submitted_date": "2026-05-15"}
\`\`\`
Fields: title* (string), description? (string), requestor? (string), impact? (string), status? (submitted|under_review|approved|rejected|deferred|implemented), submitted_date? (string)

---

### Quality & Standards

**quality_standards** — Quality benchmarks and standards
\`\`\`
######## quality_standards: {"name": "Code Coverage", "description": "Minimum 80% unit test coverage required", "category": "testing", "target_value": "80%", "measurement_method": "Jest coverage report"}
\`\`\`
Fields: name* (string), description? (string), category? (string), target_value? (string), measurement_method? (string), status? (defined|in_progress|met|not_met)

**performance_measurements** — Measurement of project performance
\`\`\`
######## performance_measurements: {"metric_name": "SPI (Schedule Performance Index)", "value": 0.92, "period": "2026-Q1", "target": 1.0, "status": "at_risk"}
\`\`\`
Fields: metric_name* (string), value* (number), period? (string), target? (number), status? (on_track|at_risk|off_track)

**performance_actuals** — Actual measured performance values
\`\`\`
######## performance_actuals: {"metric_name": "Defect Rate", "actual_value": 3.2, "unit": "defects/KLOC", "period": "2026-Q1", "baseline_value": 5.0}
\`\`\`
Fields: metric_name* (string), actual_value* (number), unit? (string), period? (string), baseline_value? (number)

**earned_value_metrics** — EVM indicators (CPI, SPI, EV, PV, AC)
\`\`\`
######## earned_value_metrics: {"period": "2026-Q1", "planned_value": 100000, "earned_value": 92000, "actual_cost": 98000, "cpi": 0.94, "spi": 0.92, "eac": 478000}
\`\`\`
Fields: period* (string), planned_value? (number), earned_value? (number), actual_cost? (number), cpi? (number), spi? (number), eac? (number), vac? (number)

**benefit_realization_plan** — Plan for realising expected project benefits
\`\`\`
######## benefit_realization_plan: {"benefit_name": "Processing time reduction", "description": "Reduce document processing from 4h to 30 min", "target_value": "87.5% reduction", "realization_date": "2027-Q1", "measurement_method": "Operations report", "owner": "COO"}
\`\`\`
Fields: benefit_name* (string), description? (string), target_value? (string), realization_date? (string), measurement_method? (string), owner? (string)

---

### Stakeholder Operations

**stakeholder_engagements** — Recorded engagement events
\`\`\`
######## stakeholder_engagements: {"stakeholder_name": "Jane Smith", "engagement_type": "Workshop", "engagement_date": "2026-03-15", "objective": "Requirements validation", "outcome": "10 requirements approved"}
\`\`\`
Fields: stakeholder_name* (string), engagement_type* (Workshop|Interview|Presentation|Other), engagement_date? (string), objective? (string), outcome? (string), feedback? (string)

**communication_logs** — Records of communications
\`\`\`
######## communication_logs: {"date": "2026-05-10", "sender": "PM", "recipient": "Sponsor", "channel": "email", "subject": "Phase 2 status update", "summary": "On track, minor risks flagged"}
\`\`\`
Fields: date* (string), sender? (string), recipient? (string), channel? (email|meeting|phone|slack|other), subject? (string), summary? (string)

**engagement_actions** — Actions from stakeholder engagement
\`\`\`
######## engagement_actions: {"action": "Share updated roadmap with Finance team", "assigned_to": "PM", "due_date": "2026-06-01", "status": "open", "stakeholder": "CFO"}
\`\`\`
Fields: action* (string), assigned_to? (string), due_date? (string), status? (open|in_progress|completed|cancelled), stakeholder? (string)

**stakeholder_issues** — Issues raised by stakeholders
\`\`\`
######## stakeholder_issues: {"title": "Lack of progress visibility", "stakeholder_name": "CFO", "severity": "medium", "status": "open", "raised_date": "2026-05-01", "resolution": "Weekly dashboard added"}
\`\`\`
Fields: title* (string), stakeholder_name* (string), severity* (low|medium|high|critical), status* (open|in_progress|resolved|closed), raised_date? (string), resolution? (string)

**satisfaction_surveys** — Stakeholder satisfaction measurements
\`\`\`
######## satisfaction_surveys: {"survey_name": "Mid-project Survey", "date": "2026-06-01", "respondents": 12, "average_score": 7.8, "nps": 42, "key_concern": "Communication frequency"}
\`\`\`
Fields: survey_name* (string), date? (string), respondents? (number), average_score? (number), nps? (number), key_concern? (string)

**relationship_health** — Health of stakeholder relationships
\`\`\`
######## relationship_health: {"stakeholder_name": "IT Director", "health_score": 6, "trend": "declining", "reason": "Delayed infrastructure provisioning causing friction", "action_required": "Executive alignment meeting"}
\`\`\`
Fields: stakeholder_name* (string), health_score* (number 1-10), trend? (improving|stable|declining), reason? (string), action_required? (string)

**action_items** — Follow-up items from meetings or reviews
\`\`\`
######## action_items: {"title": "Update risk register", "assigned_to": "PM", "due_date": "2026-06-07", "status": "open", "priority": "high", "source": "Steering Committee Meeting"}
\`\`\`
Fields: title* (string), assigned_to? (string), due_date? (string), status? (open|in_progress|completed|cancelled), priority? (low|medium|high|critical), source? (string)

**meeting_minutes** — Summary of meeting discussions and decisions
\`\`\`
######## meeting_minutes: {"meeting_title": "Weekly Standup", "date": "2026-05-20", "attendees": ["PM", "Dev Lead", "QA Lead"], "decisions": ["Freeze scope for Sprint 5"], "action_count": 3}
\`\`\`
Fields: meeting_title* (string), date* (string), attendees? (string[]), decisions? (string[]), action_count? (number)

---

### Strategy & Knowledge

**project_charter_details** — Key elements of the project charter
\`\`\`
######## project_charter_details: {"purpose": "Automate document processing to reduce manual effort", "business_need": "Current process takes 3 days; target is 4 hours", "high_level_budget": 450000, "sponsor": "COO", "project_manager": "Raj Patel"}
\`\`\`
Fields: purpose? (string), business_need? (string), high_level_budget? (number), sponsor? (string), project_manager? (string), authorization_date? (string)

**business_case_details** — Business justification details
\`\`\`
######## business_case_details: {"roi_percentage": 340, "payback_period_months": 18, "npv": 1250000, "strategic_alignment": "Digital transformation initiative", "key_assumption": "70% adoption within 6 months"}
\`\`\`
Fields: roi_percentage? (number), payback_period_months? (number), npv? (number), strategic_alignment? (string), key_assumption? (string)

**lessons_learned** — Insights captured for future projects
\`\`\`
######## lessons_learned: {"title": "Early stakeholder alignment critical", "category": "stakeholder_management", "description": "Delays in Q1 caused by late sponsor sign-off. Recommend weekly sponsor check-ins.", "recommendation": "Include sponsor review in sprint review agenda"}
\`\`\`
Fields: title* (string), category? (string), description? (string), recommendation? (string), impact? (positive|negative|neutral)

**best_practices** — Identified best practices
\`\`\`
######## best_practices: {"title": "Infrastructure as Code", "description": "All environments managed via Terraform to ensure consistency", "category": "devops", "applicability": "All cloud deployments"}
\`\`\`
Fields: title* (string), description? (string), category? (string), applicability? (string)

**project_iterations** — Sprints or agile iterations
\`\`\`
######## project_iterations: {"name": "Sprint 5", "start_date": "2026-05-13", "end_date": "2026-05-27", "goal": "Complete API integration layer", "status": "in_progress", "velocity": 42}
\`\`\`
Fields: name* (string), start_date? (string), end_date? (string), goal? (string), status? (planned|in_progress|completed|cancelled), velocity? (number)

**project_team_evaluations** — Team performance assessments
\`\`\`
######## project_team_evaluations: {"evaluation_period": "2026-Q1", "team_name": "Backend", "performance_rating": "good", "strengths": "Fast delivery", "areas_for_improvement": "Documentation quality", "evaluator": "PM"}
\`\`\`
Fields: evaluation_period* (string), team_name? (string), performance_rating? (excellent|good|satisfactory|needs_improvement), strengths? (string), areas_for_improvement? (string), evaluator? (string)

---

### Scope

**wbs_nodes** — Work Breakdown Structure elements
\`\`\`
######## wbs_nodes: {"wbs_code": "1.2.3", "name": "API Development", "level": 3, "parent_code": "1.2", "owner": "Dev Lead", "estimated_effort": 320, "estimated_cost": 48000}
\`\`\`
Fields: wbs_code* (string), name* (string), level? (number), parent_code? (string), description? (string), owner? (string), estimated_effort? (number), estimated_cost? (number)

**scope_baseline** — Approved project scope baseline
\`\`\`
######## scope_baseline: {"name": "Scope Baseline v1", "approval_date": "2026-02-15", "scope_statement": "Deliver an automated document processing system covering ingestion, classification, extraction, and reporting", "exclusions": "Mobile app, legacy system migration"}
\`\`\`
Fields: name* (string), approval_date? (string), scope_statement? (string), exclusions? (string)

**scope_change_requests** — Formal requests to change scope
\`\`\`
######## scope_change_requests: {"title": "Add email notification module", "description": "Auto-notify stakeholders on document status changes", "requestor": "Operations Manager", "cost_impact": 15000, "schedule_impact_days": 10, "status": "Pending"}
\`\`\`
Fields: title* (string), description? (string), requestor? (string), cost_impact? (number), schedule_impact_days? (number), status? (Key|Pending|Approved|Rejected)

**requirements_traceability** — Links requirements to deliverables
\`\`\`
######## requirements_traceability: {"requirement_title": "SSO Integration", "linked_deliverable": "Authentication Module", "linked_test": "TC-045", "status": "verified"}
\`\`\`
Fields: requirement_title* (string), linked_deliverable? (string), linked_test? (string), status? (draft|in_progress|verified|failed)

**scope_verification** — Formal acceptance of deliverables
\`\`\`
######## scope_verification: {"deliverable_name": "Data Extraction Engine", "verification_date": "2026-08-15", "verifier": "Product Owner", "method": "Review", "outcome": "Accepted"}
\`\`\`
Fields: deliverable_name* (string), verification_date? (string), verifier? (string), method? (Inspection|Test|Review), outcome? (Accepted|Rejected|Conditionally Accepted), comments? (string)

---

### Technologies & Development

**technologies** — Technologies used in the project
\`\`\`
######## technologies: {"name": "PostgreSQL", "category": "database", "version": "16", "purpose": "Primary relational data store", "vendor": "Open Source"}
\`\`\`
Fields: name* (string), category* (frontend|backend|database|infrastructure|devops|testing|monitoring|other), version? (string), description? (string), purpose? (string), license? (string), vendor? (string)

**development_approaches** — Methodology and approach choices
\`\`\`
######## development_approaches: {"name": "Scrum", "description": "2-week sprints with daily standups", "rationale": "Team familiar with Scrum; iterative delivery suits stakeholder needs", "lifecycle": "adaptive"}
\`\`\`
Fields: name* (string), description? (string), rationale? (string), lifecycle? (predictive|adaptive|hybrid)

**team_agreements** — Team working agreements
\`\`\`
######## team_agreements: {"title": "Definition of Done", "category": "quality_standards", "description": "Code reviewed, tests passing, documentation updated, deployed to staging", "status": "active"}
\`\`\`
Fields: title* (string), category* (working_hours|communication|decision_making|conflict_resolution|quality_standards|meeting_norms|code_of_conduct|collaboration_tools|response_times|knowledge_sharing|other), description? (string), status? (draft|active|under_review|revised|deprecated)

---

**Rules:**
1. Only emit tags for entities you actually introduced in this section
2. One JSON object per line — never arrays
3. Field names must match exactly as documented above
4. Use null for unknown optional numeric fields, omit them entirely for unknown strings
5. Do not tag source_document or source_document_id — these are set automatically
`
