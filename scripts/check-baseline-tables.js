const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false
});

async function checkBaselineTables() {
  try {
    console.log('🔍 Checking for baseline drift detection tables...\n');

    const tables = [
      'project_baselines',
      'baseline_components',
      'baseline_versions',
      'baseline_drift_detection',
      'innovation_opportunities'
    ];

    for (const table of tables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );
      
      const exists = result.rows[0].exists;
      console.log(`${exists ? '✅' : '❌'} ${table}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
      
      if (exists) {
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   └─ Row count: ${countResult.rows[0].count}`);
      }
    }

    console.log('\n');
    
    const allExist = await pool.query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_name IN ('project_baselines', 'baseline_components', 'baseline_versions', 'baseline_drift_detection', 'innovation_opportunities')`
    );
    
    const foundCount = parseInt(allExist.rows[0].count);
    
    if (foundCount === 5) {
      console.log('✅ All baseline tables exist! Migration 017 has been applied.');
    } else {
      console.log(`⚠️  Only ${foundCount}/5 tables found. Migration 017 needs to be run.`);
      console.log('\nTo apply the migration, run:');
      console.log('cd server');
      console.log('npm run migrate');
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await pool.end();
  }
}

checkBaselineTables();


require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false
});

async function checkBaselineTables() {
  try {
    console.log('🔍 Checking for baseline drift detection tables...\n');

    const tables = [
      'project_baselines',
      'baseline_components',
      'baseline_versions',
      'baseline_drift_detection',
      'innovation_opportunities'
    ];

    for (const table of tables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );
      
      const exists = result.rows[0].exists;
      console.log(`${exists ? '✅' : '❌'} ${table}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
      
      if (exists) {
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   └─ Row count: ${countResult.rows[0].count}`);
      }
    }

    console.log('\n');
    
    const allExist = await pool.query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_name IN ('project_baselines', 'baseline_components', 'baseline_versions', 'baseline_drift_detection', 'innovation_opportunities')`
    );
    
    const foundCount = parseInt(allExist.rows[0].count);
    
    if (foundCount === 5) {
      console.log('✅ All baseline tables exist! Migration 017 has been applied.');
    } else {
      console.log(`⚠️  Only ${foundCount}/5 tables found. Migration 017 needs to be run.`);
      console.log('\nTo apply the migration, run:');
      console.log('cd server');
      console.log('npm run migrate');
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await pool.end();
  }
}

checkBaselineTables();


require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false
});

async function checkBaselineTables() {
  try {
    console.log('🔍 Checking for baseline drift detection tables...\n');

    const tables = [
      'project_baselines',
      'baseline_components',
      'baseline_versions',
      'baseline_drift_detection',
      'innovation_opportunities'
    ];

    for (const table of tables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );
      
      const exists = result.rows[0].exists;
      console.log(`${exists ? '✅' : '❌'} ${table}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
      
      if (exists) {
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   └─ Row count: ${countResult.rows[0].count}`);
      }
    }

    console.log('\n');
    
    const allExist = await pool.query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_name IN ('project_baselines', 'baseline_components', 'baseline_versions', 'baseline_drift_detection', 'innovation_opportunities')`
    );
    
    const foundCount = parseInt(allExist.rows[0].count);
    
    if (foundCount === 5) {
      console.log('✅ All baseline tables exist! Migration 017 has been applied.');
    } else {
      console.log(`⚠️  Only ${foundCount}/5 tables found. Migration 017 needs to be run.`);
      console.log('\nTo apply the migration, run:');
      console.log('cd server');
      console.log('npm run migrate');
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await pool.end();
  }
}

checkBaselineTables();


require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false
});

async function checkBaselineTables() {
  try {
    console.log('🔍 Checking for baseline drift detection tables...\n');

    const tables = [
      'project_baselines',
      'baseline_components',
      'baseline_versions',
      'baseline_drift_detection',
      'innovation_opportunities'
    ];

    for (const table of tables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );
      
      const exists = result.rows[0].exists;
      console.log(`${exists ? '✅' : '❌'} ${table}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
      
      if (exists) {
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   └─ Row count: ${countResult.rows[0].count}`);
      }
    }

    console.log('\n');
    
    const allExist = await pool.query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_name IN ('project_baselines', 'baseline_components', 'baseline_versions', 'baseline_drift_detection', 'innovation_opportunities')`
    );
    
    const foundCount = parseInt(allExist.rows[0].count);
    
    if (foundCount === 5) {
      console.log('✅ All baseline tables exist! Migration 017 has been applied.');
    } else {
      console.log(`⚠️  Only ${foundCount}/5 tables found. Migration 017 needs to be run.`);
      console.log('\nTo apply the migration, run:');
      console.log('cd server');
      console.log('npm run migrate');
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await pool.end();
  }
}

checkBaselineTables();

