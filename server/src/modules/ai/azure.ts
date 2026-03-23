import { generateText } from 'ai';
import { createAzure } from '@ai-sdk/azure';
import { isTracingEnabled, isNativeLangfuseEnabled } from '../../tracing'
import { Langfuse } from 'langfuse'

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com'
})

export interface AzureConfig {
  resourceName: string;
  apiKey: string;
  deployment: string;
  apiVersion?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface AzureProvider {
  name: string;
  config: AzureConfig;
  isActive: boolean;
}

export interface AzureRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AzureResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface AzureError {
  error: string;
  message: string;
  status?: number;
}

export class AzureConnector {
  private providers: Map<string, AzureProvider> = new Map();

  constructor() {
    console.log('[AZURE AI] AzureConnector initialized');
  }

  async initializeProviders(): Promise<void> {
    try {
      console.log('[AZURE AI] Initializing providers from database...');

      const { pool } = await import('../../database/connection');
      const result = await pool.query(`
        SELECT 
          id, name, api_key_encrypted, configuration, is_active,
          COALESCE(priority, 1) as priority,
          COALESCE(rate_limits, '{}') as rate_limits,
          COALESCE(usage_stats, '{}') as usage_stats
        FROM ai_providers 
        WHERE provider_type = 'azure' 
        ORDER BY priority ASC, name ASC
      `);

      for (const row of result.rows) {
        try {
          console.log(`[AZURE AI] Loading provider: ${row.name}`);
          console.log(`[AZURE AI] Encrypted API key: ${row.api_key_encrypted}`);

          const decryptedApiKey = this.decryptApiKey(row.api_key_encrypted);
          console.log(`[AZURE AI] Decrypted API key: ${decryptedApiKey ? decryptedApiKey.substring(0, 10) + '...' : 'NULL'}`);

          // Extract resource name from endpoint
          const endpoint = row.configuration?.endpoint || '';
          const resourceName = endpoint.replace('https://', '').replace('.cognitiveservices.azure.com', '');

          const config: AzureConfig = {
            resourceName: resourceName,
            apiKey: decryptedApiKey,
            deployment: row.configuration?.deployment || 'gpt-4.1-mini',
            apiVersion: row.configuration?.apiVersion || '2024-12-01-preview',
            timeout: row.configuration?.timeout || 30000,
            maxRetries: row.configuration?.max_retries || row.configuration?.maxRetries || 3
          };

          const provider: AzureProvider = {
            name: row.name,
            config,
            isActive: row.is_active,
          };

          await this.addProvider(provider);
        } catch (error) {
          console.error(`[AZURE AI] Error initializing provider ${row.name}:`, error);
        }
      }

      console.log(`[AZURE AI] Initialized ${this.providers.size} providers`);
    } catch (error) {
      console.error('[AZURE AI] Error initializing providers:', error);
      throw error;
    }
  }

  async addProvider(provider: AzureProvider): Promise<void> {
    try {
      console.log(`[AZURE AI] Adding provider: ${provider.name}`);

      // Skip API key validation during startup - validate during actual usage
      // await this.validateApiKey(provider.config.apiKey, provider.config.deployment);

      this.providers.set(provider.name, provider);
      console.log(`[AZURE AI] Provider ${provider.name} added successfully`);
    } catch (error) {
      console.error(`[AZURE AI] Error adding provider ${provider.name}:`, error);
      throw error;
    }
  }

  async generateContent(providerName: string, request: any): Promise<AzureResponse> {
    let langfuseTrace: any = null;
    let langfuseGeneration: any = null;

    try {
      const provider = this.providers.get(providerName);
      if (!provider) {
        throw new Error(`Provider ${providerName} not found`);
      }

      if (!provider.isActive) {
        throw new Error(`Provider ${providerName} is not active`);
      }

      console.log(`[AZURE AI] Generating content for provider: ${providerName}`);
      console.log(`[AZURE AI] Request:`, request);

      const deployment = provider.config.deployment;

      // Create Azure AI client using @ai-sdk/azure
      const azure = createAzure({
        resourceName: provider.config.resourceName,
        apiKey: provider.config.apiKey,
      });

      // Handle both prompt and messages formats
      let promptText = '';
      if (request.prompt) {
        promptText = request.prompt;
      } else if (request.messages && request.messages.length > 0) {
        // Convert messages array to prompt text
        promptText = request.messages.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n');
      } else {
        throw new Error('No prompt or messages provided');
      }

      // Create Langfuse trace and generation
      langfuseTrace = isNativeLangfuseEnabled() ? langfuse.trace({
        name: `azure-ai-generate`,
        metadata: { provider: providerName, deployment },
        tags: ['azure', deployment]
      }) : null;

      if (langfuseTrace) {
        langfuseGeneration = langfuseTrace.generation({
          name: 'azure-generation',
          model: deployment,
          modelParameters: {
            temperature: request.temperature || 0.7,
            maxTokens: request.maxTokens || request.max_tokens || 1000
          },
          input: promptText
        });
      }

      const result = await generateText({
        model: azure(deployment),
        messages: [{ role: 'user', content: promptText }],
        maxTokens: request.maxTokens || request.max_tokens || 1000,
        temperature: request.temperature || 0.7,
        experimental_telemetry: {
          isEnabled: isTracingEnabled(),
          functionId: 'azure-ai-generate',
          metadata: {
            provider: providerName,
            deployment: deployment
          }
        }
      } as any);

      const response: AzureResponse = {
        text: result.text,
        usage: result.usage ? {
          promptTokens: (result.usage as any).promptTokens || 0,
          completionTokens: (result.usage as any).completionTokens || 0,
          totalTokens: result.usage.totalTokens,
        } : undefined,
        finishReason: result.finishReason,
      };

      // End Langfuse generation on success
      if (langfuseGeneration) {
        langfuseGeneration.end({
          output: result.text,
          usage: response.usage
        });
        await langfuse.flushAsync();
      }

      console.log(`[AZURE AI] Content generated successfully for ${providerName}`);
      return response;
    } catch (error) {
      console.error(`[AZURE AI] Error generating content for ${providerName}:`, error);
      if (langfuseGeneration) {
        langfuseGeneration.end({
          level: 'ERROR',
          statusMessage: error instanceof Error ? error.message : String(error)
        });
        await langfuse.flushAsync();
      }
      throw error;
    }
  }

  async testConnection(providerName: string): Promise<boolean> {
    try {
      const provider = this.providers.get(providerName);
      if (!provider) {
        throw new Error(`Provider ${providerName} not found`);
      }

      console.log(`[AZURE AI] Testing connection for provider: ${providerName}`);
      console.log(`[AZURE AI] API key: ${provider.config.apiKey ? provider.config.apiKey.substring(0, 10) + '...' : 'NULL'}`);

      // Validate API key first
      await this.validateApiKey(provider.config.apiKey, provider.config.deployment);

      // Test with a simple prompt
      const testRequest: AzureRequest = {
        prompt: 'Test connection',
        maxTokens: 10,
        temperature: 0.1,
      };

      await this.generateContent(providerName, testRequest as any);

      console.log(`[AZURE AI] Connection test successful for ${providerName}`);
      return true;
    } catch (error) {
      console.error(`[AZURE AI] Connection test failed for ${providerName}:`, error);
      return false;
    }
  }

  private decryptApiKey(encryptedApiKey: string): string {
    try {
      return Buffer.from(encryptedApiKey, 'base64').toString('utf-8');
    } catch (error) {
      console.error('[AZURE AI] Error decrypting API key:', error);
      throw new Error('Failed to decrypt API key');
    }
  }

  private async validateApiKey(apiKey: string, deployment?: string): Promise<void> {
    try {
      if (!apiKey || apiKey.length < 10) {
        throw new Error('Invalid API key format');
      }

      console.log(`[AZURE AI] Validating API key: ${apiKey.substring(0, 10)}...`);
      const model = deployment || 'gpt-4.1-mini';

      // Create Azure AI client for validation
      const azure = createAzure({
        resourceName: 'cognisync-knowledgehub-resource', // Default resource name for validation
        apiKey: apiKey,
      });

      await generateText({
        model: azure(model),
        prompt: 'API key validation test',
        maxTokens: 500
      } as any);

      console.log(`[AZURE AI] API key validation successful for model: ${model}`);
    } catch (error) {
      console.error('[AZURE AI] API key validation failed:', error);
      throw new Error(`API key validation failed: ${error}`);
    }
  }
}

export const azureConnector = new AzureConnector();
