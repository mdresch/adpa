-- Migration 020: Baseline Update on Change Request Approval
-- TASK-746: Baseline update upon approval
-- Implements automatic baseline updates when change requests are approved

BEGIN;

-- Create extension if not exists (for UUID generation)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add baseline update tracking columns to project_baselines
ALTER TABLE project_baselines
ADD COLUMN IF NOT EXISTS last_cr_update_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS last_cr_update_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS cr_update_count INTEGER DEFAULT 0;

-- Create table to track baseline updates from change requests
CREATE TABLE IF NOT EXISTS baseline_cr_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    baseline_id UUID NOT NULL REFERENCES project_baselines(id) ON DELETE CASCADE,
    change_request_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Update metadata
    update_type VARCHAR(50) NOT NULL CHECK (update_type IN (
        'scope_update', 'technical_update', 'timeline_update', 
        'cost_update', 'resource_update', 'success_criteria_update',
        'comprehensive_update'
    )),
    
    -- What was updated
    updated_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    previous_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    new_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Update details
    update_summary TEXT NOT NULL,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP DEFAULT NOW(),
    
    -- Version tracking
    baseline_version_before VARCHAR(20),
    baseline_version_after VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_baseline_cr_update UNIQUE (baseline_id, change_request_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_baseline_cr_updates_baseline ON baseline_cr_updates(baseline_id);
CREATE INDEX IF NOT EXISTS idx_baseline_cr_updates_cr ON baseline_cr_updates(change_request_id);
CREATE INDEX IF NOT EXISTS idx_baseline_cr_updates_approved_at ON baseline_cr_updates(approved_at DESC);
CREATE INDEX IF NOT EXISTS idx_baselines_last_cr_update ON project_baselines(last_cr_update_id);

-- Create function to extract baseline changes from change request
CREATE OR REPLACE FUNCTION extract_baseline_changes_from_cr(
    p_change_request_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_cr_metadata JSONB;
    v_major_changes JSONB;
    v_baseline_changes JSONB := '{}'::JSONB;
    v_change JSONB;
    v_entity_type TEXT;
    v_drift_type TEXT;
BEGIN
    -- Get change request metadata
    SELECT metadata INTO v_cr_metadata
    FROM documents
    WHERE id = p_change_request_id;
    
    -- Extract major changes from metadata
    v_major_changes := v_cr_metadata->'major_changes';
    
    IF v_major_changes IS NULL THEN
        RETURN v_baseline_changes;
    END IF;
    
    -- Process each major change and categorize by baseline component
    FOR v_change IN SELECT * FROM jsonb_array_elements(v_major_changes)
    LOOP
        v_entity_type := v_change->>'entityType';
        v_drift_type := v_change->>'driftType';
        
        -- Map entity types to baseline components
        CASE 
            WHEN v_entity_type IN ('scope_items', 'deliverables', 'requirements', 'constraints') THEN
                v_baseline_changes := jsonb_set(
                    v_baseline_changes,
                    '{scope_baseline}',
                    COALESCE(v_baseline_changes->'scope_baseline', '[]'::jsonb) || jsonb_build_array(v_change),
                    true
                );
            
            WHEN v_entity_type IN ('technologies', 'best_practices') THEN
                v_baseline_changes := jsonb_set(
                    v_baseline_changes,
                    '{technical_baseline}',
                    COALESCE(v_baseline_changes->'technical_baseline', '[]'::jsonb) || jsonb_build_array(v_change),
                    true
                );
            
            WHEN v_entity_type IN ('milestones', 'phases', 'activities') THEN
                v_baseline_changes := jsonb_set(
                    v_baseline_changes,
                    '{timeline_baseline}',
                    COALESCE(v_baseline_changes->'timeline_baseline', '[]'::jsonb) || jsonb_build_array(v_change),
                    true
                );
            
            WHEN v_entity_type IN ('budget', 'resources') THEN
                v_baseline_changes := jsonb_set(
                    v_baseline_changes,
                    '{cost_baseline}',
                    COALESCE(v_baseline_changes->'cost_baseline', '[]'::jsonb) || jsonb_build_array(v_change),
                    true
                );
                v_baseline_changes := jsonb_set(
                    v_baseline_changes,
                    '{resource_baseline}',
                    COALESCE(v_baseline_changes->'resource_baseline', '[]'::jsonb) || jsonb_build_array(v_change),
                    true
                );
            
            WHEN v_entity_type IN ('success_criteria', 'quality_standards') THEN
                v_baseline_changes := jsonb_set(
                    v_baseline_changes,
                    '{success_criteria}',
                    COALESCE(v_baseline_changes->'success_criteria', '[]'::jsonb) || jsonb_build_array(v_change),
                    true
                );
        END CASE;
    END LOOP;
    
    RETURN v_baseline_changes;
END;
$$ LANGUAGE plpgsql;

-- Create function to update baseline from approved change request
CREATE OR REPLACE FUNCTION update_baseline_from_cr(
    p_change_request_id UUID,
    p_approved_by UUID
) RETURNS UUID AS $$
DECLARE
    v_project_id UUID;
    v_baseline_id UUID;
    v_baseline_changes JSONB;
    v_current_baseline RECORD;
    v_new_version VARCHAR(20);
    v_update_summary TEXT;
    v_update_id UUID;
    v_updated_fields TEXT[] := ARRAY[]::TEXT[];
    v_previous_values JSONB := '{}'::JSONB;
    v_new_values JSONB := '{}'::JSONB;
BEGIN
    -- Get project ID from change request
    SELECT project_id INTO v_project_id
    FROM documents
    WHERE id = p_change_request_id;
    
    IF v_project_id IS NULL THEN
        RAISE EXCEPTION 'Change request not found or has no project: %', p_change_request_id;
    END IF;
    
    -- Get active baseline for the project
    SELECT * INTO v_current_baseline
    FROM project_baselines
    WHERE project_id = v_project_id
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_current_baseline.id IS NULL THEN
        RAISE NOTICE 'No active baseline found for project %, skipping baseline update', v_project_id;
        RETURN NULL;
    END IF;
    
    v_baseline_id := v_current_baseline.id;
    
    -- Extract baseline changes from change request
    v_baseline_changes := extract_baseline_changes_from_cr(p_change_request_id);
    
    IF jsonb_typeof(v_baseline_changes) = 'object' AND v_baseline_changes = '{}'::jsonb THEN
        RAISE NOTICE 'No baseline changes found in change request %, skipping baseline update', p_change_request_id;
        RETURN NULL;
    END IF;
    
    -- Calculate new version number (increment minor version)
    v_new_version := (
        SELECT SPLIT_PART(version, '.', 1) || '.' || 
               (CAST(SPLIT_PART(version, '.', 2) AS INTEGER) + 1)::TEXT
        FROM project_baselines
        WHERE id = v_baseline_id
    );
    
    -- Store previous values and update baseline fields
    IF v_baseline_changes ? 'scope_baseline' THEN
        v_updated_fields := array_append(v_updated_fields, 'scope_baseline');
        v_previous_values := jsonb_set(v_previous_values, '{scope_baseline}', v_current_baseline.scope_baseline);
        v_new_values := jsonb_set(v_new_values, '{scope_baseline}', 
            COALESCE(v_current_baseline.scope_baseline, '{}'::jsonb) || v_baseline_changes->'scope_baseline'
        );
        
        UPDATE project_baselines
        SET scope_baseline = COALESCE(scope_baseline, '{}'::jsonb) || v_baseline_changes->'scope_baseline'
        WHERE id = v_baseline_id;
    END IF;
    
    IF v_baseline_changes ? 'technical_baseline' THEN
        v_updated_fields := array_append(v_updated_fields, 'technical_baseline');
        v_previous_values := jsonb_set(v_previous_values, '{technical_baseline}', v_current_baseline.technical_baseline);
        v_new_values := jsonb_set(v_new_values, '{technical_baseline}',
            COALESCE(v_current_baseline.technical_baseline, '{}'::jsonb) || v_baseline_changes->'technical_baseline'
        );
        
        UPDATE project_baselines
        SET technical_baseline = COALESCE(technical_baseline, '{}'::jsonb) || v_baseline_changes->'technical_baseline'
        WHERE id = v_baseline_id;
    END IF;
    
    IF v_baseline_changes ? 'timeline_baseline' THEN
        v_updated_fields := array_append(v_updated_fields, 'timeline_baseline');
        v_previous_values := jsonb_set(v_previous_values, '{timeline_baseline}', v_current_baseline.timeline_baseline);
        v_new_values := jsonb_set(v_new_values, '{timeline_baseline}',
            COALESCE(v_current_baseline.timeline_baseline, '{}'::jsonb) || v_baseline_changes->'timeline_baseline'
        );
        
        UPDATE project_baselines
        SET timeline_baseline = COALESCE(timeline_baseline, '{}'::jsonb) || v_baseline_changes->'timeline_baseline'
        WHERE id = v_baseline_id;
    END IF;
    
    IF v_baseline_changes ? 'cost_baseline' THEN
        v_updated_fields := array_append(v_updated_fields, 'cost_baseline');
        v_previous_values := jsonb_set(v_previous_values, '{cost_baseline}', v_current_baseline.cost_baseline);
        v_new_values := jsonb_set(v_new_values, '{cost_baseline}',
            COALESCE(v_current_baseline.cost_baseline, '{}'::jsonb) || v_baseline_changes->'cost_baseline'
        );
        
        UPDATE project_baselines
        SET cost_baseline = COALESCE(cost_baseline, '{}'::jsonb) || v_baseline_changes->'cost_baseline'
        WHERE id = v_baseline_id;
    END IF;
    
    IF v_baseline_changes ? 'resource_baseline' THEN
        v_updated_fields := array_append(v_updated_fields, 'resource_baseline');
        v_previous_values := jsonb_set(v_previous_values, '{resource_baseline}', v_current_baseline.resource_baseline);
        v_new_values := jsonb_set(v_new_values, '{resource_baseline}',
            COALESCE(v_current_baseline.resource_baseline, '{}'::jsonb) || v_baseline_changes->'resource_baseline'
        );
        
        UPDATE project_baselines
        SET resource_baseline = COALESCE(resource_baseline, '{}'::jsonb) || v_baseline_changes->'resource_baseline'
        WHERE id = v_baseline_id;
    END IF;
    
    IF v_baseline_changes ? 'success_criteria' THEN
        v_updated_fields := array_append(v_updated_fields, 'success_criteria');
        v_previous_values := jsonb_set(v_previous_values, '{success_criteria}', v_current_baseline.success_criteria);
        v_new_values := jsonb_set(v_new_values, '{success_criteria}',
            COALESCE(v_current_baseline.success_criteria, '{}'::jsonb) || v_baseline_changes->'success_criteria'
        );
        
        UPDATE project_baselines
        SET success_criteria = COALESCE(success_criteria, '{}'::jsonb) || v_baseline_changes->'success_criteria'
        WHERE id = v_baseline_id;
    END IF;
    
    -- Update baseline metadata
    UPDATE project_baselines
    SET 
        version = v_new_version,
        last_cr_update_id = p_change_request_id,
        last_cr_update_date = NOW(),
        cr_update_count = COALESCE(cr_update_count, 0) + 1
    WHERE id = v_baseline_id;
    
    -- Create baseline version record
    INSERT INTO baseline_versions (
        baseline_id,
        version_number,
        change_type,
        change_description,
        changed_by,
        changes_summary
    ) VALUES (
        v_baseline_id,
        v_new_version,
        'updated',
        'Baseline updated from approved change request',
        p_approved_by,
        v_baseline_changes
    );
    
    -- Build update summary
    v_update_summary := 'Baseline updated with ' || array_length(v_updated_fields, 1)::TEXT || 
                       ' component(s): ' || array_to_string(v_updated_fields, ', ');
    
    -- Create baseline CR update record
    INSERT INTO baseline_cr_updates (
        baseline_id,
        change_request_id,
        update_type,
        updated_fields,
        previous_values,
        new_values,
        update_summary,
        approved_by,
        baseline_version_before,
        baseline_version_after
    ) VALUES (
        v_baseline_id,
        p_change_request_id,
        CASE 
            WHEN array_length(v_updated_fields, 1) > 2 THEN 'comprehensive_update'
            WHEN 'scope_baseline' = ANY(v_updated_fields) THEN 'scope_update'
            WHEN 'technical_baseline' = ANY(v_updated_fields) THEN 'technical_update'
            WHEN 'timeline_baseline' = ANY(v_updated_fields) THEN 'timeline_update'
            WHEN 'cost_baseline' = ANY(v_updated_fields) THEN 'cost_update'
            WHEN 'resource_baseline' = ANY(v_updated_fields) THEN 'resource_update'
            ELSE 'success_criteria_update'
        END,
        jsonb_build_object('fields', v_updated_fields),
        v_previous_values,
        v_new_values,
        v_update_summary,
        p_approved_by,
        v_current_baseline.version,
        v_new_version
    ) RETURNING id INTO v_update_id;
    
    RAISE NOTICE 'Baseline % updated to version % from CR %', v_baseline_id, v_new_version, p_change_request_id;
    
    RETURN v_update_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to automatically update baseline when CR is approved
CREATE OR REPLACE FUNCTION trigger_baseline_update_on_cr_approval() RETURNS TRIGGER AS $$
DECLARE
    v_is_drift_cr BOOLEAN;
    v_update_id UUID;
BEGIN
    -- Only trigger when CR status changes to 'approved'
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- Check if this is a drift resolution change request
        v_is_drift_cr := (
            NEW.type = 'change_request' AND 
            NEW.metadata IS NOT NULL AND
            (NEW.metadata->>'change_request_type' = 'drift_resolution' OR
             NEW.metadata->>'created_from' = 'automatic_drift_resolution')
        );
        
        IF v_is_drift_cr THEN
            -- Update baseline from this change request
            BEGIN
                v_update_id := update_baseline_from_cr(NEW.id, NEW.updated_by);
                
                IF v_update_id IS NOT NULL THEN
                    RAISE NOTICE 'Baseline updated from approved CR %: update ID %', NEW.id, v_update_id;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Error updating baseline from CR %: %', NEW.id, SQLERRM;
                -- Don't fail the CR approval if baseline update fails
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on documents table for change request approvals
DROP TRIGGER IF EXISTS trigger_update_baseline_on_cr_approval ON documents;
CREATE TRIGGER trigger_update_baseline_on_cr_approval
    AFTER UPDATE OF status ON documents
    FOR EACH ROW
    WHEN (NEW.type = 'change_request')
    EXECUTE FUNCTION trigger_baseline_update_on_cr_approval();

-- Add comments
COMMENT ON TABLE baseline_cr_updates IS 'Tracks baseline updates triggered by approved change requests (TASK-746)';
COMMENT ON COLUMN project_baselines.last_cr_update_id IS 'Last change request that updated this baseline';
COMMENT ON COLUMN project_baselines.last_cr_update_date IS 'Date of last baseline update from a change request';
COMMENT ON COLUMN project_baselines.cr_update_count IS 'Number of times this baseline has been updated via change requests';

COMMENT ON FUNCTION extract_baseline_changes_from_cr IS 'Extracts baseline changes from a change request metadata';
COMMENT ON FUNCTION update_baseline_from_cr IS 'Updates project baseline with changes from an approved change request';
COMMENT ON FUNCTION trigger_baseline_update_on_cr_approval IS 'Trigger function to automatically update baseline when CR is approved';

COMMIT;
