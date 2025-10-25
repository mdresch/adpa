-- Create system_settings table for storing application configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  description TEXT,
  updated_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on setting_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- Insert AI Gateway default settings (if not exists)
INSERT INTO system_settings (setting_key, setting_value, is_encrypted, description)
VALUES 
  ('ai_gateway_enabled', 'false', false, 'Whether AI Gateway is enabled')
ON CONFLICT (setting_key) DO NOTHING;

-- Add comment
COMMENT ON TABLE system_settings IS 'Stores application-wide configuration settings including encrypted API keys';


