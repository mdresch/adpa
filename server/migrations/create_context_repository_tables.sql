-- Context Repository Database Schema
-- Creates tables for project context, user profiles, and document history

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    number_format VARCHAR(20) DEFAULT 'en-US',
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    notifications JSONB DEFAULT '{"email": true, "push": false, "sms": false, "in_app": true, "frequency": "immediate", "categories": ["system", "documents", "collaboration"]}',
    accessibility JSONB DEFAULT '{"font_size": "medium", "color_scheme": "default", "screen_reader": false, "keyboard_navigation": true, "reduced_motion": false}',
    privacy JSONB DEFAULT '{"profile_visibility": "team", "data_sharing": true, "analytics_opt_in": true, "marketing_opt_in": false, "third_party_sharing": false}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- User Expertise Table
CREATE TABLE IF NOT EXISTS user_expertise (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level VARCHAR(20) DEFAULT 'intermediate' CHECK (level IN ('junior', 'intermediate', 'senior', 'expert')),
    domains TEXT[] DEFAULT '{}',
    certifications TEXT[] DEFAULT '{}',
    experience_years INTEGER DEFAULT 0 CHECK (experience_years >= 0),
    methodologies TEXT[] DEFAULT '{}',
    tools TEXT[] DEFAULT '{}',
    languages TEXT[] DEFAULT '{}',
    specializations TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- User Writing Style Table
CREATE TABLE IF NOT EXISTS user_writing_style (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tone VARCHAR(20) DEFAULT 'professional' CHECK (tone IN ('formal', 'casual', 'professional', 'technical')),
    formality VARCHAR(20) DEFAULT 'formal' CHECK (formality IN ('very_formal', 'formal', 'casual', 'very_casual')),
    length_preference VARCHAR(20) DEFAULT 'detailed' CHECK (length_preference IN ('brief', 'detailed', 'comprehensive')),
    structure_preference VARCHAR(20) DEFAULT 'structured' CHECK (structure_preference IN ('structured', 'narrative', 'bullet_points')),
    terminology_preference VARCHAR(20) DEFAULT 'standard' CHECK (terminology_preference IN ('standard', 'technical', 'business', 'custom')),
    audience_awareness VARCHAR(20) DEFAULT 'medium' CHECK (audience_awareness IN ('high', 'medium', 'low')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- User Domain Knowledge Table
CREATE TABLE IF NOT EXISTS user_domain_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    industries TEXT[] DEFAULT '{}',
    technologies TEXT[] DEFAULT '{}',
    frameworks TEXT[] DEFAULT '{}',
    tools TEXT[] DEFAULT '{}',
    standards TEXT[] DEFAULT '{}',
    regulations TEXT[] DEFAULT '{}',
    best_practices TEXT[] DEFAULT '{}',
    common_patterns TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- User Collaboration Preferences Table
CREATE TABLE IF NOT EXISTS user_collaboration_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    communication_style VARCHAR(20) DEFAULT 'collaborative' CHECK (communication_style IN ('direct', 'diplomatic', 'collaborative', 'analytical')),
    feedback_preference VARCHAR(20) DEFAULT 'constructive' CHECK (feedback_preference IN ('constructive', 'direct', 'gentle', 'detailed')),
    meeting_preference VARCHAR(20) DEFAULT 'structured' CHECK (meeting_preference IN ('structured', 'informal', 'virtual', 'in_person')),
    collaboration_tools TEXT[] DEFAULT '{}',
    availability JSONB DEFAULT '{"timezone": "UTC", "working_days": ["monday", "tuesday", "wednesday", "thursday", "friday"], "working_hours": {"start_time": "09:00", "end_time": "17:00", "break_start": "12:00", "break_end": "13:00", "flexible_hours": false, "timezone": "UTC"}, "holidays": [], "vacation_dates": [], "busy_periods": []}',
    working_hours JSONB DEFAULT '{"start_time": "09:00", "end_time": "17:00", "break_start": "12:00", "break_end": "13:00", "flexible_hours": false, "timezone": "UTC"}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Stakeholders Table
CREATE TABLE IF NOT EXISTS stakeholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    organization VARCHAR(255),
    influence_level VARCHAR(20) DEFAULT 'medium' CHECK (influence_level IN ('high', 'medium', 'low')),
    interest_level VARCHAR(20) DEFAULT 'medium' CHECK (interest_level IN ('high', 'medium', 'low')),
    responsibilities TEXT[] DEFAULT '{}',
    expectations TEXT[] DEFAULT '{}',
    communication_preferences TEXT[] DEFAULT '{}',
    availability JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Requirements Table
CREATE TABLE IF NOT EXISTS requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'functional' CHECK (type IN ('functional', 'non_functional', 'business', 'technical')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'implemented', 'verified')),
    source VARCHAR(255),
    acceptance_criteria TEXT[] DEFAULT '{}',
    dependencies TEXT[] DEFAULT '{}',
    risks TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Constraints Table
CREATE TABLE IF NOT EXISTS constraints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'technical' CHECK (type IN ('budget', 'time', 'resource', 'technical', 'regulatory', 'business')),
    impact VARCHAR(20) DEFAULT 'medium' CHECK (impact IN ('high', 'medium', 'low')),
    mitigation_strategy TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Risks Table
CREATE TABLE IF NOT EXISTS risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    probability VARCHAR(20) DEFAULT 'medium' CHECK (probability IN ('high', 'medium', 'low')),
    impact VARCHAR(20) DEFAULT 'medium' CHECK (impact IN ('high', 'medium', 'low')),
    risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('high', 'medium', 'low')),
    mitigation_strategy TEXT,
    contingency_plan TEXT,
    owner VARCHAR(255),
    status VARCHAR(20) DEFAULT 'identified' CHECK (status IN ('identified', 'mitigated', 'accepted', 'transferred')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Success Criteria Table
CREATE TABLE IF NOT EXISTS success_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'quantitative' CHECK (type IN ('quantitative', 'qualitative')),
    measurement_method TEXT,
    target_value DECIMAL,
    current_value DECIMAL,
    status VARCHAR(20) DEFAULT 'not_met' CHECK (status IN ('not_met', 'partially_met', 'met', 'exceeded')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Milestones Table
CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'delayed')),
    dependencies TEXT[] DEFAULT '{}',
    deliverables TEXT[] DEFAULT '{}',
    success_criteria TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Phases Table
CREATE TABLE IF NOT EXISTS phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
    deliverables TEXT[] DEFAULT '{}',
    team_members TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Document Tags Table
CREATE TABLE IF NOT EXISTS document_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, tag)
);

-- Document Quality Metrics Table
CREATE TABLE IF NOT EXISTS document_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    completeness_score DECIMAL(3,2) CHECK (completeness_score >= 0 AND completeness_score <= 10),
    clarity_score DECIMAL(3,2) CHECK (clarity_score >= 0 AND clarity_score <= 10),
    accuracy_score DECIMAL(3,2) CHECK (accuracy_score >= 0 AND accuracy_score <= 10),
    consistency_score DECIMAL(3,2) CHECK (consistency_score >= 0 AND consistency_score <= 10),
    overall_score DECIMAL(3,2) CHECK (overall_score >= 0 AND overall_score <= 10),
    assessment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assessor VARCHAR(255) NOT NULL,
    feedback TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document Patterns Table
CREATE TABLE IF NOT EXISTS document_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    framework VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    pattern_type VARCHAR(50) NOT NULL,
    pattern_data JSONB NOT NULL,
    frequency INTEGER DEFAULT 1,
    confidence DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    examples TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Best Practices Table
CREATE TABLE IF NOT EXISTS best_practices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    framework VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    practice_type VARCHAR(20) DEFAULT 'structure' CHECK (practice_type IN ('structure', 'content', 'process', 'quality')),
    effectiveness_score DECIMAL(3,2) DEFAULT 0.5 CHECK (effectiveness_score >= 0 AND effectiveness_score <= 1),
    usage_frequency INTEGER DEFAULT 1,
    examples TEXT[] DEFAULT '{}',
    implementation_guidance TEXT,
    success_metrics TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quality Trends Table
CREATE TABLE IF NOT EXISTS quality_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timeframe VARCHAR(20) NOT NULL,
    average_quality_score DECIMAL(3,2) NOT NULL CHECK (average_quality_score >= 0 AND average_quality_score <= 10),
    trend_direction VARCHAR(20) DEFAULT 'stable' CHECK (trend_direction IN ('improving', 'declining', 'stable')),
    data_points INTEGER DEFAULT 0,
    framework_breakdown JSONB DEFAULT '{}',
    category_breakdown JSONB DEFAULT '{}',
    common_issues TEXT[] DEFAULT '{}',
    improvement_areas TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_expertise_user_id ON user_expertise(user_id);
CREATE INDEX IF NOT EXISTS idx_user_expertise_domains ON user_expertise USING GIN(domains);
CREATE INDEX IF NOT EXISTS idx_user_expertise_level ON user_expertise(level);
CREATE INDEX IF NOT EXISTS idx_user_writing_style_user_id ON user_writing_style(user_id);
CREATE INDEX IF NOT EXISTS idx_user_domain_knowledge_user_id ON user_domain_knowledge(user_id);
CREATE INDEX IF NOT EXISTS idx_user_domain_knowledge_frameworks ON user_domain_knowledge USING GIN(frameworks);
CREATE INDEX IF NOT EXISTS idx_user_collaboration_preferences_user_id ON user_collaboration_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_stakeholders_project_id ON stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_influence_level ON stakeholders(influence_level);
CREATE INDEX IF NOT EXISTS idx_requirements_project_id ON requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_requirements_priority ON requirements(priority);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_constraints_project_id ON constraints(project_id);
CREATE INDEX IF NOT EXISTS idx_constraints_impact ON constraints(impact);
CREATE INDEX IF NOT EXISTS idx_risks_project_id ON risks(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_risk_level ON risks(risk_level);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_success_criteria_project_id ON success_criteria(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_date ON milestones(date);
CREATE INDEX IF NOT EXISTS idx_phases_project_id ON phases(project_id);
CREATE INDEX IF NOT EXISTS idx_phases_start_date ON phases(start_date);

CREATE INDEX IF NOT EXISTS idx_document_tags_document_id ON document_tags(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_tag ON document_tags(tag);
CREATE INDEX IF NOT EXISTS idx_document_quality_metrics_document_id ON document_quality_metrics(document_id);
CREATE INDEX IF NOT EXISTS idx_document_quality_metrics_overall_score ON document_quality_metrics(overall_score);
CREATE INDEX IF NOT EXISTS idx_document_patterns_framework ON document_patterns(framework);
CREATE INDEX IF NOT EXISTS idx_document_patterns_category ON document_patterns(category);
CREATE INDEX IF NOT EXISTS idx_document_patterns_pattern_type ON document_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_best_practices_framework ON best_practices(framework);
CREATE INDEX IF NOT EXISTS idx_best_practices_category ON best_practices(category);
CREATE INDEX IF NOT EXISTS idx_best_practices_effectiveness_score ON best_practices(effectiveness_score);
CREATE INDEX IF NOT EXISTS idx_quality_trends_timeframe ON quality_trends(timeframe);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_expertise_updated_at BEFORE UPDATE ON user_expertise FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_writing_style_updated_at BEFORE UPDATE ON user_writing_style FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_domain_knowledge_updated_at BEFORE UPDATE ON user_domain_knowledge FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_collaboration_preferences_updated_at BEFORE UPDATE ON user_collaboration_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stakeholders_updated_at BEFORE UPDATE ON stakeholders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_constraints_updated_at BEFORE UPDATE ON constraints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON risks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_success_criteria_updated_at BEFORE UPDATE ON success_criteria FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_phases_updated_at BEFORE UPDATE ON phases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_patterns_updated_at BEFORE UPDATE ON document_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_best_practices_updated_at BEFORE UPDATE ON best_practices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_preferences IS 'User preferences and settings for personalization';
COMMENT ON TABLE user_expertise IS 'User expertise and skills information';
COMMENT ON TABLE user_writing_style IS 'User writing style preferences and patterns';
COMMENT ON TABLE user_domain_knowledge IS 'User domain knowledge and experience';
COMMENT ON TABLE user_collaboration_preferences IS 'User collaboration and communication preferences';
COMMENT ON TABLE stakeholders IS 'Project stakeholders and their information';
COMMENT ON TABLE requirements IS 'Project requirements and specifications';
COMMENT ON TABLE constraints IS 'Project constraints and limitations';
COMMENT ON TABLE risks IS 'Project risks and mitigation strategies';
COMMENT ON TABLE success_criteria IS 'Project success criteria and measurements';
COMMENT ON TABLE milestones IS 'Project milestones and deliverables';
COMMENT ON TABLE phases IS 'Project phases and timelines';
COMMENT ON TABLE document_tags IS 'Document tags for categorization and search';
COMMENT ON TABLE document_quality_metrics IS 'Document quality assessment metrics';
COMMENT ON TABLE document_patterns IS 'Document patterns and usage analytics';
COMMENT ON TABLE best_practices IS 'Best practices for document generation';
COMMENT ON TABLE quality_trends IS 'Quality trends and analytics over time';
