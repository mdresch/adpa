#!/usr/bin/env ts-node
/**
 * Simple diagnostic script to check extraction job status
 * 
 * This script provides SQL queries and basic diagnostics for checking incomplete extraction jobs
 */

import { pool } from '../database/connection';
import { logger } from '../utils/logger';

console.log('🔍 Extraction Job Diagnostic Script');
console.log('===================================');

// SQL queries for checking extraction job status
const SQL_QUERIES = {
    incompleteExtractionJobs: `
        -- Incomplete extraction jobs (failed, stuck, pending)
        SELECT 
            id, type, status, created_by, created_at, 
            started_at, completed_at, error_message, 
            data->>'projectId' as project_id,
            data->>'retryOf' as retry_of
        FROM jobs
        WHERE type LIKE '%extract%'
        AND status NOT IN ('completed', 'cancelled')
        ORDER BY created_at DESC;
    `,

    stuckExtractionJobs: `
        -- Stuck extraction jobs (processing for > 30 minutes)
        SELECT 
            id, type, status, created_at, started_at,
            data->>'projectId' as project_id
        FROM jobs
        WHERE type LIKE '%extract%'
        AND status = 'processing'
        AND started_at < NOW() - INTERVAL '30 minutes'
        ORDER BY started_at ASC;
    `,

    parentChildExtractionJobs: `
        -- Parent extraction jobs with child job status
        SELECT 
            p.id as parent_id, p.status as parent_status,
            p.created_at as parent_created,
            p.completed_at as parent_completed,
            p.data->>'projectId' as project_id,
            COUNT(c.id) as child_count,
            SUM(CASE WHEN c.status = 'completed' THEN 1 ELSE 0 END) as completed_children,
            SUM(CASE WHEN c.status = 'failed' THEN 1 ELSE 0 END) as failed_children
        FROM jobs p
        LEFT JOIN jobs c ON c.data->>'parentJobId' = p.id
        WHERE p.type = 'extract-project-data'
        GROUP BY p.id, p.status, p.created_at, p.completed_at, p.data
        ORDER BY p.created_at DESC
        LIMIT 20;
    `,

    failedEntityTypes: `
        -- Failed entity extraction types
        SELECT 
            type,
            COUNT(*) as failed_count,
            STRING_AGG(id::text, ', ' ORDER BY created_at DESC) as job_ids
        FROM jobs
        WHERE type LIKE 'extract-entity-%'
        AND status = 'failed'
        GROUP BY type
        ORDER BY failed_count DESC;
    `
};

// Execute and display query results
async function executeQuery(queryName: string, query: string) {
    console.log(`\n=== ${queryName.replace(/([A-Z])/g, ' $1').toUpperCase()} ===`);

    try {
        const result = await pool.query(query);

        if (result.rows.length === 0) {
            console.log('✅ No results found');
            return;
        }

        console.log(`📊 Found ${result.rows.length} result(s):`);

        // Display results in a readable format
        result.rows.forEach((row, index) => {
            console.log(`\n${index + 1}.`);
            Object.entries(row).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    console.log(`   ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
                }
            });
        });

    } catch (error) {
        console.error('❌ Error executing query:', error);
    }
}

// Run basic diagnostics
async function runDiagnostics() {
    console.log('\n=== RUNNING DIAGNOSTICS ===');

    try {
        // Check database connection
        await pool.query('SELECT 1');
        console.log('✅ Database connection working');

        // Check if jobs table exists
        const tableCheck = await pool.query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'jobs')"
        );

        if (tableCheck.rows[0].exists) {
            console.log('✅ Jobs table exists');
        } else {
            console.log('❌ Jobs table does not exist');
            return;
        }

    } catch (error) {
        console.error('❌ Basic diagnostics failed:', error);
        return;
    }
}

// Main function
async function main() {
    // Run basic diagnostics
    await runDiagnostics();

    // Execute all SQL queries
    for (const [queryName, query] of Object.entries(SQL_QUERIES)) {
        await executeQuery(queryName, query);
    }

    console.log('\n=== SQL QUERIES FOR MANUAL EXECUTION ===');
    console.log('\nYou can run these queries directly in your database client:');

    Object.entries(SQL_QUERIES).forEach(([queryName, query]) => {
        console.log(`\n-- ${queryName.replace(/([A-Z])/g, ' $1').toUpperCase()}`);
        console.log(query.trim());
    });

    console.log('\n📋 Diagnostic complete.');
}

// Run the script
main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
}).finally(() => {
    pool.end();
});