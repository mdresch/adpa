-- Historical Analysis Database Schema
-- Creates tables for pattern recognition, best practices, and historical analysis

-- Document Pattern Analysis Table
CREATE TABLE IF NOT EXISTS document_pattern_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    patterns_found JSONB DEFAULT '[]',
    pattern_confidence DECIMAL(3,2) DEFAULT 0.0 CHECK (pattern_confidence >= 0 AND pattern_confidence <= 1),
    pattern_coverage DECIMAL(3,2) DEFAULT 0.0 CHECK (pattern_coverage >= 0 AND pattern_coverage <= 1),
    missing_patterns TEXT[] DEFAULT '{}',
    anomalous_patterns TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document Analysis Table
CREATE TABLE IF NOT EXISTS document_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN ('structure_analysis', 'content_analysis', 'quality_analysis', 'compliance_analysis', 'pattern_analysis', 'comprehensive_analysis')),
    patterns_detected JSONB DEFAULT '[]',
    best_practices_applied JSONB DEFAULT '[]',
    quality_metrics JSONB DEFAULT '{}',
    compliance_score DECIMAL(3,2) DEFAULT 0.0 CHECK (compliance_score >= 0 AND compliance_score <= 1),
    improvement_suggestions JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Historical Trends Table
CREATE TABLE IF NOT EXISTS historical_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timeframe VARCHAR(20) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(5,2) NOT NULL,
    trend_direction VARCHAR(20) DEFAULT 'stable' CHECK (trend_direction IN ('improving', 'declining', 'stable')),
    change_percentage DECIMAL(5,2) DEFAULT 0.0,
    data_points INTEGER DEFAULT 0,
    confidence DECIMAL(3,2) DEFAULT 0.0 CHECK (confidence >= 0 AND confidence <= 1),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Framework Analysis Table
CREATE TABLE IF NOT EXISTS framework_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    framework VARCHAR(50) NOT NULL,
    total_documents INTEGER DEFAULT 0,
    average_quality_score DECIMAL(3,2) DEFAULT 0.0 CHECK (average_quality_score >= 0 AND average_quality_score <= 10),
    common_patterns JSONB DEFAULT '[]',
    best_practices JSONB DEFAULT '[]',
    quality_trends JSONB DEFAULT '[]',
    improvement_areas TEXT[] DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    recommendations TEXT[] DEFAULT '{}',
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Analysis Table
CREATE TABLE IF NOT EXISTS user_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_documents INTEGER DEFAULT 0,
    average_quality_score DECIMAL(3,2) DEFAULT 0.0 CHECK (average_quality_score >= 0 AND average_quality_score <= 10),
    writing_patterns JSONB DEFAULT '[]',
    improvement_areas TEXT[] DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    recommendations TEXT[] DEFAULT '{}',
    quality_trends JSONB DEFAULT '[]',
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project Analysis Table
CREATE TABLE IF NOT EXISTS project_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    total_documents INTEGER DEFAULT 0,
    average_quality_score DECIMAL(3,2) DEFAULT 0.0 CHECK (average_quality_score >= 0 AND average_quality_score <= 10),
    document_types TEXT[] DEFAULT '{}',
    quality_distribution JSONB DEFAULT '{}',
    common_issues TEXT[] DEFAULT '{}',
    best_practices_applied JSONB DEFAULT '[]',
    improvement_opportunities TEXT[] DEFAULT '{}',
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pattern Validation Results Table
CREATE TABLE IF NOT EXISTS pattern_validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID NOT NULL REFERENCES document_patterns(id) ON DELETE CASCADE,
    validation_status VARCHAR(20) NOT NULL CHECK (validation_status IN ('valid', 'invalid', 'needs_review')),
    confidence_score DECIMAL(3,2) DEFAULT 0.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    validation_errors TEXT[] DEFAULT '{}',
    suggestions TEXT[] DEFAULT '{}',
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Improvement Suggestions Table
CREATE TABLE IF NOT EXISTS improvement_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    suggestion_type VARCHAR(50) NOT NULL CHECK (suggestion_type IN ('structure_improvement', 'content_enhancement', 'quality_improvement', 'compliance_fix', 'formatting_improvement', 'language_improvement', 'process_optimization')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    current_state TEXT,
    suggested_improvement TEXT NOT NULL,
    expected_benefit TEXT,
    implementation_effort VARCHAR(20) DEFAULT 'medium' CHECK (implementation_effort IN ('low', 'medium', 'high')),
    related_patterns TEXT[] DEFAULT '{}',
    related_practices TEXT[] DEFAULT '{}',
    examples TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analysis Metrics Table
CREATE TABLE IF NOT EXISTS analysis_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL,
    total_analyses INTEGER DEFAULT 0,
    pattern_analyses INTEGER DEFAULT 0,
    quality_analyses INTEGER DEFAULT 0,
    compliance_analyses INTEGER DEFAULT 0,
    average_analysis_time INTEGER DEFAULT 0,
    patterns_identified INTEGER DEFAULT 0,
    best_practices_identified INTEGER DEFAULT 0,
    improvement_suggestions_generated INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(metric_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_pattern_analysis_document_id ON document_pattern_analysis(document_id);
CREATE INDEX IF NOT EXISTS idx_document_pattern_analysis_analyzed_at ON document_pattern_analysis(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_document_pattern_analysis_pattern_confidence ON document_pattern_analysis(pattern_confidence);

CREATE INDEX IF NOT EXISTS idx_document_analysis_document_id ON document_analysis(document_id);
CREATE INDEX IF NOT EXISTS idx_document_analysis_analysis_type ON document_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_document_analysis_analyzed_at ON document_analysis(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_document_analysis_compliance_score ON document_analysis(compliance_score);

CREATE INDEX IF NOT EXISTS idx_historical_trends_timeframe ON historical_trends(timeframe);
CREATE INDEX IF NOT EXISTS idx_historical_trends_metric_name ON historical_trends(metric_name);
CREATE INDEX IF NOT EXISTS idx_historical_trends_trend_direction ON historical_trends(trend_direction);
CREATE INDEX IF NOT EXISTS idx_historical_trends_created_at ON historical_trends(created_at);

CREATE INDEX IF NOT EXISTS idx_framework_analysis_framework ON framework_analysis(framework);
CREATE INDEX IF NOT EXISTS idx_framework_analysis_analyzed_at ON framework_analysis(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_framework_analysis_average_quality_score ON framework_analysis(average_quality_score);

CREATE INDEX IF NOT EXISTS idx_user_analysis_user_id ON user_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analysis_analyzed_at ON user_analysis(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_user_analysis_average_quality_score ON user_analysis(average_quality_score);

CREATE INDEX IF NOT EXISTS idx_project_analysis_project_id ON project_analysis(project_id);
CREATE INDEX IF NOT EXISTS idx_project_analysis_analyzed_at ON project_analysis(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_project_analysis_average_quality_score ON project_analysis(average_quality_score);

CREATE INDEX IF NOT EXISTS idx_pattern_validation_results_pattern_id ON pattern_validation_results(pattern_id);
CREATE INDEX IF NOT EXISTS idx_pattern_validation_results_validation_status ON pattern_validation_results(validation_status);
CREATE INDEX IF NOT EXISTS idx_pattern_validation_results_validated_at ON pattern_validation_results(validated_at);

CREATE INDEX IF NOT EXISTS idx_improvement_suggestions_document_id ON improvement_suggestions(document_id);
CREATE INDEX IF NOT EXISTS idx_improvement_suggestions_user_id ON improvement_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_improvement_suggestions_project_id ON improvement_suggestions(project_id);
CREATE INDEX IF NOT EXISTS idx_improvement_suggestions_suggestion_type ON improvement_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_improvement_suggestions_priority ON improvement_suggestions(priority);
CREATE INDEX IF NOT EXISTS idx_improvement_suggestions_status ON improvement_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_improvement_suggestions_created_at ON improvement_suggestions(created_at);

CREATE INDEX IF NOT EXISTS idx_analysis_metrics_metric_date ON analysis_metrics(metric_date);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_document_pattern_analysis_updated_at BEFORE UPDATE ON document_pattern_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_analysis_updated_at BEFORE UPDATE ON document_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_framework_analysis_updated_at BEFORE UPDATE ON framework_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_analysis_updated_at BEFORE UPDATE ON user_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_analysis_updated_at BEFORE UPDATE ON project_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_improvement_suggestions_updated_at BEFORE UPDATE ON improvement_suggestions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update daily analysis metrics
CREATE OR REPLACE FUNCTION update_daily_analysis_metrics()
RETURNS VOID AS $$
DECLARE
    metric_date_val DATE;
    total_analyses_val INTEGER;
    pattern_analyses_val INTEGER;
    quality_analyses_val INTEGER;
    compliance_analyses_val INTEGER;
    avg_analysis_time_val INTEGER;
    patterns_identified_val INTEGER;
    best_practices_identified_val INTEGER;
    improvement_suggestions_generated_val INTEGER;
BEGIN
    metric_date_val := CURRENT_DATE;
    
    -- Calculate metrics for today
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN analysis_type = 'pattern_analysis' THEN 1 END),
        COUNT(CASE WHEN analysis_type = 'quality_analysis' THEN 1 END),
        COUNT(CASE WHEN analysis_type = 'compliance_analysis' THEN 1 END),
        COALESCE(AVG(EXTRACT(EPOCH FROM (analyzed_at - created_at))), 0),
        COALESCE(SUM(jsonb_array_length(patterns_detected)), 0),
        COALESCE(SUM(jsonb_array_length(best_practices_applied)), 0),
        COALESCE(SUM(jsonb_array_length(improvement_suggestions)), 0)
    INTO 
        total_analyses_val,
        pattern_analyses_val,
        quality_analyses_val,
        compliance_analyses_val,
        avg_analysis_time_val,
        patterns_identified_val,
        best_practices_identified_val,
        improvement_suggestions_generated_val
    FROM document_analysis
    WHERE DATE(analyzed_at) = metric_date_val;
    
    -- Insert or update daily metrics
    INSERT INTO analysis_metrics (
        metric_date, total_analyses, pattern_analyses, quality_analyses, compliance_analyses,
        average_analysis_time, patterns_identified, best_practices_identified, improvement_suggestions_generated
    ) VALUES (
        metric_date_val, total_analyses_val, pattern_analyses_val, quality_analyses_val, compliance_analyses_val,
        avg_analysis_time_val, patterns_identified_val, best_practices_identified_val, improvement_suggestions_generated_val
    )
    ON CONFLICT (metric_date) DO UPDATE SET
        total_analyses = EXCLUDED.total_analyses,
        pattern_analyses = EXCLUDED.pattern_analyses,
        quality_analyses = EXCLUDED.quality_analyses,
        compliance_analyses = EXCLUDED.compliance_analyses,
        average_analysis_time = EXCLUDED.average_analysis_time,
        patterns_identified = EXCLUDED.patterns_identified,
        best_practices_identified = EXCLUDED.best_practices_identified,
        improvement_suggestions_generated = EXCLUDED.improvement_suggestions_generated;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update daily metrics
CREATE OR REPLACE FUNCTION trigger_update_daily_analysis_metrics()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_daily_analysis_metrics();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_analysis_metrics_trigger
    AFTER INSERT ON document_analysis
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_daily_analysis_metrics();

-- Add comments for documentation
COMMENT ON TABLE document_pattern_analysis IS 'Analysis results for document pattern recognition';
COMMENT ON TABLE document_analysis IS 'Comprehensive document analysis results';
COMMENT ON TABLE historical_trends IS 'Historical trends and metrics over time';
COMMENT ON TABLE framework_analysis IS 'Framework-specific analysis and insights';
COMMENT ON TABLE user_analysis IS 'User-specific analysis and writing patterns';
COMMENT ON TABLE project_analysis IS 'Project-specific analysis and insights';
COMMENT ON TABLE pattern_validation_results IS 'Validation results for document patterns';
COMMENT ON TABLE improvement_suggestions IS 'Improvement suggestions for documents, users, and projects';
COMMENT ON TABLE analysis_metrics IS 'Daily aggregated metrics for analysis performance';
