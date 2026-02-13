import { pool, connectDatabase } from './src/database/connection';

async function checkSchema() {
    try {
        await connectDatabase();
        const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'jobs'
    `);
        console.log('Columns in "jobs" table:');
        result.rows.forEach(row => console.log(`- ${row.column_name}`));
        process.exit(0);
    } catch (error) {
        console.error('Error checking schema:', error);
        process.exit(1);
    }
}

checkSchema();
