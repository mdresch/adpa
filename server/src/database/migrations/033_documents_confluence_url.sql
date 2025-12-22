-- Migration: Add confluence_page_url to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS confluence_page_url TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_confluence_page_url ON documents(confluence_page_url);
