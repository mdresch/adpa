-- Create prompt templates table for AI-powered prompt engineering
-- Migration: 20260203_create_prompt_templates.sql

-- Prompt Templates Table
CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  methodology VARCHAR(50),
  system_prompt TEXT NOT NULL,
  output_template_id UUID REFERENCES output_templates(id),
  context_requirements JSONB DEFAULT '[]'::jsonb,
  success_rate DECIMAL(3,2) DEFAULT 0.0,
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.0,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Output Templates Table
CREATE TABLE IF NOT EXISTS output_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  schema JSONB NOT NULL,
  examples JSONB DEFAULT '[]'::jsonb,
  validation_rules JSONB DEFAULT '{}'::jsonb,
  post_processing JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Template Performance Tracking
CREATE TABLE IF NOT EXISTS template_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES document_templates(id),
  prompt_template_id UUID REFERENCES prompt_templates(id),
  generation_id UUID,
  model_used VARCHAR(100),
  quality_score DECIMAL(3,2),
  generation_time INTEGER,
  cost DECIMAL(10,6),
  user_feedback INTEGER CHECK (user_feedback >= 1 AND user_feedback <= 5),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_methodology ON prompt_templates(methodology);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_public ON prompt_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_created_by ON prompt_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_template_performance_template_id ON template_performance(template_id);
CREATE INDEX IF NOT EXISTS idx_template_performance_prompt_template_id ON template_performance(prompt_template_id);
CREATE INDEX IF NOT EXISTS idx_template_performance_created_at ON template_performance(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_prompt_templates_updated_at 
    BEFORE UPDATE ON prompt_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_output_templates_updated_at 
    BEFORE UPDATE ON output_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default prompt templates
INSERT INTO prompt_templates (name, description, category, methodology, system_prompt, context_requirements, is_public, created_by) VALUES
(
  'Stakeholder Analysis Extractor',
  'Optimized prompt for extracting stakeholder information from project data',
  'stakeholder',
  'PMBOK',
  'You are a PROJECT DOCUMENT ANALYST extracting stakeholder information from REAL PROJECT DATA.

CRITICAL RULES:
1. ✅ EXTRACT data from the provided project context (stakeholders, requirements, documentation)
2. ❌ DO NOT generate generic educational content about stakeholders
3. ✅ USE actual names, roles, and details from the project
4. ❌ DO NOT create hypothetical or example stakeholders
5. ✅ If insufficient data exists, state "Insufficient project data" and recommend what data is needed
6. ✅ Reference specific project documents and sources

OUTPUT FOCUS:
- Real stakeholders from THIS specific project only
- Actual roles, responsibilities, and influence levels
- Real communication needs and expectations
- Actual stakeholder relationships and interactions

FORMAT:
- Use structured sections for each stakeholder
- Include source references where available
- Provide confidence scores for extracted information',
  '["stakeholders", "project_documents", "requirements", "communications"]',
  true,
  (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
),
(
  'Risk Assessment Extractor',
  'Specialized prompt for identifying and analyzing project risks',
  'risk',
  'PMBOK',
  'You are a PROJECT DOCUMENT ANALYST identifying risks from REAL PROJECT DATA.

CRITICAL RULES:
1. ✅ IDENTIFY risks mentioned in project documentation
2. ❌ DO NOT generate generic or hypothetical risks
3. ✅ USE actual project context, constraints, and challenges
4. ❌ DO NOT create risks without evidence in the data
5. ✅ Assess impact and probability based on project specifics
6. ✅ Reference source documents for each identified risk

OUTPUT FOCUS:
- Real risks facing THIS specific project
- Actual impact areas and probability assessments
- Real mitigation strategies mentioned in documents
- Actual risk owners and response plans

FORMAT:
- Structured risk register format
- Include risk category, impact, probability, and response
- Provide source references
- Assign confidence levels',
  '["risks", "issues", "constraints", "assumptions", "mitigation"]',
  true,
  (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
),
(
  'Requirements Document Extractor',
  'Prompt for extracting and structuring project requirements',
  'requirements',
  'PMBOK',
  'You are a PROJECT DOCUMENT ANALYST extracting requirements from REAL PROJECT DATA.

CRITICAL RULES:
1. ✅ EXTRACT actual requirements from project documentation
2. ❌ DO NOT generate generic requirement examples
3. ✅ PRESERVE original requirement wording when possible
4. ❌ DO NOT invent requirements not present in sources
5. ✅ Categorize requirements by type and priority
6. ✅ Trace requirements to source documents

OUTPUT FOCUS:
- Real requirements from THIS specific project
- Actual acceptance criteria and constraints
- Real requirement dependencies and relationships
- Actual stakeholder requirements and expectations

FORMAT:
- Structured requirements list
- Include requirement ID, type, priority, and source
- Provide acceptance criteria when available
- Trace to originating documents',
  '["requirements", "stakeholders", "scope", "deliverables", "constraints"]',
  true,
  (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
)
ON CONFLICT DO NOTHING;

-- Insert some default output templates
INSERT INTO output_templates (name, description, schema, examples) VALUES
(
  'Stakeholder Analysis Output',
  'Structured output format for stakeholder analysis',
  '{
    "type": "object",
    "properties": {
      "executive_summary": {
        "type": "string",
        "description": "Brief overview of stakeholder landscape"
      },
      "stakeholders": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": {"type": "string"},
            "role": {"type": "string"},
            "organization": {"type": "string"},
            "influence": {"type": "string", "enum": ["high", "medium", "low"]},
            "impact": {"type": "string", "enum": ["high", "medium", "low"]},
            "interest": {"type": "string", "enum": ["high", "medium", "low"]},
            "responsibilities": {"type": "array", "items": {"type": "string"}},
            "expectations": {"type": "array", "items": {"type": "string"}},
            "communication_needs": {"type": "string"},
            "source_documents": {"type": "array", "items": {"type": "string"}},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1}
          },
          "required": ["name", "role", "influence", "impact", "interest"]
        }
      },
      "stakeholder_matrix": {
        "type": "object",
        "properties": {
          "high_influence_high_interest": {"type": "array", "items": {"type": "string"}},
          "high_influence_low_interest": {"type": "array", "items": {"type": "string"}},
          "low_influence_high_interest": {"type": "array", "items": {"type": "string"}},
          "low_influence_low_interest": {"type": "array", "items": {"type": "string"}}
        }
      }
    },
    "required": ["executive_summary", "stakeholders"]
  }',
  '[{"executive_summary": "Project has 12 key stakeholders across 4 organizations", "stakeholders": [{"name": "John Smith", "role": "Project Sponsor", "organization": "ABC Corp", "influence": "high", "impact": "high", "interest": "high"}]}]'
),
(
  'Risk Register Output',
  'Structured output format for risk assessment',
  '{
    "type": "object",
    "properties": {
      "risk_summary": {
        "type": "string",
        "description": "Overview of risk landscape"
      },
      "risks": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {"type": "string"},
            "description": {"type": "string"},
            "category": {"type": "string"},
            "probability": {"type": "string", "enum": ["very_low", "low", "medium", "high", "very_high"]},
            "impact": {"type": "string", "enum": ["very_low", "low", "medium", "high", "very_high"]},
            "risk_score": {"type": "number"},
            "triggers": {"type": "array", "items": {"type": "string"}},
            "mitigation_strategy": {"type": "string"},
            "contingency_plan": {"type": "string"},
            "risk_owner": {"type": "string"},
            "status": {"type": "string", "enum": ["identified", "assessed", "mitigated", "accepted"]},
            "source_documents": {"type": "array", "items": {"type": "string"}},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1}
          },
          "required": ["description", "category", "probability", "impact"]
        }
      }
    },
    "required": ["risk_summary", "risks"]
  }',
  '[{"risk_summary": "8 risks identified, 3 high priority", "risks": [{"description": "Budget overrun risk", "category": "financial", "probability": "medium", "impact": "high"}]}]'
)
ON CONFLICT DO NOTHING;
