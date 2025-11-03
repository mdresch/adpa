-- Migration: 310_create_quality_audits.sql
-- Description: Create quality_audits table for automated document quality assessment
-- Author: ADPA Development Team
-- Date: 2025-11-03
-- Related: Quality Control Gate Architecture

-- =======================
-- Quality Audits Table
-- =======================

CREATE TABLE IF NOT EXISTS quality_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  audit_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  
  -- Overall Metrics
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  overall_grade VARCHAR(2) NOT NULL CHECK (overall_grade IN ('A', 'B', 'C', 'D', 'F')),
  quality_level VARCHAR(20) NOT NULL CHECK (quality_level IN ('Excellent', 'Good', 'Acceptable', 'Below Standard', 'Unsatisfactory')),
  
  -- Dimensional Scores (0-100)
  completeness_score INTEGER NOT NULL CHECK (completeness_score >= 0 AND completeness_score <= 100),
  consistency_score INTEGER NOT NULL CHECK (consistency_score >= 0 AND consistency_score <= 100),
  professional_quality_score INTEGER NOT NULL CHECK (professional_quality_score >= 0 AND professional_quality_score <= 100),
  standards_compliance_score INTEGER NOT NULL CHECK (standards_compliance_score >= 0 AND standards_compliance_score <= 100),
  accuracy_score INTEGER NOT NULL CHECK (accuracy_score >= 0 AND accuracy_score <= 100),
  context_relevance_score INTEGER NOT NULL CHECK (context_relevance_score >= 0 AND context_relevance_score <= 100),
  
  -- Detailed Findings (JSONB for flexible structure)
  findings JSONB NOT NULL DEFAULT '{}',
  issues JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  
  -- AI Analysis Metadata
  ai_provider VARCHAR(50),
  ai_model VARCHAR(100),
  analysis_tokens INTEGER,
  analysis_cost DECIMAL(10, 6),
  analysis_time INTEGER, -- milliseconds
  
  -- Audit Metadata
  audited_at TIMESTAMP DEFAULT NOW(),
  audited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =======================
-- Indexes for Performance
-- =======================

-- Primary lookup: Get audit for a specific document
CREATE INDEX idx_quality_audits_document ON quality_audits(document_id);

-- Filter by quality grade
CREATE INDEX idx_quality_audits_grade ON quality_audits(overall_grade);

-- Filter by quality score range
CREATE INDEX idx_quality_audits_score ON quality_audits(overall_score DESC);

-- Time-based queries (recent audits, trends)
CREATE INDEX idx_quality_audits_date ON quality_audits(audited_at DESC);

-- Filter by AI provider (for provider comparison)
CREATE INDEX idx_quality_audits_provider ON quality_audits(ai_provider);

-- Composite index for template quality analysis
CREATE INDEX idx_quality_audits_document_date ON quality_audits(document_id, audited_at DESC);

-- =======================
-- Update documents table to include quality status
-- =======================

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS quality_audit_id UUID REFERENCES quality_audits(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS quality_status VARCHAR(20) CHECK (quality_status IN ('pending', 'passed', 'warning', 'failed', 'not_audited')),
ADD COLUMN IF NOT EXISTS quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100);

-- Index for filtering documents by quality status
CREATE INDEX IF NOT EXISTS idx_documents_quality_status ON documents(quality_status);

-- Index for sorting documents by quality score
CREATE INDEX IF NOT EXISTS idx_documents_quality_score ON documents(quality_score DESC);

-- Composite index for quality dashboard queries
CREATE INDEX IF NOT EXISTS idx_documents_quality_composite ON documents(quality_status, quality_score DESC);

-- =======================
-- Comments for Documentation
-- =======================

COMMENT ON TABLE quality_audits IS 'Automated quality assessment results for AI-generated documents';
COMMENT ON COLUMN quality_audits.overall_score IS 'Weighted average score across all dimensions (0-100)';
COMMENT ON COLUMN quality_audits.overall_grade IS 'Letter grade: A (90-100%), B (80-89%), C (70-79%), D (60-69%), F (<60%)';
COMMENT ON COLUMN quality_audits.quality_level IS 'Human-readable quality level based on overall score';
COMMENT ON COLUMN quality_audits.completeness_score IS 'Score for completeness dimension (0-100): All sections present, no placeholders';
COMMENT ON COLUMN quality_audits.consistency_score IS 'Score for consistency dimension (0-100): Names, dates, terminology consistent';
COMMENT ON COLUMN quality_audits.professional_quality_score IS 'Score for professional quality dimension (0-100): Writing quality, tone, formatting';
COMMENT ON COLUMN quality_audits.standards_compliance_score IS 'Score for standards compliance dimension (0-100): PMBOK/BABOK principles applied';
COMMENT ON COLUMN quality_audits.accuracy_score IS 'Score for accuracy dimension (0-100): Data correctly extracted, no hallucinations';
COMMENT ON COLUMN quality_audits.context_relevance_score IS 'Score for context relevance dimension (0-100): Content aligns with objectives';
COMMENT ON COLUMN quality_audits.findings IS 'JSONB object with detailed findings per dimension';
COMMENT ON COLUMN quality_audits.issues IS 'JSONB array of identified issues with severity, description, location, recommendation';
COMMENT ON COLUMN quality_audits.recommendations IS 'JSONB array of actionable improvement recommendations';
COMMENT ON COLUMN quality_audits.ai_provider IS 'AI provider used for quality analysis (e.g., google, openai)';
COMMENT ON COLUMN quality_audits.ai_model IS 'Specific AI model used (e.g., gemini-2.5-flash)';
COMMENT ON COLUMN quality_audits.analysis_tokens IS 'Total tokens used for quality analysis';
COMMENT ON COLUMN quality_audits.analysis_cost IS 'Cost of quality analysis in USD';
COMMENT ON COLUMN quality_audits.analysis_time IS 'Time taken for analysis in milliseconds';

COMMENT ON COLUMN documents.quality_audit_id IS 'Reference to the most recent quality audit for this document';
COMMENT ON COLUMN documents.quality_status IS 'Quick status: passed (>=85%), warning (70-84%), failed (<70%), pending, not_audited';
COMMENT ON COLUMN documents.quality_score IS 'Cached overall quality score for fast filtering and sorting';

-- =======================
-- Trigger to update updated_at timestamp
-- =======================

CREATE OR REPLACE FUNCTION update_quality_audits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quality_audits_updated_at
  BEFORE UPDATE ON quality_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_quality_audits_updated_at();

-- =======================
-- Sample Query Examples (for testing)
-- =======================

-- Get audit for a specific document
-- SELECT * FROM quality_audits WHERE document_id = 'document-uuid' ORDER BY audited_at DESC LIMIT 1;

-- Get all documents with quality issues (score < 85%)
-- SELECT d.id, d.title, d.quality_score, d.quality_status, qa.overall_grade
-- FROM documents d
-- JOIN quality_audits qa ON d.quality_audit_id = qa.id
-- WHERE d.quality_score < 85
-- ORDER BY d.quality_score ASC;

-- Get average quality by AI provider
-- SELECT ai_provider, COUNT(*) as audit_count, AVG(overall_score) as avg_quality
-- FROM quality_audits
-- WHERE audited_at > NOW() - INTERVAL '30 days'
-- GROUP BY ai_provider
-- ORDER BY avg_quality DESC;

-- Get common issues across all audits
-- SELECT 
--   issue->>'dimension' as dimension,
--   issue->>'description' as description,
--   COUNT(*) as frequency
-- FROM quality_audits, jsonb_array_elements(issues) as issue
-- WHERE audited_at > NOW() - INTERVAL '30 days'
-- GROUP BY dimension, description
-- ORDER BY frequency DESC;

