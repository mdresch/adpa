import { pool } from './server/src/database/connection';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

async function checkPineconeIntegration() {
  try {
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
