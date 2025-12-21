-- Stakeholder Operations Domain Entities

-- Stakeholder Engagements (Events/Touchpoints)
DROP TABLE IF EXISTS stakeholder_engagements CASCADE;
CREATE TABLE stakeholder_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stakeholder_name VARCHAR(255),
  engagement_type VARCHAR(100), -- 'Workshop', 'Interview', 'Presentation'
  engagement_date TIMESTAMP WITH TIME ZONE,
  objective TEXT,
  outcome TEXT,
  feedback TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stakeholder_engagements_project_id ON stakeholder_engagements(project_id);

-- Communication Logs
DROP TABLE IF EXISTS communication_logs CASCADE;
CREATE TABLE communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender VARCHAR(255),
  recipient VARCHAR(255),
  communication_type VARCHAR(50), -- 'Email', 'Call', 'Memo', 'Slack'
  communication_date TIMESTAMP WITH TIME ZONE,
  subject VARCHAR(255),
  content_summary TEXT,
  key_decisions_made TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_communication_logs_project_id ON communication_logs(project_id);

-- Action Items
DROP TABLE IF EXISTS action_items CASCADE;
CREATE TABLE action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_id VARCHAR(50),
  description TEXT NOT NULL,
  owner VARCHAR(255),
  priority VARCHAR(20), -- 'High', 'Medium', 'Low'
  status VARCHAR(20), -- 'Open', 'In Progress', 'Completed'
  due_date TIMESTAMP WITH TIME ZONE,
  completion_date TIMESTAMP WITH TIME ZONE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_action_items_project_id ON action_items(project_id);

-- Meeting Minutes
DROP TABLE IF EXISTS meeting_minutes CASCADE;
CREATE TABLE meeting_minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  meeting_title VARCHAR(255) NOT NULL,
  meeting_date TIMESTAMP WITH TIME ZONE,
  attendees TEXT[],
  agenda TEXT,
  key_points TEXT,
  decisions_made TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meeting_minutes_project_id ON meeting_minutes(project_id);
