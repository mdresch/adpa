-- AI Model Configuration and Fallback Chains

-- Model-level configuration table
CREATE TABLE IF NOT EXISTS ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- e.g., "gpt-4", "llama3.2", "gemini-pro"
  display_name VARCHAR(200), -- e.g., "GPT-4 Turbo"
  description TEXT,
  context_length INTEGER,
  capabilities JSONB DEFAULT '[]', -- ["chat", "completion", "embedding", "vision"]
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0, -- Higher = preferred
  cost_per_1k_input_tokens DECIMAL(10,6),
  cost_per_1k_output_tokens DECIMAL(10,6),
  settings JSONB DEFAULT '{}', -- Provider-specific settings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, name)
);

-- Fallback chain configuration
CREATE TABLE IF NOT EXISTS ai_fallback_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL, -- e.g., "document-extraction", "chat", "code-generation"
  description TEXT,
  task_type VARCHAR(50) NOT NULL, -- "extraction", "chat", "completion", "embedding"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fallback chain entries (ordered)
CREATE TABLE IF NOT EXISTS ai_fallback_chain_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id UUID NOT NULL REFERENCES ai_fallback_chains(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL, -- 1 = first attempt, 2 = fallback, etc.
  timeout_ms INTEGER DEFAULT 30000,
  retry_attempts INTEGER DEFAULT 1,
  conditions JSONB DEFAULT '{}', -- e.g., {"max_cost": 0.01, "min_quality": 0.8}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User/Project model preferences
CREATE TABLE IF NOT EXISTS user_model_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_type VARCHAR(50) NOT NULL,
  preferred_model_id UUID REFERENCES ai_models(id),
  preferred_chain_id UUID REFERENCES ai_fallback_chains(id),
  custom_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, task_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_active ON ai_models(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_fallback_chains_task ON ai_fallback_chains(task_type);
CREATE INDEX IF NOT EXISTS idx_ai_fallback_chain_entries_chain ON ai_fallback_chain_entries(chain_id);
CREATE INDEX IF NOT EXISTS idx_user_model_preferences_user ON user_model_preferences(user_id);
