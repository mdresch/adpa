/**
 * Run Schema Fix Migration
 * Applies fixes for missing columns and constraints
 */

import { pool } from '../src/database/connection';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
    console.log('🔧 Running schema fix migration...\n');

    try {
        // Read the migration file
        const migrationPath = path.join(__dirname, 'fix_schema_issues.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Execute the migration
        await pool.query(migrationSQL);

        console.log('\n✅ Schema fixes applied successfully!');
        console.log('\nFixed issues:');
        console.log('  ✓ Added response_action to risk_triggers');
        console.log('  ✓ Added availability_pct to resources');
        console.log('  ✓ Added resolution to resource_conflicts');
        console.log('  ✓ Made reported_date nullable in stakeholder_issues');
        console.log('  ✓ Expanded engagement_actions action_type constraint');
        console.log('  ✓ Created performance indexes');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
