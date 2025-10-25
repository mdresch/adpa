-- Migration: Create iBabs Connections Table
-- Description: OAuth 2.0 token storage for iBabs integration
-- Author: Integration Agent #1
-- Date: 2025-10-25

-- ============================================
-- UP MIGRATION
-- ============================================
BEGIN;

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create ibabs_connections table for storing OAuth tokens
CREATE TABLE IF NOT EXISTS ibabs_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL, -- Base64 encoded for storage (not encrypted - for production use proper encryption)
  refresh_token TEXT NOT NULL, -- Base64 encoded for storage (not encrypted - for production use proper encryption)
  token_type VARCHAR(20) DEFAULT 'Bearer',
  expires_at TIMESTAMP NOT NULL,
  scope TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id) -- One connection per user
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ibabs_connections_user ON ibabs_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_ibabs_connections_expires ON ibabs_connections(expires_at);

-- Add table and column comments for documentation
COMMENT ON TABLE ibabs_connections IS 'OAuth 2.0 token storage for iBabs board portal integration. Stores base64-encoded access and refresh tokens with automatic expiration tracking.';
COMMENT ON COLUMN ibabs_connections.id IS 'Unique identifier for the connection record';
COMMENT ON COLUMN ibabs_connections.user_id IS 'Reference to the user who owns this iBabs connection';
COMMENT ON COLUMN ibabs_connections.access_token IS 'OAuth access token (base64 encoded for storage consistency - use proper encryption in production)';
COMMENT ON COLUMN ibabs_connections.refresh_token IS 'OAuth refresh token (base64 encoded for storage consistency - use proper encryption in production)';
COMMENT ON COLUMN ibabs_connections.token_type IS 'Token type (typically Bearer for OAuth 2.0)';
COMMENT ON COLUMN ibabs_connections.expires_at IS 'Timestamp when the access token expires';
COMMENT ON COLUMN ibabs_connections.scope IS 'OAuth scopes granted to this connection';
COMMENT ON COLUMN ibabs_connections.created_at IS 'Timestamp when the connection was created';
COMMENT ON COLUMN ibabs_connections.updated_at IS 'Timestamp when the connection was last updated';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ibabs_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_ibabs_connections_updated_at ON ibabs_connections;
CREATE TRIGGER trg_update_ibabs_connections_updated_at
BEFORE UPDATE ON ibabs_connections
FOR EACH ROW
EXECUTE FUNCTION update_ibabs_connections_updated_at();

COMMIT;

-- ============================================
-- DOWN MIGRATION
-- ============================================
BEGIN;

-- Drop trigger and function
DROP TRIGGER IF EXISTS trg_update_ibabs_connections_updated_at ON ibabs_connections;
DROP FUNCTION IF EXISTS update_ibabs_connections_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_ibabs_connections_expires;
DROP INDEX IF EXISTS idx_ibabs_connections_user;

-- Drop table
DROP TABLE IF EXISTS ibabs_connections;

COMMIT;
