import { db } from './lib/morphic/db';
import { aiProviders } from './lib/morphic/db/schema';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkModels() {
    try {
        const providers = await db.query.aiProviders.findMany();
        console.log('Providers and their available models:');
        providers.forEach(p => {
            console.log(`Provider: ${p.name} (${p.id})`);
            console.log(`Type: ${p.type}`);
            console.log(`Default Model: ${p.defaultModel}`);
            console.log(`Available Models:`, JSON.stringify(p.availableModels, null, 2));
            console.log('---');
        });
    } catch (err) {
        console.error('Error fetching providers:', err);
    }
}

checkModels();
