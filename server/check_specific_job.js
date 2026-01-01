
const { Pool } = require('pg');
require('dotenv').config();

async function checkJob() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query(
            "SELECT * FROM jobs WHERE id = 'cfd90b2b-13f5-4d8b-aaa2-2b2cb9756203'"
        );
        if (res.rows.length > 0) {
            console.log('--- Parent Job ---');
            console.log(JSON.stringify(res.rows[0], null, 2));

            const childIds = res.rows[0].data.childJobIds;
            console.log(`\nParent has ${childIds.length} children.`);

            // Try to find ANY job that mentioned this parent ID in its data
            const res2 = await pool.query(
                "SELECT id, type, status, data FROM jobs WHERE data->>'parentJobId' = $1 OR data->>'parent_job_id' = $1 LIMIT 5",
                ['cfd90b2b-13f5-4d8b-aaa2-2b2cb9756203']
            );
            console.log(`\nFound ${res2.rows.length} jobs by searching data->>'parentJobId'.`);
            res2.rows.forEach(r => console.log(`- ${r.id} (${r.type}) status: ${r.status}`));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkJob();
