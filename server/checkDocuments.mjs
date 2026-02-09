import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkDocuments() {
    try {
        const result = await pool.query('SELECT id, name FROM documents LIMIT 5');
        console.log('📄 Found documents:', result.rows.length);
        result.rows.forEach((row, i) => {
            console.log(`  ${i + 1}. ${row.name} (${row.id})`);
        });

        if (result.rows.length === 0) {
            console.log('\n⚠️ No documents found. Creating a test document...');
            const insertResult = await pool.query(
                `INSERT INTO documents (name, content, created_at, updated_at) 
         VALUES ($1, $2, NOW(), NOW()) 
         RETURNING id, name`,
                [
                    'Test RAG Document',
                    'This is a test document about project management. Project managers coordinate teams, handle resources, track progress, and ensure successful delivery of projects. Key aspects include planning, execution, monitoring, and closure phases. Risk management is crucial for identifying and mitigating potential issues.'
                ]
            );
            console.log('✅ Created test document:', insertResult.rows[0]);
            return insertResult.rows[0].id;
        } else {
            return result.rows[0].id;
        }
    } finally {
        await pool.end();
    }
}

checkDocuments()
    .then((docId) => {
        console.log('\n✨ Test document ID:', docId);
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
