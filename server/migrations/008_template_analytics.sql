-- Template Analytics and Version Control
-- Tracks template versions, quality metrics, and usage analytics

-- ============================================
-- TEMPLATE VERSION HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template Reference
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    
    -- Version Info
    version_number VARCHAR(50) NOT NULL, -- e.g., "1.0.0", "2.1.3"
    version_tag VARCHAR(100), -- e.g., "stable", "beta", "deprecated"
    
    -- Content Snapshot
    content JSONB NOT NULL,
    variables JSONB,
    system_prompt TEXT,
    template_paragraphs JSONB,
    context_injection_config JSONB,
    
    -- Metadata Snapshot
    name VARCHAR(255) NOT NULL,
    description TEXT,
    framework VARCHAR(100),
    category VARCHAR(100),
    
    -- Change Information
    change_type VARCHAR(50) NOT NULL, -- created, updated, republished, deprecated
    change_summary TEXT,
    change_details JSONB, -- What changed specifically
    breaking_changes BOOLEAN DEFAULT false,
    
    -- Content Metrics (at this version)
    content_length INTEGER,
    variable_count INTEGER,
    paragraph_count INTEGER,
    complexity_score DECIMAL(5, 2), -- 0-100
    
    -- Authorship
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE,
    deprecated_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    CONSTRAINT unique_template_version UNIQUE(template_id, version_number)
);

CREATE INDEX idx_template_versions_template ON template_versions(template_id, created_at DESC);
CREATE INDEX idx_template_versions_created ON template_versions(created_at DESC);
CREATE INDEX idx_template_versions_tag ON template_versions(version_tag);

-- ============================================
-- TEMPLATE QUALITY METRICS
-- ============================================

CREATE TABLE IF NOT EXISTS template_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template Reference
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    
    -- Usage Statistics
    total_uses INTEGER DEFAULT 0,
    successful_uses INTEGER DEFAULT 0,
    failed_uses INTEGER DEFAULT 0,
    success_rate DECIMAL(5, 2), -- Percentage
    
    -- Document Quality Metrics
    avg_document_word_count INTEGER,
    avg_document_character_count INTEGER,
    avg_generation_time_ms INTEGER,
    
    -- User Engagement
    unique_users INTEGER DEFAULT 0,
    avg_edits_per_document DECIMAL(5, 2),
    avg_time_to_first_edit_minutes INTEGER,
    
    -- Ratings & Feedback
    avg_rating DECIMAL(3, 2), -- 0-5 scale
    total_ratings INTEGER DEFAULT 0,
    total_feedback_comments INTEGER DEFAULT 0,
    
    -- AI Performance
    avg_input_tokens INTEGER,
    avg_output_tokens INTEGER,
    avg_total_tokens INTEGER,
    avg_ai_cost DECIMAL(10, 4),
    total_ai_cost DECIMAL(10, 2),
    
    -- Quality Indicators
    error_rate DECIMAL(5, 2), -- Percentage of failures
    avg_completion_rate DECIMAL(5, 2), -- How often documents are completed
    reuse_rate DECIMAL(5, 2), -- Documents created from existing
    
    -- Maintenance Indicators
    last_used_at TIMESTAMP WITH TIME ZONE,
    days_since_last_use INTEGER,
    days_since_last_update INTEGER,
    maintenance_priority VARCHAR(20), -- low, medium, high, critical
    
    -- Time Periods
    period_type VARCHAR(20) DEFAULT 'all_time', -- all_time, monthly, weekly
    period_start DATE,
    period_end DATE,
    
    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(template_id, period_type, period_start)
);

CREATE INDEX idx_template_quality_template ON template_quality_metrics(template_id);
CREATE INDEX idx_template_quality_period ON template_quality_metrics(period_type, period_start DESC);
CREATE INDEX idx_template_quality_priority ON template_quality_metrics(maintenance_priority);
CREATE INDEX idx_template_quality_success_rate ON template_quality_metrics(success_rate DESC);

-- ============================================
-- TEMPLATE USAGE ANALYTICS (Enhanced)
-- ============================================

-- Note: template_usage table already exists, adding indexes and views
CREATE INDEX IF NOT EXISTS idx_template_usage_template_time ON template_usage(template_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_template_usage_user ON template_usage(user_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_template_usage_project ON template_usage(project_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_template_usage_success ON template_usage(success, used_at DESC);

-- ============================================
-- TEMPLATE COMPARISON METRICS
-- ============================================

CREATE TABLE IF NOT EXISTS template_comparison_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Comparison Setup
    template_id_a UUID REFERENCES templates(id) ON DELETE CASCADE,
    template_id_b UUID REFERENCES templates(id) ON DELETE CASCADE,
    comparison_type VARCHAR(50) NOT NULL, -- performance, quality, usage, cost
    
    -- Metrics Comparison
    metric_name VARCHAR(100) NOT NULL,
    value_a DECIMAL(15, 4),
    value_b DECIMAL(15, 4),
    difference DECIMAL(15, 4),
    percent_difference DECIMAL(7, 2),
    winner VARCHAR(1), -- 'a', 'b', or 'tie'
    
    -- Statistical Significance
    sample_size_a INTEGER,
    sample_size_b INTEGER,
    confidence_level DECIMAL(5, 2), -- e.g., 95.00 for 95%
    is_significant BOOLEAN DEFAULT false,
    
    -- Context
    comparison_period_start DATE,
    comparison_period_end DATE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(template_id_a, template_id_b, metric_name, comparison_period_start)
);

CREATE INDEX idx_template_comparison_a ON template_comparison_metrics(template_id_a);
CREATE INDEX idx_template_comparison_b ON template_comparison_metrics(template_id_b);
CREATE INDEX idx_template_comparison_type ON template_comparison_metrics(comparison_type);

-- ============================================
-- TEMPLATE MAINTENANCE LOG
-- ============================================

CREATE TABLE IF NOT EXISTS template_maintenance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template Reference
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    
    -- Maintenance Action
    action_type VARCHAR(50) NOT NULL, -- review, update, deprecate, restore, archive
    action_status VARCHAR(20) NOT NULL, -- pending, in_progress, completed, cancelled
    priority VARCHAR(20) NOT NULL, -- low, medium, high, critical
    
    -- Details
    reason TEXT, -- Why maintenance is needed
    description TEXT, -- What was done
    findings JSONB, -- Issues found during maintenance
    changes_made JSONB, -- Changes implemented
    
    -- Assignment
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Schedule
    scheduled_for TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metrics Before/After
    metrics_before JSONB,
    metrics_after JSONB,
    improvement_percentage DECIMAL(7, 2),
    
    -- Version Created
    version_created UUID REFERENCES template_versions(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maintenance_template ON template_maintenance_log(template_id, created_at DESC);
CREATE INDEX idx_maintenance_status ON template_maintenance_log(action_status);
CREATE INDEX idx_maintenance_priority ON template_maintenance_log(priority);
CREATE INDEX idx_maintenance_assigned ON template_maintenance_log(assigned_to);

-- ============================================
-- MATERIALIZED VIEWS FOR TEMPLATE ANALYTICS
-- ============================================

-- Template Performance Summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_template_performance AS
SELECT 
    t.id as template_id,
    t.name as template_name,
    t.framework,
    t.category,
    t.is_public,
    COUNT(DISTINCT tu.id) as total_uses,
    COUNT(DISTINCT CASE WHEN tu.success THEN tu.id END) as successful_uses,
    ROUND(COUNT(DISTINCT CASE WHEN tu.success THEN tu.id END)::DECIMAL / NULLIF(COUNT(DISTINCT tu.id), 0) * 100, 2) as success_rate,
    COUNT(DISTINCT tu.user_id) as unique_users,
    ROUND(AVG(tu.word_count), 0) as avg_word_count,
    MAX(tu.used_at) as last_used_at,
    EXTRACT(DAY FROM (NOW() - MAX(tu.used_at)))::INTEGER as days_since_last_use,
    t.usage_count as official_usage_count
FROM templates t
LEFT JOIN template_usage tu ON t.id = tu.template_id
WHERE t.deleted_at IS NULL
GROUP BY t.id, t.name, t.framework, t.category, t.is_public, t.usage_count
ORDER BY total_uses DESC;

CREATE UNIQUE INDEX idx_mv_template_perf ON mv_template_performance(template_id);

-- Template Trends (Last 30 Days)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_template_trends AS
SELECT 
    t.id as template_id,
    t.name as template_name,
    DATE(tu.used_at) as usage_date,
    COUNT(*) as daily_uses,
    COUNT(DISTINCT tu.user_id) as daily_unique_users,
    ROUND(AVG(tu.word_count), 0) as daily_avg_word_count
FROM templates t
INNER JOIN template_usage tu ON t.id = tu.template_id
WHERE tu.used_at >= CURRENT_DATE - INTERVAL '30 days'
  AND t.deleted_at IS NULL
GROUP BY t.id, t.name, DATE(tu.used_at)
ORDER BY usage_date DESC, daily_uses DESC;

CREATE INDEX idx_mv_template_trends_template ON mv_template_trends(template_id, usage_date DESC);
CREATE INDEX idx_mv_template_trends_date ON mv_template_trends(usage_date DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Create a new template version
CREATE OR REPLACE FUNCTION create_template_version(
    p_template_id UUID,
    p_version_number VARCHAR(50),
    p_change_type VARCHAR(50),
    p_change_summary TEXT,
    p_user_id UUID
) RETURNS UUID AS $$
DECLARE
    v_version_id UUID;
    v_template RECORD;
BEGIN
    -- Get current template data
    SELECT * INTO v_template FROM templates WHERE id = p_template_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found';
    END IF;
    
    -- Create version record
    INSERT INTO template_versions (
        template_id, version_number, version_tag, content, variables,
        system_prompt, template_paragraphs, context_injection_config,
        name, description, framework, category,
        change_type, change_summary, created_by,
        content_length, variable_count
    )
    VALUES (
        p_template_id, p_version_number, 'stable', v_template.content, v_template.variables,
        v_template.system_prompt, v_template.template_paragraphs, v_template.context_injection_config,
        v_template.name, v_template.description, v_template.framework, v_template.category,
        p_change_type, p_change_summary, p_user_id,
        LENGTH(v_template.content::TEXT), 
        COALESCE(jsonb_array_length(v_template.variables), 0)
    )
    RETURNING id INTO v_version_id;
    
    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- Calculate template quality metrics
CREATE OR REPLACE FUNCTION calculate_template_quality_metrics(
    p_template_id UUID,
    p_period_type VARCHAR(20) DEFAULT 'all_time',
    p_period_start DATE DEFAULT NULL,
    p_period_end DATE DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_metrics RECORD;
BEGIN
    -- Calculate metrics from template_usage and other tables
    SELECT 
        COUNT(*) as total_uses,
        COUNT(*) FILTER (WHERE success = true) as successful_uses,
        COUNT(*) FILTER (WHERE success = false) as failed_uses,
        ROUND(COUNT(*) FILTER (WHERE success = true)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 2) as success_rate,
        COUNT(DISTINCT user_id) as unique_users,
        ROUND(AVG(word_count), 0) as avg_word_count,
        MAX(used_at) as last_used_at
    INTO v_metrics
    FROM template_usage
    WHERE template_id = p_template_id
      AND (p_period_start IS NULL OR used_at >= p_period_start)
      AND (p_period_end IS NULL OR used_at <= p_period_end);
    
    -- Insert or update quality metrics
    INSERT INTO template_quality_metrics (
        template_id, total_uses, successful_uses, failed_uses, success_rate,
        unique_users, avg_document_word_count, last_used_at,
        period_type, period_start, period_end,
        days_since_last_use, error_rate
    )
    VALUES (
        p_template_id, v_metrics.total_uses, v_metrics.successful_uses, v_metrics.failed_uses,
        v_metrics.success_rate, v_metrics.unique_users, v_metrics.avg_word_count,
        v_metrics.last_used_at, p_period_type, p_period_start, p_period_end,
        EXTRACT(DAY FROM (NOW() - v_metrics.last_used_at))::INTEGER,
        ROUND((v_metrics.failed_uses::DECIMAL / NULLIF(v_metrics.total_uses, 0)) * 100, 2)
    )
    ON CONFLICT (template_id, period_type, period_start) DO UPDATE SET
        total_uses = EXCLUDED.total_uses,
        successful_uses = EXCLUDED.successful_uses,
        failed_uses = EXCLUDED.failed_uses,
        success_rate = EXCLUDED.success_rate,
        unique_users = EXCLUDED.unique_users,
        avg_document_word_count = EXCLUDED.avg_document_word_count,
        last_used_at = EXCLUDED.last_used_at,
        days_since_last_use = EXCLUDED.days_since_last_use,
        error_rate = EXCLUDED.error_rate,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Refresh template analytics views
CREATE OR REPLACE FUNCTION refresh_template_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_template_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_template_trends;
END;
$$ LANGUAGE plpgsql;

-- Determine maintenance priority
CREATE OR REPLACE FUNCTION determine_template_maintenance_priority(
    p_template_id UUID
) RETURNS VARCHAR AS $$
DECLARE
    v_metrics RECORD;
    v_priority VARCHAR(20);
BEGIN
    SELECT * INTO v_metrics 
    FROM template_quality_metrics 
    WHERE template_id = p_template_id AND period_type = 'all_time'
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN 'low';
    END IF;
    
    -- Critical: High usage but low success rate or very old
    IF (v_metrics.total_uses > 50 AND v_metrics.success_rate < 70) 
       OR v_metrics.days_since_last_use > 365 THEN
        v_priority := 'critical';
    -- High: Moderate issues
    ELSIF (v_metrics.total_uses > 20 AND v_metrics.success_rate < 80)
       OR (v_metrics.total_uses > 10 AND v_metrics.days_since_last_use > 180) THEN
        v_priority := 'high';
    -- Medium: Minor issues
    ELSIF v_metrics.success_rate < 90 OR v_metrics.days_since_last_use > 90 THEN
        v_priority := 'medium';
    ELSE
        v_priority := 'low';
    END IF;
    
    -- Update the priority in quality metrics
    UPDATE template_quality_metrics
    SET maintenance_priority = v_priority,
        updated_at = CURRENT_TIMESTAMP
    WHERE template_id = p_template_id AND period_type = 'all_time';
    
    RETURN v_priority;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update template quality metrics when template_usage changes
CREATE OR REPLACE FUNCTION trigger_update_template_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate metrics for the affected template
    PERFORM calculate_template_quality_metrics(
        COALESCE(NEW.template_id, OLD.template_id),
        'all_time',
        NULL,
        NULL
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_metrics_on_usage
AFTER INSERT OR UPDATE OR DELETE ON template_usage
FOR EACH ROW
EXECUTE FUNCTION trigger_update_template_metrics();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE template_versions IS 'Version history for templates with content snapshots';
COMMENT ON TABLE template_quality_metrics IS 'Quality and performance metrics for templates';
COMMENT ON TABLE template_comparison_metrics IS 'Side-by-side comparison of template performance';
COMMENT ON TABLE template_maintenance_log IS 'Maintenance actions and schedule for templates';
COMMENT ON FUNCTION create_template_version IS 'Creates a new version snapshot of a template';
COMMENT ON FUNCTION calculate_template_quality_metrics IS 'Calculates quality metrics for a template over a time period';
COMMENT ON FUNCTION determine_template_maintenance_priority IS 'Determines maintenance priority based on metrics';

