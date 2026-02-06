
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function verify() {
    try {
        console.log('Connecting to DB...');
        const client = await pool.connect();

        // 1. Check columns
        console.log('Checking columns...');
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'lessons_learned'
        `);

        const columns = res.rows.map(r => r.column_name);
        const expected = ['status', 'severity', 'phase', 'date_identified', 'ai_analysis', 'shared_with_org'];

        const missing = expected.filter(c => !columns.includes(c));

        if (missing.length > 0) {
            console.error('❌ Missing columns:', missing);
        } else {
            console.log('✅ All expected columns present');
        }

        // 2. Try insert
        console.log('Testing Insert...');
        const projectIdRes = await client.query('SELECT id FROM projects LIMIT 1');
        if (projectIdRes.rows.length === 0) {
            console.log('No projects to test insert');
        } else {
            const projectId = projectIdRes.rows[0].id;
            try {
                const insertRes = await client.query(`
                    INSERT INTO lessons_learned (
                        project_id, title, description, category, status, severity, phase, shared_with_org
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *
                `, [projectId, 'JS Verification Lesson', 'Desc', 'Test', 'identified', 'critical', 'TestPhase', true]);

                console.log('✅ Insert successful', insertRes.rows[0].id);

                // Cleanup
                await client.query('DELETE FROM lessons_learned WHERE id = $1', [insertRes.rows[0].id]);
                console.log('Cleanup successful');

            } catch (err) {
                console.error('❌ Insert failed:', err.message);
            }
        }

        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

verify();
