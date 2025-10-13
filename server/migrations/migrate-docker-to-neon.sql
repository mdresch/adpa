-- ADPA Database Migration Script: Docker PostgreSQL to Neon
-- This script migrates all data from Docker PostgreSQL to Neon database
-- Run this script after ensuring Neon database schema is up to date

-- =====================================================
-- PREPARATION: Ensure Neon database has proper schema
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- MIGRATION FUNCTIONS
-- =====================================================

-- Function to safely insert data with conflict resolution
CREATE OR REPLACE FUNCTION safe_insert_users(
    p_id UUID,
    p_email VARCHAR(255),
    p_password_hash VARCHAR(255),
    p_name VARCHAR(255),
    p_role VARCHAR(50),
    p_permissions JSONB,
    p_avatar_url VARCHAR(500),
    p_is_active BOOLEAN,
    p_last_login TIMESTAMP,
    p_created_at TIMESTAMP,
    p_updated_at TIMESTAMP
) RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Try to insert, if conflict on email, update existing
    INSERT INTO users (id, email, password_hash, name, role, permissions, avatar_url, is_active, last_login, created_at, updated_at)
    VALUES (p_id, p_email, p_password_hash, p_name, p_role, p_permissions, p_avatar_url, p_is_active, p_last_login, p_created_at, p_updated_at)
    ON CONFLICT (email) 
    DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        avatar_url = EXCLUDED.avatar_url,
        is_active = EXCLUDED.is_active,
        last_login = EXCLUDED.last_login,
        updated_at = EXCLUDED.updated_at
    RETURNING id INTO user_id;
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to safely insert projects
CREATE OR REPLACE FUNCTION safe_insert_projects(
    p_id UUID,
    p_name VARCHAR(255),
    p_description TEXT,
    p_framework VARCHAR(50),
    p_status VARCHAR(20),
    p_priority VARCHAR(20),
    p_start_date DATE,
    p_end_date DATE,
    p_budget DECIMAL(12,2),
    p_owner_id UUID,
    p_created_by UUID,
    p_team_members JSONB,
    p_settings JSONB,
    p_metadata JSONB,
    p_created_at TIMESTAMP,
    p_updated_at TIMESTAMP
) RETURNS UUID AS $$
DECLARE
    project_id UUID;
BEGIN
    INSERT INTO projects (id, name, description, framework, status, priority, start_date, end_date, budget, owner_id, created_by, team_members, settings, metadata, created_at, updated_at)
    VALUES (p_id, p_name, p_description, p_framework, p_status, p_priority, p_start_date, p_end_date, p_budget, p_owner_id, p_created_by, p_team_members, p_settings, p_metadata, p_created_at, p_updated_at)
    ON CONFLICT (id) 
    DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        framework = EXCLUDED.framework,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        budget = EXCLUDED.budget,
        owner_id = EXCLUDED.owner_id,
        created_by = EXCLUDED.created_by,
        team_members = EXCLUDED.team_members,
        settings = EXCLUDED.settings,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at
    RETURNING id INTO project_id;
    
    RETURN project_id;
END;
$$ LANGUAGE plpgsql;

-- Function to safely insert documents
CREATE OR REPLACE FUNCTION safe_insert_documents(
    p_id UUID,
    p_project_id UUID,
    p_name VARCHAR(255),
    p_content JSONB,
    p_template_id UUID,
    p_version INTEGER,
    p_status VARCHAR(20),
    p_file_path VARCHAR(500),
    p_file_size BIGINT,
    p_mime_type VARCHAR(100),
    p_framework VARCHAR(50),
    p_metadata JSONB,
    p_created_by UUID,
    p_updated_by UUID,
    p_created_at TIMESTAMP,
    p_updated_at TIMESTAMP
) RETURNS UUID AS $$
DECLARE
    document_id UUID;
BEGIN
    INSERT INTO documents (id, project_id, name, content, template_id, version, status, file_path, file_size, mime_type, framework, metadata, created_by, updated_by, created_at, updated_at)
    VALUES (p_id, p_project_id, p_name, p_content, p_template_id, p_version, p_status, p_file_path, p_file_size, p_mime_type, p_framework, p_metadata, p_created_by, p_updated_by, p_created_at, p_updated_at)
    ON CONFLICT (id) 
    DO UPDATE SET
        project_id = EXCLUDED.project_id,
        name = EXCLUDED.name,
        content = EXCLUDED.content,
        template_id = EXCLUDED.template_id,
        version = EXCLUDED.version,
        status = EXCLUDED.status,
        file_path = EXCLUDED.file_path,
        file_size = EXCLUDED.file_size,
        mime_type = EXCLUDED.mime_type,
        framework = EXCLUDED.framework,
        metadata = EXCLUDED.metadata,
        created_by = EXCLUDED.created_by,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at
    RETURNING id INTO document_id;
    
    RETURN document_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATA MIGRATION INSTRUCTIONS
-- =====================================================

/*
IMPORTANT: This script provides the functions and structure for migration.
To execute the actual migration, you need to:

1. First, export data from Docker PostgreSQL:
   docker exec -it adpa-postgres pg_dump -U postgres -d adpa_db --data-only --inserts > docker_data_export.sql

2. Then modify the export file to use the safe_insert functions instead of regular INSERT statements

3. Run the modified export against your Neon database

Alternatively, use the PowerShell migration script provided separately.
*/

-- =====================================================
-- CLEANUP FUNCTIONS (run after migration is complete)
-- =====================================================

-- Drop the migration functions after successful migration
-- DROP FUNCTION IF EXISTS safe_insert_users(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, JSONB, VARCHAR, BOOLEAN, TIMESTAMP, TIMESTAMP, TIMESTAMP);
-- DROP FUNCTION IF EXISTS safe_insert_projects(UUID, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, DATE, DATE, DECIMAL, UUID, UUID, JSONB, JSONB, JSONB, TIMESTAMP, TIMESTAMP);
-- DROP FUNCTION IF EXISTS safe_insert_documents(UUID, UUID, VARCHAR, JSONB, UUID, INTEGER, VARCHAR, VARCHAR, BIGINT, VARCHAR, VARCHAR, JSONB, UUID, UUID, TIMESTAMP, TIMESTAMP);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Use these queries to verify migration success:

-- SELECT COUNT(*) as users_count FROM users;
-- SELECT COUNT(*) as projects_count FROM projects;
-- SELECT COUNT(*) as documents_count FROM documents;
-- SELECT COUNT(*) as templates_count FROM templates;

-- Check for any data integrity issues:
-- SELECT 'users' as table_name, COUNT(*) as count FROM users
-- UNION ALL
-- SELECT 'projects', COUNT(*) FROM projects
-- UNION ALL
-- SELECT 'documents', COUNT(*) FROM documents
-- UNION ALL
-- SELECT 'templates', COUNT(*) FROM templates;
