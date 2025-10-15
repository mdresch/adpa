# User Rules & Preferences Management System

## Overview

The ADPA User Rules & Preferences Management System provides a comprehensive framework for managing custom business rules and user preferences. This system allows users to create, manage, and execute custom rules that automate workflows, control access, send notifications, and validate data based on their specific business requirements.

## Architecture

### Core Components

1. **Database Schema** - PostgreSQL tables for storing rules, preferences, templates, and execution history
2. **Backend API** - Express.js routes for CRUD operations and rule execution
3. **Rules Engine** - TypeScript engine for evaluating and executing rules
4. **Frontend Interface** - React-based UI for managing rules and preferences
5. **Template System** - Pre-built rule templates for common use cases

### Technology Stack

- **Backend**: Node.js, Express.js, TypeScript, PostgreSQL
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Radix UI
- **Database**: PostgreSQL with JSONB for flexible data storage
- **Authentication**: JWT-based with role-based access control
- **Validation**: Joi schema validation

## Database Schema

### Core Tables

#### `user_rules`
Stores user-defined business rules with conditions and actions.

```sql
CREATE TABLE user_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL, -- 'workflow', 'notification', 'access', 'automation', 'validation'
    conditions JSONB NOT NULL DEFAULT '{}',
    actions JSONB NOT NULL DEFAULT '{}',
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_system_rule BOOLEAN DEFAULT false,
    scope VARCHAR(50) DEFAULT 'user', -- 'user', 'project', 'team', 'global'
    scope_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);
```

#### `user_preferences`
Stores user-specific preferences and settings.

```sql
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- 'ui', 'notifications', 'workflow', 'integrations', 'security'
    preference_key VARCHAR(255) NOT NULL,
    preference_value JSONB NOT NULL,
    is_encrypted BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category, preference_key)
);
```

#### `rule_templates`
Pre-built rule templates for common use cases.

```sql
CREATE TABLE rule_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL,
    template_conditions JSONB NOT NULL DEFAULT '{}',
    template_actions JSONB NOT NULL DEFAULT '{}',
    category VARCHAR(100),
    is_system_template BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);
```

#### `rule_executions`
Audit trail for rule executions.

```sql
CREATE TABLE rule_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES user_rules(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    execution_context JSONB NOT NULL DEFAULT '{}',
    conditions_met BOOLEAN NOT NULL,
    actions_executed JSONB DEFAULT '[]',
    execution_time_ms INTEGER,
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Rule Types

### 1. Workflow Rules
Automate business processes and workflows.

**Example**: Auto-approve documents from trusted users
```json
{
  "conditions": [
    {
      "field": "document_status",
      "operator": "equals",
      "value": "pending_approval"
    },
    {
      "field": "created_by_role",
      "operator": "in",
      "value": ["admin", "project_manager"],
      "logical_operator": "AND"
    }
  ],
  "actions": [
    {
      "type": "approve",
      "parameters": {
        "reason": "Auto-approved by trusted user",
        "notify_creator": true
      }
    }
  ]
}
```

### 2. Notification Rules
Send notifications based on specific conditions.

**Example**: Notify on high priority project changes
```json
{
  "conditions": [
    {
      "field": "project_priority",
      "operator": "equals",
      "value": "high"
    },
    {
      "field": "change_type",
      "operator": "in",
      "value": ["status_change", "budget_change"],
      "logical_operator": "AND"
    }
  ],
  "actions": [
    {
      "type": "notify",
      "parameters": {
        "channels": ["email", "in_app"],
        "template": "high_priority_change",
        "recipients": "project_stakeholders"
      }
    }
  ]
}
```

### 3. Access Control Rules
Control access to resources based on conditions.

**Example**: Restrict document access by department
```json
{
  "conditions": [
    {
      "field": "document_category",
      "operator": "equals",
      "value": "confidential"
    },
    {
      "field": "user_department",
      "operator": "not_in",
      "value": ["legal", "executive"],
      "logical_operator": "AND"
    }
  ],
  "actions": [
    {
      "type": "reject",
      "parameters": {
        "reason": "Department restriction",
        "notify_creator": true
      }
    }
  ]
}
```

### 4. Automation Rules
Automate repetitive tasks and assignments.

**Example**: Auto-assign reviewers by expertise
```json
{
  "conditions": [
    {
      "field": "document_framework",
      "operator": "exists",
      "value": true
    },
    {
      "field": "document_status",
      "operator": "equals",
      "value": "draft",
      "logical_operator": "AND"
    }
  ],
  "actions": [
    {
      "type": "assign",
      "parameters": {
        "assignee": "expertise_match",
        "role": "reviewer",
        "max_assignees": 3,
        "notify_assignee": true
      }
    }
  ]
}
```

### 5. Validation Rules
Validate data and enforce business rules.

**Example**: Validate project budget limits
```json
{
  "conditions": [
    {
      "field": "project_budget",
      "operator": "greater_than",
      "value": 100000
    }
  ],
  "actions": [
    {
      "type": "notify",
      "parameters": {
        "channels": ["email"],
        "message": "High budget project requires executive approval",
        "recipients": ["executives"]
      }
    },
    {
      "type": "log",
      "parameters": {
        "level": "warning",
        "message": "High budget project detected",
        "metadata": {
          "budget": "{{project_budget}}",
          "project_id": "{{project_id}}"
        }
      }
    }
  ]
}
```

## Rule Conditions

### Supported Operators

- `equals` - Exact match
- `not_equals` - Not equal
- `contains` - String contains (case-insensitive)
- `not_contains` - String does not contain
- `greater_than` - Numeric greater than
- `less_than` - Numeric less than
- `in` - Value in array
- `not_in` - Value not in array
- `exists` - Field exists and is not null
- `not_exists` - Field does not exist or is null

### Logical Operators

- `AND` - All conditions must be true
- `OR` - At least one condition must be true

### Field Access

Use dot notation to access nested fields:
- `user.role` - Access user role
- `project.team_members` - Access project team members
- `document.metadata.category` - Access nested metadata

## Rule Actions

### Available Action Types

#### 1. Notify
Send notifications through various channels.

```json
{
  "type": "notify",
  "parameters": {
    "channels": ["email", "in_app", "push"],
    "message": "Custom notification message",
    "template": "notification_template_id",
    "recipients": ["user_id_1", "user_id_2"],
    "delay": 5000
  }
}
```

#### 2. Approve
Automatically approve resources.

```json
{
  "type": "approve",
  "parameters": {
    "reason": "Auto-approved by rule",
    "notify_creator": true,
    "delay": 0
  }
}
```

#### 3. Reject
Automatically reject resources.

```json
{
  "type": "reject",
  "parameters": {
    "reason": "Rejected by business rule",
    "notify_creator": true,
    "delay": 0
  }
}
```

#### 4. Assign
Assign resources to users or roles.

```json
{
  "type": "assign",
  "parameters": {
    "assignee": "user_id_or_role",
    "role": "reviewer",
    "notify_assignee": true,
    "max_assignees": 3
  }
}
```

#### 5. Schedule
Schedule tasks or events.

```json
{
  "type": "schedule",
  "parameters": {
    "schedule": "weekly",
    "task_type": "generate_report",
    "parameters": {
      "template": "weekly_summary",
      "recipients": "project_stakeholders"
    }
  }
}
```

#### 6. Log
Log events for auditing.

```json
{
  "type": "log",
  "parameters": {
    "level": "info",
    "message": "Rule executed successfully",
    "metadata": {
      "rule_id": "{{rule_id}}",
      "context": "{{execution_context}}"
    }
  }
}
```

#### 7. Redirect
Redirect to external systems.

```json
{
  "type": "redirect",
  "parameters": {
    "url": "https://external-system.com/webhook",
    "method": "POST",
    "parameters": {
      "resource_id": "{{resource_id}}",
      "action": "processed"
    }
  }
}
```

#### 8. Custom
Execute custom action handlers.

```json
{
  "type": "custom",
  "parameters": {
    "handler": "custom_handler_function",
    "parameters": {
      "custom_param": "value"
    }
  }
}
```

## Rule Scopes

### User Scope
Rules apply only to the user who created them.

### Project Scope
Rules apply to all users within a specific project.

### Team Scope
Rules apply to all users within a specific team.

### Global Scope
Rules apply to all users system-wide (admin only).

## User Preferences

### Categories

#### UI Preferences
```json
{
  "category": "ui",
  "preference_key": "theme",
  "preference_value": {
    "mode": "dark",
    "primary_color": "blue",
    "sidebar_collapsed": false
  }
}
```

#### Notification Preferences
```json
{
  "category": "notifications",
  "preference_key": "default_settings",
  "preference_value": {
    "email": true,
    "in_app": true,
    "push": false,
    "frequency": "immediate"
  }
}
```

#### Workflow Preferences
```json
{
  "category": "workflow",
  "preference_key": "auto_save",
  "preference_value": {
    "enabled": true,
    "interval": 30000
  }
}
```

#### Integration Preferences
```json
{
  "category": "integrations",
  "preference_key": "confluence_settings",
  "preference_value": {
    "auto_sync": true,
    "sync_interval": "daily"
  }
}
```

#### Security Preferences
```json
{
  "category": "security",
  "preference_key": "session_timeout",
  "preference_value": {
    "duration": 3600000,
    "warn_before": 300000
  },
  "is_encrypted": true
}
```

## API Endpoints

### Rules Management

#### Get User Rules
```http
GET /api/user-rules/rules?scope=user&rule_type=workflow&is_active=true
```

#### Get Specific Rule
```http
GET /api/user-rules/rules/{rule_id}
```

#### Create Rule
```http
POST /api/user-rules/rules
Content-Type: application/json

{
  "name": "Auto-approve Documents",
  "description": "Automatically approve documents from trusted users",
  "rule_type": "workflow",
  "conditions": [...],
  "actions": [...],
  "priority": 10,
  "is_active": true,
  "scope": "user"
}
```

#### Update Rule
```http
PUT /api/user-rules/rules/{rule_id}
Content-Type: application/json

{
  "name": "Updated Rule Name",
  "is_active": false
}
```

#### Delete Rule
```http
DELETE /api/user-rules/rules/{rule_id}
```

### Preferences Management

#### Get User Preferences
```http
GET /api/user-rules/preferences?category=ui
```

#### Save Preference
```http
POST /api/user-rules/preferences
Content-Type: application/json

{
  "category": "ui",
  "preference_key": "theme",
  "preference_value": {
    "mode": "dark",
    "primary_color": "blue"
  },
  "is_encrypted": false
}
```

### Rule Templates

#### Get Rule Templates
```http
GET /api/user-rules/rule-templates?category=document_workflow
```

#### Create Rule from Template
```http
POST /api/user-rules/rules/from-template/{template_id}
Content-Type: application/json

{
  "name": "My Custom Rule",
  "description": "Customized from template",
  "scope": "project",
  "scope_id": "project-uuid"
}
```

### Rule Execution History

#### Get Rule Executions
```http
GET /api/user-rules/rules/{rule_id}/executions?limit=50&offset=0
```

## Frontend Usage

### Creating Rules

```typescript
import { apiClient } from '@/lib/api'

// Create a new rule
const newRule = await apiClient.createUserRule({
  name: "Auto-approve High Priority",
  description: "Auto-approve high priority documents",
  rule_type: "workflow",
  conditions: [
    {
      field: "document_priority",
      operator: "equals",
      value: "high"
    }
  ],
  actions: [
    {
      type: "approve",
      parameters: {
        reason: "High priority auto-approval",
        notify_creator: true
      }
    }
  ],
  priority: 10,
  is_active: true,
  scope: "user"
})
```

### Managing Preferences

```typescript
// Save a preference
await apiClient.saveUserPreference({
  category: "ui",
  preference_key: "theme",
  preference_value: {
    mode: "dark",
    primary_color: "blue"
  },
  is_encrypted: false
})

// Get preferences
const preferences = await apiClient.getUserPreferences("ui")
```

### Using the Rules Engine

```typescript
import { userRulesEngine, RuleExecutionContext } from '@/lib/user-rules-engine'

// Create execution context
const context: RuleExecutionContext = {
  user_id: "user-uuid",
  resource_type: "document",
  resource_id: "document-uuid",
  resource_data: {
    priority: "high",
    status: "pending_approval",
    created_by: "user-uuid"
  },
  event_type: "document_created",
  timestamp: new Date(),
  metadata: {}
}

// Process rules
await userRulesEngine.processRules(context)
```

## Security Considerations

### Authentication & Authorization
- All API endpoints require valid JWT authentication
- Role-based permissions control access to rule management
- Users can only manage their own rules (unless admin)

### Data Protection
- Sensitive preferences can be encrypted
- Rule execution history is logged for auditing
- System rules cannot be modified by users

### Validation
- All input is validated using Joi schemas
- Rule conditions and actions are validated before execution
- SQL injection protection through parameterized queries

## Performance Considerations

### Database Optimization
- Indexes on frequently queried fields
- JSONB for flexible rule storage
- Connection pooling for database access

### Rule Execution
- Rules are evaluated in priority order
- Failed rule executions don't block other rules
- Execution time is tracked and logged

### Caching
- Rule templates are cached for performance
- User preferences are cached in memory
- Redis can be used for distributed caching

## Monitoring & Debugging

### Execution Logging
- All rule executions are logged with context
- Performance metrics are tracked
- Error messages are captured for debugging

### Audit Trail
- Rule creation, modification, and deletion are logged
- User actions are tracked with timestamps
- System administrators can view all rule activities

### Debugging Tools
- Rule execution history with detailed context
- Performance metrics and timing information
- Error logs with stack traces

## Best Practices

### Rule Design
1. **Keep rules simple** - Complex rules are harder to debug
2. **Use descriptive names** - Clear naming helps with maintenance
3. **Test thoroughly** - Validate rules with different scenarios
4. **Document purpose** - Include clear descriptions
5. **Set appropriate priorities** - Higher priority rules execute first

### Performance
1. **Limit rule complexity** - Avoid deeply nested conditions
2. **Use efficient operators** - Prefer `equals` over `contains` when possible
3. **Scope appropriately** - Use the narrowest scope possible
4. **Monitor execution time** - Track and optimize slow rules

### Security
1. **Validate all inputs** - Never trust user-provided data
2. **Use least privilege** - Grant minimal necessary permissions
3. **Encrypt sensitive data** - Use encryption for sensitive preferences
4. **Audit regularly** - Review rule executions and modifications

### Maintenance
1. **Regular cleanup** - Remove unused or obsolete rules
2. **Version control** - Track rule changes over time
3. **Backup rules** - Export important rules for backup
4. **Monitor usage** - Track which rules are most/least used

## Migration Guide

### Database Migration
Run the migration script to create the required tables:

```bash
npm run migrate
```

### Data Migration
If migrating from an existing system:

1. Export existing rules and preferences
2. Transform data to match new schema
3. Import using the API endpoints
4. Verify data integrity

### Configuration
Update environment variables for the new endpoints:

```env
# Add to your .env file
USER_RULES_ENABLED=true
RULE_EXECUTION_TIMEOUT=30000
MAX_RULES_PER_USER=100
```

## Troubleshooting

### Common Issues

#### Rules Not Executing
- Check if rule is active
- Verify scope permissions
- Review execution logs for errors
- Ensure conditions are properly formatted

#### Performance Issues
- Check rule complexity
- Review database indexes
- Monitor execution times
- Consider rule prioritization

#### Permission Errors
- Verify user authentication
- Check role-based permissions
- Ensure proper scope access
- Review system rule restrictions

### Debug Mode
Enable debug logging for detailed rule execution information:

```env
DEBUG=user-rules:*
```

### Support
For additional support:
- Check the execution logs
- Review the audit trail
- Contact system administrators
- Submit bug reports with context

## Future Enhancements

### Planned Features
1. **Visual Rule Builder** - Drag-and-drop rule creation interface
2. **Rule Testing** - Test rules against sample data
3. **Rule Analytics** - Usage statistics and performance metrics
4. **Advanced Conditions** - More complex condition logic
5. **Rule Versioning** - Track rule changes over time
6. **Bulk Operations** - Import/export multiple rules
7. **Rule Dependencies** - Rules that depend on other rules
8. **Scheduled Rules** - Time-based rule execution
9. **External Integrations** - Webhook and API integrations
10. **Machine Learning** - AI-powered rule suggestions

### API Versioning
The API will be versioned to support backward compatibility:

- `/api/v1/user-rules/` - Current version
- `/api/v2/user-rules/` - Future enhancements

### Extensibility
The system is designed to be extensible:

- Custom action types can be added
- New condition operators can be implemented
- Integration with external systems is supported
- Plugin architecture for custom functionality

This comprehensive user rules and preferences system provides the flexibility and power needed for enterprise-level automation while maintaining security, performance, and ease of use.
