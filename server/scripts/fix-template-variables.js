
const { Pool } = require('pg');

const connectionString = 'postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres';

async function main() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const templateId = '6c7ec59f-084b-4c55-8629-3e889ece985d';
    console.log(`Fixing template ${templateId} variables if null...`);
    
    // Check if variables is null or undefined
    const checkResult = await pool.query('SELECT variables FROM templates WHERE id = $1', [templateId]);
    
    if (checkResult.rows.length === 0) {
        console.log('Template not found.');
        return;
    }
    
    const variables = checkResult.rows[0].variables;
    console.log('Current variables:', variables);
    
    if (variables === null) {
        console.log('Variables is NULL, fixing to []...');
        await pool.query('UPDATE templates SET variables = $1 WHERE id = $2', [JSON.stringify([]), templateId]);
        console.log('✅ Variables fixed.');
    } else {
        console.log('Variables is not NULL, no fix needed.');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
