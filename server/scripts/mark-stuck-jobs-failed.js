const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function markStuckJobsFailed() {
    console.log('🔧 Marking stuck extraction jobs as failed...\n');

    const stuckJobIds = [
        '21ec6ed0-ce05-4fca-8d38-c002153687c0',
        '8fbddcbb-4936-43fe-ae0d-cb0551cc2e74',
        '44e1c30f-3412-4e69-a85c-ff7efa2f51cc',
        '7ddf9650-4942-4c9d-9aab-45a98e00846f',
        'b12ba9f7-044f-4423-97ad-b24abdcdedfc',
        'ce15d0e1-cf6f-4080-abc1-f0c2d9a77fae',
        '0bad5117-f0c5-4d32-a821-860404987e5e'
    ];

    try {
        const result = await pool.query(`
      UPDATE jobs 
      SET status = 'failed', 
          error_message = 'Job exceeded timeout - child jobs failed with UUID parsing errors',
          completed_at = NOW()
      WHERE id = ANY($1::uuid[])
      RETURNING id, queue_name, progress
    `, [stuckJobIds]);

        console.log(`✅ Marked ${result.rows.length} jobs as failed:\n`);
        result.rows.forEach(row => {
            console.log(`   - ${row.id} (${row.queue_name}) was at ${row.progress}%`);
        });

    } catch (error) {
        console.error('❌ Failed to mark jobs:', error.message);
    } finally {
        await pool.end();
    }
}

markStuckJobsFailed();
