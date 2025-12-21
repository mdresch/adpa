/**
 * Verify Extraction Registry
 * 
 * Usage: npx ts-node scripts/verify-extraction-registry.ts
 */

import { extractionRegistry, initializeRegistry } from '../src/services/extraction/ExtractionRegistry';

async function verify() {
    console.log('🔍 Verifying Extraction Registry...');

    // Initialize
    await initializeRegistry();

    const entities = extractionRegistry.getRegisteredEntities();
    const flags = extractionRegistry.getFeatureFlags();

    console.log(`\n✅ Registered Entities (${entities.length}):`);
    entities.sort().forEach(e => {
        const flag = flags[e] !== false ? '🟢 Enabled' : '🔴 Disabled';
        console.log(`- ${e} [${flag}]`);
    });

    const expectedAllPhases = [
        'governance_decisions',
        'approval_workflows',
        'steering_committees',
        'change_control_boards',
        'policy_compliance',
        'scope_baseline',
        'wbs_nodes',
        'scope_change_requests',
        'requirements_traceability',
        'scope_verification',
        'schedule_baseline',
        'schedule_activities',
        'critical_path',
        'schedule_variances',
        'schedule_forecasts',
        'budget_baseline',
        'cost_estimates',
        'funding_tranches',
        'financial_variances',
        'procurement_costs',
        'resource_plans',
        'roles_and_responsibilities',
        'team_availability',
        'labor_rates',
        'project_org_chart',
        'risk_appetite',
        'risk_checklists',
        'probability_impact_matrix',
        'issue_log',
        'lessons_learned',
        'stakeholder_engagements',
        'communication_logs',
        'action_items',
        'meeting_minutes',
        'project_charter_details',
        'business_case_details',
        'benefit_realization_plan',
        'general_change_requests',
        'project_team_evaluations'
    ];

    const missing = expectedAllPhases.filter(e => !entities.includes(e));

    if (missing.length > 0) {
        console.error('\n❌ Missing implementation entities:', missing);
        process.exit(1);
    }

    console.log('\n✨ All 39 new entities registered successfully!');
}

verify().catch(console.error);
