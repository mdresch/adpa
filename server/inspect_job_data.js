
const { Pool } = require('pg');
require('dotenv').config();

async function inspectData() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query(
            "SELECT id, data FROM jobs WHERE id IN ('cfd90b2b-13f5-4d8b-aaa2-2b2cb9756203', '79930e1d-a595-4d20-940d-358c4097e84f')"
        );
        res.rows.forEach(row => {
            console.log(`\nID: ${row.id}`);
            console.log('DataKeys:', Object.keys(row.data || {}));
            console.log('ChildJobIds:', row.data?.childJobIds?.length || 0);
            if (row.data?.childJobIds) {
                console.log('First 5 ChildJobIds:', row.data.childJobIds.slice(0, 5));
            }
        });

        if (res.rows.length > 0 && res.rows[0].data?.childJobIds?.length > 0) {
            const firstChildId = res.rows[0].data.childJobIds[0];
            const childRes = await pool.query("SELECT * FROM jobs WHERE id = $1", [firstChildId]);
            console.log('\nSample Child Job Data:');
            console.log(JSON.stringify(childRes.rows[0], null, 2));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspectData();
