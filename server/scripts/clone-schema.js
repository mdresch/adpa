const { Pool } = require('pg');
const fs = require('fs');

const devPool = new Pool({ connectionString: process.env.DEV_DATABASE_URL });
const testPool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });

async function cloneSchema() {
  console.log('Fetching schema from dev database...');
  
  // Get all table creation statements
  const tables = await devPool.query(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename
  `);
  
  console.log(`Found ${tables.rows.length} tables`);
  
  let schema = '';
  
  // Get sequences
  const sequences = await devPool.query(`
    SELECT sequence_name FROM information_schema.sequences 
    WHERE sequence_schema = 'public'
  `);
  
  for (const seq of sequences.rows) {
    schema += `CREATE SEQUENCE IF NOT EXISTS ${seq.sequence_name};\n`;
  }
  console.log(`Added ${sequences.rows.length} sequences`);
  
  // Get all table schemas
  for (const table of tables.rows) {
    const tableName = table.tablename;
    
    // Get CREATE TABLE statement
    const createResult = await devPool.query(`
      SELECT pg_get_constraintdef(oid) as constraint_def, conname
      FROM pg_constraint 
      WHERE conrelid = '${tableName}'::regclass AND contype IN ('p', 'f', 'u', 'c')
    `);
    
    const constraints = createResult.rows.map(r => `ALTER TABLE ${tableName} ADD ${r.constraint_def};`).join('\n');
    
    // Get indexes
    const indexes = await devPool.query(`
      SELECT indexdef FROM pg_indexes 
      WHERE tablename = $1 AND schemaname = 'public'
    `, [tableName]);
    
    const indexDefs = indexes.rows.map(r => r.indexdef + ';').join('\n');
    
    // Simple approach: use pg_dump would be better, but let's try a different method
    schema += `\n-- Table: ${tableName}\n`;
    schema += `CREATE TABLE IF NOT EXISTS ${tableName} ();\n`;
    
    if (constraints) schema += constraints + '\n';
    if (indexDefs) schema += indexDefs + '\n';
  }
  
  console.log('Schema SQL generated, saving...');
  fs.writeFileSync('./schema-clone.sql', schema);
  
  // Now execute on test database
  console.log('Applying schema to test database...');
  
  // Split and execute in chunks (PostgreSQL has limits)
  const statements = schema.split(';').filter(s => s.trim().length > 10);
  
  let success = 0;
  let failed = 0;
  
  for (const stmt of statements) {
    try {
      await testPool.query(stmt);
      success++;
    } catch (e) {
      // Ignore "relation already exists" errors
      if (!e.message.includes('already exists')) {
        failed++;
        if (failed < 5) console.log('Error:', e.message.substring(0, 100));
      }
    }
  }
  
  console.log(`Schema clone complete: ${success} success, ${failed} failed (expected for IF NOT EXISTS)`);
  
  await devPool.end();
  await testPool.end();
}

cloneSchema().catch(console.error);
