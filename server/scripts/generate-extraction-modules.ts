/**
 * Generate Extraction Modules
 * 
 * Usage: npx ts-node -r tsconfig-paths/register scripts/generate-extraction-modules.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ENTITIES_DIR = path.resolve(__dirname, '../src/services/extraction/entities');
const TEMPLATE_DIR = path.resolve(ENTITIES_DIR, 'governance_decisions');

interface EntityConfig {
    name: string; // snake_case (e.g., approval_workflows)
    typeName: string; // PascalCase (e.g., ApprovalWorkflow)
    moduleName: string; // PascalCase (e.g., ApprovalWorkflows)
}

const NEW_ENTITIES: EntityConfig[] = [
    // Phase 1: Governance & Scope
    { name: 'approval_workflows', typeName: 'ApprovalWorkflow', moduleName: 'ApprovalWorkflows' },
    { name: 'steering_committees', typeName: 'SteeringCommittee', moduleName: 'SteeringCommittees' },
    { name: 'change_control_boards', typeName: 'ChangeControlBoard', moduleName: 'ChangeControlBoards' },
    { name: 'policy_compliance', typeName: 'PolicyCompliance', moduleName: 'PolicyCompliance' },
    { name: 'scope_baseline', typeName: 'ScopeBaseline', moduleName: 'ScopeBaseline' },
    { name: 'wbs_nodes', typeName: 'WBSNode', moduleName: 'WBSNodes' },
    { name: 'scope_change_requests', typeName: 'ScopeChangeRequest', moduleName: 'ScopeChangeRequests' },
    { name: 'requirements_traceability', typeName: 'RequirementsTraceability', moduleName: 'RequirementsTraceability' },
    { name: 'scope_verification', typeName: 'ScopeVerification', moduleName: 'ScopeVerification' },
    // Phase 2: Schedule & Finance
    { name: 'schedule_baseline', typeName: 'ScheduleBaseline', moduleName: 'ScheduleBaseline' },
    { name: 'schedule_activities', typeName: 'ScheduleActivity', moduleName: 'ScheduleActivities' },
    { name: 'critical_path', typeName: 'CriticalPath', moduleName: 'CriticalPath' },
    { name: 'schedule_variances', typeName: 'ScheduleVariance', moduleName: 'ScheduleVariances' },
    { name: 'schedule_forecasts', typeName: 'ScheduleForecast', moduleName: 'ScheduleForecasts' },
    { name: 'budget_baseline', typeName: 'BudgetBaseline', moduleName: 'BudgetBaseline' },
    { name: 'cost_estimates', typeName: 'CostEstimate', moduleName: 'CostEstimates' },
    { name: 'funding_tranches', typeName: 'FundingTranche', moduleName: 'FundingTranches' },
    { name: 'financial_variances', typeName: 'FinancialVariance', moduleName: 'FinancialVariances' },
    { name: 'procurement_costs', typeName: 'ProcurementCost', moduleName: 'ProcurementCosts' },
    // Phase 3: Resources & Risk/Issues
    { name: 'resource_plans', typeName: 'ResourcePlan', moduleName: 'ResourcePlans' },
    { name: 'roles_and_responsibilities', typeName: 'RoleAndResponsibility', moduleName: 'RolesAndResponsibilities' },
    { name: 'team_availability', typeName: 'TeamAvailability', moduleName: 'TeamAvailability' },
    { name: 'labor_rates', typeName: 'LaborRate', moduleName: 'LaborRates' },
    { name: 'project_org_chart', typeName: 'ProjectOrgChartNode', moduleName: 'ProjectOrgChart' },
    { name: 'risk_appetite', typeName: 'RiskAppetite', moduleName: 'RiskAppetite' },
    { name: 'risk_checklists', typeName: 'RiskChecklist', moduleName: 'RiskChecklists' },
    { name: 'probability_impact_matrix', typeName: 'ProbabilityImpactMatrix', moduleName: 'ProbabilityImpactMatrix' },
    { name: 'issue_log', typeName: 'IssueLogEntry', moduleName: 'IssueLog' },
    { name: 'lessons_learned', typeName: 'LessonLearned', moduleName: 'LessonsLearned' },
    // Phase 4: Stakeholder Ops
    { name: 'stakeholder_engagements', typeName: 'StakeholderEngagement', moduleName: 'StakeholderEngagements' },
    { name: 'communication_logs', typeName: 'CommunicationLog', moduleName: 'CommunicationLogs' },
    { name: 'action_items', typeName: 'ActionItem', moduleName: 'ActionItems' },
    { name: 'meeting_minutes', typeName: 'MeetingMinute', moduleName: 'MeetingMinutes' },
    // Phase 4: Strategy
    { name: 'project_charter_details', typeName: 'ProjectCharterDetails', moduleName: 'ProjectCharterDetails' },
    { name: 'business_case_details', typeName: 'BusinessCaseDetails', moduleName: 'BusinessCaseDetails' },
    { name: 'benefit_realization_plan', typeName: 'BenefitRealizationPlan', moduleName: 'BenefitRealizationPlan' },
    { name: 'general_change_requests', typeName: 'GeneralChangeRequest', moduleName: 'GeneralChangeRequests' },
    { name: 'project_team_evaluations', typeName: 'ProjectTeamEvaluation', moduleName: 'ProjectTeamEvaluations' },
];

function generate() {
    console.log('🚀 Generating extraction modules...');

    if (!fs.existsSync(TEMPLATE_DIR)) {
        console.error(`❌ Template directory not found: ${TEMPLATE_DIR}`);
        process.exit(1);
    }

    const templateFiles = {
        index: fs.readFileSync(path.join(TEMPLATE_DIR, 'index.ts'), 'utf8'),
        types: fs.readFileSync(path.join(TEMPLATE_DIR, 'types.ts'), 'utf8'),
        extract: fs.readFileSync(path.join(TEMPLATE_DIR, 'extractGovernanceDecisions.ts'), 'utf8'),
        save: fs.readFileSync(path.join(TEMPLATE_DIR, 'saveGovernanceDecisions.ts'), 'utf8'),
    };

    NEW_ENTITIES.forEach(entity => {
        const targetDir = path.join(ENTITIES_DIR, entity.name);

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        console.log(`\n📦 Generating ${entity.name}...`);

        const replaceParams = (content: string) => {
            return content
                .replace(/governance_decisions/g, entity.name)
                .replace(/GOVERNANCE_DECISIONS/g, entity.name.toUpperCase())
                .replace(/GovernanceDecisions/g, entity.moduleName)
                .replace(/GovernanceDecision/g, entity.typeName);
        };

        fs.writeFileSync(path.join(targetDir, 'types.ts'), replaceParams(templateFiles.types));
        fs.writeFileSync(path.join(targetDir, `extract${entity.moduleName}.ts`), replaceParams(templateFiles.extract));
        fs.writeFileSync(path.join(targetDir, `save${entity.moduleName}.ts`), replaceParams(templateFiles.save));
        fs.writeFileSync(path.join(targetDir, 'index.ts'), replaceParams(templateFiles.index));

        console.log(`✅ Created files in ${targetDir}`);
    });

    console.log('\n✨ Generation complete!');
}

generate();
