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
        const res = await pool.query('SELECT id, name, content FROM documents WHERE id = $1', [docId]);
        if (res.rows.length === 0) {
            console.log('Document not found');
        } else {
            const row = res.rows[0];
            console.log('Document ID:', row.id);
            console.log('Name:', row.name);
            console.log('Content Preview:', row.content ? row.content.substring(0, 200) + '...' : 'N/A');

            // Check if it's JSON or Markdown
            if (row.content) {
                if (row.content.trim().startsWith('{') || row.content.trim().startsWith('[')) {
                    console.log('Content Type: Likely JSON');
                } else {
                    console.log('Content Type: Likely Markdown/Text');
                }
            }
        }
    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await pool.end();
    }
}

checkDocument();
