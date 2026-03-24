import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkPartsSchema() {
    const pool = new Pool({
        connectionString: process.env.MORPHIC_DATABASE_URL,
        ssl: false
    });

    try {
        const schema = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'morphic_parts'
            ORDER BY ordinal_position
        `);
        
        fs.writeFileSync(path.join(__dirname, 'result_parts.json'), JSON.stringify(schema.rows, null, 2));
        console.log('Results written to result_parts.json');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkPartsSchema();
