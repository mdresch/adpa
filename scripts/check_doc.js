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
        const res = await pool.query('SELECT id, name, content, markdown_content, output_formats FROM documents WHERE id = $1', [docId]);
        if (res.rows.length === 0) {
            console.log('Document not found');
        } else {
            const row = res.rows[0];
            console.log('Document ID:', row.id);
            console.log('Name:', row.name);
            console.log('Has Content:', !!row.content);
            console.log('Has Markdown Content:', !!row.markdown_content);
            console.log('Markdown Content Preview:', row.markdown_content ? row.markdown_content.substring(0, 100) + '...' : 'N/A');
            console.log('Output Formats:', row.output_formats);
        }
    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await pool.end();
    }
}

checkDocument();
