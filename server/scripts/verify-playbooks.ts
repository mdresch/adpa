/**
 * Verification Script for Playbook System
 * RISK_MANAGEMENT_ENHANCEMENT_DESIGN.md - Phase 1 Verification
 */

import { playbookService } from '../src/services/playbookService';
import { connectDatabase, pool } from '../src/database/connection';
import { v4 as uuidv4 } from 'uuid';

async function verify() {
    try {
        console.log('🚀 Starting Playbook System Verification...');
        await connectDatabase();

        // 1. Find a test user or create one
        const userRes = await pool!.query("SELECT id FROM users LIMIT 1");
        if (userRes.rows.length === 0) {
            throw new Error('No users found in database to run verification');
        }
        const userId = userRes.rows[0].id;
        console.log(`👤 Using user ID: ${userId}`);

        // 2. Find a test project
        const projectRes = await pool!.query("SELECT id FROM projects LIMIT 1");
        if (projectRes.rows.length === 0) {
            throw new Error('No projects found in database to run verification');
        }
        const projectId = projectRes.rows[0].id;
        console.log(`📁 Using project ID: ${projectId}`);

        // 3. Create a Playbook
        console.log('📝 Creating test playbook...');
        const playbook = await playbookService.createPlaybook({
            project_id: projectId,
            title: 'Verification Playbook ' + new Date().toISOString(),
            category: 'risk',
            trigger_type: 'manual',
            description: 'System verification playbook'
        }, userId);
        console.log(`✅ Playbook created: ${playbook.id}`);

        // 4. Add a Step
        console.log('📝 Adding step to playbook...');
        const step = await playbookService.addStep({
            playbook_id: playbook.id,
            step_order: 1,
            step_title: 'Verify System Health',
            step_type: 'action',
            step_config: { check: 'all' }
        }, userId);
        console.log(`✅ Step added: ${step.id}`);

        // 5. Execute Playbook
        console.log('⚡ Executing playbook...');
        const execution = await playbookService.executePlaybook({
            playbook_id: playbook.id,
            triggered_by_type: 'manual',
            triggered_by_id: projectId,
            trigger_type: 'manual'
        }, userId);
        console.log(`✅ Execution started: ${execution.id}`);

        // 6. Complete Step
        console.log('✅ Completing step...');
        await playbookService.completeStep(
            execution.id,
            step.id,
            userId,
            'System looks healthy',
            { status: 'ok' }
        );
        console.log('✅ Step completed');

        // 7. Cleanup
        console.log('🧹 Cleaning up...');
        await pool!.query("DELETE FROM playbook_executions WHERE id = $1", [execution.id]);
        await pool!.query("DELETE FROM operational_playbooks WHERE id = $1", [playbook.id]);
        console.log('✅ Cleanup finished');

        console.log('\n✨ Playbook System Verification SUCCESSFUL! ✨');
        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ Verification FAILED:');
        console.error(error.message);
        if (error.stack) console.error(error.stack);
        process.exit(1);
    }
}

verify();
