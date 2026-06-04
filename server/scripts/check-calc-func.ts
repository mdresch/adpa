import db from '../src/lib/db';

async function run() {
    await db.initDb();
    const res = await db.query(`
        SELECT proname, prosrc 
        FROM pg_proc 
        WHERE proname = 'calculate_template_quality_metrics'
    `);
    console.log('Function calculate_template_quality_metrics:', JSON.stringify(res.rows, null, 2));
    
    await db.end();
}

run();
