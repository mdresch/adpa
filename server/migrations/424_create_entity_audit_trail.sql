-- Migration: Create entity_audit_trail table for immutable entity lineage tracking
-- Description: Enables complete audit trail with cryptographic signing for entity lifecycle
-- Up

-- Create the immutable audit trail table
CREATE TABLE IF NOT EXISTS public.entity_audit_trail (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  entity_id uuid NOT NULL REFERENCES entity_extractions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  operation_type character varying(20) NOT NULL,
  timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  changed_by character varying(255) DEFAULT 'system' NOT NULL,
  previous_version_id uuid REFERENCES entity_audit_trail(id) ON DELETE SET NULL,
  entity_snapshot jsonb NOT NULL,
  snapshot_hash character varying(64) NOT NULL,
  chain_hash character varying(64) NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  PRIMARY KEY (id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_entity_audit_entity_id ON public.entity_audit_trail(entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_audit_entity_version ON public.entity_audit_trail(entity_id, version);
CREATE INDEX IF NOT EXISTS idx_entity_audit_timestamp ON public.entity_audit_trail(timestamp);
CREATE INDEX IF NOT EXISTS idx_entity_audit_operation ON public.entity_audit_trail(operation_type);
CREATE INDEX IF NOT EXISTS idx_entity_audit_snapshot_hash ON public.entity_audit_trail(snapshot_hash);

-- Add version field to entity_extractions for current version tracking
ALTER TABLE public.entity_extractions ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;

-- Add audit metadata to entity_extractions
ALTER TABLE public.entity_extractions ADD COLUMN IF NOT EXISTS audit_chain_hash character varying(64);

-- Create function to get latest version for an entity
CREATE OR REPLACE FUNCTION get_entity_latest_version(p_entity_id uuid)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(version) FROM entity_audit_trail WHERE entity_id = p_entity_id),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- Create view for easy lineage reconstruction
CREATE OR REPLACE VIEW entity_lineage AS
SELECT 
  aat.entity_id,
  aat.version,
  aat.operation_type,
  aat.timestamp,
  aat.changed_by,
  aat.previous_version_id,
  aat.entity_snapshot,
  aat.snapshot_hash,
  aat.chain_hash,
  aat.metadata,
  ee.entity_name,
  ee.entity_type,
  ee.status as current_status,
  ee.project_id
FROM entity_audit_trail aat
JOIN entity_extractions ee ON aat.entity_id = ee.id
ORDER BY aat.entity_id, aat.version;

-- Enable ROW LEVEL SECURITY
ALTER TABLE public.entity_audit_trail ENABLE ROW LEVEL SECURITY;

-- Comment on table
COMMENT ON TABLE public.entity_audit_trail IS 'Immutable audit trail for entity lifecycle. Each change to an entity creates a new record here, preserving complete history with cryptographic verification.';

COMMENT ON COLUMN public.entity_audit_trail.snapshot_hash IS 'SHA-256 hash of the entity_snapshot JSON for tamper detection.';

COMMENT ON COLUMN public.entity_audit_trail.chain_hash IS 'SHA-256 hash of (previous_chain_hash + snapshot_hash) creating a blockchain-like chain of custody.';
