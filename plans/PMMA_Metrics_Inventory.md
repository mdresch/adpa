**Metrics Inventory — PMMA**

**Summary**
- **Created:** 2026-01-13
- **Source:** counts provided by stakeholder

**Counts (by category)**

| Category | Count |
|----------|-------:|
| Stakeholders | 102 |
| Requirements | 1,247 |
| Risks | 563 |
| Milestones | 365 |
| Constraints | 727 |
| Success Criteria | 659 |
| Best Practices | 981 |
| Phases | 168 |
| Resources | 424 |
| Deliverables | 867 |
| Scope Items | 914 |
| Activities | 1,336 |
| Team Agreements | 368 |
| Development Approach | 1 |
| Project Iterations | 209 |
| Work Items | 821 |
| Capacity Plans | 340 |
| Performance Measurements | 459 |
| Opportunities | 332 |
| Risk Responses | 52 |
| Earned Value Metrics | 23 |
| Performance Actuals | 29 |

**Zero / Missing Areas**
These entities report zero counts and likely represent gaps to address (governance, baselines, financials, scheduling, resourcing and compliance areas):

- Governance Decisions, Approval Workflows, Steering Committees, Change Control Boards
- Policy Compliance, Scope Baselines, WBS Nodes, Scope Change Requests
- Requirements Traceability, Scope Verification
- Schedule Baselines, Schedule Activities, Critical Path, Schedule Variances, Schedule Forecasts
- Budget Baselines, Cost Actuals, Cost Estimates, Funding Tranches, Financial Variances, Procurement Costs
- Resource Assignments, Resource Pool, Capacity Forecasts, Utilization Records, Resource Conflicts
- Onboarding/Offboarding
- Risk Assessments, Risk Response Plans, Risk Triggers, Risk Reviews, Contingency Reserves, Risk Metrics
- Engagement Actions, Communication Logs, Satisfaction Surveys, Stakeholder Issues, Relationship Health
- Governance Decisions and Approval workflows

**Highlights & Observations**
- Large content volumes exist for `Requirements` (1,247), `Activities` (1,336), `Best Practices` (981), `Scope Items` (914) and `Deliverables` (867) — good candidates for immediate ingestion and semantic normalization.
- Several governance, scheduling, financial and compliance areas are empty; these are high-priority gaps for auditability and baseline comparisons.
- `Development Approach` is present but minimal (1) — confirm intended value (e.g., Agile/Hybrid). 

**Recommended Next Steps**
- Prioritize extraction jobs for: `Requirements`, `Activities`, `Best Practices`, `Scope Items`, `Deliverables`, and `Risks`.
- Create baseline ingestion pipelines for governance and financial entities (the zero-count list) to enable compliance and reporting.
- Export this inventory as JSON/CSV for automated import into tracking systems (I can generate `plans/PMMA_Metrics_Inventory.json` if desired).
- Schedule a short review with stakeholders to validate counts and confirm priorities.

**File:** [plans/PMMA_Metrics_Inventory.md](plans/PMMA_Metrics_Inventory.md)
