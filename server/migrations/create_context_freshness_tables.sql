-- Context Freshness Management Database Schema
-- Creates tables for context freshness management and time-based prioritization

-- Context Items Table (if not exists)
CREATE TABLE IF NOT EXISTS context_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('project_data', 'user_preferences', 'document_history', 'template_data', 'framework_data', 'external_api', 'database_query', 'file_content', 'semantic_search', 'historical_analysis', 'best_practices', 'pattern_data')),
    source VARCHAR(255) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    freshness_score DECIMAL(3,2) DEFAULT 1.0 CHECK (freshness_score >= 0 AND freshness_score <= 1),
    is_stale BOOLEAN DEFAULT false,
    staleness_reason TEXT,
    marked_stale_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMP WITH TIME ZONE,
    last_refreshed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Context Freshness Assessments Table
CREATE TABLE IF NOT EXISTS context_freshness_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID NOT NULL REFERENCES context_items(id) ON DELETE CASCADE,
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    freshness_score DECIMAL(3,2) NOT NULL CHECK (freshness_score >= 0 AND freshness_score <= 1),
    staleness_level VARCHAR(20) NOT NULL CHECK (staleness_level IN ('fresh', 'slightly_stale', 'moderately_stale', 'very_stale', 'extremely_stale', 'expired')),
    decay_rate DECIMAL(3,2) DEFAULT 0.0 CHECK (decay_rate >= 0 AND decay_rate <= 1),
    time_since_update INTEGER DEFAULT 0, -- in hours
    time_since_access INTEGER DEFAULT 0, -- in hours
    freshness_trend JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    next_assessment_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context Refresh Results Table
CREATE TABLE IF NOT EXISTS context_refresh_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID NOT NULL REFERENCES context_items(id) ON DELETE CASCADE,
    refreshed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    refresh_duration INTEGER DEFAULT 0, -- in milliseconds
    success BOOLEAN DEFAULT true,
    new_freshness_score DECIMAL(3,2) DEFAULT 0.0 CHECK (new_freshness_score >= 0 AND new_freshness_score <= 1),
    changes_detected BOOLEAN DEFAULT false,
    change_summary JSONB DEFAULT '[]',
    error_message TEXT,
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context Refresh Schedules Table
CREATE TABLE IF NOT EXISTS context_refresh_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id VARCHAR(255) UNIQUE NOT NULL,
    context_id UUID NOT NULL REFERENCES context_items(id) ON DELETE CASCADE,
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('immediate', 'scheduled', 'recurring', 'event_driven', 'conditional')),
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('real_time', 'hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'manual', 'event_driven')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    enabled BOOLEAN DEFAULT true,
    last_execution TIMESTAMP WITH TIME ZONE,
    next_execution TIMESTAMP WITH TIME ZONE,
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context Staleness Log Table
CREATE TABLE IF NOT EXISTS context_staleness_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID NOT NULL REFERENCES context_items(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('mark_stale', 'mark_fresh', 'refresh', 'archive', 'delete')),
    reason TEXT NOT NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    performed_by VARCHAR(255) DEFAULT 'system',
    metadata JSONB DEFAULT '{}'
);

-- Context Cleanup Results Table
CREATE TABLE IF NOT EXISTS context_cleanup_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cleanup_id VARCHAR(255) UNIQUE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL, -- in milliseconds
    contexts_processed INTEGER DEFAULT 0,
    contexts_cleaned INTEGER DEFAULT 0,
    contexts_refreshed INTEGER DEFAULT 0,
    contexts_archived INTEGER DEFAULT 0,
    contexts_deleted INTEGER DEFAULT 0,
    storage_freed BIGINT DEFAULT 0, -- in bytes
    performance_improvement DECIMAL(3,2) DEFAULT 0.0 CHECK (performance_improvement >= 0 AND performance_improvement <= 1),
    errors JSONB DEFAULT '[]',
    summary JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context Freshness Policies Table
CREATE TABLE IF NOT EXISTS context_freshness_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    context_types TEXT[] DEFAULT '{}',
    freshness_rules JSONB DEFAULT '[]',
    staleness_thresholds JSONB DEFAULT '[]',
    refresh_strategies JSONB DEFAULT '[]',
    cleanup_rules JSONB DEFAULT '[]',
    priority_rules JSONB DEFAULT '[]',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}'
);

-- Context Freshness Policy Results Table
CREATE TABLE IF NOT EXISTS context_freshness_policy_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id VARCHAR(255) NOT NULL REFERENCES context_freshness_policies(policy_id) ON DELETE CASCADE,
    context_id UUID NOT NULL REFERENCES context_items(id) ON DELETE CASCADE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT true,
    actions_taken JSONB DEFAULT '[]',
    performance_impact JSONB DEFAULT '{}',
    quality_impact JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context Freshness Policy Evaluations Table
CREATE TABLE IF NOT EXISTS context_freshness_policy_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id VARCHAR(255) NOT NULL REFERENCES context_freshness_policies(policy_id) ON DELETE CASCADE,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    contexts_evaluated INTEGER DEFAULT 0,
    actions_recommended INTEGER DEFAULT 0,
    actions_executed INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0.0 CHECK (success_rate >= 0 AND success_rate <= 1),
    performance_impact JSONB DEFAULT '{}',
    quality_impact JSONB DEFAULT '{}',
    cost_benefit_analysis JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context Freshness Metrics Table
CREATE TABLE IF NOT EXISTS context_freshness_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL,
    total_contexts INTEGER DEFAULT 0,
    fresh_contexts INTEGER DEFAULT 0,
    stale_contexts INTEGER DEFAULT 0,
    expired_contexts INTEGER DEFAULT 0,
    average_freshness_score DECIMAL(3,2) DEFAULT 0.0 CHECK (average_freshness_score >= 0 AND average_freshness_score <= 1),
    freshness_distribution JSONB DEFAULT '{}',
    staleness_trends JSONB DEFAULT '[]',
    refresh_statistics JSONB DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(metric_date)
);

-- Context Freshness Trends Table
CREATE TABLE IF NOT EXISTS context_freshness_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID NOT NULL REFERENCES context_items(id) ON DELETE CASCADE,
    timeframe VARCHAR(20) NOT NULL,
    trend_data JSONB DEFAULT '[]',
    trend_direction VARCHAR(20) DEFAULT 'stable' CHECK (trend_direction IN ('improving', 'declining', 'stable')),
    trend_strength DECIMAL(3,2) DEFAULT 0.0 CHECK (trend_strength >= 0 AND trend_strength <= 1),
    seasonality BOOLEAN DEFAULT false,
    forecast JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context Freshness Health Status Table
CREATE TABLE IF NOT EXISTS context_freshness_health_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    overall_health VARCHAR(20) NOT NULL CHECK (overall_health IN ('excellent', 'good', 'fair', 'poor', 'critical')),
    health_score DECIMAL(3,2) NOT NULL CHECK (health_score >= 0 AND health_score <= 1),
    component_health JSONB DEFAULT '[]',
    alerts JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    last_assessment TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    next_assessment TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_context_items_type ON context_items(type);
CREATE INDEX IF NOT EXISTS idx_context_items_freshness_score ON context_items(freshness_score);
CREATE INDEX IF NOT EXISTS idx_context_items_is_stale ON context_items(is_stale);
CREATE INDEX IF NOT EXISTS idx_context_items_updated_at ON context_items(updated_at);
CREATE INDEX IF NOT EXISTS idx_context_items_last_accessed_at ON context_items(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_context_items_expires_at ON context_items(expires_at);

CREATE INDEX IF NOT EXISTS idx_context_freshness_assessments_context_id ON context_freshness_assessments(context_id);
CREATE INDEX IF NOT EXISTS idx_context_freshness_assessments_assessed_at ON context_freshness_assessments(assessed_at);
CREATE INDEX IF NOT EXISTS idx_context_freshness_assessments_freshness_score ON context_freshness_assessments(freshness_score);
CREATE INDEX IF NOT EXISTS idx_context_freshness_assessments_staleness_level ON context_freshness_assessments(staleness_level);

CREATE INDEX IF NOT EXISTS idx_context_refresh_results_context_id ON context_refresh_results(context_id);
CREATE INDEX IF NOT EXISTS idx_context_refresh_results_refreshed_at ON context_refresh_results(refreshed_at);
CREATE INDEX IF NOT EXISTS idx_context_refresh_results_success ON context_refresh_results(success);

CREATE INDEX IF NOT EXISTS idx_context_refresh_schedules_context_id ON context_refresh_schedules(context_id);
CREATE INDEX IF NOT EXISTS idx_context_refresh_schedules_schedule_type ON context_refresh_schedules(schedule_type);
CREATE INDEX IF NOT EXISTS idx_context_refresh_schedules_enabled ON context_refresh_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_context_refresh_schedules_next_execution ON context_refresh_schedules(next_execution);

CREATE INDEX IF NOT EXISTS idx_context_staleness_log_context_id ON context_staleness_log(context_id);
CREATE INDEX IF NOT EXISTS idx_context_staleness_log_action ON context_staleness_log(action);
CREATE INDEX IF NOT EXISTS idx_context_staleness_log_performed_at ON context_staleness_log(performed_at);

CREATE INDEX IF NOT EXISTS idx_context_cleanup_results_cleanup_id ON context_cleanup_results(cleanup_id);
CREATE INDEX IF NOT EXISTS idx_context_cleanup_results_started_at ON context_cleanup_results(started_at);

CREATE INDEX IF NOT EXISTS idx_context_freshness_policies_policy_id ON context_freshness_policies(policy_id);
CREATE INDEX IF NOT EXISTS idx_context_freshness_policies_enabled ON context_freshness_policies(enabled);

CREATE INDEX IF NOT EXISTS idx_context_freshness_policy_results_policy_id ON context_freshness_policy_results(policy_id);
CREATE INDEX IF NOT EXISTS idx_context_freshness_policy_results_context_id ON context_freshness_policy_results(context_id);
CREATE INDEX IF NOT EXISTS idx_context_freshness_policy_results_applied_at ON context_freshness_policy_results(applied_at);

CREATE INDEX IF NOT EXISTS idx_context_freshness_policy_evaluations_policy_id ON context_freshness_policy_evaluations(policy_id);
CREATE INDEX IF NOT EXISTS idx_context_freshness_policy_evaluations_evaluated_at ON context_freshness_policy_evaluations(evaluated_at);

CREATE INDEX IF NOT EXISTS idx_context_freshness_metrics_metric_date ON context_freshness_metrics(metric_date);

CREATE INDEX IF NOT EXISTS idx_context_freshness_trends_context_id ON context_freshness_trends(context_id);
CREATE INDEX IF NOT EXISTS idx_context_freshness_trends_timeframe ON context_freshness_trends(timeframe);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_context_items_updated_at BEFORE UPDATE ON context_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_context_refresh_schedules_updated_at BEFORE UPDATE ON context_refresh_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_context_freshness_policies_updated_at BEFORE UPDATE ON context_freshness_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_context_freshness_trends_updated_at BEFORE UPDATE ON context_freshness_trends FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update daily freshness metrics
CREATE OR REPLACE FUNCTION update_daily_context_freshness_metrics()
RETURNS VOID AS $$
DECLARE
    metric_date_val DATE;
    total_contexts_val INTEGER;
    fresh_contexts_val INTEGER;
    stale_contexts_val INTEGER;
    expired_contexts_val INTEGER;
    avg_freshness_score_val DECIMAL(3,2);
BEGIN
    metric_date_val := CURRENT_DATE;
    
    -- Calculate metrics for today
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN freshness_score >= 0.7 THEN 1 END),
        COUNT(CASE WHEN is_stale = true THEN 1 END),
        COUNT(CASE WHEN freshness_score < 0.1 THEN 1 END),
        COALESCE(AVG(freshness_score), 0)
    INTO 
        total_contexts_val,
        fresh_contexts_val,
        stale_contexts_val,
        expired_contexts_val,
        avg_freshness_score_val
    FROM context_items;
    
    -- Insert or update daily metrics
    INSERT INTO context_freshness_metrics (
        metric_date, total_contexts, fresh_contexts, stale_contexts, expired_contexts, average_freshness_score
    ) VALUES (
        metric_date_val, total_contexts_val, fresh_contexts_val, stale_contexts_val, expired_contexts_val, avg_freshness_score_val
    )
    ON CONFLICT (metric_date) DO UPDATE SET
        total_contexts = EXCLUDED.total_contexts,
        fresh_contexts = EXCLUDED.fresh_contexts,
        stale_contexts = EXCLUDED.stale_contexts,
        expired_contexts = EXCLUDED.expired_contexts,
        average_freshness_score = EXCLUDED.average_freshness_score;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update daily metrics
CREATE OR REPLACE FUNCTION trigger_update_daily_context_freshness_metrics()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_daily_context_freshness_metrics();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_context_freshness_metrics_trigger
    AFTER INSERT OR UPDATE ON context_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_daily_context_freshness_metrics();

-- Create function to process scheduled refreshes
CREATE OR REPLACE FUNCTION process_scheduled_refreshes()
RETURNS VOID AS $$
DECLARE
    schedule_record RECORD;
BEGIN
    -- Process all due scheduled refreshes
    FOR schedule_record IN 
        SELECT * FROM context_refresh_schedules 
        WHERE enabled = true AND next_execution <= CURRENT_TIMESTAMP
        ORDER BY next_execution ASC
    LOOP
        -- Log the scheduled refresh execution
        INSERT INTO context_staleness_log (
            context_id, action, reason, performed_at, performed_by
        ) VALUES (
            schedule_record.context_id, 'refresh', 'Scheduled refresh execution', CURRENT_TIMESTAMP, 'system'
        );
        
        -- Update the schedule
        UPDATE context_refresh_schedules 
        SET execution_count = execution_count + 1,
            last_execution = CURRENT_TIMESTAMP,
            next_execution = CASE 
                WHEN schedule_type = 'recurring' THEN 
                    CASE frequency
                        WHEN 'hourly' THEN CURRENT_TIMESTAMP + INTERVAL '1 hour'
                        WHEN 'daily' THEN CURRENT_TIMESTAMP + INTERVAL '1 day'
                        WHEN 'weekly' THEN CURRENT_TIMESTAMP + INTERVAL '1 week'
                        WHEN 'monthly' THEN CURRENT_TIMESTAMP + INTERVAL '1 month'
                        ELSE CURRENT_TIMESTAMP + INTERVAL '1 day'
                    END
                ELSE NULL
            END
        WHERE schedule_id = schedule_record.schedule_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE context_items IS 'Main table for storing context items with freshness information';
COMMENT ON TABLE context_freshness_assessments IS 'Freshness assessments and evaluations for context items';
COMMENT ON TABLE context_refresh_results IS 'Results of context refresh operations';
COMMENT ON TABLE context_refresh_schedules IS 'Scheduled refresh operations for context items';
COMMENT ON TABLE context_staleness_log IS 'Log of staleness-related actions performed on context items';
COMMENT ON TABLE context_cleanup_results IS 'Results of context cleanup operations';
COMMENT ON TABLE context_freshness_policies IS 'Freshness management policies and rules';
COMMENT ON TABLE context_freshness_policy_results IS 'Results of applying freshness policies to context items';
COMMENT ON TABLE context_freshness_policy_evaluations IS 'Evaluations of freshness policy effectiveness';
COMMENT ON TABLE context_freshness_metrics IS 'Daily aggregated metrics for context freshness';
COMMENT ON TABLE context_freshness_trends IS 'Trend analysis data for context freshness over time';
COMMENT ON TABLE context_freshness_health_status IS 'Overall health status of the context freshness system';
