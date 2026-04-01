# Playbook Lifecycle Management Database Schema

## Overview

This document describes the database schema for the Playbook Lifecycle Management system in ADPA. The schema consists of 7 main tables that support the complete lifecycle of playbooks from creation through resolution and continuous improvement.

## Table Structure

### 1. playbook_templates

**Purpose**: Core playbook template data with lifecycle management fields

**Key Columns**:
- `id` (UUID): Primary key
- `name` (VARCHAR): Playbook name
- `purpose` (VARCHAR): Playbook purpose/description
- `severity_model` (JSONB): Severity levels and classification rules
- `escalation_rules` (JSONB): Escalation rules with conditions and paths
- `actions` (JSONB): Actions to be taken
- `automations` (JSONB): Automated actions
- `compliance_references` (JSONB): Compliance framework references

**Lifecycle Fields**:
- `status` (VARCHAR): draft, testing, active, deprecated
- `version_major`, `version_minor`, `version_micro` (INT): Semantic versioning
- `qa_score` (DECIMAL): Overall QA score (0-100)
- `qa_status` (VARCHAR): passed, failed, pending
- `quality_gate_status` (VARCHAR): passed, failed, blocked
- `drift_detection_enabled` (BOOLEAN): Whether drift detection is active
- `alignment_score` (DECIMAL): PMBOK/standards alignment (0-100)
- `review_workflow_state` (VARCHAR): draft, in_review, approved, rejected

**Metadata**:
- `created_by`, `created_at`: Creation tracking
- `updated_by`, `updated_at`: Update tracking
- `deleted_by`, `deleted_at`: Soft delete tracking
- `usage_count` (INT): Number of times used
- `is_public` (BOOLEAN): Public/private visibility

**Indexes**:
- `idx_playbook_templates_status`: For filtering by status
- `idx_playbook_templates_created_by`: For user's playbooks
- `idx_playbook_templates_deleted_at`: For soft delete queries
- `idx_playbook_templates_is_public`: For public playbooks
- `idx_playbook_templates_qa_status`: For QA filtering
- `idx_playbook_templates_review_state`: For review workflow

---

### 2. playbook_versions

**Purpose**: Version history for playbooks with change tracking

**Key Columns**:
- `id` (UUID): Primary key
- `playbook_id` (UUID): Foreign key to playbook_templates
- `version_major`, `version_minor`, `version_micro` (INT): Version numbers
- `content` (JSONB): Full playbook content snapshot
- `system_prompt` (TEXT): LLM system prompt for this version
- `change_summary` (TEXT): Summary of changes
- `change_type` (VARCHAR): editorial, structural, policy
- `qa_score` (DECIMAL): QA score for this version
- `qa_results` (JSONB): Detailed QA results
- `qa_passed_at` (TIMESTAMP): When QA passed
- `created_by` (UUID): Who created this version
- `created_at` (TIMESTAMP): When created

**Constraints**:
- UNIQUE(playbook_id, version_major, version_minor, version_micro)
- Foreign key to playbook_templates with CASCADE delete

**Indexes**:
- `idx_playbook_versions_playbook_id`: For version history queries
- `idx_playbook_versions_created_at`: For timeline queries
- `idx_playbook_versions_change_type`: For change type filtering

**Versioning Rules**:
- **Editorial** (micro): Content/wording changes only
- **Structural** (minor): Changes to structure/rules
- **Policy** (major): Fundamental policy changes

---

### 3. playbook_extracted_entities

**Purpose**: Entities extracted from playbooks for drift detection and analysis

**Key Columns**:
- `id` (UUID): Primary key
- `playbook_id` (UUID): Foreign key to playbook_templates
- `version_id` (UUID): Foreign key to playbook_versions
- `entity_type` (VARCHAR): role, timeline, risk_definition, tool, incident_category
- `entity_name` (VARCHAR): Name of the entity
- `entity_value` (JSONB): Entity data/properties
- `extracted_at` (TIMESTAMP): When extracted
- `extraction_confidence` (DECIMAL): Confidence score (0-1)
- `source_section` (VARCHAR): Where in playbook it came from

**Entity Types**:
- **role**: Escalation roles/responsibilities
- **timeline**: SLA timelines and response times
- **risk_definition**: Risk definitions and severity levels
- **tool**: Tools and automations
- **incident_category**: Incident categories and classifications

**Indexes**:
- `idx_playbook_extracted_entities_playbook_id`: For playbook queries
- `idx_playbook_extracted_entities_version_id`: For version queries
- `idx_playbook_extracted_entities_entity_type`: For entity type filtering
- `idx_playbook_extracted_entities_entity_name`: For entity name lookup

---

### 4. playbook_drift_records

**Purpose**: Records of detected drift between playbook versions

**Key Columns**:
- `id` (UUID): Primary key
- `playbook_id` (UUID): Foreign key to playbook_templates
- `from_version_id` (UUID): Previous version
- `to_version_id` (UUID): New version
- `drift_type` (VARCHAR): Type of drift detected
- `entity_type` (VARCHAR): Type of entity that drifted
- `entity_name` (VARCHAR): Name of entity
- `old_value` (JSONB): Previous value
- `new_value` (JSONB): New value
- `notification_sent` (BOOLEAN): Whether owner was notified
- `notified_at` (TIMESTAMP): When notification sent
- `notified_to` (UUID): Who was notified
- `detected_at` (TIMESTAMP): When drift detected
- `severity` (VARCHAR): low, medium, high, critical

**Drift Types**:
- `role_change`: Escalation roles changed
- `timeline_change`: SLA timelines changed
- `risk_change`: Risk definitions changed
- `tool_change`: Tools/automations changed
- `category_change`: Incident categories changed

**Severity Classification**:
- **Critical**: Role changes, risk definition changes
- **High**: Timeline changes
- **Medium**: Tool changes
- **Low**: Category changes

**Indexes**:
- `idx_playbook_drift_records_playbook_id`: For playbook queries
- `idx_playbook_drift_records_notification_sent`: For unnotified drifts
- `idx_playbook_drift_records_severity`: For severity filtering
- `idx_playbook_drift_records_detected_at`: For timeline queries

---

### 5. playbook_qa_results

**Purpose**: Quality assurance results and scores for playbooks

**Key Columns**:
- `id` (UUID): Primary key
- `playbook_id` (UUID): Foreign key to playbook_templates
- `version_id` (UUID): Foreign key to playbook_versions
- `severity_coverage_score` (DECIMAL): Coverage of severity levels
- `escalation_timing_score` (DECIMAL): SLA timing completeness
- `decision_tree_score` (DECIMAL): Decision tree completeness
- `governance_links_score` (DECIMAL): Compliance references
- `entity_consistency_score` (DECIMAL): Role consistency
- `pmbok_alignment_score` (DECIMAL): PMBOK alignment
- `overall_score` (DECIMAL): Average of all scores (0-100)
- `status` (VARCHAR): passed (>= 80), failed (< 80), pending
- `failed_checks` (JSONB): Details of failed checks
- `recommendations` (JSONB): Improvement recommendations
- `run_by` (UUID): Who ran the QA
- `run_at` (TIMESTAMP): When QA ran

**QA Checks**:
1. **Severity Coverage**: All required severity levels present
2. **Escalation Timing**: All rules have SLA timing
3. **Decision Tree**: Complete decision tree with conditions and actions
4. **Governance Links**: Compliance framework references
5. **Entity Consistency**: Roles consistent across rules and actions
6. **PMBOK Alignment**: Alignment with PMBOK knowledge areas

**Quality Gate**:
- **Threshold**: Overall score must be >= 80
- **Status**: Passed if all checks pass, Failed otherwise
- **Blocking**: Failed QA blocks deployment

**Indexes**:
- `idx_playbook_qa_results_playbook_id`: For playbook queries
- `idx_playbook_qa_results_version_id`: For version queries
- `idx_playbook_qa_results_status`: For status filtering
- `idx_playbook_qa_results_run_at`: For timeline queries

---

### 6. playbook_escalation_records

**Purpose**: Records of escalation guidance provided to users

**Key Columns**:
- `id` (UUID): Primary key
- `playbook_id` (UUID): Foreign key to playbook_templates
- `trigger_type` (VARCHAR): ai_prediction, threshold, user_submission
- `trigger_data` (JSONB): Data that triggered escalation
- `guidance_content` (JSONB): Generated guidance
- `decision_tree` (JSONB): Decision tree for user
- `communication_templates` (JSONB): Communication templates
- `risk_assessment` (JSONB): Risk assessment
- `automations_triggered` (JSONB): Automations to trigger
- `user_id` (UUID): User receiving guidance
- `guidance_provided_at` (TIMESTAMP): When guidance provided
- `user_action` (VARCHAR): accepted, modified, rejected
- `user_action_at` (TIMESTAMP): When user acted
- `resolution_status` (VARCHAR): pending, in_progress, resolved, escalated
- `resolved_at` (TIMESTAMP): When resolved
- `resolution_notes` (TEXT): Resolution details

**Trigger Types**:
- **ai_prediction**: AI model predicted escalation needed
- **threshold**: Metric threshold exceeded
- **user_submission**: User manually triggered

**User Actions**:
- **accepted**: User accepted guidance as-is
- **modified**: User modified guidance
- **rejected**: User rejected guidance

**Resolution Status**:
- **pending**: Awaiting user action
- **in_progress**: User is working on resolution
- **resolved**: Issue resolved
- **escalated**: Escalated to higher level

**Indexes**:
- `idx_playbook_escalation_records_playbook_id`: For playbook queries
- `idx_playbook_escalation_records_user_id`: For user queries
- `idx_playbook_escalation_records_resolution_status`: For status filtering
- `idx_playbook_escalation_records_guidance_provided_at`: For timeline queries
- `idx_playbook_escalation_records_trigger_type`: For trigger type filtering

---

### 7. playbook_resolution_analytics

**Purpose**: Post-resolution analytics and improvement recommendations

**Key Columns**:
- `id` (UUID): Primary key
- `escalation_record_id` (UUID): Foreign key to playbook_escalation_records
- `playbook_id` (UUID): Foreign key to playbook_templates
- `expected_outcome` (JSONB): Expected outcome from guidance
- `actual_outcome` (JSONB): Actual outcome achieved
- `outcome_variance` (DECIMAL): Variance between expected/actual (0-1)
- `extracted_entities` (JSONB): Entities extracted from resolution
- `entity_changes` (JSONB): Changes to entities
- `model_update_recommended` (BOOLEAN): Whether ML model should be updated
- `model_update_reason` (TEXT): Why model update recommended
- `model_update_data` (JSONB): Data for model update
- `version_update_recommended` (BOOLEAN): Whether playbook should be updated
- `version_update_reason` (TEXT): Why version update recommended
- `version_update_suggestions` (JSONB): Specific suggestions
- `analyzed_at` (TIMESTAMP): When analyzed
- `analyzed_by` (UUID): Who analyzed

**Variance Calculation**:
- Uses Levenshtein distance algorithm
- Compares expected vs actual outcomes
- Threshold: > 20% variance triggers model update recommendation

**Improvement Recommendations**:
- **Model Update**: When variance > 20%
- **Version Update**: When entity changes detected
- **Suggestions**: Specific improvements to playbook

**Indexes**:
- `idx_playbook_resolution_analytics_playbook_id`: For playbook queries
- `idx_playbook_resolution_analytics_escalation_record_id`: For escalation queries
- `idx_playbook_resolution_analytics_model_update_recommended`: For model updates
- `idx_playbook_resolution_analytics_version_update_recommended`: For version updates
- `idx_playbook_resolution_analytics_analyzed_at`: For timeline queries

---

## Data Flow

### Playbook Creation Flow
```
1. Create playbook_templates record (status: draft)
2. Create initial playbook_versions record (v1.0.0)
3. Extract entities -> playbook_extracted_entities
4. Run QA checks -> playbook_qa_results
5. If QA passes, move to testing status
```

### Escalation Flow
```
1. Trigger detected (AI/threshold/user)
2. Create playbook_escalation_records record
3. Generate guidance content
4. User takes action (accept/modify/reject)
5. Update resolution_status
6. Analyze resolution -> playbook_resolution_analytics
7. Generate improvement recommendations
```

### Drift Detection Flow
```
1. New version created -> playbook_versions
2. Extract entities from new version
3. Compare with previous version entities
4. Create playbook_drift_records for changes
5. Send notifications to template owner
6. Owner acknowledges drift
```

## Performance Considerations

### Indexes
- All foreign keys are indexed
- Status columns are indexed for filtering
- Timestamps are indexed for range queries
- User IDs are indexed for access control

### Query Optimization
- Use indexes for WHERE clauses
- Pagination for large result sets
- JSONB operators for nested queries
- Materialized views for complex aggregations

### Maintenance
- Archive old escalation records (> 1 year)
- Purge deleted playbooks (> 90 days)
- Analyze tables monthly
- Vacuum tables weekly

## Constraints

### Referential Integrity
- All foreign keys enforce referential integrity
- CASCADE delete for versions and entities
- RESTRICT delete for playbooks with active escalations

### Data Validation
- Version numbers must be unique per playbook
- QA scores must be 0-100
- Confidence scores must be 0-1
- Variance must be 0-1

## Migration Notes

### Prerequisites
- PostgreSQL 12+
- `users` table must exist
- UUID extension enabled

### Rollback
```sql
DROP TABLE IF EXISTS playbook_resolution_analytics CASCADE;
DROP TABLE IF EXISTS playbook_escalation_records CASCADE;
DROP TABLE IF EXISTS playbook_qa_results CASCADE;
DROP TABLE IF EXISTS playbook_drift_records CASCADE;
DROP TABLE IF EXISTS playbook_extracted_entities CASCADE;
DROP TABLE IF EXISTS playbook_versions CASCADE;
DROP TABLE IF EXISTS playbook_templates CASCADE;
```

## Future Enhancements

1. **Partitioning**: Partition escalation records by date
2. **Archiving**: Archive old records to separate schema
3. **Materialized Views**: For analytics dashboards
4. **Full-Text Search**: For playbook content search
5. **Audit Logging**: Detailed change tracking

## Related Documentation

- [Playbook Management Service](../playbookManagement/README.md)
- [QA Module](../playbookQA/README.md)
- [Drift Detection](../driftDetection/README.md)
- [Escalation Guidance](../escalationGuidance/README.md)
- [Analytics Module](../postResolutionAnalytics/README.md)
