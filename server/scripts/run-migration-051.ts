// run-migration-051.ts
// Script to run migration 051_create_portfolio_domains_table.sql
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  try {
    const migrationPath = path.join(__dirname, '../migrations/051_create_portfolio_domains_table.sql');
    let sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Extract only the UP section (everything before -- DOWN)
    const upMatch = sql.match(/-- UP([\s\S]*?)-- DOWN/);
    if (upMatch) {
      sql = upMatch[1];
    }
    
    console.log(`Running migration: 051_create_portfolio_domains_table.sql`);
    await client.query(sql);
    console.log('✅ Migration 051 applied successfully.');

    // Verify table was created
    console.log('\n📊 Verifying table creation...');
    const verifyResult = await client.query(`
      SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'portfolio_domains'
      ) AS table_exists;
    `);
    
    if (verifyResult.rows[0]?.table_exists) {
      console.log('✅ Table portfolio_domains exists in database');
      
      // Show table structure
      const structureResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'portfolio_domains'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📋 Table structure:');
      structureResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } else {
      console.error('❌ Table portfolio_domains was NOT created');
      process.exit(1);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 051 failed:', (err as any).message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
