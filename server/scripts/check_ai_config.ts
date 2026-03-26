import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkAIConfig() {
    const pool = new Pool({
        connectionString: process.env.MORPHIC_DATABASE_URL,
        ssl: false
    });

    try {
        const providers = await pool.query('SELECT * FROM morphic_ai_providers');
        const models = await pool.query('SELECT id, provider_id, name, model_id, is_enabled FROM morphic_ai_models');
        const config = await pool.query('SELECT * FROM morphic_ai_model_config');

        const results = {
            providers: providers.rows,
            models: models.rows,
            config: config.rows
        };

        fs.writeFileSync(path.join(__dirname, 'ai_config_result.json'), JSON.stringify(results, null, 2));
        console.log('Results written to ai_config_result.json');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkAIConfig();
