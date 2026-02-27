const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkDocument() {
    const docId = 'fc32f461-1817-4710-bbee-e24ddb9a7793';
    try {
        const res = await pool.query('SELECT content FROM documents WHERE id = $1', [docId]);
        if (res.rows.length === 0) {
            console.log('Document not found');
        } else {
            const content = res.rows[0].content;
            console.log('--- RAW CONTENT START ---');
            console.log(content);
            console.log('--- RAW CONTENT END ---');
        }
    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await pool.end();
    }
}

checkDocument();
