const { execSync } = require('child_process');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const PROJECT_REF = 'blxzjbxczpmmgiwbtmdo';

async function setSecrets() {
    console.log('🔐 Setting Supabase Secrets...');

    const voyageApiKey = process.env.VOYAGE_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!voyageApiKey || !supabaseUrl || !supabaseKey) {
        console.error('❌ Missing env vars (VOYAGE_API_KEY, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY)');
        process.exit(1);
    }

    try {
        // Set Secrets
        console.log('Setting Secrets...');
        execSync(`npx supabase secrets set VOYAGE_API_KEY=${voyageApiKey} SUPABASE_URL=${supabaseUrl} SUPABASE_SERVICE_ROLE_KEY=${supabaseKey} --project-ref ${PROJECT_REF}`, { stdio: 'inherit' });

        console.log('✅ Secrets set successfully.');
    } catch (error) {
        console.error('❌ Error setting secrets:', error.message);
        process.exit(1);
    }
}

setSecrets();
