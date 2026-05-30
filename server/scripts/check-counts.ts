import db from '../src/lib/db';
import { ENTITY_COUNT_TABLES } from '../src/modules/analysis/entityTypeTables';

async function run() {
    await db.initDb();
    const projectId = '9ad00240-4dd8-4e83-9333-89515c2422f0';
    const counts: Record<string, number> = {};
    
    for (const table of ENTITY_COUNT_TABLES) {
        try {
            const res = await db.query(`SELECT COUNT(*) as count FROM "${table.name}" WHERE project_id = $1`, [projectId]);
            counts[table.key] = parseInt(res.rows[0].count);
        } catch (e) {
            // console.error(`Error counting ${table.name}:`, e.message);
        }
    }
    
    console.log('--- Entity Counts for Project ---');
    console.log(JSON.stringify(counts, null, 2));
    
    await db.end();
}

run();
