// Use require for imports that depend on env vars to ensure we load env first
const path = require('path');
const dotenv = require('dotenv');

// Load .env explicitly BEFORE importing database connection
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Manually set DATABASE_URL if it's missing just in case
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres";
}

// Now we can import the database modules
const { pool, connectDatabase } = require('./database/connection');

async function checkPineconeIntegration() {
  try {
    console.log('Connecting to database...');
    await connectDatabase();
    
    const result = await pool.query("SELECT id, name, type, configuration, credentials_encrypted FROM integrations WHERE type = 'pinecone'");
    console.log('--- PINECONE INTEGRATIONS ---');
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Also check current env for comparison
    console.log('\n--- CURRENT ENVIRONMENT ---');
    console.log('PINECONE_INDEX_NAME:', process.env.PINECONE_INDEX_NAME);
    console.log('PINECONE_INDEX_HOST:', process.env.PINECONE_INDEX_HOST);
    
    await pool.end();
  } catch (error) {
    console.error('Error checking integrations:', error);
  }
}

checkPineconeIntegration();

export {};
