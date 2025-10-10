-- Migration: Add Markdown Content Support
-- Description: Ensures documents are stored with markdown content and adds format conversion metadata

-- Add markdown_content column to documents table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'markdown_content'
    ) THEN
        ALTER TABLE documents ADD COLUMN markdown_content TEXT;
    END IF;
END $$;

-- Add format_metadata column to store format conversion settings
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'format_metadata'
    ) THEN
        ALTER TABLE documents ADD COLUMN format_metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add output_formats column to store available formats
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'output_formats'
    ) THEN
        ALTER TABLE documents ADD COLUMN output_formats JSONB DEFAULT '[]';
    END IF;
END $$;

-- Create index on markdown_content for full-text search
CREATE INDEX IF NOT EXISTS idx_documents_markdown_content_fts 
ON documents USING gin(to_tsvector('english', markdown_content));

-- Create index on format_metadata
CREATE INDEX IF NOT EXISTS idx_documents_format_metadata 
ON documents USING gin(format_metadata);

-- Create index on output_formats
CREATE INDEX IF NOT EXISTS idx_documents_output_formats 
ON documents USING gin(output_formats);

-- Create function to extract markdown content from existing documents
CREATE OR REPLACE FUNCTION extract_markdown_from_content()
RETURNS void AS $$
DECLARE
    doc_record RECORD;
    markdown_text TEXT;
BEGIN
    -- Process documents that have content but no markdown_content
    FOR doc_record IN 
        SELECT id, content 
        FROM documents 
        WHERE content IS NOT NULL 
        AND (markdown_content IS NULL OR markdown_content = '')
    LOOP
        -- Initialize markdown content
        markdown_text := '';
        
        -- Extract text from JSONB content structure
        IF doc_record.content ? 'sections' THEN
            -- Handle structured content with sections
            SELECT string_agg(
                CASE 
                    WHEN section_data->>'title' IS NOT NULL THEN 
                        '## ' || (section_data->>'title') || E'\n\n' || COALESCE(section_data->>'content', '')
                    ELSE 
                        COALESCE(section_data->>'content', '')
                END, 
                E'\n\n'
            ) INTO markdown_text
            FROM jsonb_array_elements(doc_record.content->'sections') AS section_data;
            
        ELSIF doc_record.content ? 'text' THEN
            -- Handle simple text content
            markdown_text := doc_record.content->>'text';
            
        ELSIF doc_record.content ? 'markdown' THEN
            -- Handle existing markdown content
            markdown_text := doc_record.content->>'markdown';
            
        ELSE
            -- Handle other content structures
            markdown_text := doc_record.content::text;
        END IF;
        
        -- Update the document with extracted markdown
        IF markdown_text IS NOT NULL AND length(trim(markdown_text)) > 0 THEN
            UPDATE documents 
            SET markdown_content = markdown_text,
                format_metadata = jsonb_build_object(
                    'source', 'content_extraction',
                    'extracted_at', now(),
                    'original_format', 'jsonb'
                )
            WHERE id = doc_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Markdown extraction completed for existing documents';
END;
$$ LANGUAGE plpgsql;

-- Create function to convert document content to markdown format
CREATE OR REPLACE FUNCTION ensure_markdown_content()
RETURNS TRIGGER AS $$
BEGIN
    -- If markdown_content is not provided but content exists, try to extract it
    IF NEW.markdown_content IS NULL OR NEW.markdown_content = '' THEN
        IF NEW.content IS NOT NULL THEN
            -- Extract markdown from content structure
            IF NEW.content ? 'sections' THEN
                SELECT string_agg(
                    CASE 
                        WHEN section_data->>'title' IS NOT NULL THEN 
                            '## ' || (section_data->>'title') || E'\n\n' || COALESCE(section_data->>'content', '')
                        ELSE 
                            COALESCE(section_data->>'content', '')
                    END, 
                    E'\n\n'
                ) INTO NEW.markdown_content
                FROM jsonb_array_elements(NEW.content->'sections') AS section_data;
                
            ELSIF NEW.content ? 'text' THEN
                NEW.markdown_content := NEW.content->>'text';
                
            ELSIF NEW.content ? 'markdown' THEN
                NEW.markdown_content := NEW.content->>'markdown';
            END IF;
        END IF;
    END IF;
    
    -- Set default format metadata if not provided
    IF NEW.format_metadata IS NULL OR NEW.format_metadata = '{}' THEN
        NEW.format_metadata := jsonb_build_object(
            'primary_format', 'markdown',
            'created_at', now(),
            'supports_conversion', true
        );
    END IF;
    
    -- Set default output formats if not provided
    IF NEW.output_formats IS NULL OR NEW.output_formats = '[]' THEN
        NEW.output_formats := '["markdown", "html", "pdf", "docx"]'::jsonb;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure markdown content on insert/update
DROP TRIGGER IF EXISTS ensure_markdown_content_trigger ON documents;
CREATE TRIGGER ensure_markdown_content_trigger
    BEFORE INSERT OR UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION ensure_markdown_content();

-- Run the extraction function for existing documents
SELECT extract_markdown_from_content();

-- Create view for documents with format information
CREATE OR REPLACE VIEW documents_with_formats AS
SELECT 
    d.*,
    CASE 
        WHEN d.markdown_content IS NOT NULL AND length(trim(d.markdown_content)) > 0 
        THEN true 
        ELSE false 
    END as has_markdown_content,
    CASE 
        WHEN d.output_formats IS NOT NULL 
        THEN jsonb_array_length(d.output_formats) 
        ELSE 0 
    END as available_formats_count,
    CASE 
        WHEN d.markdown_content IS NOT NULL 
        THEN length(d.markdown_content) 
        ELSE 0 
    END as markdown_content_length
FROM documents d;

-- Add comments for documentation
COMMENT ON COLUMN documents.markdown_content IS 'Primary content stored in Markdown format for multi-format conversion';
COMMENT ON COLUMN documents.format_metadata IS 'Metadata about format conversion settings and capabilities';
COMMENT ON COLUMN documents.output_formats IS 'Array of supported output formats for this document';
COMMENT ON FUNCTION ensure_markdown_content() IS 'Trigger function to ensure documents have markdown content';
COMMENT ON VIEW documents_with_formats IS 'View providing documents with format conversion information';

-- Grant permissions (adjust as needed for your security model)
-- GRANT SELECT ON documents_with_formats TO your_app_role;
-- GRANT EXECUTE ON FUNCTION extract_markdown_from_content() TO your_app_role;