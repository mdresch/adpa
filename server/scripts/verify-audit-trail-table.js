/**
 * Script to verify the entity_audit_trail table was created successfully
 */

const { Client } = require('pg');

async function verifyTable() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
  
  const client = new Client({
    connectionString: connectionString,
    connectionTimeoutMillis: 10000
  });

  try {
    console.log('🔍 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Check if table exists
    const tableCheck = await client.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 'entity_audit_trail'`
    );

    if (tableCheck.rows.length === 0) {
      console.log('❌ entity_audit_trail table does NOT exist');
      return false;
    }

    console.log('✅ entity_audit_trail table exists');

    // Get columns
    const cols = await client.query(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_name = 'entity_audit_trail' 
       ORDER BY ordinal_position`
    );

    console.log('\n📋 Table Columns:');
    console.log('─'.repeat(60));
    for (const col of cols.rows) {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? `DEFAULT ${col.column_default}` : '';
      console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(15)} ${nullable} ${defaultVal}`);
    }

    // Check indexes
    const indexes = await client.query(
      `SELECT indexname, indexdef 
       FROM pg_indexes 
       WHERE tablename = 'entity_audit_trail' 
       ORDER BY indexname`
    );

    console.log('\n📊 Indexes:');
    console.log('─'.repeat(60));
    for (const idx of indexes.rows) {
      console.log(`  ${idx.indexname}`);
    }

    // Check row count
    const count = await client.query(
      `SELECT COUNT(*) as count FROM entity_audit_trail`
    );

    console.log('\n📈 Row Count:', count.rows[0].count);

    // Check if entity_extractions has the new columns
    const entityCols = await client.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'entity_extractions' 
       AND column_name IN ('current_version', 'audit_chain_hash')
       ORDER BY column_name`
    );

    console.log('\n📋 Entity Extractions New Columns:');
    console.log('─'.repeat(60));
    for (const col of entityCols.rows) {
      console.log(`  ${col.column_name.padEnd(25)} ${col.data_type}`);
    }

    // Check view
    const viewCheck = await client.query(
      `SELECT table_name FROM information_schema.views 
       WHERE table_schema = 'public' AND table_name = 'entity_lineage'`
    );

    console.log('\n👁️  Views:');
    console.log('─'.repeat(60));
    if (viewCheck.rows.length > 0) {
      console.log('  ✅ entity_lineage view exists');
    } else {
      console.log('  ⚠️  entity_lineage view does NOT exist');
    }

    console.log('\n✅ Verification Complete!');
    return true;

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    return false;
  } finally {
    await client.end();
  }
}

verifyTable().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Verification failed:', error.message);
  process.exit(1);
});
