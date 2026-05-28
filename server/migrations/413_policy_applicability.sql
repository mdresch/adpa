-- SC-29: Applicability Scoping for Autonomous Policy Library
-- Adds target_document_types and domain_tags arrays to selectively enforce policies

ALTER TABLE policy_library
ADD COLUMN IF NOT EXISTS target_document_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS domain_tags TEXT[] DEFAULT '{}';

COMMENT ON COLUMN policy_library.target_document_types IS 'Array of document types (e.g. Technical Spec, Project Charter) this policy applies to. Empty means it applies to all.';
COMMENT ON COLUMN policy_library.domain_tags IS 'Array of domains (e.g. Security, Architecture, UX) this policy applies to.';
