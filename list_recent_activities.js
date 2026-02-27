const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    ssl: {
        rejectUnauthorized: false
    }
});

async function listRecent() {
    const projectId = 'e7950b94-6946-4a58-b6e3-73a66dd47d29';
    try {
        const res = await pool.query(`
      SELECT id, name, activity_name, source_document_id, created_at 
      FROM activities 
      WHERE project_id = $1 
      ORDER BY created_at DESC LIMIT 20
    `, [projectId]);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

listRecent();
