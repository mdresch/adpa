/**
 * Verify Teams Integration
 * Tests the TeamsService logic and EscalationService integration
 */

import { teamsService } from '../services/teamsService'
import { pool, connectDatabase } from '../database/connection'
import { escalationService } from '../services/escalationService'
import { v4 as uuidv4 } from 'uuid'

async function runVerification() {
    console.log('Starting Microsoft Teams Integration Verification...');

    try {
        // Initialize database
        await connectDatabase();
        // 1. Test TeamsService standalone (mocking webhook URL)
        console.log('\n1. Testing TeamsService standalone logic...');
        // We use a dummy URL. It will likely fail with 404/400 but we want to see the logger output
        const success = await teamsService.sendNotification({
            webhookUrl: 'https://m365x123456.webhook.office.com/webhookb2/mock-url',
            title: 'Test Title',
            summary: 'Test Summary',
            text: 'Test Text',
            severity: 'normal'
        });
        console.log('TeamsService send call result (ignoring network error):', success);

        // 2. Mock a Teams Integration in DB
        console.log('\n2. Mocking Teams Integration in Database...');
        const integrationId = uuidv4();
        const adminId = '3a82e0e8-c54d-4f99-b1d7-e651ce101341'; // From seed.ts
        const credentials = {
            webhookUrl: 'https://m365x123456.webhook.office.com/webhookb2/mock-url'
        };
        const encryptedCredentials = Buffer.from(JSON.stringify(credentials)).toString('base64');

        await pool.query(
            `INSERT INTO integrations (id, name, type, configuration, credentials_encrypted, is_active, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET is_active = true`,
            [integrationId, 'Test Teams Integration', 'teams', '{}', encryptedCredentials, true, adminId]
        );
        console.log('Mock integration created:', integrationId);

        // 3. Test EscalationService Teams notification
        console.log('\n3. Testing EscalationService Teams notification logic...');
        // We'll call the private method via casting to any for verification purposes
        const mockAlert = {
            id: uuidv4(),
            project_id: uuidv4(),
            alert_summary: 'Test Alert Summary',
            alert_details: {
                approved_budget: 10000,
                projected_cost: 15000
            },
            deadline: new Date(),
            variance_percentage: 50
        };
        const mockRule = {
            rule_name: 'Budget Overrun Rule',
            drift_type: 'budget_overrun',
            severity_level: 'critical'
        };

        try {
            await (escalationService as any).sendTeamsNotification(mockAlert, mockRule);
            console.log('EscalationService Teams notification method executed.');
        } catch (err) {
            console.log('EscalationService Teams notification method failed (expected if network error):', (err as Error).message);
        }

        console.log('\nVerification script completed.');

    } catch (err) {
        console.error('Verification Failed:', err);
    } finally {
        process.exit(0);
    }
}

runVerification();
