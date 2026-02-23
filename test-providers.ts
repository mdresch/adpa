import { db } from './server/src/db/index';
import { aiProviders } from './server/src/db/schema';

async function checkProviders() {
    try {
        const providers = await db.query.aiProviders.findMany();
        console.log("DB AI Providers:", JSON.stringify(providers, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkProviders();
