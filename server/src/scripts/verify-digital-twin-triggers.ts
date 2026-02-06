
import { pool, connectDatabase } from '../database/connection';
import { digitalTwinAssetService } from '../services/digitalTwinAssetService';
import { createTriggerRule } from '../services/digitalTwinTriggerService';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

async function runVerification() {
    console.log('Starting Digital Twin Trigger Verification...');

    try {
        await connectDatabase();
        console.log('Database connected.');

        // 1. Get or Create Project
        let pid = '';
        const pRes = await pool!.query('SELECT id FROM projects LIMIT 1');
        if (pRes.rows.length > 0) {
            pid = pRes.rows[0].id;
            console.log('Using existing project:', pid);
        } else {
            console.log('No project found. Please ensure DB has at least one project.');
            return;
        }

        // 2. Create Asset
        console.log('Creating Asset...');
        const asset = await digitalTwinAssetService.registerAsset({
            project_id: pid,
            external_id: `test-asset-${Date.now()}`,
            platform_type: 'Generic',
            name: 'Test Trigger Asset',
            description: 'Asset for verifying triggers',
            asset_type: 'Pump'
        });
        const finalAssetId = asset.asset.id;
        console.log('Asset Created:', finalAssetId);

        // 3. Create Trigger Rule
        console.log('Creating Trigger Rule...');
        await createTriggerRule(pid, {
            name: 'Test Rule 1',
            trigger_type: 'state_change',
            rule_config: { condition: 'always' }, // Simple condition
            generation_params: { prompt: 'Test Prompt' },
            is_active: true
        });

        // 4. Create State (Should Trigger)
        console.log('Creating New State to fire trigger...');
        await digitalTwinAssetService.createState({
            asset_id: finalAssetId,
            state_snapshot: { status: 'Overheating', temp: 120 },
            state_version: 1,
            is_current: true,
            change_summary: 'Temperature spike'
        });

        // 5. Verify Trigger Creation
        console.log('Checking for Triggers...');
        // Allow a moment for async processing if any
        await new Promise(r => setTimeout(r, 1000));

        const triggers = await pool!.query(
            'SELECT * FROM digital_twin_document_triggers WHERE asset_id = $1',
            [finalAssetId]
        );

        if (triggers.rows.length > 0) {
            console.log('SUCCESS: Trigger found!');
            console.log(JSON.stringify(triggers.rows[0], null, 2));
        } else {
            console.error('FAILURE: No trigger found for asset.');
        }

    } catch (err) {
        console.error('Verification Failed:', err);
    } finally {
        process.exit(0);
    }
}

runVerification();
