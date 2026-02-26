const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    ssl: {
        rejectUnauthorized: false
    }
});

async function listColumns() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'documents'
    `);
        console.log('Columns in documents table:');
        res.rows.forEach(row => {
            console.log(`${row.column_name} (${row.data_type})`);
        });
    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await pool.end();
    }
}

listColumns();
