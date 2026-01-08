// run-migration-052.ts
// Script to run migration 052_seed_portfolio_domains.sql
import fs from 'fs';
import path from 'path';
const db = require('../src/lib/db');
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  try {
    const migrationPath = path.join(__dirname, '../migrations/052_seed_portfolio_domains.sql');
    let sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Extract only the UP section (everything before -- DOWN)
    const upMatch = sql.match(/-- UP([\s\S]*?)-- DOWN/);
    if (upMatch) {
      sql = upMatch[1];
    }
    
    console.log(`Running migration: 052_seed_portfolio_domains.sql`);
    await client.query(sql);
    console.log('✅ Migration 052 (seed) applied successfully.');

    // Verify data was seeded
    console.log('\n📊 Verifying data seed...');
    const countResult = await client.query('SELECT COUNT(*) as count FROM portfolio_domains;');
    const count = countResult.rows[0]?.count || 0;
    
    console.log(`✅ Successfully seeded ${count} portfolio domains`);
    
    if (count > 0) {
      // Show seeded domains
      const domainResult = await client.query('SELECT name FROM portfolio_domains ORDER BY name ASC;');
      console.log('\n📋 Seeded domains:');
      domainResult.rows.forEach((row, idx) => {
        console.log(`  ${idx + 1}. ${row.name}`);
      });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 052 failed:', (err as any).message);
    process.exit(1);
  } finally {
    client.release();
    try { await db.end() } catch (e) {}
  }
}

runMigration();
