import * as dotenv from 'dotenv';
dotenv.config();

import { connectDatabase, pool } from '../src/database/connection';
import { logger } from '../src/utils/logger';

async function syncAiProviders() {
  try {
    logger.info('🚀 Connecting to database...');
    await connectDatabase();
    
    logger.info('🚀 Starting AI providers sync...');

    // 1. Azure OpenAI Provider
    const azureOpenAiId = 'b1e2d3c4-b5a6-4978-8c9d-e0f1a2b3c4d6';
    const azureOpenAiConfig = {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT || 'https://adpa-resource.openai.azure.com/openai/v1',
      deployment: 'gpt-4o-mini',
      apiVersion: '2024-12-01-preview',
      models: ['gpt-4o-mini', 'gpt-4o']
    };

    const azureOpenAiKey = process.env.AZURE_OPENAI_API_KEY && !process.env.AZURE_OPENAI_API_KEY.includes('your-') 
      ? process.env.AZURE_OPENAI_API_KEY 
      : 'placeholder-key-update-in-ui';

    await pool.query(`
      INSERT INTO ai_providers (id, name, provider_type, api_key_encrypted, configuration, is_active, priority)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        configuration = EXCLUDED.configuration,
        is_active = EXCLUDED.is_active,
        priority = EXCLUDED.priority,
        updated_at = NOW()
    `, [
      azureOpenAiId,
      'Azure OpenAI',
      'azure',
      Buffer.from(azureOpenAiKey).toString('base64'),
      JSON.stringify(azureOpenAiConfig),
      true,
      2
    ]);

    // 2. Azure AI Project / Foundry Provider (Cloud)
    const azureProjectId = 'c1e2d3c4-b5a6-4978-8c9d-e0f1a2b3c4d7';
    const azureProjectConfig = {
      endpoint: process.env.AZURE_AI_PROJECT_ENDPOINT || 'https://adpa-resource.services.ai.azure.com/api/projects/adpa',
      deployment: 'gpt-4o-mini',
      isProject: true,
      models: ['gpt-4o-mini', 'gpt-4o']
    };

    const azureProjectKey = process.env.AZURE_AI_PROJECT_KEY && !process.env.AZURE_AI_PROJECT_KEY.includes('••') 
      ? process.env.AZURE_AI_PROJECT_KEY 
      : 'placeholder-key-update-in-ui';

    await pool.query(`
      INSERT INTO ai_providers (id, name, provider_type, api_key_encrypted, configuration, is_active, priority)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        configuration = EXCLUDED.configuration,
        is_active = EXCLUDED.is_active,
        priority = EXCLUDED.priority,
        updated_at = NOW()
    `, [
      azureProjectId,
      'Azure AI Project',
      'azure',
      Buffer.from(azureProjectKey).toString('base64'),
      JSON.stringify(azureProjectConfig),
      true,
      3
    ]);

    // 3. Foundry Local Provider (On-Device)
    const foundryLocalId = 'd1e2d3c4-b5a6-4978-8c9d-e0f1a2b3c4d8';
    const foundryLocalConfig = {
      endpoint: process.env.FOUNDRY_LOCAL_ENDPOINT || 'http://localhost:8080',
      isLocal: true,
      models: [] // Will be populated by model discovery
    };

    await pool.query(`
      INSERT INTO ai_providers (id, name, provider_type, api_key_encrypted, configuration, is_active, priority)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        configuration = EXCLUDED.configuration,
        is_active = EXCLUDED.is_active,
        priority = EXCLUDED.priority,
        updated_at = NOW()
    `, [
      foundryLocalId,
      'Foundry Local',
      'foundry-local',
      Buffer.from('not-required').toString('base64'),
      JSON.stringify(foundryLocalConfig),
      true,
      10 // Lower priority for local unless cloud fails or explicitly chosen
    ]);

    logger.info('✅ AI providers synced successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to sync AI providers:', error);
    process.exit(1);
  }
}

syncAiProviders();
