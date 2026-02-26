import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function extractSchema() {
  const client = await pool.connect();
  try {
    const targetTables = [
      'contingency_reserves',
      'capacity_forecasts',
      'resource_conflicts',
      'stakeholder_issues',
      'risk_triggers',
      'engagement_actions',
      'resources',
      'project_resource_assignments',
      'satisfaction_surveys',
      'onboarding_offboarding'
    ];

    console.log('# Database Schema Extract');
    console.log(`Extracted at: ${new Date().toISOString()}`);
    console.log();

    // Query for tables and columns
    const columnsRes = await client.query(`
      SELECT 
        table_name, 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM 
        information_schema.columns 
      WHERE 
        table_schema = 'public'
        AND table_name = ANY($1)
      ORDER BY 
        table_name, ordinal_position;
    `, [targetTables]);

    const tables: Record<string, any[]> = {};
    columnsRes.rows.forEach(row => {
      if (!tables[row.table_name]) {
        tables[row.table_name] = [];
      }
      tables[row.table_name].push(row);
    });

    for (const tableName of targetTables) {
      if (!tables[tableName]) {
        console.log(`## Table: ${tableName} (NOT FOUND)`);
        console.log();
        continue;
      }
      const columns = tables[tableName];
      console.log(`## Table: ${tableName}`);
      console.log('| Column | Type | Nullable | Default |');
      console.log('| --- | --- | --- | --- |');
      columns.forEach(col => {
        console.log(`| ${col.column_name} | ${col.data_type} | ${col.is_nullable} | ${col.column_default || ''} |`);
      });
      console.log();
    }

    // Query for check constraints
    console.log('## Check Constraints');
    const checkConstraintsRes = await client.query(`
      SELECT 
        conname AS constraint_name, 
        relname AS table_name, 
        pg_get_constraintdef(c.oid) AS constraint_definition
      FROM 
        pg_constraint c
      JOIN 
        pg_class t ON t.oid = c.conrelid
      JOIN 
        pg_namespace n ON n.oid = c.connamespace
      WHERE 
        contype = 'c' 
        AND n.nspname = 'public'
        AND relname = ANY($1);
    `, [targetTables]);

    console.log('| Table | Constraint Name | Definition |');
    console.log('| --- | --- | --- |');
    checkConstraintsRes.rows.forEach(row => {
      console.log(`| ${row.table_name} | ${row.constraint_name} | ${row.constraint_definition} |`);
    });

  } catch (err) {
    console.error('Error extracting schema:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

extractSchema();
