import { v4 as uuidv4 } from 'uuid';
import { getDatabasePool } from '../../../database/connection';

export interface AIModel {
  id: string;
  provider_id: string;
  name: string;
  display_name?: string;
  description?: string;
  context_length?: number;
  capabilities?: string[];
  is_active: boolean;
  is_default: boolean;
  priority: number;
  cost_per_1k_input_tokens?: number;
  cost_per_1k_output_tokens?: number;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FallbackChain {
  id: string;
  name: string;
  description?: string;
  task_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FallbackChainEntry {
  id: string;
  chain_id: string;
  model_id: string;
  priority: number;
  timeout_ms: number;
  retry_attempts: number;
  conditions: Record<string, any>;
  created_at: string;
}

export class ModelRepository {
  // AI Models
  static async findAllModels(): Promise<AIModel[]> {
    const { rows } = await getDatabasePool().query('SELECT * FROM ai_models ORDER BY priority DESC, name ASC');
    return rows as AIModel[];
  }

  static async findModelById(id: string): Promise<AIModel | null> {
    const { rows } = await getDatabasePool().query('SELECT * FROM ai_models WHERE id = $1', [id]);
    return (rows[0] as AIModel) || null;
  }

  static async createModel(data: Partial<AIModel>): Promise<AIModel> {
    const id = data.id || uuidv4();
    const now = new Date().toISOString();
    const { rows } = await getDatabasePool().query(
      `INSERT INTO ai_models (
        id, provider_id, name, display_name, description, context_length, capabilities, is_active, is_default, priority, cost_per_1k_input_tokens, cost_per_1k_output_tokens, settings, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      ) RETURNING *`,
      [
        id,
        data.provider_id,
        data.name,
        data.display_name || null,
        data.description || null,
        data.context_length || null,
        JSON.stringify(data.capabilities || []),
        data.is_active ?? true,
        data.is_default ?? false,
        data.priority ?? 0,
        data.cost_per_1k_input_tokens || null,
        data.cost_per_1k_output_tokens || null,
        JSON.stringify(data.settings || {}),
        now,
        now
      ]
    );
    return rows[0] as AIModel;
  }

  static async updateModel(id: string, data: Partial<AIModel>): Promise<AIModel | null> {
    const now = new Date().toISOString();
    const { rows } = await getDatabasePool().query(
      `UPDATE ai_models SET
        display_name = COALESCE($2, display_name),
        description = COALESCE($3, description),
        context_length = COALESCE($4, context_length),
        capabilities = COALESCE($5, capabilities),
        is_active = COALESCE($6, is_active),
        is_default = COALESCE($7, is_default),
        priority = COALESCE($8, priority),
        cost_per_1k_input_tokens = COALESCE($9, cost_per_1k_input_tokens),
        cost_per_1k_output_tokens = COALESCE($10, cost_per_1k_output_tokens),
        settings = COALESCE($11, settings),
        updated_at = $12
      WHERE id = $1
      RETURNING *`,
      [
        id,
        data.display_name || null,
        data.description || null,
        data.context_length || null,
        data.capabilities ? JSON.stringify(data.capabilities) : null,
        data.is_active,
        data.is_default,
        data.priority,
        data.cost_per_1k_input_tokens,
        data.cost_per_1k_output_tokens,
        data.settings ? JSON.stringify(data.settings) : null,
        now
      ]
    );
    return (rows[0] as AIModel) || null;
  }

  // Fallback Chains
  static async findAllChains(): Promise<FallbackChain[]> {
    const { rows } = await getDatabasePool().query('SELECT * FROM ai_fallback_chains ORDER BY name ASC');
    return rows as FallbackChain[];
  }

  static async findChainById(id: string): Promise<FallbackChain | null> {
    const { rows } = await getDatabasePool().query('SELECT * FROM ai_fallback_chains WHERE id = $1', [id]);
    return (rows[0] as FallbackChain) || null;
  }

  static async createChain(data: Partial<FallbackChain>): Promise<FallbackChain> {
    const id = data.id || uuidv4();
    const now = new Date().toISOString();
    const { rows } = await getDatabasePool().query(
      `INSERT INTO ai_fallback_chains (
        id, name, description, task_type, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *`,
      [
        id,
        data.name,
        data.description || null,
        data.task_type,
        data.is_active ?? true,
        now,
        now
      ]
    );
    return rows[0] as FallbackChain;
  }

  static async updateChain(id: string, data: Partial<FallbackChain>): Promise<FallbackChain | null> {
    const now = new Date().toISOString();
    const { rows } = await getDatabasePool().query(
      `UPDATE ai_fallback_chains SET
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        task_type = COALESCE($4, task_type),
        is_active = COALESCE($5, is_active),
        updated_at = $6
      WHERE id = $1
      RETURNING *`,
      [
        id,
        data.name || null,
        data.description || null,
        data.task_type || null,
        data.is_active,
        now
      ]
    );
    return (rows[0] as FallbackChain) || null;
  }

  // Fallback Chain Entries
  static async findEntriesByChain(chain_id: string): Promise<FallbackChainEntry[]> {
    const { rows } = await getDatabasePool().query(
      'SELECT * FROM ai_fallback_chain_entries WHERE chain_id = $1 ORDER BY priority ASC',
      [chain_id]
    );
    return rows as FallbackChainEntry[];
  }

  static async createEntry(data: Partial<FallbackChainEntry>): Promise<FallbackChainEntry> {
    const id = data.id || uuidv4();
    const now = new Date().toISOString();
    const { rows } = await getDatabasePool().query(
      `INSERT INTO ai_fallback_chain_entries (
        id, chain_id, model_id, priority, timeout_ms, retry_attempts, conditions, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING *`,
      [
        id,
        data.chain_id,
        data.model_id,
        data.priority,
        data.timeout_ms ?? 30000,
        data.retry_attempts ?? 1,
        JSON.stringify(data.conditions || {}),
        now
      ]
    );
    return rows[0] as FallbackChainEntry;
  }

  static async updateEntry(id: string, data: Partial<FallbackChainEntry>): Promise<FallbackChainEntry | null> {
    const { rows } = await getDatabasePool().query(
      `UPDATE ai_fallback_chain_entries SET
        priority = COALESCE($2, priority),
        timeout_ms = COALESCE($3, timeout_ms),
        retry_attempts = COALESCE($4, retry_attempts),
        conditions = COALESCE($5, conditions)
      WHERE id = $1
      RETURNING *`,
      [
        id,
        data.priority,
        data.timeout_ms,
        data.retry_attempts,
        data.conditions ? JSON.stringify(data.conditions) : null
      ]
    );
    return (rows[0] as FallbackChainEntry) || null;
  }
}
