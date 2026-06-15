-- Up Migration

CREATE TABLE IF NOT EXISTS document_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  dependent_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'content',
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_dependencies_project ON document_dependencies(project_id);
CREATE INDEX IF NOT EXISTS idx_doc_dependencies_source ON document_dependencies(source_document_id);
CREATE INDEX IF NOT EXISTS idx_doc_dependencies_dependent ON document_dependencies(dependent_document_id);

-- Enforce no self-dependency at DB level
ALTER TABLE document_dependencies 
ADD CONSTRAINT chk_no_self_dependency 
CHECK (source_document_id != dependent_document_id);

-- Enforce uniqueness of dependencies (a doc can't depend on the same doc twice with same type)
ALTER TABLE document_dependencies
ADD CONSTRAINT uq_doc_dependency UNIQUE (source_document_id, dependent_document_id, dependency_type);

