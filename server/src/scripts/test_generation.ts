import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { connectDatabase } from '../database/connection';
import { documentGenerationService } from '../services/documentGenerationService';

async function run() {
  try {
    await connectDatabase();
    
    // Use the exact parameters from the user's run
    const projectId = 'e8edf585-a14d-42dc-8009-660784d31387'; // ADPA - Unicorn - COAS
    const templateId = '512daf63-626e-48de-878f-a7e5f91c1ac6'; // The Spark Capture Template
    const userId = '42ca7333-b37e-4e1b-bd50-ac04abd7e682'; // Menno Drescher
    
    console.log('Starting test generation...');
    const result = await documentGenerationService.generateDocument({
      projectId,
      templateId,
      userPrompt: 'Generate the Spark Capture Template.',
      provider: 'mistral', // Test with Mistral AI
      model: 'mistral-large-latest',
      userId,
    });
    
    console.log('SUCCESS!');
    console.log(result.content.substring(0, 500) + '...');
  } catch (err) {
    console.error('GENERATION FAILED WITH ERROR:');
    console.error(err);
  }
}

run();
