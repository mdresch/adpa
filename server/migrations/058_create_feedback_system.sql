-- Migration: Create Feedback & Intelligence System (CR-2026-002)
-- Version: 1.0
-- Date: 2025-10-20
-- Description: Document review and feedback intelligence system with AI-powered analytics

-- =============================================================================
-- 1. DOCUMENT FEEDBACK TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS document_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Overall Rating (1-5 stars)
    overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
    
    -- Quality Dimensions (1-5 scale)
    accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
    clarity_rating INTEGER CHECK (clarity_rating BETWEEN 1 AND 5),
    completeness_rating INTEGER CHECK (completeness_rating BETWEEN 1 AND 5),
    consistency_rating INTEGER CHECK (consistency_rating BETWEEN 1 AND 5),
    usability_rating INTEGER CHECK (usability_rating BETWEEN 1 AND 5),
    
    -- Free-text Feedback
    strengths TEXT,
    weaknesses TEXT,
    suggestions TEXT,
    
    -- Metadata
    feedback_type VARCHAR(50) CHECK (feedback_type IN ('peer_review', 'stakeholder_review', 'quality_assurance', 'self_assessment')) DEFAULT 'peer_review',
    review_stage VARCHAR(50) CHECK (review_stage IN ('draft', 'review', 'final', 'post_delivery')) DEFAULT 'review',
    time_to_complete INTEGER, -- seconds
    is_template_feedback BOOLEAN DEFAULT FALSE,
    
    -- AI Analysis Results (populated after AI processing)
    sentiment_score DECIMAL(3,2), -- -1.0 to 1.0 (negative to positive)
    sentiment_label VARCHAR(20) CHECK (sentiment_label IN ('very_negative', 'negative', 'neutral', 'positive', 'very_positive')),
    themes JSONB, -- array of extracted themes
    priority_score INTEGER CHECK (priority_score BETWEEN 1 AND 100), -- AI-calculated urgency
    
    -- Status
    status VARCHAR(20) CHECK (status IN ('draft', 'submitted', 'acknowledged', 'actioned', 'resolved')) DEFAULT 'submitted',
    actioned_at TIMESTAMP,
    resolved_at TIMESTAMP,
    
    -- Tracking
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_reviewer_document UNIQUE(document_id, reviewer_id, created_at)
);

-- Indexes
CREATE INDEX idx_feedback_document ON document_feedback(document_id);
CREATE INDEX idx_feedback_project ON document_feedback(project_id);
CREATE INDEX idx_feedback_reviewer ON document_feedback(reviewer_id);
CREATE INDEX idx_feedback_rating ON document_feedback(overall_rating);
CREATE INDEX idx_feedback_status ON document_feedback(status);
CREATE INDEX idx_feedback_created ON document_feedback(created_at DESC);
CREATE INDEX idx_feedback_sentiment ON document_feedback(sentiment_score);
CREATE INDEX idx_feedback_priority ON document_feedback(priority_score DESC);

-- Full-text search on comments
CREATE INDEX idx_feedback_strengths_fts ON document_feedback USING gin(to_tsvector('english', COALESCE(strengths, '')));
CREATE INDEX idx_feedback_weaknesses_fts ON document_feedback USING gin(to_tsvector('english', COALESCE(weaknesses, '')));
CREATE INDEX idx_feedback_suggestions_fts ON document_feedback USING gin(to_tsvector('english', COALESCE(suggestions, '')));

-- Comments on feedback table
COMMENT ON TABLE document_feedback IS 'CR-2026-002: Document review feedback with AI-powered analysis';
COMMENT ON COLUMN document_feedback.overall_rating IS '1-5 stars overall rating';
COMMENT ON COLUMN document_feedback.sentiment_score IS 'AI-calculated sentiment (-1.0 to 1.0)';
COMMENT ON COLUMN document_feedback.themes IS 'AI-extracted themes from text feedback';
COMMENT ON COLUMN document_feedback.priority_score IS 'AI-calculated priority (1-100)';

-- =============================================================================
-- 2. FEEDBACK ISSUES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS feedback_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES document_feedback(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Issue Details
    issue_type VARCHAR(50) CHECK (issue_type IN (
        'accuracy', 'clarity', 'completeness', 'consistency', 'formatting',
        'grammar', 'structure', 'logic', 'compliance', 'missing_info',
        'incorrect_info', 'unclear_section', 'inconsistent_terminology', 'other'
    )) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location TEXT, -- section, page, line number, etc.
    
    -- Resolution
    status VARCHAR(20) CHECK (status IN ('open', 'in_progress', 'resolved', 'wont_fix', 'duplicate')) DEFAULT 'open',
    resolution TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    
    -- AI Analysis
    ai_suggested_fix TEXT, -- AI-generated suggestion
    ai_confidence DECIMAL(3,2), -- 0.0 to 1.0
    is_recurring BOOLEAN DEFAULT FALSE, -- detected in multiple feedbacks
    similar_issues JSONB, -- array of similar issue IDs
    
    -- Tracking
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_issues_feedback ON feedback_issues(feedback_id);
CREATE INDEX idx_issues_document ON feedback_issues(document_id);
CREATE INDEX idx_issues_project ON feedback_issues(project_id);
CREATE INDEX idx_issues_type ON feedback_issues(issue_type);
CREATE INDEX idx_issues_severity ON feedback_issues(severity);
CREATE INDEX idx_issues_status ON feedback_issues(status);
CREATE INDEX idx_issues_recurring ON feedback_issues(is_recurring) WHERE is_recurring = TRUE;

COMMENT ON TABLE feedback_issues IS 'CR-2026-002: Specific issues extracted from feedback';
COMMENT ON COLUMN feedback_issues.is_recurring IS 'TRUE if issue detected in multiple feedback entries';

-- =============================================================================
-- 3. FEEDBACK ACTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS feedback_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES document_feedback(id) ON DELETE CASCADE,
    issue_id UUID REFERENCES feedback_issues(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Action Details
    action_type VARCHAR(50) CHECK (action_type IN (
        'document_revision', 'template_update', 'ai_prompt_refinement',
        'training_material', 'process_improvement', 'guideline_update', 'other'
    )) NOT NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority INTEGER CHECK (priority BETWEEN 1 AND 5) DEFAULT 3,
    
    -- Assignment
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMP,
    due_date DATE,
    
    -- Status
    status VARCHAR(20) CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    progress INTEGER CHECK (progress BETWEEN 0 AND 100) DEFAULT 0,
    
    -- Results
    outcome TEXT,
    impact_measurement JSONB, -- metrics showing impact of action
    completed_at TIMESTAMP,
    
    -- Tracking
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_actions_feedback ON feedback_actions(feedback_id);
CREATE INDEX idx_actions_issue ON feedback_actions(issue_id);
CREATE INDEX idx_actions_document ON feedback_actions(document_id);
CREATE INDEX idx_actions_project ON feedback_actions(project_id);
CREATE INDEX idx_actions_assigned ON feedback_actions(assigned_to);
CREATE INDEX idx_actions_status ON feedback_actions(status);
CREATE INDEX idx_actions_due ON feedback_actions(due_date);

COMMENT ON TABLE feedback_actions IS 'CR-2026-002: Action items derived from feedback';

-- =============================================================================
-- 4. FEEDBACK ANALYTICS (AGGREGATED DATA)
-- =============================================================================

CREATE TABLE IF NOT EXISTS feedback_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Scope
    analytics_scope VARCHAR(50) CHECK (analytics_scope IN ('document', 'template', 'project', 'organization')) NOT NULL,
    scope_id UUID, -- document_id, template_id, project_id, or NULL for org-wide
    
    -- Time Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Aggregated Metrics
    total_feedback_count INTEGER DEFAULT 0,
    average_overall_rating DECIMAL(3,2),
    average_accuracy DECIMAL(3,2),
    average_clarity DECIMAL(3,2),
    average_completeness DECIMAL(3,2),
    average_consistency DECIMAL(3,2),
    average_usability DECIMAL(3,2),
    
    -- Sentiment Distribution
    very_positive_count INTEGER DEFAULT 0,
    positive_count INTEGER DEFAULT 0,
    neutral_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    very_negative_count INTEGER DEFAULT 0,
    average_sentiment DECIMAL(3,2),
    
    -- Issue Statistics
    total_issues INTEGER DEFAULT 0,
    critical_issues INTEGER DEFAULT 0,
    high_severity_issues INTEGER DEFAULT 0,
    recurring_issues INTEGER DEFAULT 0,
    resolved_issues INTEGER DEFAULT 0,
    
    -- Top Themes (AI-extracted)
    top_positive_themes JSONB, -- array of {theme, count}
    top_negative_themes JSONB,
    top_suggestions JSONB,
    
    -- Trends
    rating_trend VARCHAR(20) CHECK (rating_trend IN ('improving', 'stable', 'declining')),
    feedback_volume_trend VARCHAR(20) CHECK (feedback_volume_trend IN ('increasing', 'stable', 'decreasing')),
    
    -- Actions
    actions_created INTEGER DEFAULT 0,
    actions_completed INTEGER DEFAULT 0,
    
    -- Tracking
    calculated_at TIMESTAMP DEFAULT NOW(),
    last_updated TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_analytics_scope_period UNIQUE(analytics_scope, scope_id, period_start, period_end)
);

-- Indexes
CREATE INDEX idx_analytics_scope ON feedback_analytics(analytics_scope, scope_id);
CREATE INDEX idx_analytics_period ON feedback_analytics(period_start, period_end);
CREATE INDEX idx_analytics_rating ON feedback_analytics(average_overall_rating);
CREATE INDEX idx_analytics_trend ON feedback_analytics(rating_trend);

COMMENT ON TABLE feedback_analytics IS 'CR-2026-002: Aggregated feedback analytics by scope and time period';

-- =============================================================================
-- 5. TEMPLATE EFFECTIVENESS TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS template_effectiveness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
    
    -- Usage Statistics
    usage_count INTEGER DEFAULT 0,
    documents_generated INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    
    -- Quality Metrics
    average_rating DECIMAL(3,2),
    average_completion_time INTEGER, -- minutes
    revision_rate DECIMAL(5,2), -- percentage of docs requiring revision
    approval_rate DECIMAL(5,2), -- percentage approved on first submission
    
    -- Feedback Summary
    total_feedback INTEGER DEFAULT 0,
    positive_feedback INTEGER DEFAULT 0,
    negative_feedback INTEGER DEFAULT 0,
    common_issues JSONB, -- array of recurring issues
    improvement_suggestions JSONB,
    
    -- AI Analysis
    effectiveness_score INTEGER CHECK (effectiveness_score BETWEEN 1 AND 100),
    optimization_priority VARCHAR(20) CHECK (optimization_priority IN ('low', 'medium', 'high', 'critical')),
    recommended_improvements JSONB,
    
    -- Benchmarks
    industry_benchmark_score DECIMAL(3,2),
    percentile_rank INTEGER, -- 1-100 (vs other templates)
    
    -- Tracking
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    calculated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_template_period UNIQUE(template_id, period_start, period_end)
);

-- Indexes
CREATE INDEX idx_template_effectiveness ON template_effectiveness(template_id);
CREATE INDEX idx_template_score ON template_effectiveness(effectiveness_score DESC);
CREATE INDEX idx_template_priority ON template_effectiveness(optimization_priority);

COMMENT ON TABLE template_effectiveness IS 'CR-2026-002: Template effectiveness metrics and optimization recommendations';

-- =============================================================================
-- 6. FEEDBACK NOTIFICATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS feedback_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES document_feedback(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    notification_type VARCHAR(50) CHECK (notification_type IN (
        'new_feedback', 'feedback_acknowledged', 'action_assigned',
        'action_completed', 'critical_issue', 'trend_alert'
    )) NOT NULL,
    
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500), -- deep link to relevant page
    
    -- Delivery
    delivery_method VARCHAR(20) CHECK (delivery_method IN ('in_app', 'email', 'both')) DEFAULT 'both',
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_feedback ON feedback_notifications(feedback_id);
CREATE INDEX idx_notifications_recipient ON feedback_notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON feedback_notifications(recipient_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created ON feedback_notifications(created_at DESC);

COMMENT ON TABLE feedback_notifications IS 'CR-2026-002: Feedback-related notifications';

-- =============================================================================
-- 7. TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Update feedback updated_at on changes
CREATE OR REPLACE FUNCTION update_feedback_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feedback_timestamp
    BEFORE UPDATE ON document_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_timestamp();

CREATE TRIGGER trigger_update_issue_timestamp
    BEFORE UPDATE ON feedback_issues
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_timestamp();

CREATE TRIGGER trigger_update_action_timestamp
    BEFORE UPDATE ON feedback_actions
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_timestamp();

-- =============================================================================
-- 8. VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View: Document feedback summary
CREATE OR REPLACE VIEW v_document_feedback_summary AS
SELECT 
    d.id AS document_id,
    d.title AS document_title,
    d.project_id,
    p.name AS project_name,
    COUNT(df.id) AS feedback_count,
    AVG(df.overall_rating) AS avg_rating,
    AVG(df.sentiment_score) AS avg_sentiment,
    COUNT(CASE WHEN df.sentiment_label IN ('positive', 'very_positive') THEN 1 END) AS positive_count,
    COUNT(CASE WHEN df.sentiment_label IN ('negative', 'very_negative') THEN 1 END) AS negative_count,
    MAX(df.created_at) AS latest_feedback_date
FROM documents d
LEFT JOIN document_feedback df ON d.id = df.document_id
LEFT JOIN projects p ON d.project_id = p.id
GROUP BY d.id, d.title, d.project_id, p.name;

-- View: Active issues requiring action
CREATE OR REPLACE VIEW v_active_feedback_issues AS
SELECT 
    fi.id,
    fi.feedback_id,
    d.title AS document_title,
    p.name AS project_name,
    fi.issue_type,
    fi.severity,
    fi.title AS issue_title,
    fi.status,
    fi.is_recurring,
    df.overall_rating AS feedback_rating,
    u.name AS reviewer_name,
    fi.created_at
FROM feedback_issues fi
JOIN document_feedback df ON fi.feedback_id = df.id
JOIN documents d ON fi.document_id = d.id
JOIN projects p ON fi.project_id = p.id
JOIN users u ON df.reviewer_id = u.id
WHERE fi.status IN ('open', 'in_progress')
ORDER BY fi.severity DESC, fi.created_at DESC;

-- View: Project feedback health
CREATE OR REPLACE VIEW v_project_feedback_health AS
SELECT 
    p.id AS project_id,
    p.name AS project_name,
    COUNT(DISTINCT df.id) AS total_feedback,
    AVG(df.overall_rating) AS avg_rating,
    AVG(df.sentiment_score) AS avg_sentiment,
    COUNT(DISTINCT CASE WHEN fi.severity IN ('high', 'critical') THEN fi.id END) AS high_severity_issues,
    COUNT(DISTINCT CASE WHEN fa.status != 'completed' THEN fa.id END) AS pending_actions,
    MAX(df.created_at) AS latest_feedback_date
FROM projects p
LEFT JOIN document_feedback df ON p.id = df.project_id
LEFT JOIN feedback_issues fi ON p.id = fi.project_id AND fi.status IN ('open', 'in_progress')
LEFT JOIN feedback_actions fa ON p.id = fa.project_id
GROUP BY p.id, p.name;

COMMENT ON VIEW v_document_feedback_summary IS 'CR-2026-002: Document feedback summary metrics';
COMMENT ON VIEW v_active_feedback_issues IS 'CR-2026-002: Active issues requiring attention';
COMMENT ON VIEW v_project_feedback_health IS 'CR-2026-002: Project-level feedback health indicators';

-- =============================================================================
-- 9. GRANT PERMISSIONS
-- =============================================================================

-- Grant read access to all authenticated users
GRANT SELECT ON document_feedback TO authenticated;
GRANT SELECT ON feedback_issues TO authenticated;
GRANT SELECT ON feedback_actions TO authenticated;
GRANT SELECT ON feedback_analytics TO authenticated;
GRANT SELECT ON template_effectiveness TO authenticated;
GRANT SELECT ON feedback_notifications TO authenticated;

-- Grant write access for feedback submission
GRANT INSERT ON document_feedback TO authenticated;
GRANT UPDATE ON document_feedback TO authenticated;

-- Grant access to views
GRANT SELECT ON v_document_feedback_summary TO authenticated;
GRANT SELECT ON v_active_feedback_issues TO authenticated;
GRANT SELECT ON v_project_feedback_health TO authenticated;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 058: Feedback & Intelligence System created successfully';
    RAISE NOTICE 'CR-2026-002: Document Review & Feedback Intelligence System';
    RAISE NOTICE 'Tables: document_feedback, feedback_issues, feedback_actions, feedback_analytics, template_effectiveness, feedback_notifications';
    RAISE NOTICE 'Views: v_document_feedback_summary, v_active_feedback_issues, v_project_feedback_health';
END $$;


-- Version: 1.0
-- Date: 2025-10-20
-- Description: Document review and feedback intelligence system with AI-powered analytics

-- =============================================================================
-- 1. DOCUMENT FEEDBACK TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS document_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Overall Rating (1-5 stars)
    overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
    
    -- Quality Dimensions (1-5 scale)
    accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
    clarity_rating INTEGER CHECK (clarity_rating BETWEEN 1 AND 5),
    completeness_rating INTEGER CHECK (completeness_rating BETWEEN 1 AND 5),
    consistency_rating INTEGER CHECK (consistency_rating BETWEEN 1 AND 5),
    usability_rating INTEGER CHECK (usability_rating BETWEEN 1 AND 5),
    
    -- Free-text Feedback
    strengths TEXT,
    weaknesses TEXT,
    suggestions TEXT,
    
    -- Metadata
    feedback_type VARCHAR(50) CHECK (feedback_type IN ('peer_review', 'stakeholder_review', 'quality_assurance', 'self_assessment')) DEFAULT 'peer_review',
    review_stage VARCHAR(50) CHECK (review_stage IN ('draft', 'review', 'final', 'post_delivery')) DEFAULT 'review',
    time_to_complete INTEGER, -- seconds
    is_template_feedback BOOLEAN DEFAULT FALSE,
    
    -- AI Analysis Results (populated after AI processing)
    sentiment_score DECIMAL(3,2), -- -1.0 to 1.0 (negative to positive)
    sentiment_label VARCHAR(20) CHECK (sentiment_label IN ('very_negative', 'negative', 'neutral', 'positive', 'very_positive')),
    themes JSONB, -- array of extracted themes
    priority_score INTEGER CHECK (priority_score BETWEEN 1 AND 100), -- AI-calculated urgency
    
    -- Status
    status VARCHAR(20) CHECK (status IN ('draft', 'submitted', 'acknowledged', 'actioned', 'resolved')) DEFAULT 'submitted',
    actioned_at TIMESTAMP,
    resolved_at TIMESTAMP,
    
    -- Tracking
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_reviewer_document UNIQUE(document_id, reviewer_id, created_at)
);

-- Indexes
CREATE INDEX idx_feedback_document ON document_feedback(document_id);
CREATE INDEX idx_feedback_project ON document_feedback(project_id);
CREATE INDEX idx_feedback_reviewer ON document_feedback(reviewer_id);
CREATE INDEX idx_feedback_rating ON document_feedback(overall_rating);
CREATE INDEX idx_feedback_status ON document_feedback(status);
CREATE INDEX idx_feedback_created ON document_feedback(created_at DESC);
CREATE INDEX idx_feedback_sentiment ON document_feedback(sentiment_score);
CREATE INDEX idx_feedback_priority ON document_feedback(priority_score DESC);

-- Full-text search on comments
CREATE INDEX idx_feedback_strengths_fts ON document_feedback USING gin(to_tsvector('english', COALESCE(strengths, '')));
CREATE INDEX idx_feedback_weaknesses_fts ON document_feedback USING gin(to_tsvector('english', COALESCE(weaknesses, '')));
CREATE INDEX idx_feedback_suggestions_fts ON document_feedback USING gin(to_tsvector('english', COALESCE(suggestions, '')));

-- Comments on feedback table
COMMENT ON TABLE document_feedback IS 'CR-2026-002: Document review feedback with AI-powered analysis';
COMMENT ON COLUMN document_feedback.overall_rating IS '1-5 stars overall rating';
COMMENT ON COLUMN document_feedback.sentiment_score IS 'AI-calculated sentiment (-1.0 to 1.0)';
COMMENT ON COLUMN document_feedback.themes IS 'AI-extracted themes from text feedback';
COMMENT ON COLUMN document_feedback.priority_score IS 'AI-calculated priority (1-100)';

-- =============================================================================
-- 2. FEEDBACK ISSUES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS feedback_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES document_feedback(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Issue Details
    issue_type VARCHAR(50) CHECK (issue_type IN (
        'accuracy', 'clarity', 'completeness', 'consistency', 'formatting',
        'grammar', 'structure', 'logic', 'compliance', 'missing_info',
        'incorrect_info', 'unclear_section', 'inconsistent_terminology', 'other'
    )) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location TEXT, -- section, page, line number, etc.
    
    -- Resolution
    status VARCHAR(20) CHECK (status IN ('open', 'in_progress', 'resolved', 'wont_fix', 'duplicate')) DEFAULT 'open',
    resolution TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    
    -- AI Analysis
    ai_suggested_fix TEXT, -- AI-generated suggestion
    ai_confidence DECIMAL(3,2), -- 0.0 to 1.0
    is_recurring BOOLEAN DEFAULT FALSE, -- detected in multiple feedbacks
    similar_issues JSONB, -- array of similar issue IDs
    
    -- Tracking
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_issues_feedback ON feedback_issues(feedback_id);
CREATE INDEX idx_issues_document ON feedback_issues(document_id);
CREATE INDEX idx_issues_project ON feedback_issues(project_id);
CREATE INDEX idx_issues_type ON feedback_issues(issue_type);
CREATE INDEX idx_issues_severity ON feedback_issues(severity);
CREATE INDEX idx_issues_status ON feedback_issues(status);
CREATE INDEX idx_issues_recurring ON feedback_issues(is_recurring) WHERE is_recurring = TRUE;

COMMENT ON TABLE feedback_issues IS 'CR-2026-002: Specific issues extracted from feedback';
COMMENT ON COLUMN feedback_issues.is_recurring IS 'TRUE if issue detected in multiple feedback entries';

-- =============================================================================
-- 3. FEEDBACK ACTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS feedback_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES document_feedback(id) ON DELETE CASCADE,
    issue_id UUID REFERENCES feedback_issues(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Action Details
    action_type VARCHAR(50) CHECK (action_type IN (
        'document_revision', 'template_update', 'ai_prompt_refinement',
        'training_material', 'process_improvement', 'guideline_update', 'other'
    )) NOT NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority INTEGER CHECK (priority BETWEEN 1 AND 5) DEFAULT 3,
    
    -- Assignment
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMP,
    due_date DATE,
    
    -- Status
    status VARCHAR(20) CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    progress INTEGER CHECK (progress BETWEEN 0 AND 100) DEFAULT 0,
    
    -- Results
    outcome TEXT,
    impact_measurement JSONB, -- metrics showing impact of action
    completed_at TIMESTAMP,
    
    -- Tracking
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_actions_feedback ON feedback_actions(feedback_id);
CREATE INDEX idx_actions_issue ON feedback_actions(issue_id);
CREATE INDEX idx_actions_document ON feedback_actions(document_id);
CREATE INDEX idx_actions_project ON feedback_actions(project_id);
CREATE INDEX idx_actions_assigned ON feedback_actions(assigned_to);
CREATE INDEX idx_actions_status ON feedback_actions(status);
CREATE INDEX idx_actions_due ON feedback_actions(due_date);

COMMENT ON TABLE feedback_actions IS 'CR-2026-002: Action items derived from feedback';

-- =============================================================================
-- 4. FEEDBACK ANALYTICS (AGGREGATED DATA)
-- =============================================================================

CREATE TABLE IF NOT EXISTS feedback_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Scope
    analytics_scope VARCHAR(50) CHECK (analytics_scope IN ('document', 'template', 'project', 'organization')) NOT NULL,
    scope_id UUID, -- document_id, template_id, project_id, or NULL for org-wide
    
    -- Time Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Aggregated Metrics
    total_feedback_count INTEGER DEFAULT 0,
    average_overall_rating DECIMAL(3,2),
    average_accuracy DECIMAL(3,2),
    average_clarity DECIMAL(3,2),
    average_completeness DECIMAL(3,2),
    average_consistency DECIMAL(3,2),
    average_usability DECIMAL(3,2),
    
    -- Sentiment Distribution
    very_positive_count INTEGER DEFAULT 0,
    positive_count INTEGER DEFAULT 0,
    neutral_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    very_negative_count INTEGER DEFAULT 0,
    average_sentiment DECIMAL(3,2),
    
    -- Issue Statistics
    total_issues INTEGER DEFAULT 0,
    critical_issues INTEGER DEFAULT 0,
    high_severity_issues INTEGER DEFAULT 0,
    recurring_issues INTEGER DEFAULT 0,
    resolved_issues INTEGER DEFAULT 0,
    
    -- Top Themes (AI-extracted)
    top_positive_themes JSONB, -- array of {theme, count}
    top_negative_themes JSONB,
    top_suggestions JSONB,
    
    -- Trends
    rating_trend VARCHAR(20) CHECK (rating_trend IN ('improving', 'stable', 'declining')),
    feedback_volume_trend VARCHAR(20) CHECK (feedback_volume_trend IN ('increasing', 'stable', 'decreasing')),
    
    -- Actions
    actions_created INTEGER DEFAULT 0,
    actions_completed INTEGER DEFAULT 0,
    
    -- Tracking
    calculated_at TIMESTAMP DEFAULT NOW(),
    last_updated TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_analytics_scope_period UNIQUE(analytics_scope, scope_id, period_start, period_end)
);

-- Indexes
CREATE INDEX idx_analytics_scope ON feedback_analytics(analytics_scope, scope_id);
CREATE INDEX idx_analytics_period ON feedback_analytics(period_start, period_end);
CREATE INDEX idx_analytics_rating ON feedback_analytics(average_overall_rating);
CREATE INDEX idx_analytics_trend ON feedback_analytics(rating_trend);

COMMENT ON TABLE feedback_analytics IS 'CR-2026-002: Aggregated feedback analytics by scope and time period';

-- =============================================================================
-- 5. TEMPLATE EFFECTIVENESS TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS template_effectiveness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
    
    -- Usage Statistics
    usage_count INTEGER DEFAULT 0,
    documents_generated INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    
    -- Quality Metrics
    average_rating DECIMAL(3,2),
    average_completion_time INTEGER, -- minutes
    revision_rate DECIMAL(5,2), -- percentage of docs requiring revision
    approval_rate DECIMAL(5,2), -- percentage approved on first submission
    
    -- Feedback Summary
    total_feedback INTEGER DEFAULT 0,
    positive_feedback INTEGER DEFAULT 0,
    negative_feedback INTEGER DEFAULT 0,
    common_issues JSONB, -- array of recurring issues
    improvement_suggestions JSONB,
    
    -- AI Analysis
    effectiveness_score INTEGER CHECK (effectiveness_score BETWEEN 1 AND 100),
    optimization_priority VARCHAR(20) CHECK (optimization_priority IN ('low', 'medium', 'high', 'critical')),
    recommended_improvements JSONB,
    
    -- Benchmarks
    industry_benchmark_score DECIMAL(3,2),
    percentile_rank INTEGER, -- 1-100 (vs other templates)
    
    -- Tracking
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    calculated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_template_period UNIQUE(template_id, period_start, period_end)
);

-- Indexes
CREATE INDEX idx_template_effectiveness ON template_effectiveness(template_id);
CREATE INDEX idx_template_score ON template_effectiveness(effectiveness_score DESC);
CREATE INDEX idx_template_priority ON template_effectiveness(optimization_priority);

COMMENT ON TABLE template_effectiveness IS 'CR-2026-002: Template effectiveness metrics and optimization recommendations';

-- =============================================================================
-- 6. FEEDBACK NOTIFICATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS feedback_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES document_feedback(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    notification_type VARCHAR(50) CHECK (notification_type IN (
        'new_feedback', 'feedback_acknowledged', 'action_assigned',
        'action_completed', 'critical_issue', 'trend_alert'
    )) NOT NULL,
    
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500), -- deep link to relevant page
    
    -- Delivery
    delivery_method VARCHAR(20) CHECK (delivery_method IN ('in_app', 'email', 'both')) DEFAULT 'both',
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_feedback ON feedback_notifications(feedback_id);
CREATE INDEX idx_notifications_recipient ON feedback_notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON feedback_notifications(recipient_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created ON feedback_notifications(created_at DESC);

COMMENT ON TABLE feedback_notifications IS 'CR-2026-002: Feedback-related notifications';

-- =============================================================================
-- 7. TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Update feedback updated_at on changes
CREATE OR REPLACE FUNCTION update_feedback_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feedback_timestamp
    BEFORE UPDATE ON document_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_timestamp();

CREATE TRIGGER trigger_update_issue_timestamp
    BEFORE UPDATE ON feedback_issues
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_timestamp();

CREATE TRIGGER trigger_update_action_timestamp
    BEFORE UPDATE ON feedback_actions
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_timestamp();

-- =============================================================================
-- 8. VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View: Document feedback summary
CREATE OR REPLACE VIEW v_document_feedback_summary AS
SELECT 
    d.id AS document_id,
    d.title AS document_title,
    d.project_id,
    p.name AS project_name,
    COUNT(df.id) AS feedback_count,
    AVG(df.overall_rating) AS avg_rating,
    AVG(df.sentiment_score) AS avg_sentiment,
    COUNT(CASE WHEN df.sentiment_label IN ('positive', 'very_positive') THEN 1 END) AS positive_count,
    COUNT(CASE WHEN df.sentiment_label IN ('negative', 'very_negative') THEN 1 END) AS negative_count,
    MAX(df.created_at) AS latest_feedback_date
FROM documents d
LEFT JOIN document_feedback df ON d.id = df.document_id
LEFT JOIN projects p ON d.project_id = p.id
GROUP BY d.id, d.title, d.project_id, p.name;

-- View: Active issues requiring action
CREATE OR REPLACE VIEW v_active_feedback_issues AS
SELECT 
    fi.id,
    fi.feedback_id,
    d.title AS document_title,
    p.name AS project_name,
    fi.issue_type,
    fi.severity,
    fi.title AS issue_title,
    fi.status,
    fi.is_recurring,
    df.overall_rating AS feedback_rating,
    u.name AS reviewer_name,
    fi.created_at
FROM feedback_issues fi
JOIN document_feedback df ON fi.feedback_id = df.id
JOIN documents d ON fi.document_id = d.id
JOIN projects p ON fi.project_id = p.id
JOIN users u ON df.reviewer_id = u.id
WHERE fi.status IN ('open', 'in_progress')
ORDER BY fi.severity DESC, fi.created_at DESC;

-- View: Project feedback health
CREATE OR REPLACE VIEW v_project_feedback_health AS
SELECT 
    p.id AS project_id,
    p.name AS project_name,
    COUNT(DISTINCT df.id) AS total_feedback,
    AVG(df.overall_rating) AS avg_rating,
    AVG(df.sentiment_score) AS avg_sentiment,
    COUNT(DISTINCT CASE WHEN fi.severity IN ('high', 'critical') THEN fi.id END) AS high_severity_issues,
    COUNT(DISTINCT CASE WHEN fa.status != 'completed' THEN fa.id END) AS pending_actions,
    MAX(df.created_at) AS latest_feedback_date
FROM projects p
LEFT JOIN document_feedback df ON p.id = df.project_id
LEFT JOIN feedback_issues fi ON p.id = fi.project_id AND fi.status IN ('open', 'in_progress')
LEFT JOIN feedback_actions fa ON p.id = fa.project_id
GROUP BY p.id, p.name;

COMMENT ON VIEW v_document_feedback_summary IS 'CR-2026-002: Document feedback summary metrics';
COMMENT ON VIEW v_active_feedback_issues IS 'CR-2026-002: Active issues requiring attention';
COMMENT ON VIEW v_project_feedback_health IS 'CR-2026-002: Project-level feedback health indicators';

-- =============================================================================
-- 9. GRANT PERMISSIONS
-- =============================================================================

-- Grant read access to all authenticated users
GRANT SELECT ON document_feedback TO authenticated;
GRANT SELECT ON feedback_issues TO authenticated;
GRANT SELECT ON feedback_actions TO authenticated;
GRANT SELECT ON feedback_analytics TO authenticated;
GRANT SELECT ON template_effectiveness TO authenticated;
GRANT SELECT ON feedback_notifications TO authenticated;

-- Grant write access for feedback submission
GRANT INSERT ON document_feedback TO authenticated;
GRANT UPDATE ON document_feedback TO authenticated;

-- Grant access to views
GRANT SELECT ON v_document_feedback_summary TO authenticated;
GRANT SELECT ON v_active_feedback_issues TO authenticated;
GRANT SELECT ON v_project_feedback_health TO authenticated;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 058: Feedback & Intelligence System created successfully';
    RAISE NOTICE 'CR-2026-002: Document Review & Feedback Intelligence System';
    RAISE NOTICE 'Tables: document_feedback, feedback_issues, feedback_actions, feedback_analytics, template_effectiveness, feedback_notifications';
    RAISE NOTICE 'Views: v_document_feedback_summary, v_active_feedback_issues, v_project_feedback_health';
END $$;

