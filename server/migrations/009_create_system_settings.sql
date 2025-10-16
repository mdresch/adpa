-- Migration: Create system_settings table for storing application-wide configuration
-- This table stores encrypted sensitive settings like API keys and master encryption keys
-- Created: 2024-01-15

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

-- Create trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Create trigger to automatically update updated_at on every UPDATE
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE system_settings IS 'Stores application-wide configuration and settings including encrypted API keys';
COMMENT ON COLUMN system_settings.setting_key IS 'Unique identifier for the setting';
COMMENT ON COLUMN system_settings.setting_value IS 'The setting value (may be encrypted)';
COMMENT ON COLUMN system_settings.is_encrypted IS 'Whether the setting_value is encrypted';
COMMENT ON COLUMN system_settings.description IS 'Human-readable description of the setting';
COMMENT ON COLUMN system_settings.updated_by IS 'User ID or system identifier that last updated this setting';
COMMENT ON COLUMN system_settings.updated_at IS 'Automatically updated timestamp (managed by trigger)';

