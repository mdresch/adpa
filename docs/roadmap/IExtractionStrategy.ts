import { ZodSchema } from 'zod';
import { PoolClient } from 'pg';

export interface IExtractionStrategy<T> {
  entityType: string;
  
  // Returns the Zod schema used to validate and repair AI output
  getSchema(): ZodSchema;
  
  // Constructs the specific prompt for this entity
  getPrompt(context: string): string; 
  
  // Handles persistence (including deduplication)
  save(client: PoolClient, projectId: string, data: T[], userId: string): Promise<void>;
}