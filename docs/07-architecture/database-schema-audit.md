# ADPA Database Schema Audit Report
Generated: 2025-10-18T11:56:56.636Z

## Overview
Total tables: 93

## Tables

### ai_model_configurations
- **Row Count**: 14
- **Size**: 112 kB
- **Status**: ✅ Populated

#### Columns (15)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| provider_id | uuid | NO | NULL |
| model_id | character varying | NO | NULL |
| model_name | character varying | NO | NULL |
| is_active | boolean | YES | true |
| context_window | integer | YES | 128000 |
| max_tokens | integer | YES | 4096 |
| temperature | numeric | YES | 0.70 |
| top_p | numeric | YES | 1.00 |
| frequency_penalty | numeric | YES | 0.00 |
| presence_penalty | numeric | YES | 0.00 |
| configuration | jsonb | YES | '{}'::jsonb |
| usage_stats | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

#### Indexes (6)
- `ai_model_configurations_pkey`
- `ai_model_configurations_provider_id_model_id_key`
- `idx_ai_model_configurations_provider_id`
- `idx_ai_model_configurations_model_id`
- `idx_ai_model_configurations_is_active`
- `idx_ai_model_configurations_created_at`

#### Foreign Keys (1)
- `provider_id` → `ai_providers.id`

### ai_providers
- **Row Count**: 6
- **Size**: 384 kB
- **Status**: ✅ Populated

#### Columns (13)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| name | character varying | NO | NULL |
| provider_type | character varying | NO | NULL |
| api_key_encrypted | text | YES | NULL |
| configuration | jsonb | YES | '{}'::jsonb |
| is_active | boolean | YES | true |
| usage_stats | jsonb | YES | '{}'::jsonb |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| priority | integer | YES | 1 |
| rate_limits | jsonb | YES | '{"requestsPerDay": 10000, "tokensPerMinute": 90000, "requestsPerMinute": 3500}'::jsonb |
| available_models | jsonb | YES | '[]'::jsonb |
| default_model | character varying | YES | NULL |

#### Indexes (4)
- `ai_providers_pkey`
- `idx_ai_providers_priority`
- `idx_ai_providers_type_active`
- `idx_ai_providers_default_model`

### analysis_metrics
- **Row Count**: 0
- **Size**: 24 kB
- **Status**: ⚠️ Empty

#### Columns (11)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| metric_date | date | NO | NULL |
| total_analyses | integer | YES | 0 |
| pattern_analyses | integer | YES | 0 |
| quality_analyses | integer | YES | 0 |
| compliance_analyses | integer | YES | 0 |
| average_analysis_time | integer | YES | 0 |
| patterns_identified | integer | YES | 0 |
| best_practices_identified | integer | YES | 0 |
| improvement_suggestions_generated | integer | YES | 0 |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (3)
- `analysis_metrics_pkey`
- `analysis_metrics_metric_date_key`
- `idx_analysis_metrics_metric_date`

### analytics_events
- **Row Count**: 0
- **Size**: 32 kB
- **Status**: ⚠️ Empty

#### Columns (6)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| event_type | character varying | NO | NULL |
| user_id | uuid | YES | NULL |
| project_id | uuid | YES | NULL |
| properties | jsonb | YES | NULL |
| timestamp | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (3)
- `analytics_events_pkey`
- `idx_analytics_events_type`
- `idx_analytics_events_timestamp`

#### Foreign Keys (2)
- `project_id` → `projects.id`
- `user_id` → `users.id`

### api_request_logs
- **Row Count**: 13.589
- **Size**: 7632 kB
- **Status**: ✅ Populated

#### Columns (13)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| method | character varying | NO | NULL |
| path | text | NO | NULL |
| endpoint | character varying | YES | NULL |
| response_time_ms | integer | NO | NULL |
| status_code | integer | NO | NULL |
| user_id | uuid | YES | NULL |
| ip_address | inet | YES | NULL |
| user_agent | text | YES | NULL |
| request_size | integer | YES | 0 |
| response_size | integer | YES | 0 |
| error_message | text | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `api_request_logs_pkey`
- `idx_api_logs_endpoint`
- `idx_api_logs_user`
- `idx_api_logs_status`
- `idx_api_logs_created`

#### Foreign Keys (1)
- `user_id` → `users.id`

### audit_logs
- **Row Count**: 55
- **Size**: 160 kB
- **Status**: ✅ Populated

#### Columns (10)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| user_id | uuid | YES | NULL |
| action | character varying | NO | NULL |
| resource_type | character varying | YES | NULL |
| resource_id | uuid | YES | NULL |
| old_values | jsonb | YES | NULL |
| new_values | jsonb | YES | NULL |
| ip_address | inet | YES | NULL |
| user_agent | text | YES | NULL |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (3)
- `audit_logs_pkey`
- `idx_audit_logs_user`
- `idx_audit_logs_created_at`

#### Foreign Keys (1)
- `user_id` → `users.id`

### best_practices
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (14)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| name | character varying | NO | NULL |
| description | text | NO | NULL |
| framework | character varying | NO | NULL |
| category | character varying | YES | NULL |
| practice_type | character varying | YES | 'structure'::character varying |
| effectiveness_score | numeric | YES | 0.5 |
| usage_frequency | integer | YES | 1 |
| examples | ARRAY | YES | '{}'::text[] |
| implementation_guidance | text | YES | NULL |
| success_metrics | ARRAY | YES | '{}'::text[] |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (4)
- `best_practices_pkey`
- `idx_best_practices_framework`
- `idx_best_practices_category`
- `idx_best_practices_effectiveness_score`

### compression_feedback
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (6)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| document_id | uuid | YES | NULL |
| rating | integer | YES | NULL |
| feedback | text | YES | NULL |
| compression_method | character varying | NO | NULL |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (4)
- `compression_feedback_pkey`
- `idx_compression_feedback_document_id`
- `idx_compression_feedback_method`
- `idx_compression_feedback_created_at`

#### Foreign Keys (1)
- `document_id` → `documents.id`

### compression_metrics
- **Row Count**: 145
- **Size**: 128 kB
- **Status**: ✅ Populated

#### Columns (6)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| document_id | uuid | YES | NULL |
| strategy_used | character varying | NO | NULL |
| quality_metrics | jsonb | YES | '{}'::jsonb |
| processing_time_ms | integer | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (4)
- `compression_metrics_pkey`
- `idx_compression_metrics_document_id`
- `idx_compression_metrics_created_at`
- `idx_compression_metrics_strategy`

#### Foreign Keys (1)
- `document_id` → `documents.id`

### compression_strategies
- **Row Count**: 4
- **Size**: 96 kB
- **Status**: ✅ Populated

#### Columns (10)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| method | character varying | NO | NULL |
| project_type | character varying | YES | NULL |
| document_type | character varying | YES | NULL |
| quality_metrics | jsonb | YES | NULL |
| average_rating | numeric | YES | 0 |
| total_ratings | integer | YES | 0 |
| usage_count | integer | YES | 0 |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `compression_strategies_pkey`
- `compression_strategies_method_key`
- `idx_compression_strategies_method`
- `idx_compression_strategies_project_type`
- `idx_compression_strategies_document_type`

### constraints
- **Row Count**: 0
- **Size**: 32 kB
- **Status**: ⚠️ Empty

#### Columns (11)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | NULL |
| name | character varying | NO | NULL |
| description | text | NO | NULL |
| type | character varying | YES | 'technical'::character varying |
| impact | character varying | YES | 'medium'::character varying |
| mitigation_strategy | text | YES | NULL |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| deleted_at | timestamp with time zone | YES | NULL |

#### Indexes (3)
- `constraints_pkey`
- `idx_constraints_project_id`
- `idx_constraints_impact`

#### Foreign Keys (1)
- `project_id` → `projects.id`

### context_bundles
- **Row Count**: 0
- **Size**: 88 kB
- **Status**: ⚠️ Empty

#### Columns (10)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| template_id | uuid | NO | NULL |
| project_id | uuid | YES | NULL |
| user_id | uuid | NO | NULL |
| results | jsonb | NO | '[]'::jsonb |
| metadata | jsonb | NO | '{}'::jsonb |
| injection_strategy | character varying | NO | 'prepend'::character varying |
| max_context_length | integer | NO | 4000 |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |

#### Indexes (8)
- `context_bundles_pkey`
- `idx_context_bundles_template_id`
- `idx_context_bundles_project_id`
- `idx_context_bundles_user_id`
- `idx_context_bundles_created_at`
- `idx_context_bundles_results`
- `idx_context_bundles_metadata`
- `idx_context_bundles_updated_at`

#### Foreign Keys (3)
- `project_id` → `projects.id`
- `template_id` → `templates.id`
- `user_id` → `users.id`

### context_cleanup_results
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (15)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| cleanup_id | character varying | NO | NULL |
| started_at | timestamp with time zone | NO | NULL |
| completed_at | timestamp with time zone | NO | NULL |
| duration | integer | NO | NULL |
| contexts_processed | integer | YES | 0 |
| contexts_cleaned | integer | YES | 0 |
| contexts_refreshed | integer | YES | 0 |
| contexts_archived | integer | YES | 0 |
| contexts_deleted | integer | YES | 0 |
| storage_freed | bigint | YES | 0 |
| performance_improvement | numeric | YES | 0.0 |
| errors | jsonb | YES | '[]'::jsonb |
| summary | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (4)
- `context_cleanup_results_pkey`
- `context_cleanup_results_cleanup_id_key`
- `idx_context_cleanup_results_cleanup_id`
- `idx_context_cleanup_results_started_at`

### context_freshness_assessments
- **Row Count**: 0
- **Size**: 48 kB
- **Status**: ⚠️ Empty

#### Columns (12)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| context_id | uuid | NO | NULL |
| assessed_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| freshness_score | numeric | NO | NULL |
| staleness_level | character varying | NO | NULL |
| decay_rate | numeric | YES | 0.0 |
| time_since_update | integer | YES | 0 |
| time_since_access | integer | YES | 0 |
| freshness_trend | jsonb | YES | '{}'::jsonb |
| recommendations | jsonb | YES | '[]'::jsonb |
| next_assessment_at | timestamp with time zone | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `context_freshness_assessments_pkey`
- `idx_context_freshness_assessments_context_id`
- `idx_context_freshness_assessments_assessed_at`
- `idx_context_freshness_assessments_freshness_score`
- `idx_context_freshness_assessments_staleness_level`

#### Foreign Keys (1)
- `context_id` → `context_items.id`

### context_freshness_health_status
- **Row Count**: 0
- **Size**: 16 kB
- **Status**: ⚠️ Empty

#### Columns (9)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| overall_health | character varying | NO | NULL |
| health_score | numeric | NO | NULL |
| component_health | jsonb | YES | '[]'::jsonb |
| alerts | jsonb | YES | '[]'::jsonb |
| recommendations | jsonb | YES | '[]'::jsonb |
| last_assessment | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| next_assessment | timestamp with time zone | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (1)
- `context_freshness_health_status_pkey`

### context_freshness_metrics
- **Row Count**: 0
- **Size**: 32 kB
- **Status**: ⚠️ Empty

#### Columns (12)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| metric_date | date | NO | NULL |
| total_contexts | integer | YES | 0 |
| fresh_contexts | integer | YES | 0 |
| stale_contexts | integer | YES | 0 |
| expired_contexts | integer | YES | 0 |
| average_freshness_score | numeric | YES | 0.0 |
| freshness_distribution | jsonb | YES | '{}'::jsonb |
| staleness_trends | jsonb | YES | '[]'::jsonb |
| refresh_statistics | jsonb | YES | '{}'::jsonb |
| performance_metrics | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (3)
- `context_freshness_metrics_pkey`
- `context_freshness_metrics_metric_date_key`
- `idx_context_freshness_metrics_metric_date`

### context_freshness_policies
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (15)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| policy_id | character varying | NO | NULL |
| name | character varying | NO | NULL |
| description | text | YES | NULL |
| context_types | ARRAY | YES | '{}'::text[] |
| freshness_rules | jsonb | YES | '[]'::jsonb |
| staleness_thresholds | jsonb | YES | '[]'::jsonb |
| refresh_strategies | jsonb | YES | '[]'::jsonb |
| cleanup_rules | jsonb | YES | '[]'::jsonb |
| priority_rules | jsonb | YES | '[]'::jsonb |
| enabled | boolean | YES | true |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| created_by | character varying | NO | NULL |
| metadata | jsonb | YES | '{}'::jsonb |

#### Indexes (4)
- `context_freshness_policies_pkey`
- `context_freshness_policies_policy_id_key`
- `idx_context_freshness_policies_policy_id`
- `idx_context_freshness_policies_enabled`

### context_freshness_policy_evaluations
- **Row Count**: 0
- **Size**: 32 kB
- **Status**: ⚠️ Empty

#### Columns (12)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| policy_id | character varying | NO | NULL |
| evaluated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| contexts_evaluated | integer | YES | 0 |
| actions_recommended | integer | YES | 0 |
| actions_executed | integer | YES | 0 |
| success_rate | numeric | YES | 0.0 |
| performance_impact | jsonb | YES | '{}'::jsonb |
| quality_impact | jsonb | YES | '{}'::jsonb |
| cost_benefit_analysis | jsonb | YES | '{}'::jsonb |
| recommendations | jsonb | YES | '[]'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (3)
- `context_freshness_policy_evaluations_pkey`
- `idx_context_freshness_policy_evaluations_policy_id`
- `idx_context_freshness_policy_evaluations_evaluated_at`

#### Foreign Keys (1)
- `policy_id` → `context_freshness_policies.policy_id`

### context_freshness_policy_results
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (10)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| policy_id | character varying | NO | NULL |
| context_id | uuid | NO | NULL |
| applied_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| success | boolean | YES | true |
| actions_taken | jsonb | YES | '[]'::jsonb |
| performance_impact | jsonb | YES | '{}'::jsonb |
| quality_impact | jsonb | YES | '{}'::jsonb |
| error_message | text | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (4)
- `context_freshness_policy_results_pkey`
- `idx_context_freshness_policy_results_policy_id`
- `idx_context_freshness_policy_results_context_id`
- `idx_context_freshness_policy_results_applied_at`

#### Foreign Keys (2)
- `context_id` → `context_items.id`
- `policy_id` → `context_freshness_policies.policy_id`

### context_freshness_trends
- **Row Count**: 0
- **Size**: 32 kB
- **Status**: ⚠️ Empty

#### Columns (10)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| context_id | uuid | NO | NULL |
| timeframe | character varying | NO | NULL |
| trend_data | jsonb | YES | '[]'::jsonb |
| trend_direction | character varying | YES | 'stable'::character varying |
| trend_strength | numeric | YES | 0.0 |
| seasonality | boolean | YES | false |
| forecast | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (3)
- `context_freshness_trends_pkey`
- `idx_context_freshness_trends_context_id`
- `idx_context_freshness_trends_timeframe`

#### Foreign Keys (1)
- `context_id` → `context_items.id`

### context_items
- **Row Count**: 0
- **Size**: 64 kB
- **Status**: ⚠️ Empty

#### Columns (16)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| type | character varying | NO | NULL |
| source | character varying | NO | NULL |
| content | jsonb | NO | '{}'::jsonb |
| metadata | jsonb | NO | '{}'::jsonb |
| freshness_score | numeric | YES | 1.0 |
| is_stale | boolean | YES | false |
| staleness_reason | text | YES | NULL |
| marked_stale_at | timestamp with time zone | YES | NULL |
| is_archived | boolean | YES | false |
| archived_at | timestamp with time zone | YES | NULL |
| last_refreshed_at | timestamp with time zone | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| last_accessed_at | timestamp with time zone | YES | NULL |
| expires_at | timestamp with time zone | YES | NULL |

#### Indexes (7)
- `context_items_pkey`
- `idx_context_items_type`
- `idx_context_items_freshness_score`
- `idx_context_items_is_stale`
- `idx_context_items_updated_at`
- `idx_context_items_last_accessed_at`
- `idx_context_items_expires_at`

### context_refresh_results
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (11)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| context_id | uuid | NO | NULL |
| refreshed_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| refresh_duration | integer | YES | 0 |
| success | boolean | YES | true |
| new_freshness_score | numeric | YES | 0.0 |
| changes_detected | boolean | YES | false |
| change_summary | jsonb | YES | '[]'::jsonb |
| error_message | text | YES | NULL |
| performance_metrics | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (4)
- `context_refresh_results_pkey`
- `idx_context_refresh_results_context_id`
- `idx_context_refresh_results_refreshed_at`
- `idx_context_refresh_results_success`

#### Foreign Keys (1)
- `context_id` → `context_items.id`

### context_refresh_schedules
- **Row Count**: 0
- **Size**: 56 kB
- **Status**: ⚠️ Empty

#### Columns (17)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| schedule_id | character varying | NO | NULL |
| context_id | uuid | NO | NULL |
| schedule_type | character varying | NO | NULL |
| frequency | character varying | NO | NULL |
| start_time | timestamp with time zone | NO | NULL |
| end_time | timestamp with time zone | YES | NULL |
| timezone | character varying | YES | 'UTC'::character varying |
| enabled | boolean | YES | true |
| last_execution | timestamp with time zone | YES | NULL |
| next_execution | timestamp with time zone | YES | NULL |
| execution_count | integer | YES | 0 |
| success_count | integer | YES | 0 |
| failure_count | integer | YES | 0 |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (6)
- `context_refresh_schedules_pkey`
- `context_refresh_schedules_schedule_id_key`
- `idx_context_refresh_schedules_context_id`
- `idx_context_refresh_schedules_schedule_type`
- `idx_context_refresh_schedules_enabled`
- `idx_context_refresh_schedules_next_execution`

#### Foreign Keys (1)
- `context_id` → `context_items.id`

### context_retrieval_metrics
- **Row Count**: 0
- **Size**: 24 kB
- **Status**: ⚠️ Empty

#### Columns (12)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| metric_date | date | NO | NULL |
| total_queries | integer | YES | 0 |
| successful_queries | integer | YES | 0 |
| failed_queries | integer | YES | 0 |
| average_response_time | integer | YES | 0 |
| cache_hit_rate | numeric | YES | 0.0 |
| average_relevance_score | numeric | YES | 0.0 |
| semantic_search_usage | integer | YES | 0 |
| keyword_search_usage | integer | YES | 0 |
| hybrid_search_usage | integer | YES | 0 |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (3)
- `context_retrieval_metrics_pkey`
- `context_retrieval_metrics_metric_date_key`
- `idx_context_retrieval_metrics_metric_date`

### context_staleness_log
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (7)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| context_id | uuid | NO | NULL |
| action | character varying | NO | NULL |
| reason | text | NO | NULL |
| performed_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| performed_by | character varying | YES | 'system'::character varying |
| metadata | jsonb | YES | '{}'::jsonb |

#### Indexes (4)
- `context_staleness_log_pkey`
- `idx_context_staleness_log_context_id`
- `idx_context_staleness_log_action`
- `idx_context_staleness_log_performed_at`

#### Foreign Keys (1)
- `context_id` → `context_items.id`

### daily_statistics
- **Row Count**: 0
- **Size**: 24 kB
- **Status**: ⚠️ Empty

#### Columns (22)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| date | date | NO | NULL |
| ai_requests_total | integer | YES | 0 |
| ai_requests_success | integer | YES | 0 |
| ai_tokens_total | bigint | YES | 0 |
| ai_cost_total | numeric | YES | 0 |
| api_requests_total | integer | YES | 0 |
| api_requests_2xx | integer | YES | 0 |
| api_requests_4xx | integer | YES | 0 |
| api_requests_5xx | integer | YES | 0 |
| api_avg_response_time_ms | integer | YES | 0 |
| active_users | integer | YES | 0 |
| new_users | integer | YES | 0 |
| total_sessions | integer | YES | 0 |
| documents_created | integer | YES | 0 |
| documents_edited | integer | YES | 0 |
| documents_viewed | integer | YES | 0 |
| jobs_queued | integer | YES | 0 |
| jobs_completed | integer | YES | 0 |
| jobs_failed | integer | YES | 0 |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (3)
- `daily_statistics_pkey`
- `daily_statistics_date_key`
- `idx_daily_stats_date`

### document_analysis
- **Row Count**: 0
- **Size**: 48 kB
- **Status**: ⚠️ Empty

#### Columns (12)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| document_id | uuid | NO | NULL |
| analysis_type | character varying | NO | NULL |
| patterns_detected | jsonb | YES | '[]'::jsonb |
| best_practices_applied | jsonb | YES | '[]'::jsonb |
| quality_metrics | jsonb | YES | '{}'::jsonb |
| compliance_score | numeric | YES | 0.0 |
| improvement_suggestions | jsonb | YES | '[]'::jsonb |
| metadata | jsonb | YES | '{}'::jsonb |
| analyzed_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `document_analysis_pkey`
- `idx_document_analysis_document_id`
- `idx_document_analysis_analysis_type`
- `idx_document_analysis_analyzed_at`
- `idx_document_analysis_compliance_score`

#### Foreign Keys (1)
- `document_id` → `documents.id`

### document_analytics
- **Row Count**: 15
- **Size**: 88 kB
- **Status**: ✅ Populated

#### Columns (16)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| document_id | uuid | YES | NULL |
| project_id | uuid | YES | NULL |
| view_count | integer | YES | 0 |
| unique_viewers | integer | YES | 0 |
| last_viewed_at | timestamp with time zone | YES | NULL |
| last_viewed_by | uuid | YES | NULL |
| edit_count | integer | YES | 0 |
| last_edited_at | timestamp with time zone | YES | NULL |
| last_edited_by | uuid | YES | NULL |
| avg_read_time_seconds | integer | YES | 0 |
| total_read_time_seconds | integer | YES | 0 |
| pdf_exports | integer | YES | 0 |
| docx_exports | integer | YES | 0 |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `document_analytics_pkey`
- `document_analytics_document_id_key`
- `idx_doc_analytics_project`
- `idx_doc_analytics_views`
- `idx_doc_analytics_edits`

#### Foreign Keys (4)
- `document_id` → `documents.id`
- `last_edited_by` → `users.id`
- `last_viewed_by` → `users.id`
- `project_id` → `projects.id`

### document_pattern_analysis
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (11)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| document_id | uuid | NO | NULL |
| patterns_found | jsonb | YES | '[]'::jsonb |
| pattern_confidence | numeric | YES | 0.0 |
| pattern_coverage | numeric | YES | 0.0 |
| missing_patterns | ARRAY | YES | '{}'::text[] |
| anomalous_patterns | ARRAY | YES | '{}'::text[] |
| metadata | jsonb | YES | '{}'::jsonb |
| analyzed_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (4)
- `document_pattern_analysis_pkey`
- `idx_document_pattern_analysis_document_id`
- `idx_document_pattern_analysis_analyzed_at`
- `idx_document_pattern_analysis_pattern_confidence`

#### Foreign Keys (1)
- `document_id` → `documents.id`

### document_patterns
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (10)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| framework | character varying | NO | NULL |
| category | character varying | YES | NULL |
| pattern_type | character varying | NO | NULL |
| pattern_data | jsonb | NO | NULL |
| frequency | integer | YES | 1 |
| confidence | numeric | YES | 0.5 |
| examples | ARRAY | YES | '{}'::text[] |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (4)
- `document_patterns_pkey`
- `idx_document_patterns_framework`
- `idx_document_patterns_category`
- `idx_document_patterns_pattern_type`

### document_processing_history
- **Row Count**: 0
- **Size**: 80 kB
- **Status**: ⚠️ Empty

#### Columns (14)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| history_id | character varying | NO | NULL |
| request_id | character varying | NO | NULL |
| user_id | uuid | NO | NULL |
| project_id | character varying | NO | NULL |
| template_id | character varying | NO | NULL |
| status | character varying | NO | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| completed_at | timestamp with time zone | YES | NULL |
| processing_time | integer | YES | NULL |
| quality_score | numeric | YES | NULL |
| stages_completed | jsonb | YES | '[]'::jsonb |
| error | jsonb | YES | NULL |
| metadata | jsonb | YES | '{}'::jsonb |

#### Indexes (9)
- `document_processing_history_pkey`
- `document_processing_history_history_id_key`
- `idx_document_processing_history_history_id`
- `idx_document_processing_history_request_id`
- `idx_document_processing_history_user_id`
- `idx_document_processing_history_project_id`
- `idx_document_processing_history_template_id`
- `idx_document_processing_history_status`
- `idx_document_processing_history_created_at`

#### Foreign Keys (1)
- `user_id` → `users.id`

### document_processing_jobs
- **Row Count**: 0
- **Size**: 80 kB
- **Status**: ⚠️ Empty

#### Columns (18)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| job_id | character varying | NO | NULL |
| request_id | character varying | NO | NULL |
| template_id | character varying | NO | NULL |
| project_id | character varying | NO | NULL |
| user_id | uuid | NO | NULL |
| status | character varying | NO | NULL |
| progress | integer | YES | 0 |
| current_stage | character varying | YES | NULL |
| started_at | timestamp with time zone | YES | NULL |
| completed_at | timestamp with time zone | YES | NULL |
| failed_at | timestamp with time zone | YES | NULL |
| cancelled_at | timestamp with time zone | YES | NULL |
| result | jsonb | YES | NULL |
| error | jsonb | YES | NULL |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (9)
- `document_processing_jobs_pkey`
- `document_processing_jobs_job_id_key`
- `idx_document_processing_jobs_job_id`
- `idx_document_processing_jobs_request_id`
- `idx_document_processing_jobs_template_id`
- `idx_document_processing_jobs_project_id`
- `idx_document_processing_jobs_user_id`
- `idx_document_processing_jobs_status`
- `idx_document_processing_jobs_created_at`

#### Foreign Keys (1)
- `user_id` → `users.id`

### document_quality_metrics
- **Row Count**: 0
- **Size**: 32 kB
- **Status**: ⚠️ Empty

#### Columns (11)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| document_id | uuid | NO | NULL |
| completeness_score | numeric | YES | NULL |
| clarity_score | numeric | YES | NULL |
| accuracy_score | numeric | YES | NULL |
| consistency_score | numeric | YES | NULL |
| overall_score | numeric | YES | NULL |
| assessment_date | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| assessor | character varying | NO | NULL |
| feedback | ARRAY | YES | '{}'::text[] |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (3)
- `document_quality_metrics_pkey`
- `idx_document_quality_metrics_document_id`
- `idx_document_quality_metrics_overall_score`

#### Foreign Keys (1)
- `document_id` → `documents.id`

### document_tags
- **Row Count**: 0
- **Size**: 32 kB
- **Status**: ⚠️ Empty

#### Columns (4)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| document_id | uuid | NO | NULL |
| tag | character varying | NO | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (4)
- `document_tags_pkey`
- `document_tags_document_id_tag_key`
- `idx_document_tags_document_id`
- `idx_document_tags_tag`

#### Foreign Keys (1)
- `document_id` → `documents.id`

### document_versions
- **Row Count**: 7
- **Size**: 96 kB
- **Status**: ✅ Populated

#### Columns (8)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| document_id | uuid | NO | NULL |
| version | character varying | NO | NULL |
| content | text | YES | NULL |
| changes | text | YES | NULL |
| word_count | integer | YES | 0 |
| created_at | timestamp without time zone | YES | now() |
| author_id | uuid | YES | NULL |

#### Indexes (5)
- `document_versions_pkey`
- `document_versions_document_id_version_key`
- `idx_document_versions_document_id`
- `idx_document_versions_created_at`
- `idx_document_versions_version`

#### Foreign Keys (2)
- `author_id` → `users.id`
- `document_id` → `documents.id`

### documents
- **Row Count**: 70
- **Size**: 3000 kB
- **Status**: ✅ Populated

#### Columns (45)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| project_id | uuid | YES | NULL |
| name | character varying | NO | NULL |
| content | text | YES | NULL |
| template_id | uuid | YES | NULL |
| version | integer | YES | 1 |
| status | character varying | YES | 'draft'::character varying |
| file_path | character varying | YES | NULL |
| file_size | bigint | YES | NULL |
| mime_type | character varying | YES | NULL |
| framework | character varying | YES | NULL |
| metadata | jsonb | YES | '{}'::jsonb |
| created_by | uuid | YES | NULL |
| updated_by | uuid | YES | NULL |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| sharepoint_file_id | character varying | YES | NULL |
| sharepoint_drive_id | character varying | YES | NULL |
| sharepoint_site_id | character varying | YES | NULL |
| web_url | text | YES | NULL |
| word_count | integer | YES | 0 |
| character_count | integer | YES | 0 |
| compression_ratio | integer | YES | 0 |
| original_size | character varying | YES | NULL |
| compressed_size | character varying | YES | NULL |
| processing_time | character varying | YES | NULL |
| ai_model | character varying | YES | NULL |
| input_tokens | integer | YES | 0 |
| output_tokens | integer | YES | 0 |
| tags | jsonb | YES | '[]'::jsonb |
| source_documents | jsonb | YES | '[]'::jsonb |
| comments | jsonb | YES | '[]'::jsonb |
| author | character varying | YES | NULL |
| title | character varying | YES | NULL |
| template_version | character varying | YES | NULL |
| template_author | character varying | YES | NULL |
| template_framework | character varying | YES | NULL |
| template_category | character varying | YES | NULL |
| template_complexity | character varying | YES | NULL |
| template_metadata | jsonb | YES | NULL |
| generation_metadata | jsonb | YES | NULL |
| parent_document_id | uuid | YES | NULL |
| compression_stats | jsonb | YES | NULL |
| deleted_at | timestamp with time zone | YES | NULL |
| deleted_by | uuid | YES | NULL |

#### Indexes (17)
- `documents_pkey`
- `idx_documents_project`
- `idx_documents_created_by`
- `idx_documents_sharepoint_file_id`
- `idx_documents_sharepoint_drive_id`
- `idx_documents_sharepoint_site_id`
- `unique_sharepoint_file_id`
- `idx_documents_metadata`
- `idx_documents_framework`
- `idx_documents_tags`
- `idx_documents_source_documents`
- `idx_documents_comments`
- `idx_documents_template_id`
- `idx_documents_template_framework`
- `idx_documents_generation_metadata`
- `idx_documents_not_deleted`
- `idx_documents_deleted`

#### Foreign Keys (5)
- `created_by` → `users.id`
- `deleted_by` → `users.id`
- `parent_document_id` → `documents.id`
- `project_id` → `projects.id`
- `updated_by` → `users.id`

### embedding_cache
- **Row Count**: 0
- **Size**: 48 kB
- **Status**: ⚠️ Empty

#### Columns (9)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| content_hash | character varying | NO | NULL |
| content | text | NO | NULL |
| embeddings | jsonb | NO | NULL |
| model | character varying | NO | NULL |
| access_count | integer | YES | 0 |
| last_accessed | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| expires_at | timestamp with time zone | NO | NULL |

#### Indexes (5)
- `embedding_cache_pkey`
- `embedding_cache_content_hash_key`
- `idx_embedding_cache_content_hash`
- `idx_embedding_cache_model`
- `idx_embedding_cache_expires_at`

### fallback_strategies
- **Row Count**: 3
- **Size**: 120 kB
- **Status**: ✅ Populated

#### Columns (9)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| strategy_id | character varying | NO | NULL |
| strategy_name | character varying | NO | NULL |
| strategy_type | character varying | NO | NULL |
| fallback_order | integer | NO | NULL |
| enabled | boolean | YES | true |
| config | jsonb | NO | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (6)
- `fallback_strategies_pkey`
- `fallback_strategies_strategy_id_key`
- `idx_fallback_strategies_type`
- `idx_fallback_strategies_order`
- `idx_fallback_strategies_enabled`
- `idx_fallback_strategies_config_gin`

### framework_analysis
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (13)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| framework | character varying | NO | NULL |
| total_documents | integer | YES | 0 |
| average_quality_score | numeric | YES | 0.0 |
| common_patterns | jsonb | YES | '[]'::jsonb |
| best_practices | jsonb | YES | '[]'::jsonb |
| quality_trends | jsonb | YES | '[]'::jsonb |
| improvement_areas | ARRAY | YES | '{}'::text[] |
| strengths | ARRAY | YES | '{}'::text[] |
| recommendations | ARRAY | YES | '{}'::text[] |
| analyzed_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (4)
- `framework_analysis_pkey`
- `idx_framework_analysis_framework`
- `idx_framework_analysis_analyzed_at`
- `idx_framework_analysis_average_quality_score`

### historical_trends
- **Row Count**: 0
- **Size**: 48 kB
- **Status**: ⚠️ Empty

#### Columns (10)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| timeframe | character varying | NO | NULL |
| metric_name | character varying | NO | NULL |
| metric_value | numeric | NO | NULL |
| trend_direction | character varying | YES | 'stable'::character varying |
| change_percentage | numeric | YES | 0.0 |
| data_points | integer | YES | 0 |
| confidence | numeric | YES | 0.0 |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `historical_trends_pkey`
- `idx_historical_trends_timeframe`
- `idx_historical_trends_metric_name`
- `idx_historical_trends_trend_direction`
- `idx_historical_trends_created_at`

### improvement_suggestions
- **Row Count**: 0
- **Size**: 72 kB
- **Status**: ⚠️ Empty

#### Columns (18)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| document_id | uuid | YES | NULL |
| user_id | uuid | YES | NULL |
| project_id | uuid | YES | NULL |
| suggestion_type | character varying | NO | NULL |
| priority | character varying | YES | 'medium'::character varying |
| title | character varying | NO | NULL |
| description | text | NO | NULL |
| current_state | text | YES | NULL |
| suggested_improvement | text | NO | NULL |
| expected_benefit | text | YES | NULL |
| implementation_effort | character varying | YES | 'medium'::character varying |
| related_patterns | ARRAY | YES | '{}'::text[] |
| related_practices | ARRAY | YES | '{}'::text[] |
| examples | ARRAY | YES | '{}'::text[] |
| status | character varying | YES | 'pending'::character varying |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (8)
- `improvement_suggestions_pkey`
- `idx_improvement_suggestions_document_id`
- `idx_improvement_suggestions_user_id`
- `idx_improvement_suggestions_project_id`
- `idx_improvement_suggestions_suggestion_type`
- `idx_improvement_suggestions_priority`
- `idx_improvement_suggestions_status`
- `idx_improvement_suggestions_created_at`

#### Foreign Keys (3)
- `document_id` → `documents.id`
- `project_id` → `projects.id`
- `user_id` → `users.id`

### integration_sync_metadata
- **Row Count**: 0
- **Size**: 48 kB
- **Status**: ⚠️ Empty

#### Columns (8)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| integration_id | uuid | NO | NULL |
| adpa_document_id | uuid | NO | NULL |
| external_id | character varying | NO | NULL |
| external_type | character varying | NO | NULL |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `integration_sync_metadata_pkey`
- `integration_sync_metadata_integration_id_adpa_document_id_key`
- `idx_integration_sync_metadata_integration_id`
- `idx_integration_sync_metadata_external_id`
- `idx_integration_sync_metadata_adpa_document_id`

#### Foreign Keys (2)
- `adpa_document_id` → `documents.id`
- `integration_id` → `integrations.id`

### integrations
- **Row Count**: 0
- **Size**: 32 kB
- **Status**: ⚠️ Empty

#### Columns (11)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| name | character varying | NO | NULL |
| type | character varying | NO | NULL |
| configuration | jsonb | NO | NULL |
| credentials_encrypted | text | YES | NULL |
| is_active | boolean | YES | true |
| last_sync | timestamp without time zone | YES | NULL |
| sync_status | character varying | YES | NULL |
| created_by | uuid | YES | NULL |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (3)
- `integrations_pkey`
- `idx_integrations_sync_status`
- `idx_integrations_last_sync`

#### Foreign Keys (1)
- `created_by` → `users.id`

### job_execution_logs
- **Row Count**: 188
- **Size**: 288 kB
- **Status**: ✅ Populated

#### Columns (18)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| job_id | character varying | NO | NULL |
| job_type | character varying | NO | NULL |
| queue_name | character varying | NO | NULL |
| status | character varying | NO | NULL |
| priority | integer | YES | 0 |
| queued_at | timestamp with time zone | YES | NULL |
| started_at | timestamp with time zone | YES | NULL |
| completed_at | timestamp with time zone | YES | NULL |
| duration_ms | integer | YES | NULL |
| success | boolean | YES | NULL |
| error_message | text | YES | NULL |
| retry_count | integer | YES | 0 |
| user_id | uuid | YES | NULL |
| project_id | uuid | YES | NULL |
| job_data | jsonb | YES | NULL |
| result_data | jsonb | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `job_execution_logs_pkey`
- `idx_job_logs_type`
- `idx_job_logs_status`
- `idx_job_logs_queue`
- `idx_job_logs_created`

#### Foreign Keys (2)
- `project_id` → `projects.id`
- `user_id` → `users.id`

### jobs
- **Row Count**: 38
- **Size**: 168 kB
- **Status**: ✅ Populated

#### Columns (12)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| type | character varying | NO | NULL |
| status | character varying | YES | 'pending'::character varying |
| priority | integer | YES | 0 |
| data | jsonb | YES | NULL |
| result | jsonb | YES | NULL |
| error_message | text | YES | NULL |
| progress | integer | YES | 0 |
| started_at | timestamp without time zone | YES | NULL |
| completed_at | timestamp without time zone | YES | NULL |
| created_by | uuid | YES | NULL |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (3)
- `jobs_pkey`
- `idx_jobs_status`
- `idx_jobs_type`

#### Foreign Keys (1)
- `created_by` → `users.id`

### migrations
- **Row Count**: 3
- **Size**: 24 kB
- **Status**: ✅ Populated

#### Columns (3)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('migrations_id_seq'::regclass) |
| name | character varying | NO | NULL |
| executed_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (1)
- `migrations_pkey`

### milestones
- **Row Count**: 0
- **Size**: 32 kB
- **Status**: ⚠️ Empty

#### Columns (12)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | NULL |
| name | character varying | NO | NULL |
| description | text | YES | NULL |
| date | date | NO | NULL |
| status | character varying | YES | 'planned'::character varying |
| dependencies | ARRAY | YES | '{}'::text[] |
| deliverables | ARRAY | YES | '{}'::text[] |
| success_criteria | ARRAY | YES | '{}'::text[] |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| deleted_at | timestamp with time zone | YES | NULL |

#### Indexes (3)
- `milestones_pkey`
- `idx_milestones_project_id`
- `idx_milestones_date`

#### Foreign Keys (1)
- `project_id` → `projects.id`

### phases
- **Row Count**: 0
- **Size**: 32 kB
- **Status**: ⚠️ Empty

#### Columns (12)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | NULL |
| name | character varying | NO | NULL |
| description | text | YES | NULL |
| start_date | date | NO | NULL |
| end_date | date | NO | NULL |
| status | character varying | YES | 'planned'::character varying |
| deliverables | ARRAY | YES | '{}'::text[] |
| team_members | ARRAY | YES | '{}'::text[] |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| deleted_at | timestamp with time zone | YES | NULL |

#### Indexes (3)
- `phases_pkey`
- `idx_phases_project_id`
- `idx_phases_start_date`

#### Foreign Keys (1)
- `project_id` → `projects.id`

### pipeline_configurations
- **Row Count**: 0
- **Size**: 24 kB
- **Status**: ⚠️ Empty

#### Columns (11)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| pipeline_id | character varying | NO | NULL |
| pipeline_name | character varying | NO | NULL |
| description | text | YES | NULL |
| stages | jsonb | NO | NULL |
| global_config | jsonb | YES | '{}'::jsonb |
| quality_gates | jsonb | YES | '[]'::jsonb |
| monitoring_config | jsonb | YES | '{}'::jsonb |
| is_active | boolean | YES | true |
| created_by | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

#### Indexes (2)
- `pipeline_configurations_pkey`
- `idx_pipeline_configurations_active`

#### Foreign Keys (1)
- `created_by` → `users.id`

### pipeline_executions
- **Row Count**: 29
- **Size**: 192 kB
- **Status**: ✅ Populated

#### Columns (25)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| job_id | uuid | NO | NULL |
| request_id | uuid | NO | NULL |
| template_id | uuid | YES | NULL |
| project_id | uuid | YES | NULL |
| user_id | uuid | YES | NULL |
| status | character varying | NO | 'pending'::character varying |
| progress | numeric | YES | 0 |
| current_stage | character varying | YES | NULL |
| stages_completed | ARRAY | YES | '{}'::text[] |
| stages_remaining | ARRAY | YES | '{}'::text[] |
| created_at | timestamp with time zone | YES | now() |
| started_at | timestamp with time zone | YES | NULL |
| completed_at | timestamp with time zone | YES | NULL |
| cancelled_at | timestamp with time zone | YES | NULL |
| estimated_completion | timestamp with time zone | YES | NULL |
| updated_at | timestamp with time zone | YES | now() |
| overall_quality_score | numeric | YES | NULL |
| final_document_id | uuid | YES | NULL |
| processing_config | jsonb | YES | '{}'::jsonb |
| enhancement_config | jsonb | YES | '{}'::jsonb |
| quality_config | jsonb | YES | '{}'::jsonb |
| output_config | jsonb | YES | '{}'::jsonb |
| error | text | YES | NULL |
| error_details | jsonb | YES | NULL |
| retry_count | integer | YES | 0 |

#### Indexes (7)
- `pipeline_executions_pkey`
- `idx_pipeline_executions_user_id`
- `idx_pipeline_executions_status`
- `idx_pipeline_executions_template_id`
- `idx_pipeline_executions_project_id`
- `idx_pipeline_executions_created_at`
- `idx_pipeline_executions_user_status`

#### Foreign Keys (3)
- `project_id` → `projects.id`
- `template_id` → `templates.id`
- `user_id` → `users.id`

### processing_metrics
- **Row Count**: 0
- **Size**: 56 kB
- **Status**: ⚠️ Empty

#### Columns (11)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| request_id | character varying | NO | NULL |
| template_id | character varying | NO | NULL |
| project_id | character varying | NO | NULL |
| user_id | uuid | NO | NULL |
| processing_time | integer | YES | 0 |
| quality_score | numeric | YES | 0.0 |
| stages_count | integer | YES | 0 |
| successful_stages | integer | YES | 0 |
| failed_stages | integer | YES | 0 |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (6)
- `processing_metrics_pkey`
- `idx_processing_metrics_request_id`
- `idx_processing_metrics_template_id`
- `idx_processing_metrics_project_id`
- `idx_processing_metrics_user_id`
- `idx_processing_metrics_created_at`

#### Foreign Keys (1)
- `user_id` → `users.id`

### project_analysis
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (12)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | NULL |
| total_documents | integer | YES | 0 |
| average_quality_score | numeric | YES | 0.0 |
| document_types | ARRAY | YES | '{}'::text[] |
| quality_distribution | jsonb | YES | '{}'::jsonb |
| common_issues | ARRAY | YES | '{}'::text[] |
| best_practices_applied | jsonb | YES | '[]'::jsonb |
| improvement_opportunities | ARRAY | YES | '{}'::text[] |
| analyzed_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (4)
- `project_analysis_pkey`
- `idx_project_analysis_project_id`
- `idx_project_analysis_analyzed_at`
- `idx_project_analysis_average_quality_score`

#### Foreign Keys (1)
- `project_id` → `projects.id`

### projects
- **Row Count**: 9
- **Size**: 104 kB
- **Status**: ✅ Populated

#### Columns (16)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| name | character varying | NO | NULL |
| description | text | YES | NULL |
| framework | character varying | NO | NULL |
| status | character varying | YES | 'active'::character varying |
| priority | character varying | YES | 'medium'::character varying |
| start_date | date | YES | NULL |
| end_date | date | YES | NULL |
| budget | numeric | YES | NULL |
| owner_id | uuid | YES | NULL |
| created_by | uuid | YES | NULL |
| team_members | jsonb | YES | '[]'::jsonb |
| settings | jsonb | YES | '{}'::jsonb |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `projects_pkey`
- `idx_projects_owner`
- `idx_projects_status`
- `idx_projects_metadata`
- `idx_projects_created_by`

#### Foreign Keys (2)
- `created_by` → `users.id`
- `owner_id` → `users.id`

### quality_reports
- **Row Count**: 0
- **Size**: 56 kB
- **Status**: ⚠️ Empty

#### Columns (11)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| report_id | character varying | NO | NULL |
| document_id | character varying | NO | NULL |
| job_id | character varying | NO | NULL |
| overall_score | numeric | NO | NULL |
| assessments | jsonb | YES | '[]'::jsonb |
| recommendations | jsonb | YES | '[]'::jsonb |
| issues | jsonb | YES | '[]'::jsonb |
| quality_gates | jsonb | YES | '[]'::jsonb |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (6)
- `quality_reports_pkey`
- `quality_reports_report_id_key`
- `idx_quality_reports_report_id`
- `idx_quality_reports_document_id`
- `idx_quality_reports_job_id`
- `idx_quality_reports_created_at`

#### Foreign Keys (1)
- `job_id` → `document_processing_jobs.job_id`

### quality_trends
- **Row Count**: 0
- **Size**: 24 kB
- **Status**: ⚠️ Empty

#### Columns (10)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| timeframe | character varying | NO | NULL |
| average_quality_score | numeric | NO | NULL |
| trend_direction | character varying | YES | 'stable'::character varying |
| data_points | integer | YES | 0 |
| framework_breakdown | jsonb | YES | '{}'::jsonb |
| category_breakdown | jsonb | YES | '{}'::jsonb |
| common_issues | ARRAY | YES | '{}'::text[] |
| improvement_areas | ARRAY | YES | '{}'::text[] |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (2)
- `quality_trends_pkey`
- `idx_quality_trends_timeframe`

### query_analytics
- **Row Count**: 0
- **Size**: 48 kB
- **Status**: ⚠️ Empty

#### Columns (9)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| query | text | NO | NULL |
| query_hash | character varying | NO | NULL |
| frequency | integer | YES | 1 |
| average_relevance | numeric | YES | 0.0 |
| average_processing_time | integer | YES | 0 |
| success_rate | numeric | YES | 1.0 |
| last_searched | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `query_analytics_pkey`
- `query_analytics_query_hash_key`
- `idx_query_analytics_query_hash`
- `idx_query_analytics_frequency`
- `idx_query_analytics_last_searched`

### relevance_feedback
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (6)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| result_id | character varying | NO | NULL |
| user_id | uuid | NO | NULL |
| relevance_score | numeric | NO | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `relevance_feedback_pkey`
- `relevance_feedback_result_id_user_id_key`
- `idx_relevance_feedback_result_id`
- `idx_relevance_feedback_user_id`
- `idx_relevance_feedback_relevance_score`

#### Foreign Keys (1)
- `user_id` → `users.id`

### requirements
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (15)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | NULL |
| name | character varying | NO | NULL |
| description | text | NO | NULL |
| type | character varying | YES | 'functional'::character varying |
| priority | character varying | YES | 'medium'::character varying |
| status | character varying | YES | 'draft'::character varying |
| source | character varying | YES | NULL |
| acceptance_criteria | ARRAY | YES | '{}'::text[] |
| dependencies | ARRAY | YES | '{}'::text[] |
| risks | ARRAY | YES | '{}'::text[] |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| deleted_at | timestamp with time zone | YES | NULL |

#### Indexes (4)
- `requirements_pkey`
- `idx_requirements_project_id`
- `idx_requirements_priority`
- `idx_requirements_status`

#### Foreign Keys (1)
- `project_id` → `projects.id`

### resolution_strategies
- **Row Count**: 10
- **Size**: 144 kB
- **Status**: ✅ Populated

#### Columns (10)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| strategy_id | character varying | NO | NULL |
| strategy_name | character varying | NO | NULL |
| strategy_type | character varying | NO | NULL |
| priority | integer | NO | NULL |
| enabled | boolean | YES | true |
| config | jsonb | NO | NULL |
| conditions | jsonb | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (7)
- `resolution_strategies_pkey`
- `resolution_strategies_strategy_id_key`
- `idx_resolution_strategies_type`
- `idx_resolution_strategies_priority`
- `idx_resolution_strategies_enabled`
- `idx_resolution_strategies_config_gin`
- `idx_resolution_strategies_conditions_gin`

### risks
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (16)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | NULL |
| name | character varying | NO | NULL |
| description | text | NO | NULL |
| category | character varying | YES | NULL |
| probability | character varying | YES | 'medium'::character varying |
| impact | character varying | YES | 'medium'::character varying |
| risk_level | character varying | YES | 'medium'::character varying |
| mitigation_strategy | text | YES | NULL |
| contingency_plan | text | YES | NULL |
| owner | character varying | YES | NULL |
| status | character varying | YES | 'identified'::character varying |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| deleted_at | timestamp with time zone | YES | NULL |

#### Indexes (4)
- `risks_pkey`
- `idx_risks_project_id`
- `idx_risks_risk_level`
- `idx_risks_status`

#### Foreign Keys (1)
- `project_id` → `projects.id`

### search_history
- **Row Count**: 0
- **Size**: 72 kB
- **Status**: ⚠️ Empty

#### Columns (14)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| query | text | NO | NULL |
| context_types | jsonb | YES | '[]'::jsonb |
| filters | jsonb | YES | '{}'::jsonb |
| user_id | uuid | YES | NULL |
| project_id | uuid | YES | NULL |
| template_id | uuid | YES | NULL |
| results_count | integer | YES | 0 |
| processing_time | integer | YES | 0 |
| search_strategy | character varying | YES | 'hybrid'::character varying |
| relevance_threshold | numeric | YES | 0.1 |
| cache_hit | boolean | YES | false |
| error | text | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (7)
- `search_history_pkey`
- `idx_search_history_user_id`
- `idx_search_history_project_id`
- `idx_search_history_template_id`
- `idx_search_history_created_at`
- `idx_search_history_search_strategy`
- `idx_search_history_query`

#### Foreign Keys (3)
- `project_id` → `projects.id`
- `template_id` → `templates.id`
- `user_id` → `users.id`

### search_index
- **Row Count**: 0
- **Size**: 96 kB
- **Status**: ⚠️ Empty

#### Columns (13)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| content | text | NO | NULL |
| type | character varying | NO | NULL |
| source | character varying | NO | NULL |
| source_id | character varying | NO | NULL |
| embeddings | jsonb | YES | NULL |
| keywords | ARRAY | YES | '{}'::text[] |
| metadata | jsonb | YES | '{}'::jsonb |
| relevance_score | numeric | YES | 0.0 |
| access_count | integer | YES | 0 |
| last_accessed | timestamp with time zone | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (9)
- `search_index_pkey`
- `search_index_source_source_id_key`
- `idx_search_index_type`
- `idx_search_index_source`
- `idx_search_index_keywords`
- `idx_search_index_metadata`
- `idx_search_index_relevance_score`
- `idx_search_index_created_at`
- `idx_search_index_access_count`

### security_events
- **Row Count**: 0
- **Size**: 32 kB
- **Status**: ⚠️ Empty

#### Columns (10)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| event_type | character varying | NO | NULL |
| severity | character varying | NO | NULL |
| source_ip | inet | YES | NULL |
| user_id | uuid | YES | NULL |
| resource | character varying | YES | NULL |
| action | character varying | YES | NULL |
| details | jsonb | YES | NULL |
| resolved | boolean | YES | false |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (3)
- `security_events_pkey`
- `idx_security_events_type`
- `idx_security_events_created_at`

#### Foreign Keys (1)
- `user_id` → `users.id`

### source_authority
- **Row Count**: 7
- **Size**: 88 kB
- **Status**: ✅ Populated

#### Columns (8)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| source | character varying | NO | NULL |
| source_id | character varying | NO | NULL |
| authority_score | numeric | YES | 0.5 |
| authority_type | character varying | YES | 'user_generated'::character varying |
| verification_status | character varying | YES | 'unverified'::character varying |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `source_authority_pkey`
- `source_authority_source_source_id_key`
- `idx_source_authority_source`
- `idx_source_authority_authority_score`
- `idx_source_authority_verification_status`

### stage_executions
- **Row Count**: 160
- **Size**: 12 MB
- **Status**: ✅ Populated

#### Columns (16)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| job_id | uuid | NO | NULL |
| stage_id | character varying | NO | NULL |
| stage_type | character varying | NO | NULL |
| status | character varying | NO | 'pending'::character varying |
| execution_time | integer | YES | NULL |
| quality_score | numeric | YES | NULL |
| input_data | jsonb | YES | NULL |
| output_data | jsonb | YES | NULL |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | now() |
| started_at | timestamp with time zone | YES | NULL |
| completed_at | timestamp with time zone | YES | NULL |
| error_message | text | YES | NULL |
| error_details | jsonb | YES | NULL |
| retry_count | integer | YES | 0 |

#### Indexes (5)
- `stage_executions_pkey`
- `idx_stage_executions_job_id`
- `idx_stage_executions_stage_id`
- `idx_stage_executions_status`
- `idx_stage_executions_job_stage`

#### Foreign Keys (1)
- `job_id` → `pipeline_executions.job_id`

### stage_jobs
- **Row Count**: 0
- **Size**: 64 kB
- **Status**: ⚠️ Empty

#### Columns (16)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| job_id | character varying | NO | NULL |
| stage_id | character varying | NO | NULL |
| stage_type | character varying | NO | NULL |
| status | character varying | NO | NULL |
| progress | integer | YES | 0 |
| input_data | jsonb | YES | NULL |
| output_data | jsonb | YES | NULL |
| started_at | timestamp with time zone | YES | NULL |
| completed_at | timestamp with time zone | YES | NULL |
| failed_at | timestamp with time zone | YES | NULL |
| cancelled_at | timestamp with time zone | YES | NULL |
| error | jsonb | YES | NULL |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (7)
- `stage_jobs_pkey`
- `stage_jobs_job_id_key`
- `idx_stage_jobs_job_id`
- `idx_stage_jobs_stage_id`
- `idx_stage_jobs_stage_type`
- `idx_stage_jobs_status`
- `idx_stage_jobs_created_at`

### stage_metrics
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (7)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| stage_id | character varying | NO | NULL |
| stage_type | character varying | NO | NULL |
| execution_time | integer | YES | 0 |
| quality_score | numeric | YES | 0.0 |
| success | boolean | YES | true |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `stage_metrics_pkey`
- `idx_stage_metrics_stage_id`
- `idx_stage_metrics_stage_type`
- `idx_stage_metrics_success`
- `idx_stage_metrics_created_at`

### stakeholders
- **Row Count**: 20
- **Size**: 112 kB
- **Status**: ✅ Populated

#### Columns (19)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | NULL |
| name | character varying | YES | NULL |
| role | character varying | NO | NULL |
| department | character varying | YES | NULL |
| email | character varying | NO | NULL |
| phone | character varying | YES | NULL |
| interest_level | character varying | YES | 'medium'::character varying |
| influence_level | character varying | YES | 'medium'::character varying |
| engagement_approach | character varying | YES | 'keep_informed'::character varying |
| communication_frequency | character varying | YES | 'weekly'::character varying |
| stakeholder_type | character varying | YES | 'internal'::character varying |
| stakeholder_category | character varying | YES | 'primary'::character varying |
| expectations | text | YES | NULL |
| potential_impact | text | YES | NULL |
| created_by | uuid | YES | NULL |
| updated_by | uuid | YES | NULL |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (6)
- `stakeholders_pkey`
- `idx_stakeholders_project_id`
- `idx_stakeholders_email`
- `idx_stakeholders_role`
- `idx_stakeholders_engagement_approach`
- `idx_stakeholders_stakeholder_type`

#### Foreign Keys (3)
- `created_by` → `users.id`
- `project_id` → `projects.id`
- `updated_by` → `users.id`

### success_criteria
- **Row Count**: 0
- **Size**: 24 kB
- **Status**: ⚠️ Empty

#### Columns (13)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | NULL |
| name | character varying | NO | NULL |
| description | text | NO | NULL |
| type | character varying | YES | 'quantitative'::character varying |
| measurement_method | text | YES | NULL |
| target_value | numeric | YES | NULL |
| current_value | numeric | YES | NULL |
| status | character varying | YES | 'not_met'::character varying |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| deleted_at | timestamp with time zone | YES | NULL |

#### Indexes (2)
- `success_criteria_pkey`
- `idx_success_criteria_project_id`

#### Foreign Keys (1)
- `project_id` → `projects.id`

### system_metrics
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (10)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| metric_name | character varying | NO | NULL |
| metric_category | character varying | NO | NULL |
| value | numeric | NO | NULL |
| unit | character varying | YES | NULL |
| threshold_warning | numeric | YES | NULL |
| threshold_critical | numeric | YES | NULL |
| status | character varying | YES | 'normal'::character varying |
| tags | jsonb | YES | NULL |
| measured_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (4)
- `system_metrics_pkey`
- `idx_system_metrics_name`
- `idx_system_metrics_category`
- `idx_system_metrics_measured`

### system_settings
- **Row Count**: 4
- **Size**: 128 kB
- **Status**: ✅ Populated

#### Columns (8)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| setting_key | character varying | NO | NULL |
| setting_value | text | YES | NULL |
| is_encrypted | boolean | YES | false |
| description | text | YES | NULL |
| updated_by | character varying | YES | NULL |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (3)
- `system_settings_pkey`
- `system_settings_setting_key_key`
- `idx_system_settings_key`

### template_comparison_metrics
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (17)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| template_id_a | uuid | YES | NULL |
| template_id_b | uuid | YES | NULL |
| comparison_type | character varying | NO | NULL |
| metric_name | character varying | NO | NULL |
| value_a | numeric | YES | NULL |
| value_b | numeric | YES | NULL |
| difference | numeric | YES | NULL |
| percent_difference | numeric | YES | NULL |
| winner | character varying | YES | NULL |
| sample_size_a | integer | YES | NULL |
| sample_size_b | integer | YES | NULL |
| confidence_level | numeric | YES | NULL |
| is_significant | boolean | YES | false |
| comparison_period_start | date | YES | NULL |
| comparison_period_end | date | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `template_comparison_metrics_pkey`
- `template_comparison_metrics_template_id_a_template_id_b_met_key`
- `idx_template_comparison_a`
- `idx_template_comparison_b`
- `idx_template_comparison_type`

#### Foreign Keys (2)
- `template_id_a` → `templates.id`
- `template_id_b` → `templates.id`

### template_maintenance_log
- **Row Count**: 0
- **Size**: 48 kB
- **Status**: ⚠️ Empty

#### Columns (20)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| template_id | uuid | YES | NULL |
| action_type | character varying | NO | NULL |
| action_status | character varying | NO | NULL |
| priority | character varying | NO | NULL |
| reason | text | YES | NULL |
| description | text | YES | NULL |
| findings | jsonb | YES | NULL |
| changes_made | jsonb | YES | NULL |
| assigned_to | uuid | YES | NULL |
| performed_by | uuid | YES | NULL |
| scheduled_for | timestamp with time zone | YES | NULL |
| started_at | timestamp with time zone | YES | NULL |
| completed_at | timestamp with time zone | YES | NULL |
| metrics_before | jsonb | YES | NULL |
| metrics_after | jsonb | YES | NULL |
| improvement_percentage | numeric | YES | NULL |
| version_created | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `template_maintenance_log_pkey`
- `idx_maintenance_template`
- `idx_maintenance_status`
- `idx_maintenance_priority`
- `idx_maintenance_assigned`

#### Foreign Keys (4)
- `assigned_to` → `users.id`
- `performed_by` → `users.id`
- `template_id` → `templates.id`
- `version_created` → `template_versions.id`

### template_quality_metrics
- **Row Count**: 37
- **Size**: 104 kB
- **Status**: ✅ Populated

#### Columns (32)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| template_id | uuid | YES | NULL |
| total_uses | integer | YES | 0 |
| successful_uses | integer | YES | 0 |
| failed_uses | integer | YES | 0 |
| success_rate | numeric | YES | NULL |
| avg_document_word_count | integer | YES | NULL |
| avg_document_character_count | integer | YES | NULL |
| avg_generation_time_ms | integer | YES | NULL |
| unique_users | integer | YES | 0 |
| avg_edits_per_document | numeric | YES | NULL |
| avg_time_to_first_edit_minutes | integer | YES | NULL |
| avg_rating | numeric | YES | NULL |
| total_ratings | integer | YES | 0 |
| total_feedback_comments | integer | YES | 0 |
| avg_input_tokens | integer | YES | NULL |
| avg_output_tokens | integer | YES | NULL |
| avg_total_tokens | integer | YES | NULL |
| avg_ai_cost | numeric | YES | NULL |
| total_ai_cost | numeric | YES | NULL |
| error_rate | numeric | YES | NULL |
| avg_completion_rate | numeric | YES | NULL |
| reuse_rate | numeric | YES | NULL |
| last_used_at | timestamp with time zone | YES | NULL |
| days_since_last_use | integer | YES | NULL |
| days_since_last_update | integer | YES | NULL |
| maintenance_priority | character varying | YES | NULL |
| period_type | character varying | YES | 'all_time'::character varying |
| period_start | date | YES | NULL |
| period_end | date | YES | NULL |
| calculated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (6)
- `template_quality_metrics_pkey`
- `template_quality_metrics_template_id_period_type_period_sta_key`
- `idx_template_quality_template`
- `idx_template_quality_period`
- `idx_template_quality_priority`
- `idx_template_quality_success_rate`

#### Foreign Keys (1)
- `template_id` → `templates.id`

### template_usage
- **Row Count**: 32
- **Size**: 144 kB
- **Status**: ✅ Populated

#### Columns (14)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| template_id | uuid | YES | NULL |
| document_id | uuid | YES | NULL |
| user_id | uuid | YES | NULL |
| project_id | uuid | YES | NULL |
| used_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| generation_time_ms | integer | YES | NULL |
| word_count | integer | YES | NULL |
| quality_score | integer | YES | NULL |
| ai_provider | character varying | YES | NULL |
| ai_model | character varying | YES | NULL |
| token_count | integer | YES | NULL |
| success | boolean | YES | true |
| error_message | text | YES | NULL |

#### Indexes (8)
- `template_usage_pkey`
- `idx_template_usage_template_id`
- `idx_template_usage_used_at`
- `idx_template_usage_user_id`
- `idx_template_usage_template_time`
- `idx_template_usage_user`
- `idx_template_usage_project`
- `idx_template_usage_success`

#### Foreign Keys (3)
- `document_id` → `documents.id`
- `template_id` → `templates.id`
- `user_id` → `users.id`

### template_versions
- **Row Count**: 0
- **Size**: 48 kB
- **Status**: ⚠️ Empty

#### Columns (25)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| template_id | uuid | YES | NULL |
| version_number | character varying | NO | NULL |
| version_tag | character varying | YES | NULL |
| content | jsonb | NO | NULL |
| variables | jsonb | YES | NULL |
| system_prompt | text | YES | NULL |
| template_paragraphs | jsonb | YES | NULL |
| context_injection_config | jsonb | YES | NULL |
| name | character varying | NO | NULL |
| description | text | YES | NULL |
| framework | character varying | YES | NULL |
| category | character varying | YES | NULL |
| change_type | character varying | NO | NULL |
| change_summary | text | YES | NULL |
| change_details | jsonb | YES | NULL |
| breaking_changes | boolean | YES | false |
| content_length | integer | YES | NULL |
| variable_count | integer | YES | NULL |
| paragraph_count | integer | YES | NULL |
| complexity_score | numeric | YES | NULL |
| created_by | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| published_at | timestamp with time zone | YES | NULL |
| deprecated_at | timestamp with time zone | YES | NULL |

#### Indexes (5)
- `template_versions_pkey`
- `unique_template_version`
- `idx_template_versions_template`
- `idx_template_versions_created`
- `idx_template_versions_tag`

#### Foreign Keys (2)
- `created_by` → `users.id`
- `template_id` → `templates.id`

### templates
- **Row Count**: 53
- **Size**: 400 kB
- **Status**: ✅ Populated

#### Columns (18)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| name | character varying | NO | NULL |
| description | text | YES | NULL |
| framework | character varying | NO | NULL |
| category | character varying | YES | NULL |
| content | jsonb | NO | NULL |
| variables | jsonb | YES | '[]'::jsonb |
| is_public | boolean | YES | false |
| created_by | uuid | YES | NULL |
| usage_count | integer | YES | 0 |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| deleted_at | timestamp without time zone | YES | NULL |
| deleted_by | uuid | YES | NULL |
| system_prompt | text | YES | NULL |
| context_injection_config | jsonb | YES | NULL |
| prompt_build_up | jsonb | YES | NULL |
| template_paragraphs | jsonb | YES | NULL |

#### Indexes (6)
- `templates_pkey`
- `idx_templates_deleted_at`
- `idx_templates_deleted_by`
- `idx_templates_context_injection_config`
- `idx_templates_prompt_build_up`
- `idx_templates_template_paragraphs`

#### Foreign Keys (2)
- `created_by` → `users.id`
- `deleted_by` → `users.id`

### user_activity_logs
- **Row Count**: 642
- **Size**: 480 kB
- **Status**: ✅ Populated

#### Columns (10)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | YES | NULL |
| session_id | character varying | YES | NULL |
| activity_type | character varying | NO | NULL |
| activity_category | character varying | NO | NULL |
| entity_type | character varying | YES | NULL |
| entity_id | uuid | YES | NULL |
| description | text | YES | NULL |
| metadata | jsonb | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `user_activity_logs_pkey`
- `idx_user_activity_user`
- `idx_user_activity_type`
- `idx_user_activity_category`
- `idx_user_activity_created`

#### Foreign Keys (1)
- `user_id` → `users.id`

### user_analysis
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (12)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | NULL |
| total_documents | integer | YES | 0 |
| average_quality_score | numeric | YES | 0.0 |
| writing_patterns | jsonb | YES | '[]'::jsonb |
| improvement_areas | ARRAY | YES | '{}'::text[] |
| strengths | ARRAY | YES | '{}'::text[] |
| recommendations | ARRAY | YES | '{}'::text[] |
| quality_trends | jsonb | YES | '[]'::jsonb |
| analyzed_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (4)
- `user_analysis_pkey`
- `idx_user_analysis_user_id`
- `idx_user_analysis_analyzed_at`
- `idx_user_analysis_average_quality_score`

#### Foreign Keys (1)
- `user_id` → `users.id`

### user_collaboration_preferences
- **Row Count**: 0
- **Size**: 32 kB
- **Status**: ⚠️ Empty

#### Columns (10)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | NULL |
| communication_style | character varying | YES | 'collaborative'::character varying |
| feedback_preference | character varying | YES | 'constructive'::character varying |
| meeting_preference | character varying | YES | 'structured'::character varying |
| collaboration_tools | ARRAY | YES | '{}'::text[] |
| availability | jsonb | YES | '{"holidays": [], "timezone": "UTC", "busy_periods": [], "working_days": ["monday", "tuesday", "wednesday", "thursday", "friday"], "working_hours": {"end_time": "17:00", "timezone": "UTC", "break_end": "13:00", "start_time": "09:00", "break_start": "12:00", "flexible_hours": false}, "vacation_dates": []}'::jsonb |
| working_hours | jsonb | YES | '{"end_time": "17:00", "timezone": "UTC", "break_end": "13:00", "start_time": "09:00", "break_start": "12:00", "flexible_hours": false}'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (3)
- `user_collaboration_preferences_pkey`
- `user_collaboration_preferences_user_id_key`
- `idx_user_collaboration_preferences_user_id`

#### Foreign Keys (1)
- `user_id` → `users.id`

### user_domain_knowledge
- **Row Count**: 0
- **Size**: 48 kB
- **Status**: ⚠️ Empty

#### Columns (12)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | NULL |
| industries | ARRAY | YES | '{}'::text[] |
| technologies | ARRAY | YES | '{}'::text[] |
| frameworks | ARRAY | YES | '{}'::text[] |
| tools | ARRAY | YES | '{}'::text[] |
| standards | ARRAY | YES | '{}'::text[] |
| regulations | ARRAY | YES | '{}'::text[] |
| best_practices | ARRAY | YES | '{}'::text[] |
| common_patterns | ARRAY | YES | '{}'::text[] |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (4)
- `user_domain_knowledge_pkey`
- `user_domain_knowledge_user_id_key`
- `idx_user_domain_knowledge_user_id`
- `idx_user_domain_knowledge_frameworks`

#### Foreign Keys (1)
- `user_id` → `users.id`

### user_expertise
- **Row Count**: 0
- **Size**: 56 kB
- **Status**: ⚠️ Empty

#### Columns (12)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | NULL |
| level | character varying | YES | 'intermediate'::character varying |
| domains | ARRAY | YES | '{}'::text[] |
| certifications | ARRAY | YES | '{}'::text[] |
| experience_years | integer | YES | 0 |
| methodologies | ARRAY | YES | '{}'::text[] |
| tools | ARRAY | YES | '{}'::text[] |
| languages | ARRAY | YES | '{}'::text[] |
| specializations | ARRAY | YES | '{}'::text[] |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `user_expertise_pkey`
- `user_expertise_user_id_key`
- `idx_user_expertise_user_id`
- `idx_user_expertise_domains`
- `idx_user_expertise_level`

#### Foreign Keys (1)
- `user_id` → `users.id`

### user_preferences
- **Row Count**: 0
- **Size**: 32 kB
- **Status**: ⚠️ Empty

#### Columns (12)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | NULL |
| language | character varying | YES | 'en'::character varying |
| timezone | character varying | YES | 'UTC'::character varying |
| date_format | character varying | YES | 'YYYY-MM-DD'::character varying |
| number_format | character varying | YES | 'en-US'::character varying |
| theme | character varying | YES | 'light'::character varying |
| notifications | jsonb | YES | '{"sms": false, "push": false, "email": true, "in_app": true, "frequency": "immediate", "categories": ["system", "documents", "collaboration"]}'::jsonb |
| accessibility | jsonb | YES | '{"font_size": "medium", "color_scheme": "default", "screen_reader": false, "reduced_motion": false, "keyboard_navigation": true}'::jsonb |
| privacy | jsonb | YES | '{"data_sharing": true, "analytics_opt_in": true, "marketing_opt_in": false, "profile_visibility": "team", "third_party_sharing": false}'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (3)
- `user_preferences_pkey`
- `user_preferences_user_id_key`
- `idx_user_preferences_user_id`

#### Foreign Keys (1)
- `user_id` → `users.id`

### user_search_preferences
- **Row Count**: 0
- **Size**: 64 kB
- **Status**: ⚠️ Empty

#### Columns (11)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | NULL |
| preferred_frameworks | ARRAY | YES | '{}'::text[] |
| preferred_categories | ARRAY | YES | '{}'::text[] |
| preferred_authors | ARRAY | YES | '{}'::text[] |
| preferred_content_types | ARRAY | YES | '{}'::text[] |
| search_strategy_preference | character varying | YES | 'hybrid'::character varying |
| relevance_threshold | numeric | YES | 0.3 |
| max_results | integer | YES | 20 |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `user_search_preferences_pkey`
- `user_search_preferences_user_id_key`
- `idx_user_search_preferences_user_id`
- `idx_user_search_preferences_frameworks`
- `idx_user_search_preferences_categories`

#### Foreign Keys (1)
- `user_id` → `users.id`

### user_writing_style
- **Row Count**: 0
- **Size**: 24 kB
- **Status**: ⚠️ Empty

#### Columns (10)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | NULL |
| tone | character varying | YES | 'professional'::character varying |
| formality | character varying | YES | 'formal'::character varying |
| length_preference | character varying | YES | 'detailed'::character varying |
| structure_preference | character varying | YES | 'structured'::character varying |
| terminology_preference | character varying | YES | 'standard'::character varying |
| audience_awareness | character varying | YES | 'medium'::character varying |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (3)
- `user_writing_style_pkey`
- `user_writing_style_user_id_key`
- `idx_user_writing_style_user_id`

#### Foreign Keys (1)
- `user_id` → `users.id`

### users
- **Row Count**: 5
- **Size**: 184 kB
- **Status**: ✅ Populated

#### Columns (11)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| email | character varying | NO | NULL |
| password_hash | character varying | NO | NULL |
| name | character varying | NO | NULL |
| role | character varying | NO | 'user'::character varying |
| permissions | jsonb | YES | '{}'::jsonb |
| avatar_url | character varying | YES | NULL |
| is_active | boolean | YES | true |
| last_login | timestamp without time zone | YES | NULL |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (2)
- `users_pkey`
- `users_email_key`

### variable_analysis_results
- **Row Count**: 0
- **Size**: 88 kB
- **Status**: ⚠️ Empty

#### Columns (11)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| analysis_id | character varying | NO | NULL |
| template_id | character varying | NO | NULL |
| analysis_data | jsonb | NO | NULL |
| complexity_score | numeric | NO | NULL |
| quality_score | numeric | NO | NULL |
| pattern_count | integer | YES | 0 |
| dependency_count | integer | YES | 0 |
| recommendations | jsonb | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (8)
- `variable_analysis_results_pkey`
- `variable_analysis_results_analysis_id_key`
- `idx_variable_analysis_template`
- `idx_variable_analysis_complexity`
- `idx_variable_analysis_quality`
- `idx_variable_analysis_created`
- `idx_variable_analysis_data_gin`
- `idx_variable_analysis_recommendations_gin`

### variable_patterns
- **Row Count**: 0
- **Size**: 80 kB
- **Status**: ⚠️ Empty

#### Columns (11)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| pattern_id | character varying | NO | NULL |
| pattern_name | character varying | NO | NULL |
| pattern_type | character varying | NO | NULL |
| pattern_expression | text | NO | NULL |
| pattern_confidence | numeric | NO | NULL |
| pattern_frequency | integer | NO | NULL |
| pattern_examples | jsonb | NO | NULL |
| pattern_metadata | jsonb | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (7)
- `variable_patterns_pkey`
- `variable_patterns_pattern_id_key`
- `idx_variable_patterns_type`
- `idx_variable_patterns_confidence`
- `idx_variable_patterns_frequency`
- `idx_variable_patterns_examples_gin`
- `idx_variable_patterns_metadata_gin`

### variable_resolution_cache
- **Row Count**: 0
- **Size**: 56 kB
- **Status**: ⚠️ Empty

#### Columns (6)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| cache_key | character varying | NO | NULL |
| resolution_data | jsonb | NO | NULL |
| expires_at | timestamp with time zone | NO | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (5)
- `variable_resolution_cache_pkey`
- `variable_resolution_cache_cache_key_key`
- `idx_variable_resolution_cache_key`
- `idx_variable_resolution_cache_expires`
- `idx_variable_resolution_cache_data_gin`

### variable_resolution_metrics
- **Row Count**: 0
- **Size**: 72 kB
- **Status**: ⚠️ Empty

#### Columns (11)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| variable_name | character varying | NO | NULL |
| variable_type | character varying | NO | NULL |
| resolution_strategy | character varying | NO | NULL |
| status | character varying | NO | NULL |
| resolution_time | integer | NO | NULL |
| cache_hit | boolean | YES | false |
| quality_score | numeric | YES | NULL |
| error_message | text | YES | NULL |
| context_data | jsonb | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (7)
- `variable_resolution_metrics_pkey`
- `idx_variable_resolution_metrics_name`
- `idx_variable_resolution_metrics_strategy`
- `idx_variable_resolution_metrics_status`
- `idx_variable_resolution_metrics_created`
- `idx_variable_resolution_metrics_type`
- `idx_variable_resolution_metrics_context_gin`

### variable_resolution_results
- **Row Count**: 0
- **Size**: 128 kB
- **Status**: ⚠️ Empty

#### Columns (12)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| result_id | character varying | NO | NULL |
| request_id | character varying | NO | NULL |
| template_id | character varying | YES | NULL |
| resolved_variables | jsonb | NO | NULL |
| unresolved_variables | jsonb | NO | NULL |
| resolution_metrics | jsonb | NO | NULL |
| quality_assessment | jsonb | NO | NULL |
| recommendations | jsonb | NO | NULL |
| metadata | jsonb | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (10)
- `variable_resolution_results_pkey`
- `variable_resolution_results_result_id_key`
- `idx_variable_resolution_results_request`
- `idx_variable_resolution_results_template`
- `idx_variable_resolution_results_created`
- `idx_variable_resolution_results_variables_gin`
- `idx_variable_resolution_results_unresolved_gin`
- `idx_variable_resolution_results_metrics_gin`
- `idx_variable_resolution_results_quality_gin`
- `idx_variable_resolution_results_recommendations_gin`

### workflow_executions
- **Row Count**: 0
- **Size**: 56 kB
- **Status**: ⚠️ Empty

#### Columns (13)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| workflow_id | uuid | NO | NULL |
| user_id | uuid | YES | NULL |
| template_id | uuid | YES | NULL |
| project_id | uuid | YES | NULL |
| status | character varying | NO | NULL |
| started_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| completed_at | timestamp without time zone | YES | NULL |
| processing_time_ms | integer | YES | NULL |
| token_usage | integer | YES | NULL |
| compression_stats | jsonb | YES | NULL |
| error_message | text | YES | NULL |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (6)
- `workflow_executions_pkey`
- `idx_workflow_executions_user_id`
- `idx_workflow_executions_template_id`
- `idx_workflow_executions_project_id`
- `idx_workflow_executions_status`
- `idx_workflow_executions_created_at`

#### Foreign Keys (3)
- `project_id` → `projects.id`
- `template_id` → `templates.id`
- `user_id` → `users.id`

### workflow_presets
- **Row Count**: 0
- **Size**: 40 kB
- **Status**: ⚠️ Empty

#### Columns (11)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| name | character varying | NO | NULL |
| description | text | YES | NULL |
| category | character varying | NO | NULL |
| configuration | jsonb | NO | NULL |
| is_public | boolean | YES | false |
| created_by | uuid | YES | NULL |
| usage_count | integer | YES | 0 |
| rating | numeric | YES | 0 |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Indexes (4)
- `workflow_presets_pkey`
- `idx_workflow_presets_category`
- `idx_workflow_presets_created_by`
- `idx_workflow_presets_public`

#### Foreign Keys (1)
- `created_by` → `users.id`


## Summary

- **Total Tables**: 93
- **Populated Tables**: 25
- **Empty Tables**: 68

## Quick Reference Table

| Table | Row Count | Size | Status |
|-------|-----------|------|--------|
| ai_model_configurations | 14 | 112 kB | ✅ Active |
| ai_providers | 6 | 384 kB | ✅ Active |
| analysis_metrics | 0 | 24 kB | ⚠️ Empty |
| analytics_events | 0 | 32 kB | ⚠️ Empty |
| api_request_logs | 13.589 | 7632 kB | ✅ Active |
| audit_logs | 55 | 160 kB | ✅ Active |
| best_practices | 0 | 40 kB | ⚠️ Empty |
| compression_feedback | 0 | 40 kB | ⚠️ Empty |
| compression_metrics | 145 | 128 kB | ✅ Active |
| compression_strategies | 4 | 96 kB | ✅ Active |
| constraints | 0 | 32 kB | ⚠️ Empty |
| context_bundles | 0 | 88 kB | ⚠️ Empty |
| context_cleanup_results | 0 | 40 kB | ⚠️ Empty |
| context_freshness_assessments | 0 | 48 kB | ⚠️ Empty |
| context_freshness_health_status | 0 | 16 kB | ⚠️ Empty |
| context_freshness_metrics | 0 | 32 kB | ⚠️ Empty |
| context_freshness_policies | 0 | 40 kB | ⚠️ Empty |
| context_freshness_policy_evaluations | 0 | 32 kB | ⚠️ Empty |
| context_freshness_policy_results | 0 | 40 kB | ⚠️ Empty |
| context_freshness_trends | 0 | 32 kB | ⚠️ Empty |
| context_items | 0 | 64 kB | ⚠️ Empty |
| context_refresh_results | 0 | 40 kB | ⚠️ Empty |
| context_refresh_schedules | 0 | 56 kB | ⚠️ Empty |
| context_retrieval_metrics | 0 | 24 kB | ⚠️ Empty |
| context_staleness_log | 0 | 40 kB | ⚠️ Empty |
| daily_statistics | 0 | 24 kB | ⚠️ Empty |
| document_analysis | 0 | 48 kB | ⚠️ Empty |
| document_analytics | 15 | 88 kB | ✅ Active |
| document_pattern_analysis | 0 | 40 kB | ⚠️ Empty |
| document_patterns | 0 | 40 kB | ⚠️ Empty |
| document_processing_history | 0 | 80 kB | ⚠️ Empty |
| document_processing_jobs | 0 | 80 kB | ⚠️ Empty |
| document_quality_metrics | 0 | 32 kB | ⚠️ Empty |
| document_tags | 0 | 32 kB | ⚠️ Empty |
| document_versions | 7 | 96 kB | ✅ Active |
| documents | 70 | 3000 kB | ✅ Active |
| embedding_cache | 0 | 48 kB | ⚠️ Empty |
| fallback_strategies | 3 | 120 kB | ✅ Active |
| framework_analysis | 0 | 40 kB | ⚠️ Empty |
| historical_trends | 0 | 48 kB | ⚠️ Empty |
| improvement_suggestions | 0 | 72 kB | ⚠️ Empty |
| integration_sync_metadata | 0 | 48 kB | ⚠️ Empty |
| integrations | 0 | 32 kB | ⚠️ Empty |
| job_execution_logs | 188 | 288 kB | ✅ Active |
| jobs | 38 | 168 kB | ✅ Active |
| migrations | 3 | 24 kB | ✅ Active |
| milestones | 0 | 32 kB | ⚠️ Empty |
| phases | 0 | 32 kB | ⚠️ Empty |
| pipeline_configurations | 0 | 24 kB | ⚠️ Empty |
| pipeline_executions | 29 | 192 kB | ✅ Active |
| processing_metrics | 0 | 56 kB | ⚠️ Empty |
| project_analysis | 0 | 40 kB | ⚠️ Empty |
| projects | 9 | 104 kB | ✅ Active |
| quality_reports | 0 | 56 kB | ⚠️ Empty |
| quality_trends | 0 | 24 kB | ⚠️ Empty |
| query_analytics | 0 | 48 kB | ⚠️ Empty |
| relevance_feedback | 0 | 40 kB | ⚠️ Empty |
| requirements | 0 | 40 kB | ⚠️ Empty |
| resolution_strategies | 10 | 144 kB | ✅ Active |
| risks | 0 | 40 kB | ⚠️ Empty |
| search_history | 0 | 72 kB | ⚠️ Empty |
| search_index | 0 | 96 kB | ⚠️ Empty |
| security_events | 0 | 32 kB | ⚠️ Empty |
| source_authority | 7 | 88 kB | ✅ Active |
| stage_executions | 160 | 12 MB | ✅ Active |
| stage_jobs | 0 | 64 kB | ⚠️ Empty |
| stage_metrics | 0 | 40 kB | ⚠️ Empty |
| stakeholders | 20 | 112 kB | ✅ Active |
| success_criteria | 0 | 24 kB | ⚠️ Empty |
| system_metrics | 0 | 40 kB | ⚠️ Empty |
| system_settings | 4 | 128 kB | ✅ Active |
| template_comparison_metrics | 0 | 40 kB | ⚠️ Empty |
| template_maintenance_log | 0 | 48 kB | ⚠️ Empty |
| template_quality_metrics | 37 | 104 kB | ✅ Active |
| template_usage | 32 | 144 kB | ✅ Active |
| template_versions | 0 | 48 kB | ⚠️ Empty |
| templates | 53 | 400 kB | ✅ Active |
| user_activity_logs | 642 | 480 kB | ✅ Active |
| user_analysis | 0 | 40 kB | ⚠️ Empty |
| user_collaboration_preferences | 0 | 32 kB | ⚠️ Empty |
| user_domain_knowledge | 0 | 48 kB | ⚠️ Empty |
| user_expertise | 0 | 56 kB | ⚠️ Empty |
| user_preferences | 0 | 32 kB | ⚠️ Empty |
| user_search_preferences | 0 | 64 kB | ⚠️ Empty |
| user_writing_style | 0 | 24 kB | ⚠️ Empty |
| users | 5 | 184 kB | ✅ Active |
| variable_analysis_results | 0 | 88 kB | ⚠️ Empty |
| variable_patterns | 0 | 80 kB | ⚠️ Empty |
| variable_resolution_cache | 0 | 56 kB | ⚠️ Empty |
| variable_resolution_metrics | 0 | 72 kB | ⚠️ Empty |
| variable_resolution_results | 0 | 128 kB | ⚠️ Empty |
| workflow_executions | 0 | 56 kB | ⚠️ Empty |
| workflow_presets | 0 | 40 kB | ⚠️ Empty |

## Recommendations

### Empty Tables to Review

Consider whether these tables are needed or can be removed:

- `analysis_metrics`
- `analytics_events`
- `best_practices`
- `compression_feedback`
- `constraints`
- `context_bundles`
- `context_cleanup_results`
- `context_freshness_assessments`
- `context_freshness_health_status`
- `context_freshness_metrics`
- `context_freshness_policies`
- `context_freshness_policy_evaluations`
- `context_freshness_policy_results`
- `context_freshness_trends`
- `context_items`
- `context_refresh_results`
- `context_refresh_schedules`
- `context_retrieval_metrics`
- `context_staleness_log`
- `daily_statistics`
- `document_analysis`
- `document_pattern_analysis`
- `document_patterns`
- `document_processing_history`
- `document_processing_jobs`
- `document_quality_metrics`
- `document_tags`
- `embedding_cache`
- `framework_analysis`
- `historical_trends`
- `improvement_suggestions`
- `integration_sync_metadata`
- `integrations`
- `milestones`
- `phases`
- `pipeline_configurations`
- `processing_metrics`
- `project_analysis`
- `quality_reports`
- `quality_trends`
- `query_analytics`
- `relevance_feedback`
- `requirements`
- `risks`
- `search_history`
- `search_index`
- `security_events`
- `stage_jobs`
- `stage_metrics`
- `success_criteria`
- `system_metrics`
- `template_comparison_metrics`
- `template_maintenance_log`
- `template_versions`
- `user_analysis`
- `user_collaboration_preferences`
- `user_domain_knowledge`
- `user_expertise`
- `user_preferences`
- `user_search_preferences`
- `user_writing_style`
- `variable_analysis_results`
- `variable_patterns`
- `variable_resolution_cache`
- `variable_resolution_metrics`
- `variable_resolution_results`
- `workflow_executions`
- `workflow_presets`