#!/usr/bin/env node

/**
 * Generic Migration Script
 * Applies a single migration file to the database
 * Usage: node scripts/migrate-single.js <migration-number>
 */

const db = require('../src/lib/db');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables from server directory - try both .env and ../.env
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

// Debug: Log environment variables to verify they are loaded
console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL ? '***' : 'Not set');
console.log('🔍 DB_USER:', process.env.DB_USER ? '***' : 'Not set');
console.log('🔍 DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'Not set');
console.log('🔍 DB_HOST:', process.env.DB_HOST || 'localhost');

// Get migration number from command line arguments
const migrationNumber = process.argv[2];
if (!migrationNumber) {
    console.error('❌ Please provide a migration number (e.g., 012, 013)');
    process.exit(1);
}

// Map migration numbers to file names and descriptions
const migrationMap = {
    '012': { file: '012_team_agreements.sql', description: 'Team Agreements' },
    '013': { file: '013_development_approaches.sql', description: 'Development Approach' },
    '014': { file: '014_project_iterations.sql', description: 'Project Iterations' },
    '015': { file: '015_work_items.sql', description: 'Work Items' },
    '016': { file: '016_capacity_plans.sql', description: 'Capacity Plans' },
    '017': { file: '017_performance_measurements.sql', description: 'Performance Measurements' },
    '018': { file: '018_earned_value_metrics.sql', description: 'Earned Value Metrics' },
    '019': { file: '019_opportunities.sql', description: 'Opportunities' },
    '020': { file: '020_risk_responses.sql', description: 'Risk Responses' },
    '021': { file: '021_performance_actuals.sql', description: 'Performance Actuals' },
    '356': { file: '356_add_materialized_status_to_risks.sql', description: 'Add Materialized Status to Risks' },
    '357': { file: '357_add_issue_id_to_mitigation_plans.sql', description: 'Add Issue ID to Mitigation Plans' },
    '358': { file: '358_fix_extraction_errors.sql', description: 'Fix Extraction Errors' },
    '358': { file: '358_fix_extraction_errors.sql', description: 'Fix Extraction Errors' },
    '363': { file: '363_add_unique_constraint_performance_actuals.sql', description: 'Add Unique Constraint to Performance Actuals' },
    '364': { file: '364_fix_unique_constraint.sql', description: 'Fix Unique Constraint to Remove Measurement Date' },
    '365': { file: '365_proper_unique_constraint.sql', description: 'Create Proper Unique Constraint for Performance Actuals' },
    '366': { file: '366_add_entity_location_data.sql', description: 'Add Entity Location Data for Source Document Highlighting' },
    '367': { file: '367_add_task_location_data.sql', description: 'Add Location Data to Tasks Table for Source Document Highlighting' },
    '368': { file: '368_add_risk_location_data.sql', description: 'Add Location Data to Risks Table for Source Document Highlighting' },
    '369': { file: '369_add_mitigation_location_data.sql', description: 'Add Location Data to Mitigation Plans Table for Source Document Highlighting' },
    '370': { file: '370_add_issue_location_data.sql', description: 'Add Location Data to Issues Table for Source Document Highlighting' },
    '371': { file: '371_add_playbook_location_data.sql', description: 'Add Location Data to Playbooks Tables for Source Document Highlighting' },
    '372': { file: '372_add_requirement_location_data.sql', description: 'Add Location Data to Requirements Table for Source Document Highlighting' },
    '373': { file: '373_add_deliverable_location_data.sql', description: 'Add Location Data to Deliverables Table for Source Document Highlighting' },
    '374': { file: '374_add_stakeholder_location_data.sql', description: 'Add Location Data to Stakeholders Table for Source Document Highlighting' },
    '375': { file: '375_add_resource_location_data.sql', description: 'Add Location Data to Resources Table for Source Document Highlighting' },
    '376': { file: '376_add_milestone_location_data.sql', description: 'Add Location Data to Milestones Table for Source Document Highlighting' },
    '377': { file: '377_add_work_item_location_data.sql', description: 'Add Location Data to Work Items Table for Source Document Highlighting' },
    '378': { file: '378_add_success_criteria_location_data.sql', description: 'Add Location Data to Success Criteria Table for Source Document Highlighting' },
    '379': { file: '379_add_constraint_location_data.sql', description: 'Add Location Data to Constraints Table for Source Document Highlighting' },
    '380': { file: '380_add_scope_item_location_data.sql', description: 'Add Location Data to Scope Items Table for Source Document Highlighting' },
    '381': { file: '381_add_activity_location_data.sql', description: 'Add Location Data to Activities Table for Source Document Highlighting' },
    '382': { file: '382_add_phase_location_data.sql', description: 'Add Location Data to Phases Table for Source Document Highlighting' },
    '383': { file: '383_add_opportunity_location_data.sql', description: 'Add Location Data to Opportunities Table for Source Document Highlighting' },
    '384': { file: '384_add_quality_audit_location_data.sql', description: 'Add Location Data to Quality Audits Table for Source Document Highlighting' },
    '385': { file: '385_add_best_practice_location_data.sql', description: 'Add Location Data to Best Practices Table for Source Document Highlighting' },
    '386': { file: '386_add_template_improvement_location_data.sql', description: 'Add Location Data to Template Improvement Suggestions Table for Source Document Highlighting' },
    '387': { file: '387_update_personas_motivation_template_markdown.sql', description: 'Update User Personas Motivation Template to Produce Markdown Output' },
    '388': { file: '388_update_personas_technology_comfort_template_markdown.sql', description: 'Update User Personas Technology Comfort Template to Produce Markdown Output' },
    '389': { file: '389_create_enhanced_personas_motivation_template.sql', description: 'Create Enhanced User Personas Motivation Assessment Template' },
    '390': { file: '390_create_enhanced_personas_technology_comfort_template.sql', description: 'Create Enhanced User Personas Technology Comfort Template' },
    '391': { file: '391_add_resource_conflicts_columns.sql', description: 'Add Resource Conflicts Columns to Resources Table' },
    '392': { file: '392_add_resource_assignments_columns.sql', description: 'Add Resource Assignments Columns to Project Resource Assignments Table' },
    '393': { file: '393_make_resource_assignments_nullable.sql', description: 'Make Resource Assignments Columns Nullable for Extraction' },
    '394': { file: '394_add_missing_extraction_columns.sql', description: 'Add Missing Columns for Resource Pool, Onboarding Offboarding, and Risk Triggers' },
    '395': { file: '395_enhance_lessons_learned_schema.sql', description: 'Enhance Lessons Learned Schema' }
};

const migration = migrationMap[migrationNumber];
if (!migration) {
    console.error(`❌ Migration ${migrationNumber} not found`);
    console.error('Available migrations:', Object.keys(migrationMap).join(', '));
    process.exit(1);
}

// Create database pool using the same configuration logic as the main application
function createDatabasePool() {
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (databaseUrl) {
        // Use connection string - extract password to ensure it's a string
        const poolConfig = {
            connectionString: databaseUrl,
            ssl: databaseUrl.includes('supabase.co') || process.env.DB_SSL === 'true'
                ? { rejectUnauthorized: false }
                : false
        };

        // Extract password from URL if needed to ensure it's a string
        if (databaseUrl.includes('postgresql://') || databaseUrl.includes('postgres://')) {
            try {
                const url = new URL(databaseUrl);
                if (url.password) {
                    poolConfig.password = url.password;
                }
            } catch (e) {
                console.warn('⚠️ Could not parse DATABASE_URL, using as-is');
            }
        }

        console.log('🔍 Using DATABASE_URL for connection');
        return new Pool(poolConfig);
    } else {
        // Use individual connection parameters
        const poolConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME || 'adpa_db',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || undefined,
            ssl: process.env.DB_SSL === 'true'
                ? { rejectUnauthorized: false }
                : false
        };
        console.log('🔍 Using individual connection parameters');
        return new Pool(poolConfig);
    }
}

const pool = createDatabasePool();

async function applyMigration() {
    const client = await pool.connect();

    try {
        console.log(`🚀 Applying migration ${migrationNumber}: ${migration.description}`);

        // Read the migration file
        const migrationPath = path.join(__dirname, '../migrations', migration.file);

        if (!fs.existsSync(migrationPath)) {
            console.error(`❌ Migration file not found: ${migrationPath}`);
            process.exit(1);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Apply the migration within a transaction
        await client.query('BEGIN');

        console.log('📝 Applying migration SQL...');

        // Execute the entire migration SQL at once (Supabase requires this for function definitions)
        try {
            await client.query(migrationSQL);
        } catch (err) {
            // Ignore specific error codes that indicate the migration is already applied
            if (err.code === '42P07' || // relation already exists
                err.code === '42701' || // column already exists
                err.code === '42710' || // constraint already exists
                err.code === '42P06' || // schema already exists
                err.code === '23505' || // unique violation (for indexes)
                err.code === '42883' || // function already exists
                err.message.includes('already exists') ||
                err.message.includes('does not exist')) {
                console.log(`   ℹ️  Skipping: ${err.message.split('\n')[0]}`);
            } else {
                throw err;
            }
        }

        await client.query('COMMIT');
        console.log(`✅ Migration ${migrationNumber} (${migration.description}) applied successfully!`);

    } catch (error) {
        await client.query('ROLLBACK');

        if (error.code === '42P07') { // relation already exists
            console.log(`ℹ️  Migration ${migrationNumber} already applied (relation exists)`);
        } else if (error.code === '42701') { // column already exists
            console.log(`ℹ️  Migration ${migrationNumber} already applied (column exists)`);
        } else {
            console.error(`❌ Error applying migration ${migrationNumber}:`, error.message);
            process.exit(1);
        }
    } finally {
        client.release();
        try { await db.end() } catch (e) { }
    }
}

// Execute the migration
applyMigration();