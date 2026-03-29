-- Generated authoritative migration baseline from current DB schema
-- Generated on: 2026-03-17T18:44:06.883Z

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- BEGIN;

-- Supabase Compatibility Shim
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'http_header') THEN
    CREATE TYPE public.http_header AS (field text, value text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'http_request') THEN
    CREATE TYPE public.http_request AS (method text, url text, headers public.http_header[], content_type text, content text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'http_response') THEN
    CREATE TYPE public.http_response AS (status int, content_type text, headers public.http_header[], content text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
    CREATE TYPE public.vector;
    CREATE FUNCTION public.vector_in(cstring) RETURNS public.vector AS 'boolin' LANGUAGE internal IMMUTABLE STRICT;
    CREATE FUNCTION public.vector_out(public.vector) RETURNS cstring AS 'boolout' LANGUAGE internal IMMUTABLE STRICT;
    CREATE TYPE public.vector (INPUT = public.vector_in, OUTPUT = public.vector_out, INTERNALLENGTH = VARIABLE, ALIGNMENT = double);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.http_header(field text, value text) RETURNS public.http_header AS $$ BEGIN RETURN (field, value)::public.http_header; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION public.http(req public.http_request) RETURNS public.http_response AS $$ BEGIN RETURN (500, null, null, null)::public.http_response; END; $$ LANGUAGE plpgsql;

-- Extensions
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS "btree_gist"; EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Extension btree_gist not available, using shim if needed'; END $$;
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS "http"; EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Extension http not available, using shim if needed'; END $$;
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Extension pg_stat_statements not available, using shim if needed'; END $$;
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS "pgcrypto"; EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Extension pgcrypto not available, using shim if needed'; END $$;
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS "supabase_vault"; EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Extension supabase_vault not available, using shim if needed'; END $$;
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Extension uuid-ossp not available, using shim if needed'; END $$;
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS "pg_graphql"; EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Extension pg_graphql not available, using shim if needed'; END $$;
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS "wrappers"; EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Extension wrappers not available, using shim if needed'; END $$;
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS "vector"; EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Extension vector not available, using shim if needed'; END $$;

-- Custom Types
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pmbok_domain') THEN CREATE TYPE public."pmbok_domain" AS ENUM ('stakeholders', 'team', 'development_approach', 'planning', 'project_work', 'delivery', 'measurement', 'uncertainty', 'governance', 'scope', 'schedule', 'finance', 'resources', 'risk', 'stakeholders_ops'); END IF; END $$;

-- Sequences
CREATE SEQUENCE IF NOT EXISTS public."context_gathering_metrics_id_seq";
CREATE SEQUENCE IF NOT EXISTS public."context_injection_metrics_id_seq";
CREATE SEQUENCE IF NOT EXISTS public."context_source_logs_id_seq";
CREATE SEQUENCE IF NOT EXISTS public."migrations_id_seq";
CREATE SEQUENCE IF NOT EXISTS public."schema_migrations_id_seq";
CREATE SEQUENCE IF NOT EXISTS public."src_schema_migrations_id_seq";
CREATE SEQUENCE IF NOT EXISTS public."system_metrics_id_seq";

-- Table: action_items
CREATE TABLE IF NOT EXISTS public."action_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "item_id" character varying(50),
  "description" text NOT NULL,
  "owner" character varying(255),
  "priority" character varying(20),
  "status" character varying(20),
  "due_date" timestamp with time zone,
  "completion_date" timestamp with time zone,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "idempotency_key" character varying(64)
,
  PRIMARY KEY (id)
);
ALTER TABLE public."action_items" ENABLE ROW LEVEL SECURITY;

-- Table: activities
CREATE TABLE IF NOT EXISTS public."activities" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "project_id" uuid NOT NULL,
  "activity_name" character varying(500) NOT NULL,
  "description" text,
  "duration_days" integer,
  "start_date" date,
  "end_date" date,
  "status" character varying(50) DEFAULT 'not_started'::character varying,
  "assigned_to" uuid,
  "dependencies" text[],
  "deliverable_id" uuid,
  "extracted_from_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "created_by" uuid,
  "name" character varying(500),
  "category" character varying(100),
  "source_document_id" uuid,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying,
  "idempotency_key" character varying(64)
,
  UNIQUE (idempotency_key),
  PRIMARY KEY (id),
  UNIQUE (project_id, activity_name)
);
ALTER TABLE public."activities" ENABLE ROW LEVEL SECURITY;

-- Table: ai_fallback_chain_entries
CREATE TABLE IF NOT EXISTS public."ai_fallback_chain_entries" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "chain_id" uuid NOT NULL,
  "model_id" uuid NOT NULL,
  "priority" integer NOT NULL,
  "timeout_ms" integer DEFAULT 30000,
  "retry_attempts" integer DEFAULT 1,
  "conditions" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."ai_fallback_chain_entries" ENABLE ROW LEVEL SECURITY;

-- Table: ai_fallback_chains
CREATE TABLE IF NOT EXISTS public."ai_fallback_chains" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" character varying(100) NOT NULL,
  "description" text,
  "task_type" character varying(50) NOT NULL,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."ai_fallback_chains" ENABLE ROW LEVEL SECURITY;

-- Table: ai_model_configurations
CREATE TABLE IF NOT EXISTS public."ai_model_configurations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL,
  "model_id" character varying(255) NOT NULL,
  "model_name" character varying(255) NOT NULL,
  "is_active" boolean DEFAULT true,
  "context_window" integer DEFAULT 128000,
  "max_tokens" integer DEFAULT 4096,
  "temperature" numeric(3) DEFAULT 0.70,
  "top_p" numeric(3) DEFAULT 1.00,
  "frequency_penalty" numeric(3) DEFAULT 0.00,
  "presence_penalty" numeric(3) DEFAULT 0.00,
  "configuration" jsonb DEFAULT '{}'::jsonb,
  "usage_stats" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (provider_id, model_id)
);
ALTER TABLE public."ai_model_configurations" ENABLE ROW LEVEL SECURITY;

-- Table: ai_models
CREATE TABLE IF NOT EXISTS public."ai_models" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL,
  "name" character varying(100) NOT NULL,
  "display_name" character varying(200),
  "description" text,
  "context_length" integer,
  "capabilities" jsonb DEFAULT '[]'::jsonb,
  "is_active" boolean DEFAULT true,
  "is_default" boolean DEFAULT false,
  "priority" integer DEFAULT 0,
  "cost_per_1k_input_tokens" numeric(10),
  "cost_per_1k_output_tokens" numeric(10),
  "settings" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (provider_id, name)
);
ALTER TABLE public."ai_models" ENABLE ROW LEVEL SECURITY;

-- Table: ai_provider_health_metrics
CREATE TABLE IF NOT EXISTS public."ai_provider_health_metrics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL,
  "provider_name" character varying(255) NOT NULL,
  "provider_type" character varying(50) NOT NULL,
  "overall_health" numeric(5) NOT NULL,
  "availability" numeric(5) NOT NULL,
  "response_time" integer NOT NULL,
  "success_rate" numeric(5) NOT NULL,
  "last_tested" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "recommendations" jsonb DEFAULT '[]'::jsonb,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."ai_provider_health_metrics" ENABLE ROW LEVEL SECURITY;

-- Table: ai_provider_test_configs
CREATE TABLE IF NOT EXISTS public."ai_provider_test_configs" (
  "provider_id" uuid NOT NULL,
  "test_types" jsonb DEFAULT '["connectivity", "response_time", "content_quality", "error_handling", "rate_limits"]'::jsonb,
  "timeout_ms" integer DEFAULT 30000,
  "retry_attempts" integer DEFAULT 3,
  "batch_size" integer DEFAULT 5,
  "test_prompts" jsonb DEFAULT '{"simple": "Hello, how are you?", "complex": "Explain the concept of quantum computing.", "creative": "Write a short story.", "technical": "Analyze algorithm complexity."}'::jsonb,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (provider_id)
);
ALTER TABLE public."ai_provider_test_configs" ENABLE ROW LEVEL SECURITY;

-- Table: ai_provider_test_results
CREATE TABLE IF NOT EXISTS public."ai_provider_test_results" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL,
  "test_type" character varying(50) NOT NULL,
  "status" character varying(20) NOT NULL,
  "score" numeric(5),
  "response_time" integer,
  "details" text,
  "error_message" text,
  "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb
,
  PRIMARY KEY (id)
);
ALTER TABLE public."ai_provider_test_results" ENABLE ROW LEVEL SECURITY;

-- Table: ai_provider_usage
CREATE TABLE IF NOT EXISTS public."ai_provider_usage" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid,
  "document_id" uuid,
  "job_id" uuid,
  "domain" public."pmbok_domain",
  "provider_name" text NOT NULL,
  "provider_type" text,
  "model_name" text,
  "request_id" text,
  "cache_key" text,
  "cache_hit" boolean DEFAULT false,
  "prompt_tokens" integer,
  "completion_tokens" integer,
  "total_tokens" integer,
  "response_time_ms" integer,
  "extraction_runtime_ms" integer,
  "kpi_score" numeric(5),
  "cost_usd" numeric(18),
  "status" text DEFAULT 'success'::text NOT NULL,
  "error_code" text,
  "error_message" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id)
);
ALTER TABLE public."ai_provider_usage" ENABLE ROW LEVEL SECURITY;

-- Table: ai_providers
CREATE TABLE IF NOT EXISTS public."ai_providers" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "name" character varying(100) NOT NULL,
  "provider_type" character varying(50) NOT NULL,
  "api_key_encrypted" text,
  "configuration" jsonb DEFAULT '{}'::jsonb,
  "is_active" boolean DEFAULT true,
  "usage_stats" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "priority" integer DEFAULT 1,
  "rate_limits" jsonb DEFAULT '{"requestsPerDay": 10000, "tokensPerMinute": 90000, "requestsPerMinute": 3500}'::jsonb,
  "available_models" jsonb DEFAULT '[]'::jsonb,
  "default_model" character varying(100)
,
  PRIMARY KEY (id)
);
ALTER TABLE public."ai_providers" ENABLE ROW LEVEL SECURITY;

-- Table: ai_usage_logs
CREATE TABLE IF NOT EXISTS public."ai_usage_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid,
  "model_id" character varying(255),
  "provider_type" character varying(50) NOT NULL,
  "model_name" character varying(255) NOT NULL,
  "request_type" character varying(50) NOT NULL,
  "input_tokens" integer,
  "output_tokens" integer,
  "total_tokens" integer NOT NULL,
  "response_time_ms" integer NOT NULL,
  "success" boolean DEFAULT true NOT NULL,
  "error_message" text,
  "status_code" integer,
  "user_id" uuid,
  "project_id" uuid,
  "document_id" uuid,
  "estimated_cost" numeric(10) DEFAULT 0.00,
  "request_payload" jsonb,
  "response_metadata" jsonb,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."ai_usage_logs" ENABLE ROW LEVEL SECURITY;

-- Table: analysis_metrics
CREATE TABLE IF NOT EXISTS public."analysis_metrics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "metric_date" date NOT NULL,
  "total_analyses" integer DEFAULT 0,
  "pattern_analyses" integer DEFAULT 0,
  "quality_analyses" integer DEFAULT 0,
  "compliance_analyses" integer DEFAULT 0,
  "average_analysis_time" integer DEFAULT 0,
  "patterns_identified" integer DEFAULT 0,
  "best_practices_identified" integer DEFAULT 0,
  "improvement_suggestions_generated" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (metric_date),
  PRIMARY KEY (id)
);
ALTER TABLE public."analysis_metrics" ENABLE ROW LEVEL SECURITY;

-- Table: analytics_events
CREATE TABLE IF NOT EXISTS public."analytics_events" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "event_type" character varying(100) NOT NULL,
  "user_id" uuid,
  "project_id" uuid,
  "properties" jsonb,
  "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."analytics_events" ENABLE ROW LEVEL SECURITY;

-- Table: api_request_logs
CREATE TABLE IF NOT EXISTS public."api_request_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "method" character varying(10) NOT NULL,
  "path" text NOT NULL,
  "endpoint" character varying(255),
  "response_time_ms" integer NOT NULL,
  "status_code" integer NOT NULL,
  "user_id" uuid,
  "ip_address" inet,
  "user_agent" text,
  "request_size" integer DEFAULT 0,
  "response_size" integer DEFAULT 0,
  "error_message" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."api_request_logs" ENABLE ROW LEVEL SECURITY;

-- Table: approval_audit_log
CREATE TABLE IF NOT EXISTS public."approval_audit_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "approval_request_id" uuid,
  "approval_step_id" uuid,
  "action_type" character varying(100) NOT NULL,
  "action_description" text NOT NULL,
  "performed_by" uuid,
  "performed_by_system" boolean DEFAULT false,
  "previous_state" jsonb,
  "new_state" jsonb,
  "ip_address" character varying(50),
  "user_agent" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."approval_audit_log" ENABLE ROW LEVEL SECURITY;

-- Table: approval_escalations
CREATE TABLE IF NOT EXISTS public."approval_escalations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "approval_request_id" uuid NOT NULL,
  "escalation_type" character varying(50) NOT NULL,
  "escalated_from_user_id" uuid,
  "escalated_to_user_id" uuid,
  "escalated_from_role" character varying(100),
  "escalated_to_role" character varying(100),
  "reason" text NOT NULL,
  "context" jsonb,
  "resolution_status" character varying(50) DEFAULT 'pending'::character varying,
  "resolved_at" timestamp without time zone,
  "resolution_notes" text,
  "escalated_at" timestamp without time zone DEFAULT now(),
  "escalated_by" uuid,
  "metadata" jsonb DEFAULT '{}'::jsonb
,
  PRIMARY KEY (id)
);
ALTER TABLE public."approval_escalations" ENABLE ROW LEVEL SECURITY;

-- Table: approval_notifications
CREATE TABLE IF NOT EXISTS public."approval_notifications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "approval_request_id" uuid NOT NULL,
  "approval_step_id" uuid,
  "notification_type" character varying(50) NOT NULL,
  "channel" character varying(50) NOT NULL,
  "recipient_user_id" uuid,
  "recipient_email" character varying(255),
  "recipient_phone" character varying(50),
  "subject" character varying(500),
  "message" text NOT NULL,
  "status" character varying(50) DEFAULT 'pending'::character varying,
  "sent_at" timestamp without time zone,
  "failed_at" timestamp without time zone,
  "failure_reason" text,
  "opened_at" timestamp without time zone,
  "clicked_at" timestamp without time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."approval_notifications" ENABLE ROW LEVEL SECURITY;

-- Table: approval_requests
CREATE TABLE IF NOT EXISTS public."approval_requests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workflow_id" uuid,
  "request_type" character varying(50) NOT NULL,
  "change_request_id" uuid,
  "drift_record_id" uuid,
  "project_id" uuid,
  "title" character varying(500) NOT NULL,
  "description" text NOT NULL,
  "impact_summary" jsonb,
  "current_stage" integer DEFAULT 1,
  "total_stages" integer NOT NULL,
  "status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
  "priority" character varying(20) DEFAULT 'medium'::character varying NOT NULL,
  "severity" character varying(20) DEFAULT 'medium'::character varying NOT NULL,
  "sla_deadline" timestamp without time zone,
  "escalation_deadline" timestamp without time zone,
  "requested_by" uuid NOT NULL,
  "requested_at" timestamp without time zone DEFAULT now(),
  "completed_at" timestamp without time zone,
  "final_decision" character varying(50),
  "decision_notes" text,
  "decided_by" uuid,
  "decided_at" timestamp without time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."approval_requests" ENABLE ROW LEVEL SECURITY;

-- Table: approval_steps
CREATE TABLE IF NOT EXISTS public."approval_steps" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "approval_request_id" uuid NOT NULL,
  "step_order" integer NOT NULL,
  "step_name" character varying(255) NOT NULL,
  "step_description" text,
  "approver_role" character varying(100),
  "approver_user_id" uuid,
  "is_required" boolean DEFAULT true,
  "is_conditional" boolean DEFAULT false,
  "condition_expression" text,
  "status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
  "decision" character varying(50),
  "decision_notes" text,
  "conditions" text[],
  "assigned_at" timestamp without time zone DEFAULT now(),
  "responded_at" timestamp without time zone,
  "delegated_to" uuid,
  "delegated_at" timestamp without time zone,
  "delegated_reason" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  UNIQUE (approval_request_id, step_order),
  PRIMARY KEY (id)
);
ALTER TABLE public."approval_steps" ENABLE ROW LEVEL SECURITY;

-- Table: approval_workflows
CREATE TABLE IF NOT EXISTS public."approval_workflows" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text,
  "trigger_condition" text,
  "approvers" text[],
  "sla_hours" integer,
  "status" character varying(50),
  "gates" text[],
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."approval_workflows" ENABLE ROW LEVEL SECURITY;

-- Table: assessments
CREATE TABLE IF NOT EXISTS public."assessments" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "batch_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "overall_maturity_level" integer DEFAULT 1 NOT NULL,
  "maturity_label" character varying(50) DEFAULT 'Ad-hoc'::character varying NOT NULL,
  "avg_quality_score" numeric(5) DEFAULT 0.00 NOT NULL,
  "total_documents" integer DEFAULT 0 NOT NULL,
  "gaps_count" integer DEFAULT 0 NOT NULL,
  "assessment_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "gaps" jsonb DEFAULT '[]'::jsonb,
  "benchmarks" jsonb DEFAULT '{}'::jsonb,
  "roi_metrics" jsonb DEFAULT '{}'::jsonb,
  "status" character varying(20) DEFAULT 'processing'::character varying NOT NULL,
  "created_at" timestamp without time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp without time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp without time zone,
  "company_id" uuid
,
  PRIMARY KEY (id)
);
ALTER TABLE public."assessments" ENABLE ROW LEVEL SECURITY;

-- Table: audit_log
CREATE TABLE IF NOT EXISTS public."audit_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "actor_user_id" uuid,
  "ip" inet,
  "user_agent" text,
  "request_id" text,
  "table_name" text NOT NULL,
  "row_id" uuid,
  "action" text NOT NULL,
  "reason" text,
  "old_values" jsonb,
  "new_values" jsonb,
  "prev_hash" text,
  "hash" text
,
  PRIMARY KEY (id)
);
ALTER TABLE public."audit_log" ENABLE ROW LEVEL SECURITY;

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS public."audit_logs" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "user_id" uuid,
  "action" character varying(100) NOT NULL,
  "resource_type" character varying(50),
  "resource_id" uuid,
  "old_values" jsonb,
  "new_values" jsonb,
  "ip_address" inet,
  "user_agent" text,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."audit_logs" ENABLE ROW LEVEL SECURITY;

-- Table: baseline_comparisons
CREATE TABLE IF NOT EXISTS public."baseline_comparisons" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "baseline_id" uuid NOT NULL,
  "comparison_type" character varying(50) DEFAULT 'current_state'::character varying,
  "comparison_result" jsonb NOT NULL,
  "summary" jsonb,
  "drift_detected" boolean DEFAULT false,
  "drift_severity" character varying(20),
  "drift_summary" text,
  "compared_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "compared_by" uuid
,
  PRIMARY KEY (id)
);
ALTER TABLE public."baseline_comparisons" ENABLE ROW LEVEL SECURITY;

-- Table: baseline_compliance_reviews
CREATE TABLE IF NOT EXISTS public."baseline_compliance_reviews" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "baseline_id" uuid NOT NULL,
  "review_type" character varying(50) NOT NULL,
  "review_status" character varying(50) NOT NULL,
  "scope_compliance_score" numeric(3),
  "technical_compliance_score" numeric(3),
  "schedule_compliance_score" numeric(3),
  "cost_compliance_score" numeric(3),
  "feasibility_score" numeric(3),
  "review_summary" text NOT NULL,
  "non_compliance_items" jsonb DEFAULT '[]'::jsonb,
  "recommendations" jsonb DEFAULT '[]'::jsonb,
  "critical_findings" jsonb DEFAULT '[]'::jsonb,
  "reviewed_by" uuid,
  "reviewed_at" timestamp without time zone DEFAULT now(),
  "required_actions" jsonb DEFAULT '[]'::jsonb,
  "change_requests_required" jsonb DEFAULT '[]'::jsonb,
  "created_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."baseline_compliance_reviews" ENABLE ROW LEVEL SECURITY;

-- Table: baseline_components
CREATE TABLE IF NOT EXISTS public."baseline_components" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "baseline_id" uuid NOT NULL,
  "component_type" character varying(50) NOT NULL,
  "title" character varying(255) NOT NULL,
  "description" text,
  "priority" character varying(20) DEFAULT 'medium'::character varying,
  "source_document_id" uuid,
  "source_text" text,
  "confidence_score" numeric(3) DEFAULT 0.0,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "sort_order" integer DEFAULT 0,
  "parent_component_id" uuid
,
  PRIMARY KEY (id),
  UNIQUE (baseline_id, component_type, title)
);
ALTER TABLE public."baseline_components" ENABLE ROW LEVEL SECURITY;

-- Table: baseline_drift_detection
CREATE TABLE IF NOT EXISTS public."baseline_drift_detection" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "baseline_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "detection_date" timestamp without time zone DEFAULT now(),
  "detection_type" character varying(50) NOT NULL,
  "drift_severity" character varying(20) DEFAULT 'medium'::character varying NOT NULL,
  "drift_description" text NOT NULL,
  "drift_impact" text,
  "source_document_id" uuid,
  "detected_by" character varying(50) DEFAULT 'ai'::character varying,
  "ai_confidence" numeric(3) DEFAULT 0.0,
  "ai_processing_metadata" jsonb,
  "status" character varying(20) DEFAULT 'detected'::character varying,
  "assigned_to" uuid,
  "resolution_notes" text,
  "resolved_at" timestamp without time zone,
  "alert_sent" boolean DEFAULT false,
  "alert_sent_at" timestamp without time zone
,
  PRIMARY KEY (id)
);
ALTER TABLE public."baseline_drift_detection" ENABLE ROW LEVEL SECURITY;

-- Table: baseline_drift_findings
CREATE TABLE IF NOT EXISTS public."baseline_drift_findings" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "project_id" uuid,
  "category" character varying(100),
  "severity" character varying(50),
  "status" character varying(50),
  "detected_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "impact_area" character varying(100),
  "variance_value" numeric,
  "variance_units" character varying(50),
  "description" text
,
  PRIMARY KEY (id)
);
ALTER TABLE public."baseline_drift_findings" ENABLE ROW LEVEL SECURITY;

-- Table: baseline_versions
CREATE TABLE IF NOT EXISTS public."baseline_versions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "baseline_id" uuid NOT NULL,
  "version_number" character varying(20) NOT NULL,
  "change_type" character varying(50) NOT NULL,
  "change_description" text NOT NULL,
  "changed_by" uuid NOT NULL,
  "changed_at" timestamp without time zone DEFAULT now(),
  "changes_summary" jsonb,
  "affected_components" jsonb
,
  PRIMARY KEY (id),
  UNIQUE (baseline_id, version_number)
);
ALTER TABLE public."baseline_versions" ENABLE ROW LEVEL SECURITY;

-- Table: baselines
CREATE TABLE IF NOT EXISTS public."baselines" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "project_id" uuid,
  "version" integer,
  "approval_status" character varying(50),
  "scope_baseline" text,
  "technical_baseline" text,
  "timeline_baseline" text,
  "cost_baseline" numeric,
  "resource_baseline" text,
  "success_criteria" text,
  "extraction_confidence" numeric,
  "completeness_score" numeric,
  "consistency_score" numeric,
  "clarity_score" numeric,
  "approved_by" uuid,
  "approved_at" timestamp with time zone,
  "baseline_snapshot_hash" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamp with time zone,
  "baseline_type" character varying(50),
  "created_by" uuid,
  "scope_snapshot" jsonb,
  "schedule_snapshot" jsonb,
  "cost_snapshot" jsonb
,
  PRIMARY KEY (id)
);
ALTER TABLE public."baselines" ENABLE ROW LEVEL SECURITY;

-- Table: batch_files
CREATE TABLE IF NOT EXISTS public."batch_files" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "batch_id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  "filename" character varying(1000),
  "status" character varying(30) DEFAULT 'pending'::character varying,
  "document_id" uuid,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."batch_files" ENABLE ROW LEVEL SECURITY;

-- Table: benefit_realization_plan
CREATE TABLE IF NOT EXISTS public."benefit_realization_plan" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "benefit_description" text NOT NULL,
  "target_value" numeric,
  "measurement_frequency" character varying(50),
  "realization_date" timestamp with time zone,
  "owner" character varying(255),
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."benefit_realization_plan" ENABLE ROW LEVEL SECURITY;

-- Table: best_practices
CREATE TABLE IF NOT EXISTS public."best_practices" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "project_id" uuid NOT NULL,
  "title" character varying(500) NOT NULL,
  "description" text,
  "category" character varying(100),
  "source" character varying(255),
  "applicability" text,
  "implementation_notes" text,
  "extracted_from_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "created_by" uuid,
  "source_document_id" uuid,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying,
  "template_id" uuid,
  "effectiveness" numeric DEFAULT 0.8,
  "implementation_guidance" jsonb DEFAULT '[]'::jsonb,
  "success_factors" jsonb DEFAULT '[]'::jsonb,
  "common_pitfalls" jsonb DEFAULT '[]'::jsonb
,
  PRIMARY KEY (id),
  UNIQUE (project_id, title)
);
ALTER TABLE public."best_practices" ENABLE ROW LEVEL SECURITY;

-- Table: budget_baseline
CREATE TABLE IF NOT EXISTS public."budget_baseline" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "total_budget" numeric,
  "currency" character varying(10) DEFAULT 'USD'::character varying,
  "categories" jsonb,
  "approval_date" timestamp with time zone,
  "version" character varying(50),
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "idempotency_key" character varying(64)
,
  PRIMARY KEY (id)
);
ALTER TABLE public."budget_baseline" ENABLE ROW LEVEL SECURITY;

-- Table: budget_baselines
CREATE TABLE IF NOT EXISTS public."budget_baselines" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "baseline_name" text NOT NULL,
  "baseline_version" integer DEFAULT 1 NOT NULL,
  "total_budget" numeric(15) NOT NULL,
  "budget_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "contingency_reserve" numeric(15) DEFAULT 0,
  "management_reserve" numeric(15) DEFAULT 0,
  "approval_date" date,
  "approved_by" text[],
  "status" text DEFAULT 'draft'::text NOT NULL,
  "is_current" boolean DEFAULT true,
  "currency" text DEFAULT 'USD'::text,
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "idempotency_key" character varying(64)
,
  UNIQUE (idempotency_key),
  PRIMARY KEY (id),
  UNIQUE (project_id, baseline_name, baseline_version)
);
ALTER TABLE public."budget_baselines" ENABLE ROW LEVEL SECURITY;

-- Table: business_case_details
CREATE TABLE IF NOT EXISTS public."business_case_details" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "problem_statement" text,
  "proposed_solution" text,
  "estimated_roi" numeric,
  "payback_period_months" integer,
  "npv_value" numeric,
  "strategic_category" character varying(100),
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."business_case_details" ENABLE ROW LEVEL SECURITY;

-- Table: capacity_forecasts
CREATE TABLE IF NOT EXISTS public."capacity_forecasts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "forecast_date" date NOT NULL,
  "role" text NOT NULL,
  "skill_level" text,
  "forecasted_demand_hours" numeric(10) NOT NULL,
  "available_capacity_hours" numeric(10) NOT NULL,
  "capacity_gap_hours" numeric(10),
  "utilization_forecast_pct" numeric(5),
  "assumptions" text[],
  "mitigation_plan" text,
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "available_hours" integer,
  "demand_hours" integer,
  "gap_hours" numeric
,
  PRIMARY KEY (id),
  UNIQUE (project_id, forecast_date, role, skill_level)
);
ALTER TABLE public."capacity_forecasts" ENABLE ROW LEVEL SECURITY;

-- Table: capacity_plans
CREATE TABLE IF NOT EXISTS public."capacity_plans" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "team_member" text NOT NULL,
  "role" text,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "available_hours" numeric(10),
  "allocated_hours" numeric(10),
  "utilization_percentage" numeric(5),
  "notes" text,
  "source_document_id" uuid,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, team_member, period_start, period_end)
);
ALTER TABLE public."capacity_plans" ENABLE ROW LEVEL SECURITY;

-- Table: change_control_boards
CREATE TABLE IF NOT EXISTS public."change_control_boards" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" character varying(255) NOT NULL,
  "authority_level" character varying(255),
  "members" text[],
  "decision_criteria" text,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."change_control_boards" ENABLE ROW LEVEL SECURITY;

-- Table: checklist_items
CREATE TABLE IF NOT EXISTS public."checklist_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL,
  "item_name" character varying(500) NOT NULL,
  "description" text,
  "sequence_order" integer DEFAULT 0,
  "assigned_user_id" uuid,
  "assigned_user_name" character varying(255),
  "assigned_role_id" uuid,
  "assigned_role_name" character varying(100),
  "estimated_hours" numeric(8),
  "actual_hours" numeric(8) DEFAULT 0,
  "is_completed" boolean DEFAULT false,
  "is_blocked" boolean DEFAULT false,
  "blocked_reason" text,
  "priority" character varying(20) DEFAULT 'medium'::character varying,
  "category" character varying(100),
  "due_date" date,
  "completed_at" timestamp without time zone,
  "completed_by" uuid,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "status" character varying(50) DEFAULT 'pending'::character varying,
  "assigned_to" uuid,
  "assigned_by" uuid,
  "completed_date" date,
  "estimated_minutes" integer,
  "actual_minutes" integer,
  "depends_on_items" uuid[],
  "blocks_items" uuid[],
  "acceptance_criteria" text[],
  "requires_validation" boolean DEFAULT false,
  "requires_approval" boolean DEFAULT false,
  "validated_by" uuid,
  "validated_at" timestamp without time zone,
  "approved_by" uuid,
  "approved_at" timestamp without time zone,
  "validation_notes" text,
  "quality_gate_id" uuid,
  "must_pass_to_proceed" boolean DEFAULT false,
  "deliverable_id" uuid,
  "display_order" integer DEFAULT 0
,
  PRIMARY KEY (id)
);
ALTER TABLE public."checklist_items" ENABLE ROW LEVEL SECURITY;

-- Table: communication_logs
CREATE TABLE IF NOT EXISTS public."communication_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "sender" character varying(255),
  "recipient" character varying(255),
  "communication_type" character varying(50),
  "communication_date" timestamp with time zone,
  "subject" character varying(255),
  "content_summary" text,
  "key_decisions_made" text,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."communication_logs" ENABLE ROW LEVEL SECURITY;

-- Table: companies
CREATE TABLE IF NOT EXISTS public."companies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" character varying(255) NOT NULL,
  "domain" character varying(255),
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamp with time zone
,
  PRIMARY KEY (id)
);
ALTER TABLE public."companies" ENABLE ROW LEVEL SECURITY;

-- Table: competencies
CREATE TABLE IF NOT EXISTS public."competencies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text,
  "category" character varying(100),
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  UNIQUE (name),
  PRIMARY KEY (id)
);
ALTER TABLE public."competencies" ENABLE ROW LEVEL SECURITY;

-- Table: compliance_security
CREATE TABLE IF NOT EXISTS public."compliance_security" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "title" character varying(255) NOT NULL,
  "category" character varying(50) NOT NULL,
  "type" character varying(100),
  "description" text,
  "requirement_text" text,
  "status" character varying(50) DEFAULT 'applicable'::character varying,
  "security_score" integer,
  "latest_breach" date,
  "data_at_rest_encryption" character varying(100),
  "multi_factor_authentication" boolean,
  "ip_address_restriction" boolean,
  "user_audit_trail" boolean,
  "admin_audit_trail" boolean,
  "data_audit_trail" boolean,
  "user_can_upload_data" boolean,
  "data_classification" boolean,
  "remember_password" boolean,
  "user_roles_support" boolean,
  "file_sharing" boolean,
  "valid_certificate_name" character varying(255),
  "trusted_certificate" boolean,
  "encryption_protocol" character varying(50),
  "heartbleed_patched" boolean,
  "http_security_headers" boolean,
  "supports_saml" boolean,
  "protected_against_drown" boolean,
  "penetration_testing" boolean,
  "requires_user_authentication" boolean,
  "password_policy" text,
  "iso_27001" boolean,
  "iso_27018" boolean,
  "iso_27017" boolean,
  "iso_27002" boolean,
  "finra" boolean,
  "fisma" boolean,
  "gaap" boolean,
  "hipaa" boolean,
  "isae_3402" boolean,
  "itar" boolean,
  "soc_1" boolean,
  "soc_2" boolean,
  "soc_3" boolean,
  "sox" boolean,
  "sp_800_53" boolean,
  "ssae_18" boolean,
  "safe_harbor" boolean,
  "pci_dss_version" character varying(10),
  "glba" boolean,
  "fedramp_level" character varying(50),
  "csa_star_level" character varying(50),
  "certification" boolean,
  "privacy_shield" boolean,
  "ffiec" boolean,
  "gapp" boolean,
  "cobit" boolean,
  "coppa" boolean,
  "ferpa" boolean,
  "hitrust_csf" boolean,
  "jericho_forum_commandments" boolean,
  "data_ownership" text,
  "dmca" boolean,
  "data_retention_policy" text,
  "gdpr_readiness_statement" text,
  "gdpr_right_to_erasure" boolean,
  "gdpr_report_data_breaches" boolean,
  "gdpr_data_protection" boolean,
  "gdpr_user_ownership" boolean,
  "other_standards" jsonb DEFAULT '{}'::jsonb,
  "compliance_score" integer,
  "source_document_id" uuid,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamp with time zone
,
  PRIMARY KEY (id),
  UNIQUE (project_id, title)
);
ALTER TABLE public."compliance_security" ENABLE ROW LEVEL SECURITY;

-- Table: compression_feedback
CREATE TABLE IF NOT EXISTS public."compression_feedback" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid,
  "rating" integer,
  "feedback" text,
  "compression_method" character varying(50) NOT NULL,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."compression_feedback" ENABLE ROW LEVEL SECURITY;

-- Table: compression_metrics
CREATE TABLE IF NOT EXISTS public."compression_metrics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid,
  "strategy_used" character varying(50) NOT NULL,
  "quality_metrics" jsonb DEFAULT '{}'::jsonb,
  "processing_time_ms" integer,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."compression_metrics" ENABLE ROW LEVEL SECURITY;

-- Table: compression_strategies
CREATE TABLE IF NOT EXISTS public."compression_strategies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "method" character varying(50) NOT NULL,
  "project_type" character varying(100),
  "document_type" character varying(100),
  "quality_metrics" jsonb,
  "average_rating" numeric(3) DEFAULT 0,
  "total_ratings" integer DEFAULT 0,
  "usage_count" integer DEFAULT 0,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (method),
  PRIMARY KEY (id)
);
ALTER TABLE public."compression_strategies" ENABLE ROW LEVEL SECURITY;

-- Table: constraints
CREATE TABLE IF NOT EXISTS public."constraints" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text NOT NULL,
  "type" character varying(20) DEFAULT 'technical'::character varying,
  "impact" character varying(20) DEFAULT 'medium'::character varying,
  "mitigation_strategy" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamp with time zone,
  "title" character varying(500),
  "created_by" uuid,
  "source_document_id" uuid,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying,
  "idempotency_key" character varying(64)
,
  UNIQUE (idempotency_key),
  PRIMARY KEY (id),
  UNIQUE (project_id, name)
);
ALTER TABLE public."constraints" ENABLE ROW LEVEL SECURITY;

-- Table: context_bundles
CREATE TABLE IF NOT EXISTS public."context_bundles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid NOT NULL,
  "project_id" uuid,
  "user_id" uuid NOT NULL,
  "results" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "injection_strategy" character varying(50) DEFAULT 'prepend'::character varying NOT NULL,
  "max_context_length" integer DEFAULT 4000 NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id)
);
ALTER TABLE public."context_bundles" ENABLE ROW LEVEL SECURITY;

-- Table: context_cleanup_results
CREATE TABLE IF NOT EXISTS public."context_cleanup_results" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cleanup_id" character varying(255) NOT NULL,
  "started_at" timestamp with time zone NOT NULL,
  "completed_at" timestamp with time zone NOT NULL,
  "duration" integer NOT NULL,
  "contexts_processed" integer DEFAULT 0,
  "contexts_cleaned" integer DEFAULT 0,
  "contexts_refreshed" integer DEFAULT 0,
  "contexts_archived" integer DEFAULT 0,
  "contexts_deleted" integer DEFAULT 0,
  "storage_freed" bigint DEFAULT 0,
  "performance_improvement" numeric(3) DEFAULT 0.0,
  "errors" jsonb DEFAULT '[]'::jsonb,
  "summary" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (cleanup_id),
  PRIMARY KEY (id)
);
ALTER TABLE public."context_cleanup_results" ENABLE ROW LEVEL SECURITY;

-- Table: context_freshness_assessments
CREATE TABLE IF NOT EXISTS public."context_freshness_assessments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "context_id" uuid NOT NULL,
  "assessed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "freshness_score" numeric(3) NOT NULL,
  "staleness_level" character varying(20) NOT NULL,
  "decay_rate" numeric(3) DEFAULT 0.0,
  "time_since_update" integer DEFAULT 0,
  "time_since_access" integer DEFAULT 0,
  "freshness_trend" jsonb DEFAULT '{}'::jsonb,
  "recommendations" jsonb DEFAULT '[]'::jsonb,
  "next_assessment_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."context_freshness_assessments" ENABLE ROW LEVEL SECURITY;

-- Table: context_freshness_health_status
CREATE TABLE IF NOT EXISTS public."context_freshness_health_status" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "overall_health" character varying(20) NOT NULL,
  "health_score" numeric(3) NOT NULL,
  "component_health" jsonb DEFAULT '[]'::jsonb,
  "alerts" jsonb DEFAULT '[]'::jsonb,
  "recommendations" jsonb DEFAULT '[]'::jsonb,
  "last_assessment" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "next_assessment" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."context_freshness_health_status" ENABLE ROW LEVEL SECURITY;

-- Table: context_freshness_metrics
CREATE TABLE IF NOT EXISTS public."context_freshness_metrics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "metric_date" date NOT NULL,
  "total_contexts" integer DEFAULT 0,
  "fresh_contexts" integer DEFAULT 0,
  "stale_contexts" integer DEFAULT 0,
  "expired_contexts" integer DEFAULT 0,
  "average_freshness_score" numeric(3) DEFAULT 0.0,
  "freshness_distribution" jsonb DEFAULT '{}'::jsonb,
  "staleness_trends" jsonb DEFAULT '[]'::jsonb,
  "refresh_statistics" jsonb DEFAULT '{}'::jsonb,
  "performance_metrics" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (metric_date),
  PRIMARY KEY (id)
);
ALTER TABLE public."context_freshness_metrics" ENABLE ROW LEVEL SECURITY;

-- Table: context_freshness_policies
CREATE TABLE IF NOT EXISTS public."context_freshness_policies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "policy_id" character varying(255) NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text,
  "context_types" text[] DEFAULT '{}'::text[],
  "freshness_rules" jsonb DEFAULT '[]'::jsonb,
  "staleness_thresholds" jsonb DEFAULT '[]'::jsonb,
  "refresh_strategies" jsonb DEFAULT '[]'::jsonb,
  "cleanup_rules" jsonb DEFAULT '[]'::jsonb,
  "priority_rules" jsonb DEFAULT '[]'::jsonb,
  "enabled" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_by" character varying(255) NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb
,
  PRIMARY KEY (id),
  UNIQUE (policy_id)
);
ALTER TABLE public."context_freshness_policies" ENABLE ROW LEVEL SECURITY;

-- Table: context_freshness_policy_evaluations
CREATE TABLE IF NOT EXISTS public."context_freshness_policy_evaluations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "policy_id" character varying(255) NOT NULL,
  "evaluated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "contexts_evaluated" integer DEFAULT 0,
  "actions_recommended" integer DEFAULT 0,
  "actions_executed" integer DEFAULT 0,
  "success_rate" numeric(3) DEFAULT 0.0,
  "performance_impact" jsonb DEFAULT '{}'::jsonb,
  "quality_impact" jsonb DEFAULT '{}'::jsonb,
  "cost_benefit_analysis" jsonb DEFAULT '{}'::jsonb,
  "recommendations" jsonb DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."context_freshness_policy_evaluations" ENABLE ROW LEVEL SECURITY;

-- Table: context_freshness_policy_results
CREATE TABLE IF NOT EXISTS public."context_freshness_policy_results" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "policy_id" character varying(255) NOT NULL,
  "context_id" uuid NOT NULL,
  "applied_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "success" boolean DEFAULT true,
  "actions_taken" jsonb DEFAULT '[]'::jsonb,
  "performance_impact" jsonb DEFAULT '{}'::jsonb,
  "quality_impact" jsonb DEFAULT '{}'::jsonb,
  "error_message" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."context_freshness_policy_results" ENABLE ROW LEVEL SECURITY;

-- Table: context_freshness_trends
CREATE TABLE IF NOT EXISTS public."context_freshness_trends" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "context_id" uuid NOT NULL,
  "timeframe" character varying(20) NOT NULL,
  "trend_data" jsonb DEFAULT '[]'::jsonb,
  "trend_direction" character varying(20) DEFAULT 'stable'::character varying,
  "trend_strength" numeric(3) DEFAULT 0.0,
  "seasonality" boolean DEFAULT false,
  "forecast" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."context_freshness_trends" ENABLE ROW LEVEL SECURITY;

-- Table: context_gathering_metrics
CREATE TABLE IF NOT EXISTS public."context_gathering_metrics" (
  "id" integer DEFAULT nextval('context_gathering_metrics_id_seq'::regclass) NOT NULL,
  "request_id" character varying(255) NOT NULL,
  "total_sources_attempted" integer DEFAULT 0 NOT NULL,
  "successful_sources" integer DEFAULT 0 NOT NULL,
  "failed_sources" integer DEFAULT 0 NOT NULL,
  "total_data_size_bytes" bigint DEFAULT 0 NOT NULL,
  "total_processing_time_ms" integer DEFAULT 0 NOT NULL,
  "average_freshness_score" numeric(3) DEFAULT 0.0,
  "access_control_checks" integer DEFAULT 0 NOT NULL,
  "cache_hit_rate" numeric(3) DEFAULT 0.0,
  "error_rate" numeric(3) DEFAULT 0.0,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."context_gathering_metrics" ENABLE ROW LEVEL SECURITY;

-- Table: context_injection_metrics
CREATE TABLE IF NOT EXISTS public."context_injection_metrics" (
  "id" integer DEFAULT nextval('context_injection_metrics_id_seq'::regclass) NOT NULL,
  "bundle_id" character varying(255) NOT NULL,
  "template_id" character varying(255) NOT NULL,
  "project_id" character varying(255),
  "user_id" character varying(255) NOT NULL,
  "total_sources" integer DEFAULT 0 NOT NULL,
  "successful_sources" integer DEFAULT 0 NOT NULL,
  "failed_sources" integer DEFAULT 0 NOT NULL,
  "total_size_bytes" bigint DEFAULT 0 NOT NULL,
  "processing_time_ms" integer DEFAULT 0 NOT NULL,
  "injection_strategy" character varying(100) NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."context_injection_metrics" ENABLE ROW LEVEL SECURITY;

-- Table: context_items
CREATE TABLE IF NOT EXISTS public."context_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "type" character varying(50) NOT NULL,
  "source" character varying(255) NOT NULL,
  "content" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "freshness_score" numeric(3) DEFAULT 1.0,
  "is_stale" boolean DEFAULT false,
  "staleness_reason" text,
  "marked_stale_at" timestamp with time zone,
  "is_archived" boolean DEFAULT false,
  "archived_at" timestamp with time zone,
  "last_refreshed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "last_accessed_at" timestamp with time zone,
  "expires_at" timestamp with time zone
,
  PRIMARY KEY (id)
);
ALTER TABLE public."context_items" ENABLE ROW LEVEL SECURITY;

-- Table: context_refresh_results
CREATE TABLE IF NOT EXISTS public."context_refresh_results" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "context_id" uuid NOT NULL,
  "refreshed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "refresh_duration" integer DEFAULT 0,
  "success" boolean DEFAULT true,
  "new_freshness_score" numeric(3) DEFAULT 0.0,
  "changes_detected" boolean DEFAULT false,
  "change_summary" jsonb DEFAULT '[]'::jsonb,
  "error_message" text,
  "performance_metrics" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."context_refresh_results" ENABLE ROW LEVEL SECURITY;

-- Table: context_refresh_schedules
CREATE TABLE IF NOT EXISTS public."context_refresh_schedules" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "schedule_id" character varying(255) NOT NULL,
  "context_id" uuid NOT NULL,
  "schedule_type" character varying(20) NOT NULL,
  "frequency" character varying(20) NOT NULL,
  "start_time" timestamp with time zone NOT NULL,
  "end_time" timestamp with time zone,
  "timezone" character varying(50) DEFAULT 'UTC'::character varying,
  "enabled" boolean DEFAULT true,
  "last_execution" timestamp with time zone,
  "next_execution" timestamp with time zone,
  "execution_count" integer DEFAULT 0,
  "success_count" integer DEFAULT 0,
  "failure_count" integer DEFAULT 0,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (schedule_id)
);
ALTER TABLE public."context_refresh_schedules" ENABLE ROW LEVEL SECURITY;

-- Table: context_retrieval_metrics
CREATE TABLE IF NOT EXISTS public."context_retrieval_metrics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "metric_date" date NOT NULL,
  "total_queries" integer DEFAULT 0,
  "successful_queries" integer DEFAULT 0,
  "failed_queries" integer DEFAULT 0,
  "average_response_time" integer DEFAULT 0,
  "cache_hit_rate" numeric(5) DEFAULT 0.0,
  "average_relevance_score" numeric(3) DEFAULT 0.0,
  "semantic_search_usage" integer DEFAULT 0,
  "keyword_search_usage" integer DEFAULT 0,
  "hybrid_search_usage" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (metric_date),
  PRIMARY KEY (id)
);
ALTER TABLE public."context_retrieval_metrics" ENABLE ROW LEVEL SECURITY;

-- Table: context_source_logs
CREATE TABLE IF NOT EXISTS public."context_source_logs" (
  "id" integer DEFAULT nextval('context_source_logs_id_seq'::regclass) NOT NULL,
  "source_id" character varying(255) NOT NULL,
  "source_type" character varying(100) NOT NULL,
  "source_name" character varying(255) NOT NULL,
  "retrieval_timestamp" timestamp with time zone NOT NULL,
  "retrieval_duration_ms" integer DEFAULT 0 NOT NULL,
  "data_size_bytes" bigint DEFAULT 0 NOT NULL,
  "success" boolean DEFAULT false NOT NULL,
  "error_message" text,
  "freshness_score" numeric(3) DEFAULT 0.0,
  "access_granted" boolean DEFAULT false NOT NULL,
  "cache_hit" boolean DEFAULT false NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."context_source_logs" ENABLE ROW LEVEL SECURITY;

-- Table: context_staleness_log
CREATE TABLE IF NOT EXISTS public."context_staleness_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "context_id" uuid NOT NULL,
  "action" character varying(20) NOT NULL,
  "reason" text NOT NULL,
  "performed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "performed_by" character varying(255) DEFAULT 'system'::character varying,
  "metadata" jsonb DEFAULT '{}'::jsonb
,
  PRIMARY KEY (id)
);
ALTER TABLE public."context_staleness_log" ENABLE ROW LEVEL SECURITY;

-- Table: contingency_reserves
CREATE TABLE IF NOT EXISTS public."contingency_reserves" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "reserve_id" text NOT NULL,
  "reserve_type" text NOT NULL,
  "allocated_amount" numeric(15),
  "allocated_days" integer,
  "consumed_amount" numeric(15) DEFAULT 0,
  "consumed_days" integer DEFAULT 0,
  "remaining_amount" numeric(15),
  "remaining_days" integer,
  "associated_risks" uuid[],
  "release_criteria" text,
  "status" text,
  "currency" text DEFAULT 'USD'::text,
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "category" character varying(100),
  "allocated_to" text,
  "amount" numeric,
  "utilization" numeric
,
  PRIMARY KEY (id),
  UNIQUE (project_id, reserve_id)
);
ALTER TABLE public."contingency_reserves" ENABLE ROW LEVEL SECURITY;

-- Table: cost_actuals
CREATE TABLE IF NOT EXISTS public."cost_actuals" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "period_start_date" date NOT NULL,
  "period_end_date" date NOT NULL,
  "category" text NOT NULL,
  "wbs_code" text,
  "planned_amount" numeric(15),
  "actual_amount" numeric(15) NOT NULL,
  "variance" numeric(15),
  "variance_percentage" numeric(5),
  "cumulative_planned" numeric(15),
  "cumulative_actual" numeric(15),
  "cumulative_variance" numeric(15),
  "invoice_number" text,
  "payment_date" date,
  "currency" text DEFAULT 'USD'::text,
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id)
);
ALTER TABLE public."cost_actuals" ENABLE ROW LEVEL SECURITY;

-- Table: cost_categories
CREATE TABLE IF NOT EXISTS public."cost_categories" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "name" character varying(100) NOT NULL,
  "description" text,
  "category_code" character varying(20),
  "category_type" character varying(50) NOT NULL,
  "is_labor_category" boolean DEFAULT false,
  "requires_time_tracking" boolean DEFAULT false,
  "default_percentage" numeric(5),
  "is_mandatory" boolean DEFAULT false,
  "display_order" integer DEFAULT 0,
  "icon" character varying(50),
  "color" character varying(20),
  "is_active" boolean DEFAULT true,
  "is_system_category" boolean DEFAULT false,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "archived_at" timestamp without time zone
,
  UNIQUE (category_code),
  UNIQUE (organization_id, name),
  PRIMARY KEY (id)
);
ALTER TABLE public."cost_categories" ENABLE ROW LEVEL SECURITY;

-- Table: cost_estimates
CREATE TABLE IF NOT EXISTS public."cost_estimates" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "item_name" character varying(255) NOT NULL,
  "wbs_code" character varying(50),
  "estimated_cost" numeric,
  "basis_of_estimate" text,
  "contingency_buffer" numeric DEFAULT 0,
  "confidence_level" character varying(50),
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "idempotency_key" character varying(64)
,
  PRIMARY KEY (id)
);
ALTER TABLE public."cost_estimates" ENABLE ROW LEVEL SECURITY;

-- Table: critical_path
CREATE TABLE IF NOT EXISTS public."critical_path" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "path_description" text,
  "activities" text[],
  "total_duration_days" integer,
  "slack_available" integer DEFAULT 0,
  "risks" text,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."critical_path" ENABLE ROW LEVEL SECURITY;

-- Table: critical_path_activities
CREATE TABLE IF NOT EXISTS public."critical_path_activities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "activity_id" text NOT NULL,
  "path_sequence" integer NOT NULL,
  "early_start_date" date,
  "early_finish_date" date,
  "late_start_date" date,
  "late_finish_date" date,
  "float_days" integer DEFAULT 0,
  "is_on_critical_path" boolean DEFAULT true,
  "calculated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "source_document_id" uuid,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, activity_id)
);
ALTER TABLE public."critical_path_activities" ENABLE ROW LEVEL SECURITY;

-- Table: daily_statistics
CREATE TABLE IF NOT EXISTS public."daily_statistics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "date" date NOT NULL,
  "ai_requests_total" integer DEFAULT 0,
  "ai_requests_success" integer DEFAULT 0,
  "ai_tokens_total" bigint DEFAULT 0,
  "ai_cost_total" numeric(10) DEFAULT 0,
  "api_requests_total" integer DEFAULT 0,
  "api_requests_2xx" integer DEFAULT 0,
  "api_requests_4xx" integer DEFAULT 0,
  "api_requests_5xx" integer DEFAULT 0,
  "api_avg_response_time_ms" integer DEFAULT 0,
  "active_users" integer DEFAULT 0,
  "new_users" integer DEFAULT 0,
  "total_sessions" integer DEFAULT 0,
  "documents_created" integer DEFAULT 0,
  "documents_edited" integer DEFAULT 0,
  "documents_viewed" integer DEFAULT 0,
  "jobs_queued" integer DEFAULT 0,
  "jobs_completed" integer DEFAULT 0,
  "jobs_failed" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (date),
  PRIMARY KEY (id)
);
ALTER TABLE public."daily_statistics" ENABLE ROW LEVEL SECURITY;

-- Table: deliverable_acceptance
CREATE TABLE IF NOT EXISTS public."deliverable_acceptance" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "deliverable_id" uuid,
  "deliverable_name" text NOT NULL,
  "reviewer" text,
  "reviewer_role" text,
  "stakeholder_id" uuid,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "review_date" date,
  "acceptance_notes" text,
  "defects_found" integer DEFAULT 0,
  "acceptance_criteria_met" integer DEFAULT 0,
  "acceptance_criteria_total" integer DEFAULT 0,
  "attachments" jsonb DEFAULT '[]'::jsonb,
  "source_document_id" uuid,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, deliverable_name, reviewer)
);
ALTER TABLE public."deliverable_acceptance" ENABLE ROW LEVEL SECURITY;

-- Table: deliverables
CREATE TABLE IF NOT EXISTS public."deliverables" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text,
  "type" character varying(100),
  "due_date" date,
  "status" character varying(50) DEFAULT 'not_started'::character varying,
  "acceptance_criteria" text,
  "owner" character varying(255),
  "dependencies" text[],
  "extracted_from_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "created_by" uuid,
  "source_document_id" uuid,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying,
  "idempotency_key" character varying(64)
,
  UNIQUE (idempotency_key),
  PRIMARY KEY (id),
  UNIQUE (project_id, name)
);
ALTER TABLE public."deliverables" ENABLE ROW LEVEL SECURITY;

-- Table: development_approach
CREATE TABLE IF NOT EXISTS public."development_approach" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "approach" character varying(20) NOT NULL,
  "methodology" character varying(30),
  "justification" text NOT NULL,
  "uncertainty_level" character varying(10),
  "requirements_stability" character varying(20),
  "stakeholder_engagement_model" character varying(20),
  "delivery_cadence" character varying(20),
  "organizational_maturity" character varying(10),
  "team_experience_level" character varying(10),
  "regulatory_constraints" boolean DEFAULT false,
  "tailoring_decisions" jsonb DEFAULT '[]'::jsonb,
  "life_cycle_phases" jsonb DEFAULT '[]'::jsonb,
  "iteration_length" integer,
  "iteration_unit" character varying(10),
  "governance_approach" character varying(20),
  "review_gates" jsonb DEFAULT '[]'::jsonb,
  "source_document_id" uuid,
  "defined_by" uuid,
  "approved_by" uuid,
  "effective_date" timestamp without time zone,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id)
);
ALTER TABLE public."development_approach" ENABLE ROW LEVEL SECURITY;

-- Table: development_approaches
CREATE TABLE IF NOT EXISTS public."development_approaches" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "approach" text NOT NULL,
  "framework" text,
  "lifecycle_model" text,
  "iteration_length_weeks" integer,
  "ceremonies" text[] DEFAULT '{}'::text[] NOT NULL,
  "artifacts" text[] DEFAULT '{}'::text[] NOT NULL,
  "tailoring_decisions" text,
  "governance_notes" text,
  "source_document_id" uuid,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id)
);
ALTER TABLE public."development_approaches" ENABLE ROW LEVEL SECURITY;

-- Table: digital_twin_asset_states
CREATE TABLE IF NOT EXISTS public."digital_twin_asset_states" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "asset_id" uuid NOT NULL,
  "state_snapshot" jsonb NOT NULL,
  "state_version" integer NOT NULL,
  "changed_fields" jsonb DEFAULT '[]'::jsonb,
  "previous_state_id" uuid,
  "source_event_id" uuid,
  "is_current" boolean DEFAULT false,
  "state_hash" character varying(64),
  "change_summary" text,
  "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  UNIQUE (asset_id, state_version),
  PRIMARY KEY (id)
);
ALTER TABLE public."digital_twin_asset_states" ENABLE ROW LEVEL SECURITY;

-- Table: digital_twin_assets
CREATE TABLE IF NOT EXISTS public."digital_twin_assets" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "company_id" uuid,
  "external_id" character varying(255) NOT NULL,
  "platform_type" character varying(20) NOT NULL,
  "platform_instance_url" text,
  "name" character varying(500) NOT NULL,
  "description" text,
  "asset_type" character varying(100),
  "location" jsonb,
  "current_state_id" uuid,
  "current_state_version" integer DEFAULT 0,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "last_synced_at" timestamp with time zone,
  "sync_status" character varying(20) DEFAULT 'active'::character varying,
  "sync_error_message" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "deleted_at" timestamp with time zone,
  "source_document_id" uuid,
  "source_entity_id" uuid
,
  PRIMARY KEY (id)
);
ALTER TABLE public."digital_twin_assets" ENABLE ROW LEVEL SECURITY;

-- Table: digital_twin_document_triggers
CREATE TABLE IF NOT EXISTS public."digital_twin_document_triggers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "asset_id" uuid NOT NULL,
  "event_id" uuid,
  "trigger_rule" jsonb NOT NULL,
  "trigger_type" character varying(50) NOT NULL,
  "template_id" uuid,
  "document_id" uuid,
  "generation_params" jsonb DEFAULT '{}'::jsonb,
  "status" character varying(20) DEFAULT 'pending'::character varying,
  "status_message" text,
  "job_id" uuid,
  "retry_count" integer DEFAULT 0,
  "max_retries" integer DEFAULT 3,
  "triggered_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id)
);
ALTER TABLE public."digital_twin_document_triggers" ENABLE ROW LEVEL SECURITY;

-- Table: digital_twin_events
CREATE TABLE IF NOT EXISTS public."digital_twin_events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "asset_id" uuid NOT NULL,
  "event_type" character varying(50) NOT NULL,
  "event_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "event_summary" text,
  "platform_event_id" character varying(255),
  "platform_type" character varying(20) NOT NULL,
  "processed_at" timestamp with time zone,
  "processing_status" character varying(20) DEFAULT 'pending'::character varying,
  "processing_error" text,
  "retry_count" integer DEFAULT 0,
  "event_timestamp" timestamp with time zone NOT NULL,
  "ingested_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (platform_event_id, platform_type, asset_id)
);
ALTER TABLE public."digital_twin_events" ENABLE ROW LEVEL SECURITY;

-- Table: digital_twin_ingestion_sources
CREATE TABLE IF NOT EXISTS public."digital_twin_ingestion_sources" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" character varying(255) NOT NULL,
  "platform_type" character varying(20) NOT NULL,
  "connection_config" jsonb NOT NULL,
  "sync_mode" character varying(20) DEFAULT 'realtime'::character varying,
  "poll_interval_seconds" integer DEFAULT 60,
  "last_sync_at" timestamp with time zone,
  "next_sync_at" timestamp with time zone,
  "is_active" boolean DEFAULT true,
  "sync_status" character varying(20) DEFAULT 'active'::character varying,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id)
);
ALTER TABLE public."digital_twin_ingestion_sources" ENABLE ROW LEVEL SECURITY;

-- Table: digital_twin_trigger_rules
CREATE TABLE IF NOT EXISTS public."digital_twin_trigger_rules" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text,
  "rule_config" jsonb NOT NULL,
  "trigger_type" character varying(50) NOT NULL,
  "template_id" uuid,
  "generation_params" jsonb DEFAULT '{}'::jsonb,
  "is_active" boolean DEFAULT true,
  "trigger_count" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id)
);
ALTER TABLE public."digital_twin_trigger_rules" ENABLE ROW LEVEL SECURITY;

-- Table: document_analysis
CREATE TABLE IF NOT EXISTS public."document_analysis" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "analysis_type" character varying(50) NOT NULL,
  "patterns_detected" jsonb DEFAULT '[]'::jsonb,
  "best_practices_applied" jsonb DEFAULT '[]'::jsonb,
  "quality_metrics" jsonb DEFAULT '{}'::jsonb,
  "compliance_score" numeric(3) DEFAULT 0.0,
  "improvement_suggestions" jsonb DEFAULT '[]'::jsonb,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "analyzed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."document_analysis" ENABLE ROW LEVEL SECURITY;

-- Table: document_analytics
CREATE TABLE IF NOT EXISTS public."document_analytics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid,
  "project_id" uuid,
  "view_count" integer DEFAULT 0,
  "unique_viewers" integer DEFAULT 0,
  "last_viewed_at" timestamp with time zone,
  "last_viewed_by" uuid,
  "edit_count" integer DEFAULT 0,
  "last_edited_at" timestamp with time zone,
  "last_edited_by" uuid,
  "avg_read_time_seconds" integer DEFAULT 0,
  "total_read_time_seconds" integer DEFAULT 0,
  "pdf_exports" integer DEFAULT 0,
  "docx_exports" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (document_id),
  PRIMARY KEY (id)
);
ALTER TABLE public."document_analytics" ENABLE ROW LEVEL SECURITY;

-- Table: document_audit_trail
CREATE TABLE IF NOT EXISTS public."document_audit_trail" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "version_id" uuid,
  "action_type" character varying(50) NOT NULL,
  "performed_by" uuid,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "event_type" character varying(50) NOT NULL,
  "event_data" jsonb DEFAULT '{}'::jsonb,
  "user_id" uuid
,
  PRIMARY KEY (id)
);
ALTER TABLE public."document_audit_trail" ENABLE ROW LEVEL SECURITY;

-- Table: document_chunks
CREATE TABLE IF NOT EXISTS public."document_chunks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid,
  "content" text,
  "embedding" public."vector",
  "chunk_index" integer,
  "metadata" jsonb,
  "title" character varying(255),
  "project_id" uuid,
  "template_id" uuid
,
  PRIMARY KEY (id)
);
ALTER TABLE public."document_chunks" ENABLE ROW LEVEL SECURITY;

-- Table: document_entities
CREATE TABLE IF NOT EXISTS public."document_entities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "entity" text NOT NULL,
  "type" text,
  "score" numeric,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
,
  PRIMARY KEY (id)
);

-- Table: document_history
CREATE TABLE IF NOT EXISTS public."document_history" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "template_id" uuid,
  "project_id" uuid,
  "created_by" uuid,
  "status" character varying(50),
  "quality_score" numeric,
  "content" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "metadata" jsonb,
  "title" character varying(255)
,
  PRIMARY KEY (id)
);
ALTER TABLE public."document_history" ENABLE ROW LEVEL SECURITY;

-- Table: document_integrations
CREATE TABLE IF NOT EXISTS public."document_integrations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "integration_type" character varying(50) NOT NULL,
  "external_id" character varying(255),
  "external_url" text,
  "synced_at" timestamp with time zone,
  "synced_by" uuid,
  "sync_status" character varying(20) DEFAULT 'synced'::character varying,
  "sync_version" character varying(50),
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "error_message" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (document_id, integration_type)
);
ALTER TABLE public."document_integrations" ENABLE ROW LEVEL SECURITY;

-- Table: document_jira_links
CREATE TABLE IF NOT EXISTS public."document_jira_links" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "jira_issue_key" character varying(255) NOT NULL,
  "jira_issue_url" text NOT NULL,
  "integration_id" uuid NOT NULL,
  "project_id" uuid,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (document_id, integration_id),
  PRIMARY KEY (id)
);
ALTER TABLE public."document_jira_links" ENABLE ROW LEVEL SECURITY;

-- Table: document_pattern_analysis
CREATE TABLE IF NOT EXISTS public."document_pattern_analysis" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "patterns_found" jsonb DEFAULT '[]'::jsonb,
  "pattern_confidence" numeric(3) DEFAULT 0.0,
  "pattern_coverage" numeric(3) DEFAULT 0.0,
  "missing_patterns" text[] DEFAULT '{}'::text[],
  "anomalous_patterns" text[] DEFAULT '{}'::text[],
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "analyzed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."document_pattern_analysis" ENABLE ROW LEVEL SECURITY;

-- Table: document_patterns
CREATE TABLE IF NOT EXISTS public."document_patterns" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "framework" character varying(50) NOT NULL,
  "category" character varying(100),
  "pattern_type" character varying(50) NOT NULL,
  "pattern_data" jsonb NOT NULL,
  "frequency" integer DEFAULT 1,
  "confidence" numeric(3) DEFAULT 0.5,
  "examples" text[] DEFAULT '{}'::text[],
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."document_patterns" ENABLE ROW LEVEL SECURITY;

-- Table: document_pmbok7_principle_refs
CREATE TABLE IF NOT EXISTS public."document_pmbok7_principle_refs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "principle_id" uuid NOT NULL,
  "section_reference" text,
  "reference_type" character varying(30),
  "notes" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."document_pmbok7_principle_refs" ENABLE ROW LEVEL SECURITY;

-- Table: document_processing_history
CREATE TABLE IF NOT EXISTS public."document_processing_history" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "history_id" character varying(255) NOT NULL,
  "request_id" character varying(255) NOT NULL,
  "user_id" uuid NOT NULL,
  "project_id" character varying(255) NOT NULL,
  "template_id" character varying(255) NOT NULL,
  "status" character varying(20) NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "completed_at" timestamp with time zone,
  "processing_time" integer,
  "quality_score" numeric(3),
  "stages_completed" jsonb DEFAULT '[]'::jsonb,
  "error" jsonb,
  "metadata" jsonb DEFAULT '{}'::jsonb
,
  UNIQUE (history_id),
  PRIMARY KEY (id)
);
ALTER TABLE public."document_processing_history" ENABLE ROW LEVEL SECURITY;

-- Table: document_processing_jobs
CREATE TABLE IF NOT EXISTS public."document_processing_jobs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_id" character varying(255) NOT NULL,
  "request_id" character varying(255) NOT NULL,
  "template_id" character varying(255) NOT NULL,
  "project_id" character varying(255) NOT NULL,
  "user_id" uuid NOT NULL,
  "status" character varying(20) NOT NULL,
  "progress" integer DEFAULT 0,
  "current_stage" character varying(50),
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "failed_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "result" jsonb,
  "error" jsonb,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (job_id),
  PRIMARY KEY (id)
);
ALTER TABLE public."document_processing_jobs" ENABLE ROW LEVEL SECURITY;

-- Table: document_quality_metrics
CREATE TABLE IF NOT EXISTS public."document_quality_metrics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "completeness_score" numeric(3),
  "clarity_score" numeric(3),
  "accuracy_score" numeric(3),
  "consistency_score" numeric(3),
  "overall_score" numeric(3),
  "assessment_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "assessor" character varying(255) NOT NULL,
  "feedback" text[] DEFAULT '{}'::text[],
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."document_quality_metrics" ENABLE ROW LEVEL SECURITY;

-- Table: document_signatures
CREATE TABLE IF NOT EXISTS public."document_signatures" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "signature_request_id" uuid DEFAULT gen_random_uuid(),
  "title" character varying(500),
  "status" character varying(50) DEFAULT 'draft'::character varying NOT NULL,
  "require_all_signatures" boolean DEFAULT true,
  "signing_deadline" timestamp without time zone,
  "allow_reassign" boolean DEFAULT false,
  "signed_pdf_path" character varying(500),
  "signed_pdf_hash" character varying(64),
  "signing_certificate_id" character varying(255),
  "signing_transport" character varying(50) DEFAULT 'local'::character varying,
  "approval_request_id" uuid,
  "initiated_by" uuid NOT NULL,
  "initiated_at" timestamp without time zone DEFAULT now(),
  "completed_at" timestamp without time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."document_signatures" ENABLE ROW LEVEL SECURITY;

-- Table: document_summaries
CREATE TABLE IF NOT EXISTS public."document_summaries" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "compression_method" character varying(50) NOT NULL,
  "compression_level" numeric(3) NOT NULL,
  "target_tokens" integer NOT NULL,
  "original_content" text NOT NULL,
  "original_tokens" integer NOT NULL,
  "compressed_content" text NOT NULL,
  "compressed_tokens" integer NOT NULL,
  "compression_ratio" numeric(5) NOT NULL,
  "ai_provider" character varying(100),
  "ai_model" character varying(100),
  "template_context" jsonb,
  "document_version" integer DEFAULT 1 NOT NULL,
  "is_valid" boolean DEFAULT true NOT NULL,
  "times_reused" integer DEFAULT 0 NOT NULL,
  "last_reused_at" timestamp without time zone,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "template_context_hash" character varying(32)
,
  PRIMARY KEY (id)
);
ALTER TABLE public."document_summaries" ENABLE ROW LEVEL SECURITY;

-- Table: document_tags
CREATE TABLE IF NOT EXISTS public."document_tags" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "tag" character varying(100) NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (document_id, tag),
  PRIMARY KEY (id)
);
ALTER TABLE public."document_tags" ENABLE ROW LEVEL SECURITY;

-- Table: document_version_conflicts
CREATE TABLE IF NOT EXISTS public."document_version_conflicts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "template_id" uuid NOT NULL,
  "detected_at" timestamp with time zone DEFAULT now(),
  "conflict_details" jsonb DEFAULT '{}'::jsonb,
  "resolution_strategy" character varying(50) DEFAULT 'prompt_user'::character varying,
  "governance_level" character varying(50) DEFAULT 'standard'::character varying,
  "resolution_method" character varying(50),
  "resolution_details" jsonb,
  "status" character varying(50) DEFAULT 'pending'::character varying,
  "resolved_at" timestamp with time zone,
  "resolved_by" uuid,
  "existing_version_id" uuid
,
  PRIMARY KEY (id)
);
ALTER TABLE public."document_version_conflicts" ENABLE ROW LEVEL SECURITY;

-- Table: document_versions
CREATE TABLE IF NOT EXISTS public."document_versions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "version" character varying(50) NOT NULL,
  "content" text,
  "changes" text,
  "word_count" integer DEFAULT 0,
  "created_at" timestamp without time zone DEFAULT now(),
  "author_id" uuid,
  "metadata" jsonb,
  "semantic_version" character varying(20) DEFAULT '1.0.0'::character varying NOT NULL,
  "change_description" text,
  "change_type" character varying(50),
  "generation_metadata" jsonb,
  "content_hash" character varying(64),
  "parent_version_id" uuid,
  "created_by" uuid
,
  UNIQUE (document_id, version),
  PRIMARY KEY (id)
);
ALTER TABLE public."document_versions" ENABLE ROW LEVEL SECURITY;

-- Table: documents
CREATE TABLE IF NOT EXISTS public."documents" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "project_id" uuid,
  "name" character varying(255) NOT NULL,
  "content" text,
  "template_id" uuid,
  "version" integer DEFAULT 1,
  "status" character varying(20) DEFAULT 'draft'::character varying,
  "file_path" character varying(500),
  "file_size" bigint,
  "mime_type" character varying(100),
  "framework" character varying(50),
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "sharepoint_file_id" character varying(255),
  "sharepoint_drive_id" character varying(255),
  "sharepoint_site_id" character varying(255),
  "web_url" text,
  "word_count" integer DEFAULT 0,
  "character_count" integer DEFAULT 0,
  "compression_ratio" integer DEFAULT 0,
  "original_size" character varying(50),
  "compressed_size" character varying(50),
  "processing_time" character varying(50),
  "ai_model" character varying(100),
  "input_tokens" integer DEFAULT 0,
  "output_tokens" integer DEFAULT 0,
  "tags" jsonb DEFAULT '[]'::jsonb,
  "source_documents" jsonb DEFAULT '[]'::jsonb,
  "comments" jsonb DEFAULT '[]'::jsonb,
  "author" character varying(255),
  "title" character varying(255),
  "template_version" character varying(50),
  "template_author" character varying(255),
  "template_framework" character varying(100),
  "template_category" character varying(100),
  "template_complexity" character varying(50),
  "template_metadata" jsonb,
  "generation_metadata" jsonb,
  "parent_document_id" uuid,
  "compression_stats" jsonb,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "sentence_count" integer DEFAULT 0,
  "paragraph_count" integer DEFAULT 0,
  "is_regeneration" boolean DEFAULT false,
  "semantic_version" character varying(20) DEFAULT '1.0.0'::character varying,
  "quality_audit_id" uuid,
  "quality_status" character varying(20),
  "quality_score" integer,
  "source" character varying(50) DEFAULT 'upload'::character varying,
  "domain_metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "company_id" uuid,
  "inferred_primary_domain" text,
  "inferred_secondary_domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "entity_counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "external_id" character varying(255),
  "external_source" character varying(50),
  "external_url" text,
  "external_last_modified" timestamp with time zone,
  "sync_status" character varying(50) DEFAULT 'local'::character varying,
  "confluence_page_url" text,
  "current_version_id" uuid,
  "embedding" public."vector"
,
  UNIQUE (external_id, external_source),
  PRIMARY KEY (id),
  UNIQUE (sharepoint_file_id)
);
ALTER TABLE public."documents" ENABLE ROW LEVEL SECURITY;

-- Table: documents_raw
CREATE TABLE IF NOT EXISTS public."documents_raw" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" text,
  "content" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
,
  PRIMARY KEY (id)
);
ALTER TABLE public."documents_raw" ENABLE ROW LEVEL SECURITY;

-- Table: documents_vectors
CREATE TABLE IF NOT EXISTS public."documents_vectors" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid,
  "chunk_index" integer NOT NULL,
  "embedding" public."vector",
  "content" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now()
,
  UNIQUE (document_id, chunk_index),
  PRIMARY KEY (id)
);

-- Table: domain_entities
CREATE TABLE IF NOT EXISTS public."domain_entities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "domain" character varying(50) NOT NULL,
  "entity_type" character varying(100) NOT NULL,
  "title" character varying(255) NOT NULL,
  "description" text,
  "details" jsonb DEFAULT '{}'::jsonb,
  "impact_level" character varying(20),
  "compliance_status" character varying(50),
  "carbon_data" jsonb,
  "source_document_id" uuid,
  "source_line_start" integer,
  "source_snippet" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "idempotency_key" character varying(64)
,
  PRIMARY KEY (id)
);
ALTER TABLE public."domain_entities" ENABLE ROW LEVEL SECURITY;

-- Table: domain_extraction_runs
CREATE TABLE IF NOT EXISTS public."domain_extraction_runs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "domain" public."pmbok_domain" NOT NULL,
  "job_id" uuid,
  "user_id" uuid,
  "ai_provider" text,
  "ai_model" text,
  "document_ids" uuid[] DEFAULT '{}'::uuid[],
  "requested_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "total_entities" integer DEFAULT 0,
  "success_rate" numeric(5),
  "cache_hit_rate" numeric(5),
  "extraction_runtime_ms" integer,
  "prompt_tokens" integer,
  "completion_tokens" integer,
  "total_tokens" integer,
  "error_code" text,
  "error_message" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id)
);
ALTER TABLE public."domain_extraction_runs" ENABLE ROW LEVEL SECURITY;

-- Table: domain_kpi_snapshots
CREATE TABLE IF NOT EXISTS public."domain_kpi_snapshots" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "domain" public."pmbok_domain" NOT NULL,
  "extraction_run_id" uuid,
  "metric_name" text NOT NULL,
  "metric_value" numeric(18),
  "target_value" numeric(18),
  "variance" numeric(18),
  "status" text DEFAULT 'unknown'::text NOT NULL,
  "units" text,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "recorded_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, domain, metric_name, recorded_at)
);
ALTER TABLE public."domain_kpi_snapshots" ENABLE ROW LEVEL SECURITY;

-- Table: drift_detection_rules
CREATE TABLE IF NOT EXISTS public."drift_detection_rules" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid,
  "organization_id" uuid,
  "rule_name" character varying(200) NOT NULL,
  "rule_type" character varying(50) NOT NULL,
  "rule_config" jsonb NOT NULL,
  "threshold_config" jsonb,
  "severity_mapping" jsonb,
  "is_active" boolean DEFAULT true,
  "is_global" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_by" uuid,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."drift_detection_rules" ENABLE ROW LEVEL SECURITY;

-- Table: drift_detections
CREATE TABLE IF NOT EXISTS public."drift_detections" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "baseline_id" uuid,
  "comparison_id" uuid,
  "drift_type" character varying(50) NOT NULL,
  "drift_category" character varying(100),
  "severity" character varying(20) NOT NULL,
  "title" character varying(500) NOT NULL,
  "description" text,
  "drift_data" jsonb,
  "affected_entity_ids" uuid[],
  "affected_entity_types" varchar[],
  "detection_method" character varying(50) DEFAULT 'automated'::character varying,
  "detection_confidence" numeric(5),
  "status" character varying(20) DEFAULT 'open'::character varying,
  "resolution_action" character varying(50),
  "resolution_notes" text,
  "resolved_at" timestamp with time zone,
  "resolved_by" uuid,
  "jira_issue_key" character varying(50),
  "jira_issue_url" text,
  "confluence_page_id" character varying(100),
  "detected_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "detected_by" uuid,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."drift_detections" ENABLE ROW LEVEL SECURITY;

-- Table: drift_root_causes
CREATE TABLE IF NOT EXISTS public."drift_root_causes" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "project_id" uuid,
  "cause_category" character varying(100),
  "cause_detail" text,
  "recurring" boolean,
  "proposed_actions" text,
  "owner" character varying(100),
  "last_updated" timestamp with time zone
,
  PRIMARY KEY (id)
);
ALTER TABLE public."drift_root_causes" ENABLE ROW LEVEL SECURITY;

-- Table: earned_value_metrics
CREATE TABLE IF NOT EXISTS public."earned_value_metrics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "measurement_date" date NOT NULL,
  "planned_value" numeric(18),
  "earned_value" numeric(18),
  "actual_cost" numeric(18),
  "schedule_variance" numeric(18),
  "cost_variance" numeric(18),
  "schedule_performance_index" numeric(10),
  "cost_performance_index" numeric(10),
  "estimate_at_completion" numeric(18),
  "estimate_to_complete" numeric(18),
  "notes" text,
  "source_document_id" uuid,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, measurement_date)
);
ALTER TABLE public."earned_value_metrics" ENABLE ROW LEVEL SECURITY;

-- Table: embedding_cache
CREATE TABLE IF NOT EXISTS public."embedding_cache" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "content_hash" character varying(64) NOT NULL,
  "content" text NOT NULL,
  "embeddings" jsonb NOT NULL,
  "model" character varying(100) NOT NULL,
  "access_count" integer DEFAULT 0,
  "last_accessed" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "expires_at" timestamp with time zone NOT NULL
,
  UNIQUE (content_hash),
  PRIMARY KEY (id)
);
ALTER TABLE public."embedding_cache" ENABLE ROW LEVEL SECURITY;

-- Table: emergency_meetings
CREATE TABLE IF NOT EXISTS public."emergency_meetings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "meeting_id" character varying(100) NOT NULL,
  "title" character varying(255) NOT NULL,
  "project_id" uuid NOT NULL,
  "drift_record_id" uuid,
  "change_request_id" uuid,
  "severity" character varying(20) NOT NULL,
  "meeting_type" character varying(50) DEFAULT 'budget_overrun'::character varying NOT NULL,
  "trigger_reason" text NOT NULL,
  "overrun_amount" numeric(15),
  "overrun_percentage" numeric(5),
  "agenda" jsonb NOT NULL,
  "required_attendees" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "optional_attendees" jsonb DEFAULT '[]'::jsonb,
  "scheduled_date" timestamp without time zone NOT NULL,
  "scheduled_duration_minutes" integer DEFAULT 60,
  "meeting_url" text,
  "location" text,
  "status" character varying(20) DEFAULT 'scheduled'::character varying NOT NULL,
  "notifications_sent" jsonb DEFAULT '[]'::jsonb,
  "email_sent" boolean DEFAULT false,
  "slack_sent" boolean DEFAULT false,
  "sms_sent" boolean DEFAULT false,
  "dashboard_alert_sent" boolean DEFAULT false,
  "meeting_notes" text,
  "decisions_made" jsonb,
  "action_items" jsonb,
  "resolution" text,
  "escalation_level" integer DEFAULT 1,
  "escalated_to" jsonb,
  "escalated_at" timestamp without time zone,
  "auto_scheduled" boolean DEFAULT true,
  "auto_scheduled_by" character varying(50) DEFAULT 'drift_detection_system'::character varying,
  "scheduling_algorithm" character varying(100),
  "ai_processing_metadata" jsonb,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "completed_at" timestamp without time zone,
  "cancelled_at" timestamp without time zone,
  "cancellation_reason" text
,
  UNIQUE (meeting_id),
  PRIMARY KEY (id)
);
ALTER TABLE public."emergency_meetings" ENABLE ROW LEVEL SECURITY;

-- Table: engagement_actions
CREATE TABLE IF NOT EXISTS public."engagement_actions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "action_id" text,
  "stakeholder_id" uuid,
  "stakeholder_name" text,
  "action_type" text NOT NULL,
  "description" text NOT NULL,
  "planned_date" date,
  "actual_date" date,
  "outcome" text,
  "follow_up_required" boolean DEFAULT false,
  "follow_up_date" date,
  "status" text,
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, action_id)
);
ALTER TABLE public."engagement_actions" ENABLE ROW LEVEL SECURITY;

-- Table: entity_extractions
CREATE TABLE IF NOT EXISTS public."entity_extractions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "document_id" uuid,
  "extraction_job_id" uuid,
  "entity_type" character varying(50) NOT NULL,
  "entity_data" jsonb NOT NULL,
  "entity_name" character varying(500),
  "extraction_confidence" numeric(5),
  "extraction_method" character varying(50) DEFAULT 'ai'::character varying,
  "ai_provider" character varying(50),
  "ai_model" character varying(100),
  "related_entity_ids" uuid[],
  "status" character varying(20) DEFAULT 'active'::character varying,
  "is_verified" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "verified_at" timestamp with time zone,
  "verified_by" uuid
,
  PRIMARY KEY (id)
);
ALTER TABLE public."entity_extractions" ENABLE ROW LEVEL SECURITY;

-- Table: entity_relationships
CREATE TABLE IF NOT EXISTS public."entity_relationships" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "source_entity_id" uuid NOT NULL,
  "target_entity_id" uuid NOT NULL,
  "relationship_type" character varying(50) NOT NULL,
  "relationship_strength" character varying(20) DEFAULT 'medium'::character varying,
  "description" text,
  "discovered_by" character varying(50) DEFAULT 'ai'::character varying,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (source_entity_id, target_entity_id, relationship_type)
);
ALTER TABLE public."entity_relationships" ENABLE ROW LEVEL SECURITY;

-- Table: escalation_alert_history
CREATE TABLE IF NOT EXISTS public."escalation_alert_history" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "alert_id" uuid NOT NULL,
  "action_type" character varying(50) NOT NULL,
  "action_description" text NOT NULL,
  "performed_by" uuid,
  "performed_at" timestamp without time zone DEFAULT now(),
  "metadata" jsonb DEFAULT '{}'::jsonb
,
  PRIMARY KEY (id)
);
ALTER TABLE public."escalation_alert_history" ENABLE ROW LEVEL SECURITY;

-- Table: escalation_alerts
CREATE TABLE IF NOT EXISTS public."escalation_alerts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "drift_detection_id" uuid NOT NULL,
  "escalation_rule_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "alert_type" character varying(50) NOT NULL,
  "severity_level" character varying(20) NOT NULL,
  "variance_percentage" numeric(10),
  "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
  "escalated_to" jsonb NOT NULL,
  "notification_channels" jsonb NOT NULL,
  "email_sent" boolean DEFAULT false,
  "email_sent_at" timestamp without time zone,
  "slack_sent" boolean DEFAULT false,
  "slack_sent_at" timestamp without time zone,
  "sms_sent" boolean DEFAULT false,
  "sms_sent_at" timestamp without time zone,
  "dashboard_alert" boolean DEFAULT true,
  "meeting_scheduled" boolean DEFAULT false,
  "meeting_scheduled_at" timestamp without time zone,
  "acknowledged_by" uuid,
  "acknowledged_at" timestamp without time zone,
  "deadline" timestamp without time zone NOT NULL,
  "response_notes" text,
  "change_request_id" uuid,
  "change_request_created" boolean DEFAULT false,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "resolved_at" timestamp without time zone,
  "alert_summary" text NOT NULL,
  "alert_details" jsonb DEFAULT '{}'::jsonb
,
  PRIMARY KEY (id)
);
ALTER TABLE public."escalation_alerts" ENABLE ROW LEVEL SECURITY;

-- Table: escalation_matrix
CREATE TABLE IF NOT EXISTS public."escalation_matrix" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "rule_name" character varying(255) NOT NULL,
  "drift_type" character varying(50) NOT NULL,
  "threshold_min" numeric(10) DEFAULT 0.0 NOT NULL,
  "threshold_max" numeric(10) DEFAULT NULL::numeric,
  "severity_level" character varying(20) NOT NULL,
  "escalate_to" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "deadline_hours" integer DEFAULT 72 NOT NULL,
  "channels" jsonb DEFAULT '["email", "dashboard"]'::jsonb NOT NULL,
  "auto_create_cr" boolean DEFAULT false,
  "require_meeting" boolean DEFAULT false,
  "is_active" boolean DEFAULT true,
  "priority" integer DEFAULT 0,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "created_by" uuid,
  "description" text
,
  PRIMARY KEY (id),
  UNIQUE (rule_name)
);
ALTER TABLE public."escalation_matrix" ENABLE ROW LEVEL SECURITY;

-- Table: extracted_dt_assets
CREATE TABLE IF NOT EXISTS public."extracted_dt_assets" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "source_document_id" uuid,
  "external_id" character varying(255) NOT NULL,
  "platform_type" character varying(20) DEFAULT 'Generic'::character varying NOT NULL,
  "name" character varying(500) NOT NULL,
  "description" text,
  "asset_type" character varying(100),
  "location" jsonb,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, external_id, platform_type)
);
ALTER TABLE public."extracted_dt_assets" ENABLE ROW LEVEL SECURITY;

-- Table: extraction_failures
CREATE TABLE IF NOT EXISTS public."extraction_failures" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "entity_type" character varying(100) NOT NULL,
  "error_message" text NOT NULL,
  "stack_trace" jsonb,
  "ai_provider" character varying(50),
  "ai_model" character varying(100),
  "ai_response_raw" text,
  "correlation_id" character varying(100),
  "retry_count" integer DEFAULT 0,
  "status" character varying(50) DEFAULT 'pending'::character varying,
  "retry_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "resolution_notes" text,
  "attempted_at" timestamp with time zone DEFAULT now(),
  "created_at" timestamp with time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."extraction_failures" ENABLE ROW LEVEL SECURITY;

-- Table: fallback_strategies
CREATE TABLE IF NOT EXISTS public."fallback_strategies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "strategy_id" character varying(100) NOT NULL,
  "strategy_name" character varying(200) NOT NULL,
  "strategy_type" character varying(50) NOT NULL,
  "fallback_order" integer NOT NULL,
  "enabled" boolean DEFAULT true,
  "config" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (strategy_id)
);
ALTER TABLE public."fallback_strategies" ENABLE ROW LEVEL SECURITY;

-- Table: file_assets
CREATE TABLE IF NOT EXISTS public."file_assets" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "filename" character varying(255) NOT NULL,
  "mime_type" character varying(100) NOT NULL,
  "size_bytes" bigint NOT NULL,
  "data" bytea NOT NULL,
  "uploaded_by" uuid,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."file_assets" ENABLE ROW LEVEL SECURITY;

-- Table: financial_variances
CREATE TABLE IF NOT EXISTS public."financial_variances" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "report_date" timestamp with time zone,
  "cv_value" numeric,
  "cpi_value" numeric,
  "eac_value" numeric,
  "etc_value" numeric,
  "variance_explanation" text,
  "corrective_actions" text,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."financial_variances" ENABLE ROW LEVEL SECURITY;

-- Table: framework_analysis
CREATE TABLE IF NOT EXISTS public."framework_analysis" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "framework" character varying(50) NOT NULL,
  "total_documents" integer DEFAULT 0,
  "average_quality_score" numeric(3) DEFAULT 0.0,
  "common_patterns" jsonb DEFAULT '[]'::jsonb,
  "best_practices" jsonb DEFAULT '[]'::jsonb,
  "quality_trends" jsonb DEFAULT '[]'::jsonb,
  "improvement_areas" text[] DEFAULT '{}'::text[],
  "strengths" text[] DEFAULT '{}'::text[],
  "recommendations" text[] DEFAULT '{}'::text[],
  "analyzed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."framework_analysis" ENABLE ROW LEVEL SECURITY;

-- Table: funding_tranches
CREATE TABLE IF NOT EXISTS public."funding_tranches" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "tranche_name" character varying(100),
  "amount" numeric,
  "required_date" timestamp with time zone,
  "received_date" timestamp with time zone,
  "status" character varying(50),
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."funding_tranches" ENABLE ROW LEVEL SECURITY;

-- Table: general_change_requests
CREATE TABLE IF NOT EXISTS public."general_change_requests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "request_id" character varying(50),
  "title" character varying(255) NOT NULL,
  "change_type" character varying(100),
  "impact_summary" text,
  "justification" text,
  "status" character varying(50),
  "decision_date" timestamp with time zone,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."general_change_requests" ENABLE ROW LEVEL SECURITY;

-- Table: goal_milestones
CREATE TABLE IF NOT EXISTS public."goal_milestones" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "goal_id" uuid NOT NULL,
  "title" character varying(255) NOT NULL,
  "description" text,
  "target_date" date,
  "status" character varying(20) DEFAULT 'pending'::character varying,
  "linked_task_ids" uuid[],
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "completed_at" timestamp without time zone
,
  PRIMARY KEY (id)
);
ALTER TABLE public."goal_milestones" ENABLE ROW LEVEL SECURITY;

-- Table: governance_decisions
CREATE TABLE IF NOT EXISTS public."governance_decisions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "decision_id" character varying(100),
  "decision_type" character varying(100),
  "description" text,
  "outcome" character varying(50),
  "rationale" text,
  "decision_makers" text[],
  "decision_date" timestamp with time zone,
  "implementation_status" character varying(50),
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."governance_decisions" ENABLE ROW LEVEL SECURITY;

-- Table: health_checks
CREATE TABLE IF NOT EXISTS public."health_checks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "status" character varying(20) NOT NULL,
  "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."health_checks" ENABLE ROW LEVEL SECURITY;

-- Table: historical_trends
CREATE TABLE IF NOT EXISTS public."historical_trends" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "timeframe" character varying(20) NOT NULL,
  "metric_name" character varying(100) NOT NULL,
  "metric_value" numeric(5) NOT NULL,
  "trend_direction" character varying(20) DEFAULT 'stable'::character varying,
  "change_percentage" numeric(5) DEFAULT 0.0,
  "data_points" integer DEFAULT 0,
  "confidence" numeric(3) DEFAULT 0.0,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."historical_trends" ENABLE ROW LEVEL SECURITY;

-- Table: improvement_suggestions
CREATE TABLE IF NOT EXISTS public."improvement_suggestions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid,
  "user_id" uuid,
  "project_id" uuid,
  "suggestion_type" character varying(50) NOT NULL,
  "priority" character varying(20) DEFAULT 'medium'::character varying,
  "title" character varying(255) NOT NULL,
  "description" text NOT NULL,
  "current_state" text,
  "suggested_improvement" text NOT NULL,
  "expected_benefit" text,
  "implementation_effort" character varying(20) DEFAULT 'medium'::character varying,
  "related_patterns" text[] DEFAULT '{}'::text[],
  "related_practices" text[] DEFAULT '{}'::text[],
  "examples" text[] DEFAULT '{}'::text[],
  "status" character varying(20) DEFAULT 'pending'::character varying,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "source_lesson_id" uuid,
  "rationale" text,
  "expected_impact" character varying(20),
  "is_ai_generated" boolean DEFAULT false,
  "ai_confidence" numeric(5),
  "ai_provider" character varying(50),
  "suggested_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "suggested_by" uuid,
  "implemented_at" timestamp with time zone,
  "implemented_by" uuid
,
  PRIMARY KEY (id)
);
ALTER TABLE public."improvement_suggestions" ENABLE ROW LEVEL SECURITY;

-- Table: infrared_thermal_conductance_log
CREATE TABLE IF NOT EXISTS public."infrared_thermal_conductance_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "qubit_id" character varying(100) NOT NULL,
  "infrared_wavelength" numeric(6) NOT NULL,
  "thermal_conductance" numeric(10) NOT NULL,
  "cooling_rate" numeric(10) NOT NULL,
  "noise_reduction" numeric(5) NOT NULL,
  "coherence_improvement" numeric(5) NOT NULL,
  "temperature_change" numeric(10) NOT NULL,
  "processing_speed" numeric(15) DEFAULT 299792458,
  "success" boolean DEFAULT true,
  "error_message" text,
  "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."infrared_thermal_conductance_log" ENABLE ROW LEVEL SECURITY;

-- Table: innovation_opportunities
CREATE TABLE IF NOT EXISTS public."innovation_opportunities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "baseline_id" uuid,
  "opportunity_type" character varying(50) NOT NULL,
  "title" character varying(255) NOT NULL,
  "description" text NOT NULL,
  "potential_value" text,
  "source_document_id" uuid,
  "detected_by" character varying(50) DEFAULT 'ai'::character varying,
  "ai_confidence" numeric(3) DEFAULT 0.0,
  "novelty_score" numeric(3) DEFAULT 0.0,
  "ai_processing_metadata" jsonb,
  "prior_art_research" jsonb,
  "patentability_score" numeric(3) DEFAULT 0.0,
  "status" character varying(20) DEFAULT 'identified'::character varying,
  "assigned_to" uuid,
  "evaluation_notes" text,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."innovation_opportunities" ENABLE ROW LEVEL SECURITY;

-- Table: integration_sync_metadata
CREATE TABLE IF NOT EXISTS public."integration_sync_metadata" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "integration_id" uuid NOT NULL,
  "adpa_document_id" uuid NOT NULL,
  "external_id" character varying(255) NOT NULL,
  "external_type" character varying(50) NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (integration_id, adpa_document_id),
  PRIMARY KEY (id)
);
ALTER TABLE public."integration_sync_metadata" ENABLE ROW LEVEL SECURITY;

-- Table: integration_usage_metrics
CREATE TABLE IF NOT EXISTS public."integration_usage_metrics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "integration_id" uuid,
  "integration_type" character varying(50) NOT NULL,
  "api_calls_count" integer DEFAULT 0,
  "success_count" integer DEFAULT 0,
  "failure_count" integer DEFAULT 0,
  "avg_response_time_ms" numeric(10),
  "min_response_time_ms" integer,
  "max_response_time_ms" integer,
  "period_start" timestamp with time zone NOT NULL,
  "period_end" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."integration_usage_metrics" ENABLE ROW LEVEL SECURITY;

-- Table: integrations
CREATE TABLE IF NOT EXISTS public."integrations" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "name" character varying(100) NOT NULL,
  "type" character varying(50) NOT NULL,
  "configuration" jsonb NOT NULL,
  "credentials_encrypted" text,
  "is_active" boolean DEFAULT true,
  "last_sync" timestamp without time zone,
  "sync_status" character varying(20),
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."integrations" ENABLE ROW LEVEL SECURITY;

-- Table: issue_log
CREATE TABLE IF NOT EXISTS public."issue_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "issue_id" character varying(50),
  "title" character varying(255) NOT NULL,
  "description" text,
  "priority" character varying(20),
  "status" character varying(20),
  "owner" character varying(255),
  "opened_date" timestamp with time zone,
  "target_resolution_date" timestamp with time zone,
  "actual_resolution_date" timestamp with time zone,
  "resolution_description" text,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "category" character varying(50),
  "impact" text,
  "affected_areas" jsonb DEFAULT '[]'::jsonb,
  "assigned_to" uuid,
  "raised_by" uuid,
  "escalated_to" uuid,
  "workaround" text,
  "root_cause" text,
  "related_risk_id" uuid,
  "related_milestone_id" uuid,
  "related_deliverable_id" uuid,
  "tags" text[] DEFAULT '{}'::text[],
  "playbook_execution_id" uuid,
  "resolution_workflow" jsonb DEFAULT '{}'::jsonb,
  "notes" text
,
  PRIMARY KEY (id)
);
ALTER TABLE public."issue_log" ENABLE ROW LEVEL SECURITY;

-- Table: issue_status_history
CREATE TABLE IF NOT EXISTS public."issue_status_history" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "issue_id" uuid NOT NULL,
  "old_status" character varying(20),
  "new_status" character varying(20),
  "changed_by" uuid,
  "changed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "comment" text
,
  PRIMARY KEY (id)
);
ALTER TABLE public."issue_status_history" ENABLE ROW LEVEL SECURITY;

-- Table: issues
CREATE TABLE IF NOT EXISTS public."issues" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "title" character varying(200) NOT NULL,
  "description" text NOT NULL,
  "category" character varying(30) NOT NULL,
  "priority" character varying(10) NOT NULL,
  "impact" text,
  "affected_areas" jsonb DEFAULT '[]'::jsonb,
  "raised_by" uuid,
  "assigned_to" uuid,
  "escalated_to" uuid,
  "status" character varying(20) DEFAULT 'open'::character varying NOT NULL,
  "resolution" text,
  "workaround" text,
  "root_cause" text,
  "ai_suggested_resolution" text,
  "ai_confidence" numeric(3),
  "date_raised" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "target_resolution_date" timestamp with time zone,
  "date_resolved" timestamp with time zone,
  "date_closed" timestamp with time zone,
  "related_risk_id" uuid,
  "related_milestone_id" uuid,
  "related_deliverable_id" uuid,
  "source_document_id" uuid,
  "notes" text,
  "tags" text[] DEFAULT ARRAY[]::text[],
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_by" uuid,
  "playbook_execution_id" uuid,
  "resolution_workflow" jsonb DEFAULT '{}'::jsonb,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying
,
  PRIMARY KEY (id)
);
ALTER TABLE public."issues" ENABLE ROW LEVEL SECURITY;

-- Table: job_execution_logs
CREATE TABLE IF NOT EXISTS public."job_execution_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_id" character varying(255) NOT NULL,
  "job_type" character varying(100) NOT NULL,
  "queue_name" character varying(100) NOT NULL,
  "status" character varying(50) NOT NULL,
  "priority" integer DEFAULT 0,
  "queued_at" timestamp with time zone,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "duration_ms" integer,
  "success" boolean,
  "error_message" text,
  "retry_count" integer DEFAULT 0,
  "user_id" uuid,
  "project_id" uuid,
  "job_data" jsonb,
  "result_data" jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."job_execution_logs" ENABLE ROW LEVEL SECURITY;

-- Table: jobs
CREATE TABLE IF NOT EXISTS public."jobs" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "type" character varying(100) NOT NULL,
  "status" character varying(20) DEFAULT 'pending'::character varying,
  "priority" integer DEFAULT 0,
  "data" jsonb,
  "result" jsonb,
  "error_message" text,
  "progress" integer DEFAULT 0,
  "started_at" timestamp without time zone,
  "completed_at" timestamp without time zone,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "project_id" uuid,
  "project_name" character varying(255),
  "template_name" character varying(255),
  "document_name" character varying(255),
  "worker_id" character varying(255),
  "worker_process_id" integer,
  "queue_name" character varying(100),
  "queue_position" integer,
  "queued_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "processing_started_at" timestamp without time zone,
  "failed_at" timestamp without time zone
,
  PRIMARY KEY (id)
);
ALTER TABLE public."jobs" ENABLE ROW LEVEL SECURITY;

-- Table: knowledge_base_applications
CREATE TABLE IF NOT EXISTS public."knowledge_base_applications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "knowledge_base_entry_id" uuid NOT NULL,
  "target_project_id" uuid NOT NULL,
  "applied_by" uuid NOT NULL,
  "applied_at" timestamp without time zone DEFAULT now(),
  "implementation_notes" text,
  "adaptation_required" boolean DEFAULT false,
  "adaptations" jsonb,
  "status" character varying(20) DEFAULT 'planned'::character varying,
  "outcome" character varying(20) DEFAULT NULL::character varying,
  "expected_value" jsonb,
  "actual_value" jsonb,
  "variance_analysis" jsonb,
  "feedback" text,
  "lessons_learned" text,
  "completed_at" timestamp without time zone,
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."knowledge_base_applications" ENABLE ROW LEVEL SECURITY;

-- Table: knowledge_base_entries
CREATE TABLE IF NOT EXISTS public."knowledge_base_entries" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "baseline_id" uuid,
  "drift_detection_id" uuid,
  "innovation_opportunity_id" uuid,
  "entry_type" character varying(50) NOT NULL,
  "category" character varying(50) NOT NULL,
  "title" character varying(255) NOT NULL,
  "description" text NOT NULL,
  "baseline_approach" jsonb,
  "improved_approach" jsonb NOT NULL,
  "value_metrics" jsonb,
  "replication_guide" jsonb NOT NULL,
  "applicable_contexts" jsonb,
  "similar_project_ids" jsonb DEFAULT '[]'::jsonb,
  "ai_confidence" numeric(3) DEFAULT 0.0,
  "novelty_score" numeric(3) DEFAULT 0.0,
  "replication_potential" numeric(3) DEFAULT 0.0,
  "ai_processing_metadata" jsonb,
  "tags" text[] DEFAULT '{}'::text[],
  "keywords" text[] DEFAULT '{}'::text[],
  "status" character varying(20) DEFAULT 'draft'::character varying,
  "created_by" uuid NOT NULL,
  "created_at" timestamp without time zone DEFAULT now(),
  "reviewed_by" uuid,
  "reviewed_at" timestamp without time zone,
  "approved_by" uuid,
  "approved_at" timestamp without time zone,
  "published_at" timestamp without time zone,
  "superseded_by" uuid,
  "superseded_at" timestamp without time zone,
  "view_count" integer DEFAULT 0,
  "application_count" integer DEFAULT 0,
  "success_rate" numeric(3) DEFAULT 0.0,
  "updated_at" timestamp without time zone DEFAULT now(),
  "notes" text,
  "embedding" public."vector",
  "embedding_model" character varying(50) DEFAULT 'voyage-4'::character varying,
  "embedding_generated_at" timestamp without time zone,
  "semantic_keywords" text[] DEFAULT '{}'::text[],
  "applies_to_ai_initiatives" boolean DEFAULT false,
  "applies_to_efficiency" boolean DEFAULT false,
  "applies_to_cost_reduction" boolean DEFAULT false,
  "applies_to_risk_mitigation" boolean DEFAULT false,
  "business_value_score" numeric(3)
,
  PRIMARY KEY (id)
);
ALTER TABLE public."knowledge_base_entries" ENABLE ROW LEVEL SECURITY;

-- Table: knowledge_base_entry_relationships
CREATE TABLE IF NOT EXISTS public."knowledge_base_entry_relationships" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "source_entry_id" uuid NOT NULL,
  "target_entry_id" uuid NOT NULL,
  "relationship_type" character varying(50) NOT NULL,
  "strength" numeric(3),
  "created_at" timestamp without time zone DEFAULT now()
,
  UNIQUE (source_entry_id, target_entry_id, relationship_type),
  PRIMARY KEY (id)
);
ALTER TABLE public."knowledge_base_entry_relationships" ENABLE ROW LEVEL SECURITY;

-- Table: knowledge_base_reviews
CREATE TABLE IF NOT EXISTS public."knowledge_base_reviews" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "knowledge_base_entry_id" uuid NOT NULL,
  "reviewer_id" uuid NOT NULL,
  "reviewed_at" timestamp without time zone DEFAULT now(),
  "rating" integer,
  "review_text" text,
  "review_type" character varying(20) NOT NULL,
  "recommendation" character varying(20),
  "suggested_changes" jsonb,
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."knowledge_base_reviews" ENABLE ROW LEVEL SECURITY;

-- Table: labor_rates
CREATE TABLE IF NOT EXISTS public."labor_rates" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "resource_category" character varying(255),
  "hourly_rate" numeric,
  "currency" character varying(10) DEFAULT 'USD'::character varying,
  "effective_date" timestamp with time zone,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."labor_rates" ENABLE ROW LEVEL SECURITY;

-- Table: lessons_learned
CREATE TABLE IF NOT EXISTS public."lessons_learned" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "category" character varying(100),
  "impact" character varying(50),
  "positive_or_negative" boolean,
  "source_document_id" uuid,
  "source_document" character varying(255),
  "source_section" character varying(255),
  "tags" text[],
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "status" character varying(50) DEFAULT 'identified'::character varying,
  "phase" character varying(100),
  "date_identified" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "severity" character varying(50) DEFAULT 'medium'::character varying,
  "ai_analysis" jsonb,
  "ai_confidence" double precision,
  "applicable_to" jsonb DEFAULT '[]'::jsonb,
  "shared_with_org" boolean DEFAULT false,
  "template_id" uuid,
  "date_learned" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "recommendations" jsonb DEFAULT '[]'::jsonb,
  "applicability" text[] DEFAULT '{}'::text[]
,
  PRIMARY KEY (id)
);
ALTER TABLE public."lessons_learned" ENABLE ROW LEVEL SECURITY;

-- Table: maturity_assessments
CREATE TABLE IF NOT EXISTS public."maturity_assessments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "assessment_type" character varying(50) DEFAULT 'entity_management'::character varying,
  "maturity_level" integer,
  "maturity_level_name" character varying(50),
  "scores" jsonb,
  "overall_score" numeric(5),
  "recommendations" jsonb,
  "next_level_requirements" text,
  "assessed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "assessed_by" uuid,
  "next_assessment_due" timestamp with time zone
,
  PRIMARY KEY (id)
);
ALTER TABLE public."maturity_assessments" ENABLE ROW LEVEL SECURITY;

-- Table: meeting_attendees
CREATE TABLE IF NOT EXISTS public."meeting_attendees" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "meeting_id" uuid NOT NULL,
  "user_id" uuid,
  "email" character varying(255) NOT NULL,
  "name" character varying(255) NOT NULL,
  "role" character varying(100),
  "required" boolean DEFAULT true,
  "confirmed" boolean DEFAULT false,
  "confirmed_at" timestamp without time zone,
  "attended" boolean DEFAULT false,
  "invitation_sent" boolean DEFAULT false,
  "invitation_sent_at" timestamp without time zone,
  "reminder_sent_count" integer DEFAULT 0,
  "last_reminder_at" timestamp without time zone,
  "response" character varying(20),
  "response_received_at" timestamp without time zone,
  "response_notes" text,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (meeting_id, user_id)
);
ALTER TABLE public."meeting_attendees" ENABLE ROW LEVEL SECURITY;

-- Table: meeting_escalation_history
CREATE TABLE IF NOT EXISTS public."meeting_escalation_history" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "meeting_id" uuid NOT NULL,
  "from_level" integer NOT NULL,
  "to_level" integer NOT NULL,
  "escalated_by" uuid,
  "escalated_to" jsonb NOT NULL,
  "escalation_reason" text NOT NULL,
  "urgency" character varying(20) NOT NULL,
  "notification_sent" boolean DEFAULT false,
  "notification_channels" jsonb,
  "created_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."meeting_escalation_history" ENABLE ROW LEVEL SECURITY;

-- Table: meeting_minutes
CREATE TABLE IF NOT EXISTS public."meeting_minutes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "meeting_title" character varying(255) NOT NULL,
  "meeting_date" timestamp with time zone,
  "attendees" text[],
  "agenda" text,
  "key_points" text,
  "decisions_made" text,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."meeting_minutes" ENABLE ROW LEVEL SECURITY;

-- Table: migrations
CREATE TABLE IF NOT EXISTS public."migrations" (
  "id" integer DEFAULT nextval('migrations_id_seq'::regclass) NOT NULL,
  "name" character varying(255) NOT NULL,
  "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."migrations" ENABLE ROW LEVEL SECURITY;

-- Table: milestones
CREATE TABLE IF NOT EXISTS public."milestones" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text,
  "due_date" date NOT NULL,
  "status" character varying(20) DEFAULT 'planned'::character varying,
  "dependencies" text[] DEFAULT '{}'::text[],
  "deliverables" text[] DEFAULT '{}'::text[],
  "success_criteria" text[] DEFAULT '{}'::text[],
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamp with time zone,
  "created_by" uuid,
  "source_document_id" uuid,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying,
  "idempotency_key" character varying(64)
,
  PRIMARY KEY (id),
  UNIQUE (project_id, name)
);
ALTER TABLE public."milestones" ENABLE ROW LEVEL SECURITY;

-- Table: mitigation_plans
CREATE TABLE IF NOT EXISTS public."mitigation_plans" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "risk_id" uuid NOT NULL,
  "title" character varying(500) NOT NULL,
  "description" text,
  "action_type" character varying(50) DEFAULT 'mitigation'::character varying,
  "owner_id" uuid,
  "assigned_to" uuid,
  "status" character varying(50) DEFAULT 'planned'::character varying,
  "completion_percentage" integer DEFAULT 0,
  "planned_start_date" date,
  "planned_completion_date" date,
  "actual_start_date" date,
  "actual_completion_date" date,
  "due_date" date,
  "progress_notes" text[] DEFAULT '{}'::text[],
  "completion_notes" text,
  "completion_evidence" jsonb DEFAULT '{}'::jsonb,
  "priority" character varying(20) DEFAULT 'medium'::character varying,
  "expected_effectiveness" integer,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_by" uuid,
  "completed_by" uuid,
  "completed_at" timestamp with time zone,
  "cost_estimate" character varying(20),
  "owner_name" character varying(255),
  "assigned_to_name" character varying(255),
  "source_document_id" uuid,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying,
  "issue_id" uuid
,
  PRIMARY KEY (id)
);
ALTER TABLE public."mitigation_plans" ENABLE ROW LEVEL SECURITY;

-- Table: morphic_ai_model_config
CREATE TABLE IF NOT EXISTS public."morphic_ai_model_config" (
  "id" character varying(191) NOT NULL,
  "search_mode" character varying(256) NOT NULL,
  "model_type" character varying(256) NOT NULL,
  "model_id" character varying(191) NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp without time zone DEFAULT now() NOT NULL
,
  PRIMARY KEY (id)
);
ALTER TABLE public."morphic_ai_model_config" ENABLE ROW LEVEL SECURITY;

-- Table: morphic_ai_models
CREATE TABLE IF NOT EXISTS public."morphic_ai_models" (
  "id" character varying(191) NOT NULL,
  "provider_id" character varying(191) NOT NULL,
  "name" character varying(256) NOT NULL,
  "model_id" character varying(256) NOT NULL,
  "is_enabled" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp without time zone DEFAULT now() NOT NULL
,
  PRIMARY KEY (id)
);
ALTER TABLE public."morphic_ai_models" ENABLE ROW LEVEL SECURITY;

-- Table: morphic_ai_providers
CREATE TABLE IF NOT EXISTS public."morphic_ai_providers" (
  "id" character varying(191) NOT NULL,
  "name" character varying(256) NOT NULL,
  "type" character varying(256) DEFAULT 'openai'::character varying NOT NULL,
  "base_url" text,
  "api_key" text,
  "is_enabled" integer DEFAULT 1 NOT NULL,
  "status" character varying(256) DEFAULT 'disabled'::character varying,
  "last_error" text,
  "last_checked_at" timestamp without time zone,
  "created_at" timestamp without time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp without time zone
,
  PRIMARY KEY (id)
);
ALTER TABLE public."morphic_ai_providers" ENABLE ROW LEVEL SECURITY;

-- Table: morphic_chats
CREATE TABLE IF NOT EXISTS public."morphic_chats" (
  "id" character varying(191) NOT NULL,
  "created_at" timestamp without time zone DEFAULT now() NOT NULL,
  "title" text NOT NULL,
  "user_id" character varying(255) NOT NULL,
  "visibility" character varying(256) DEFAULT 'private'::character varying NOT NULL
,
  PRIMARY KEY (id)
);
ALTER TABLE public."morphic_chats" ENABLE ROW LEVEL SECURITY;

-- Table: morphic_feedback
CREATE TABLE IF NOT EXISTS public."morphic_feedback" (
  "id" character varying(191) NOT NULL,
  "user_id" character varying(255),
  "sentiment" character varying(256) NOT NULL,
  "message" text NOT NULL,
  "page_url" text NOT NULL,
  "user_agent" text,
  "created_at" timestamp without time zone DEFAULT now() NOT NULL
,
  PRIMARY KEY (id)
);
ALTER TABLE public."morphic_feedback" ENABLE ROW LEVEL SECURITY;

-- Table: morphic_messages
CREATE TABLE IF NOT EXISTS public."morphic_messages" (
  "id" character varying(191) NOT NULL,
  "chat_id" character varying(191) NOT NULL,
  "role" character varying(256) NOT NULL,
  "created_at" timestamp without time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp without time zone,
  "metadata" jsonb
,
  PRIMARY KEY (id)
);
ALTER TABLE public."morphic_messages" ENABLE ROW LEVEL SECURITY;

-- Table: morphic_parts
CREATE TABLE IF NOT EXISTS public."morphic_parts" (
  "id" character varying(191) NOT NULL,
  "message_id" character varying(191) NOT NULL,
  "order" integer NOT NULL,
  "type" character varying(256) NOT NULL,
  "text_text" text,
  "reasoning_text" text,
  "file_media_type" character varying(256),
  "file_filename" character varying(1024),
  "file_url" text,
  "source_url_source_id" character varying(256),
  "source_url_url" text,
  "source_url_title" text,
  "source_document_source_id" character varying(256),
  "source_document_media_type" character varying(256),
  "source_document_title" text,
  "source_document_filename" character varying(1024),
  "source_document_url" text,
  "source_document_snippet" text,
  "tool_tool_call_id" character varying(256),
  "tool_state" character varying(256),
  "tool_error_text" text,
  "tool_search_input" json,
  "tool_search_output" json,
  "tool_fetch_input" json,
  "tool_fetch_output" json,
  "tool_question_input" json,
  "tool_question_output" json,
  "tool_todoWrite_input" json,
  "tool_todoWrite_output" json,
  "tool_todoRead_input" json,
  "tool_todoRead_output" json,
  "tool_dynamic_input" json,
  "tool_dynamic_output" json,
  "tool_dynamic_name" character varying(256),
  "tool_dynamic_type" character varying(256),
  "data_prefix" character varying(256),
  "data_content" json,
  "data_id" character varying(256),
  "provider_metadata" json,
  "created_at" timestamp without time zone DEFAULT now() NOT NULL
,
  PRIMARY KEY (id)
);
ALTER TABLE public."morphic_parts" ENABLE ROW LEVEL SECURITY;

-- Table: notification_logs
CREATE TABLE IF NOT EXISTS public."notification_logs" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "type" character varying(50) NOT NULL,
  "recipient_emails" text[] NOT NULL,
  "metadata" jsonb,
  "sent_at" timestamp with time zone DEFAULT now(),
  "created_at" timestamp with time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."notification_logs" ENABLE ROW LEVEL SECURITY;

-- Table: notion_databases
CREATE TABLE IF NOT EXISTS public."notion_databases" (
  "id" character varying(255) NOT NULL,
  "title" character varying(500) NOT NULL,
  "description" text,
  "properties" jsonb,
  "last_synced" timestamp with time zone DEFAULT now(),
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."notion_databases" ENABLE ROW LEVEL SECURITY;

-- Table: onboarding_offboarding
CREATE TABLE IF NOT EXISTS public."onboarding_offboarding" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "resource_id" uuid,
  "resource_name" text NOT NULL,
  "process_type" text NOT NULL,
  "planned_start_date" date,
  "actual_start_date" date,
  "planned_completion_date" date,
  "actual_completion_date" date,
  "status" text,
  "tasks" jsonb DEFAULT '[]'::jsonb,
  "required_training" text[],
  "required_access" text[],
  "handover_notes" text,
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "action_type" character varying(50),
  "start_date" date,
  "end_date" date,
  "checklist_status" text
,
  PRIMARY KEY (id),
  UNIQUE (project_id, resource_id, process_type)
);
ALTER TABLE public."onboarding_offboarding" ENABLE ROW LEVEL SECURITY;

-- Table: operational_playbooks
CREATE TABLE IF NOT EXISTS public."operational_playbooks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "title" character varying(255) NOT NULL,
  "description" text,
  "category" character varying(50) NOT NULL,
  "trigger_type" character varying(50) NOT NULL,
  "applicable_risk_categories" text[],
  "applicable_severity_levels" text[],
  "applicable_priority_levels" text[],
  "is_active" boolean DEFAULT true,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "version" integer DEFAULT 1,
  "previous_version_id" uuid,
  "source_document_id" uuid,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying
,
  PRIMARY KEY (id)
);
ALTER TABLE public."operational_playbooks" ENABLE ROW LEVEL SECURITY;

-- Table: opportunities
CREATE TABLE IF NOT EXISTS public."opportunities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "category" text,
  "probability" text,
  "benefit_level" text,
  "exploitation_strategy" text,
  "owner" text,
  "status" text DEFAULT 'identified'::text NOT NULL,
  "expected_benefit" numeric(18),
  "trigger_conditions" text,
  "source_document_id" uuid,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying
,
  PRIMARY KEY (id),
  UNIQUE (project_id, title)
);
ALTER TABLE public."opportunities" ENABLE ROW LEVEL SECURITY;

-- Table: output_templates
CREATE TABLE IF NOT EXISTS public."output_templates" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text,
  "schema" jsonb NOT NULL,
  "examples" jsonb DEFAULT '[]'::jsonb,
  "validation_rules" jsonb DEFAULT '{}'::jsonb,
  "post_processing" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."output_templates" ENABLE ROW LEVEL SECURITY;

-- Table: performance_actuals
CREATE TABLE IF NOT EXISTS public."performance_actuals" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "entity_type" character varying(20) NOT NULL,
  "entity_id" uuid,
  "entity_name" character varying(500) NOT NULL,
  "planned_start_date" timestamp with time zone,
  "actual_start_date" timestamp with time zone,
  "planned_end_date" timestamp with time zone,
  "actual_end_date" timestamp with time zone,
  "schedule_variance_days" integer,
  "schedule_variance_percent" numeric(5),
  "planned_cost" numeric(15),
  "actual_cost" numeric(15),
  "cost_variance" numeric(15),
  "cost_variance_percent" numeric(5),
  "planned_progress_percent" numeric(5),
  "actual_progress_percent" numeric(5),
  "progress_variance" numeric(5),
  "quality_score" numeric(3),
  "defects_found" integer DEFAULT 0,
  "rework_hours" numeric(8),
  "measurement_date" timestamp with time zone NOT NULL,
  "measurement_method" character varying(20) NOT NULL,
  "measured_by" uuid,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "baseline_id" uuid,
  "earned_value" numeric(15),
  "actual_cost_evm" numeric(15),
  "planned_value" numeric(15),
  "schedule_performance_index" numeric(5),
  "cost_performance_index" numeric(5),
  "source_document_id" uuid,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text
,
  PRIMARY KEY (id),
  UNIQUE (project_id, measurement_date),
  UNIQUE (project_id, entity_type, entity_name, measurement_date)
);
ALTER TABLE public."performance_actuals" ENABLE ROW LEVEL SECURITY;

-- Table: performance_measurements
CREATE TABLE IF NOT EXISTS public."performance_measurements" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "success_criterion_id" uuid,
  "success_criterion_name" text NOT NULL,
  "measurement_date" date NOT NULL,
  "actual_value" numeric(18),
  "target_value" numeric(18),
  "units" text,
  "variance" numeric(18),
  "variance_percentage" numeric(8),
  "trend" text,
  "status" text DEFAULT 'on_track'::text NOT NULL,
  "notes" text,
  "source_document_id" uuid,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, success_criterion_name, measurement_date)
);
ALTER TABLE public."performance_measurements" ENABLE ROW LEVEL SECURITY;

-- Table: phases
CREATE TABLE IF NOT EXISTS public."phases" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "status" character varying(20) DEFAULT 'planned'::character varying,
  "deliverables" text[] DEFAULT '{}'::text[],
  "team_members" text[] DEFAULT '{}'::text[],
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamp with time zone,
  "created_by" uuid,
  "source_document_id" uuid,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying
,
  PRIMARY KEY (id),
  UNIQUE (project_id, name)
);
ALTER TABLE public."phases" ENABLE ROW LEVEL SECURITY;

-- Table: pipeline_configurations
CREATE TABLE IF NOT EXISTS public."pipeline_configurations" (
  "pipeline_id" character varying(100) NOT NULL,
  "pipeline_name" character varying(255) NOT NULL,
  "description" text,
  "stages" jsonb NOT NULL,
  "global_config" jsonb DEFAULT '{}'::jsonb,
  "quality_gates" jsonb DEFAULT '[]'::jsonb,
  "monitoring_config" jsonb DEFAULT '{}'::jsonb,
  "is_active" boolean DEFAULT true,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
,
  PRIMARY KEY (pipeline_id)
);
ALTER TABLE public."pipeline_configurations" ENABLE ROW LEVEL SECURITY;

-- Table: pipeline_executions
CREATE TABLE IF NOT EXISTS public."pipeline_executions" (
  "job_id" uuid NOT NULL,
  "request_id" uuid NOT NULL,
  "template_id" uuid,
  "project_id" uuid,
  "user_id" uuid,
  "status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
  "progress" numeric(5) DEFAULT 0,
  "current_stage" character varying(100),
  "stages_completed" text[] DEFAULT '{}'::text[],
  "stages_remaining" text[] DEFAULT '{}'::text[],
  "created_at" timestamp with time zone DEFAULT now(),
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "estimated_completion" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now(),
  "overall_quality_score" numeric(3),
  "final_document_id" uuid,
  "processing_config" jsonb DEFAULT '{}'::jsonb,
  "enhancement_config" jsonb DEFAULT '{}'::jsonb,
  "quality_config" jsonb DEFAULT '{}'::jsonb,
  "output_config" jsonb DEFAULT '{}'::jsonb,
  "error" text,
  "error_details" jsonb,
  "retry_count" integer DEFAULT 0
,
  PRIMARY KEY (job_id)
);
ALTER TABLE public."pipeline_executions" ENABLE ROW LEVEL SECURITY;

-- Table: playbook_executions
CREATE TABLE IF NOT EXISTS public."playbook_executions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "playbook_id" uuid NOT NULL,
  "triggered_by_type" character varying(50) NOT NULL,
  "triggered_by_id" uuid NOT NULL,
  "trigger_type" character varying(50) NOT NULL,
  "triggered_by_user_id" uuid,
  "trigger_reason" text,
  "status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
  "current_step_id" uuid,
  "completed_steps" integer DEFAULT 0,
  "total_steps" integer NOT NULL,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "cancelled_by" uuid,
  "cancellation_reason" text,
  "execution_context" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "source_document_id" uuid,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying
,
  PRIMARY KEY (id)
);
ALTER TABLE public."playbook_executions" ENABLE ROW LEVEL SECURITY;

-- Table: playbook_response_steps
CREATE TABLE IF NOT EXISTS public."playbook_response_steps" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "playbook_id" uuid NOT NULL,
  "step_order" integer NOT NULL,
  "step_title" character varying(255) NOT NULL,
  "step_description" text,
  "step_type" character varying(50) NOT NULL,
  "assigned_role" character varying(100),
  "sla_hours" integer,
  "step_config" jsonb DEFAULT '{}'::jsonb,
  "step_condition" jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (playbook_id, step_order)
);
ALTER TABLE public."playbook_response_steps" ENABLE ROW LEVEL SECURITY;

-- Table: playbook_scenarios
CREATE TABLE IF NOT EXISTS public."playbook_scenarios" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "playbook_id" uuid NOT NULL,
  "scenario_condition" jsonb NOT NULL,
  "trigger_type" character varying(50) NOT NULL,
  "priority" integer DEFAULT 0,
  "description" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (playbook_id, scenario_condition)
);
ALTER TABLE public."playbook_scenarios" ENABLE ROW LEVEL SECURITY;

-- Table: playbook_step_executions
CREATE TABLE IF NOT EXISTS public."playbook_step_executions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "execution_id" uuid NOT NULL,
  "step_id" uuid NOT NULL,
  "status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
  "assigned_to" uuid,
  "completed_by" uuid,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "sla_deadline" timestamp with time zone,
  "sla_breached" boolean DEFAULT false,
  "completion_notes" text,
  "completion_evidence" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  UNIQUE (execution_id, step_id),
  PRIMARY KEY (id)
);
ALTER TABLE public."playbook_step_executions" ENABLE ROW LEVEL SECURITY;

-- Table: pmbok6_knowledge_areas
CREATE TABLE IF NOT EXISTS public."pmbok6_knowledge_areas" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "code" character varying(20) NOT NULL,
  "name" character varying(100) NOT NULL,
  "description" text,
  "display_order" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (code),
  PRIMARY KEY (id)
);
ALTER TABLE public."pmbok6_knowledge_areas" ENABLE ROW LEVEL SECURITY;

-- Table: pmbok6_process_groups
CREATE TABLE IF NOT EXISTS public."pmbok6_process_groups" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "code" character varying(10) NOT NULL,
  "name" character varying(100) NOT NULL,
  "description" text,
  "display_order" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (code),
  PRIMARY KEY (id)
);
ALTER TABLE public."pmbok6_process_groups" ENABLE ROW LEVEL SECURITY;

-- Table: pmbok6_processes
CREATE TABLE IF NOT EXISTS public."pmbok6_processes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "code" character varying(50) NOT NULL,
  "name" character varying(200) NOT NULL,
  "description" text NOT NULL,
  "process_group_id" uuid NOT NULL,
  "knowledge_area_id" uuid NOT NULL,
  "inputs" jsonb,
  "tools_and_techniques" jsonb,
  "outputs" jsonb,
  "pmbok_section" character varying(50),
  "display_order" integer NOT NULL,
  "is_core_process" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (code),
  PRIMARY KEY (id)
);
ALTER TABLE public."pmbok6_processes" ENABLE ROW LEVEL SECURITY;

-- Table: pmbok6_to_pmbok7_principle_mapping
CREATE TABLE IF NOT EXISTS public."pmbok6_to_pmbok7_principle_mapping" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "process_id" uuid NOT NULL,
  "principle_id" uuid NOT NULL,
  "relevance_level" character varying(20) NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (process_id, principle_id)
);
ALTER TABLE public."pmbok6_to_pmbok7_principle_mapping" ENABLE ROW LEVEL SECURITY;

-- Table: pmbok7_performance_domains
CREATE TABLE IF NOT EXISTS public."pmbok7_performance_domains" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "code" character varying(50) NOT NULL,
  "name" character varying(100) NOT NULL,
  "description" text NOT NULL,
  "purpose" text,
  "key_outcomes" jsonb,
  "related_principles" jsonb,
  "display_order" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (code),
  PRIMARY KEY (id)
);
ALTER TABLE public."pmbok7_performance_domains" ENABLE ROW LEVEL SECURITY;

-- Table: pmbok7_principles
CREATE TABLE IF NOT EXISTS public."pmbok7_principles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "code" character varying(30) NOT NULL,
  "name" character varying(100) NOT NULL,
  "description" text NOT NULL,
  "key_aspects" jsonb,
  "related_domains" jsonb,
  "display_order" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (code),
  PRIMARY KEY (id)
);
ALTER TABLE public."pmbok7_principles" ENABLE ROW LEVEL SECURITY;

-- Table: policy_compliance
CREATE TABLE IF NOT EXISTS public."policy_compliance" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "policy_name" character varying(255) NOT NULL,
  "category" character varying(100),
  "compliance_status" character varying(50),
  "findings" text,
  "last_audit_date" timestamp with time zone,
  "next_audit_date" timestamp with time zone,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."policy_compliance" ENABLE ROW LEVEL SECURITY;

-- Table: portfolio_domains
CREATE TABLE IF NOT EXISTS public."portfolio_domains" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
,
  PRIMARY KEY (id)
);
ALTER TABLE public."portfolio_domains" ENABLE ROW LEVEL SECURITY;

-- Table: portfolio_governance
CREATE TABLE IF NOT EXISTS public."portfolio_governance" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "portfolio_name" character varying(255) NOT NULL,
  "description" text,
  "owner_id" uuid,
  "portfolio_lead" uuid,
  "status" character varying(50) DEFAULT 'active'::character varying,
  "budget" numeric(15),
  "budget_currency" character varying(3),
  "start_date" date,
  "end_date" date,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "last_risk_review_at" date,
  "next_risk_review_due" date,
  "risk_review_notes" text,
  "company_id" uuid,
  "core_values" jsonb,
  "strategic_objectives" jsonb,
  "strategy_document_id" uuid,
  "pmo_type_blend" jsonb,
  "approval_authority_matrix" jsonb,
  "escalation_triggers" jsonb,
  "compliance_requirements" jsonb,
  "portfolio_health_status" character varying(20),
  "risk_escalation_threshold" character varying(20),
  "portfolio_risk_summary" jsonb,
  "resource_allocation_strategy" jsonb,
  "capacity_constraints" jsonb,
  "kpi_targets" jsonb,
  "measurement_cadence" character varying(50),
  "dashboard_config" jsonb,
  "methodology_standard" character varying(100),
  "template_governance" jsonb,
  "training_requirements" jsonb
,
  PRIMARY KEY (id)
);
ALTER TABLE public."portfolio_governance" ENABLE ROW LEVEL SECURITY;

-- Table: portfolio_key_results
CREATE TABLE IF NOT EXISTS public."portfolio_key_results" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "okr_id" uuid NOT NULL,
  "key_result_title" character varying(255) NOT NULL,
  "key_result_description" text,
  "metric_name" character varying(255),
  "metric_unit" character varying(50),
  "baseline_value" numeric(15),
  "target_value" numeric(15) NOT NULL,
  "current_value" numeric(15) DEFAULT 0,
  "stretch_target" numeric(15),
  "progress_percentage" numeric(5),
  "progress_status" character varying(50),
  "measurement_frequency" character varying(50),
  "last_measured_at" timestamp without time zone,
  "next_measurement_date" date,
  "owner_id" uuid,
  "contributing_projects" uuid[],
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."portfolio_key_results" ENABLE ROW LEVEL SECURITY;

-- Table: portfolio_key_success_factors
CREATE TABLE IF NOT EXISTS public."portfolio_key_success_factors" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "ksf_name" character varying(255) NOT NULL,
  "ksf_description" text,
  "ksf_category" character varying(100),
  "criticality" character varying(50),
  "priority_rank" integer,
  "time_sensitive" boolean DEFAULT false,
  "deadline" date,
  "success_criteria" text,
  "measurement_method" character varying(255),
  "achievement_status" character varying(50) DEFAULT 'not-started'::character varying,
  "progress_percentage" numeric(5) DEFAULT 0.00,
  "impact_if_not_achieved" text,
  "risk_level" character varying(50),
  "dependent_ksf_ids" uuid[],
  "enables_ksf_ids" uuid[],
  "linked_programs" uuid[],
  "linked_okr_ids" uuid[],
  "owner_id" uuid,
  "sponsor_id" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "owner_role" character varying(100)
,
  PRIMARY KEY (id)
);
ALTER TABLE public."portfolio_key_success_factors" ENABLE ROW LEVEL SECURITY;

-- Table: portfolio_kpi_history
CREATE TABLE IF NOT EXISTS public."portfolio_kpi_history" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "kpi_id" uuid NOT NULL,
  "measurement_date" date NOT NULL,
  "measured_value" numeric(15) NOT NULL,
  "rag_status" character varying(10),
  "notes" text,
  "measured_by" uuid,
  "created_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."portfolio_kpi_history" ENABLE ROW LEVEL SECURITY;

-- Table: portfolio_kpis
CREATE TABLE IF NOT EXISTS public."portfolio_kpis" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "kpi_name" character varying(255) NOT NULL,
  "kpi_description" text,
  "kpi_category" character varying(100),
  "kpi_type" character varying(50),
  "bsc_perspective" character varying(100),
  "metric_formula" text,
  "metric_unit" character varying(50),
  "measurement_frequency" character varying(50) DEFAULT 'monthly'::character varying,
  "data_source" character varying(255),
  "target_value" numeric(15),
  "threshold_green" numeric(15),
  "threshold_yellow" numeric(15),
  "threshold_red" numeric(15),
  "current_value" numeric(15),
  "previous_value" numeric(15),
  "trend" character varying(50),
  "rag_status" character varying(10),
  "owner_id" uuid,
  "owner_role" character varying(100),
  "linked_okr_ids" uuid[],
  "linked_program_ids" uuid[],
  "is_active" boolean DEFAULT true,
  "last_measured_at" timestamp without time zone,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."portfolio_kpis" ENABLE ROW LEVEL SECURITY;

-- Table: portfolio_okrs
CREATE TABLE IF NOT EXISTS public."portfolio_okrs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "strategic_goal_id" uuid,
  "parent_okr_id" uuid,
  "level" character varying(50) NOT NULL,
  "entity_id" uuid,
  "entity_type" character varying(50),
  "objective_title" character varying(255) NOT NULL,
  "objective_description" text,
  "objective_category" character varying(100),
  "okr_period" character varying(50),
  "period_start" date,
  "period_end" date,
  "owner_id" uuid,
  "owner_name" character varying(255),
  "owner_role" character varying(100),
  "confidence_level" integer,
  "progress_percentage" numeric(5),
  "status" character varying(50),
  "is_stretch_goal" boolean DEFAULT false,
  "priority" character varying(50),
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."portfolio_okrs" ENABLE ROW LEVEL SECURITY;

-- Table: portfolio_risks
CREATE TABLE IF NOT EXISTS public."portfolio_risks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "portfolio_id" uuid NOT NULL,
  "risk_title" character varying(255) NOT NULL,
  "risk_description" text,
  "risk_category" character varying(100),
  "risk_owner" uuid,
  "risk_status" character varying(50) DEFAULT 'open'::character varying,
  "impact_level" character varying(20),
  "likelihood_level" character varying(20),
  "mitigation_plan" text,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "last_reviewed_at" date,
  "next_review_due" date,
  "review_notes" text,
  "severity" character varying(20),
  "probability_level" character varying(20),
  "financial_exposure" numeric(15) DEFAULT 0,
  "schedule_impact_days" integer,
  "systemic" boolean DEFAULT false,
  "escalation_status" character varying(30) DEFAULT 'not_triggered'::character varying,
  "escalation_policy_id" uuid,
  "threshold_breach_reason" text,
  "source_risk_ids" uuid[],
  "mitigation_completion" numeric(5) DEFAULT 0,
  "aggregated_metrics" jsonb DEFAULT '{}'::jsonb
,
  PRIMARY KEY (id),
  UNIQUE (portfolio_id, risk_title)
);
ALTER TABLE public."portfolio_risks" ENABLE ROW LEVEL SECURITY;

-- Table: portfolio_strategic_goals
CREATE TABLE IF NOT EXISTS public."portfolio_strategic_goals" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "vision_id" uuid,
  "goal_title" character varying(255) NOT NULL,
  "goal_description" text,
  "goal_category" character varying(100),
  "time_horizon" character varying(50),
  "target_year" integer,
  "priority_rank" integer,
  "status" character varying(50) DEFAULT 'active'::character varying,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."portfolio_strategic_goals" ENABLE ROW LEVEL SECURITY;

-- Table: portfolio_vision
CREATE TABLE IF NOT EXISTS public."portfolio_vision" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "vision_statement" text NOT NULL,
  "mission_statement" text NOT NULL,
  "core_values" text[],
  "effective_from" date DEFAULT CURRENT_DATE,
  "reviewed_date" date,
  "approved_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."portfolio_vision" ENABLE ROW LEVEL SECURITY;

-- Table: prioritization_criteria
CREATE TABLE IF NOT EXISTS public."prioritization_criteria" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "name" character varying(255) NOT NULL,
  "weight" numeric(5) NOT NULL,
  "scale_min" integer DEFAULT 1,
  "scale_max" integer DEFAULT 5,
  "is_inverted" boolean DEFAULT false,
  "description" text,
  "sort_order" integer,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "created_by" uuid
,
  PRIMARY KEY (id)
);
ALTER TABLE public."prioritization_criteria" ENABLE ROW LEVEL SECURITY;

-- Table: probability_impact_matrix
CREATE TABLE IF NOT EXISTS public."probability_impact_matrix" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "probability_level" character varying(50),
  "impact_level" character varying(50),
  "risk_score" numeric,
  "action_level" character varying(50),
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."probability_impact_matrix" ENABLE ROW LEVEL SECURITY;

-- Table: processing_metrics
CREATE TABLE IF NOT EXISTS public."processing_metrics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "request_id" character varying(255) NOT NULL,
  "template_id" character varying(255) NOT NULL,
  "project_id" character varying(255) NOT NULL,
  "user_id" uuid NOT NULL,
  "processing_time" integer DEFAULT 0,
  "quality_score" numeric(3) DEFAULT 0.0,
  "stages_count" integer DEFAULT 0,
  "successful_stages" integer DEFAULT 0,
  "failed_stages" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."processing_metrics" ENABLE ROW LEVEL SECURITY;

-- Table: procurement_costs
CREATE TABLE IF NOT EXISTS public."procurement_costs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "vendor_name" character varying(255),
  "contract_value" numeric,
  "invoiced_amount" numeric,
  "paid_amount" numeric,
  "remaining_value" numeric,
  "currency" character varying(10) DEFAULT 'USD'::character varying,
  "status" character varying(50),
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."procurement_costs" ENABLE ROW LEVEL SECURITY;

-- Table: program_benefits
CREATE TABLE IF NOT EXISTS public."program_benefits" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL,
  "project_id" uuid,
  "benefit_type" character varying(100) NOT NULL,
  "benefit_category" character varying(100),
  "description" text NOT NULL,
  "expected_value" numeric(15) DEFAULT 0 NOT NULL,
  "realized_value" numeric(15) DEFAULT 0,
  "realization_date" date,
  "target_date" date,
  "measurement_method" text,
  "measurement_frequency" character varying(50),
  "baseline_value" numeric(15),
  "target_value" numeric(15),
  "current_value" numeric(15),
  "status" character varying(50) DEFAULT 'planned'::character varying,
  "realization_percentage" numeric(5) DEFAULT 0,
  "owner_id" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."program_benefits" ENABLE ROW LEVEL SECURITY;

-- Table: program_budgets
CREATE TABLE IF NOT EXISTS public."program_budgets" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL,
  "fiscal_year" integer NOT NULL,
  "fiscal_quarter" integer,
  "budget_period_start" date NOT NULL,
  "budget_period_end" date NOT NULL,
  "total_approved_budget" numeric(15) DEFAULT 0 NOT NULL,
  "labor_budget" numeric(15) DEFAULT 0,
  "materials_budget" numeric(15) DEFAULT 0,
  "equipment_budget" numeric(15) DEFAULT 0,
  "overhead_budget" numeric(15) DEFAULT 0,
  "contingency_budget" numeric(15) DEFAULT 0,
  "management_reserve" numeric(15) DEFAULT 0,
  "budget_status" character varying(50) DEFAULT 'draft'::character varying,
  "approved_by" uuid,
  "approved_at" timestamp without time zone,
  "baseline_date" date,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (program_id, fiscal_year, fiscal_quarter)
);
ALTER TABLE public."program_budgets" ENABLE ROW LEVEL SECURITY;

-- Table: program_capacity_forecast
CREATE TABLE IF NOT EXISTS public."program_capacity_forecast" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL,
  "forecast_period" date NOT NULL,
  "human_capacity_fte" numeric(10) DEFAULT 0,
  "human_demand_fte" numeric(10) DEFAULT 0,
  "human_utilization" numeric(5),
  "financial_capacity" numeric(15) DEFAULT 0,
  "financial_demand" numeric(15) DEFAULT 0,
  "financial_utilization" numeric(5),
  "is_bottleneck_period" boolean DEFAULT false,
  "bottleneck_resources" text[],
  "bottleneck_severity" character varying(50),
  "capacity_recommendations" jsonb,
  "forecast_method" character varying(100),
  "confidence_level" character varying(50),
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (program_id, forecast_period)
);
ALTER TABLE public."program_capacity_forecast" ENABLE ROW LEVEL SECURITY;

-- Table: program_cash_flow
CREATE TABLE IF NOT EXISTS public."program_cash_flow" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL,
  "period_month" date NOT NULL,
  "funding_received" numeric(15) DEFAULT 0,
  "benefits_realized" numeric(15) DEFAULT 0,
  "labor_costs" numeric(15) DEFAULT 0,
  "materials_costs" numeric(15) DEFAULT 0,
  "equipment_costs" numeric(15) DEFAULT 0,
  "overhead_costs" numeric(15) DEFAULT 0,
  "other_costs" numeric(15) DEFAULT 0,
  "net_cash_flow" numeric(15) DEFAULT 0,
  "cumulative_cash_flow" numeric(15) DEFAULT 0,
  "is_forecast" boolean DEFAULT true,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (program_id, period_month, is_forecast)
);
ALTER TABLE public."program_cash_flow" ENABLE ROW LEVEL SECURITY;

-- Table: program_cost_performance
CREATE TABLE IF NOT EXISTS public."program_cost_performance" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL,
  "reporting_date" date NOT NULL,
  "planned_value" numeric(15) DEFAULT 0 NOT NULL,
  "earned_value" numeric(15) DEFAULT 0 NOT NULL,
  "actual_cost" numeric(15) DEFAULT 0 NOT NULL,
  "schedule_variance" numeric(15) DEFAULT 0,
  "cost_variance" numeric(15) DEFAULT 0,
  "schedule_performance_index" numeric(10) DEFAULT 0,
  "cost_performance_index" numeric(10) DEFAULT 0,
  "budget_at_completion" numeric(15) DEFAULT 0 NOT NULL,
  "estimate_at_completion" numeric(15) DEFAULT 0,
  "estimate_to_complete" numeric(15) DEFAULT 0,
  "variance_at_completion" numeric(15) DEFAULT 0,
  "tcpi_bac" numeric(10) DEFAULT 0,
  "tcpi_eac" numeric(10) DEFAULT 0,
  "performance_status" character varying(50) DEFAULT 'unknown'::character varying,
  "notes" text,
  "calculated_at" timestamp without time zone DEFAULT now(),
  "calculated_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (program_id, reporting_date)
);
ALTER TABLE public."program_cost_performance" ENABLE ROW LEVEL SECURITY;

-- Table: program_financial_analysis
CREATE TABLE IF NOT EXISTS public."program_financial_analysis" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL,
  "analysis_date" date NOT NULL,
  "analysis_type" character varying(100) DEFAULT 'periodic'::character varying,
  "total_investment" numeric(15) DEFAULT 0 NOT NULL,
  "sunk_costs" numeric(15) DEFAULT 0,
  "remaining_costs" numeric(15) DEFAULT 0,
  "total_expected_benefits" numeric(15) DEFAULT 0,
  "realized_benefits" numeric(15) DEFAULT 0,
  "projected_benefits" numeric(15) DEFAULT 0,
  "roi_percent" numeric(10) DEFAULT 0,
  "npv" numeric(15) DEFAULT 0,
  "irr_percent" numeric(10) DEFAULT 0,
  "payback_period_months" integer DEFAULT 0,
  "benefit_cost_ratio" numeric(10) DEFAULT 0,
  "discount_rate" numeric(5) DEFAULT 8.0,
  "time_horizon_years" integer DEFAULT 5,
  "continue_recommendation" boolean DEFAULT true,
  "recommendation_rationale" text,
  "risk_adjusted_roi" numeric(10),
  "analyzed_by" uuid,
  "confidence_level" integer,
  "assumptions" text,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."program_financial_analysis" ENABLE ROW LEVEL SECURITY;

-- Table: program_financial_transactions
CREATE TABLE IF NOT EXISTS public."program_financial_transactions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL,
  "project_id" uuid,
  "transaction_date" date NOT NULL,
  "transaction_type" character varying(100) NOT NULL,
  "amount" numeric(15) NOT NULL,
  "cost_category" character varying(100),
  "account_code" character varying(50),
  "approved_by" uuid,
  "approval_date" date,
  "supporting_documents" jsonb,
  "transaction_reference" character varying(100),
  "notes" text,
  "created_at" timestamp without time zone DEFAULT now(),
  "created_by" uuid
,
  PRIMARY KEY (id)
);
ALTER TABLE public."program_financial_transactions" ENABLE ROW LEVEL SECURITY;

-- Table: program_forecasts
CREATE TABLE IF NOT EXISTS public."program_forecasts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL,
  "forecast_date" date NOT NULL,
  "forecast_type" character varying(50) NOT NULL,
  "forecasted_by" uuid,
  "forecast_total_cost" numeric(15) NOT NULL,
  "forecast_completion_date" date,
  "forecast_benefit_realization" numeric(15) DEFAULT 0,
  "assumptions" text,
  "changes_from_last_forecast" text,
  "confidence_level" integer,
  "best_case_cost" numeric(15),
  "most_likely_cost" numeric(15),
  "worst_case_cost" numeric(15),
  "variance_from_baseline" numeric(15),
  "variance_percentage" numeric(5),
  "status" character varying(50) DEFAULT 'draft'::character varying,
  "approved_by" uuid,
  "approved_at" timestamp without time zone,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."program_forecasts" ENABLE ROW LEVEL SECURITY;

-- Table: program_funding
CREATE TABLE IF NOT EXISTS public."program_funding" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL,
  "source_name" character varying(255) NOT NULL,
  "source_type" character varying(100),
  "committed_amount" numeric(15) NOT NULL,
  "available_amount" numeric(15) NOT NULL,
  "spent_amount" numeric(15) DEFAULT 0,
  "availability_date" date,
  "expiration_date" date,
  "conditions" text,
  "restrictions" text,
  "approval_status" character varying(50) DEFAULT 'pending'::character varying,
  "approved_by" character varying(255),
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."program_funding" ENABLE ROW LEVEL SECURITY;

-- Table: program_resource_allocations
CREATE TABLE IF NOT EXISTS public."program_resource_allocations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL,
  "project_id" uuid,
  "resource_id" uuid NOT NULL,
  "resource_name" character varying(255) NOT NULL,
  "resource_type" character varying(100) NOT NULL,
  "allocated_amount" numeric(10) NOT NULL,
  "allocation_percentage" numeric(5),
  "allocation_start" date NOT NULL,
  "allocation_end" date,
  "priority_score" numeric(5),
  "is_critical_resource" boolean DEFAULT false,
  "has_conflicts" boolean DEFAULT false,
  "conflict_projects" uuid[],
  "conflict_details" jsonb,
  "allocation_status" character varying(50) DEFAULT 'planned'::character varying NOT NULL,
  "notes" text,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."program_resource_allocations" ENABLE ROW LEVEL SECURITY;

-- Table: program_resource_performance
CREATE TABLE IF NOT EXISTS public."program_resource_performance" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL,
  "resource_id" uuid NOT NULL,
  "reporting_period" date NOT NULL,
  "available_hours" numeric(10) DEFAULT 0,
  "billable_hours" numeric(10) DEFAULT 0,
  "utilization_rate" numeric(5),
  "tasks_assigned" integer DEFAULT 0,
  "tasks_completed" integer DEFAULT 0,
  "completion_rate" numeric(5),
  "quality_score" numeric(5),
  "rework_percentage" numeric(5) DEFAULT 0,
  "overall_performance" character varying(50),
  "performance_score" integer,
  "manager_feedback" text,
  "peer_feedback" jsonb,
  "self_assessment" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamp without time zone,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (program_id, resource_id, reporting_period)
);
ALTER TABLE public."program_resource_performance" ENABLE ROW LEVEL SECURITY;

-- Table: program_resource_plan
CREATE TABLE IF NOT EXISTS public."program_resource_plan" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL,
  "resource_type" character varying(100) NOT NULL,
  "resource_name" character varying(255) NOT NULL,
  "resource_role" character varying(100),
  "required_quantity" numeric(10) NOT NULL,
  "unit_of_measure" character varying(50) DEFAULT 'FTE'::character varying NOT NULL,
  "needed_from" date NOT NULL,
  "needed_until" date,
  "hours_per_week" numeric(5),
  "required_skills" text[],
  "seniority_level" character varying(50),
  "planning_status" character varying(50) DEFAULT 'identified'::character varying NOT NULL,
  "description" text,
  "priority" integer DEFAULT 0,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."program_resource_plan" ENABLE ROW LEVEL SECURITY;

-- Table: program_resource_risks
CREATE TABLE IF NOT EXISTS public."program_resource_risks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL,
  "resource_id" uuid,
  "risk_title" character varying(255) NOT NULL,
  "risk_description" text,
  "risk_category" character varying(100),
  "probability" character varying(50),
  "impact" character varying(50),
  "risk_score" integer,
  "mitigation_plan" text,
  "mitigation_status" character varying(50) DEFAULT 'planned'::character varying,
  "mitigation_owner_id" uuid,
  "risk_status" character varying(50) DEFAULT 'open'::character varying,
  "identified_date" date DEFAULT CURRENT_DATE,
  "mitigation_due_date" date,
  "resolved_date" date,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."program_resource_risks" ENABLE ROW LEVEL SECURITY;

-- Table: program_skills_inventory
CREATE TABLE IF NOT EXISTS public."program_skills_inventory" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "skill_name" character varying(255) NOT NULL,
  "skill_category" character varying(100) NOT NULL,
  "proficiency_level" character varying(50) NOT NULL,
  "proficiency_score" integer,
  "is_certified" boolean DEFAULT false,
  "certification_name" character varying(255),
  "certification_expiry" date,
  "certification_issuer" character varying(255),
  "years_experience" numeric(5) DEFAULT 0,
  "projects_used_in" uuid[],
  "last_used_date" date,
  "available_for_allocation" boolean DEFAULT true,
  "preferred_allocation_type" character varying(50),
  "verified_by" uuid,
  "verified_at" timestamp without time zone,
  "verification_notes" text,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (program_id, user_id, skill_name)
);
ALTER TABLE public."program_skills_inventory" ENABLE ROW LEVEL SECURITY;

-- Table: programs
CREATE TABLE IF NOT EXISTS public."programs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text,
  "budget" numeric(15),
  "currency" character varying(3) DEFAULT 'USD'::character varying,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "status" character varying(10) DEFAULT 'green'::character varying,
  "owner_id" uuid NOT NULL,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "archived" boolean DEFAULT false,
  "archived_at" timestamp without time zone,
  "archived_by" uuid,
  "company_id" uuid,
  "portfolio_id" uuid
,
  PRIMARY KEY (id)
);
ALTER TABLE public."programs" ENABLE ROW LEVEL SECURITY;

-- Table: project_analysis
CREATE TABLE IF NOT EXISTS public."project_analysis" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "total_documents" integer DEFAULT 0,
  "average_quality_score" numeric(3) DEFAULT 0.0,
  "document_types" text[] DEFAULT '{}'::text[],
  "quality_distribution" jsonb DEFAULT '{}'::jsonb,
  "common_issues" text[] DEFAULT '{}'::text[],
  "best_practices_applied" jsonb DEFAULT '[]'::jsonb,
  "improvement_opportunities" text[] DEFAULT '{}'::text[],
  "analyzed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."project_analysis" ENABLE ROW LEVEL SECURITY;

-- Table: project_baselines
CREATE TABLE IF NOT EXISTS public."project_baselines" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "version" character varying(20) DEFAULT '1.0'::character varying NOT NULL,
  "status" character varying(20) DEFAULT 'draft'::character varying NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp without time zone DEFAULT now(),
  "approved_by" uuid,
  "approved_at" timestamp without time zone,
  "superseded_by" uuid,
  "document_corpus" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "corpus_analysis" jsonb,
  "scope_baseline" jsonb,
  "technical_baseline" jsonb,
  "timeline_baseline" jsonb,
  "cost_baseline" jsonb,
  "resource_baseline" jsonb,
  "success_criteria" jsonb,
  "ai_processing_metadata" jsonb,
  "extraction_confidence" numeric(3) DEFAULT 0.0,
  "completeness_score" numeric(3) DEFAULT 0.0,
  "consistency_score" numeric(3) DEFAULT 0.0,
  "clarity_score" numeric(3) DEFAULT 0.0,
  "notes" text,
  "review_comments" jsonb,
  "compliance_review_status" character varying(50),
  "compliance_review_comments" text,
  "compliance_reviewed_by" uuid,
  "compliance_reviewed_at" timestamp without time zone,
  "pmbok_compliance_score" numeric(3),
  "feasibility_status" character varying(50)
,
  PRIMARY KEY (id),
  UNIQUE (project_id, version)
);
ALTER TABLE public."project_baselines" ENABLE ROW LEVEL SECURITY;

-- Table: project_charter_details
CREATE TABLE IF NOT EXISTS public."project_charter_details" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "vision_statement" text,
  "strategic_alignment" text,
  "high_level_objectives" text[],
  "success_measures" text[],
  "executive_sponsor" character varying(255),
  "approval_date" timestamp with time zone,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."project_charter_details" ENABLE ROW LEVEL SECURITY;

-- Table: project_context_items
CREATE TABLE IF NOT EXISTS public."project_context_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "type" character varying(50) NOT NULL,
  "title" character varying(255) NOT NULL,
  "content" text NOT NULL,
  "source_url" text,
  "original_filename" character varying(255),
  "file_type" character varying(50),
  "integration_type" character varying(50),
  "integration_page_id" character varying(255),
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "is_active" boolean DEFAULT true,
  "priority" integer DEFAULT 0,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."project_context_items" ENABLE ROW LEVEL SECURITY;

-- Table: project_context_usage_log
CREATE TABLE IF NOT EXISTS public."project_context_usage_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "context_item_id" uuid NOT NULL,
  "document_id" uuid,
  "usage_type" character varying(50) NOT NULL,
  "usage_timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "metadata" jsonb DEFAULT '{}'::jsonb
,
  PRIMARY KEY (id)
);
ALTER TABLE public."project_context_usage_log" ENABLE ROW LEVEL SECURITY;

-- Table: project_cost_breakdown
CREATE TABLE IF NOT EXISTS public."project_cost_breakdown" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "internal_labor_cost" numeric(15) DEFAULT 0,
  "internal_labor_hours" numeric(10) DEFAULT 0,
  "external_labor_cost" numeric(15) DEFAULT 0,
  "external_labor_hours" numeric(10) DEFAULT 0,
  "total_labor_cost" numeric(15) DEFAULT 0,
  "cloud_infrastructure_cost" numeric(15) DEFAULT 0,
  "ai_services_cost" numeric(15) DEFAULT 0,
  "software_tools_cost" numeric(15) DEFAULT 0,
  "equipment_cost" numeric(15) DEFAULT 0,
  "materials_cost" numeric(15) DEFAULT 0,
  "overhead_cost" numeric(15) DEFAULT 0,
  "total_actual_cost" numeric(15) DEFAULT 0,
  "total_approved_cost" numeric(15) DEFAULT 0,
  "total_pending_cost" numeric(15) DEFAULT 0,
  "last_calculated_at" timestamp without time zone DEFAULT now(),
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (project_id)
);
ALTER TABLE public."project_cost_breakdown" ENABLE ROW LEVEL SECURITY;

-- Table: project_dependencies
CREATE TABLE IF NOT EXISTS public."project_dependencies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "source_project_id" uuid NOT NULL,
  "target_project_id" uuid NOT NULL,
  "dependency_type" character varying(20) DEFAULT 'medium'::character varying NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (source_project_id, target_project_id)
);
ALTER TABLE public."project_dependencies" ENABLE ROW LEVEL SECURITY;

-- Table: project_entity_baselines
CREATE TABLE IF NOT EXISTS public."project_entity_baselines" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "baseline_name" character varying(200) NOT NULL,
  "baseline_type" character varying(50) NOT NULL,
  "baseline_version" integer DEFAULT 1,
  "entity_snapshot" jsonb NOT NULL,
  "entity_count" jsonb,
  "project_metadata" jsonb,
  "is_approved" boolean DEFAULT false,
  "approved_at" timestamp with time zone,
  "approved_by" uuid,
  "phase_id" uuid,
  "milestone_id" uuid,
  "document_version_id" uuid,
  "status" character varying(20) DEFAULT 'active'::character varying,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_by" uuid,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."project_entity_baselines" ENABLE ROW LEVEL SECURITY;

-- Table: project_expenses
CREATE TABLE IF NOT EXISTS public."project_expenses" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "cost_category_id" uuid,
  "expense_name" character varying(255) NOT NULL,
  "description" text,
  "expense_type" character varying(50),
  "amount" numeric(15) NOT NULL,
  "currency" character varying(3) DEFAULT 'USD'::character varying,
  "usage_metric" character varying(50),
  "usage_quantity" numeric(15),
  "unit_cost" numeric(10),
  "expense_date" date NOT NULL,
  "billing_period_start" date,
  "billing_period_end" date,
  "invoice_number" character varying(100),
  "vendor_name" character varying(255),
  "receipt_url" text,
  "status" character varying(50) DEFAULT 'draft'::character varying,
  "approved_by" uuid,
  "approved_at" timestamp without time zone,
  "payment_status" character varying(50),
  "payment_date" date,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."project_expenses" ENABLE ROW LEVEL SECURITY;

-- Table: project_goals
CREATE TABLE IF NOT EXISTS public."project_goals" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "title" character varying(255) NOT NULL,
  "description" text,
  "success_criteria" text,
  "target_value" numeric(15),
  "current_value" numeric(15) DEFAULT 0,
  "unit" character varying(50),
  "business_quarter" character varying(10),
  "target_date" date,
  "status" character varying(20) DEFAULT 'draft'::character varying,
  "category" character varying(50),
  "priority" character varying(20) DEFAULT 'medium'::character varying,
  "progress_percentage" numeric(5) DEFAULT 0,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "achieved_at" timestamp without time zone
,
  PRIMARY KEY (id)
);
ALTER TABLE public."project_goals" ENABLE ROW LEVEL SECURITY;

-- Table: project_integrations
CREATE TABLE IF NOT EXISTS public."project_integrations" (
  "project_id" uuid NOT NULL,
  "jira_project_key" text,
  "jira_issue_type_default" text,
  "confluence_space_key" text,
  "confluence_parent_page_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "confluence_enabled" boolean DEFAULT false,
  "confluence_space_key_override" text,
  "confluence_parent_page_id_override" text,
  "confluence_auto_publish" boolean DEFAULT false,
  "jira_enabled" boolean DEFAULT false,
  "jira_project_key_override" text,
  "jira_issue_type_override" text,
  "jira_priority_override" text,
  "jira_auto_create" boolean DEFAULT false,
  "integration_settings" jsonb DEFAULT '{}'::jsonb
,
  PRIMARY KEY (project_id)
);
ALTER TABLE public."project_integrations" ENABLE ROW LEVEL SECURITY;

-- Table: project_iterations
CREATE TABLE IF NOT EXISTS public."project_iterations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" text NOT NULL,
  "iteration_type" text DEFAULT 'sprint'::text NOT NULL,
  "sequence_number" integer,
  "start_date" date,
  "end_date" date,
  "goals" text[] DEFAULT '{}'::text[] NOT NULL,
  "planned_story_points" integer,
  "completed_story_points" integer,
  "velocity" integer,
  "status" text DEFAULT 'planned'::text NOT NULL,
  "retrospective_summary" text,
  "impediments" text[] DEFAULT '{}'::text[] NOT NULL,
  "source_document_id" uuid,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, name)
);
ALTER TABLE public."project_iterations" ENABLE ROW LEVEL SECURITY;

-- Table: project_org_chart
CREATE TABLE IF NOT EXISTS public."project_org_chart" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "person_name" character varying(255) NOT NULL,
  "title" character varying(255),
  "reports_to" character varying(255),
  "department" character varying(255),
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."project_org_chart" ENABLE ROW LEVEL SECURITY;

-- Table: project_pmbok7_domains
CREATE TABLE IF NOT EXISTS public."project_pmbok7_domains" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "domain_id" uuid NOT NULL,
  "maturity_level" character varying(20) DEFAULT 'not_addressed'::character varying NOT NULL,
  "maturity_score" integer,
  "outcomes_achieved" jsonb,
  "notes" text,
  "assessed_by" uuid,
  "assessed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (project_id, domain_id)
);
ALTER TABLE public."project_pmbok7_domains" ENABLE ROW LEVEL SECURITY;

-- Table: project_pmbok7_principles
CREATE TABLE IF NOT EXISTS public."project_pmbok7_principles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "principle_id" uuid NOT NULL,
  "alignment_level" character varying(20) DEFAULT 'not_addressed'::character varying NOT NULL,
  "alignment_score" integer,
  "evidence" text,
  "implementation_notes" text,
  "assessed_by" uuid,
  "assessed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (project_id, principle_id)
);
ALTER TABLE public."project_pmbok7_principles" ENABLE ROW LEVEL SECURITY;

-- Table: project_priority_scores
CREATE TABLE IF NOT EXISTS public."project_priority_scores" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "criteria_id" uuid NOT NULL,
  "raw_score" integer NOT NULL,
  "weighted_score" numeric(10),
  "justification" text,
  "scored_by" uuid,
  "scored_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (project_id, criteria_id)
);
ALTER TABLE public."project_priority_scores" ENABLE ROW LEVEL SECURITY;

-- Table: project_resource_assignments
CREATE TABLE IF NOT EXISTS public."project_resource_assignments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "user_id" uuid,
  "role_id" uuid,
  "assignment_type" character varying(50),
  "allocation_percentage" numeric(5) DEFAULT 100.00,
  "hourly_rate" numeric(10) DEFAULT 0.00,
  "daily_rate" numeric(10),
  "currency" character varying(3) DEFAULT 'USD'::character varying,
  "start_date" date,
  "end_date" date,
  "estimated_hours" numeric(10),
  "estimated_cost" numeric(15),
  "actual_hours" numeric(10) DEFAULT 0,
  "actual_cost" numeric(15) DEFAULT 0,
  "status" character varying(50) DEFAULT 'active'::character varying,
  "requires_approval" boolean DEFAULT false,
  "approved_by" uuid,
  "approval_date" date,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "allocation_pct" numeric(5),
  "resource_name" character varying(255),
  "activity_id" uuid,
  "activity_name" character varying(255),
  "skill_required" character varying(255),
  "skill_level" character varying(50),
  "source_document_id" uuid
,
  PRIMARY KEY (id),
  UNIQUE (project_id, user_id, role_id, start_date)
);
ALTER TABLE public."project_resource_assignments" ENABLE ROW LEVEL SECURITY;

-- Table: project_roles
CREATE TABLE IF NOT EXISTS public."project_roles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "role_name" character varying(100) NOT NULL,
  "role_code" character varying(20),
  "description" text,
  "role_type" character varying(50) NOT NULL,
  "role_category" character varying(50),
  "seniority_level" character varying(50),
  "default_hourly_rate" numeric(10) NOT NULL,
  "currency" character varying(3) DEFAULT 'USD'::character varying,
  "rate_effective_date" date DEFAULT CURRENT_DATE,
  "required_skills" text[],
  "certifications" text[],
  "display_order" integer DEFAULT 0,
  "is_active" boolean DEFAULT true,
  "is_billable" boolean DEFAULT true,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "required_competencies" text[]
,
  UNIQUE (organization_id, role_name),
  PRIMARY KEY (id),
  UNIQUE (role_code)
);
ALTER TABLE public."project_roles" ENABLE ROW LEVEL SECURITY;

-- Table: project_tasks
CREATE TABLE IF NOT EXISTS public."project_tasks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "parent_task_id" uuid,
  "task_number" character varying(50),
  "wbs_code" character varying(50),
  "task_name" character varying(255) NOT NULL,
  "description" text,
  "required_role_id" uuid,
  "required_role_name" character varying(100),
  "required_skills" text[],
  "required_resource_count" integer DEFAULT 1,
  "estimated_hours" numeric(10),
  "estimated_duration_days" integer,
  "estimated_cost" numeric(15),
  "planned_start_date" date,
  "planned_end_date" date,
  "actual_start_date" date,
  "actual_end_date" date,
  "deliverables" text[],
  "acceptance_criteria" text,
  "percent_complete" numeric(5) DEFAULT 0,
  "status" character varying(50) DEFAULT 'planned'::character varying,
  "actual_hours" numeric(10) DEFAULT 0,
  "actual_cost" numeric(15) DEFAULT 0,
  "hours_variance" numeric(10),
  "cost_variance" numeric(15),
  "schedule_variance_days" integer,
  "source_document_id" uuid,
  "source_entity_id" character varying(100),
  "imported_from_wbs" boolean DEFAULT false,
  "phase" character varying(100),
  "category" character varying(100),
  "priority" character varying(20) DEFAULT 'medium'::character varying,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "completed_at" timestamp without time zone,
  "entity_type" character varying(50),
  "goal_id" uuid
,
  PRIMARY KEY (id),
  UNIQUE (project_id, task_number)
);
ALTER TABLE public."project_tasks" ENABLE ROW LEVEL SECURITY;

-- Table: project_team_evaluations
CREATE TABLE IF NOT EXISTS public."project_team_evaluations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "person_name" character varying(255),
  "evaluation_date" timestamp with time zone,
  "performance_score" integer,
  "strengths" text,
  "development_areas" text,
  "evaluator" character varying(255),
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."project_team_evaluations" ENABLE ROW LEVEL SECURITY;

-- Table: projects
CREATE TABLE IF NOT EXISTS public."projects" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text,
  "framework" character varying(50) NOT NULL,
  "status" character varying(20) DEFAULT 'active'::character varying,
  "priority" character varying(20) DEFAULT 'medium'::character varying,
  "start_date" date,
  "end_date" date,
  "budget" numeric(12),
  "owner_id" uuid,
  "created_by" uuid,
  "team_members" jsonb DEFAULT '[]'::jsonb,
  "settings" jsonb DEFAULT '{}'::jsonb,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "program_id" uuid,
  "archived" boolean DEFAULT false,
  "archived_at" timestamp without time zone,
  "archived_by" uuid,
  "actual_cost" numeric(15) DEFAULT 0,
  "forecast_cost" numeric(15) DEFAULT 0,
  "expected_benefits" numeric(15) DEFAULT 0,
  "realized_benefits" numeric(15) DEFAULT 0,
  "labor_cost" numeric(15) DEFAULT 0,
  "materials_cost" numeric(15) DEFAULT 0,
  "equipment_cost" numeric(15) DEFAULT 0,
  "overhead_cost" numeric(15) DEFAULT 0,
  "planned_value" numeric(15) DEFAULT 0,
  "earned_value" numeric(15) DEFAULT 0,
  "percent_complete" numeric(5) DEFAULT 0,
  "completion_date" date,
  "internal_labor_cost" numeric(15) DEFAULT 0,
  "external_labor_cost" numeric(15) DEFAULT 0,
  "cloud_infrastructure_cost" numeric(15) DEFAULT 0,
  "ai_services_cost" numeric(15) DEFAULT 0,
  "software_tools_cost" numeric(15) DEFAULT 0,
  "company_id" uuid
,
  PRIMARY KEY (id)
);
ALTER TABLE public."projects" ENABLE ROW LEVEL SECURITY;

-- Table: prompt_templates
CREATE TABLE IF NOT EXISTS public."prompt_templates" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text,
  "category" character varying(100),
  "methodology" character varying(50),
  "system_prompt" text NOT NULL,
  "output_template_id" uuid,
  "context_requirements" jsonb DEFAULT '[]'::jsonb,
  "success_rate" numeric(3) DEFAULT 0.0,
  "usage_count" integer DEFAULT 0,
  "rating" numeric(3) DEFAULT 0.0,
  "is_public" boolean DEFAULT false,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."prompt_templates" ENABLE ROW LEVEL SECURITY;

-- Table: quality_audits
CREATE TABLE IF NOT EXISTS public."quality_audits" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "audit_job_id" uuid,
  "overall_score" integer NOT NULL,
  "overall_grade" character varying(2) NOT NULL,
  "quality_level" character varying(20) NOT NULL,
  "completeness_score" integer NOT NULL,
  "consistency_score" integer NOT NULL,
  "professional_quality_score" integer NOT NULL,
  "standards_compliance_score" integer NOT NULL,
  "accuracy_score" integer NOT NULL,
  "context_relevance_score" integer NOT NULL,
  "findings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "issues" jsonb DEFAULT '[]'::jsonb,
  "recommendations" jsonb DEFAULT '[]'::jsonb,
  "ai_provider" character varying(50),
  "ai_model" character varying(100),
  "analysis_tokens" integer,
  "analysis_cost" numeric(10),
  "analysis_time" integer,
  "audited_at" timestamp without time zone DEFAULT now(),
  "audited_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "source_document_id" uuid,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying
,
  PRIMARY KEY (id)
);
ALTER TABLE public."quality_audits" ENABLE ROW LEVEL SECURITY;

-- Table: quality_reports
CREATE TABLE IF NOT EXISTS public."quality_reports" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "report_id" character varying(255) NOT NULL,
  "document_id" character varying(255) NOT NULL,
  "job_id" character varying(255) NOT NULL,
  "overall_score" numeric(3) NOT NULL,
  "assessments" jsonb DEFAULT '[]'::jsonb,
  "recommendations" jsonb DEFAULT '[]'::jsonb,
  "issues" jsonb DEFAULT '[]'::jsonb,
  "quality_gates" jsonb DEFAULT '[]'::jsonb,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (report_id)
);
ALTER TABLE public."quality_reports" ENABLE ROW LEVEL SECURITY;

-- Table: quality_standards
CREATE TABLE IF NOT EXISTS public."quality_standards" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "project_id" uuid NOT NULL,
  "standard_name" character varying(255) NOT NULL,
  "description" text,
  "category" character varying(100),
  "measurement_criteria" text,
  "target_threshold" character varying(100),
  "compliance_requirement" text,
  "verification_method" character varying(255),
  "extracted_from_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "created_by" uuid,
  "title" character varying(500),
  "source_document_id" uuid
,
  PRIMARY KEY (id),
  UNIQUE (project_id, standard_name)
);
ALTER TABLE public."quality_standards" ENABLE ROW LEVEL SECURITY;

-- Table: quality_trends
CREATE TABLE IF NOT EXISTS public."quality_trends" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "timeframe" character varying(20) NOT NULL,
  "average_quality_score" numeric(3) NOT NULL,
  "trend_direction" character varying(20) DEFAULT 'stable'::character varying,
  "data_points" integer DEFAULT 0,
  "framework_breakdown" jsonb DEFAULT '{}'::jsonb,
  "category_breakdown" jsonb DEFAULT '{}'::jsonb,
  "common_issues" text[] DEFAULT '{}'::text[],
  "improvement_areas" text[] DEFAULT '{}'::text[],
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."quality_trends" ENABLE ROW LEVEL SECURITY;

-- Table: quantum_stability_audit
CREATE TABLE IF NOT EXISTS public."quantum_stability_audit" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "qubit_id" character varying(100) NOT NULL,
  "event_type" character varying(50) NOT NULL,
  "details" text,
  "infrared_value" numeric(6) NOT NULL,
  "action_taken" character varying(200),
  "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."quantum_stability_audit" ENABLE ROW LEVEL SECURITY;

-- Table: quantum_stability_metrics
CREATE TABLE IF NOT EXISTS public."quantum_stability_metrics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "total_qubits" integer NOT NULL,
  "stable_qubits" integer NOT NULL,
  "decoherence_rate" numeric(5) NOT NULL,
  "average_coherence" numeric(5) NOT NULL,
  "thermal_stability" numeric(5) NOT NULL,
  "noise_reduction" numeric(5) NOT NULL,
  "efficiency" numeric(5) NOT NULL,
  "infrared_optimization" numeric(5) NOT NULL,
  "speed_of_light_factor" numeric(15) DEFAULT 299792458,
  "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."quantum_stability_metrics" ENABLE ROW LEVEL SECURITY;

-- Table: qubit_states
CREATE TABLE IF NOT EXISTS public."qubit_states" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "qubit_id" character varying(100) NOT NULL,
  "state" character varying(20) NOT NULL,
  "coherence" numeric(5) NOT NULL,
  "temperature" numeric(10) NOT NULL,
  "noise_level" numeric(5) NOT NULL,
  "stability" numeric(5) NOT NULL,
  "infrared_spectrum" numeric(6) NOT NULL,
  "last_measurement" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (qubit_id)
);
ALTER TABLE public."qubit_states" ENABLE ROW LEVEL SECURITY;

-- Table: query_analytics
CREATE TABLE IF NOT EXISTS public."query_analytics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "query" text NOT NULL,
  "query_hash" character varying(64) NOT NULL,
  "frequency" integer DEFAULT 1,
  "average_relevance" numeric(3) DEFAULT 0.0,
  "average_processing_time" integer DEFAULT 0,
  "success_rate" numeric(3) DEFAULT 1.0,
  "last_searched" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (query_hash)
);
ALTER TABLE public."query_analytics" ENABLE ROW LEVEL SECURITY;

-- Table: rag_analytics
CREATE TABLE IF NOT EXISTS public."rag_analytics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "operation_type" character varying(50) NOT NULL,
  "document_id" uuid,
  "success" boolean DEFAULT true NOT NULL,
  "duration_ms" integer,
  "chunks_processed" integer,
  "vectors_created" integer,
  "error_message" text,
  "error_type" character varying(100),
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."rag_analytics" ENABLE ROW LEVEL SECURITY;

-- Table: regeneration_jobs
CREATE TABLE IF NOT EXISTS public."regeneration_jobs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "template_id" uuid,
  "provider" character varying(50) NOT NULL,
  "model" character varying(100),
  "version_type" character varying(10) NOT NULL,
  "temperature" numeric(3) DEFAULT 0.7,
  "user_id" uuid NOT NULL,
  "status" character varying(20) DEFAULT 'pending'::character varying,
  "progress" integer DEFAULT 0,
  "progress_message" text,
  "created_at" timestamp without time zone DEFAULT now(),
  "started_at" timestamp without time zone,
  "completed_at" timestamp without time zone,
  "error_message" text,
  "new_version_id" uuid,
  "context_summary" jsonb,
  "metadata" jsonb,
  "conflict_id" uuid
,
  PRIMARY KEY (id)
);
ALTER TABLE public."regeneration_jobs" ENABLE ROW LEVEL SECURITY;

-- Table: relationship_health
CREATE TABLE IF NOT EXISTS public."relationship_health" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "assessment_date" date NOT NULL,
  "stakeholder_id" uuid,
  "stakeholder_name" text,
  "overall_health_score" numeric(3),
  "health_indicators" jsonb DEFAULT '{}'::jsonb,
  "relationship_strength" text,
  "trend" text,
  "key_concerns" text[],
  "positive_aspects" text[],
  "recommendations" text[],
  "next_assessment_date" date,
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "health_score" numeric(3) DEFAULT 0.0
,
  PRIMARY KEY (id),
  UNIQUE (project_id, assessment_date, stakeholder_id)
);
ALTER TABLE public."relationship_health" ENABLE ROW LEVEL SECURITY;

-- Table: releases
CREATE TABLE IF NOT EXISTS public."releases" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "release_number" text NOT NULL,
  "release_name" text,
  "release_date" date,
  "release_type" text,
  "deliverable_ids" uuid[] DEFAULT '{}'::uuid[],
  "release_notes" text,
  "go_live_checklist" jsonb DEFAULT '[]'::jsonb,
  "rollback_plan" text,
  "approvals" jsonb DEFAULT '[]'::jsonb,
  "status" text DEFAULT 'planned'::text NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, release_number)
);
ALTER TABLE public."releases" ENABLE ROW LEVEL SECURITY;

-- Table: relevance_feedback
CREATE TABLE IF NOT EXISTS public."relevance_feedback" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "result_id" character varying(255) NOT NULL,
  "user_id" uuid NOT NULL,
  "relevance_score" numeric(3) NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (result_id, user_id)
);
ALTER TABLE public."relevance_feedback" ENABLE ROW LEVEL SECURITY;

-- Table: requirements
CREATE TABLE IF NOT EXISTS public."requirements" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text NOT NULL,
  "type" character varying(20) DEFAULT 'functional'::character varying,
  "priority" character varying(20) DEFAULT 'medium'::character varying,
  "status" character varying(20) DEFAULT 'draft'::character varying,
  "source" character varying(255),
  "acceptance_criteria" text[] DEFAULT '{}'::text[],
  "dependencies" text[] DEFAULT '{}'::text[],
  "risks" text[] DEFAULT '{}'::text[],
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamp with time zone,
  "title" character varying(500),
  "created_by" uuid,
  "source_document_id" uuid,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying,
  "idempotency_key" character varying(64)
,
  PRIMARY KEY (id),
  UNIQUE (project_id, name)
);
ALTER TABLE public."requirements" ENABLE ROW LEVEL SECURITY;

-- Table: requirements_traceability
CREATE TABLE IF NOT EXISTS public."requirements_traceability" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "requirement_id" character varying(100),
  "deliverable_id" character varying(100),
  "wbs_code" character varying(50),
  "test_case_id" character varying(100),
  "status" character varying(50),
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."requirements_traceability" ENABLE ROW LEVEL SECURITY;

-- Table: resolution_strategies
CREATE TABLE IF NOT EXISTS public."resolution_strategies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "strategy_id" character varying(100) NOT NULL,
  "strategy_name" character varying(200) NOT NULL,
  "strategy_type" character varying(50) NOT NULL,
  "priority" integer NOT NULL,
  "enabled" boolean DEFAULT true,
  "config" jsonb NOT NULL,
  "conditions" jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (strategy_id)
);
ALTER TABLE public."resolution_strategies" ENABLE ROW LEVEL SECURITY;

-- Table: resource_articles
CREATE TABLE IF NOT EXISTS public."resource_articles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "content_type" text NOT NULL,
  "title" text NOT NULL,
  "slug" text NOT NULL,
  "summary" text,
  "content_markdown" text NOT NULL,
  "cover_image_url" text,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" text DEFAULT 'draft'::text NOT NULL,
  "published_at" timestamp with time zone,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_reviewed_at" timestamp with time zone
,
  PRIMARY KEY (id),
  UNIQUE (slug)
);
ALTER TABLE public."resource_articles" ENABLE ROW LEVEL SECURITY;

-- Table: resource_assignments
CREATE TABLE IF NOT EXISTS public."resource_assignments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "assignment_id" text NOT NULL,
  "resource_id" uuid,
  "resource_name" text,
  "activity_id" text,
  "activity_name" text,
  "allocation_percentage" integer NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date,
  "skill_required" text,
  "skill_level" text,
  "role" text,
  "cost_rate_per_hour" numeric(10),
  "estimated_hours" numeric(10),
  "actual_hours" numeric(10),
  "status" text,
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, assignment_id)
);
ALTER TABLE public."resource_assignments" ENABLE ROW LEVEL SECURITY;

-- Table: resource_capacity_settings
CREATE TABLE IF NOT EXISTS public."resource_capacity_settings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "contracted_hours_per_week" numeric(5) DEFAULT 40,
  "contracted_hours_per_day" numeric(5) DEFAULT 8,
  "contracted_days_per_week" integer DEFAULT 5,
  "work_start_time" time without time zone DEFAULT '09:00:00'::time without time zone,
  "work_end_time" time without time zone DEFAULT '17:00:00'::time without time zone,
  "timezone" character varying(50) DEFAULT 'UTC'::character varying,
  "target_utilization_percent" numeric(5) DEFAULT 80,
  "max_allocation_percent" numeric(5) DEFAULT 100,
  "min_allocation_percent" numeric(5) DEFAULT 0,
  "annual_leave_days" integer DEFAULT 25,
  "public_holidays_calendar" character varying(50) DEFAULT 'US'::character varying,
  "resource_type" character varying(50) DEFAULT 'full-time'::character varying,
  "cost_center" character varying(100),
  "department" character varying(100),
  "effective_from" date DEFAULT CURRENT_DATE NOT NULL,
  "effective_until" date,
  "is_active" boolean DEFAULT true,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (user_id, effective_from)
);
ALTER TABLE public."resource_capacity_settings" ENABLE ROW LEVEL SECURITY;

-- Table: resource_conflicts
CREATE TABLE IF NOT EXISTS public."resource_conflicts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "conflict_id" text NOT NULL,
  "resource_id" uuid,
  "resource_name" text,
  "conflict_type" text NOT NULL,
  "conflicting_assignments" text[],
  "conflict_start_date" date,
  "conflict_end_date" date,
  "severity" text,
  "impact_assessment" text,
  "resolution_strategy" text,
  "resolution_status" text,
  "resolved_date" date,
  "resolved_by" text,
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "conflict_description" text,
  "impacted_activities" jsonb DEFAULT '[]'::jsonb,
  "resolution" text,
  "resolution_date" date,
  "conflict_date" date
,
  PRIMARY KEY (id),
  UNIQUE (project_id, conflict_id)
);
ALTER TABLE public."resource_conflicts" ENABLE ROW LEVEL SECURITY;

-- Table: resource_plans
CREATE TABLE IF NOT EXISTS public."resource_plans" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "resource_description" text,
  "required_quantity" integer,
  "start_date" timestamp with time zone,
  "end_date" timestamp with time zone,
  "skill_set" text[],
  "location" character varying(255),
  "status" character varying(50),
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."resource_plans" ENABLE ROW LEVEL SECURITY;

-- Table: resource_pool
CREATE TABLE IF NOT EXISTS public."resource_pool" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "resource_id" uuid,
  "resource_name" text NOT NULL,
  "resource_type" text NOT NULL,
  "skills" text[],
  "certifications" text[],
  "availability_start_date" date,
  "availability_end_date" date,
  "available_hours_per_week" numeric(5),
  "cost_rate_per_hour" numeric(10),
  "cost_rate_per_unit" numeric(10),
  "current_utilization_pct" numeric(5),
  "max_utilization_pct" numeric(5),
  "status" text,
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, resource_id)
);
ALTER TABLE public."resource_pool" ENABLE ROW LEVEL SECURITY;

-- Table: resource_templates
CREATE TABLE IF NOT EXISTS public."resource_templates" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "slug" text NOT NULL,
  "summary" text,
  "content_markdown" text NOT NULL,
  "download_url" text,
  "download_format" text DEFAULT 'markdown'::text NOT NULL,
  "category" text,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" text DEFAULT 'draft'::text NOT NULL,
  "published_at" timestamp with time zone,
  "spotlight" boolean DEFAULT false NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_reviewed_at" timestamp with time zone
,
  PRIMARY KEY (id),
  UNIQUE (slug)
);
ALTER TABLE public."resource_templates" ENABLE ROW LEVEL SECURITY;

-- Table: resource_unavailability
CREATE TABLE IF NOT EXISTS public."resource_unavailability" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "unavailability_type" character varying(50) NOT NULL,
  "description" text,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "is_full_day" boolean DEFAULT true,
  "start_time" time without time zone,
  "end_time" time without time zone,
  "hours_unavailable" numeric(8),
  "status" character varying(30) DEFAULT 'pending'::character varying,
  "approved_by" uuid,
  "approved_at" timestamp without time zone,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."resource_unavailability" ENABLE ROW LEVEL SECURITY;

-- Table: resources
CREATE TABLE IF NOT EXISTS public."resources" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" character varying(255) NOT NULL,
  "type" character varying(100),
  "role" character varying(255),
  "allocation_percentage" integer,
  "cost_per_unit" numeric(12),
  "quantity" integer,
  "availability" text,
  "skills" text[],
  "extracted_from_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "created_by" uuid,
  "allocation" text,
  "competency_level" text,
  "certifications" text[] DEFAULT '{}'::text[] NOT NULL,
  "training_needs" text[] DEFAULT '{}'::text[] NOT NULL,
  "team_assignment" text,
  "performance_rating" numeric(4),
  "development_plan" text,
  "source_document_id" uuid,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying,
  "conflict_description" text,
  "conflict_type" character varying(50),
  "conflict_severity" character varying(20) DEFAULT 'low'::character varying,
  "conflict_status" character varying(20) DEFAULT 'open'::character varying,
  "description" text,
  "cost_estimate" numeric(12),
  "availability_pct" numeric(5) DEFAULT 100.00,
  "cost_rate" numeric(10),
  "location" character varying(255)
,
  PRIMARY KEY (id),
  UNIQUE (project_id, name)
);
ALTER TABLE public."resources" ENABLE ROW LEVEL SECURITY;

-- Table: review_action_items
CREATE TABLE IF NOT EXISTS public."review_action_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "review_meeting_id" uuid,
  "action_text" text NOT NULL,
  "assigned_to" uuid,
  "due_date" date,
  "status" character varying(50) DEFAULT 'open'::character varying,
  "completed_at" timestamp without time zone,
  "completed_by" uuid,
  "priority" character varying(20) DEFAULT 'medium'::character varying,
  "related_project_id" uuid,
  "related_program_id" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."review_action_items" ENABLE ROW LEVEL SECURITY;

-- Table: review_decisions
CREATE TABLE IF NOT EXISTS public."review_decisions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "review_meeting_id" uuid,
  "decision_type" character varying(50) NOT NULL,
  "decision_text" text NOT NULL,
  "affected_projects" uuid[] DEFAULT ARRAY[]::uuid[],
  "affected_programs" uuid[] DEFAULT ARRAY[]::uuid[],
  "approved_by" uuid,
  "approval_date" timestamp without time zone,
  "implementation_deadline" date,
  "implementation_status" character varying(50) DEFAULT 'pending'::character varying,
  "created_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."review_decisions" ENABLE ROW LEVEL SECURITY;

-- Table: review_meetings
CREATE TABLE IF NOT EXISTS public."review_meetings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "schedule_id" uuid,
  "program_id" uuid,
  "scheduled_date" date NOT NULL,
  "actual_date" date,
  "start_time" time without time zone,
  "end_time" time without time zone,
  "duration_minutes" integer,
  "status" character varying(50) DEFAULT 'scheduled'::character varying,
  "attendees" uuid[] DEFAULT ARRAY[]::uuid[],
  "absentees" uuid[] DEFAULT ARRAY[]::uuid[],
  "decisions" jsonb DEFAULT '[]'::jsonb,
  "action_items" jsonb DEFAULT '[]'::jsonb,
  "notes" text,
  "was_on_time" boolean,
  "was_complete" boolean,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."review_meetings" ENABLE ROW LEVEL SECURITY;

-- Table: review_schedules
CREATE TABLE IF NOT EXISTS public."review_schedules" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid,
  "review_type" character varying(50) NOT NULL,
  "frequency" character varying(20) NOT NULL,
  "day_of_month" integer,
  "day_of_week" character varying(10),
  "required_attendees" uuid[] DEFAULT ARRAY[]::uuid[],
  "optional_attendees" uuid[] DEFAULT ARRAY[]::uuid[],
  "review_owner_id" uuid,
  "agenda_template_id" uuid,
  "duration_minutes" integer DEFAULT 60,
  "auto_generate_agenda" boolean DEFAULT true,
  "send_reminders" boolean DEFAULT true,
  "reminder_days_before" integer[] DEFAULT ARRAY[7, 1],
  "is_active" boolean DEFAULT true,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."review_schedules" ENABLE ROW LEVEL SECURITY;

-- Table: risk_appetite
CREATE TABLE IF NOT EXISTS public."risk_appetite" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "category" character varying(100),
  "threshold_description" text,
  "level" character varying(50),
  "approval_body" character varying(255),
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."risk_appetite" ENABLE ROW LEVEL SECURITY;

-- Table: risk_assessments
CREATE TABLE IF NOT EXISTS public."risk_assessments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "risk_id" uuid,
  "assessment_date" date NOT NULL,
  "assessor" text,
  "probability" text NOT NULL,
  "impact" text NOT NULL,
  "risk_score" integer,
  "detectability" text,
  "rpn" integer,
  "risk_level" text,
  "assessment_methodology" text,
  "assumptions" text[],
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, risk_id, assessment_date)
);
ALTER TABLE public."risk_assessments" ENABLE ROW LEVEL SECURITY;

-- Table: risk_checklists
CREATE TABLE IF NOT EXISTS public."risk_checklists" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "category" character varying(100),
  "item_description" text,
  "risk_factors" text[],
  "last_checked" timestamp with time zone,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."risk_checklists" ENABLE ROW LEVEL SECURITY;

-- Table: risk_escalation_event_steps
CREATE TABLE IF NOT EXISTS public."risk_escalation_event_steps" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL,
  "step_id" uuid NOT NULL,
  "completed_by" uuid,
  "completed_at" timestamp with time zone,
  "status" character varying(30) DEFAULT 'pending'::character varying,
  "notes" text
,
  PRIMARY KEY (id)
);
ALTER TABLE public."risk_escalation_event_steps" ENABLE ROW LEVEL SECURITY;

-- Table: risk_escalation_events
CREATE TABLE IF NOT EXISTS public."risk_escalation_events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "portfolio_risk_id" uuid NOT NULL,
  "policy_id" uuid NOT NULL,
  "current_step_id" uuid,
  "status" character varying(30) DEFAULT 'pending'::character varying NOT NULL,
  "triggered_by" uuid,
  "triggered_at" timestamp with time zone DEFAULT now(),
  "acknowledged_by" uuid,
  "acknowledged_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "notes" text,
  "metadata" jsonb DEFAULT '{}'::jsonb
,
  PRIMARY KEY (id)
);
ALTER TABLE public."risk_escalation_events" ENABLE ROW LEVEL SECURITY;

-- Table: risk_escalation_policies
CREATE TABLE IF NOT EXISTS public."risk_escalation_policies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" character varying(150) NOT NULL,
  "description" text,
  "severity_levels" text[] DEFAULT ARRAY[]::text[],
  "probability_levels" text[] DEFAULT ARRAY[]::text[],
  "impact_levels" text[] DEFAULT ARRAY[]::text[],
  "financial_exposure_min" numeric(15),
  "financial_exposure_max" numeric(15),
  "schedule_impact_min" integer,
  "schedule_impact_max" integer,
  "systemic_only" boolean DEFAULT false,
  "auto_trigger" boolean DEFAULT true,
  "sla_hours" integer DEFAULT 24,
  "notification_channel" character varying(50) DEFAULT 'email'::character varying,
  "escalation_type" character varying(50) DEFAULT 'risk'::character varying,
  "active" boolean DEFAULT true,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."risk_escalation_policies" ENABLE ROW LEVEL SECURITY;

-- Table: risk_escalation_steps
CREATE TABLE IF NOT EXISTS public."risk_escalation_steps" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "policy_id" uuid NOT NULL,
  "step_order" integer NOT NULL,
  "role_name" character varying(120),
  "notify_team" character varying(120),
  "notify_user_id" uuid,
  "channel" character varying(50) DEFAULT 'email'::character varying,
  "sla_hours" integer DEFAULT 24,
  "instructions" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (policy_id, step_order)
);
ALTER TABLE public."risk_escalation_steps" ENABLE ROW LEVEL SECURITY;

-- Table: risk_metrics
CREATE TABLE IF NOT EXISTS public."risk_metrics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "metric_date" date NOT NULL,
  "total_risks" integer DEFAULT 0,
  "open_risks" integer DEFAULT 0,
  "closed_risks" integer DEFAULT 0,
  "high_priority_risks" integer DEFAULT 0,
  "critical_risks" integer DEFAULT 0,
  "average_risk_score" numeric(5),
  "total_exposure" numeric(15),
  "contingency_reserve_utilization_pct" numeric(5),
  "risk_response_coverage_pct" numeric(5),
  "trends" jsonb DEFAULT '{}'::jsonb,
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, metric_date)
);
ALTER TABLE public."risk_metrics" ENABLE ROW LEVEL SECURITY;

-- Table: risk_response_plans
CREATE TABLE IF NOT EXISTS public."risk_response_plans" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "risk_id" uuid,
  "response_strategy" text NOT NULL,
  "response_actions" text[] NOT NULL,
  "responsible_party" text,
  "deadline" date,
  "cost_estimate" numeric(12),
  "status" text,
  "effectiveness_rating" text,
  "residual_risk_level" text,
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id)
);
ALTER TABLE public."risk_response_plans" ENABLE ROW LEVEL SECURITY;

-- Table: risk_responses
CREATE TABLE IF NOT EXISTS public."risk_responses" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "risk_id" uuid,
  "risk_title" text,
  "response_date" date,
  "action_taken" text,
  "effectiveness" text,
  "cost_of_response" numeric(18),
  "residual_risk_level" text,
  "owner" text,
  "notes" text,
  "source_document_id" uuid,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, risk_title, response_date)
);
ALTER TABLE public."risk_responses" ENABLE ROW LEVEL SECURITY;

-- Table: risk_reviews
CREATE TABLE IF NOT EXISTS public."risk_reviews" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "review_id" text NOT NULL,
  "review_date" date NOT NULL,
  "review_type" text,
  "reviewed_risks" uuid[],
  "new_risks_identified" integer DEFAULT 0,
  "risks_closed" integer DEFAULT 0,
  "risks_escalated" integer DEFAULT 0,
  "status_changes" jsonb DEFAULT '[]'::jsonb,
  "key_findings" text,
  "action_items" text[],
  "next_review_date" date,
  "reviewed_by" text[],
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, review_id)
);
ALTER TABLE public."risk_reviews" ENABLE ROW LEVEL SECURITY;

-- Table: risk_triggers
CREATE TABLE IF NOT EXISTS public."risk_triggers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "risk_id" uuid,
  "trigger_name" text,
  "trigger_condition" text NOT NULL,
  "threshold_value" text,
  "early_warning_indicators" text[],
  "monitoring_frequency" text,
  "alert_recipients" text[],
  "last_triggered_date" date,
  "trigger_count" integer DEFAULT 0,
  "status" text,
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "risk_title" text,
  "threshold" text,
  "indicator" text,
  "response_action" text
,
  PRIMARY KEY (id),
  UNIQUE (project_id, risk_id, trigger_name)
);
ALTER TABLE public."risk_triggers" ENABLE ROW LEVEL SECURITY;

-- Table: risks
CREATE TABLE IF NOT EXISTS public."risks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text NOT NULL,
  "category" character varying(100),
  "probability" character varying(20) DEFAULT 'medium'::character varying,
  "impact" character varying(20) DEFAULT 'medium'::character varying,
  "risk_level" character varying(20) DEFAULT 'medium'::character varying,
  "mitigation_strategy" text,
  "contingency_plan" text,
  "owner" character varying(255),
  "status" character varying(20) DEFAULT 'identified'::character varying,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamp with time zone,
  "title" character varying(500),
  "created_by" uuid,
  "source_document_id" uuid,
  "risk_origin" character varying(50) DEFAULT 'project-extraction'::character varying,
  "program_id" uuid,
  "affects_programs" uuid[] DEFAULT ARRAY[]::uuid[],
  "cross_program" boolean DEFAULT false,
  "systemic_risk" boolean DEFAULT false,
  "financial_impact" numeric(15),
  "schedule_impact_days" integer,
  "financial_threshold" numeric(15),
  "exceeds_threshold" boolean DEFAULT false,
  "escalation_path" text,
  "escalated_to" uuid,
  "escalation_date" date,
  "last_review_date" date,
  "last_updated_date" date DEFAULT CURRENT_DATE,
  "last_updated_by" uuid,
  "monthly_review_status" character varying(50) DEFAULT 'pending'::character varying,
  "next_review_due_date" date,
  "review_date" date,
  "identified_date" date DEFAULT CURRENT_DATE,
  "closed_date" date,
  "tags" text[],
  "is_curated" boolean DEFAULT false,
  "recommended_playbook_id" uuid,
  "playbook_execution_id" uuid,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying,
  "idempotency_key" character varying(64)
,
  PRIMARY KEY (id),
  UNIQUE (project_id, name),
  UNIQUE (project_id, title)
);
ALTER TABLE public."risks" ENABLE ROW LEVEL SECURITY;

-- Table: role_competencies
CREATE TABLE IF NOT EXISTS public."role_competencies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "role_id" uuid NOT NULL,
  "competency_id" uuid NOT NULL,
  "required_level" character varying(50) DEFAULT 'intermediate'::character varying,
  "is_required" boolean DEFAULT true,
  "created_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (role_id, competency_id)
);
ALTER TABLE public."role_competencies" ENABLE ROW LEVEL SECURITY;

-- Table: role_skills
CREATE TABLE IF NOT EXISTS public."role_skills" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "role_id" uuid NOT NULL,
  "skill_id" uuid NOT NULL,
  "required_proficiency" character varying(50) DEFAULT 'intermediate'::character varying,
  "is_required" boolean DEFAULT true,
  "created_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (role_id, skill_id)
);
ALTER TABLE public."role_skills" ENABLE ROW LEVEL SECURITY;

-- Table: roles_and_responsibilities
CREATE TABLE IF NOT EXISTS public."roles_and_responsibilities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "role_name" character varying(255) NOT NULL,
  "responsibilities" text,
  "raci_category" character varying(10),
  "assigned_to" text[],
  "authority_level" character varying(255),
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."roles_and_responsibilities" ENABLE ROW LEVEL SECURITY;

-- Table: satisfaction_surveys
CREATE TABLE IF NOT EXISTS public."satisfaction_surveys" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "survey_id" text NOT NULL,
  "survey_date" date NOT NULL,
  "stakeholder_id" uuid,
  "stakeholder_name" text,
  "survey_type" text,
  "overall_satisfaction_score" numeric(3),
  "nps_score" integer,
  "response_categories" jsonb DEFAULT '{}'::jsonb,
  "feedback_themes" text[],
  "verbatim_feedback" text,
  "improvement_suggestions" text[],
  "would_recommend" boolean,
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "satisfaction_score" numeric(3),
  "sentiment" text,
  "feedback_summary" text,
  "themes" text[] DEFAULT '{}'::text[]
,
  PRIMARY KEY (id),
  UNIQUE (project_id, survey_id)
);
ALTER TABLE public."satisfaction_surveys" ENABLE ROW LEVEL SECURITY;

-- Table: schedule_activities
CREATE TABLE IF NOT EXISTS public."schedule_activities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "activity_id" character varying(50),
  "name" character varying(255) NOT NULL,
  "description" text,
  "wbs_code" character varying(50),
  "start_date" timestamp with time zone,
  "end_date" timestamp with time zone,
  "duration_days" integer,
  "status" character varying(50),
  "percent_complete" integer DEFAULT 0,
  "assigned_to" text[],
  "dependencies" text[],
  "is_critical" boolean DEFAULT false,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."schedule_activities" ENABLE ROW LEVEL SECURITY;

-- Table: schedule_baseline
CREATE TABLE IF NOT EXISTS public."schedule_baseline" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "start_date" timestamp with time zone,
  "end_date" timestamp with time zone,
  "duration_days" integer,
  "milestones_count" integer,
  "critical_path_length" integer,
  "approval_date" timestamp with time zone,
  "version" character varying(50),
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."schedule_baseline" ENABLE ROW LEVEL SECURITY;

-- Table: schedule_baselines
CREATE TABLE IF NOT EXISTS public."schedule_baselines" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "baseline_name" text NOT NULL,
  "baseline_version" integer DEFAULT 1 NOT NULL,
  "baseline_start_date" date NOT NULL,
  "baseline_end_date" date NOT NULL,
  "total_duration_days" integer,
  "key_milestones" jsonb DEFAULT '[]'::jsonb,
  "critical_path_activities" text[],
  "total_float_days" integer,
  "approval_date" date,
  "approved_by" text[],
  "status" text DEFAULT 'draft'::text NOT NULL,
  "is_current" boolean DEFAULT true,
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, baseline_name, baseline_version)
);
ALTER TABLE public."schedule_baselines" ENABLE ROW LEVEL SECURITY;

-- Table: schedule_forecasts
CREATE TABLE IF NOT EXISTS public."schedule_forecasts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "forecast_date" timestamp with time zone,
  "estimated_completion_date" timestamp with time zone,
  "variance_at_completion_days" integer,
  "confidence_level" character varying(50),
  "assumptions" text,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."schedule_forecasts" ENABLE ROW LEVEL SECURITY;

-- Table: schedule_variances
CREATE TABLE IF NOT EXISTS public."schedule_variances" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "report_date" timestamp with time zone,
  "sv_value" numeric,
  "spi_value" numeric,
  "variance_explanation" text,
  "corrective_actions" text,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."schedule_variances" ENABLE ROW LEVEL SECURITY;

-- Table: scope_baseline
CREATE TABLE IF NOT EXISTS public."scope_baseline" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "statement" text,
  "boundaries" text,
  "inclusions" text[],
  "exclusions" text[],
  "assumptions" text[],
  "constraints" text[],
  "approval_date" timestamp with time zone,
  "version" character varying(50),
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."scope_baseline" ENABLE ROW LEVEL SECURITY;

-- Table: scope_baselines
CREATE TABLE IF NOT EXISTS public."scope_baselines" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "baseline_name" text NOT NULL,
  "baseline_version" integer DEFAULT 1 NOT NULL,
  "scope_statement" text NOT NULL,
  "boundaries" text,
  "exclusions" text,
  "assumptions" text[],
  "constraints" text[],
  "acceptance_criteria" text,
  "approval_date" date,
  "approved_by" text[],
  "status" text DEFAULT 'draft'::text NOT NULL,
  "is_current" boolean DEFAULT true,
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, baseline_name, baseline_version)
);
ALTER TABLE public."scope_baselines" ENABLE ROW LEVEL SECURITY;

-- Table: scope_change_requests
CREATE TABLE IF NOT EXISTS public."scope_change_requests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "request_id" character varying(50),
  "title" character varying(255) NOT NULL,
  "description" text,
  "requestor" character varying(255),
  "impact_analysis" text,
  "cost_impact" numeric,
  "schedule_impact_days" integer,
  "status" character varying(50),
  "decision_date" timestamp with time zone,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."scope_change_requests" ENABLE ROW LEVEL SECURITY;

-- Table: scope_items
CREATE TABLE IF NOT EXISTS public."scope_items" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "project_id" uuid NOT NULL,
  "item_name" character varying(500) NOT NULL,
  "description" text,
  "inclusion_status" character varying(50) DEFAULT 'in_scope'::character varying,
  "category" character varying(100),
  "justification" text,
  "impact_if_excluded" text,
  "extracted_from_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "created_by" uuid,
  "title" character varying(500),
  "source_document_id" uuid,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying
,
  PRIMARY KEY (id),
  UNIQUE (project_id, item_name)
);
ALTER TABLE public."scope_items" ENABLE ROW LEVEL SECURITY;

-- Table: scope_verification
CREATE TABLE IF NOT EXISTS public."scope_verification" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "deliverable_name" character varying(255),
  "verification_date" timestamp with time zone,
  "verifier" character varying(255),
  "method" character varying(100),
  "outcome" character varying(50),
  "comments" text,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."scope_verification" ENABLE ROW LEVEL SECURITY;

-- Table: search_analytics
CREATE TABLE IF NOT EXISTS public."search_analytics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "query" text NOT NULL,
  "query_length" integer NOT NULL,
  "search_mode" character varying(20) NOT NULL,
  "types" text[],
  "frameworks" text[],
  "authors" text[],
  "tags" text[],
  "has_date_filter" boolean DEFAULT false,
  "total_results" integer DEFAULT 0,
  "results_returned" integer DEFAULT 0,
  "has_results" boolean DEFAULT true,
  "response_time_ms" integer NOT NULL,
  "cache_hit" boolean DEFAULT false,
  "result_clicks" integer DEFAULT 0,
  "ip_address" inet,
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."search_analytics" ENABLE ROW LEVEL SECURITY;

-- Table: search_history
CREATE TABLE IF NOT EXISTS public."search_history" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "query" text NOT NULL,
  "context_types" jsonb DEFAULT '[]'::jsonb,
  "filters" jsonb DEFAULT '{}'::jsonb,
  "user_id" uuid,
  "project_id" uuid,
  "template_id" uuid,
  "results_count" integer DEFAULT 0,
  "processing_time" integer DEFAULT 0,
  "search_strategy" character varying(20) DEFAULT 'hybrid'::character varying,
  "relevance_threshold" numeric(3) DEFAULT 0.1,
  "cache_hit" boolean DEFAULT false,
  "error" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."search_history" ENABLE ROW LEVEL SECURITY;

-- Table: search_index
CREATE TABLE IF NOT EXISTS public."search_index" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "content" text NOT NULL,
  "type" character varying(50) NOT NULL,
  "source" character varying(100) NOT NULL,
  "source_id" character varying(255) NOT NULL,
  "embeddings" jsonb,
  "keywords" text[] DEFAULT '{}'::text[],
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "relevance_score" numeric(3) DEFAULT 0.0,
  "access_count" integer DEFAULT 0,
  "last_accessed" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (source, source_id)
);
ALTER TABLE public."search_index" ENABLE ROW LEVEL SECURITY;

-- Table: search_result_clicks
CREATE TABLE IF NOT EXISTS public."search_result_clicks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "search_id" uuid,
  "result_id" uuid NOT NULL,
  "result_type" character varying(20) NOT NULL,
  "result_title" text,
  "result_position" integer NOT NULL,
  "relevance_score" numeric(5),
  "user_id" uuid,
  "action_type" character varying(20) DEFAULT 'view'::character varying,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."search_result_clicks" ENABLE ROW LEVEL SECURITY;

-- Table: search_suggestion_clicks
CREATE TABLE IF NOT EXISTS public."search_suggestion_clicks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "suggestion_text" text NOT NULL,
  "suggestion_type" character varying(20) NOT NULL,
  "query_before" text,
  "query_after" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."search_suggestion_clicks" ENABLE ROW LEVEL SECURITY;

-- Table: security_events
CREATE TABLE IF NOT EXISTS public."security_events" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "event_type" character varying(100) NOT NULL,
  "severity" character varying(20) NOT NULL,
  "source_ip" inet,
  "user_id" uuid,
  "resource" character varying(255),
  "action" character varying(100),
  "details" jsonb,
  "resolved" boolean DEFAULT false,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."security_events" ENABLE ROW LEVEL SECURITY;

-- Table: semantic_units
CREATE TABLE IF NOT EXISTS public."semantic_units" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "document_id" uuid,
  "content" text NOT NULL,
  "type" character varying(50) DEFAULT 'text_chunk'::character varying,
  "confidence" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "entities" jsonb DEFAULT '[]'::jsonb,
  "chunk_index" integer,
  "start_position" integer,
  "end_position" integer,
  "word_count" integer,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."semantic_units" ENABLE ROW LEVEL SECURITY;

-- Table: signature_audit_logs
CREATE TABLE IF NOT EXISTS public."signature_audit_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_signature_id" uuid,
  "signature_field_id" uuid,
  "signature_recipient_id" uuid,
  "document_id" uuid,
  "action" character varying(100) NOT NULL,
  "action_type" character varying(50) NOT NULL,
  "performed_by" uuid,
  "performed_by_email" character varying(255),
  "details" jsonb DEFAULT '{}'::jsonb,
  "performed_at" timestamp without time zone DEFAULT now(),
  "ip_address" character varying(45),
  "user_agent" text
,
  PRIMARY KEY (id)
);
ALTER TABLE public."signature_audit_logs" ENABLE ROW LEVEL SECURITY;

-- Table: signature_fields
CREATE TABLE IF NOT EXISTS public."signature_fields" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "field_name" character varying(255) NOT NULL,
  "field_label" character varying(255),
  "page_number" integer DEFAULT 1 NOT NULL,
  "x_position" numeric(10) NOT NULL,
  "y_position" numeric(10) NOT NULL,
  "width" numeric(10) DEFAULT 200.0 NOT NULL,
  "height" numeric(10) DEFAULT 50.0 NOT NULL,
  "field_type" character varying(50) DEFAULT 'signature'::character varying NOT NULL,
  "is_required" boolean DEFAULT true,
  "is_readonly" boolean DEFAULT false,
  "assigned_to_user_id" uuid,
  "assigned_to_email" character varying(255),
  "status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
  "signature_data" jsonb,
  "approval_request_id" uuid,
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "signed_at" timestamp without time zone,
  "signed_by" uuid
,
  PRIMARY KEY (id)
);
ALTER TABLE public."signature_fields" ENABLE ROW LEVEL SECURITY;

-- Table: signature_recipients
CREATE TABLE IF NOT EXISTS public."signature_recipients" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_signature_id" uuid NOT NULL,
  "user_id" uuid,
  "email" character varying(255) NOT NULL,
  "name" character varying(255),
  "role" character varying(100),
  "signing_order" integer DEFAULT 0,
  "status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
  "invitation_token" character varying(255),
  "invitation_sent_at" timestamp without time zone,
  "invitation_expires_at" timestamp without time zone,
  "signed_at" timestamp without time zone,
  "ip_address" character varying(45),
  "user_agent" text,
  "signature_method" character varying(50),
  "signature_data" jsonb,
  "comments" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  UNIQUE (invitation_token),
  PRIMARY KEY (id)
);
ALTER TABLE public."signature_recipients" ENABLE ROW LEVEL SECURITY;

-- Table: skills
CREATE TABLE IF NOT EXISTS public."skills" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text,
  "category" character varying(100),
  "proficiency_levels" text[] DEFAULT ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text, 'expert'::text],
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  UNIQUE (name),
  PRIMARY KEY (id)
);
ALTER TABLE public."skills" ENABLE ROW LEVEL SECURITY;

-- Table: sla_violations
CREATE TABLE IF NOT EXISTS public."sla_violations" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "template_id" uuid NOT NULL,
  "violation_type" character varying(50) DEFAULT 'quality_below_threshold'::character varying NOT NULL,
  "current_quality" integer NOT NULL,
  "threshold" integer NOT NULL,
  "violation_count" integer DEFAULT 1,
  "detected_at" timestamp with time zone DEFAULT now(),
  "resolved_at" timestamp with time zone,
  "resolution_notes" text,
  "created_at" timestamp with time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."sla_violations" ENABLE ROW LEVEL SECURITY;

-- Table: source_authority
CREATE TABLE IF NOT EXISTS public."source_authority" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "source" character varying(100) NOT NULL,
  "source_id" character varying(255) NOT NULL,
  "authority_score" numeric(3) DEFAULT 0.5,
  "authority_type" character varying(50) DEFAULT 'user_generated'::character varying,
  "verification_status" character varying(20) DEFAULT 'unverified'::character varying,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (source, source_id)
);
ALTER TABLE public."source_authority" ENABLE ROW LEVEL SECURITY;

-- Table: src_schema_migrations
CREATE TABLE IF NOT EXISTS public."src_schema_migrations" (
  "id" integer DEFAULT nextval('src_schema_migrations_id_seq'::regclass) NOT NULL,
  "migration_number" integer NOT NULL,
  "migration_name" character varying(255) NOT NULL,
  "executed_at" timestamp with time zone DEFAULT now()
,
  UNIQUE (migration_number, migration_name),
  PRIMARY KEY (id)
);
ALTER TABLE public."src_schema_migrations" ENABLE ROW LEVEL SECURITY;

-- Table: stage_executions
CREATE TABLE IF NOT EXISTS public."stage_executions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL,
  "stage_id" character varying(100) NOT NULL,
  "stage_type" character varying(100) NOT NULL,
  "status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
  "execution_time" bigint,
  "quality_score" numeric(5),
  "input_data" jsonb,
  "output_data" jsonb,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "error_message" text,
  "error_details" jsonb,
  "retry_count" integer DEFAULT 0
,
  PRIMARY KEY (id)
);
ALTER TABLE public."stage_executions" ENABLE ROW LEVEL SECURITY;

-- Table: stage_jobs
CREATE TABLE IF NOT EXISTS public."stage_jobs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_id" character varying(255) NOT NULL,
  "stage_id" character varying(255) NOT NULL,
  "stage_type" character varying(50) NOT NULL,
  "status" character varying(20) NOT NULL,
  "progress" integer DEFAULT 0,
  "input_data" jsonb,
  "output_data" jsonb,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "failed_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "error" jsonb,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (job_id),
  PRIMARY KEY (id)
);
ALTER TABLE public."stage_jobs" ENABLE ROW LEVEL SECURITY;

-- Table: stage_metrics
CREATE TABLE IF NOT EXISTS public."stage_metrics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "stage_id" character varying(255) NOT NULL,
  "stage_type" character varying(50) NOT NULL,
  "execution_time" integer DEFAULT 0,
  "quality_score" numeric(3) DEFAULT 0.0,
  "success" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."stage_metrics" ENABLE ROW LEVEL SECURITY;

-- Table: stakeholder_competencies
CREATE TABLE IF NOT EXISTS public."stakeholder_competencies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "stakeholder_id" uuid NOT NULL,
  "competency_id" uuid NOT NULL,
  "proficiency_level" character varying(50) DEFAULT 'intermediate'::character varying,
  "verified" boolean DEFAULT false,
  "verified_by" uuid,
  "verified_at" timestamp without time zone,
  "notes" text,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (stakeholder_id, competency_id)
);
ALTER TABLE public."stakeholder_competencies" ENABLE ROW LEVEL SECURITY;

-- Table: stakeholder_engagements
CREATE TABLE IF NOT EXISTS public."stakeholder_engagements" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "stakeholder_name" character varying(255),
  "engagement_type" character varying(100),
  "engagement_date" timestamp with time zone,
  "objective" text,
  "outcome" text,
  "feedback" text,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."stakeholder_engagements" ENABLE ROW LEVEL SECURITY;

-- Table: stakeholder_issues
CREATE TABLE IF NOT EXISTS public."stakeholder_issues" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "issue_id" text,
  "stakeholder_id" uuid,
  "stakeholder_name" text,
  "issue_title" text,
  "issue_description" text NOT NULL,
  "issue_category" text,
  "priority" text,
  "reported_date" date,
  "reported_by" text,
  "resolution_status" text DEFAULT 'open'::text NOT NULL,
  "resolution_notes" text,
  "resolved_date" date,
  "resolved_by" text,
  "time_to_resolve_days" integer,
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (id),
  UNIQUE (project_id, issue_id)
);
ALTER TABLE public."stakeholder_issues" ENABLE ROW LEVEL SECURITY;

-- Table: stakeholder_role_assignments
CREATE TABLE IF NOT EXISTS public."stakeholder_role_assignments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "stakeholder_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "assignment_type" character varying(50) DEFAULT 'primary'::character varying,
  "start_date" date,
  "end_date" date,
  "allocation_percentage" numeric(5) DEFAULT 100,
  "status" character varying(50) DEFAULT 'active'::character varying,
  "assigned_by" uuid,
  "assigned_at" timestamp without time zone DEFAULT now(),
  "notes" text
,
  PRIMARY KEY (id),
  UNIQUE (stakeholder_id, role_id, project_id)
);
ALTER TABLE public."stakeholder_role_assignments" ENABLE ROW LEVEL SECURITY;

-- Table: stakeholder_skills
CREATE TABLE IF NOT EXISTS public."stakeholder_skills" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "stakeholder_id" uuid NOT NULL,
  "skill_id" uuid NOT NULL,
  "proficiency_level" character varying(50) DEFAULT 'intermediate'::character varying,
  "years_of_experience" integer,
  "verified" boolean DEFAULT false,
  "verified_by" uuid,
  "verified_at" timestamp without time zone,
  "notes" text,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (stakeholder_id, skill_id)
);
ALTER TABLE public."stakeholder_skills" ENABLE ROW LEVEL SECURITY;

-- Table: stakeholders
CREATE TABLE IF NOT EXISTS public."stakeholders" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" character varying(255),
  "role" character varying(100) NOT NULL,
  "department" character varying(100),
  "email" character varying(255),
  "phone" character varying(50),
  "interest_level" character varying(20) DEFAULT 'medium'::character varying,
  "influence_level" character varying(20) DEFAULT 'medium'::character varying,
  "engagement_approach" character varying(20) DEFAULT 'keep_informed'::character varying,
  "communication_frequency" character varying(20) DEFAULT 'weekly'::character varying,
  "stakeholder_type" character varying(20) DEFAULT 'internal'::character varying,
  "stakeholder_category" character varying(20) DEFAULT 'primary'::character varying,
  "expectations" text,
  "potential_impact" text,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "concerns" text,
  "is_team_member" boolean DEFAULT false,
  "source_document_id" uuid,
  "user_id" uuid,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying,
  "idempotency_key" character varying(64)
,
  PRIMARY KEY (id),
  UNIQUE (project_id, name)
);
ALTER TABLE public."stakeholders" ENABLE ROW LEVEL SECURITY;

-- Table: steering_committees
CREATE TABLE IF NOT EXISTS public."steering_committees" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" character varying(255) NOT NULL,
  "mandate" text,
  "members" text[],
  "meeting_cadence" character varying(100),
  "last_meeting_date" timestamp with time zone,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."steering_committees" ENABLE ROW LEVEL SECURITY;

-- Table: success_criteria
CREATE TABLE IF NOT EXISTS public."success_criteria" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text NOT NULL,
  "type" character varying(20) DEFAULT 'quantitative'::character varying,
  "measurement_method" text,
  "target_value" numeric,
  "current_value" numeric,
  "status" character varying(20) DEFAULT 'not_met'::character varying,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamp with time zone,
  "title" character varying(500),
  "created_by" uuid,
  "metric" text,
  "source_document_id" uuid,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying,
  "idempotency_key" character varying(64)
,
  UNIQUE (idempotency_key),
  PRIMARY KEY (id),
  UNIQUE (project_id, name)
);
ALTER TABLE public."success_criteria" ENABLE ROW LEVEL SECURITY;

-- Table: system_metrics
CREATE TABLE IF NOT EXISTS public."system_metrics" (
  "id" integer DEFAULT nextval('system_metrics_id_seq'::regclass) NOT NULL,
  "cpu_usage_percent" double precision NOT NULL,
  "memory_usage_percent" double precision NOT NULL,
  "disk_usage_percent" double precision NOT NULL,
  "network_usage_percent" double precision NOT NULL,
  "recorded_at" timestamp with time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."system_metrics" ENABLE ROW LEVEL SECURITY;

-- Table: system_settings
CREATE TABLE IF NOT EXISTS public."system_settings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "setting_key" character varying(255) NOT NULL,
  "setting_value" text,
  "is_encrypted" boolean DEFAULT false,
  "description" text,
  "updated_by" character varying(255),
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (setting_key)
);
ALTER TABLE public."system_settings" ENABLE ROW LEVEL SECURITY;

-- Table: task_assignments
CREATE TABLE IF NOT EXISTS public."task_assignments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL,
  "resource_assignment_id" uuid,
  "user_id" uuid NOT NULL,
  "user_name" character varying(255),
  "role_id" uuid,
  "role_name" character varying(100),
  "planned_hours" numeric(10) NOT NULL,
  "hourly_rate" numeric(10) NOT NULL,
  "planned_cost" numeric(15),
  "scheduled_start_date" date,
  "scheduled_end_date" date,
  "allocation_percentage" numeric(5) DEFAULT 100,
  "actual_hours" numeric(10) DEFAULT 0,
  "actual_cost" numeric(15) DEFAULT 0,
  "percent_complete" numeric(5) DEFAULT 0,
  "status" character varying(50) DEFAULT 'scheduled'::character varying,
  "hours_variance" numeric(10),
  "cost_variance" numeric(15),
  "efficiency_percent" numeric(5),
  "assigned_by" uuid,
  "assigned_at" timestamp without time zone DEFAULT now(),
  "started_at" timestamp without time zone,
  "completed_at" timestamp without time zone
,
  PRIMARY KEY (id),
  UNIQUE (task_id, user_id)
);
ALTER TABLE public."task_assignments" ENABLE ROW LEVEL SECURITY;

-- Table: task_dependencies
CREATE TABLE IF NOT EXISTS public."task_dependencies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL,
  "depends_on_task_id" uuid NOT NULL,
  "dependency_type" character varying(50) DEFAULT 'finish-to-start'::character varying,
  "lag_days" integer DEFAULT 0,
  "created_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (task_id, depends_on_task_id)
);
ALTER TABLE public."task_dependencies" ENABLE ROW LEVEL SECURITY;

-- Table: task_roles
CREATE TABLE IF NOT EXISTS public."task_roles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "role_type" character varying(50) DEFAULT 'owner'::character varying,
  "is_primary" boolean DEFAULT false,
  "required_count" integer DEFAULT 1,
  "assigned_count" integer DEFAULT 0,
  "created_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (task_id, role_id, role_type)
);
ALTER TABLE public."task_roles" ENABLE ROW LEVEL SECURITY;

-- Table: team_agreement_adherence_log
CREATE TABLE IF NOT EXISTS public."team_agreement_adherence_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "agreement_id" uuid NOT NULL,
  "date_recorded" timestamp without time zone DEFAULT now() NOT NULL,
  "adherence_score" numeric(3),
  "notes" text,
  "recorded_by" uuid,
  "created_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."team_agreement_adherence_log" ENABLE ROW LEVEL SECURITY;

-- Table: team_agreements
CREATE TABLE IF NOT EXISTS public."team_agreements" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "title" character varying(200) NOT NULL,
  "description" text NOT NULL,
  "category" text NOT NULL,
  "effective_date" timestamp without time zone NOT NULL,
  "review_frequency" text,
  "next_review_date" timestamp without time zone,
  "status" text DEFAULT 'active'::text NOT NULL,
  "adherence_score" numeric(4),
  "violations_count" integer DEFAULT 0,
  "last_violation_date" timestamp without time zone,
  "source_document_id" uuid,
  "notes" text,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "agreed_by" uuid[],
  "facilitated_by" uuid
,
  PRIMARY KEY (id),
  UNIQUE (project_id, title)
);
ALTER TABLE public."team_agreements" ENABLE ROW LEVEL SECURITY;

-- Table: team_availability
CREATE TABLE IF NOT EXISTS public."team_availability" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "person_name" character varying(255) NOT NULL,
  "role" character varying(255),
  "availability_percent" integer,
  "start_date" timestamp with time zone,
  "end_date" timestamp with time zone,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."team_availability" ENABLE ROW LEVEL SECURITY;

-- Table: team_members
CREATE TABLE IF NOT EXISTS public."team_members" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "project_id" uuid,
  "user_id" uuid,
  "role" character varying(100),
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."team_members" ENABLE ROW LEVEL SECURITY;

-- Table: technologies
CREATE TABLE IF NOT EXISTS public."technologies" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" character varying(255) NOT NULL,
  "category" character varying(100),
  "description" text,
  "version" character varying(100),
  "purpose" text,
  "license" character varying(100),
  "vendor" character varying(255),
  "deployment_environment" character varying(100),
  "created_by" uuid,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "source_document_id" uuid
,
  PRIMARY KEY (id),
  UNIQUE (project_id, name)
);
ALTER TABLE public."technologies" ENABLE ROW LEVEL SECURITY;

-- Table: template_access_controls
CREATE TABLE IF NOT EXISTS public."template_access_controls" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "template_id" uuid,
  "role" character varying(50),
  "permission" character varying(50),
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."template_access_controls" ENABLE ROW LEVEL SECURITY;

-- Table: template_approval_history
CREATE TABLE IF NOT EXISTS public."template_approval_history" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "template_id" uuid,
  "approver_id" uuid,
  "status" character varying(50),
  "comments" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."template_approval_history" ENABLE ROW LEVEL SECURITY;

-- Table: template_collaboration
CREATE TABLE IF NOT EXISTS public."template_collaboration" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "template_id" uuid,
  "collaborators" jsonb,
  "history" jsonb,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."template_collaboration" ENABLE ROW LEVEL SECURITY;

-- Table: template_comparison_metrics
CREATE TABLE IF NOT EXISTS public."template_comparison_metrics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "template_id_a" uuid,
  "template_id_b" uuid,
  "comparison_type" character varying(50) NOT NULL,
  "metric_name" character varying(100) NOT NULL,
  "value_a" numeric(15),
  "value_b" numeric(15),
  "difference" numeric(15),
  "percent_difference" numeric(7),
  "winner" character varying(1),
  "sample_size_a" integer,
  "sample_size_b" integer,
  "confidence_level" numeric(5),
  "is_significant" boolean DEFAULT false,
  "comparison_period_start" date,
  "comparison_period_end" date,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (template_id_a, template_id_b, metric_name, comparison_period_start)
);
ALTER TABLE public."template_comparison_metrics" ENABLE ROW LEVEL SECURITY;

-- Table: template_customizations
CREATE TABLE IF NOT EXISTS public."template_customizations" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "template_id" uuid,
  "project_id" uuid,
  "customization_data" jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."template_customizations" ENABLE ROW LEVEL SECURITY;

-- Table: template_dependencies
CREATE TABLE IF NOT EXISTS public."template_dependencies" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "template_id" uuid,
  "dependency_id" uuid,
  "dependency_type" character varying(50),
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."template_dependencies" ENABLE ROW LEVEL SECURITY;

-- Table: template_entity_profile
CREATE TABLE IF NOT EXISTS public."template_entity_profile" (
  "template_id" uuid NOT NULL,
  "total_documents" integer DEFAULT 0 NOT NULL,
  "total_entities" integer DEFAULT 0 NOT NULL,
  "avg_entity_counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "knowledge_domain_coverage" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "performance_domain_coverage" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "primary_knowledge_domain" text,
  "secondary_knowledge_domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "primary_performance_domain" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
,
  PRIMARY KEY (template_id)
);
ALTER TABLE public."template_entity_profile" ENABLE ROW LEVEL SECURITY;

-- Table: template_feedback
CREATE TABLE IF NOT EXISTS public."template_feedback" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "template_id" uuid,
  "user_id" uuid,
  "rating" integer,
  "comment" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."template_feedback" ENABLE ROW LEVEL SECURITY;

-- Table: template_improvement_suggestions
CREATE TABLE IF NOT EXISTS public."template_improvement_suggestions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid NOT NULL,
  "analysis_period_start" timestamp without time zone NOT NULL,
  "analysis_period_end" timestamp without time zone NOT NULL,
  "documents_analyzed" integer NOT NULL,
  "current_avg_quality" integer,
  "current_completeness" integer,
  "current_consistency" integer,
  "current_professional_quality" integer,
  "current_standards_compliance" integer,
  "common_issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "issue_frequency" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "suggested_improvements" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "improvement_rationale" text,
  "expected_quality_gain" integer,
  "priority" character varying(10) DEFAULT 'medium'::character varying,
  "status" character varying(20) DEFAULT 'pending_review'::character varying,
  "analyzer_ai_provider" character varying(50),
  "analyzer_ai_model" character varying(100),
  "analysis_tokens" integer,
  "analysis_cost" numeric(10),
  "created_at" timestamp without time zone DEFAULT now(),
  "reviewed_by" uuid,
  "reviewed_at" timestamp without time zone,
  "implemented_by" uuid,
  "implemented_at" timestamp without time zone,
  "rejection_reason" text,
  "updated_at" timestamp without time zone DEFAULT now(),
  "source_document_id" uuid,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying
,
  PRIMARY KEY (id)
);
ALTER TABLE public."template_improvement_suggestions" ENABLE ROW LEVEL SECURITY;

-- Table: template_improvements
CREATE TABLE IF NOT EXISTS public."template_improvements" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "template_id" uuid,
  "improvement_suggestion" text,
  "status" character varying(50),
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."template_improvements" ENABLE ROW LEVEL SECURITY;

-- Table: template_maintenance_log
CREATE TABLE IF NOT EXISTS public."template_maintenance_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid,
  "action_type" character varying(50) NOT NULL,
  "action_status" character varying(20) NOT NULL,
  "priority" character varying(20) NOT NULL,
  "reason" text,
  "description" text,
  "findings" jsonb,
  "changes_made" jsonb,
  "assigned_to" uuid,
  "performed_by" uuid,
  "scheduled_for" timestamp with time zone,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "metrics_before" jsonb,
  "metrics_after" jsonb,
  "improvement_percentage" numeric(7),
  "version_created" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."template_maintenance_log" ENABLE ROW LEVEL SECURITY;

-- Table: template_metadata
CREATE TABLE IF NOT EXISTS public."template_metadata" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "template_id" uuid,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."template_metadata" ENABLE ROW LEVEL SECURITY;

-- Table: template_performance
CREATE TABLE IF NOT EXISTS public."template_performance" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid,
  "prompt_template_id" uuid,
  "generation_id" uuid,
  "model_used" character varying(100),
  "quality_score" numeric(3),
  "generation_time" integer,
  "cost" numeric(10),
  "user_feedback" integer,
  "created_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."template_performance" ENABLE ROW LEVEL SECURITY;

-- Table: template_quality_metrics
CREATE TABLE IF NOT EXISTS public."template_quality_metrics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid,
  "total_uses" integer DEFAULT 0,
  "successful_uses" integer DEFAULT 0,
  "failed_uses" integer DEFAULT 0,
  "success_rate" numeric(5),
  "avg_document_word_count" integer,
  "avg_document_character_count" integer,
  "avg_generation_time_ms" integer,
  "unique_users" integer DEFAULT 0,
  "avg_edits_per_document" numeric(5),
  "avg_time_to_first_edit_minutes" integer,
  "avg_rating" numeric(3),
  "total_ratings" integer DEFAULT 0,
  "total_feedback_comments" integer DEFAULT 0,
  "avg_input_tokens" integer,
  "avg_output_tokens" integer,
  "avg_total_tokens" integer,
  "avg_ai_cost" numeric(10),
  "total_ai_cost" numeric(10),
  "error_rate" numeric(5),
  "avg_completion_rate" numeric(5),
  "reuse_rate" numeric(5),
  "last_used_at" timestamp with time zone,
  "days_since_last_use" integer,
  "days_since_last_update" integer,
  "maintenance_priority" character varying(20),
  "period_type" character varying(20) DEFAULT 'all_time'::character varying,
  "period_start" date,
  "period_end" date,
  "calculated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (template_id, period_type, period_start)
);
ALTER TABLE public."template_quality_metrics" ENABLE ROW LEVEL SECURITY;

-- Table: template_status_history
CREATE TABLE IF NOT EXISTS public."template_status_history" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid NOT NULL,
  "old_status" character varying(20) NOT NULL,
  "new_status" character varying(20) NOT NULL,
  "changed_by" uuid,
  "reason" text,
  "created_at" timestamp without time zone DEFAULT now()
,
  PRIMARY KEY (id)
);
ALTER TABLE public."template_status_history" ENABLE ROW LEVEL SECURITY;

-- Table: template_structure
CREATE TABLE IF NOT EXISTS public."template_structure" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "template_id" uuid,
  "sections" jsonb,
  "hierarchy" jsonb,
  "complexity_score" numeric,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."template_structure" ENABLE ROW LEVEL SECURITY;

-- Table: template_usage
CREATE TABLE IF NOT EXISTS public."template_usage" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid,
  "document_id" uuid,
  "user_id" uuid,
  "project_id" uuid,
  "used_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "generation_time_ms" integer,
  "word_count" integer,
  "quality_score" integer,
  "ai_provider" character varying(100),
  "ai_model" character varying(100),
  "token_count" integer,
  "success" boolean DEFAULT true,
  "error_message" text
,
  PRIMARY KEY (id)
);
ALTER TABLE public."template_usage" ENABLE ROW LEVEL SECURITY;

-- Table: template_validation_rules
CREATE TABLE IF NOT EXISTS public."template_validation_rules" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "template_id" uuid,
  "rule_name" character varying(100),
  "rule_definition" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."template_validation_rules" ENABLE ROW LEVEL SECURITY;

-- Table: template_variables
CREATE TABLE IF NOT EXISTS public."template_variables" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "template_id" uuid,
  "name" character varying(100),
  "description" text,
  "type" character varying(50),
  "required" boolean DEFAULT false,
  "default_value" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."template_variables" ENABLE ROW LEVEL SECURITY;

-- Table: template_version_history
CREATE TABLE IF NOT EXISTS public."template_version_history" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "template_id" uuid,
  "version_number" character varying(20),
  "changes" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."template_version_history" ENABLE ROW LEVEL SECURITY;

-- Table: template_versions
CREATE TABLE IF NOT EXISTS public."template_versions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid,
  "version_number" character varying(50) NOT NULL,
  "version_tag" character varying(100),
  "content" jsonb NOT NULL,
  "variables" jsonb,
  "system_prompt" text,
  "template_paragraphs" jsonb,
  "context_injection_config" jsonb,
  "name" character varying(255) NOT NULL,
  "description" text,
  "framework" character varying(100),
  "category" character varying(100),
  "change_type" character varying(50) NOT NULL,
  "change_summary" text,
  "change_details" jsonb,
  "breaking_changes" boolean DEFAULT false,
  "content_length" integer,
  "variable_count" integer,
  "paragraph_count" integer,
  "complexity_score" numeric(5),
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "published_at" timestamp with time zone,
  "deprecated_at" timestamp with time zone,
  "avg_quality_before" integer,
  "avg_quality_after" integer,
  "improvement_percentage" numeric(5),
  "improvement_suggestion_id" uuid
,
  PRIMARY KEY (id),
  UNIQUE (template_id, version_number)
);
ALTER TABLE public."template_versions" ENABLE ROW LEVEL SECURITY;

-- Table: templates
CREATE TABLE IF NOT EXISTS public."templates" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text,
  "framework" character varying(50) NOT NULL,
  "category" character varying(100),
  "content" jsonb NOT NULL,
  "variables" jsonb DEFAULT '[]'::jsonb,
  "is_public" boolean DEFAULT false,
  "created_by" uuid,
  "usage_count" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "system_prompt" text,
  "context_injection_config" jsonb,
  "prompt_build_up" jsonb,
  "template_paragraphs" jsonb,
  "development_status" character varying(20) DEFAULT 'draft'::character varying,
  "validation_count" integer DEFAULT 0,
  "success_count" integer DEFAULT 0,
  "last_validated_at" timestamp without time zone,
  "last_validated_by" uuid,
  "prompt_version" integer DEFAULT 1,
  "quality_threshold" numeric(3) DEFAULT 0.70,
  "compliance_checked_at" timestamp without time zone,
  "compliance_checked_by" uuid,
  "compliance_notes" text,
  "framework_compliance_score" numeric(3),
  "custom_compliance_rules" jsonb,
  "archived_at" timestamp without time zone,
  "archived_by" uuid,
  "archive_reason" text,
  "last_used_at" timestamp without time zone,
  "template_scope" character varying(20) DEFAULT 'user'::character varying NOT NULL,
  "company_id" uuid,
  "is_read_only" boolean DEFAULT false,
  "conflict_resolution_strategy" character varying(50) DEFAULT 'prompt_user'::character varying,
  "governance_level" character varying(50) DEFAULT 'standard'::character varying,
  "gkg_context_strategy" jsonb
,
  PRIMARY KEY (id)
);
ALTER TABLE public."templates" ENABLE ROW LEVEL SECURITY;

-- Table: time_entries
CREATE TABLE IF NOT EXISTS public."time_entries" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "assignment_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "entry_date" date NOT NULL,
  "hours_worked" numeric(8) NOT NULL,
  "overtime_hours" numeric(8) DEFAULT 0,
  "hourly_rate" numeric(10) NOT NULL,
  "overtime_rate" numeric(10),
  "regular_cost" numeric(15),
  "overtime_cost" numeric(15),
  "total_cost" numeric(15),
  "task_id" uuid,
  "task_name" character varying(255),
  "work_description" text,
  "status" character varying(50) DEFAULT 'draft'::character varying,
  "submitted_at" timestamp without time zone,
  "approved_by" uuid,
  "approved_at" timestamp without time zone,
  "rejection_reason" text,
  "invoice_number" character varying(100),
  "invoice_date" date,
  "payment_status" character varying(50),
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "task_assignment_id" uuid,
  "is_billable" boolean DEFAULT true,
  "time_entry_category" character varying(50) DEFAULT 'project-work'::character varying
,
  UNIQUE (assignment_id, user_id, entry_date),
  PRIMARY KEY (id)
);
ALTER TABLE public."time_entries" ENABLE ROW LEVEL SECURITY;

-- Table: upload_batches
CREATE TABLE IF NOT EXISTS public."upload_batches" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "project_id" uuid NOT NULL,
  "uploaded_by" uuid NOT NULL,
  "total_files" integer DEFAULT 0 NOT NULL,
  "processed_files" integer DEFAULT 0 NOT NULL,
  "failed_files" integer DEFAULT 0 NOT NULL,
  "status" character varying(20) DEFAULT 'processing'::character varying NOT NULL,
  "batch_metadata" jsonb DEFAULT '{}'::jsonb,
  "error_message" text,
  "created_at" timestamp without time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp without time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp without time zone,
  "successful_files" integer DEFAULT 0 NOT NULL,
  "company_id" uuid
,
  PRIMARY KEY (id)
);
ALTER TABLE public."upload_batches" ENABLE ROW LEVEL SECURITY;

-- Table: user_accessibility_preferences
CREATE TABLE IF NOT EXISTS public."user_accessibility_preferences" (
  "user_id" uuid NOT NULL,
  "font_size" character varying(20),
  "contrast" character varying(20),
  "reduce_motion" boolean,
  "metadata" jsonb
,
  PRIMARY KEY (user_id)
);
ALTER TABLE public."user_accessibility_preferences" ENABLE ROW LEVEL SECURITY;

-- Table: user_activity_logs
CREATE TABLE IF NOT EXISTS public."user_activity_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "session_id" character varying(255),
  "activity_type" character varying(100) NOT NULL,
  "activity_category" character varying(50) NOT NULL,
  "entity_type" character varying(50),
  "entity_id" uuid,
  "description" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."user_activity_logs" ENABLE ROW LEVEL SECURITY;

-- Table: user_analysis
CREATE TABLE IF NOT EXISTS public."user_analysis" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "total_documents" integer DEFAULT 0,
  "average_quality_score" numeric(3) DEFAULT 0.0,
  "writing_patterns" jsonb DEFAULT '[]'::jsonb,
  "improvement_areas" text[] DEFAULT '{}'::text[],
  "strengths" text[] DEFAULT '{}'::text[],
  "recommendations" text[] DEFAULT '{}'::text[],
  "quality_trends" jsonb DEFAULT '[]'::jsonb,
  "analyzed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."user_analysis" ENABLE ROW LEVEL SECURITY;

-- Table: user_collaboration_preferences
CREATE TABLE IF NOT EXISTS public."user_collaboration_preferences" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "communication_style" character varying(20) DEFAULT 'collaborative'::character varying,
  "feedback_preference" character varying(20) DEFAULT 'constructive'::character varying,
  "meeting_preference" character varying(20) DEFAULT 'structured'::character varying,
  "collaboration_tools" text[] DEFAULT '{}'::text[],
  "availability" jsonb DEFAULT '{"holidays": [], "timezone": "UTC", "busy_periods": [], "working_days": ["monday", "tuesday", "wednesday", "thursday", "friday"], "working_hours": {"end_time": "17:00", "timezone": "UTC", "break_end": "13:00", "start_time": "09:00", "break_start": "12:00", "flexible_hours": false}, "vacation_dates": []}'::jsonb,
  "working_hours" jsonb DEFAULT '{"end_time": "17:00", "timezone": "UTC", "break_end": "13:00", "start_time": "09:00", "break_start": "12:00", "flexible_hours": false}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (user_id)
);
ALTER TABLE public."user_collaboration_preferences" ENABLE ROW LEVEL SECURITY;

-- Table: user_devices
CREATE TABLE IF NOT EXISTS public."user_devices" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "user_id" uuid,
  "device_type" character varying(50),
  "os" character varying(50),
  "browser" character varying(50),
  "last_seen" timestamp with time zone,
  "metadata" jsonb
,
  PRIMARY KEY (id)
);
ALTER TABLE public."user_devices" ENABLE ROW LEVEL SECURITY;

-- Table: user_domain_knowledge
CREATE TABLE IF NOT EXISTS public."user_domain_knowledge" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "industries" text[] DEFAULT '{}'::text[],
  "technologies" text[] DEFAULT '{}'::text[],
  "frameworks" text[] DEFAULT '{}'::text[],
  "tools" text[] DEFAULT '{}'::text[],
  "standards" text[] DEFAULT '{}'::text[],
  "regulations" text[] DEFAULT '{}'::text[],
  "best_practices" text[] DEFAULT '{}'::text[],
  "common_patterns" text[] DEFAULT '{}'::text[],
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (user_id)
);
ALTER TABLE public."user_domain_knowledge" ENABLE ROW LEVEL SECURITY;

-- Table: user_expertise
CREATE TABLE IF NOT EXISTS public."user_expertise" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "level" character varying(20) DEFAULT 'intermediate'::character varying,
  "domains" text[] DEFAULT '{}'::text[],
  "certifications" text[] DEFAULT '{}'::text[],
  "experience_years" integer DEFAULT 0,
  "methodologies" text[] DEFAULT '{}'::text[],
  "tools" text[] DEFAULT '{}'::text[],
  "languages" text[] DEFAULT '{}'::text[],
  "specializations" text[] DEFAULT '{}'::text[],
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (user_id)
);
ALTER TABLE public."user_expertise" ENABLE ROW LEVEL SECURITY;

-- Table: user_feedback
CREATE TABLE IF NOT EXISTS public."user_feedback" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "user_id" uuid,
  "entity_id" uuid,
  "entity_type" character varying(50),
  "rating" integer,
  "comment" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."user_feedback" ENABLE ROW LEVEL SECURITY;

-- Table: user_known_gaps
CREATE TABLE IF NOT EXISTS public."user_known_gaps" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "user_id" uuid,
  "gap_description" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."user_known_gaps" ENABLE ROW LEVEL SECURITY;

-- Table: user_locale_preferences
CREATE TABLE IF NOT EXISTS public."user_locale_preferences" (
  "user_id" uuid NOT NULL,
  "locale" character varying(20),
  "timezone" character varying(50),
  "date_format" character varying(50),
  "number_format" character varying(50),
  "metadata" jsonb
,
  PRIMARY KEY (user_id)
);
ALTER TABLE public."user_locale_preferences" ENABLE ROW LEVEL SECURITY;

-- Table: user_model_preferences
CREATE TABLE IF NOT EXISTS public."user_model_preferences" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "task_type" character varying(50) NOT NULL,
  "preferred_model_id" uuid,
  "preferred_chain_id" uuid,
  "custom_settings" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
,
  PRIMARY KEY (id),
  UNIQUE (user_id, task_type)
);
ALTER TABLE public."user_model_preferences" ENABLE ROW LEVEL SECURITY;

-- Table: user_notification_preferences
CREATE TABLE IF NOT EXISTS public."user_notification_preferences" (
  "user_id" uuid NOT NULL,
  "channels" text[],
  "frequency" character varying(50),
  "quiet_hours" jsonb,
  "metadata" jsonb
,
  PRIMARY KEY (user_id)
);
ALTER TABLE public."user_notification_preferences" ENABLE ROW LEVEL SECURITY;

-- Table: user_preferences
CREATE TABLE IF NOT EXISTS public."user_preferences" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "language" character varying(10) DEFAULT 'en'::character varying,
  "timezone" character varying(50) DEFAULT 'UTC'::character varying,
  "date_format" character varying(20) DEFAULT 'YYYY-MM-DD'::character varying,
  "number_format" character varying(20) DEFAULT 'en-US'::character varying,
  "theme" character varying(20) DEFAULT 'light'::character varying,
  "notifications" jsonb DEFAULT '{"sms": false, "push": false, "email": true, "in_app": true, "frequency": "immediate", "categories": ["system", "documents", "collaboration"]}'::jsonb,
  "accessibility" jsonb DEFAULT '{"font_size": "medium", "color_scheme": "default", "screen_reader": false, "reduced_motion": false, "keyboard_navigation": true}'::jsonb,
  "privacy" jsonb DEFAULT '{"data_sharing": true, "analytics_opt_in": true, "marketing_opt_in": false, "profile_visibility": "team", "third_party_sharing": false}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (user_id)
);
ALTER TABLE public."user_preferences" ENABLE ROW LEVEL SECURITY;

-- Table: user_projects
CREATE TABLE IF NOT EXISTS public."user_projects" (
  "user_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "role" character varying(100)
,
  PRIMARY KEY (user_id, project_id)
);
ALTER TABLE public."user_projects" ENABLE ROW LEVEL SECURITY;

-- Table: user_search_preferences
CREATE TABLE IF NOT EXISTS public."user_search_preferences" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "preferred_frameworks" text[] DEFAULT '{}'::text[],
  "preferred_categories" text[] DEFAULT '{}'::text[],
  "preferred_authors" text[] DEFAULT '{}'::text[],
  "preferred_content_types" text[] DEFAULT '{}'::text[],
  "search_strategy_preference" character varying(20) DEFAULT 'hybrid'::character varying,
  "relevance_threshold" numeric(3) DEFAULT 0.3,
  "max_results" integer DEFAULT 20,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (user_id)
);
ALTER TABLE public."user_search_preferences" ENABLE ROW LEVEL SECURITY;

-- Table: user_security_settings
CREATE TABLE IF NOT EXISTS public."user_security_settings" (
  "user_id" uuid NOT NULL,
  "mfa_enabled" boolean DEFAULT false,
  "last_password_change" timestamp with time zone,
  "allowed_ip_ranges" text[],
  "metadata" jsonb
,
  PRIMARY KEY (user_id)
);
ALTER TABLE public."user_security_settings" ENABLE ROW LEVEL SECURITY;

-- Table: user_time_preferences
CREATE TABLE IF NOT EXISTS public."user_time_preferences" (
  "user_id" uuid NOT NULL,
  "working_hours" jsonb,
  "meeting_preferences" text[],
  "metadata" jsonb
,
  PRIMARY KEY (user_id)
);
ALTER TABLE public."user_time_preferences" ENABLE ROW LEVEL SECURITY;

-- Table: user_writing_style
CREATE TABLE IF NOT EXISTS public."user_writing_style" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "tone" character varying(20) DEFAULT 'professional'::character varying,
  "formality" character varying(20) DEFAULT 'formal'::character varying,
  "length_preference" character varying(20) DEFAULT 'detailed'::character varying,
  "structure_preference" character varying(20) DEFAULT 'structured'::character varying,
  "terminology_preference" character varying(20) DEFAULT 'standard'::character varying,
  "audience_awareness" character varying(20) DEFAULT 'medium'::character varying,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (user_id)
);
ALTER TABLE public."user_writing_style" ENABLE ROW LEVEL SECURITY;

-- Table: users
CREATE TABLE IF NOT EXISTS public."users" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "email" character varying(255) NOT NULL,
  "password_hash" character varying(255) NOT NULL,
  "name" character varying(255) NOT NULL,
  "role" character varying(50) DEFAULT 'user'::character varying NOT NULL,
  "permissions" jsonb DEFAULT '{}'::jsonb,
  "avatar_url" character varying(500),
  "is_active" boolean DEFAULT true,
  "last_login" timestamp without time zone,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "timezone" character varying(50) DEFAULT 'UTC'::character varying,
  "date_format" character varying(20) DEFAULT 'MM/DD/YYYY'::character varying,
  "company_id" uuid,
  "tenant_id" uuid,
  "metadata" jsonb DEFAULT '{}'::jsonb
,
  UNIQUE (email),
  PRIMARY KEY (id)
);
ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;

-- Table: utilization_records
CREATE TABLE IF NOT EXISTS public."utilization_records" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "record_date" date NOT NULL,
  "resource_id" uuid,
  "resource_name" text,
  "planned_hours" numeric(10),
  "actual_hours" numeric(10),
  "variance_hours" numeric(10),
  "utilization_percentage" numeric(5),
  "billable_hours" numeric(10),
  "non_billable_hours" numeric(10),
  "notes" text,
  "source_document_id" uuid,
  "confidence_score" numeric(3) DEFAULT 0.85,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "period" text,
  "planned_utilization_pct" numeric,
  "actual_utilization_pct" numeric,
  "variance_pct" numeric
,
  PRIMARY KEY (id),
  UNIQUE (project_id, record_date, resource_id)
);
ALTER TABLE public."utilization_records" ENABLE ROW LEVEL SECURITY;

-- Table: variable_analysis_results
CREATE TABLE IF NOT EXISTS public."variable_analysis_results" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "analysis_id" character varying(100) NOT NULL,
  "template_id" character varying(100) NOT NULL,
  "analysis_data" jsonb NOT NULL,
  "complexity_score" numeric(3) NOT NULL,
  "quality_score" numeric(3) NOT NULL,
  "pattern_count" integer DEFAULT 0,
  "dependency_count" integer DEFAULT 0,
  "recommendations" jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (analysis_id),
  PRIMARY KEY (id)
);
ALTER TABLE public."variable_analysis_results" ENABLE ROW LEVEL SECURITY;

-- Table: variable_patterns
CREATE TABLE IF NOT EXISTS public."variable_patterns" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "pattern_id" character varying(100) NOT NULL,
  "pattern_name" character varying(200) NOT NULL,
  "pattern_type" character varying(50) NOT NULL,
  "pattern_expression" text NOT NULL,
  "pattern_confidence" numeric(3) NOT NULL,
  "pattern_frequency" integer NOT NULL,
  "pattern_examples" jsonb NOT NULL,
  "pattern_metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (pattern_id),
  PRIMARY KEY (id)
);
ALTER TABLE public."variable_patterns" ENABLE ROW LEVEL SECURITY;

-- Table: variable_resolution_cache
CREATE TABLE IF NOT EXISTS public."variable_resolution_cache" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cache_key" character varying(500) NOT NULL,
  "resolution_data" jsonb NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  UNIQUE (cache_key),
  PRIMARY KEY (id)
);
ALTER TABLE public."variable_resolution_cache" ENABLE ROW LEVEL SECURITY;

-- Table: variable_resolution_metrics
CREATE TABLE IF NOT EXISTS public."variable_resolution_metrics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "variable_name" character varying(200) NOT NULL,
  "variable_type" character varying(50) NOT NULL,
  "resolution_strategy" character varying(100) NOT NULL,
  "status" character varying(50) NOT NULL,
  "resolution_time" integer NOT NULL,
  "cache_hit" boolean DEFAULT false,
  "quality_score" numeric(3),
  "error_message" text,
  "context_data" jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."variable_resolution_metrics" ENABLE ROW LEVEL SECURITY;

-- Table: variable_resolution_results
CREATE TABLE IF NOT EXISTS public."variable_resolution_results" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "result_id" character varying(100) NOT NULL,
  "request_id" character varying(100) NOT NULL,
  "template_id" character varying(100),
  "resolved_variables" jsonb NOT NULL,
  "unresolved_variables" jsonb NOT NULL,
  "resolution_metrics" jsonb NOT NULL,
  "quality_assessment" jsonb NOT NULL,
  "recommendations" jsonb NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id),
  UNIQUE (result_id)
);
ALTER TABLE public."variable_resolution_results" ENABLE ROW LEVEL SECURITY;

-- Table: wbs_nodes
CREATE TABLE IF NOT EXISTS public."wbs_nodes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "wbs_code" character varying(50) NOT NULL,
  "name" character varying(255) NOT NULL,
  "level" integer,
  "parent_code" character varying(50),
  "description" text,
  "owner" character varying(255),
  "status" character varying(50),
  "estimated_effort" numeric,
  "estimated_cost" numeric,
  "source_document_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "idempotency_key" character varying(64)
,
  PRIMARY KEY (id)
);
ALTER TABLE public."wbs_nodes" ENABLE ROW LEVEL SECURITY;

-- Table: work_items
CREATE TABLE IF NOT EXISTS public."work_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "activity_name" text,
  "activity_id" uuid,
  "assigned_to" text,
  "estimated_hours" numeric(10),
  "actual_hours" numeric(10),
  "progress_percentage" numeric(5),
  "status" text DEFAULT 'todo'::text NOT NULL,
  "blockers" text[] DEFAULT '{}'::text[] NOT NULL,
  "completed_date" date,
  "source_document_id" uuid,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "source_text_start" integer,
  "source_text_end" integer,
  "source_line_start" integer,
  "source_line_end" integer,
  "source_context" text,
  "source_snippet" text,
  "entity_markdown_tag" character varying(10) DEFAULT 'h5'::character varying
,
  PRIMARY KEY (id),
  UNIQUE (project_id, name)
);
ALTER TABLE public."work_items" ENABLE ROW LEVEL SECURITY;

-- Table: worker_heartbeats
CREATE TABLE IF NOT EXISTS public."worker_heartbeats" (
  "worker_id" text NOT NULL,
  "worker_process_id" integer NOT NULL,
  "queue_name" text NOT NULL,
  "cpu_usage_percent" double precision NOT NULL,
  "memory_usage_mb" double precision NOT NULL,
  "last_heartbeat" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
,
  PRIMARY KEY (worker_id)
);
ALTER TABLE public."worker_heartbeats" ENABLE ROW LEVEL SECURITY;

-- Table: workflow_executions
CREATE TABLE IF NOT EXISTS public."workflow_executions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workflow_id" uuid NOT NULL,
  "user_id" uuid,
  "template_id" uuid,
  "project_id" uuid,
  "status" character varying(20) NOT NULL,
  "started_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "completed_at" timestamp without time zone,
  "processing_time_ms" integer,
  "token_usage" integer,
  "compression_stats" jsonb,
  "error_message" text,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."workflow_executions" ENABLE ROW LEVEL SECURITY;

-- Table: workflow_presets
CREATE TABLE IF NOT EXISTS public."workflow_presets" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text,
  "category" character varying(50) NOT NULL,
  "configuration" jsonb NOT NULL,
  "is_public" boolean DEFAULT false,
  "created_by" uuid,
  "usage_count" integer DEFAULT 0,
  "rating" numeric(3) DEFAULT 0,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
);
ALTER TABLE public."workflow_presets" ENABLE ROW LEVEL SECURITY;

-- Foreign Key Constraints
ALTER TABLE public."action_items" ADD CONSTRAINT "action_items_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."action_items" ADD CONSTRAINT "action_items_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."action_items" ADD CONSTRAINT "action_items_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."activities" ADD CONSTRAINT "activities_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."activities" ADD CONSTRAINT "activities_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."activities" ADD CONSTRAINT "activities_deliverable_id_fkey" FOREIGN KEY (deliverable_id) REFERENCES deliverables(id) ON DELETE SET NULL;
ALTER TABLE public."activities" ADD CONSTRAINT "activities_extracted_from_document_id_fkey" FOREIGN KEY (extracted_from_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."activities" ADD CONSTRAINT "activities_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."activities" ADD CONSTRAINT "activities_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."ai_fallback_chain_entries" ADD CONSTRAINT "ai_fallback_chain_entries_chain_id_fkey" FOREIGN KEY (chain_id) REFERENCES ai_fallback_chains(id) ON DELETE CASCADE;
ALTER TABLE public."ai_fallback_chain_entries" ADD CONSTRAINT "ai_fallback_chain_entries_model_id_fkey" FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE CASCADE;
ALTER TABLE public."ai_model_configurations" ADD CONSTRAINT "ai_model_configurations_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE CASCADE;
ALTER TABLE public."ai_models" ADD CONSTRAINT "ai_models_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE CASCADE;
ALTER TABLE public."ai_provider_health_metrics" ADD CONSTRAINT "ai_provider_health_metrics_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE CASCADE;
ALTER TABLE public."ai_provider_test_configs" ADD CONSTRAINT "ai_provider_test_configs_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE CASCADE;
ALTER TABLE public."ai_provider_test_results" ADD CONSTRAINT "ai_provider_test_results_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE CASCADE;
ALTER TABLE public."ai_provider_usage" ADD CONSTRAINT "ai_provider_usage_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."ai_provider_usage" ADD CONSTRAINT "ai_provider_usage_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;
ALTER TABLE public."ai_provider_usage" ADD CONSTRAINT "ai_provider_usage_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE public."ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE public."ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE SET NULL;
ALTER TABLE public."ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."analytics_events" ADD CONSTRAINT "analytics_events_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE public."analytics_events" ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public."api_request_logs" ADD CONSTRAINT "api_request_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."approval_audit_log" ADD CONSTRAINT "approval_audit_log_approval_request_id_fkey" FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE CASCADE;
ALTER TABLE public."approval_audit_log" ADD CONSTRAINT "approval_audit_log_approval_step_id_fkey" FOREIGN KEY (approval_step_id) REFERENCES approval_steps(id) ON DELETE CASCADE;
ALTER TABLE public."approval_audit_log" ADD CONSTRAINT "approval_audit_log_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES users(id);
ALTER TABLE public."approval_escalations" ADD CONSTRAINT "approval_escalations_approval_request_id_fkey" FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE CASCADE;
ALTER TABLE public."approval_escalations" ADD CONSTRAINT "approval_escalations_escalated_by_fkey" FOREIGN KEY (escalated_by) REFERENCES users(id);
ALTER TABLE public."approval_escalations" ADD CONSTRAINT "approval_escalations_escalated_from_user_id_fkey" FOREIGN KEY (escalated_from_user_id) REFERENCES users(id);
ALTER TABLE public."approval_escalations" ADD CONSTRAINT "approval_escalations_escalated_to_user_id_fkey" FOREIGN KEY (escalated_to_user_id) REFERENCES users(id);
ALTER TABLE public."approval_notifications" ADD CONSTRAINT "approval_notifications_approval_request_id_fkey" FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE CASCADE;
ALTER TABLE public."approval_notifications" ADD CONSTRAINT "approval_notifications_approval_step_id_fkey" FOREIGN KEY (approval_step_id) REFERENCES approval_steps(id) ON DELETE CASCADE;
ALTER TABLE public."approval_notifications" ADD CONSTRAINT "approval_notifications_recipient_user_id_fkey" FOREIGN KEY (recipient_user_id) REFERENCES users(id);
ALTER TABLE public."approval_requests" ADD CONSTRAINT "approval_requests_change_request_id_fkey" FOREIGN KEY (change_request_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."approval_requests" ADD CONSTRAINT "approval_requests_decided_by_fkey" FOREIGN KEY (decided_by) REFERENCES users(id);
ALTER TABLE public."approval_requests" ADD CONSTRAINT "approval_requests_drift_record_id_fkey" FOREIGN KEY (drift_record_id) REFERENCES baseline_drift_detection(id) ON DELETE SET NULL;
ALTER TABLE public."approval_requests" ADD CONSTRAINT "approval_requests_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."approval_requests" ADD CONSTRAINT "approval_requests_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES users(id);
ALTER TABLE public."approval_steps" ADD CONSTRAINT "approval_steps_approval_request_id_fkey" FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE CASCADE;
ALTER TABLE public."approval_steps" ADD CONSTRAINT "approval_steps_approver_user_id_fkey" FOREIGN KEY (approver_user_id) REFERENCES users(id);
ALTER TABLE public."approval_steps" ADD CONSTRAINT "approval_steps_delegated_to_fkey" FOREIGN KEY (delegated_to) REFERENCES users(id);
ALTER TABLE public."approval_workflows" ADD CONSTRAINT "approval_workflows_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."approval_workflows" ADD CONSTRAINT "approval_workflows_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."approval_workflows" ADD CONSTRAINT "approval_workflows_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."assessments" ADD CONSTRAINT "assessments_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES upload_batches(id) ON DELETE CASCADE;
ALTER TABLE public."assessments" ADD CONSTRAINT "assessments_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE public."assessments" ADD CONSTRAINT "assessments_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public."baseline_comparisons" ADD CONSTRAINT "baseline_comparisons_baseline_id_fkey" FOREIGN KEY (baseline_id) REFERENCES project_entity_baselines(id) ON DELETE CASCADE;
ALTER TABLE public."baseline_comparisons" ADD CONSTRAINT "baseline_comparisons_compared_by_fkey" FOREIGN KEY (compared_by) REFERENCES users(id);
ALTER TABLE public."baseline_compliance_reviews" ADD CONSTRAINT "baseline_compliance_reviews_baseline_id_fkey" FOREIGN KEY (baseline_id) REFERENCES project_baselines(id) ON DELETE CASCADE;
ALTER TABLE public."baseline_compliance_reviews" ADD CONSTRAINT "baseline_compliance_reviews_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES users(id);
ALTER TABLE public."baseline_components" ADD CONSTRAINT "baseline_components_baseline_id_fkey" FOREIGN KEY (baseline_id) REFERENCES project_baselines(id) ON DELETE CASCADE;
ALTER TABLE public."baseline_components" ADD CONSTRAINT "baseline_components_parent_component_id_fkey" FOREIGN KEY (parent_component_id) REFERENCES baseline_components(id);
ALTER TABLE public."baseline_components" ADD CONSTRAINT "baseline_components_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id);
ALTER TABLE public."baseline_drift_detection" ADD CONSTRAINT "baseline_drift_detection_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES users(id);
ALTER TABLE public."baseline_drift_detection" ADD CONSTRAINT "baseline_drift_detection_baseline_id_fkey" FOREIGN KEY (baseline_id) REFERENCES project_baselines(id) ON DELETE CASCADE;
ALTER TABLE public."baseline_drift_detection" ADD CONSTRAINT "baseline_drift_detection_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."baseline_drift_detection" ADD CONSTRAINT "baseline_drift_detection_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id);
ALTER TABLE public."baseline_versions" ADD CONSTRAINT "baseline_versions_baseline_id_fkey" FOREIGN KEY (baseline_id) REFERENCES project_baselines(id) ON DELETE CASCADE;
ALTER TABLE public."baseline_versions" ADD CONSTRAINT "baseline_versions_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES users(id);
ALTER TABLE public."batch_files" ADD CONSTRAINT "batch_files_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES upload_batches(id) ON DELETE CASCADE;
ALTER TABLE public."batch_files" ADD CONSTRAINT "batch_files_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."benefit_realization_plan" ADD CONSTRAINT "benefit_realization_plan_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."benefit_realization_plan" ADD CONSTRAINT "benefit_realization_plan_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."benefit_realization_plan" ADD CONSTRAINT "benefit_realization_plan_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."best_practices" ADD CONSTRAINT "best_practices_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."best_practices" ADD CONSTRAINT "best_practices_extracted_from_document_id_fkey" FOREIGN KEY (extracted_from_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."best_practices" ADD CONSTRAINT "best_practices_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."best_practices" ADD CONSTRAINT "best_practices_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."budget_baseline" ADD CONSTRAINT "budget_baseline_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."budget_baseline" ADD CONSTRAINT "budget_baseline_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."budget_baseline" ADD CONSTRAINT "budget_baseline_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."budget_baselines" ADD CONSTRAINT "budget_baselines_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."budget_baselines" ADD CONSTRAINT "budget_baselines_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."budget_baselines" ADD CONSTRAINT "budget_baselines_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."budget_baselines" ADD CONSTRAINT "budget_baselines_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."business_case_details" ADD CONSTRAINT "business_case_details_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."business_case_details" ADD CONSTRAINT "business_case_details_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."business_case_details" ADD CONSTRAINT "business_case_details_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."capacity_forecasts" ADD CONSTRAINT "capacity_forecasts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."capacity_forecasts" ADD CONSTRAINT "capacity_forecasts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."capacity_forecasts" ADD CONSTRAINT "capacity_forecasts_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."capacity_forecasts" ADD CONSTRAINT "capacity_forecasts_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."capacity_plans" ADD CONSTRAINT "capacity_plans_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."capacity_plans" ADD CONSTRAINT "capacity_plans_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."capacity_plans" ADD CONSTRAINT "capacity_plans_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."capacity_plans" ADD CONSTRAINT "capacity_plans_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."change_control_boards" ADD CONSTRAINT "change_control_boards_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."change_control_boards" ADD CONSTRAINT "change_control_boards_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."change_control_boards" ADD CONSTRAINT "change_control_boards_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."checklist_items" ADD CONSTRAINT "checklist_items_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE public."checklist_items" ADD CONSTRAINT "checklist_items_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES users(id);
ALTER TABLE public."checklist_items" ADD CONSTRAINT "checklist_items_assigned_role_id_fkey" FOREIGN KEY (assigned_role_id) REFERENCES project_roles(id) ON DELETE SET NULL;
ALTER TABLE public."checklist_items" ADD CONSTRAINT "checklist_items_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES users(id);
ALTER TABLE public."checklist_items" ADD CONSTRAINT "checklist_items_assigned_user_id_fkey" FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."checklist_items" ADD CONSTRAINT "checklist_items_completed_by_fkey" FOREIGN KEY (completed_by) REFERENCES users(id);
ALTER TABLE public."checklist_items" ADD CONSTRAINT "checklist_items_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."checklist_items" ADD CONSTRAINT "checklist_items_task_id_fkey" FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE;
ALTER TABLE public."checklist_items" ADD CONSTRAINT "checklist_items_validated_by_fkey" FOREIGN KEY (validated_by) REFERENCES users(id);
ALTER TABLE public."communication_logs" ADD CONSTRAINT "communication_logs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."communication_logs" ADD CONSTRAINT "communication_logs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."communication_logs" ADD CONSTRAINT "communication_logs_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."compliance_security" ADD CONSTRAINT "compliance_security_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."compliance_security" ADD CONSTRAINT "compliance_security_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."compliance_security" ADD CONSTRAINT "compliance_security_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."compression_feedback" ADD CONSTRAINT "compression_feedback_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."compression_metrics" ADD CONSTRAINT "compression_metrics_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."constraints" ADD CONSTRAINT "constraints_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."constraints" ADD CONSTRAINT "constraints_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."constraints" ADD CONSTRAINT "constraints_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."context_bundles" ADD CONSTRAINT "fk_context_bundles_project" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."context_bundles" ADD CONSTRAINT "fk_context_bundles_template" FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;
ALTER TABLE public."context_bundles" ADD CONSTRAINT "fk_context_bundles_user" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."context_freshness_assessments" ADD CONSTRAINT "context_freshness_assessments_context_id_fkey" FOREIGN KEY (context_id) REFERENCES context_items(id) ON DELETE CASCADE;
ALTER TABLE public."context_freshness_policy_evaluations" ADD CONSTRAINT "context_freshness_policy_evaluations_policy_id_fkey" FOREIGN KEY (policy_id) REFERENCES context_freshness_policies(policy_id) ON DELETE CASCADE;
ALTER TABLE public."context_freshness_policy_results" ADD CONSTRAINT "context_freshness_policy_results_context_id_fkey" FOREIGN KEY (context_id) REFERENCES context_items(id) ON DELETE CASCADE;
ALTER TABLE public."context_freshness_policy_results" ADD CONSTRAINT "context_freshness_policy_results_policy_id_fkey" FOREIGN KEY (policy_id) REFERENCES context_freshness_policies(policy_id) ON DELETE CASCADE;
ALTER TABLE public."context_freshness_trends" ADD CONSTRAINT "context_freshness_trends_context_id_fkey" FOREIGN KEY (context_id) REFERENCES context_items(id) ON DELETE CASCADE;
ALTER TABLE public."context_refresh_results" ADD CONSTRAINT "context_refresh_results_context_id_fkey" FOREIGN KEY (context_id) REFERENCES context_items(id) ON DELETE CASCADE;
ALTER TABLE public."context_refresh_schedules" ADD CONSTRAINT "context_refresh_schedules_context_id_fkey" FOREIGN KEY (context_id) REFERENCES context_items(id) ON DELETE CASCADE;
ALTER TABLE public."context_staleness_log" ADD CONSTRAINT "context_staleness_log_context_id_fkey" FOREIGN KEY (context_id) REFERENCES context_items(id) ON DELETE CASCADE;
ALTER TABLE public."contingency_reserves" ADD CONSTRAINT "contingency_reserves_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."contingency_reserves" ADD CONSTRAINT "contingency_reserves_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."contingency_reserves" ADD CONSTRAINT "contingency_reserves_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."contingency_reserves" ADD CONSTRAINT "contingency_reserves_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."cost_actuals" ADD CONSTRAINT "cost_actuals_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."cost_actuals" ADD CONSTRAINT "cost_actuals_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."cost_actuals" ADD CONSTRAINT "cost_actuals_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."cost_actuals" ADD CONSTRAINT "cost_actuals_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."cost_categories" ADD CONSTRAINT "cost_categories_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."cost_estimates" ADD CONSTRAINT "cost_estimates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."cost_estimates" ADD CONSTRAINT "cost_estimates_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."cost_estimates" ADD CONSTRAINT "cost_estimates_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."critical_path" ADD CONSTRAINT "critical_path_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."critical_path" ADD CONSTRAINT "critical_path_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."critical_path" ADD CONSTRAINT "critical_path_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."critical_path_activities" ADD CONSTRAINT "critical_path_activities_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."critical_path_activities" ADD CONSTRAINT "critical_path_activities_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."deliverable_acceptance" ADD CONSTRAINT "deliverable_acceptance_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."deliverable_acceptance" ADD CONSTRAINT "deliverable_acceptance_deliverable_id_fkey" FOREIGN KEY (deliverable_id) REFERENCES deliverables(id) ON DELETE SET NULL;
ALTER TABLE public."deliverable_acceptance" ADD CONSTRAINT "deliverable_acceptance_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."deliverable_acceptance" ADD CONSTRAINT "deliverable_acceptance_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."deliverable_acceptance" ADD CONSTRAINT "deliverable_acceptance_stakeholder_id_fkey" FOREIGN KEY (stakeholder_id) REFERENCES stakeholders(id) ON DELETE SET NULL;
ALTER TABLE public."deliverable_acceptance" ADD CONSTRAINT "deliverable_acceptance_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."deliverables" ADD CONSTRAINT "deliverables_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."deliverables" ADD CONSTRAINT "deliverables_extracted_from_document_id_fkey" FOREIGN KEY (extracted_from_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."deliverables" ADD CONSTRAINT "deliverables_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."deliverables" ADD CONSTRAINT "deliverables_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."development_approach" ADD CONSTRAINT "development_approach_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."development_approach" ADD CONSTRAINT "development_approach_defined_by_fkey" FOREIGN KEY (defined_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."development_approach" ADD CONSTRAINT "development_approach_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."development_approach" ADD CONSTRAINT "development_approach_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."development_approaches" ADD CONSTRAINT "development_approaches_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."development_approaches" ADD CONSTRAINT "development_approaches_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."development_approaches" ADD CONSTRAINT "development_approaches_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."development_approaches" ADD CONSTRAINT "development_approaches_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."digital_twin_asset_states" ADD CONSTRAINT "digital_twin_asset_states_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES digital_twin_assets(id) ON DELETE CASCADE;
ALTER TABLE public."digital_twin_asset_states" ADD CONSTRAINT "digital_twin_asset_states_source_event_id_fkey" FOREIGN KEY (source_event_id) REFERENCES digital_twin_events(id) ON DELETE SET NULL;
ALTER TABLE public."digital_twin_asset_states" ADD CONSTRAINT "fk_dt_states_previous_state" FOREIGN KEY (previous_state_id) REFERENCES digital_twin_asset_states(id) ON DELETE SET NULL;
ALTER TABLE public."digital_twin_assets" ADD CONSTRAINT "digital_twin_assets_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE public."digital_twin_assets" ADD CONSTRAINT "digital_twin_assets_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."digital_twin_assets" ADD CONSTRAINT "digital_twin_assets_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."digital_twin_assets" ADD CONSTRAINT "digital_twin_assets_source_entity_id_fkey" FOREIGN KEY (source_entity_id) REFERENCES extracted_dt_assets(id) ON DELETE SET NULL;
ALTER TABLE public."digital_twin_assets" ADD CONSTRAINT "fk_dt_assets_current_state" FOREIGN KEY (current_state_id) REFERENCES digital_twin_asset_states(id) ON DELETE SET NULL;
ALTER TABLE public."digital_twin_document_triggers" ADD CONSTRAINT "digital_twin_document_triggers_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES digital_twin_assets(id) ON DELETE CASCADE;
ALTER TABLE public."digital_twin_document_triggers" ADD CONSTRAINT "digital_twin_document_triggers_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."digital_twin_document_triggers" ADD CONSTRAINT "digital_twin_document_triggers_event_id_fkey" FOREIGN KEY (event_id) REFERENCES digital_twin_events(id) ON DELETE SET NULL;
ALTER TABLE public."digital_twin_document_triggers" ADD CONSTRAINT "digital_twin_document_triggers_template_id_fkey" FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL;
ALTER TABLE public."digital_twin_events" ADD CONSTRAINT "digital_twin_events_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES digital_twin_assets(id) ON DELETE CASCADE;
ALTER TABLE public."digital_twin_ingestion_sources" ADD CONSTRAINT "digital_twin_ingestion_sources_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."digital_twin_trigger_rules" ADD CONSTRAINT "digital_twin_trigger_rules_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."digital_twin_trigger_rules" ADD CONSTRAINT "digital_twin_trigger_rules_template_id_fkey" FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL;
ALTER TABLE public."document_analysis" ADD CONSTRAINT "document_analysis_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."document_analytics" ADD CONSTRAINT "document_analytics_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."document_analytics" ADD CONSTRAINT "document_analytics_last_edited_by_fkey" FOREIGN KEY (last_edited_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."document_analytics" ADD CONSTRAINT "document_analytics_last_viewed_by_fkey" FOREIGN KEY (last_viewed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."document_analytics" ADD CONSTRAINT "document_analytics_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."document_audit_trail" ADD CONSTRAINT "document_audit_trail_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."document_audit_trail" ADD CONSTRAINT "document_audit_trail_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."document_audit_trail" ADD CONSTRAINT "document_audit_trail_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."document_audit_trail" ADD CONSTRAINT "document_audit_trail_version_id_fkey" FOREIGN KEY (version_id) REFERENCES document_versions(id) ON DELETE SET NULL;
ALTER TABLE public."document_chunks" ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."document_entities" ADD CONSTRAINT "document_entities_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."document_integrations" ADD CONSTRAINT "document_integrations_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."document_integrations" ADD CONSTRAINT "document_integrations_synced_by_fkey" FOREIGN KEY (synced_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."document_jira_links" ADD CONSTRAINT "document_jira_links_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."document_jira_links" ADD CONSTRAINT "document_jira_links_integration_id_fkey" FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE;
ALTER TABLE public."document_pattern_analysis" ADD CONSTRAINT "document_pattern_analysis_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."document_pmbok7_principle_refs" ADD CONSTRAINT "document_pmbok7_principle_refs_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."document_pmbok7_principle_refs" ADD CONSTRAINT "document_pmbok7_principle_refs_principle_id_fkey" FOREIGN KEY (principle_id) REFERENCES pmbok7_principles(id) ON DELETE CASCADE;
ALTER TABLE public."document_processing_history" ADD CONSTRAINT "document_processing_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."document_processing_jobs" ADD CONSTRAINT "document_processing_jobs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."document_quality_metrics" ADD CONSTRAINT "document_quality_metrics_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."document_signatures" ADD CONSTRAINT "document_signatures_approval_request_id_fkey" FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE SET NULL;
ALTER TABLE public."document_signatures" ADD CONSTRAINT "document_signatures_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."document_signatures" ADD CONSTRAINT "document_signatures_initiated_by_fkey" FOREIGN KEY (initiated_by) REFERENCES users(id);
ALTER TABLE public."document_summaries" ADD CONSTRAINT "document_summaries_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."document_tags" ADD CONSTRAINT "document_tags_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."document_version_conflicts" ADD CONSTRAINT "document_version_conflicts_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."document_version_conflicts" ADD CONSTRAINT "document_version_conflicts_existing_version_id_fkey" FOREIGN KEY (existing_version_id) REFERENCES document_versions(id) ON DELETE SET NULL;
ALTER TABLE public."document_version_conflicts" ADD CONSTRAINT "document_version_conflicts_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES users(id);
ALTER TABLE public."document_version_conflicts" ADD CONSTRAINT "document_version_conflicts_template_id_fkey" FOREIGN KEY (template_id) REFERENCES templates(id);
ALTER TABLE public."document_versions" ADD CONSTRAINT "document_versions_author_id_fkey" FOREIGN KEY (author_id) REFERENCES users(id);
ALTER TABLE public."document_versions" ADD CONSTRAINT "document_versions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."document_versions" ADD CONSTRAINT "document_versions_parent_version_id_fkey" FOREIGN KEY (parent_version_id) REFERENCES document_versions(id);
ALTER TABLE public."documents" ADD CONSTRAINT "documents_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE public."documents" ADD CONSTRAINT "documents_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."documents" ADD CONSTRAINT "documents_current_version_id_fkey" FOREIGN KEY (current_version_id) REFERENCES document_versions(id);
ALTER TABLE public."documents" ADD CONSTRAINT "documents_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES users(id);
ALTER TABLE public."documents" ADD CONSTRAINT "documents_parent_document_id_fkey" FOREIGN KEY (parent_document_id) REFERENCES documents(id);
ALTER TABLE public."documents" ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."documents" ADD CONSTRAINT "documents_quality_audit_id_fkey" FOREIGN KEY (quality_audit_id) REFERENCES quality_audits(id) ON DELETE SET NULL;
ALTER TABLE public."documents" ADD CONSTRAINT "documents_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id);
ALTER TABLE public."documents_vectors" ADD CONSTRAINT "documents_vectors_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents_raw(id) ON DELETE CASCADE;
ALTER TABLE public."domain_entities" ADD CONSTRAINT "domain_entities_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."domain_entities" ADD CONSTRAINT "domain_entities_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."domain_extraction_runs" ADD CONSTRAINT "domain_extraction_runs_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;
ALTER TABLE public."domain_extraction_runs" ADD CONSTRAINT "domain_extraction_runs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."domain_extraction_runs" ADD CONSTRAINT "domain_extraction_runs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."domain_kpi_snapshots" ADD CONSTRAINT "domain_kpi_snapshots_extraction_run_id_fkey" FOREIGN KEY (extraction_run_id) REFERENCES domain_extraction_runs(id) ON DELETE CASCADE;
ALTER TABLE public."domain_kpi_snapshots" ADD CONSTRAINT "domain_kpi_snapshots_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."drift_detection_rules" ADD CONSTRAINT "drift_detection_rules_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."drift_detection_rules" ADD CONSTRAINT "drift_detection_rules_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."drift_detections" ADD CONSTRAINT "drift_detections_baseline_id_fkey" FOREIGN KEY (baseline_id) REFERENCES project_entity_baselines(id) ON DELETE SET NULL;
ALTER TABLE public."drift_detections" ADD CONSTRAINT "drift_detections_comparison_id_fkey" FOREIGN KEY (comparison_id) REFERENCES baseline_comparisons(id) ON DELETE SET NULL;
ALTER TABLE public."drift_detections" ADD CONSTRAINT "drift_detections_detected_by_fkey" FOREIGN KEY (detected_by) REFERENCES users(id);
ALTER TABLE public."drift_detections" ADD CONSTRAINT "drift_detections_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."drift_detections" ADD CONSTRAINT "drift_detections_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES users(id);
ALTER TABLE public."earned_value_metrics" ADD CONSTRAINT "earned_value_metrics_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."earned_value_metrics" ADD CONSTRAINT "earned_value_metrics_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."earned_value_metrics" ADD CONSTRAINT "earned_value_metrics_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."earned_value_metrics" ADD CONSTRAINT "earned_value_metrics_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."emergency_meetings" ADD CONSTRAINT "emergency_meetings_change_request_id_fkey" FOREIGN KEY (change_request_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."emergency_meetings" ADD CONSTRAINT "emergency_meetings_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."emergency_meetings" ADD CONSTRAINT "emergency_meetings_drift_record_id_fkey" FOREIGN KEY (drift_record_id) REFERENCES baseline_drift_detection(id) ON DELETE SET NULL;
ALTER TABLE public."emergency_meetings" ADD CONSTRAINT "emergency_meetings_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."engagement_actions" ADD CONSTRAINT "engagement_actions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."engagement_actions" ADD CONSTRAINT "engagement_actions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."engagement_actions" ADD CONSTRAINT "engagement_actions_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."engagement_actions" ADD CONSTRAINT "engagement_actions_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."entity_extractions" ADD CONSTRAINT "entity_extractions_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."entity_extractions" ADD CONSTRAINT "entity_extractions_extraction_job_id_fkey" FOREIGN KEY (extraction_job_id) REFERENCES jobs(id) ON DELETE SET NULL;
ALTER TABLE public."entity_extractions" ADD CONSTRAINT "entity_extractions_project_fk" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."entity_extractions" ADD CONSTRAINT "entity_extractions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."entity_extractions" ADD CONSTRAINT "entity_extractions_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES users(id);
ALTER TABLE public."entity_relationships" ADD CONSTRAINT "entity_relationships_source_entity_id_fkey" FOREIGN KEY (source_entity_id) REFERENCES entity_extractions(id) ON DELETE CASCADE;
ALTER TABLE public."entity_relationships" ADD CONSTRAINT "entity_relationships_target_entity_id_fkey" FOREIGN KEY (target_entity_id) REFERENCES entity_extractions(id) ON DELETE CASCADE;
ALTER TABLE public."escalation_alert_history" ADD CONSTRAINT "escalation_alert_history_alert_id_fkey" FOREIGN KEY (alert_id) REFERENCES escalation_alerts(id) ON DELETE CASCADE;
ALTER TABLE public."escalation_alert_history" ADD CONSTRAINT "escalation_alert_history_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES users(id);
ALTER TABLE public."escalation_alerts" ADD CONSTRAINT "escalation_alerts_acknowledged_by_fkey" FOREIGN KEY (acknowledged_by) REFERENCES users(id);
ALTER TABLE public."escalation_alerts" ADD CONSTRAINT "escalation_alerts_drift_detection_id_fkey" FOREIGN KEY (drift_detection_id) REFERENCES baseline_drift_detection(id) ON DELETE CASCADE;
ALTER TABLE public."escalation_alerts" ADD CONSTRAINT "escalation_alerts_escalation_rule_id_fkey" FOREIGN KEY (escalation_rule_id) REFERENCES escalation_matrix(id);
ALTER TABLE public."escalation_alerts" ADD CONSTRAINT "escalation_alerts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."escalation_matrix" ADD CONSTRAINT "escalation_matrix_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."extracted_dt_assets" ADD CONSTRAINT "extracted_dt_assets_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."extracted_dt_assets" ADD CONSTRAINT "extracted_dt_assets_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."extracted_dt_assets" ADD CONSTRAINT "extracted_dt_assets_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."extraction_failures" ADD CONSTRAINT "extraction_failures_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."file_assets" ADD CONSTRAINT "file_assets_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES users(id);
ALTER TABLE public."financial_variances" ADD CONSTRAINT "financial_variances_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."financial_variances" ADD CONSTRAINT "financial_variances_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."financial_variances" ADD CONSTRAINT "financial_variances_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."funding_tranches" ADD CONSTRAINT "funding_tranches_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."funding_tranches" ADD CONSTRAINT "funding_tranches_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."funding_tranches" ADD CONSTRAINT "funding_tranches_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."general_change_requests" ADD CONSTRAINT "general_change_requests_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."general_change_requests" ADD CONSTRAINT "general_change_requests_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."general_change_requests" ADD CONSTRAINT "general_change_requests_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."goal_milestones" ADD CONSTRAINT "goal_milestones_goal_id_fkey" FOREIGN KEY (goal_id) REFERENCES project_goals(id) ON DELETE CASCADE;
ALTER TABLE public."improvement_suggestions" ADD CONSTRAINT "improvement_suggestions_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."improvement_suggestions" ADD CONSTRAINT "improvement_suggestions_implemented_by_fkey" FOREIGN KEY (implemented_by) REFERENCES users(id);
ALTER TABLE public."improvement_suggestions" ADD CONSTRAINT "improvement_suggestions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."improvement_suggestions" ADD CONSTRAINT "improvement_suggestions_suggested_by_fkey" FOREIGN KEY (suggested_by) REFERENCES users(id);
ALTER TABLE public."improvement_suggestions" ADD CONSTRAINT "improvement_suggestions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."innovation_opportunities" ADD CONSTRAINT "innovation_opportunities_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES users(id);
ALTER TABLE public."innovation_opportunities" ADD CONSTRAINT "innovation_opportunities_baseline_id_fkey" FOREIGN KEY (baseline_id) REFERENCES project_baselines(id) ON DELETE CASCADE;
ALTER TABLE public."innovation_opportunities" ADD CONSTRAINT "innovation_opportunities_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."innovation_opportunities" ADD CONSTRAINT "innovation_opportunities_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id);
ALTER TABLE public."integration_sync_metadata" ADD CONSTRAINT "integration_sync_metadata_adpa_document_id_fkey" FOREIGN KEY (adpa_document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."integration_sync_metadata" ADD CONSTRAINT "integration_sync_metadata_integration_id_fkey" FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE;
ALTER TABLE public."integrations" ADD CONSTRAINT "integrations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."issue_log" ADD CONSTRAINT "issue_log_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."issue_log" ADD CONSTRAINT "issue_log_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."issue_log" ADD CONSTRAINT "issue_log_escalated_to_fkey" FOREIGN KEY (escalated_to) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."issue_log" ADD CONSTRAINT "issue_log_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."issue_log" ADD CONSTRAINT "issue_log_raised_by_fkey" FOREIGN KEY (raised_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."issue_log" ADD CONSTRAINT "issue_log_related_risk_id_fkey" FOREIGN KEY (related_risk_id) REFERENCES risks(id) ON DELETE SET NULL;
ALTER TABLE public."issue_log" ADD CONSTRAINT "issue_log_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."issue_status_history" ADD CONSTRAINT "fk_issue_status_history_issue" FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE;
ALTER TABLE public."issue_status_history" ADD CONSTRAINT "issue_status_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."issue_status_history" ADD CONSTRAINT "issue_status_history_issue_id_fkey" FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE;
ALTER TABLE public."issues" ADD CONSTRAINT "issues_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."issues" ADD CONSTRAINT "issues_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."issues" ADD CONSTRAINT "issues_escalated_to_fkey" FOREIGN KEY (escalated_to) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."issues" ADD CONSTRAINT "issues_playbook_execution_id_fkey" FOREIGN KEY (playbook_execution_id) REFERENCES playbook_executions(id) ON DELETE SET NULL;
ALTER TABLE public."issues" ADD CONSTRAINT "issues_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."issues" ADD CONSTRAINT "issues_raised_by_fkey" FOREIGN KEY (raised_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."issues" ADD CONSTRAINT "issues_related_risk_id_fkey" FOREIGN KEY (related_risk_id) REFERENCES risks(id) ON DELETE SET NULL;
ALTER TABLE public."issues" ADD CONSTRAINT "issues_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."job_execution_logs" ADD CONSTRAINT "job_execution_logs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE public."job_execution_logs" ADD CONSTRAINT "job_execution_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."jobs" ADD CONSTRAINT "jobs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."jobs" ADD CONSTRAINT "jobs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE public."knowledge_base_applications" ADD CONSTRAINT "knowledge_base_applications_applied_by_fkey" FOREIGN KEY (applied_by) REFERENCES users(id);
ALTER TABLE public."knowledge_base_applications" ADD CONSTRAINT "knowledge_base_applications_knowledge_base_entry_id_fkey" FOREIGN KEY (knowledge_base_entry_id) REFERENCES knowledge_base_entries(id) ON DELETE CASCADE;
ALTER TABLE public."knowledge_base_applications" ADD CONSTRAINT "knowledge_base_applications_target_project_id_fkey" FOREIGN KEY (target_project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."knowledge_base_entries" ADD CONSTRAINT "knowledge_base_entries_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE public."knowledge_base_entries" ADD CONSTRAINT "knowledge_base_entries_baseline_id_fkey" FOREIGN KEY (baseline_id) REFERENCES project_baselines(id) ON DELETE SET NULL;
ALTER TABLE public."knowledge_base_entries" ADD CONSTRAINT "knowledge_base_entries_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."knowledge_base_entries" ADD CONSTRAINT "knowledge_base_entries_drift_detection_id_fkey" FOREIGN KEY (drift_detection_id) REFERENCES baseline_drift_detection(id) ON DELETE SET NULL;
ALTER TABLE public."knowledge_base_entries" ADD CONSTRAINT "knowledge_base_entries_innovation_opportunity_id_fkey" FOREIGN KEY (innovation_opportunity_id) REFERENCES innovation_opportunities(id) ON DELETE SET NULL;
ALTER TABLE public."knowledge_base_entries" ADD CONSTRAINT "knowledge_base_entries_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."knowledge_base_entries" ADD CONSTRAINT "knowledge_base_entries_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES users(id);
ALTER TABLE public."knowledge_base_entries" ADD CONSTRAINT "knowledge_base_entries_superseded_by_fkey" FOREIGN KEY (superseded_by) REFERENCES knowledge_base_entries(id);
ALTER TABLE public."knowledge_base_entry_relationships" ADD CONSTRAINT "knowledge_base_entry_relationships_source_entry_id_fkey" FOREIGN KEY (source_entry_id) REFERENCES knowledge_base_entries(id) ON DELETE CASCADE;
ALTER TABLE public."knowledge_base_entry_relationships" ADD CONSTRAINT "knowledge_base_entry_relationships_target_entry_id_fkey" FOREIGN KEY (target_entry_id) REFERENCES knowledge_base_entries(id) ON DELETE CASCADE;
ALTER TABLE public."knowledge_base_reviews" ADD CONSTRAINT "knowledge_base_reviews_knowledge_base_entry_id_fkey" FOREIGN KEY (knowledge_base_entry_id) REFERENCES knowledge_base_entries(id) ON DELETE CASCADE;
ALTER TABLE public."knowledge_base_reviews" ADD CONSTRAINT "knowledge_base_reviews_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES users(id);
ALTER TABLE public."labor_rates" ADD CONSTRAINT "labor_rates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."labor_rates" ADD CONSTRAINT "labor_rates_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."labor_rates" ADD CONSTRAINT "labor_rates_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."lessons_learned" ADD CONSTRAINT "lessons_learned_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."lessons_learned" ADD CONSTRAINT "lessons_learned_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."maturity_assessments" ADD CONSTRAINT "maturity_assessments_assessed_by_fkey" FOREIGN KEY (assessed_by) REFERENCES users(id);
ALTER TABLE public."maturity_assessments" ADD CONSTRAINT "maturity_assessments_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."meeting_attendees" ADD CONSTRAINT "meeting_attendees_meeting_id_fkey" FOREIGN KEY (meeting_id) REFERENCES emergency_meetings(id) ON DELETE CASCADE;
ALTER TABLE public."meeting_attendees" ADD CONSTRAINT "meeting_attendees_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."meeting_escalation_history" ADD CONSTRAINT "meeting_escalation_history_escalated_by_fkey" FOREIGN KEY (escalated_by) REFERENCES users(id);
ALTER TABLE public."meeting_escalation_history" ADD CONSTRAINT "meeting_escalation_history_meeting_id_fkey" FOREIGN KEY (meeting_id) REFERENCES emergency_meetings(id) ON DELETE CASCADE;
ALTER TABLE public."meeting_minutes" ADD CONSTRAINT "meeting_minutes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."meeting_minutes" ADD CONSTRAINT "meeting_minutes_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."meeting_minutes" ADD CONSTRAINT "meeting_minutes_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."milestones" ADD CONSTRAINT "milestones_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."milestones" ADD CONSTRAINT "milestones_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."milestones" ADD CONSTRAINT "milestones_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."mitigation_plans" ADD CONSTRAINT "mitigation_plans_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."mitigation_plans" ADD CONSTRAINT "mitigation_plans_completed_by_fkey" FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."mitigation_plans" ADD CONSTRAINT "mitigation_plans_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."mitigation_plans" ADD CONSTRAINT "mitigation_plans_issue_id_fkey" FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE SET NULL;
ALTER TABLE public."mitigation_plans" ADD CONSTRAINT "mitigation_plans_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."mitigation_plans" ADD CONSTRAINT "mitigation_plans_risk_id_fkey" FOREIGN KEY (risk_id) REFERENCES risks(id) ON DELETE CASCADE;
ALTER TABLE public."mitigation_plans" ADD CONSTRAINT "mitigation_plans_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id);
ALTER TABLE public."morphic_ai_model_config" ADD CONSTRAINT "morphic_ai_model_config_model_id_morphic_ai_models_id_fk" FOREIGN KEY (model_id) REFERENCES morphic_ai_models(id) ON DELETE CASCADE;
ALTER TABLE public."morphic_ai_models" ADD CONSTRAINT "morphic_ai_models_provider_id_morphic_ai_providers_id_fk" FOREIGN KEY (provider_id) REFERENCES morphic_ai_providers(id) ON DELETE CASCADE;
ALTER TABLE public."morphic_messages" ADD CONSTRAINT "morphic_messages_chat_id_morphic_chats_id_fk" FOREIGN KEY (chat_id) REFERENCES morphic_chats(id) ON DELETE CASCADE;
ALTER TABLE public."morphic_parts" ADD CONSTRAINT "morphic_parts_message_id_morphic_messages_id_fk" FOREIGN KEY (message_id) REFERENCES morphic_messages(id) ON DELETE CASCADE;
ALTER TABLE public."onboarding_offboarding" ADD CONSTRAINT "onboarding_offboarding_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."onboarding_offboarding" ADD CONSTRAINT "onboarding_offboarding_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."onboarding_offboarding" ADD CONSTRAINT "onboarding_offboarding_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."onboarding_offboarding" ADD CONSTRAINT "onboarding_offboarding_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."operational_playbooks" ADD CONSTRAINT "operational_playbooks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."operational_playbooks" ADD CONSTRAINT "operational_playbooks_previous_version_id_fkey" FOREIGN KEY (previous_version_id) REFERENCES operational_playbooks(id) ON DELETE SET NULL;
ALTER TABLE public."operational_playbooks" ADD CONSTRAINT "operational_playbooks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."operational_playbooks" ADD CONSTRAINT "operational_playbooks_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id);
ALTER TABLE public."opportunities" ADD CONSTRAINT "opportunities_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."opportunities" ADD CONSTRAINT "opportunities_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."opportunities" ADD CONSTRAINT "opportunities_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."opportunities" ADD CONSTRAINT "opportunities_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."performance_actuals" ADD CONSTRAINT "performance_actuals_measured_by_fkey" FOREIGN KEY (measured_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."performance_actuals" ADD CONSTRAINT "performance_actuals_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."performance_actuals" ADD CONSTRAINT "performance_actuals_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id);
ALTER TABLE public."performance_measurements" ADD CONSTRAINT "performance_measurements_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."performance_measurements" ADD CONSTRAINT "performance_measurements_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."performance_measurements" ADD CONSTRAINT "performance_measurements_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."performance_measurements" ADD CONSTRAINT "performance_measurements_success_criterion_id_fkey" FOREIGN KEY (success_criterion_id) REFERENCES success_criteria(id) ON DELETE SET NULL;
ALTER TABLE public."performance_measurements" ADD CONSTRAINT "performance_measurements_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."phases" ADD CONSTRAINT "phases_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."phases" ADD CONSTRAINT "phases_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."phases" ADD CONSTRAINT "phases_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."pipeline_configurations" ADD CONSTRAINT "fk_pipeline_configurations_created_by" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."pipeline_executions" ADD CONSTRAINT "fk_pipeline_executions_project_id" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."pipeline_executions" ADD CONSTRAINT "fk_pipeline_executions_template_id" FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;
ALTER TABLE public."pipeline_executions" ADD CONSTRAINT "fk_pipeline_executions_user_id" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."playbook_executions" ADD CONSTRAINT "playbook_executions_cancelled_by_fkey" FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."playbook_executions" ADD CONSTRAINT "playbook_executions_current_step_id_fkey" FOREIGN KEY (current_step_id) REFERENCES playbook_response_steps(id) ON DELETE SET NULL;
ALTER TABLE public."playbook_executions" ADD CONSTRAINT "playbook_executions_playbook_id_fkey" FOREIGN KEY (playbook_id) REFERENCES operational_playbooks(id) ON DELETE CASCADE;
ALTER TABLE public."playbook_executions" ADD CONSTRAINT "playbook_executions_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id);
ALTER TABLE public."playbook_executions" ADD CONSTRAINT "playbook_executions_triggered_by_user_id_fkey" FOREIGN KEY (triggered_by_user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."playbook_response_steps" ADD CONSTRAINT "playbook_response_steps_playbook_id_fkey" FOREIGN KEY (playbook_id) REFERENCES operational_playbooks(id) ON DELETE CASCADE;
ALTER TABLE public."playbook_scenarios" ADD CONSTRAINT "playbook_scenarios_playbook_id_fkey" FOREIGN KEY (playbook_id) REFERENCES operational_playbooks(id) ON DELETE CASCADE;
ALTER TABLE public."playbook_step_executions" ADD CONSTRAINT "playbook_step_executions_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."playbook_step_executions" ADD CONSTRAINT "playbook_step_executions_completed_by_fkey" FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."playbook_step_executions" ADD CONSTRAINT "playbook_step_executions_execution_id_fkey" FOREIGN KEY (execution_id) REFERENCES playbook_executions(id) ON DELETE CASCADE;
ALTER TABLE public."playbook_step_executions" ADD CONSTRAINT "playbook_step_executions_step_id_fkey" FOREIGN KEY (step_id) REFERENCES playbook_response_steps(id) ON DELETE CASCADE;
ALTER TABLE public."pmbok6_processes" ADD CONSTRAINT "pmbok6_processes_knowledge_area_id_fkey" FOREIGN KEY (knowledge_area_id) REFERENCES pmbok6_knowledge_areas(id) ON DELETE CASCADE;
ALTER TABLE public."pmbok6_processes" ADD CONSTRAINT "pmbok6_processes_process_group_id_fkey" FOREIGN KEY (process_group_id) REFERENCES pmbok6_process_groups(id) ON DELETE CASCADE;
ALTER TABLE public."pmbok6_to_pmbok7_principle_mapping" ADD CONSTRAINT "pmbok6_to_pmbok7_principle_mapping_principle_id_fkey" FOREIGN KEY (principle_id) REFERENCES pmbok7_principles(id) ON DELETE CASCADE;
ALTER TABLE public."pmbok6_to_pmbok7_principle_mapping" ADD CONSTRAINT "pmbok6_to_pmbok7_principle_mapping_process_id_fkey" FOREIGN KEY (process_id) REFERENCES pmbok6_processes(id) ON DELETE CASCADE;
ALTER TABLE public."policy_compliance" ADD CONSTRAINT "policy_compliance_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."policy_compliance" ADD CONSTRAINT "policy_compliance_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."policy_compliance" ADD CONSTRAINT "policy_compliance_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."portfolio_governance" ADD CONSTRAINT "portfolio_governance_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public."portfolio_governance" ADD CONSTRAINT "portfolios_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."portfolio_governance" ADD CONSTRAINT "portfolios_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."portfolio_key_results" ADD CONSTRAINT "portfolio_key_results_okr_id_fkey" FOREIGN KEY (okr_id) REFERENCES portfolio_okrs(id) ON DELETE CASCADE;
ALTER TABLE public."portfolio_key_results" ADD CONSTRAINT "portfolio_key_results_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."portfolio_key_success_factors" ADD CONSTRAINT "portfolio_key_success_factors_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."portfolio_key_success_factors" ADD CONSTRAINT "portfolio_key_success_factors_sponsor_id_fkey" FOREIGN KEY (sponsor_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."portfolio_kpi_history" ADD CONSTRAINT "portfolio_kpi_history_kpi_id_fkey" FOREIGN KEY (kpi_id) REFERENCES portfolio_kpis(id) ON DELETE CASCADE;
ALTER TABLE public."portfolio_kpi_history" ADD CONSTRAINT "portfolio_kpi_history_measured_by_fkey" FOREIGN KEY (measured_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."portfolio_kpis" ADD CONSTRAINT "portfolio_kpis_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."portfolio_okrs" ADD CONSTRAINT "portfolio_okrs_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."portfolio_okrs" ADD CONSTRAINT "portfolio_okrs_parent_okr_id_fkey" FOREIGN KEY (parent_okr_id) REFERENCES portfolio_okrs(id) ON DELETE SET NULL;
ALTER TABLE public."portfolio_risks" ADD CONSTRAINT "fk_portfolio_risks_escalation_policy" FOREIGN KEY (escalation_policy_id) REFERENCES risk_escalation_policies(id) ON DELETE SET NULL;
ALTER TABLE public."portfolio_risks" ADD CONSTRAINT "portfolio_risks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."portfolio_risks" ADD CONSTRAINT "portfolio_risks_risk_owner_fkey" FOREIGN KEY (risk_owner) REFERENCES users(id);
ALTER TABLE public."portfolio_strategic_goals" ADD CONSTRAINT "portfolio_strategic_goals_vision_id_fkey" FOREIGN KEY (vision_id) REFERENCES portfolio_vision(id) ON DELETE SET NULL;
ALTER TABLE public."portfolio_vision" ADD CONSTRAINT "portfolio_vision_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."prioritization_criteria" ADD CONSTRAINT "prioritization_criteria_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."probability_impact_matrix" ADD CONSTRAINT "probability_impact_matrix_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."probability_impact_matrix" ADD CONSTRAINT "probability_impact_matrix_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."probability_impact_matrix" ADD CONSTRAINT "probability_impact_matrix_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."processing_metrics" ADD CONSTRAINT "processing_metrics_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."procurement_costs" ADD CONSTRAINT "procurement_costs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."procurement_costs" ADD CONSTRAINT "procurement_costs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."procurement_costs" ADD CONSTRAINT "procurement_costs_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."program_benefits" ADD CONSTRAINT "program_benefits_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES users(id);
ALTER TABLE public."program_benefits" ADD CONSTRAINT "program_benefits_program_id_fkey" FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
ALTER TABLE public."program_benefits" ADD CONSTRAINT "program_benefits_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE public."program_budgets" ADD CONSTRAINT "program_budgets_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE public."program_budgets" ADD CONSTRAINT "program_budgets_program_id_fkey" FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
ALTER TABLE public."program_capacity_forecast" ADD CONSTRAINT "program_capacity_forecast_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."program_capacity_forecast" ADD CONSTRAINT "program_capacity_forecast_program_id_fkey" FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
ALTER TABLE public."program_cash_flow" ADD CONSTRAINT "program_cash_flow_program_id_fkey" FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
ALTER TABLE public."program_cost_performance" ADD CONSTRAINT "program_cost_performance_calculated_by_fkey" FOREIGN KEY (calculated_by) REFERENCES users(id);
ALTER TABLE public."program_cost_performance" ADD CONSTRAINT "program_cost_performance_program_id_fkey" FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
ALTER TABLE public."program_financial_analysis" ADD CONSTRAINT "program_financial_analysis_analyzed_by_fkey" FOREIGN KEY (analyzed_by) REFERENCES users(id);
ALTER TABLE public."program_financial_analysis" ADD CONSTRAINT "program_financial_analysis_program_id_fkey" FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
ALTER TABLE public."program_financial_transactions" ADD CONSTRAINT "program_financial_transactions_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE public."program_financial_transactions" ADD CONSTRAINT "program_financial_transactions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."program_financial_transactions" ADD CONSTRAINT "program_financial_transactions_program_id_fkey" FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
ALTER TABLE public."program_financial_transactions" ADD CONSTRAINT "program_financial_transactions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE public."program_forecasts" ADD CONSTRAINT "program_forecasts_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE public."program_forecasts" ADD CONSTRAINT "program_forecasts_forecasted_by_fkey" FOREIGN KEY (forecasted_by) REFERENCES users(id);
ALTER TABLE public."program_forecasts" ADD CONSTRAINT "program_forecasts_program_id_fkey" FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
ALTER TABLE public."program_funding" ADD CONSTRAINT "program_funding_program_id_fkey" FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
ALTER TABLE public."program_resource_allocations" ADD CONSTRAINT "program_resource_allocations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."program_resource_allocations" ADD CONSTRAINT "program_resource_allocations_program_id_fkey" FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
ALTER TABLE public."program_resource_allocations" ADD CONSTRAINT "program_resource_allocations_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE public."program_resource_performance" ADD CONSTRAINT "program_resource_performance_program_id_fkey" FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
ALTER TABLE public."program_resource_performance" ADD CONSTRAINT "program_resource_performance_resource_id_fkey" FOREIGN KEY (resource_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."program_resource_performance" ADD CONSTRAINT "program_resource_performance_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES users(id);
ALTER TABLE public."program_resource_plan" ADD CONSTRAINT "program_resource_plan_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."program_resource_plan" ADD CONSTRAINT "program_resource_plan_program_id_fkey" FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
ALTER TABLE public."program_resource_risks" ADD CONSTRAINT "program_resource_risks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."program_resource_risks" ADD CONSTRAINT "program_resource_risks_mitigation_owner_id_fkey" FOREIGN KEY (mitigation_owner_id) REFERENCES users(id);
ALTER TABLE public."program_resource_risks" ADD CONSTRAINT "program_resource_risks_program_id_fkey" FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
ALTER TABLE public."program_resource_risks" ADD CONSTRAINT "program_resource_risks_resource_id_fkey" FOREIGN KEY (resource_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."program_skills_inventory" ADD CONSTRAINT "program_skills_inventory_program_id_fkey" FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
ALTER TABLE public."program_skills_inventory" ADD CONSTRAINT "program_skills_inventory_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."program_skills_inventory" ADD CONSTRAINT "program_skills_inventory_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES users(id);
ALTER TABLE public."programs" ADD CONSTRAINT "programs_archived_by_fkey" FOREIGN KEY (archived_by) REFERENCES users(id);
ALTER TABLE public."programs" ADD CONSTRAINT "programs_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE public."programs" ADD CONSTRAINT "programs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."programs" ADD CONSTRAINT "programs_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE public."programs" ADD CONSTRAINT "programs_portfolio_id_fkey" FOREIGN KEY (portfolio_id) REFERENCES portfolio_governance(id) ON DELETE SET NULL;
ALTER TABLE public."project_analysis" ADD CONSTRAINT "project_analysis_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_baselines" ADD CONSTRAINT "project_baselines_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE public."project_baselines" ADD CONSTRAINT "project_baselines_compliance_reviewed_by_fkey" FOREIGN KEY (compliance_reviewed_by) REFERENCES users(id);
ALTER TABLE public."project_baselines" ADD CONSTRAINT "project_baselines_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."project_baselines" ADD CONSTRAINT "project_baselines_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_baselines" ADD CONSTRAINT "project_baselines_superseded_by_fkey" FOREIGN KEY (superseded_by) REFERENCES project_baselines(id);
ALTER TABLE public."project_charter_details" ADD CONSTRAINT "project_charter_details_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."project_charter_details" ADD CONSTRAINT "project_charter_details_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_charter_details" ADD CONSTRAINT "project_charter_details_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."project_context_items" ADD CONSTRAINT "project_context_items_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."project_context_items" ADD CONSTRAINT "project_context_items_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_context_usage_log" ADD CONSTRAINT "project_context_usage_log_context_item_id_fkey" FOREIGN KEY (context_item_id) REFERENCES project_context_items(id) ON DELETE CASCADE;
ALTER TABLE public."project_context_usage_log" ADD CONSTRAINT "project_context_usage_log_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."project_context_usage_log" ADD CONSTRAINT "project_context_usage_log_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_cost_breakdown" ADD CONSTRAINT "project_cost_breakdown_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_dependencies" ADD CONSTRAINT "project_dependencies_source_project_id_fkey" FOREIGN KEY (source_project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_dependencies" ADD CONSTRAINT "project_dependencies_target_project_id_fkey" FOREIGN KEY (target_project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_entity_baselines" ADD CONSTRAINT "project_entity_baselines_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE public."project_entity_baselines" ADD CONSTRAINT "project_entity_baselines_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."project_entity_baselines" ADD CONSTRAINT "project_entity_baselines_project_fk" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_entity_baselines" ADD CONSTRAINT "project_entity_baselines_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_expenses" ADD CONSTRAINT "project_expenses_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE public."project_expenses" ADD CONSTRAINT "project_expenses_cost_category_id_fkey" FOREIGN KEY (cost_category_id) REFERENCES cost_categories(id);
ALTER TABLE public."project_expenses" ADD CONSTRAINT "project_expenses_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."project_expenses" ADD CONSTRAINT "project_expenses_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_goals" ADD CONSTRAINT "project_goals_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."project_goals" ADD CONSTRAINT "project_goals_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_integrations" ADD CONSTRAINT "project_integrations_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_iterations" ADD CONSTRAINT "project_iterations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."project_iterations" ADD CONSTRAINT "project_iterations_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_iterations" ADD CONSTRAINT "project_iterations_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."project_iterations" ADD CONSTRAINT "project_iterations_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."project_org_chart" ADD CONSTRAINT "project_org_chart_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."project_org_chart" ADD CONSTRAINT "project_org_chart_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_org_chart" ADD CONSTRAINT "project_org_chart_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."project_pmbok7_domains" ADD CONSTRAINT "project_pmbok7_domains_assessed_by_fkey" FOREIGN KEY (assessed_by) REFERENCES users(id);
ALTER TABLE public."project_pmbok7_domains" ADD CONSTRAINT "project_pmbok7_domains_domain_id_fkey" FOREIGN KEY (domain_id) REFERENCES pmbok7_performance_domains(id) ON DELETE CASCADE;
ALTER TABLE public."project_pmbok7_domains" ADD CONSTRAINT "project_pmbok7_domains_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_pmbok7_principles" ADD CONSTRAINT "project_pmbok7_principles_assessed_by_fkey" FOREIGN KEY (assessed_by) REFERENCES users(id);
ALTER TABLE public."project_pmbok7_principles" ADD CONSTRAINT "project_pmbok7_principles_principle_id_fkey" FOREIGN KEY (principle_id) REFERENCES pmbok7_principles(id) ON DELETE CASCADE;
ALTER TABLE public."project_pmbok7_principles" ADD CONSTRAINT "project_pmbok7_principles_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_priority_scores" ADD CONSTRAINT "project_priority_scores_criteria_id_fkey" FOREIGN KEY (criteria_id) REFERENCES prioritization_criteria(id) ON DELETE CASCADE;
ALTER TABLE public."project_priority_scores" ADD CONSTRAINT "project_priority_scores_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_priority_scores" ADD CONSTRAINT "project_priority_scores_scored_by_fkey" FOREIGN KEY (scored_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."project_resource_assignments" ADD CONSTRAINT "project_resource_assignments_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE public."project_resource_assignments" ADD CONSTRAINT "project_resource_assignments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."project_resource_assignments" ADD CONSTRAINT "project_resource_assignments_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_resource_assignments" ADD CONSTRAINT "project_resource_assignments_role_id_fkey" FOREIGN KEY (role_id) REFERENCES project_roles(id);
ALTER TABLE public."project_resource_assignments" ADD CONSTRAINT "project_resource_assignments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public."project_roles" ADD CONSTRAINT "project_roles_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."project_tasks" ADD CONSTRAINT "project_tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."project_tasks" ADD CONSTRAINT "project_tasks_goal_id_fkey" FOREIGN KEY (goal_id) REFERENCES project_goals(id) ON DELETE SET NULL;
ALTER TABLE public."project_tasks" ADD CONSTRAINT "project_tasks_parent_task_id_fkey" FOREIGN KEY (parent_task_id) REFERENCES project_tasks(id);
ALTER TABLE public."project_tasks" ADD CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_tasks" ADD CONSTRAINT "project_tasks_required_role_id_fkey" FOREIGN KEY (required_role_id) REFERENCES project_roles(id);
ALTER TABLE public."project_tasks" ADD CONSTRAINT "project_tasks_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id);
ALTER TABLE public."project_team_evaluations" ADD CONSTRAINT "project_team_evaluations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."project_team_evaluations" ADD CONSTRAINT "project_team_evaluations_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."project_team_evaluations" ADD CONSTRAINT "project_team_evaluations_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."projects" ADD CONSTRAINT "projects_archived_by_fkey" FOREIGN KEY (archived_by) REFERENCES users(id);
ALTER TABLE public."projects" ADD CONSTRAINT "projects_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE public."projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES users(id);
ALTER TABLE public."projects" ADD CONSTRAINT "projects_program_id_fkey" FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL;
ALTER TABLE public."quality_audits" ADD CONSTRAINT "quality_audits_audit_job_id_fkey" FOREIGN KEY (audit_job_id) REFERENCES jobs(id) ON DELETE SET NULL;
ALTER TABLE public."quality_audits" ADD CONSTRAINT "quality_audits_audited_by_fkey" FOREIGN KEY (audited_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."quality_audits" ADD CONSTRAINT "quality_audits_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."quality_audits" ADD CONSTRAINT "quality_audits_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id);
ALTER TABLE public."quality_reports" ADD CONSTRAINT "quality_reports_job_id_fkey" FOREIGN KEY (job_id) REFERENCES document_processing_jobs(job_id) ON DELETE CASCADE;
ALTER TABLE public."quality_standards" ADD CONSTRAINT "quality_standards_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."quality_standards" ADD CONSTRAINT "quality_standards_extracted_from_document_id_fkey" FOREIGN KEY (extracted_from_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."quality_standards" ADD CONSTRAINT "quality_standards_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."quality_standards" ADD CONSTRAINT "quality_standards_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."rag_analytics" ADD CONSTRAINT "rag_analytics_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."regeneration_jobs" ADD CONSTRAINT "regeneration_jobs_conflict_id_fkey" FOREIGN KEY (conflict_id) REFERENCES document_version_conflicts(id) ON DELETE SET NULL;
ALTER TABLE public."regeneration_jobs" ADD CONSTRAINT "regeneration_jobs_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."regeneration_jobs" ADD CONSTRAINT "regeneration_jobs_new_version_id_fkey" FOREIGN KEY (new_version_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."regeneration_jobs" ADD CONSTRAINT "regeneration_jobs_template_id_fkey" FOREIGN KEY (template_id) REFERENCES templates(id);
ALTER TABLE public."regeneration_jobs" ADD CONSTRAINT "regeneration_jobs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public."relationship_health" ADD CONSTRAINT "relationship_health_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."relationship_health" ADD CONSTRAINT "relationship_health_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."relationship_health" ADD CONSTRAINT "relationship_health_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."relationship_health" ADD CONSTRAINT "relationship_health_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."releases" ADD CONSTRAINT "releases_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."releases" ADD CONSTRAINT "releases_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."releases" ADD CONSTRAINT "releases_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."relevance_feedback" ADD CONSTRAINT "relevance_feedback_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."requirements" ADD CONSTRAINT "requirements_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."requirements" ADD CONSTRAINT "requirements_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."requirements" ADD CONSTRAINT "requirements_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."requirements_traceability" ADD CONSTRAINT "requirements_traceability_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."requirements_traceability" ADD CONSTRAINT "requirements_traceability_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."requirements_traceability" ADD CONSTRAINT "requirements_traceability_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."resource_articles" ADD CONSTRAINT "resource_articles_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."resource_articles" ADD CONSTRAINT "resource_articles_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."resource_assignments" ADD CONSTRAINT "resource_assignments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."resource_assignments" ADD CONSTRAINT "resource_assignments_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."resource_assignments" ADD CONSTRAINT "resource_assignments_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."resource_assignments" ADD CONSTRAINT "resource_assignments_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."resource_capacity_settings" ADD CONSTRAINT "resource_capacity_settings_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."resource_capacity_settings" ADD CONSTRAINT "resource_capacity_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."resource_conflicts" ADD CONSTRAINT "resource_conflicts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."resource_conflicts" ADD CONSTRAINT "resource_conflicts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."resource_conflicts" ADD CONSTRAINT "resource_conflicts_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."resource_conflicts" ADD CONSTRAINT "resource_conflicts_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."resource_plans" ADD CONSTRAINT "resource_plans_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."resource_plans" ADD CONSTRAINT "resource_plans_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."resource_plans" ADD CONSTRAINT "resource_plans_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."resource_pool" ADD CONSTRAINT "resource_pool_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."resource_pool" ADD CONSTRAINT "resource_pool_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."resource_pool" ADD CONSTRAINT "resource_pool_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."resource_pool" ADD CONSTRAINT "resource_pool_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."resource_templates" ADD CONSTRAINT "resource_templates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."resource_templates" ADD CONSTRAINT "resource_templates_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."resource_unavailability" ADD CONSTRAINT "resource_unavailability_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE public."resource_unavailability" ADD CONSTRAINT "resource_unavailability_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."resource_unavailability" ADD CONSTRAINT "resource_unavailability_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."resources" ADD CONSTRAINT "resources_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."resources" ADD CONSTRAINT "resources_extracted_from_document_id_fkey" FOREIGN KEY (extracted_from_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."resources" ADD CONSTRAINT "resources_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."resources" ADD CONSTRAINT "resources_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."review_action_items" ADD CONSTRAINT "review_action_items_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."review_action_items" ADD CONSTRAINT "review_action_items_completed_by_fkey" FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."review_action_items" ADD CONSTRAINT "review_action_items_related_program_id_fkey" FOREIGN KEY (related_program_id) REFERENCES programs(id) ON DELETE SET NULL;
ALTER TABLE public."review_action_items" ADD CONSTRAINT "review_action_items_related_project_id_fkey" FOREIGN KEY (related_project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE public."review_action_items" ADD CONSTRAINT "review_action_items_review_meeting_id_fkey" FOREIGN KEY (review_meeting_id) REFERENCES review_meetings(id) ON DELETE CASCADE;
ALTER TABLE public."review_decisions" ADD CONSTRAINT "review_decisions_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."review_decisions" ADD CONSTRAINT "review_decisions_review_meeting_id_fkey" FOREIGN KEY (review_meeting_id) REFERENCES review_meetings(id) ON DELETE CASCADE;
ALTER TABLE public."review_meetings" ADD CONSTRAINT "review_meetings_program_id_fkey" FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
ALTER TABLE public."review_meetings" ADD CONSTRAINT "review_meetings_schedule_id_fkey" FOREIGN KEY (schedule_id) REFERENCES review_schedules(id) ON DELETE CASCADE;
ALTER TABLE public."review_schedules" ADD CONSTRAINT "review_schedules_program_id_fkey" FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
ALTER TABLE public."review_schedules" ADD CONSTRAINT "review_schedules_review_owner_id_fkey" FOREIGN KEY (review_owner_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."risk_appetite" ADD CONSTRAINT "risk_appetite_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."risk_appetite" ADD CONSTRAINT "risk_appetite_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."risk_appetite" ADD CONSTRAINT "risk_appetite_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."risk_assessments" ADD CONSTRAINT "risk_assessments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."risk_assessments" ADD CONSTRAINT "risk_assessments_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."risk_assessments" ADD CONSTRAINT "risk_assessments_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."risk_assessments" ADD CONSTRAINT "risk_assessments_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."risk_checklists" ADD CONSTRAINT "risk_checklists_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."risk_checklists" ADD CONSTRAINT "risk_checklists_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."risk_checklists" ADD CONSTRAINT "risk_checklists_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."risk_escalation_event_steps" ADD CONSTRAINT "risk_escalation_event_steps_completed_by_fkey" FOREIGN KEY (completed_by) REFERENCES users(id);
ALTER TABLE public."risk_escalation_event_steps" ADD CONSTRAINT "risk_escalation_event_steps_event_id_fkey" FOREIGN KEY (event_id) REFERENCES risk_escalation_events(id) ON DELETE CASCADE;
ALTER TABLE public."risk_escalation_event_steps" ADD CONSTRAINT "risk_escalation_event_steps_step_id_fkey" FOREIGN KEY (step_id) REFERENCES risk_escalation_steps(id) ON DELETE CASCADE;
ALTER TABLE public."risk_escalation_events" ADD CONSTRAINT "risk_escalation_events_acknowledged_by_fkey" FOREIGN KEY (acknowledged_by) REFERENCES users(id);
ALTER TABLE public."risk_escalation_events" ADD CONSTRAINT "risk_escalation_events_current_step_id_fkey" FOREIGN KEY (current_step_id) REFERENCES risk_escalation_steps(id);
ALTER TABLE public."risk_escalation_events" ADD CONSTRAINT "risk_escalation_events_policy_id_fkey" FOREIGN KEY (policy_id) REFERENCES risk_escalation_policies(id) ON DELETE RESTRICT;
ALTER TABLE public."risk_escalation_events" ADD CONSTRAINT "risk_escalation_events_portfolio_risk_id_fkey" FOREIGN KEY (portfolio_risk_id) REFERENCES portfolio_risks(id) ON DELETE CASCADE;
ALTER TABLE public."risk_escalation_events" ADD CONSTRAINT "risk_escalation_events_triggered_by_fkey" FOREIGN KEY (triggered_by) REFERENCES users(id);
ALTER TABLE public."risk_escalation_policies" ADD CONSTRAINT "risk_escalation_policies_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."risk_escalation_policies" ADD CONSTRAINT "risk_escalation_policies_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id);
ALTER TABLE public."risk_escalation_steps" ADD CONSTRAINT "risk_escalation_steps_notify_user_id_fkey" FOREIGN KEY (notify_user_id) REFERENCES users(id);
ALTER TABLE public."risk_escalation_steps" ADD CONSTRAINT "risk_escalation_steps_policy_id_fkey" FOREIGN KEY (policy_id) REFERENCES risk_escalation_policies(id) ON DELETE CASCADE;
ALTER TABLE public."risk_metrics" ADD CONSTRAINT "risk_metrics_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."risk_metrics" ADD CONSTRAINT "risk_metrics_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."risk_metrics" ADD CONSTRAINT "risk_metrics_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."risk_metrics" ADD CONSTRAINT "risk_metrics_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."risk_response_plans" ADD CONSTRAINT "risk_response_plans_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."risk_response_plans" ADD CONSTRAINT "risk_response_plans_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."risk_response_plans" ADD CONSTRAINT "risk_response_plans_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."risk_response_plans" ADD CONSTRAINT "risk_response_plans_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."risk_responses" ADD CONSTRAINT "risk_responses_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."risk_responses" ADD CONSTRAINT "risk_responses_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."risk_responses" ADD CONSTRAINT "risk_responses_risk_id_fkey" FOREIGN KEY (risk_id) REFERENCES risks(id) ON DELETE SET NULL;
ALTER TABLE public."risk_responses" ADD CONSTRAINT "risk_responses_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."risk_responses" ADD CONSTRAINT "risk_responses_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."risk_reviews" ADD CONSTRAINT "risk_reviews_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."risk_reviews" ADD CONSTRAINT "risk_reviews_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."risk_reviews" ADD CONSTRAINT "risk_reviews_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."risk_reviews" ADD CONSTRAINT "risk_reviews_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."risk_triggers" ADD CONSTRAINT "risk_triggers_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."risk_triggers" ADD CONSTRAINT "risk_triggers_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."risk_triggers" ADD CONSTRAINT "risk_triggers_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."risk_triggers" ADD CONSTRAINT "risk_triggers_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."risks" ADD CONSTRAINT "risks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."risks" ADD CONSTRAINT "risks_escalated_to_fkey" FOREIGN KEY (escalated_to) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."risks" ADD CONSTRAINT "risks_last_updated_by_fkey" FOREIGN KEY (last_updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."risks" ADD CONSTRAINT "risks_playbook_execution_id_fkey" FOREIGN KEY (playbook_execution_id) REFERENCES playbook_executions(id) ON DELETE SET NULL;
ALTER TABLE public."risks" ADD CONSTRAINT "risks_program_id_fkey" FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL;
ALTER TABLE public."risks" ADD CONSTRAINT "risks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."risks" ADD CONSTRAINT "risks_recommended_playbook_id_fkey" FOREIGN KEY (recommended_playbook_id) REFERENCES operational_playbooks(id) ON DELETE SET NULL;
ALTER TABLE public."risks" ADD CONSTRAINT "risks_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."role_competencies" ADD CONSTRAINT "role_competencies_competency_id_fkey" FOREIGN KEY (competency_id) REFERENCES competencies(id) ON DELETE CASCADE;
ALTER TABLE public."role_competencies" ADD CONSTRAINT "role_competencies_role_id_fkey" FOREIGN KEY (role_id) REFERENCES project_roles(id) ON DELETE CASCADE;
ALTER TABLE public."role_skills" ADD CONSTRAINT "role_skills_role_id_fkey" FOREIGN KEY (role_id) REFERENCES project_roles(id) ON DELETE CASCADE;
ALTER TABLE public."role_skills" ADD CONSTRAINT "role_skills_skill_id_fkey" FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE;
ALTER TABLE public."roles_and_responsibilities" ADD CONSTRAINT "roles_and_responsibilities_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."roles_and_responsibilities" ADD CONSTRAINT "roles_and_responsibilities_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."roles_and_responsibilities" ADD CONSTRAINT "roles_and_responsibilities_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."schedule_activities" ADD CONSTRAINT "schedule_activities_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."schedule_activities" ADD CONSTRAINT "schedule_activities_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."schedule_activities" ADD CONSTRAINT "schedule_activities_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."schedule_baseline" ADD CONSTRAINT "schedule_baseline_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."schedule_baseline" ADD CONSTRAINT "schedule_baseline_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."schedule_baseline" ADD CONSTRAINT "schedule_baseline_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."schedule_baselines" ADD CONSTRAINT "schedule_baselines_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."schedule_baselines" ADD CONSTRAINT "schedule_baselines_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."schedule_baselines" ADD CONSTRAINT "schedule_baselines_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."schedule_baselines" ADD CONSTRAINT "schedule_baselines_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."schedule_forecasts" ADD CONSTRAINT "schedule_forecasts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."schedule_forecasts" ADD CONSTRAINT "schedule_forecasts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."schedule_forecasts" ADD CONSTRAINT "schedule_forecasts_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."schedule_variances" ADD CONSTRAINT "schedule_variances_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."schedule_variances" ADD CONSTRAINT "schedule_variances_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."schedule_variances" ADD CONSTRAINT "schedule_variances_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."scope_baseline" ADD CONSTRAINT "scope_baseline_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."scope_baseline" ADD CONSTRAINT "scope_baseline_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."scope_baseline" ADD CONSTRAINT "scope_baseline_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."scope_baselines" ADD CONSTRAINT "scope_baselines_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."scope_baselines" ADD CONSTRAINT "scope_baselines_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."scope_baselines" ADD CONSTRAINT "scope_baselines_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."scope_baselines" ADD CONSTRAINT "scope_baselines_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."scope_change_requests" ADD CONSTRAINT "scope_change_requests_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."scope_change_requests" ADD CONSTRAINT "scope_change_requests_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."scope_change_requests" ADD CONSTRAINT "scope_change_requests_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."scope_items" ADD CONSTRAINT "scope_items_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."scope_items" ADD CONSTRAINT "scope_items_extracted_from_document_id_fkey" FOREIGN KEY (extracted_from_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."scope_items" ADD CONSTRAINT "scope_items_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."scope_items" ADD CONSTRAINT "scope_items_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."scope_verification" ADD CONSTRAINT "scope_verification_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."scope_verification" ADD CONSTRAINT "scope_verification_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."scope_verification" ADD CONSTRAINT "scope_verification_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."search_analytics" ADD CONSTRAINT "search_analytics_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."search_history" ADD CONSTRAINT "search_history_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE public."search_history" ADD CONSTRAINT "search_history_template_id_fkey" FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL;
ALTER TABLE public."search_history" ADD CONSTRAINT "search_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."search_result_clicks" ADD CONSTRAINT "search_result_clicks_search_id_fkey" FOREIGN KEY (search_id) REFERENCES search_analytics(id) ON DELETE CASCADE;
ALTER TABLE public."search_result_clicks" ADD CONSTRAINT "search_result_clicks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."search_suggestion_clicks" ADD CONSTRAINT "search_suggestion_clicks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."security_events" ADD CONSTRAINT "security_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public."semantic_units" ADD CONSTRAINT "semantic_units_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."signature_audit_logs" ADD CONSTRAINT "signature_audit_logs_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."signature_audit_logs" ADD CONSTRAINT "signature_audit_logs_document_signature_id_fkey" FOREIGN KEY (document_signature_id) REFERENCES document_signatures(id) ON DELETE SET NULL;
ALTER TABLE public."signature_audit_logs" ADD CONSTRAINT "signature_audit_logs_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES users(id);
ALTER TABLE public."signature_audit_logs" ADD CONSTRAINT "signature_audit_logs_signature_field_id_fkey" FOREIGN KEY (signature_field_id) REFERENCES signature_fields(id) ON DELETE SET NULL;
ALTER TABLE public."signature_audit_logs" ADD CONSTRAINT "signature_audit_logs_signature_recipient_id_fkey" FOREIGN KEY (signature_recipient_id) REFERENCES signature_recipients(id) ON DELETE SET NULL;
ALTER TABLE public."signature_fields" ADD CONSTRAINT "signature_fields_approval_request_id_fkey" FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE SET NULL;
ALTER TABLE public."signature_fields" ADD CONSTRAINT "signature_fields_assigned_to_user_id_fkey" FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."signature_fields" ADD CONSTRAINT "signature_fields_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."signature_fields" ADD CONSTRAINT "signature_fields_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."signature_fields" ADD CONSTRAINT "signature_fields_signed_by_fkey" FOREIGN KEY (signed_by) REFERENCES users(id);
ALTER TABLE public."signature_recipients" ADD CONSTRAINT "signature_recipients_document_signature_id_fkey" FOREIGN KEY (document_signature_id) REFERENCES document_signatures(id) ON DELETE CASCADE;
ALTER TABLE public."signature_recipients" ADD CONSTRAINT "signature_recipients_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."sla_violations" ADD CONSTRAINT "sla_violations_template_id_fkey" FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;
ALTER TABLE public."stage_executions" ADD CONSTRAINT "stage_executions_job_id_fkey" FOREIGN KEY (job_id) REFERENCES pipeline_executions(job_id) ON DELETE CASCADE;
ALTER TABLE public."stakeholder_competencies" ADD CONSTRAINT "stakeholder_competencies_competency_id_fkey" FOREIGN KEY (competency_id) REFERENCES competencies(id) ON DELETE CASCADE;
ALTER TABLE public."stakeholder_competencies" ADD CONSTRAINT "stakeholder_competencies_stakeholder_id_fkey" FOREIGN KEY (stakeholder_id) REFERENCES stakeholders(id) ON DELETE CASCADE;
ALTER TABLE public."stakeholder_competencies" ADD CONSTRAINT "stakeholder_competencies_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES users(id);
ALTER TABLE public."stakeholder_engagements" ADD CONSTRAINT "stakeholder_engagements_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."stakeholder_engagements" ADD CONSTRAINT "stakeholder_engagements_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."stakeholder_engagements" ADD CONSTRAINT "stakeholder_engagements_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."stakeholder_issues" ADD CONSTRAINT "stakeholder_issues_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."stakeholder_issues" ADD CONSTRAINT "stakeholder_issues_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."stakeholder_issues" ADD CONSTRAINT "stakeholder_issues_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."stakeholder_issues" ADD CONSTRAINT "stakeholder_issues_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."stakeholder_role_assignments" ADD CONSTRAINT "stakeholder_role_assignments_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES users(id);
ALTER TABLE public."stakeholder_role_assignments" ADD CONSTRAINT "stakeholder_role_assignments_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."stakeholder_role_assignments" ADD CONSTRAINT "stakeholder_role_assignments_role_id_fkey" FOREIGN KEY (role_id) REFERENCES project_roles(id) ON DELETE CASCADE;
ALTER TABLE public."stakeholder_role_assignments" ADD CONSTRAINT "stakeholder_role_assignments_stakeholder_id_fkey" FOREIGN KEY (stakeholder_id) REFERENCES stakeholders(id) ON DELETE CASCADE;
ALTER TABLE public."stakeholder_skills" ADD CONSTRAINT "stakeholder_skills_skill_id_fkey" FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE;
ALTER TABLE public."stakeholder_skills" ADD CONSTRAINT "stakeholder_skills_stakeholder_id_fkey" FOREIGN KEY (stakeholder_id) REFERENCES stakeholders(id) ON DELETE CASCADE;
ALTER TABLE public."stakeholder_skills" ADD CONSTRAINT "stakeholder_skills_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES users(id);
ALTER TABLE public."stakeholders" ADD CONSTRAINT "stakeholders_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."stakeholders" ADD CONSTRAINT "stakeholders_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."stakeholders" ADD CONSTRAINT "stakeholders_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."stakeholders" ADD CONSTRAINT "stakeholders_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id);
ALTER TABLE public."stakeholders" ADD CONSTRAINT "stakeholders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."steering_committees" ADD CONSTRAINT "steering_committees_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."steering_committees" ADD CONSTRAINT "steering_committees_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."steering_committees" ADD CONSTRAINT "steering_committees_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."success_criteria" ADD CONSTRAINT "success_criteria_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."success_criteria" ADD CONSTRAINT "success_criteria_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."success_criteria" ADD CONSTRAINT "success_criteria_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."task_assignments" ADD CONSTRAINT "task_assignments_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES users(id);
ALTER TABLE public."task_assignments" ADD CONSTRAINT "task_assignments_resource_assignment_id_fkey" FOREIGN KEY (resource_assignment_id) REFERENCES project_resource_assignments(id) ON DELETE CASCADE;
ALTER TABLE public."task_assignments" ADD CONSTRAINT "task_assignments_role_id_fkey" FOREIGN KEY (role_id) REFERENCES project_roles(id);
ALTER TABLE public."task_assignments" ADD CONSTRAINT "task_assignments_task_id_fkey" FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE;
ALTER TABLE public."task_assignments" ADD CONSTRAINT "task_assignments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public."task_dependencies" ADD CONSTRAINT "task_dependencies_depends_on_task_id_fkey" FOREIGN KEY (depends_on_task_id) REFERENCES project_tasks(id) ON DELETE CASCADE;
ALTER TABLE public."task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_fkey" FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE;
ALTER TABLE public."task_roles" ADD CONSTRAINT "task_roles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES project_roles(id) ON DELETE CASCADE;
ALTER TABLE public."task_roles" ADD CONSTRAINT "task_roles_task_id_fkey" FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE;
ALTER TABLE public."team_agreement_adherence_log" ADD CONSTRAINT "team_agreement_adherence_log_agreement_id_fkey" FOREIGN KEY (agreement_id) REFERENCES team_agreements(id) ON DELETE CASCADE;
ALTER TABLE public."team_agreement_adherence_log" ADD CONSTRAINT "team_agreement_adherence_log_recorded_by_fkey" FOREIGN KEY (recorded_by) REFERENCES users(id);
ALTER TABLE public."team_agreements" ADD CONSTRAINT "team_agreements_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."team_agreements" ADD CONSTRAINT "team_agreements_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."team_agreements" ADD CONSTRAINT "team_agreements_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."team_agreements" ADD CONSTRAINT "team_agreements_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."team_availability" ADD CONSTRAINT "team_availability_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."team_availability" ADD CONSTRAINT "team_availability_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."team_availability" ADD CONSTRAINT "team_availability_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."technologies" ADD CONSTRAINT "technologies_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."technologies" ADD CONSTRAINT "technologies_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."technologies" ADD CONSTRAINT "technologies_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."template_comparison_metrics" ADD CONSTRAINT "template_comparison_metrics_template_id_a_fkey" FOREIGN KEY (template_id_a) REFERENCES templates(id) ON DELETE CASCADE;
ALTER TABLE public."template_comparison_metrics" ADD CONSTRAINT "template_comparison_metrics_template_id_b_fkey" FOREIGN KEY (template_id_b) REFERENCES templates(id) ON DELETE CASCADE;
ALTER TABLE public."template_entity_profile" ADD CONSTRAINT "template_entity_profile_template_id_fkey" FOREIGN KEY (template_id) REFERENCES templates(id);
ALTER TABLE public."template_improvement_suggestions" ADD CONSTRAINT "template_improvement_suggestions_implemented_by_fkey" FOREIGN KEY (implemented_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."template_improvement_suggestions" ADD CONSTRAINT "template_improvement_suggestions_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."template_improvement_suggestions" ADD CONSTRAINT "template_improvement_suggestions_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id);
ALTER TABLE public."template_improvement_suggestions" ADD CONSTRAINT "template_improvement_suggestions_template_id_fkey" FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;
ALTER TABLE public."template_maintenance_log" ADD CONSTRAINT "template_maintenance_log_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."template_maintenance_log" ADD CONSTRAINT "template_maintenance_log_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."template_maintenance_log" ADD CONSTRAINT "template_maintenance_log_template_id_fkey" FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;
ALTER TABLE public."template_maintenance_log" ADD CONSTRAINT "template_maintenance_log_version_created_fkey" FOREIGN KEY (version_created) REFERENCES template_versions(id) ON DELETE SET NULL;
ALTER TABLE public."template_quality_metrics" ADD CONSTRAINT "template_quality_metrics_template_id_fkey" FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;
ALTER TABLE public."template_status_history" ADD CONSTRAINT "template_status_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES users(id);
ALTER TABLE public."template_status_history" ADD CONSTRAINT "template_status_history_template_id_fkey" FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;
ALTER TABLE public."template_usage" ADD CONSTRAINT "template_usage_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE public."template_usage" ADD CONSTRAINT "template_usage_template_id_fkey" FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;
ALTER TABLE public."template_usage" ADD CONSTRAINT "template_usage_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."template_versions" ADD CONSTRAINT "template_versions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."template_versions" ADD CONSTRAINT "template_versions_improvement_suggestion_id_fkey" FOREIGN KEY (improvement_suggestion_id) REFERENCES template_improvement_suggestions(id) ON DELETE SET NULL;
ALTER TABLE public."template_versions" ADD CONSTRAINT "template_versions_template_id_fkey" FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;
ALTER TABLE public."templates" ADD CONSTRAINT "templates_archived_by_fkey" FOREIGN KEY (archived_by) REFERENCES users(id);
ALTER TABLE public."templates" ADD CONSTRAINT "templates_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public."templates" ADD CONSTRAINT "templates_compliance_checked_by_fkey" FOREIGN KEY (compliance_checked_by) REFERENCES users(id);
ALTER TABLE public."templates" ADD CONSTRAINT "templates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public."templates" ADD CONSTRAINT "templates_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES users(id);
ALTER TABLE public."templates" ADD CONSTRAINT "templates_last_validated_by_fkey" FOREIGN KEY (last_validated_by) REFERENCES users(id);
ALTER TABLE public."time_entries" ADD CONSTRAINT "time_entries_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE public."time_entries" ADD CONSTRAINT "time_entries_assignment_id_fkey" FOREIGN KEY (assignment_id) REFERENCES project_resource_assignments(id);
ALTER TABLE public."time_entries" ADD CONSTRAINT "time_entries_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."time_entries" ADD CONSTRAINT "time_entries_task_assignment_id_fkey" FOREIGN KEY (task_assignment_id) REFERENCES task_assignments(id);
ALTER TABLE public."time_entries" ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public."upload_batches" ADD CONSTRAINT "upload_batches_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE public."upload_batches" ADD CONSTRAINT "upload_batches_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."upload_batches" ADD CONSTRAINT "upload_batches_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."user_activity_logs" ADD CONSTRAINT "user_activity_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."user_analysis" ADD CONSTRAINT "user_analysis_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."user_collaboration_preferences" ADD CONSTRAINT "user_collaboration_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."user_domain_knowledge" ADD CONSTRAINT "user_domain_knowledge_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."user_expertise" ADD CONSTRAINT "user_expertise_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."user_model_preferences" ADD CONSTRAINT "user_model_preferences_preferred_chain_id_fkey" FOREIGN KEY (preferred_chain_id) REFERENCES ai_fallback_chains(id);
ALTER TABLE public."user_model_preferences" ADD CONSTRAINT "user_model_preferences_preferred_model_id_fkey" FOREIGN KEY (preferred_model_id) REFERENCES ai_models(id);
ALTER TABLE public."user_model_preferences" ADD CONSTRAINT "user_model_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."user_search_preferences" ADD CONSTRAINT "user_search_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."user_writing_style" ADD CONSTRAINT "user_writing_style_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE public."users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE public."utilization_records" ADD CONSTRAINT "utilization_records_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."utilization_records" ADD CONSTRAINT "utilization_records_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."utilization_records" ADD CONSTRAINT "utilization_records_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."utilization_records" ADD CONSTRAINT "utilization_records_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."wbs_nodes" ADD CONSTRAINT "wbs_nodes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."wbs_nodes" ADD CONSTRAINT "wbs_nodes_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."wbs_nodes" ADD CONSTRAINT "wbs_nodes_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."work_items" ADD CONSTRAINT "work_items_activity_id_fkey" FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL;
ALTER TABLE public."work_items" ADD CONSTRAINT "work_items_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."work_items" ADD CONSTRAINT "work_items_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."work_items" ADD CONSTRAINT "work_items_source_document_id_fkey" FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public."work_items" ADD CONSTRAINT "work_items_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."workflow_executions" ADD CONSTRAINT "workflow_executions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE public."workflow_executions" ADD CONSTRAINT "workflow_executions_template_id_fkey" FOREIGN KEY (template_id) REFERENCES templates(id);
ALTER TABLE public."workflow_executions" ADD CONSTRAINT "workflow_executions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public."workflow_presets" ADD CONSTRAINT "workflow_presets_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);

-- Indexes
CREATE INDEX idx_action_items_project_id ON public.action_items USING btree (project_id);
CREATE UNIQUE INDEX idx_action_items_idempotency ON public.action_items USING btree (project_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE UNIQUE INDEX activities_project_name_unique ON public.activities USING btree (project_id, activity_name);
CREATE INDEX idx_activities_source_document ON public.activities USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE INDEX idx_activities_source_location ON public.activities USING btree (source_document_id, source_text_start);
-- CREATE UNIQUE INDEX activities_idempotency_key_key ON public.activities USING btree (idempotency_key);
CREATE INDEX idx_activities_idempotency_key ON public.activities USING btree (idempotency_key);
CREATE INDEX idx_ai_fallback_chain_entries_chain ON public.ai_fallback_chain_entries USING btree (chain_id);
CREATE INDEX idx_ai_fallback_chains_task ON public.ai_fallback_chains USING btree (task_type);
CREATE UNIQUE INDEX ai_model_configurations_provider_id_model_id_key ON public.ai_model_configurations USING btree (provider_id, model_id);
CREATE INDEX idx_ai_model_configurations_created_at ON public.ai_model_configurations USING btree (created_at);
CREATE INDEX idx_ai_model_configurations_is_active ON public.ai_model_configurations USING btree (is_active);
CREATE INDEX idx_ai_model_configurations_model_id ON public.ai_model_configurations USING btree (model_id);
CREATE INDEX idx_ai_model_configurations_provider_id ON public.ai_model_configurations USING btree (provider_id);
CREATE UNIQUE INDEX ai_models_provider_id_name_key ON public.ai_models USING btree (provider_id, name);
CREATE INDEX idx_ai_models_provider ON public.ai_models USING btree (provider_id);
CREATE INDEX idx_ai_models_active ON public.ai_models USING btree (is_active);
CREATE INDEX idx_health_metrics_provider ON public.ai_provider_health_metrics USING btree (provider_id);
CREATE INDEX idx_health_metrics_tested ON public.ai_provider_health_metrics USING btree (last_tested DESC);
CREATE INDEX idx_test_results_provider ON public.ai_provider_test_results USING btree (provider_id);
CREATE INDEX idx_test_results_status ON public.ai_provider_test_results USING btree (status);
CREATE INDEX idx_test_results_timestamp ON public.ai_provider_test_results USING btree ("timestamp" DESC);
CREATE INDEX idx_ai_provider_usage_domain ON public.ai_provider_usage USING btree (domain);
CREATE INDEX idx_ai_provider_usage_project ON public.ai_provider_usage USING btree (project_id);
CREATE INDEX idx_ai_provider_usage_provider ON public.ai_provider_usage USING btree (provider_name, model_name);
CREATE INDEX idx_ai_providers_default_model ON public.ai_providers USING btree (default_model);
CREATE INDEX idx_ai_providers_priority ON public.ai_providers USING btree (priority, is_active);
CREATE INDEX idx_ai_providers_type_active ON public.ai_providers USING btree (provider_type, is_active);
CREATE INDEX idx_ai_usage_logs_cost ON public.ai_usage_logs USING btree (estimated_cost DESC);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs USING btree (created_at DESC);
CREATE INDEX idx_ai_usage_logs_document_id ON public.ai_usage_logs USING btree (document_id);
CREATE INDEX idx_ai_usage_logs_project_date ON public.ai_usage_logs USING btree (project_id, created_at DESC);
CREATE INDEX idx_ai_usage_logs_project_id ON public.ai_usage_logs USING btree (project_id);
CREATE INDEX idx_ai_usage_logs_provider_date ON public.ai_usage_logs USING btree (provider_id, created_at DESC);
CREATE INDEX idx_ai_usage_logs_provider_id ON public.ai_usage_logs USING btree (provider_id);
CREATE INDEX idx_ai_usage_logs_provider_type ON public.ai_usage_logs USING btree (provider_type);
CREATE INDEX idx_ai_usage_logs_success ON public.ai_usage_logs USING btree (success);
CREATE INDEX idx_ai_usage_logs_user_date ON public.ai_usage_logs USING btree (user_id, created_at DESC);
CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs USING btree (user_id);
CREATE UNIQUE INDEX analysis_metrics_metric_date_key ON public.analysis_metrics USING btree (metric_date);
CREATE INDEX idx_analysis_metrics_metric_date ON public.analysis_metrics USING btree (metric_date);
CREATE INDEX idx_analytics_events_timestamp ON public.analytics_events USING btree ("timestamp");
CREATE INDEX idx_analytics_events_type ON public.analytics_events USING btree (event_type);
CREATE INDEX idx_analytics_events_user_type ON public.analytics_events USING btree (user_id, event_type);
CREATE INDEX idx_api_logs_created ON public.api_request_logs USING btree (created_at DESC);
CREATE INDEX idx_api_logs_endpoint ON public.api_request_logs USING btree (endpoint, created_at DESC);
CREATE INDEX idx_api_logs_status ON public.api_request_logs USING btree (status_code, created_at DESC);
CREATE INDEX idx_api_logs_user ON public.api_request_logs USING btree (user_id, created_at DESC);
CREATE INDEX idx_approval_audit_action ON public.approval_audit_log USING btree (action_type);
CREATE INDEX idx_approval_audit_created ON public.approval_audit_log USING btree (created_at DESC);
CREATE INDEX idx_approval_audit_request ON public.approval_audit_log USING btree (approval_request_id);
CREATE INDEX idx_approval_audit_step ON public.approval_audit_log USING btree (approval_step_id);
CREATE INDEX idx_approval_escalations_escalated_at ON public.approval_escalations USING btree (escalated_at DESC);
CREATE INDEX idx_approval_escalations_request ON public.approval_escalations USING btree (approval_request_id);
CREATE INDEX idx_approval_escalations_status ON public.approval_escalations USING btree (resolution_status);
CREATE INDEX idx_approval_notifications_recipient ON public.approval_notifications USING btree (recipient_user_id);
CREATE INDEX idx_approval_notifications_request ON public.approval_notifications USING btree (approval_request_id);
CREATE INDEX idx_approval_notifications_sent ON public.approval_notifications USING btree (sent_at DESC);
CREATE INDEX idx_approval_notifications_status ON public.approval_notifications USING btree (status);
CREATE INDEX idx_approval_requests_cr ON public.approval_requests USING btree (change_request_id);
CREATE INDEX idx_approval_requests_created_at ON public.approval_requests USING btree (created_at DESC);
CREATE INDEX idx_approval_requests_drift ON public.approval_requests USING btree (drift_record_id);
CREATE INDEX idx_approval_requests_priority ON public.approval_requests USING btree (priority);
CREATE INDEX idx_approval_requests_project ON public.approval_requests USING btree (project_id);
CREATE INDEX idx_approval_requests_requested_by ON public.approval_requests USING btree (requested_by);
CREATE INDEX idx_approval_requests_sla ON public.approval_requests USING btree (sla_deadline) WHERE ((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('in_progress'::character varying)::text]));
CREATE INDEX idx_approval_requests_status ON public.approval_requests USING btree (status);
CREATE UNIQUE INDEX approval_steps_approval_request_id_step_order_key ON public.approval_steps USING btree (approval_request_id, step_order);
CREATE INDEX idx_approval_steps_approver ON public.approval_steps USING btree (approver_user_id);
CREATE INDEX idx_approval_steps_request ON public.approval_steps USING btree (approval_request_id);
CREATE INDEX idx_approval_steps_role ON public.approval_steps USING btree (approver_role);
CREATE INDEX idx_approval_steps_status ON public.approval_steps USING btree (status);
CREATE INDEX idx_approval_workflows_project_id ON public.approval_workflows USING btree (project_id);
CREATE INDEX idx_assessments_assessment_data ON public.assessments USING gin (assessment_data);
CREATE INDEX idx_assessments_batch_id ON public.assessments USING btree (batch_id);
CREATE INDEX idx_assessments_company_id ON public.assessments USING btree (company_id);
CREATE INDEX idx_assessments_created_at ON public.assessments USING btree (created_at DESC);
CREATE INDEX idx_assessments_project_id ON public.assessments USING btree (project_id);
CREATE INDEX idx_assessments_status ON public.assessments USING btree (status);
CREATE INDEX idx_audit_action ON public.audit_log USING btree (action, occurred_at DESC);
CREATE INDEX idx_audit_table_row ON public.audit_log USING btree (table_name, row_id, occurred_at DESC);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);
CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);
CREATE INDEX idx_audit_logs_user_action ON public.audit_logs USING btree (user_id, action);
CREATE INDEX idx_baseline_comparisons_baseline ON public.baseline_comparisons USING btree (baseline_id);
CREATE INDEX idx_baseline_comparisons_compared ON public.baseline_comparisons USING btree (compared_at DESC);
CREATE INDEX idx_baseline_comparisons_drift ON public.baseline_comparisons USING btree (drift_detected, drift_severity);
CREATE INDEX idx_compliance_reviews_baseline ON public.baseline_compliance_reviews USING btree (baseline_id);
CREATE INDEX idx_compliance_reviews_status ON public.baseline_compliance_reviews USING btree (review_status);
CREATE INDEX idx_compliance_reviews_type ON public.baseline_compliance_reviews USING btree (review_type);
CREATE UNIQUE INDEX unique_baseline_component ON public.baseline_components USING btree (baseline_id, component_type, title);
CREATE INDEX idx_baseline_components_baseline_id ON public.baseline_components USING btree (baseline_id);
CREATE INDEX idx_baseline_components_source_document ON public.baseline_components USING btree (source_document_id);
CREATE INDEX idx_baseline_components_type ON public.baseline_components USING btree (component_type);
CREATE INDEX idx_baseline_drift_baseline_id ON public.baseline_drift_detection USING btree (baseline_id);
CREATE INDEX idx_baseline_drift_detection_date ON public.baseline_drift_detection USING btree (detection_date);
CREATE INDEX idx_baseline_drift_project_id ON public.baseline_drift_detection USING btree (project_id);
CREATE INDEX idx_baseline_drift_severity ON public.baseline_drift_detection USING btree (drift_severity);
CREATE INDEX idx_baseline_drift_status ON public.baseline_drift_detection USING btree (status);
CREATE INDEX idx_baseline_drift_type ON public.baseline_drift_detection USING btree (detection_type);
CREATE UNIQUE INDEX unique_baseline_version ON public.baseline_versions USING btree (baseline_id, version_number);
CREATE INDEX idx_baseline_versions_baseline_id ON public.baseline_versions USING btree (baseline_id);
CREATE INDEX idx_baseline_versions_changed_at ON public.baseline_versions USING btree (changed_at);
CREATE INDEX idx_batch_files_batch_id ON public.batch_files USING btree (batch_id);
CREATE INDEX idx_batch_files_file_id ON public.batch_files USING btree (file_id);
CREATE INDEX idx_batch_files_status ON public.batch_files USING btree (status);
CREATE INDEX idx_benefit_realization_project_id ON public.benefit_realization_plan USING btree (project_id);
CREATE UNIQUE INDEX best_practices_project_title_unique ON public.best_practices USING btree (project_id, title);
CREATE INDEX idx_best_practices_project_id ON public.best_practices USING btree (project_id);
CREATE INDEX idx_best_practices_source_document ON public.best_practices USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE INDEX idx_best_practices_source_location ON public.best_practices USING btree (source_document_id, source_text_start);
CREATE INDEX idx_budget_baseline_project_id ON public.budget_baseline USING btree (project_id);
CREATE UNIQUE INDEX idx_budget_baseline_idempotency ON public.budget_baseline USING btree (project_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE UNIQUE INDEX budget_baselines_project_id_baseline_name_baseline_version_key ON public.budget_baselines USING btree (project_id, baseline_name, baseline_version);
CREATE INDEX idx_budget_baselines_current ON public.budget_baselines USING btree (project_id, is_current) WHERE (is_current = true);
CREATE INDEX idx_budget_baselines_project_id ON public.budget_baselines USING btree (project_id);
CREATE INDEX idx_budget_baselines_status ON public.budget_baselines USING btree (status);
CREATE UNIQUE INDEX budget_baselines_idempotency_key_key ON public.budget_baselines USING btree (idempotency_key);
CREATE INDEX idx_budget_baselines_idempotency_key ON public.budget_baselines USING btree (idempotency_key);
CREATE INDEX idx_business_case_details_project_id ON public.business_case_details USING btree (project_id);
CREATE UNIQUE INDEX capacity_forecasts_project_id_forecast_date_role_skill_leve_key ON public.capacity_forecasts USING btree (project_id, forecast_date, role, skill_level);
CREATE INDEX idx_capacity_forecasts_date ON public.capacity_forecasts USING btree (forecast_date);
CREATE INDEX idx_capacity_forecasts_project_id ON public.capacity_forecasts USING btree (project_id);
CREATE INDEX idx_capacity_forecasts_role ON public.capacity_forecasts USING btree (role);
CREATE UNIQUE INDEX capacity_plans_project_id_team_member_period_start_period_e_key ON public.capacity_plans USING btree (project_id, team_member, period_start, period_end);
CREATE INDEX idx_capacity_plans_project_id ON public.capacity_plans USING btree (project_id);
CREATE INDEX idx_capacity_plans_source_document ON public.capacity_plans USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE INDEX idx_change_control_boards_project_id ON public.change_control_boards USING btree (project_id);
CREATE INDEX idx_checklist_items_assigned_user ON public.checklist_items USING btree (assigned_user_id);
CREATE INDEX idx_checklist_items_completed ON public.checklist_items USING btree (is_completed);
CREATE INDEX idx_checklist_items_due_date ON public.checklist_items USING btree (due_date);
CREATE INDEX idx_checklist_items_sequence ON public.checklist_items USING btree (task_id, sequence_order);
CREATE INDEX idx_checklist_items_task ON public.checklist_items USING btree (task_id);
CREATE INDEX idx_communication_logs_project_id ON public.communication_logs USING btree (project_id);
CREATE UNIQUE INDEX competencies_name_key ON public.competencies USING btree (name);
CREATE INDEX idx_competencies_category ON public.competencies USING btree (category);
CREATE INDEX idx_competencies_name ON public.competencies USING btree (name);
CREATE UNIQUE INDEX unique_project_compliance_security ON public.compliance_security USING btree (project_id, title);
CREATE INDEX idx_compliance_security_category ON public.compliance_security USING btree (category);
CREATE INDEX idx_compliance_security_created_at ON public.compliance_security USING btree (created_at);
CREATE INDEX idx_compliance_security_project_id ON public.compliance_security USING btree (project_id);
CREATE INDEX idx_compliance_security_source_document_id ON public.compliance_security USING btree (source_document_id);
CREATE INDEX idx_compliance_security_status ON public.compliance_security USING btree (status);
CREATE INDEX idx_compliance_security_type ON public.compliance_security USING btree (type);
CREATE INDEX idx_compression_feedback_created_at ON public.compression_feedback USING btree (created_at);
CREATE INDEX idx_compression_feedback_document_id ON public.compression_feedback USING btree (document_id);
CREATE INDEX idx_compression_feedback_method ON public.compression_feedback USING btree (compression_method);
CREATE INDEX idx_compression_metrics_created_at ON public.compression_metrics USING btree (created_at DESC);
CREATE INDEX idx_compression_metrics_document_id ON public.compression_metrics USING btree (document_id);
CREATE INDEX idx_compression_metrics_strategy ON public.compression_metrics USING btree (strategy_used);
CREATE UNIQUE INDEX compression_strategies_method_key ON public.compression_strategies USING btree (method);
CREATE INDEX idx_compression_strategies_document_type ON public.compression_strategies USING btree (document_type);
CREATE INDEX idx_compression_strategies_method ON public.compression_strategies USING btree (method);
CREATE INDEX idx_compression_strategies_project_type ON public.compression_strategies USING btree (project_type);
CREATE UNIQUE INDEX constraints_project_name_unique ON public.constraints USING btree (project_id, name);
CREATE INDEX idx_constraints_impact ON public.constraints USING btree (impact);
CREATE INDEX idx_constraints_project_id ON public.constraints USING btree (project_id);
CREATE INDEX idx_constraints_source_document ON public.constraints USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE INDEX idx_constraints_source_location ON public.constraints USING btree (source_document_id, source_text_start);
CREATE UNIQUE INDEX constraints_idempotency_key_key ON public.constraints USING btree (idempotency_key);
CREATE INDEX idx_constraints_idempotency_key ON public.constraints USING btree (idempotency_key);
CREATE INDEX idx_context_bundles_created_at ON public.context_bundles USING btree (created_at);
CREATE INDEX idx_context_bundles_metadata ON public.context_bundles USING gin (metadata);
CREATE INDEX idx_context_bundles_project_id ON public.context_bundles USING btree (project_id);
CREATE INDEX idx_context_bundles_results ON public.context_bundles USING gin (results);
CREATE INDEX idx_context_bundles_template_id ON public.context_bundles USING btree (template_id);
CREATE INDEX idx_context_bundles_updated_at ON public.context_bundles USING btree (updated_at);
CREATE INDEX idx_context_bundles_user_id ON public.context_bundles USING btree (user_id);
CREATE UNIQUE INDEX context_cleanup_results_cleanup_id_key ON public.context_cleanup_results USING btree (cleanup_id);
CREATE INDEX idx_context_cleanup_results_cleanup_id ON public.context_cleanup_results USING btree (cleanup_id);
CREATE INDEX idx_context_cleanup_results_started_at ON public.context_cleanup_results USING btree (started_at);
CREATE INDEX idx_context_freshness_assessments_assessed_at ON public.context_freshness_assessments USING btree (assessed_at);
CREATE INDEX idx_context_freshness_assessments_context_id ON public.context_freshness_assessments USING btree (context_id);
CREATE INDEX idx_context_freshness_assessments_freshness_score ON public.context_freshness_assessments USING btree (freshness_score);
CREATE INDEX idx_context_freshness_assessments_staleness_level ON public.context_freshness_assessments USING btree (staleness_level);
CREATE UNIQUE INDEX context_freshness_metrics_metric_date_key ON public.context_freshness_metrics USING btree (metric_date);
CREATE INDEX idx_context_freshness_metrics_metric_date ON public.context_freshness_metrics USING btree (metric_date);
CREATE UNIQUE INDEX context_freshness_policies_policy_id_key ON public.context_freshness_policies USING btree (policy_id);
CREATE INDEX idx_context_freshness_policies_enabled ON public.context_freshness_policies USING btree (enabled);
CREATE INDEX idx_context_freshness_policies_policy_id ON public.context_freshness_policies USING btree (policy_id);
CREATE INDEX idx_context_freshness_policy_evaluations_evaluated_at ON public.context_freshness_policy_evaluations USING btree (evaluated_at);
CREATE INDEX idx_context_freshness_policy_evaluations_policy_id ON public.context_freshness_policy_evaluations USING btree (policy_id);
CREATE INDEX idx_context_freshness_policy_results_applied_at ON public.context_freshness_policy_results USING btree (applied_at);
CREATE INDEX idx_context_freshness_policy_results_context_id ON public.context_freshness_policy_results USING btree (context_id);
CREATE INDEX idx_context_freshness_policy_results_policy_id ON public.context_freshness_policy_results USING btree (policy_id);
CREATE INDEX idx_context_freshness_trends_context_id ON public.context_freshness_trends USING btree (context_id);
CREATE INDEX idx_context_freshness_trends_timeframe ON public.context_freshness_trends USING btree (timeframe);
CREATE INDEX idx_context_gathering_metrics_created_at ON public.context_gathering_metrics USING btree (created_at);
CREATE INDEX idx_context_gathering_metrics_request_id ON public.context_gathering_metrics USING btree (request_id);
CREATE INDEX idx_context_injection_metrics_bundle_id ON public.context_injection_metrics USING btree (bundle_id);
CREATE INDEX idx_context_injection_metrics_created_at ON public.context_injection_metrics USING btree (created_at);
CREATE INDEX idx_context_injection_metrics_project_id ON public.context_injection_metrics USING btree (project_id);
CREATE INDEX idx_context_injection_metrics_template_id ON public.context_injection_metrics USING btree (template_id);
CREATE INDEX idx_context_injection_metrics_user_id ON public.context_injection_metrics USING btree (user_id);
CREATE INDEX idx_context_items_expires_at ON public.context_items USING btree (expires_at);
CREATE INDEX idx_context_items_freshness_score ON public.context_items USING btree (freshness_score);
CREATE INDEX idx_context_items_is_stale ON public.context_items USING btree (is_stale);
CREATE INDEX idx_context_items_last_accessed_at ON public.context_items USING btree (last_accessed_at);
CREATE INDEX idx_context_items_type ON public.context_items USING btree (type);
CREATE INDEX idx_context_items_updated_at ON public.context_items USING btree (updated_at);
CREATE INDEX idx_context_refresh_results_context_id ON public.context_refresh_results USING btree (context_id);
CREATE INDEX idx_context_refresh_results_refreshed_at ON public.context_refresh_results USING btree (refreshed_at);
CREATE INDEX idx_context_refresh_results_success ON public.context_refresh_results USING btree (success);
CREATE UNIQUE INDEX context_refresh_schedules_schedule_id_key ON public.context_refresh_schedules USING btree (schedule_id);
CREATE INDEX idx_context_refresh_schedules_context_id ON public.context_refresh_schedules USING btree (context_id);
CREATE INDEX idx_context_refresh_schedules_enabled ON public.context_refresh_schedules USING btree (enabled);
CREATE INDEX idx_context_refresh_schedules_next_execution ON public.context_refresh_schedules USING btree (next_execution);
CREATE INDEX idx_context_refresh_schedules_schedule_type ON public.context_refresh_schedules USING btree (schedule_type);
CREATE UNIQUE INDEX context_retrieval_metrics_metric_date_key ON public.context_retrieval_metrics USING btree (metric_date);
CREATE INDEX idx_context_retrieval_metrics_metric_date ON public.context_retrieval_metrics USING btree (metric_date);
CREATE INDEX idx_context_source_logs_retrieval_timestamp ON public.context_source_logs USING btree (retrieval_timestamp);
CREATE INDEX idx_context_source_logs_source_id ON public.context_source_logs USING btree (source_id);
CREATE INDEX idx_context_source_logs_source_type ON public.context_source_logs USING btree (source_type);
CREATE INDEX idx_context_source_logs_success ON public.context_source_logs USING btree (success);
CREATE INDEX idx_context_staleness_log_action ON public.context_staleness_log USING btree (action);
CREATE INDEX idx_context_staleness_log_context_id ON public.context_staleness_log USING btree (context_id);
CREATE INDEX idx_context_staleness_log_performed_at ON public.context_staleness_log USING btree (performed_at);
CREATE UNIQUE INDEX contingency_reserves_project_id_reserve_id_key ON public.contingency_reserves USING btree (project_id, reserve_id);
CREATE INDEX idx_contingency_reserves_project_id ON public.contingency_reserves USING btree (project_id);
CREATE INDEX idx_contingency_reserves_status ON public.contingency_reserves USING btree (status);
CREATE INDEX idx_contingency_reserves_type ON public.contingency_reserves USING btree (reserve_type);
CREATE INDEX idx_cost_actuals_category ON public.cost_actuals USING btree (category);
CREATE INDEX idx_cost_actuals_period ON public.cost_actuals USING btree (period_start_date, period_end_date);
CREATE INDEX idx_cost_actuals_project_id ON public.cost_actuals USING btree (project_id);
CREATE INDEX idx_cost_actuals_wbs ON public.cost_actuals USING btree (wbs_code);
CREATE UNIQUE INDEX cost_categories_category_code_key ON public.cost_categories USING btree (category_code);
CREATE UNIQUE INDEX cost_categories_organization_id_name_key ON public.cost_categories USING btree (organization_id, name);
CREATE INDEX idx_cost_categories_active ON public.cost_categories USING btree (is_active);
CREATE INDEX idx_cost_categories_order ON public.cost_categories USING btree (display_order);
CREATE INDEX idx_cost_categories_type ON public.cost_categories USING btree (category_type);
CREATE INDEX idx_cost_estimates_project_id ON public.cost_estimates USING btree (project_id);
CREATE UNIQUE INDEX idx_cost_estimates_idempotency ON public.cost_estimates USING btree (project_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX idx_cost_estimates_idempotency_key ON public.cost_estimates USING btree (idempotency_key);
CREATE INDEX idx_critical_path_project_id ON public.critical_path USING btree (project_id);
CREATE UNIQUE INDEX critical_path_activities_project_id_activity_id_key ON public.critical_path_activities USING btree (project_id, activity_id);
CREATE INDEX idx_critical_path_activities_project_id ON public.critical_path_activities USING btree (project_id);
CREATE INDEX idx_critical_path_activities_sequence ON public.critical_path_activities USING btree (project_id, path_sequence);
CREATE UNIQUE INDEX daily_statistics_date_key ON public.daily_statistics USING btree (date);
CREATE INDEX idx_daily_stats_date ON public.daily_statistics USING btree (date DESC);
CREATE UNIQUE INDEX deliverable_acceptance_project_id_deliverable_name_reviewer_key ON public.deliverable_acceptance USING btree (project_id, deliverable_name, reviewer);
CREATE INDEX idx_deliverable_acceptance_project ON public.deliverable_acceptance USING btree (project_id);
CREATE INDEX idx_deliverable_acceptance_status ON public.deliverable_acceptance USING btree (status);
CREATE UNIQUE INDEX deliverables_project_name_unique ON public.deliverables USING btree (project_id, name);
CREATE INDEX idx_deliverables_source_document ON public.deliverables USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE INDEX idx_deliverables_source_location ON public.deliverables USING btree (source_document_id, source_text_start);
CREATE UNIQUE INDEX deliverables_idempotency_key_key ON public.deliverables USING btree (idempotency_key);
CREATE INDEX idx_deliverables_idempotency_key ON public.deliverables USING btree (idempotency_key);
CREATE UNIQUE INDEX development_approach_project_id_key ON public.development_approach USING btree (project_id);
CREATE INDEX idx_dev_approach_methodology ON public.development_approach USING btree (approach, methodology);
CREATE INDEX idx_dev_approach_project ON public.development_approach USING btree (project_id);
CREATE INDEX idx_development_approaches_project_id ON public.development_approaches USING btree (project_id);
CREATE UNIQUE INDEX idx_development_approaches_unique ON public.development_approaches USING btree (project_id, approach, COALESCE(framework, ''::text));
CREATE UNIQUE INDEX digital_twin_asset_states_asset_id_state_version_key ON public.digital_twin_asset_states USING btree (asset_id, state_version);
CREATE INDEX idx_dt_states_asset_current ON public.digital_twin_asset_states USING btree (asset_id, is_current) WHERE (is_current = true);
CREATE INDEX idx_dt_states_asset_id ON public.digital_twin_asset_states USING btree (asset_id);
CREATE INDEX idx_dt_states_event_id ON public.digital_twin_asset_states USING btree (source_event_id);
CREATE INDEX idx_dt_states_snapshot_gin ON public.digital_twin_asset_states USING gin (state_snapshot);
CREATE INDEX idx_dt_states_timestamp ON public.digital_twin_asset_states USING btree ("timestamp" DESC);
CREATE INDEX idx_dt_assets_asset_type ON public.digital_twin_assets USING btree (asset_type);
CREATE INDEX idx_dt_assets_company_id ON public.digital_twin_assets USING btree (company_id);
CREATE INDEX idx_dt_assets_metadata_gin ON public.digital_twin_assets USING gin (metadata);
CREATE INDEX idx_dt_assets_platform ON public.digital_twin_assets USING btree (platform_type, external_id);
CREATE UNIQUE INDEX idx_dt_assets_platform_unique ON public.digital_twin_assets USING btree (external_id, platform_type, COALESCE(platform_instance_url, ''::text));
CREATE INDEX idx_dt_assets_project_id ON public.digital_twin_assets USING btree (project_id);
CREATE INDEX idx_dt_assets_source_document_id ON public.digital_twin_assets USING btree (source_document_id);
CREATE INDEX idx_dt_assets_source_entity_id ON public.digital_twin_assets USING btree (source_entity_id);
CREATE INDEX idx_dt_assets_sync_status ON public.digital_twin_assets USING btree (sync_status) WHERE ((sync_status)::text = 'active'::text);
CREATE INDEX idx_dt_triggers_asset_id ON public.digital_twin_document_triggers USING btree (asset_id);
CREATE INDEX idx_dt_triggers_event_id ON public.digital_twin_document_triggers USING btree (event_id);
CREATE INDEX idx_dt_triggers_status ON public.digital_twin_document_triggers USING btree (status) WHERE ((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('processing'::character varying)::text]));
CREATE INDEX idx_dt_triggers_template_id ON public.digital_twin_document_triggers USING btree (template_id);
CREATE INDEX idx_dt_triggers_triggered_at ON public.digital_twin_document_triggers USING btree (triggered_at DESC);
CREATE UNIQUE INDEX digital_twin_events_platform_event_id_platform_type_asset_i_key ON public.digital_twin_events USING btree (platform_event_id, platform_type, asset_id);
CREATE INDEX idx_dt_events_asset_id ON public.digital_twin_events USING btree (asset_id);
CREATE INDEX idx_dt_events_ingested ON public.digital_twin_events USING btree (ingested_at DESC);
CREATE INDEX idx_dt_events_payload_gin ON public.digital_twin_events USING gin (event_payload);
CREATE INDEX idx_dt_events_status ON public.digital_twin_events USING btree (processing_status) WHERE ((processing_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('processing'::character varying)::text]));
CREATE INDEX idx_dt_events_timestamp ON public.digital_twin_events USING btree (event_timestamp DESC);
CREATE INDEX idx_dt_events_type ON public.digital_twin_events USING btree (event_type);
CREATE INDEX idx_dt_sources_active ON public.digital_twin_ingestion_sources USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_dt_sources_project_id ON public.digital_twin_ingestion_sources USING btree (project_id);
CREATE INDEX idx_dt_rules_active ON public.digital_twin_trigger_rules USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_dt_rules_project_id ON public.digital_twin_trigger_rules USING btree (project_id);
CREATE INDEX idx_document_analysis_analysis_type ON public.document_analysis USING btree (analysis_type);
CREATE INDEX idx_document_analysis_analyzed_at ON public.document_analysis USING btree (analyzed_at);
CREATE INDEX idx_document_analysis_compliance_score ON public.document_analysis USING btree (compliance_score);
CREATE INDEX idx_document_analysis_document_id ON public.document_analysis USING btree (document_id);
CREATE UNIQUE INDEX document_analytics_document_id_key ON public.document_analytics USING btree (document_id);
CREATE INDEX idx_doc_analytics_edits ON public.document_analytics USING btree (edit_count DESC);
CREATE INDEX idx_doc_analytics_project ON public.document_analytics USING btree (project_id);
CREATE INDEX idx_doc_analytics_views ON public.document_analytics USING btree (view_count DESC);
CREATE INDEX idx_document_audit_trail_action_type ON public.document_audit_trail USING btree (action_type);
CREATE INDEX idx_document_audit_trail_document_id ON public.document_audit_trail USING btree (document_id);
CREATE INDEX idx_document_audit_trail_event_type ON public.document_audit_trail USING btree (event_type);
CREATE INDEX idx_document_audit_trail_performed_by ON public.document_audit_trail USING btree (performed_by);
CREATE INDEX idx_document_audit_trail_user_id ON public.document_audit_trail USING btree (user_id);
CREATE INDEX document_chunks_embedding_idx ON public.document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');
CREATE INDEX doc_entities_doc_idx ON public.document_entities USING btree (document_id);
CREATE INDEX idx_document_entities_document_id ON public.document_entities USING btree (document_id);
CREATE INDEX idx_document_entities_entity ON public.document_entities USING btree (entity);
CREATE INDEX idx_document_entities_type ON public.document_entities USING btree (type) WHERE (type IS NOT NULL);
CREATE UNIQUE INDEX uq_document_integration ON public.document_integrations USING btree (document_id, integration_type);
CREATE INDEX idx_document_integrations_document_id ON public.document_integrations USING btree (document_id);
CREATE INDEX idx_document_integrations_integration_type ON public.document_integrations USING btree (integration_type);
CREATE INDEX idx_document_integrations_external_id ON public.document_integrations USING btree (external_id);
CREATE INDEX idx_document_integrations_sync_status ON public.document_integrations USING btree (sync_status);
CREATE UNIQUE INDEX document_jira_links_document_id_integration_id_key ON public.document_jira_links USING btree (document_id, integration_id);
CREATE INDEX idx_document_jira_links_document_id ON public.document_jira_links USING btree (document_id);
CREATE INDEX idx_document_jira_links_integration_id ON public.document_jira_links USING btree (integration_id);
CREATE INDEX idx_document_jira_links_jira_issue_key ON public.document_jira_links USING btree (jira_issue_key);
CREATE INDEX idx_document_jira_links_project_id ON public.document_jira_links USING btree (project_id);
CREATE INDEX idx_document_pattern_analysis_analyzed_at ON public.document_pattern_analysis USING btree (analyzed_at);
CREATE INDEX idx_document_pattern_analysis_document_id ON public.document_pattern_analysis USING btree (document_id);
CREATE INDEX idx_document_pattern_analysis_pattern_confidence ON public.document_pattern_analysis USING btree (pattern_confidence);
CREATE INDEX idx_document_patterns_category ON public.document_patterns USING btree (category);
CREATE INDEX idx_document_patterns_framework ON public.document_patterns USING btree (framework);
CREATE INDEX idx_document_patterns_pattern_type ON public.document_patterns USING btree (pattern_type);
CREATE INDEX idx_document_pmbok7_refs_document ON public.document_pmbok7_principle_refs USING btree (document_id);
CREATE INDEX idx_document_pmbok7_refs_principle ON public.document_pmbok7_principle_refs USING btree (principle_id);
CREATE INDEX idx_document_pmbok7_refs_type ON public.document_pmbok7_principle_refs USING btree (reference_type);
CREATE UNIQUE INDEX document_processing_history_history_id_key ON public.document_processing_history USING btree (history_id);
CREATE INDEX idx_document_processing_history_created_at ON public.document_processing_history USING btree (created_at);
CREATE INDEX idx_document_processing_history_history_id ON public.document_processing_history USING btree (history_id);
CREATE INDEX idx_document_processing_history_project_id ON public.document_processing_history USING btree (project_id);
CREATE INDEX idx_document_processing_history_request_id ON public.document_processing_history USING btree (request_id);
CREATE INDEX idx_document_processing_history_status ON public.document_processing_history USING btree (status);
CREATE INDEX idx_document_processing_history_template_id ON public.document_processing_history USING btree (template_id);
CREATE INDEX idx_document_processing_history_user_id ON public.document_processing_history USING btree (user_id);
CREATE UNIQUE INDEX document_processing_jobs_job_id_key ON public.document_processing_jobs USING btree (job_id);
CREATE INDEX idx_document_processing_jobs_created_at ON public.document_processing_jobs USING btree (created_at);
CREATE INDEX idx_document_processing_jobs_job_id ON public.document_processing_jobs USING btree (job_id);
CREATE INDEX idx_document_processing_jobs_project_id ON public.document_processing_jobs USING btree (project_id);
CREATE INDEX idx_document_processing_jobs_request_id ON public.document_processing_jobs USING btree (request_id);
CREATE INDEX idx_document_processing_jobs_status ON public.document_processing_jobs USING btree (status);
CREATE INDEX idx_document_processing_jobs_template_id ON public.document_processing_jobs USING btree (template_id);
CREATE INDEX idx_document_processing_jobs_user_id ON public.document_processing_jobs USING btree (user_id);
CREATE INDEX idx_document_quality_metrics_document_id ON public.document_quality_metrics USING btree (document_id);
CREATE INDEX idx_document_quality_metrics_overall_score ON public.document_quality_metrics USING btree (overall_score);
CREATE INDEX idx_document_signatures_request_id ON public.document_signatures USING btree (signature_request_id);
CREATE INDEX idx_document_signatures_status ON public.document_signatures USING btree (status);
CREATE INDEX idx_document_signatures_approval_request ON public.document_signatures USING btree (approval_request_id) WHERE (approval_request_id IS NOT NULL);
CREATE INDEX idx_document_signatures_document_id ON public.document_signatures USING btree (document_id);
CREATE INDEX idx_document_signatures_initiated_by ON public.document_signatures USING btree (initiated_by);
CREATE UNIQUE INDEX document_summaries_unique_cache_v2 ON public.document_summaries USING btree (document_id, compression_level, compression_method, template_context_hash);
CREATE INDEX idx_document_summaries_document_id ON public.document_summaries USING btree (document_id);
CREATE INDEX idx_document_summaries_hash ON public.document_summaries USING btree (template_context_hash) WHERE (template_context_hash IS NOT NULL);
CREATE INDEX idx_document_summaries_method ON public.document_summaries USING btree (compression_method);
CREATE INDEX idx_document_summaries_reuse ON public.document_summaries USING btree (times_reused DESC);
CREATE INDEX idx_document_summaries_valid ON public.document_summaries USING btree (is_valid) WHERE (is_valid = true);
CREATE UNIQUE INDEX document_tags_document_id_tag_key ON public.document_tags USING btree (document_id, tag);
CREATE INDEX idx_document_tags_document_id ON public.document_tags USING btree (document_id);
CREATE INDEX idx_document_tags_tag ON public.document_tags USING btree (tag);
CREATE INDEX idx_conflicts_document_id ON public.document_version_conflicts USING btree (document_id);
CREATE INDEX idx_conflicts_existing_version_id ON public.document_version_conflicts USING btree (existing_version_id);
CREATE INDEX idx_conflicts_template_id ON public.document_version_conflicts USING btree (template_id);
CREATE UNIQUE INDEX document_versions_document_id_version_key ON public.document_versions USING btree (document_id, version);
CREATE INDEX idx_document_versions_created_at ON public.document_versions USING btree (created_at DESC);
CREATE INDEX idx_document_versions_document_id ON public.document_versions USING btree (document_id);
CREATE INDEX idx_document_versions_semantic_version ON public.document_versions USING btree (document_id, semantic_version);
CREATE INDEX idx_document_versions_version ON public.document_versions USING btree (version);
CREATE UNIQUE INDEX documents_external_unique ON public.documents USING btree (external_id, external_source);
CREATE UNIQUE INDEX unique_sharepoint_file_id ON public.documents USING btree (sharepoint_file_id);
CREATE INDEX idx_documents_comments ON public.documents USING gin (comments);
CREATE INDEX idx_documents_company_id ON public.documents USING btree (company_id);
CREATE INDEX idx_documents_confluence_page_url ON public.documents USING btree (confluence_page_url);
CREATE INDEX idx_documents_content_metrics ON public.documents USING btree (word_count, character_count, sentence_count, paragraph_count);
CREATE INDEX idx_documents_created_at ON public.documents USING btree (created_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_documents_created_by ON public.documents USING btree (created_by);
CREATE INDEX idx_documents_deleted ON public.documents USING btree (deleted_at DESC) WHERE (deleted_at IS NOT NULL);
CREATE INDEX idx_documents_external_id ON public.documents USING btree (external_id);
CREATE INDEX idx_documents_external_source ON public.documents USING btree (external_source);
CREATE INDEX idx_documents_framework ON public.documents USING btree (framework);
CREATE INDEX idx_documents_framework_updated ON public.documents USING btree (framework, updated_at DESC) WHERE ((deleted_at IS NULL) AND (framework IS NOT NULL));
CREATE INDEX idx_documents_generation_metadata ON public.documents USING gin (generation_metadata);
CREATE INDEX idx_documents_is_regeneration ON public.documents USING btree (is_regeneration);
CREATE INDEX idx_documents_metadata ON public.documents USING gin (metadata);
CREATE INDEX idx_documents_not_deleted ON public.documents USING btree (created_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_documents_parent_document_id ON public.documents USING btree (parent_document_id);
CREATE INDEX idx_documents_project ON public.documents USING btree (project_id);
CREATE INDEX idx_documents_project_parent ON public.documents USING btree (project_id, parent_document_id);
CREATE INDEX idx_documents_quality_composite ON public.documents USING btree (quality_status, quality_score DESC);
CREATE INDEX idx_documents_quality_score ON public.documents USING btree (quality_score DESC);
CREATE INDEX idx_documents_quality_status ON public.documents USING btree (quality_status);
CREATE INDEX idx_documents_search ON public.documents USING gin (to_tsvector('english'::regconfig, (((COALESCE(title, ''::character varying))::text || ' '::text) || COALESCE(content, ''::text)))) WHERE (deleted_at IS NULL);
CREATE INDEX idx_documents_sharepoint_drive_id ON public.documents USING btree (sharepoint_drive_id);
CREATE INDEX idx_documents_sharepoint_file_id ON public.documents USING btree (sharepoint_file_id);
CREATE INDEX idx_documents_sharepoint_site_id ON public.documents USING btree (sharepoint_site_id);
CREATE INDEX idx_documents_source_documents ON public.documents USING gin (source_documents);
CREATE INDEX idx_documents_tags ON public.documents USING gin (tags);
CREATE INDEX idx_documents_template_framework ON public.documents USING btree (template_framework);
CREATE INDEX idx_documents_template_id ON public.documents USING btree (template_id);
CREATE INDEX idx_documents_updated_at ON public.documents USING btree (updated_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX documents_embedding_idx ON public.documents USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');
CREATE INDEX idx_documents_raw_created_at ON public.documents_raw USING btree (created_at DESC);
CREATE INDEX idx_documents_raw_metadata ON public.documents_raw USING gin (metadata);
CREATE UNIQUE INDEX documents_vectors_document_id_chunk_index_key ON public.documents_vectors USING btree (document_id, chunk_index);
CREATE INDEX documents_vectors_embedding_idx ON public.documents_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');
CREATE INDEX documents_vectors_document_id_idx ON public.documents_vectors USING btree (document_id);
CREATE INDEX idx_domain_entities_domain ON public.domain_entities USING btree (domain);
CREATE INDEX idx_domain_entities_project_id ON public.domain_entities USING btree (project_id);
CREATE INDEX idx_domain_entities_type ON public.domain_entities USING btree (entity_type);
CREATE INDEX idx_domain_entities_idempotency_key ON public.domain_entities USING btree (idempotency_key);
CREATE INDEX idx_domain_entities_project_entity_key ON public.domain_entities USING btree (project_id, entity_type, idempotency_key);
CREATE INDEX idx_domain_extraction_runs_project ON public.domain_extraction_runs USING btree (project_id, domain);
CREATE INDEX idx_domain_extraction_runs_status ON public.domain_extraction_runs USING btree (status);
CREATE UNIQUE INDEX domain_kpi_snapshots_project_id_domain_metric_name_recorded_key ON public.domain_kpi_snapshots USING btree (project_id, domain, metric_name, recorded_at);
CREATE INDEX idx_domain_kpi_snapshots_project ON public.domain_kpi_snapshots USING btree (project_id, domain);
CREATE INDEX idx_drift_rules_active ON public.drift_detection_rules USING btree (is_active);
CREATE INDEX idx_drift_rules_project ON public.drift_detection_rules USING btree (project_id);
CREATE INDEX idx_drift_rules_type ON public.drift_detection_rules USING btree (rule_type);
CREATE INDEX idx_drift_affected_entities ON public.drift_detections USING gin (affected_entity_ids);
CREATE INDEX idx_drift_baseline ON public.drift_detections USING btree (baseline_id);
CREATE INDEX idx_drift_detected ON public.drift_detections USING btree (detected_at DESC);
CREATE INDEX idx_drift_project ON public.drift_detections USING btree (project_id);
CREATE INDEX idx_drift_severity ON public.drift_detections USING btree (severity);
CREATE INDEX idx_drift_status ON public.drift_detections USING btree (status);
CREATE INDEX idx_drift_type ON public.drift_detections USING btree (drift_type);
CREATE UNIQUE INDEX earned_value_metrics_project_id_measurement_date_key ON public.earned_value_metrics USING btree (project_id, measurement_date);
CREATE INDEX idx_earned_value_metrics_project_id ON public.earned_value_metrics USING btree (project_id);
CREATE UNIQUE INDEX embedding_cache_content_hash_key ON public.embedding_cache USING btree (content_hash);
CREATE INDEX idx_embedding_cache_content_hash ON public.embedding_cache USING btree (content_hash);
CREATE INDEX idx_embedding_cache_expires_at ON public.embedding_cache USING btree (expires_at);
CREATE INDEX idx_embedding_cache_model ON public.embedding_cache USING btree (model);
CREATE UNIQUE INDEX emergency_meetings_meeting_id_key ON public.emergency_meetings USING btree (meeting_id);
CREATE INDEX idx_emergency_meetings_created_at ON public.emergency_meetings USING btree (created_at);
CREATE INDEX idx_emergency_meetings_drift_record ON public.emergency_meetings USING btree (drift_record_id);
CREATE INDEX idx_emergency_meetings_meeting_id ON public.emergency_meetings USING btree (meeting_id);
CREATE INDEX idx_emergency_meetings_project_id ON public.emergency_meetings USING btree (project_id);
CREATE INDEX idx_emergency_meetings_scheduled_date ON public.emergency_meetings USING btree (scheduled_date);
CREATE INDEX idx_emergency_meetings_search ON public.emergency_meetings USING gin (to_tsvector('english'::regconfig, (((((COALESCE(title, ''::character varying))::text || ' '::text) || COALESCE(trigger_reason, ''::text)) || ' '::text) || COALESCE(resolution, ''::text))));
CREATE INDEX idx_emergency_meetings_severity ON public.emergency_meetings USING btree (severity);
CREATE INDEX idx_emergency_meetings_status ON public.emergency_meetings USING btree (status);
CREATE UNIQUE INDEX engagement_actions_project_id_action_id_key ON public.engagement_actions USING btree (project_id, action_id);
CREATE INDEX idx_engagement_actions_action_id ON public.engagement_actions USING btree (action_id);
CREATE INDEX idx_engagement_actions_date ON public.engagement_actions USING btree (planned_date);
CREATE INDEX idx_engagement_actions_project_id ON public.engagement_actions USING btree (project_id);
CREATE INDEX idx_engagement_actions_stakeholder ON public.engagement_actions USING btree (stakeholder_id);
CREATE INDEX idx_engagement_actions_type ON public.engagement_actions USING btree (action_type);
CREATE INDEX idx_entity_extractions_created ON public.entity_extractions USING btree (created_at DESC);
CREATE INDEX idx_entity_extractions_document ON public.entity_extractions USING btree (document_id);
CREATE INDEX idx_entity_extractions_entity_data ON public.entity_extractions USING gin (entity_data);
CREATE INDEX idx_entity_extractions_project ON public.entity_extractions USING btree (project_id);
CREATE INDEX idx_entity_extractions_status ON public.entity_extractions USING btree (status);
CREATE INDEX idx_entity_extractions_type ON public.entity_extractions USING btree (entity_type);
CREATE UNIQUE INDEX unique_entity_relationship ON public.entity_relationships USING btree (source_entity_id, target_entity_id, relationship_type);
CREATE INDEX idx_entity_relationships_source ON public.entity_relationships USING btree (source_entity_id);
CREATE INDEX idx_entity_relationships_target ON public.entity_relationships USING btree (target_entity_id);
CREATE INDEX idx_entity_relationships_type ON public.entity_relationships USING btree (relationship_type);
CREATE INDEX idx_escalation_history_action ON public.escalation_alert_history USING btree (action_type);
CREATE INDEX idx_escalation_history_alert ON public.escalation_alert_history USING btree (alert_id);
CREATE INDEX idx_escalation_history_performed ON public.escalation_alert_history USING btree (performed_at);
CREATE INDEX idx_escalation_alerts_created ON public.escalation_alerts USING btree (created_at);
CREATE INDEX idx_escalation_alerts_deadline ON public.escalation_alerts USING btree (deadline);
CREATE INDEX idx_escalation_alerts_drift ON public.escalation_alerts USING btree (drift_detection_id);
CREATE INDEX idx_escalation_alerts_project ON public.escalation_alerts USING btree (project_id);
CREATE INDEX idx_escalation_alerts_severity ON public.escalation_alerts USING btree (severity_level);
CREATE INDEX idx_escalation_alerts_status ON public.escalation_alerts USING btree (status);
CREATE UNIQUE INDEX escalation_matrix_rule_name_key ON public.escalation_matrix USING btree (rule_name);
CREATE INDEX idx_escalation_matrix_active ON public.escalation_matrix USING btree (is_active);
CREATE INDEX idx_escalation_matrix_drift_type ON public.escalation_matrix USING btree (drift_type);
CREATE INDEX idx_escalation_matrix_priority ON public.escalation_matrix USING btree (priority);
CREATE INDEX idx_escalation_matrix_severity ON public.escalation_matrix USING btree (severity_level);
CREATE UNIQUE INDEX extracted_dt_assets_project_id_external_id_platform_type_key ON public.extracted_dt_assets USING btree (project_id, external_id, platform_type);
CREATE INDEX idx_extracted_dt_assets_asset_type ON public.extracted_dt_assets USING btree (asset_type);
CREATE INDEX idx_extracted_dt_assets_project_id ON public.extracted_dt_assets USING btree (project_id);
CREATE INDEX idx_extracted_dt_assets_source_document_id ON public.extracted_dt_assets USING btree (source_document_id);
CREATE INDEX idx_extraction_failures_project_id ON public.extraction_failures USING btree (project_id);
CREATE INDEX idx_extraction_failures_correlation_id ON public.extraction_failures USING btree (correlation_id);
CREATE INDEX idx_extraction_failures_entity_type ON public.extraction_failures USING btree (entity_type);
CREATE INDEX idx_extraction_failures_created_at ON public.extraction_failures USING btree (created_at);
CREATE INDEX idx_extraction_failures_status ON public.extraction_failures USING btree (status);
CREATE INDEX idx_extraction_failures_retry_at ON public.extraction_failures USING btree (retry_at);
CREATE INDEX idx_extraction_failures_pending_by_project ON public.extraction_failures USING btree (project_id, status) WHERE ((status)::text = 'pending'::text);
CREATE UNIQUE INDEX fallback_strategies_strategy_id_key ON public.fallback_strategies USING btree (strategy_id);
CREATE INDEX idx_fallback_strategies_config_gin ON public.fallback_strategies USING gin (config);
CREATE INDEX idx_fallback_strategies_enabled ON public.fallback_strategies USING btree (enabled);
CREATE INDEX idx_fallback_strategies_order ON public.fallback_strategies USING btree (fallback_order);
CREATE INDEX idx_fallback_strategies_type ON public.fallback_strategies USING btree (strategy_type);
CREATE INDEX idx_file_assets_uploaded_by ON public.file_assets USING btree (uploaded_by);
CREATE INDEX idx_financial_variances_project_id ON public.financial_variances USING btree (project_id);
CREATE INDEX idx_framework_analysis_analyzed_at ON public.framework_analysis USING btree (analyzed_at);
CREATE INDEX idx_framework_analysis_average_quality_score ON public.framework_analysis USING btree (average_quality_score);
CREATE INDEX idx_framework_analysis_framework ON public.framework_analysis USING btree (framework);
CREATE INDEX idx_funding_tranches_project_id ON public.funding_tranches USING btree (project_id);
CREATE INDEX idx_gen_change_requests_project_id ON public.general_change_requests USING btree (project_id);
CREATE INDEX idx_goal_milestones_goal ON public.goal_milestones USING btree (goal_id);
CREATE INDEX idx_governance_decisions_project_id ON public.governance_decisions USING btree (project_id);
CREATE INDEX idx_health_checks_timestamp ON public.health_checks USING btree ("timestamp");
CREATE INDEX idx_historical_trends_created_at ON public.historical_trends USING btree (created_at);
CREATE INDEX idx_historical_trends_metric_name ON public.historical_trends USING btree (metric_name);
CREATE INDEX idx_historical_trends_timeframe ON public.historical_trends USING btree (timeframe);
CREATE INDEX idx_historical_trends_trend_direction ON public.historical_trends USING btree (trend_direction);
CREATE INDEX idx_improvement_suggestions_created_at ON public.improvement_suggestions USING btree (created_at);
CREATE INDEX idx_improvement_suggestions_document_id ON public.improvement_suggestions USING btree (document_id);
CREATE INDEX idx_improvement_suggestions_priority ON public.improvement_suggestions USING btree (priority);
CREATE INDEX idx_improvement_suggestions_project_id ON public.improvement_suggestions USING btree (project_id);
CREATE INDEX idx_improvement_suggestions_status ON public.improvement_suggestions USING btree (status);
CREATE INDEX idx_improvement_suggestions_suggestion_type ON public.improvement_suggestions USING btree (suggestion_type);
CREATE INDEX idx_improvement_suggestions_user_id ON public.improvement_suggestions USING btree (user_id);
CREATE INDEX idx_suggestions_priority ON public.improvement_suggestions USING btree (priority DESC);
CREATE INDEX idx_suggestions_project ON public.improvement_suggestions USING btree (project_id);
CREATE INDEX idx_suggestions_status ON public.improvement_suggestions USING btree (status);
CREATE INDEX idx_suggestions_type ON public.improvement_suggestions USING btree (suggestion_type);
CREATE INDEX idx_infrared_thermal_conductance_qubit ON public.infrared_thermal_conductance_log USING btree (qubit_id);
CREATE INDEX idx_infrared_thermal_conductance_wavelength ON public.infrared_thermal_conductance_log USING btree (infrared_wavelength);
CREATE INDEX idx_infrared_thermal_conductance_timestamp ON public.infrared_thermal_conductance_log USING btree ("timestamp");
CREATE INDEX idx_innovation_opportunities_novelty ON public.innovation_opportunities USING btree (novelty_score);
CREATE INDEX idx_innovation_opportunities_project_id ON public.innovation_opportunities USING btree (project_id);
CREATE INDEX idx_innovation_opportunities_status ON public.innovation_opportunities USING btree (status);
CREATE INDEX idx_innovation_opportunities_type ON public.innovation_opportunities USING btree (opportunity_type);
CREATE UNIQUE INDEX integration_sync_metadata_integration_id_adpa_document_id_key ON public.integration_sync_metadata USING btree (integration_id, adpa_document_id);
CREATE INDEX idx_integration_sync_metadata_adpa_document_id ON public.integration_sync_metadata USING btree (adpa_document_id);
CREATE INDEX idx_integration_sync_metadata_external_id ON public.integration_sync_metadata USING btree (external_id);
CREATE INDEX idx_integration_sync_metadata_integration_id ON public.integration_sync_metadata USING btree (integration_id);
CREATE INDEX idx_integration_metrics_type_time ON public.integration_usage_metrics USING btree (integration_type, period_start DESC);
CREATE INDEX idx_integration_metrics_integration ON public.integration_usage_metrics USING btree (integration_id) WHERE (integration_id IS NOT NULL);
CREATE INDEX idx_integrations_last_sync ON public.integrations USING btree (last_sync);
CREATE INDEX idx_integrations_sync_status ON public.integrations USING btree (sync_status);
CREATE INDEX idx_issue_log_assigned_to ON public.issue_log USING btree (assigned_to);
CREATE INDEX idx_issue_log_category ON public.issue_log USING btree (category);
CREATE INDEX idx_issue_log_priority ON public.issue_log USING btree (priority);
CREATE INDEX idx_issue_log_project_id ON public.issue_log USING btree (project_id);
CREATE INDEX idx_issue_log_status ON public.issue_log USING btree (status);
CREATE INDEX idx_issue_history_changed_at ON public.issue_status_history USING btree (changed_at DESC);
CREATE INDEX idx_issue_history_issue_id ON public.issue_status_history USING btree (issue_id);
CREATE INDEX idx_issue_history_status ON public.issue_status_history USING btree (new_status);
CREATE INDEX idx_issues_assigned_to ON public.issues USING btree (assigned_to) WHERE (assigned_to IS NOT NULL);
CREATE INDEX idx_issues_category ON public.issues USING btree (category);
CREATE INDEX idx_issues_date_raised ON public.issues USING btree (date_raised DESC);
CREATE INDEX idx_issues_playbook_execution ON public.issues USING btree (playbook_execution_id) WHERE (playbook_execution_id IS NOT NULL);
CREATE INDEX idx_issues_priority ON public.issues USING btree (priority);
CREATE INDEX idx_issues_project_id ON public.issues USING btree (project_id);
CREATE INDEX idx_issues_related_risk ON public.issues USING btree (related_risk_id) WHERE (related_risk_id IS NOT NULL);
CREATE INDEX idx_issues_source_document ON public.issues USING btree (source_document_id);
CREATE INDEX idx_issues_source_location ON public.issues USING btree (source_document_id, source_text_start);
CREATE INDEX idx_issues_status ON public.issues USING btree (status);
CREATE INDEX idx_issues_status_priority ON public.issues USING btree (status, priority);
CREATE INDEX idx_issues_tags ON public.issues USING gin (tags);
CREATE INDEX idx_job_logs_created ON public.job_execution_logs USING btree (created_at DESC);
CREATE INDEX idx_job_logs_queue ON public.job_execution_logs USING btree (queue_name, created_at DESC);
CREATE INDEX idx_job_logs_status ON public.job_execution_logs USING btree (status, created_at DESC);
CREATE INDEX idx_job_logs_type ON public.job_execution_logs USING btree (job_type, created_at DESC);
CREATE INDEX idx_jobs_processing_started_at ON public.jobs USING btree (processing_started_at);
CREATE INDEX idx_jobs_project_id ON public.jobs USING btree (project_id) WHERE (project_id IS NOT NULL);
CREATE INDEX idx_jobs_project_name ON public.jobs USING btree (project_name) WHERE (project_name IS NOT NULL);
CREATE INDEX idx_jobs_queue_name ON public.jobs USING btree (queue_name);
CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);
CREATE INDEX idx_jobs_status_queue ON public.jobs USING btree (status, queue_name);
CREATE INDEX idx_jobs_type ON public.jobs USING btree (type);
CREATE INDEX idx_jobs_worker_id ON public.jobs USING btree (worker_id);
CREATE INDEX idx_kb_applications_applied_at ON public.knowledge_base_applications USING btree (applied_at);
CREATE INDEX idx_kb_applications_applied_by ON public.knowledge_base_applications USING btree (applied_by);
CREATE INDEX idx_kb_applications_entry_id ON public.knowledge_base_applications USING btree (knowledge_base_entry_id);
CREATE INDEX idx_kb_applications_project_id ON public.knowledge_base_applications USING btree (target_project_id);
CREATE INDEX idx_kb_applications_status ON public.knowledge_base_applications USING btree (status);
CREATE INDEX idx_kb_entries_baseline_id ON public.knowledge_base_entries USING btree (baseline_id);
CREATE INDEX idx_kb_entries_category ON public.knowledge_base_entries USING btree (category);
CREATE INDEX idx_kb_entries_created_at ON public.knowledge_base_entries USING btree (created_at);
CREATE INDEX idx_kb_entries_drift_detection_id ON public.knowledge_base_entries USING btree (drift_detection_id);
CREATE INDEX idx_kb_entries_innovation_opportunity_id ON public.knowledge_base_entries USING btree (innovation_opportunity_id);
CREATE INDEX idx_kb_entries_keywords ON public.knowledge_base_entries USING gin (keywords);
CREATE INDEX idx_kb_entries_project_id ON public.knowledge_base_entries USING btree (project_id);
CREATE INDEX idx_kb_entries_published_at ON public.knowledge_base_entries USING btree (published_at);
CREATE INDEX idx_kb_entries_search ON public.knowledge_base_entries USING gin (to_tsvector('english'::regconfig, (((COALESCE(title, ''::character varying))::text || ' '::text) || COALESCE(description, ''::text))));
CREATE INDEX idx_kb_entries_status ON public.knowledge_base_entries USING btree (status);
CREATE INDEX idx_kb_entries_tags ON public.knowledge_base_entries USING gin (tags);
CREATE INDEX idx_kb_entries_type ON public.knowledge_base_entries USING btree (entry_type);
CREATE INDEX idx_kb_entries_embedding ON public.knowledge_base_entries USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');
CREATE INDEX idx_kb_entries_business_value ON public.knowledge_base_entries USING btree (business_value_score);
CREATE UNIQUE INDEX knowledge_base_entry_relation_source_entry_id_target_entry__key ON public.knowledge_base_entry_relationships USING btree (source_entry_id, target_entry_id, relationship_type);
CREATE INDEX idx_kb_relationships_source ON public.knowledge_base_entry_relationships USING btree (source_entry_id);
CREATE INDEX idx_kb_relationships_target ON public.knowledge_base_entry_relationships USING btree (target_entry_id);
CREATE INDEX idx_kb_reviews_entry_id ON public.knowledge_base_reviews USING btree (knowledge_base_entry_id);
CREATE INDEX idx_kb_reviews_reviewer_id ON public.knowledge_base_reviews USING btree (reviewer_id);
CREATE INDEX idx_kb_reviews_type ON public.knowledge_base_reviews USING btree (review_type);
CREATE INDEX idx_labor_rates_project_id ON public.labor_rates USING btree (project_id);
CREATE INDEX idx_lessons_learned_category ON public.lessons_learned USING btree (category);
CREATE INDEX idx_lessons_learned_project_id ON public.lessons_learned USING btree (project_id);
CREATE INDEX idx_lessons_learned_severity ON public.lessons_learned USING btree (severity);
CREATE INDEX idx_lessons_learned_shared ON public.lessons_learned USING btree (shared_with_org);
CREATE INDEX idx_lessons_learned_status ON public.lessons_learned USING btree (status);
CREATE INDEX idx_maturity_assessed ON public.maturity_assessments USING btree (assessed_at DESC);
CREATE INDEX idx_maturity_level ON public.maturity_assessments USING btree (maturity_level);
CREATE INDEX idx_maturity_project ON public.maturity_assessments USING btree (project_id);
CREATE INDEX idx_maturity_type ON public.maturity_assessments USING btree (assessment_type);
CREATE UNIQUE INDEX unique_meeting_attendee ON public.meeting_attendees USING btree (meeting_id, user_id);
CREATE INDEX idx_meeting_attendees_confirmed ON public.meeting_attendees USING btree (confirmed);
CREATE INDEX idx_meeting_attendees_meeting_id ON public.meeting_attendees USING btree (meeting_id);
CREATE INDEX idx_meeting_attendees_required ON public.meeting_attendees USING btree (required);
CREATE INDEX idx_meeting_attendees_user_id ON public.meeting_attendees USING btree (user_id);
CREATE INDEX idx_meeting_escalation_created_at ON public.meeting_escalation_history USING btree (created_at);
CREATE INDEX idx_meeting_escalation_meeting_id ON public.meeting_escalation_history USING btree (meeting_id);
CREATE INDEX idx_meeting_minutes_project_id ON public.meeting_minutes USING btree (project_id);
CREATE UNIQUE INDEX milestones_project_name_unique ON public.milestones USING btree (project_id, name);
CREATE INDEX idx_milestones_date ON public.milestones USING btree (due_date);
CREATE INDEX idx_milestones_project_id ON public.milestones USING btree (project_id);
CREATE INDEX idx_milestones_source_document ON public.milestones USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE INDEX idx_milestones_source_location ON public.milestones USING btree (source_document_id, source_text_start);
CREATE UNIQUE INDEX idx_milestones_idempotency ON public.milestones USING btree (project_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX idx_milestones_idempotency_key ON public.milestones USING btree (idempotency_key);
CREATE INDEX idx_mitigation_plans_cost_estimate ON public.mitigation_plans USING btree (cost_estimate) WHERE (cost_estimate IS NOT NULL);
CREATE INDEX idx_mitigation_plans_created_at ON public.mitigation_plans USING btree (created_at DESC);
CREATE INDEX idx_mitigation_plans_due_date ON public.mitigation_plans USING btree (due_date) WHERE (due_date IS NOT NULL);
CREATE INDEX idx_mitigation_plans_issue_id ON public.mitigation_plans USING btree (issue_id);
CREATE INDEX idx_mitigation_plans_owner_id ON public.mitigation_plans USING btree (owner_id);
CREATE INDEX idx_mitigation_plans_assigned_to ON public.mitigation_plans USING btree (assigned_to);
CREATE INDEX idx_mitigation_plans_assigned_to_name ON public.mitigation_plans USING btree (assigned_to_name) WHERE (assigned_to_name IS NOT NULL);
CREATE INDEX idx_mitigation_plans_owner_name ON public.mitigation_plans USING btree (owner_name) WHERE (owner_name IS NOT NULL);
CREATE INDEX idx_mitigation_plans_risk_id ON public.mitigation_plans USING btree (risk_id);
CREATE INDEX idx_mitigation_plans_source_document ON public.mitigation_plans USING btree (source_document_id);
CREATE INDEX idx_mitigation_plans_source_location ON public.mitigation_plans USING btree (source_document_id, source_text_start);
CREATE INDEX idx_mitigation_plans_status ON public.mitigation_plans USING btree (status);
CREATE INDEX idx_mitigation_plans_status_due_date ON public.mitigation_plans USING btree (status, due_date) WHERE ((status)::text = ANY (ARRAY[('planned'::character varying)::text, ('in_progress'::character varying)::text]));
CREATE INDEX morphic_ai_model_config_mode_type_idx ON public.morphic_ai_model_config USING btree (search_mode, model_type);
CREATE INDEX morphic_chats_user_id_idx ON public.morphic_chats USING btree (user_id);
CREATE INDEX morphic_chats_user_id_created_at_idx ON public.morphic_chats USING btree (user_id, created_at DESC NULLS LAST);
CREATE INDEX morphic_chats_created_at_idx ON public.morphic_chats USING btree (created_at DESC NULLS LAST);
CREATE INDEX morphic_chats_id_user_id_idx ON public.morphic_chats USING btree (id, user_id);
CREATE INDEX morphic_feedback_user_id_idx ON public.morphic_feedback USING btree (user_id);
CREATE INDEX morphic_feedback_created_at_idx ON public.morphic_feedback USING btree (created_at);
CREATE INDEX morphic_messages_chat_id_idx ON public.morphic_messages USING btree (chat_id);
CREATE INDEX morphic_messages_chat_id_created_at_idx ON public.morphic_messages USING btree (chat_id, created_at);
CREATE INDEX morphic_parts_message_id_idx ON public.morphic_parts USING btree (message_id);
CREATE INDEX morphic_parts_message_id_order_idx ON public.morphic_parts USING btree (message_id, "order");
CREATE INDEX idx_notification_logs_sent_at ON public.notification_logs USING btree (sent_at DESC);
CREATE INDEX idx_notification_logs_type ON public.notification_logs USING btree (type);
CREATE INDEX idx_notion_databases_last_synced ON public.notion_databases USING btree (last_synced);
CREATE UNIQUE INDEX onboarding_offboarding_project_id_resource_id_process_type_key ON public.onboarding_offboarding USING btree (project_id, resource_id, process_type);
CREATE INDEX idx_onboarding_offboarding_action_type ON public.onboarding_offboarding USING btree (action_type);
CREATE INDEX idx_onboarding_offboarding_project_id ON public.onboarding_offboarding USING btree (project_id);
CREATE INDEX idx_onboarding_offboarding_resource ON public.onboarding_offboarding USING btree (resource_id);
CREATE INDEX idx_onboarding_offboarding_status ON public.onboarding_offboarding USING btree (status);
CREATE INDEX idx_onboarding_offboarding_type ON public.onboarding_offboarding USING btree (process_type);
CREATE INDEX idx_onboarding_offboarding_end_date ON public.onboarding_offboarding USING btree (end_date);
CREATE INDEX idx_operational_playbooks_source_document ON public.operational_playbooks USING btree (source_document_id);
CREATE INDEX idx_operational_playbooks_source_location ON public.operational_playbooks USING btree (source_document_id, source_text_start);
CREATE INDEX idx_playbooks_active ON public.operational_playbooks USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_playbooks_category ON public.operational_playbooks USING btree (category);
CREATE INDEX idx_playbooks_project_id ON public.operational_playbooks USING btree (project_id);
CREATE INDEX idx_playbooks_risk_categories ON public.operational_playbooks USING gin (applicable_risk_categories);
CREATE INDEX idx_playbooks_severity_levels ON public.operational_playbooks USING gin (applicable_severity_levels);
CREATE UNIQUE INDEX opportunities_project_id_title_key ON public.opportunities USING btree (project_id, title);
CREATE INDEX idx_opportunities_project_id ON public.opportunities USING btree (project_id);
CREATE INDEX idx_opportunities_source_document ON public.opportunities USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE INDEX idx_opportunities_source_location ON public.opportunities USING btree (source_document_id, source_text_start);
CREATE UNIQUE INDEX performance_actuals_project_measurement_unique ON public.performance_actuals USING btree (project_id, measurement_date);
CREATE UNIQUE INDEX unique_performance_actual_measurement ON public.performance_actuals USING btree (project_id, entity_type, entity_name, measurement_date);
CREATE INDEX idx_performance_actuals_baseline ON public.performance_actuals USING btree (baseline_id) WHERE (baseline_id IS NOT NULL);
CREATE INDEX idx_performance_actuals_entity ON public.performance_actuals USING btree (entity_type, entity_id);
CREATE INDEX idx_performance_actuals_entity_name ON public.performance_actuals USING btree (entity_name);
CREATE INDEX idx_performance_actuals_measured_by ON public.performance_actuals USING btree (measured_by) WHERE (measured_by IS NOT NULL);
CREATE INDEX idx_performance_actuals_measurement_date ON public.performance_actuals USING btree (measurement_date DESC);
CREATE INDEX idx_performance_actuals_project ON public.performance_actuals USING btree (project_id);
CREATE INDEX idx_performance_actuals_project_entity_date ON public.performance_actuals USING btree (project_id, entity_type, measurement_date DESC);
CREATE INDEX idx_performance_actuals_project_entity_type ON public.performance_actuals USING btree (project_id, entity_type);
CREATE INDEX idx_performance_actuals_project_id ON public.performance_actuals USING btree (project_id);
CREATE INDEX idx_performance_actuals_project_measurement_date ON public.performance_actuals USING btree (project_id, measurement_date DESC);
CREATE INDEX idx_performance_actuals_source_location ON public.performance_actuals USING btree (source_document_id, source_text_start);
CREATE UNIQUE INDEX performance_measurements_project_id_success_criterion_name__key ON public.performance_measurements USING btree (project_id, success_criterion_name, measurement_date);
CREATE INDEX idx_performance_measurements_status ON public.performance_measurements USING btree (status);
CREATE INDEX idx_performance_measurements_project_id ON public.performance_measurements USING btree (project_id);
CREATE UNIQUE INDEX phases_project_name_unique ON public.phases USING btree (project_id, name);
CREATE INDEX idx_phases_project_id ON public.phases USING btree (project_id);
CREATE INDEX idx_phases_source_document ON public.phases USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE INDEX idx_phases_source_location ON public.phases USING btree (source_document_id, source_text_start);
CREATE INDEX idx_phases_start_date ON public.phases USING btree (start_date);
CREATE INDEX idx_pipeline_configurations_active ON public.pipeline_configurations USING btree (is_active);
CREATE INDEX idx_pipeline_executions_created_at ON public.pipeline_executions USING btree (created_at DESC);
CREATE INDEX idx_pipeline_executions_project_id ON public.pipeline_executions USING btree (project_id);
CREATE INDEX idx_pipeline_executions_status ON public.pipeline_executions USING btree (status);
CREATE INDEX idx_pipeline_executions_template_id ON public.pipeline_executions USING btree (template_id);
CREATE INDEX idx_pipeline_executions_user_id ON public.pipeline_executions USING btree (user_id);
CREATE INDEX idx_pipeline_executions_user_status ON public.pipeline_executions USING btree (user_id, status, created_at DESC);
CREATE INDEX idx_executions_playbook_id ON public.playbook_executions USING btree (playbook_id);
CREATE INDEX idx_executions_started_at ON public.playbook_executions USING btree (started_at DESC);
CREATE INDEX idx_executions_status ON public.playbook_executions USING btree (status) WHERE ((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('in_progress'::character varying)::text]));
CREATE INDEX idx_executions_triggered_by ON public.playbook_executions USING btree (triggered_by_type, triggered_by_id);
CREATE INDEX idx_executions_triggered_by_user ON public.playbook_executions USING btree (triggered_by_user_id);
CREATE INDEX idx_playbook_executions_source_document ON public.playbook_executions USING btree (source_document_id);
CREATE INDEX idx_playbook_executions_source_location ON public.playbook_executions USING btree (source_document_id, source_text_start);
CREATE UNIQUE INDEX playbook_response_steps_playbook_id_step_order_key ON public.playbook_response_steps USING btree (playbook_id, step_order);
CREATE INDEX idx_steps_order ON public.playbook_response_steps USING btree (playbook_id, step_order);
CREATE INDEX idx_steps_playbook_id ON public.playbook_response_steps USING btree (playbook_id);
CREATE INDEX idx_steps_type ON public.playbook_response_steps USING btree (step_type);
CREATE UNIQUE INDEX playbook_scenarios_playbook_id_scenario_condition_key ON public.playbook_scenarios USING btree (playbook_id, scenario_condition);
CREATE INDEX idx_scenarios_condition_gin ON public.playbook_scenarios USING gin (scenario_condition);
CREATE INDEX idx_scenarios_playbook_id ON public.playbook_scenarios USING btree (playbook_id);
CREATE INDEX idx_scenarios_priority ON public.playbook_scenarios USING btree (priority DESC);
CREATE UNIQUE INDEX playbook_step_executions_execution_id_step_id_key ON public.playbook_step_executions USING btree (execution_id, step_id);
CREATE INDEX idx_step_executions_assigned_to ON public.playbook_step_executions USING btree (assigned_to) WHERE (assigned_to IS NOT NULL);
CREATE INDEX idx_step_executions_execution_id ON public.playbook_step_executions USING btree (execution_id);
CREATE INDEX idx_step_executions_sla_deadline ON public.playbook_step_executions USING btree (sla_deadline) WHERE ((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('in_progress'::character varying)::text]));
CREATE INDEX idx_step_executions_status ON public.playbook_step_executions USING btree (status) WHERE ((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('in_progress'::character varying)::text]));
CREATE INDEX idx_step_executions_step_id ON public.playbook_step_executions USING btree (step_id);
CREATE UNIQUE INDEX pmbok6_knowledge_areas_code_key ON public.pmbok6_knowledge_areas USING btree (code);
CREATE UNIQUE INDEX pmbok6_process_groups_code_key ON public.pmbok6_process_groups USING btree (code);
CREATE UNIQUE INDEX pmbok6_processes_code_key ON public.pmbok6_processes USING btree (code);
CREATE INDEX idx_pmbok6_processes_code ON public.pmbok6_processes USING btree (code);
CREATE INDEX idx_pmbok6_processes_display_order ON public.pmbok6_processes USING btree (display_order);
CREATE INDEX idx_pmbok6_processes_knowledge_area ON public.pmbok6_processes USING btree (knowledge_area_id);
CREATE INDEX idx_pmbok6_processes_process_group ON public.pmbok6_processes USING btree (process_group_id);
CREATE UNIQUE INDEX unique_process_principle ON public.pmbok6_to_pmbok7_principle_mapping USING btree (process_id, principle_id);
CREATE INDEX idx_pmbok6_to_7_principle ON public.pmbok6_to_pmbok7_principle_mapping USING btree (principle_id);
CREATE INDEX idx_pmbok6_to_7_process ON public.pmbok6_to_pmbok7_principle_mapping USING btree (process_id);
CREATE INDEX idx_pmbok6_to_7_relevance ON public.pmbok6_to_pmbok7_principle_mapping USING btree (relevance_level);
CREATE UNIQUE INDEX pmbok7_performance_domains_code_key ON public.pmbok7_performance_domains USING btree (code);
CREATE INDEX idx_pmbok7_domains_code ON public.pmbok7_performance_domains USING btree (code);
CREATE INDEX idx_pmbok7_domains_order ON public.pmbok7_performance_domains USING btree (display_order);
CREATE UNIQUE INDEX pmbok7_principles_code_key ON public.pmbok7_principles USING btree (code);
CREATE INDEX idx_pmbok7_principles_code ON public.pmbok7_principles USING btree (code);
CREATE INDEX idx_pmbok7_principles_order ON public.pmbok7_principles USING btree (display_order);
CREATE INDEX idx_policy_compliance_project_id ON public.policy_compliance USING btree (project_id);
CREATE UNIQUE INDEX idx_portfolio_domains_name ON public.portfolio_domains USING btree (name);
CREATE INDEX idx_portfolio_governance_company ON public.portfolio_governance USING btree (company_id);
CREATE UNIQUE INDEX idx_portfolio_governance_company_unique ON public.portfolio_governance USING btree (company_id) WHERE (company_id IS NOT NULL);
CREATE INDEX idx_portfolio_governance_risk_review ON public.portfolio_governance USING btree (next_risk_review_due);
CREATE INDEX idx_portfolio_governance_status ON public.portfolio_governance USING btree (status);
CREATE INDEX idx_portfolios_owner ON public.portfolio_governance USING btree (owner_id);
CREATE INDEX idx_portfolios_status ON public.portfolio_governance USING btree (status);
CREATE INDEX idx_portfolio_key_results_created_at ON public.portfolio_key_results USING btree (created_at DESC);
CREATE INDEX idx_portfolio_key_results_next_measurement ON public.portfolio_key_results USING btree (next_measurement_date) WHERE (next_measurement_date IS NOT NULL);
CREATE INDEX idx_portfolio_key_results_okr ON public.portfolio_key_results USING btree (okr_id);
CREATE INDEX idx_portfolio_key_results_owner ON public.portfolio_key_results USING btree (owner_id) WHERE (owner_id IS NOT NULL);
CREATE INDEX idx_portfolio_key_results_status ON public.portfolio_key_results USING btree (progress_status) WHERE (progress_status IS NOT NULL);
CREATE INDEX idx_portfolio_ksf_category ON public.portfolio_key_success_factors USING btree (ksf_category);
CREATE INDEX idx_portfolio_ksf_criticality ON public.portfolio_key_success_factors USING btree (criticality);
CREATE INDEX idx_portfolio_ksf_deadline ON public.portfolio_key_success_factors USING btree (deadline);
CREATE INDEX idx_portfolio_ksf_org_id ON public.portfolio_key_success_factors USING btree (organization_id);
CREATE INDEX idx_portfolio_ksf_owner_id ON public.portfolio_key_success_factors USING btree (owner_id);
CREATE INDEX idx_portfolio_ksf_priority ON public.portfolio_key_success_factors USING btree (priority_rank);
CREATE INDEX idx_portfolio_ksf_risk_level ON public.portfolio_key_success_factors USING btree (risk_level);
CREATE INDEX idx_portfolio_ksf_sponsor_id ON public.portfolio_key_success_factors USING btree (sponsor_id);
CREATE INDEX idx_portfolio_ksf_status ON public.portfolio_key_success_factors USING btree (achievement_status);
CREATE INDEX idx_portfolio_kpi_history_date ON public.portfolio_kpi_history USING btree (measurement_date);
CREATE INDEX idx_portfolio_kpi_history_kpi_date ON public.portfolio_kpi_history USING btree (kpi_id, measurement_date);
CREATE INDEX idx_portfolio_kpi_history_kpi_id ON public.portfolio_kpi_history USING btree (kpi_id);
CREATE INDEX idx_portfolio_kpi_history_measured_by ON public.portfolio_kpi_history USING btree (measured_by);
CREATE INDEX idx_portfolio_kpis_bsc_perspective ON public.portfolio_kpis USING btree (bsc_perspective);
CREATE INDEX idx_portfolio_kpis_category ON public.portfolio_kpis USING btree (kpi_category);
CREATE INDEX idx_portfolio_kpis_is_active ON public.portfolio_kpis USING btree (is_active);
CREATE INDEX idx_portfolio_kpis_last_measured ON public.portfolio_kpis USING btree (last_measured_at);
CREATE INDEX idx_portfolio_kpis_org_id ON public.portfolio_kpis USING btree (organization_id);
CREATE INDEX idx_portfolio_kpis_owner_id ON public.portfolio_kpis USING btree (owner_id);
CREATE INDEX idx_portfolio_kpis_rag_status ON public.portfolio_kpis USING btree (rag_status);
CREATE INDEX idx_portfolio_okrs_created_at ON public.portfolio_okrs USING btree (created_at DESC);
CREATE INDEX idx_portfolio_okrs_entity ON public.portfolio_okrs USING btree (entity_type, entity_id) WHERE (entity_id IS NOT NULL);
CREATE INDEX idx_portfolio_okrs_level ON public.portfolio_okrs USING btree (level);
CREATE INDEX idx_portfolio_okrs_org ON public.portfolio_okrs USING btree (organization_id) WHERE (organization_id IS NOT NULL);
CREATE INDEX idx_portfolio_okrs_owner ON public.portfolio_okrs USING btree (owner_id) WHERE (owner_id IS NOT NULL);
CREATE INDEX idx_portfolio_okrs_parent ON public.portfolio_okrs USING btree (parent_okr_id) WHERE (parent_okr_id IS NOT NULL);
CREATE INDEX idx_portfolio_okrs_period ON public.portfolio_okrs USING btree (okr_period) WHERE (okr_period IS NOT NULL);
CREATE INDEX idx_portfolio_okrs_status ON public.portfolio_okrs USING btree (status) WHERE (status IS NOT NULL);
CREATE INDEX idx_portfolio_okrs_strategic_goal ON public.portfolio_okrs USING btree (strategic_goal_id) WHERE (strategic_goal_id IS NOT NULL);
CREATE UNIQUE INDEX unique_risk_per_portfolio ON public.portfolio_risks USING btree (portfolio_id, risk_title);
CREATE INDEX idx_portfolio_risks_escalation_status ON public.portfolio_risks USING btree (escalation_status, portfolio_id);
CREATE INDEX idx_portfolio_risks_portfolio ON public.portfolio_risks USING btree (portfolio_id);
CREATE INDEX idx_portfolio_risks_status ON public.portfolio_risks USING btree (risk_status);
CREATE INDEX idx_portfolio_strategic_goals_target_year ON public.portfolio_strategic_goals USING btree (target_year);
CREATE INDEX idx_portfolio_strategic_goals_category ON public.portfolio_strategic_goals USING btree (goal_category);
CREATE INDEX idx_portfolio_strategic_goals_org_id ON public.portfolio_strategic_goals USING btree (organization_id);
CREATE INDEX idx_portfolio_strategic_goals_priority ON public.portfolio_strategic_goals USING btree (priority_rank);
CREATE INDEX idx_portfolio_strategic_goals_status ON public.portfolio_strategic_goals USING btree (status);
CREATE INDEX idx_portfolio_strategic_goals_vision_id ON public.portfolio_strategic_goals USING btree (vision_id);
CREATE INDEX idx_portfolio_vision_effective_from ON public.portfolio_vision USING btree (effective_from);
CREATE INDEX idx_portfolio_vision_org_id ON public.portfolio_vision USING btree (organization_id);
CREATE INDEX idx_prioritization_criteria_active ON public.prioritization_criteria USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_prioritization_criteria_org ON public.prioritization_criteria USING btree (organization_id) WHERE (organization_id IS NOT NULL);
CREATE INDEX idx_prioritization_criteria_sort ON public.prioritization_criteria USING btree (sort_order) WHERE (sort_order IS NOT NULL);
CREATE INDEX idx_prob_impact_matrix_project_id ON public.probability_impact_matrix USING btree (project_id);
CREATE INDEX idx_processing_metrics_created_at ON public.processing_metrics USING btree (created_at);
CREATE INDEX idx_processing_metrics_project_id ON public.processing_metrics USING btree (project_id);
CREATE INDEX idx_processing_metrics_request_id ON public.processing_metrics USING btree (request_id);
CREATE INDEX idx_processing_metrics_template_id ON public.processing_metrics USING btree (template_id);
CREATE INDEX idx_processing_metrics_user_id ON public.processing_metrics USING btree (user_id);
CREATE INDEX idx_procurement_costs_project_id ON public.procurement_costs USING btree (project_id);
CREATE INDEX idx_program_benefits_program ON public.program_benefits USING btree (program_id);
CREATE INDEX idx_program_benefits_project ON public.program_benefits USING btree (project_id);
CREATE INDEX idx_program_benefits_status ON public.program_benefits USING btree (status);
CREATE INDEX idx_program_benefits_type ON public.program_benefits USING btree (benefit_type);
CREATE UNIQUE INDEX program_budgets_program_id_fiscal_year_fiscal_quarter_key ON public.program_budgets USING btree (program_id, fiscal_year, fiscal_quarter);
CREATE INDEX idx_program_budgets_fiscal_year ON public.program_budgets USING btree (fiscal_year);
CREATE INDEX idx_program_budgets_program_id ON public.program_budgets USING btree (program_id);
CREATE INDEX idx_program_budgets_status ON public.program_budgets USING btree (budget_status);
CREATE UNIQUE INDEX program_capacity_forecast_program_id_forecast_period_key ON public.program_capacity_forecast USING btree (program_id, forecast_period);
CREATE INDEX idx_program_capacity_forecast_bottleneck ON public.program_capacity_forecast USING btree (is_bottleneck_period) WHERE (is_bottleneck_period = true);
CREATE INDEX idx_program_capacity_forecast_period ON public.program_capacity_forecast USING btree (forecast_period);
CREATE INDEX idx_program_capacity_forecast_program ON public.program_capacity_forecast USING btree (program_id);
CREATE UNIQUE INDEX program_cash_flow_program_id_period_month_is_forecast_key ON public.program_cash_flow USING btree (program_id, period_month, is_forecast);
CREATE INDEX idx_program_cash_flow_forecast ON public.program_cash_flow USING btree (is_forecast);
CREATE INDEX idx_program_cash_flow_period ON public.program_cash_flow USING btree (period_month);
CREATE INDEX idx_program_cash_flow_program_id ON public.program_cash_flow USING btree (program_id);
CREATE UNIQUE INDEX program_cost_performance_program_id_reporting_date_key ON public.program_cost_performance USING btree (program_id, reporting_date);
CREATE INDEX idx_program_cost_performance_date ON public.program_cost_performance USING btree (reporting_date);
CREATE INDEX idx_program_cost_performance_program_id ON public.program_cost_performance USING btree (program_id);
CREATE INDEX idx_program_cost_performance_status ON public.program_cost_performance USING btree (performance_status);
CREATE INDEX idx_program_financial_analysis_date ON public.program_financial_analysis USING btree (analysis_date);
CREATE INDEX idx_program_financial_analysis_program ON public.program_financial_analysis USING btree (program_id);
CREATE INDEX idx_program_financial_analysis_type ON public.program_financial_analysis USING btree (analysis_type);
CREATE INDEX idx_program_financial_transactions_date ON public.program_financial_transactions USING btree (transaction_date);
CREATE INDEX idx_program_financial_transactions_program ON public.program_financial_transactions USING btree (program_id);
CREATE INDEX idx_program_financial_transactions_project ON public.program_financial_transactions USING btree (project_id);
CREATE INDEX idx_program_financial_transactions_type ON public.program_financial_transactions USING btree (transaction_type);
CREATE INDEX idx_program_forecasts_date ON public.program_forecasts USING btree (forecast_date);
CREATE INDEX idx_program_forecasts_program_id ON public.program_forecasts USING btree (program_id);
CREATE INDEX idx_program_forecasts_type ON public.program_forecasts USING btree (forecast_type);
CREATE INDEX idx_program_funding_program_id ON public.program_funding USING btree (program_id);
CREATE INDEX idx_program_funding_status ON public.program_funding USING btree (approval_status);
CREATE INDEX unique_active_allocation ON public.program_resource_allocations USING gist (resource_id, project_id, tsrange((allocation_start)::timestamp without time zone, (COALESCE(allocation_end, '9999-12-31'::date))::timestamp without time zone)) WHERE ((allocation_status)::text = ANY (ARRAY[('planned'::character varying)::text, ('active'::character varying)::text]));
CREATE INDEX idx_program_resource_allocations_conflicts ON public.program_resource_allocations USING btree (has_conflicts) WHERE (has_conflicts = true);
CREATE INDEX idx_program_resource_allocations_dates ON public.program_resource_allocations USING gist (tsrange((allocation_start)::timestamp without time zone, (COALESCE(allocation_end, '9999-12-31'::date))::timestamp without time zone));
CREATE INDEX idx_program_resource_allocations_program ON public.program_resource_allocations USING btree (program_id);
CREATE INDEX idx_program_resource_allocations_project ON public.program_resource_allocations USING btree (project_id);
CREATE INDEX idx_program_resource_allocations_resource ON public.program_resource_allocations USING btree (resource_id);
CREATE INDEX idx_program_resource_allocations_status ON public.program_resource_allocations USING btree (allocation_status);
CREATE UNIQUE INDEX program_resource_performance_program_id_resource_id_reporti_key ON public.program_resource_performance USING btree (program_id, resource_id, reporting_period);
CREATE INDEX idx_program_resource_performance_period ON public.program_resource_performance USING btree (reporting_period);
CREATE INDEX idx_program_resource_performance_program ON public.program_resource_performance USING btree (program_id);
CREATE INDEX idx_program_resource_performance_resource ON public.program_resource_performance USING btree (resource_id);
CREATE INDEX idx_program_resource_performance_utilization ON public.program_resource_performance USING btree (utilization_rate);
CREATE INDEX idx_program_resource_plan_dates ON public.program_resource_plan USING btree (needed_from, needed_until);
CREATE INDEX idx_program_resource_plan_program ON public.program_resource_plan USING btree (program_id);
CREATE INDEX idx_program_resource_plan_status ON public.program_resource_plan USING btree (planning_status);
CREATE INDEX idx_program_resource_plan_type ON public.program_resource_plan USING btree (resource_type);
CREATE INDEX idx_program_resource_risks_program ON public.program_resource_risks USING btree (program_id);
CREATE INDEX idx_program_resource_risks_resource ON public.program_resource_risks USING btree (resource_id);
CREATE INDEX idx_program_resource_risks_score ON public.program_resource_risks USING btree (risk_score);
CREATE INDEX idx_program_resource_risks_status ON public.program_resource_risks USING btree (risk_status);
CREATE UNIQUE INDEX program_skills_inventory_program_id_user_id_skill_name_key ON public.program_skills_inventory USING btree (program_id, user_id, skill_name);
CREATE INDEX idx_program_skills_inventory_available ON public.program_skills_inventory USING btree (available_for_allocation) WHERE (available_for_allocation = true);
CREATE INDEX idx_program_skills_inventory_category ON public.program_skills_inventory USING btree (skill_category);
CREATE INDEX idx_program_skills_inventory_proficiency ON public.program_skills_inventory USING btree (proficiency_level);
CREATE INDEX idx_program_skills_inventory_program ON public.program_skills_inventory USING btree (program_id);
CREATE INDEX idx_program_skills_inventory_skill ON public.program_skills_inventory USING btree (skill_name);
CREATE INDEX idx_program_skills_inventory_user ON public.program_skills_inventory USING btree (user_id);
CREATE INDEX idx_programs_archived ON public.programs USING btree (archived);
CREATE INDEX idx_programs_company_id ON public.programs USING btree (company_id);
CREATE INDEX idx_programs_end_date ON public.programs USING btree (end_date);
CREATE INDEX idx_programs_owner_id ON public.programs USING btree (owner_id);
CREATE INDEX idx_programs_search ON public.programs USING gin (to_tsvector('english'::regconfig, (((COALESCE(name, ''::character varying))::text || ' '::text) || COALESCE(description, ''::text))));
CREATE INDEX idx_programs_start_date ON public.programs USING btree (start_date);
CREATE INDEX idx_programs_status ON public.programs USING btree (status);
CREATE INDEX idx_programs_portfolio ON public.programs USING btree (portfolio_id);
CREATE INDEX idx_programs_portfolio_id ON public.programs USING btree (portfolio_id);
CREATE INDEX idx_project_analysis_analyzed_at ON public.project_analysis USING btree (analyzed_at);
CREATE INDEX idx_project_analysis_average_quality_score ON public.project_analysis USING btree (average_quality_score);
CREATE INDEX idx_project_analysis_project_id ON public.project_analysis USING btree (project_id);
CREATE UNIQUE INDEX unique_project_version ON public.project_baselines USING btree (project_id, version);
CREATE INDEX idx_project_baselines_created_at ON public.project_baselines USING btree (created_at);
CREATE INDEX idx_project_baselines_project_id ON public.project_baselines USING btree (project_id);
CREATE INDEX idx_project_baselines_status ON public.project_baselines USING btree (status);
CREATE INDEX idx_charter_details_project_id ON public.project_charter_details USING btree (project_id);
CREATE INDEX idx_project_context_items_active ON public.project_context_items USING btree (project_id, is_active);
CREATE INDEX idx_project_context_items_priority ON public.project_context_items USING btree (project_id, priority DESC, is_active);
CREATE INDEX idx_project_context_items_project_id ON public.project_context_items USING btree (project_id);
CREATE INDEX idx_project_context_items_type ON public.project_context_items USING btree (type);
CREATE INDEX idx_context_usage_item ON public.project_context_usage_log USING btree (context_item_id);
CREATE INDEX idx_context_usage_project ON public.project_context_usage_log USING btree (project_id);
CREATE INDEX idx_context_usage_project_item ON public.project_context_usage_log USING btree (project_id, context_item_id);
CREATE INDEX idx_context_usage_timestamp ON public.project_context_usage_log USING btree (usage_timestamp);
CREATE INDEX idx_context_usage_type ON public.project_context_usage_log USING btree (usage_type);
CREATE UNIQUE INDEX project_cost_breakdown_project_id_key ON public.project_cost_breakdown USING btree (project_id);
CREATE INDEX idx_project_cost_breakdown_project ON public.project_cost_breakdown USING btree (project_id);
CREATE UNIQUE INDEX project_dependencies_source_project_id_target_project_id_key ON public.project_dependencies USING btree (source_project_id, target_project_id);
CREATE INDEX idx_project_dependencies_source ON public.project_dependencies USING btree (source_project_id);
CREATE INDEX idx_project_dependencies_target ON public.project_dependencies USING btree (target_project_id);
CREATE INDEX idx_baselines_created ON public.project_entity_baselines USING btree (created_at DESC);
CREATE INDEX idx_baselines_entity_snapshot ON public.project_entity_baselines USING gin (entity_snapshot);
CREATE INDEX idx_baselines_project ON public.project_entity_baselines USING btree (project_id);
CREATE INDEX idx_baselines_status ON public.project_entity_baselines USING btree (status);
CREATE INDEX idx_baselines_type ON public.project_entity_baselines USING btree (baseline_type);
CREATE INDEX idx_project_expenses_category ON public.project_expenses USING btree (cost_category_id);
CREATE INDEX idx_project_expenses_date ON public.project_expenses USING btree (expense_date);
CREATE INDEX idx_project_expenses_project ON public.project_expenses USING btree (project_id);
CREATE INDEX idx_project_expenses_status ON public.project_expenses USING btree (status);
CREATE INDEX idx_project_goals_project ON public.project_goals USING btree (project_id);
CREATE INDEX idx_project_goals_status ON public.project_goals USING btree (status);
CREATE INDEX project_integrations_project_id_idx ON public.project_integrations USING btree (project_id);
CREATE UNIQUE INDEX project_iterations_project_id_name_key ON public.project_iterations USING btree (project_id, name);
CREATE INDEX idx_project_iterations_project_id ON public.project_iterations USING btree (project_id);
CREATE INDEX idx_project_iterations_status ON public.project_iterations USING btree (status);
CREATE INDEX idx_project_org_chart_project_id ON public.project_org_chart USING btree (project_id);
CREATE UNIQUE INDEX unique_project_domain ON public.project_pmbok7_domains USING btree (project_id, domain_id);
CREATE INDEX idx_project_pmbok7_domains_domain ON public.project_pmbok7_domains USING btree (domain_id);
CREATE INDEX idx_project_pmbok7_domains_maturity ON public.project_pmbok7_domains USING btree (maturity_level);
CREATE INDEX idx_project_pmbok7_domains_project ON public.project_pmbok7_domains USING btree (project_id);
CREATE UNIQUE INDEX unique_project_principle ON public.project_pmbok7_principles USING btree (project_id, principle_id);
CREATE INDEX idx_project_pmbok7_principles_level ON public.project_pmbok7_principles USING btree (alignment_level);
CREATE INDEX idx_project_pmbok7_principles_principle ON public.project_pmbok7_principles USING btree (principle_id);
CREATE INDEX idx_project_pmbok7_principles_project ON public.project_pmbok7_principles USING btree (project_id);
CREATE UNIQUE INDEX project_priority_scores_project_id_criteria_id_key ON public.project_priority_scores USING btree (project_id, criteria_id);
CREATE INDEX idx_project_priority_scores_composite ON public.project_priority_scores USING btree (project_id, criteria_id);
CREATE INDEX idx_project_priority_scores_criteria ON public.project_priority_scores USING btree (criteria_id);
CREATE INDEX idx_project_priority_scores_project ON public.project_priority_scores USING btree (project_id);
CREATE INDEX idx_project_priority_scores_scored_at ON public.project_priority_scores USING btree (scored_at);
CREATE INDEX idx_project_priority_scores_scored_by ON public.project_priority_scores USING btree (scored_by) WHERE (scored_by IS NOT NULL);
CREATE UNIQUE INDEX project_resource_assignments_project_id_user_id_role_id_sta_key ON public.project_resource_assignments USING btree (project_id, user_id, role_id, start_date);
CREATE INDEX idx_project_resource_assignments_source_document ON public.project_resource_assignments USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE INDEX idx_project_resource_assignments_activity_id ON public.project_resource_assignments USING btree (activity_id) WHERE (activity_id IS NOT NULL);
CREATE INDEX idx_resource_assignments_project ON public.project_resource_assignments USING btree (project_id);
CREATE INDEX idx_resource_assignments_role ON public.project_resource_assignments USING btree (role_id);
CREATE INDEX idx_resource_assignments_status ON public.project_resource_assignments USING btree (status);
CREATE INDEX idx_resource_assignments_user ON public.project_resource_assignments USING btree (user_id);
CREATE UNIQUE INDEX project_roles_organization_id_role_name_key ON public.project_roles USING btree (organization_id, role_name);
CREATE UNIQUE INDEX project_roles_role_code_key ON public.project_roles USING btree (role_code);
CREATE INDEX idx_project_roles_active ON public.project_roles USING btree (is_active);
CREATE INDEX idx_project_roles_category ON public.project_roles USING btree (role_category);
CREATE INDEX idx_project_roles_type ON public.project_roles USING btree (role_type);
CREATE UNIQUE INDEX unique_task_number_per_project ON public.project_tasks USING btree (project_id, task_number);
CREATE INDEX idx_project_tasks_entity_type ON public.project_tasks USING btree (entity_type);
CREATE INDEX idx_project_tasks_parent ON public.project_tasks USING btree (parent_task_id);
CREATE INDEX idx_project_tasks_project ON public.project_tasks USING btree (project_id);
CREATE INDEX idx_project_tasks_role ON public.project_tasks USING btree (required_role_id);
CREATE INDEX idx_project_tasks_source_doc ON public.project_tasks USING btree (source_document_id);
CREATE INDEX idx_project_tasks_status ON public.project_tasks USING btree (status);
CREATE INDEX idx_project_tasks_wbs ON public.project_tasks USING btree (wbs_code);
CREATE INDEX idx_project_tasks_goal ON public.project_tasks USING btree (goal_id);
CREATE INDEX idx_team_evaluations_project_id ON public.project_team_evaluations USING btree (project_id);
CREATE INDEX idx_projects_actual_cost ON public.projects USING btree (actual_cost) WHERE (actual_cost > (0)::numeric);
CREATE INDEX idx_projects_archived ON public.projects USING btree (archived);
CREATE INDEX idx_projects_budget ON public.projects USING btree (budget) WHERE (budget > (0)::numeric);
CREATE INDEX idx_projects_company_id ON public.projects USING btree (company_id);
CREATE INDEX idx_projects_costs ON public.projects USING btree (internal_labor_cost, external_labor_cost, actual_cost);
CREATE INDEX idx_projects_created_by ON public.projects USING btree (created_by);
CREATE INDEX idx_projects_framework ON public.projects USING btree (framework) WHERE (framework IS NOT NULL);
CREATE INDEX idx_projects_metadata ON public.projects USING gin (metadata);
CREATE INDEX idx_projects_owner ON public.projects USING btree (owner_id);
CREATE INDEX idx_projects_owner_id ON public.projects USING btree (owner_id);
CREATE INDEX idx_projects_owner_updated ON public.projects USING btree (owner_id, updated_at DESC);
CREATE INDEX idx_projects_program_archived ON public.projects USING btree (program_id, archived);
CREATE INDEX idx_projects_program_id ON public.projects USING btree (program_id);
CREATE INDEX idx_projects_search ON public.projects USING gin (to_tsvector('english'::regconfig, (((COALESCE(name, ''::character varying))::text || ' '::text) || COALESCE(description, ''::text))));
CREATE INDEX idx_projects_status ON public.projects USING btree (status);
CREATE INDEX idx_projects_updated_at ON public.projects USING btree (updated_at DESC);
CREATE INDEX idx_projects_created_at ON public.projects USING btree (created_at);
CREATE INDEX idx_projects_team_members ON public.projects USING gin (team_members);
CREATE INDEX idx_prompt_templates_category ON public.prompt_templates USING btree (category);
CREATE INDEX idx_prompt_templates_methodology ON public.prompt_templates USING btree (methodology);
CREATE INDEX idx_prompt_templates_public ON public.prompt_templates USING btree (is_public);
CREATE INDEX idx_quality_audits_date ON public.quality_audits USING btree (audited_at DESC);
CREATE INDEX idx_quality_audits_document ON public.quality_audits USING btree (document_id);
CREATE INDEX idx_quality_audits_document_date ON public.quality_audits USING btree (document_id, audited_at DESC);
CREATE INDEX idx_quality_audits_grade ON public.quality_audits USING btree (overall_grade);
CREATE INDEX idx_quality_audits_provider ON public.quality_audits USING btree (ai_provider);
CREATE INDEX idx_quality_audits_score ON public.quality_audits USING btree (overall_score DESC);
CREATE INDEX idx_quality_audits_source_document ON public.quality_audits USING btree (source_document_id);
CREATE INDEX idx_quality_audits_source_location ON public.quality_audits USING btree (source_document_id, source_text_start);
CREATE UNIQUE INDEX quality_reports_report_id_key ON public.quality_reports USING btree (report_id);
CREATE INDEX idx_quality_reports_created_at ON public.quality_reports USING btree (created_at);
CREATE INDEX idx_quality_reports_document_id ON public.quality_reports USING btree (document_id);
CREATE INDEX idx_quality_reports_job_id ON public.quality_reports USING btree (job_id);
CREATE INDEX idx_quality_reports_report_id ON public.quality_reports USING btree (report_id);
CREATE UNIQUE INDEX quality_standards_project_id_standard_name_key ON public.quality_standards USING btree (project_id, standard_name);
CREATE UNIQUE INDEX quality_standards_project_name_unique ON public.quality_standards USING btree (project_id, standard_name);
CREATE INDEX idx_quality_standards_source_document ON public.quality_standards USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE INDEX idx_quality_trends_timeframe ON public.quality_trends USING btree (timeframe);
CREATE INDEX idx_quantum_stability_audit_qubit ON public.quantum_stability_audit USING btree (qubit_id);
CREATE INDEX idx_quantum_stability_audit_event ON public.quantum_stability_audit USING btree (event_type);
CREATE INDEX idx_quantum_stability_audit_timestamp ON public.quantum_stability_audit USING btree ("timestamp");
CREATE INDEX idx_quantum_stability_audit_infrared ON public.quantum_stability_audit USING btree (infrared_value);
CREATE INDEX idx_quantum_stability_metrics_timestamp ON public.quantum_stability_metrics USING btree ("timestamp");
CREATE INDEX idx_quantum_stability_metrics_efficiency ON public.quantum_stability_metrics USING btree (efficiency);
CREATE UNIQUE INDEX qubit_states_qubit_id_key ON public.qubit_states USING btree (qubit_id);
CREATE INDEX idx_qubit_states_qubit_id ON public.qubit_states USING btree (qubit_id);
CREATE INDEX idx_qubit_states_coherence ON public.qubit_states USING btree (coherence);
CREATE INDEX idx_qubit_states_temperature ON public.qubit_states USING btree (temperature);
CREATE INDEX idx_qubit_states_stability ON public.qubit_states USING btree (stability);
CREATE INDEX idx_qubit_states_infrared ON public.qubit_states USING btree (infrared_spectrum);
CREATE UNIQUE INDEX query_analytics_query_hash_key ON public.query_analytics USING btree (query_hash);
CREATE INDEX idx_query_analytics_frequency ON public.query_analytics USING btree (frequency);
CREATE INDEX idx_query_analytics_last_searched ON public.query_analytics USING btree (last_searched);
CREATE INDEX idx_query_analytics_query_hash ON public.query_analytics USING btree (query_hash);
CREATE INDEX idx_rag_analytics_type_time ON public.rag_analytics USING btree (operation_type, created_at DESC);
CREATE INDEX idx_rag_analytics_success ON public.rag_analytics USING btree (success, created_at DESC);
CREATE INDEX idx_rag_analytics_document ON public.rag_analytics USING btree (document_id) WHERE (document_id IS NOT NULL);
CREATE INDEX idx_regeneration_jobs_conflict_id ON public.regeneration_jobs USING btree (conflict_id);
CREATE INDEX idx_regeneration_jobs_created_at ON public.regeneration_jobs USING btree (created_at DESC);
CREATE INDEX idx_regeneration_jobs_document_id ON public.regeneration_jobs USING btree (document_id);
CREATE INDEX idx_regeneration_jobs_status ON public.regeneration_jobs USING btree (status);
CREATE INDEX idx_regeneration_jobs_user_id ON public.regeneration_jobs USING btree (user_id);
CREATE UNIQUE INDEX relationship_health_project_id_assessment_date_stakeholder__key ON public.relationship_health USING btree (project_id, assessment_date, stakeholder_id);
CREATE INDEX idx_relationship_health_date ON public.relationship_health USING btree (assessment_date);
CREATE INDEX idx_relationship_health_project_id ON public.relationship_health USING btree (project_id);
CREATE INDEX idx_relationship_health_score ON public.relationship_health USING btree (health_score);
CREATE INDEX idx_relationship_health_stakeholder ON public.relationship_health USING btree (stakeholder_id);
CREATE INDEX idx_relationship_health_strength ON public.relationship_health USING btree (relationship_strength);
CREATE UNIQUE INDEX releases_project_id_release_number_key ON public.releases USING btree (project_id, release_number);
CREATE INDEX idx_releases_project ON public.releases USING btree (project_id);
CREATE INDEX idx_releases_status ON public.releases USING btree (status);
CREATE UNIQUE INDEX relevance_feedback_result_id_user_id_key ON public.relevance_feedback USING btree (result_id, user_id);
CREATE INDEX idx_relevance_feedback_relevance_score ON public.relevance_feedback USING btree (relevance_score);
CREATE INDEX idx_relevance_feedback_result_id ON public.relevance_feedback USING btree (result_id);
CREATE INDEX idx_relevance_feedback_user_id ON public.relevance_feedback USING btree (user_id);
CREATE UNIQUE INDEX requirements_project_name_unique ON public.requirements USING btree (project_id, name);
CREATE INDEX idx_requirements_priority ON public.requirements USING btree (priority);
CREATE INDEX idx_requirements_project_id ON public.requirements USING btree (project_id);
CREATE INDEX idx_requirements_source_document ON public.requirements USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE INDEX idx_requirements_source_location ON public.requirements USING btree (source_document_id, source_text_start);
CREATE INDEX idx_requirements_status ON public.requirements USING btree (status);
CREATE UNIQUE INDEX idx_requirements_idempotency ON public.requirements USING btree (project_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX idx_requirements_idempotency_key ON public.requirements USING btree (idempotency_key);
CREATE INDEX idx_requirements_traceability_project_id ON public.requirements_traceability USING btree (project_id);
CREATE UNIQUE INDEX resolution_strategies_strategy_id_key ON public.resolution_strategies USING btree (strategy_id);
CREATE INDEX idx_resolution_strategies_conditions_gin ON public.resolution_strategies USING gin (conditions);
CREATE INDEX idx_resolution_strategies_config_gin ON public.resolution_strategies USING gin (config);
CREATE INDEX idx_resolution_strategies_enabled ON public.resolution_strategies USING btree (enabled);
CREATE INDEX idx_resolution_strategies_priority ON public.resolution_strategies USING btree (priority);
CREATE INDEX idx_resolution_strategies_type ON public.resolution_strategies USING btree (strategy_type);
CREATE UNIQUE INDEX resource_articles_slug_key ON public.resource_articles USING btree (slug);
CREATE INDEX idx_resource_articles_status_published_at ON public.resource_articles USING btree (status, published_at DESC);
CREATE INDEX idx_resource_articles_tags ON public.resource_articles USING gin (tags);
CREATE INDEX idx_resource_articles_type_status ON public.resource_articles USING btree (content_type, status);
CREATE UNIQUE INDEX resource_assignments_project_id_assignment_id_key ON public.resource_assignments USING btree (project_id, assignment_id);
CREATE INDEX idx_resource_assignments_activity ON public.resource_assignments USING btree (activity_id);
CREATE INDEX idx_resource_assignments_dates ON public.resource_assignments USING btree (start_date, end_date);
CREATE INDEX idx_resource_assignments_project_id ON public.resource_assignments USING btree (project_id);
CREATE INDEX idx_resource_assignments_resource ON public.resource_assignments USING btree (resource_id);
CREATE UNIQUE INDEX unique_user_capacity_period ON public.resource_capacity_settings USING btree (user_id, effective_from);
CREATE INDEX idx_resource_capacity_active ON public.resource_capacity_settings USING btree (is_active);
CREATE INDEX idx_resource_capacity_dates ON public.resource_capacity_settings USING btree (effective_from, effective_until);
CREATE INDEX idx_resource_capacity_type ON public.resource_capacity_settings USING btree (resource_type);
CREATE INDEX idx_resource_capacity_user ON public.resource_capacity_settings USING btree (user_id);
CREATE UNIQUE INDEX resource_conflicts_project_id_conflict_id_key ON public.resource_conflicts USING btree (project_id, conflict_id);
CREATE INDEX idx_resource_conflicts_project_id ON public.resource_conflicts USING btree (project_id);
CREATE INDEX idx_resource_conflicts_resource ON public.resource_conflicts USING btree (resource_id);
CREATE INDEX idx_resource_conflicts_status ON public.resource_conflicts USING btree (resolution_status);
CREATE INDEX idx_resource_conflicts_type ON public.resource_conflicts USING btree (conflict_type);
CREATE INDEX idx_resource_conflicts_resolution ON public.resource_conflicts USING btree (resolution) WHERE (resolution IS NOT NULL);
CREATE INDEX idx_resource_conflicts_resolution_date ON public.resource_conflicts USING btree (resolution_date);
CREATE INDEX idx_resource_plans_project_id ON public.resource_plans USING btree (project_id);
CREATE UNIQUE INDEX resource_pool_project_id_resource_id_key ON public.resource_pool USING btree (project_id, resource_id);
CREATE INDEX idx_resource_pool_availability ON public.resource_pool USING btree (availability_start_date, availability_end_date);
CREATE INDEX idx_resource_pool_project_id ON public.resource_pool USING btree (project_id);
CREATE INDEX idx_resource_pool_status ON public.resource_pool USING btree (status);
CREATE INDEX idx_resource_pool_type ON public.resource_pool USING btree (resource_type);
CREATE UNIQUE INDEX resource_templates_slug_key ON public.resource_templates USING btree (slug);
CREATE INDEX idx_resource_templates_category ON public.resource_templates USING btree (category);
CREATE INDEX idx_resource_templates_status ON public.resource_templates USING btree (status);
CREATE INDEX idx_resource_templates_tags ON public.resource_templates USING gin (tags);
CREATE INDEX idx_resource_unavailability_dates ON public.resource_unavailability USING btree (start_date, end_date);
CREATE INDEX idx_resource_unavailability_status ON public.resource_unavailability USING btree (status);
CREATE INDEX idx_resource_unavailability_type ON public.resource_unavailability USING btree (unavailability_type);
CREATE INDEX idx_resource_unavailability_user ON public.resource_unavailability USING btree (user_id);
CREATE UNIQUE INDEX resources_project_name_unique ON public.resources USING btree (project_id, name);
CREATE INDEX idx_resources_conflict_severity ON public.resources USING btree (conflict_severity) WHERE (conflict_severity IS NOT NULL);
CREATE INDEX idx_resources_conflict_status ON public.resources USING btree (conflict_status) WHERE (conflict_status IS NOT NULL);
CREATE INDEX idx_resources_source_document ON public.resources USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE INDEX idx_resources_source_location ON public.resources USING btree (source_document_id, source_text_start);
CREATE INDEX idx_resources_availability_pct ON public.resources USING btree (availability_pct);
CREATE INDEX idx_resources_cost_rate ON public.resources USING btree (cost_rate);
CREATE INDEX idx_review_action_items_assigned_to ON public.review_action_items USING btree (assigned_to);
CREATE INDEX idx_review_action_items_due_date ON public.review_action_items USING btree (due_date);
CREATE INDEX idx_review_action_items_meeting_id ON public.review_action_items USING btree (review_meeting_id);
CREATE INDEX idx_review_action_items_priority ON public.review_action_items USING btree (priority);
CREATE INDEX idx_review_action_items_status ON public.review_action_items USING btree (status);
CREATE INDEX idx_review_decisions_approved_by ON public.review_decisions USING btree (approved_by);
CREATE INDEX idx_review_decisions_implementation_status ON public.review_decisions USING btree (implementation_status);
CREATE INDEX idx_review_decisions_meeting_id ON public.review_decisions USING btree (review_meeting_id);
CREATE INDEX idx_review_meetings_actual_date ON public.review_meetings USING btree (actual_date);
CREATE INDEX idx_review_meetings_program_id ON public.review_meetings USING btree (program_id);
CREATE INDEX idx_review_meetings_schedule_id ON public.review_meetings USING btree (schedule_id);
CREATE INDEX idx_review_meetings_scheduled_date ON public.review_meetings USING btree (scheduled_date);
CREATE INDEX idx_review_meetings_status ON public.review_meetings USING btree (status);
CREATE INDEX idx_review_schedules_frequency ON public.review_schedules USING btree (frequency);
CREATE INDEX idx_review_schedules_is_active ON public.review_schedules USING btree (is_active);
CREATE INDEX idx_review_schedules_program_id ON public.review_schedules USING btree (program_id);
CREATE INDEX idx_review_schedules_review_owner_id ON public.review_schedules USING btree (review_owner_id);
CREATE INDEX idx_risk_appetite_project_id ON public.risk_appetite USING btree (project_id);
CREATE UNIQUE INDEX risk_assessments_project_id_risk_id_assessment_date_key ON public.risk_assessments USING btree (project_id, risk_id, assessment_date);
CREATE INDEX idx_risk_assessments_assessment_date ON public.risk_assessments USING btree (assessment_date);
CREATE INDEX idx_risk_assessments_date ON public.risk_assessments USING btree (assessment_date);
CREATE INDEX idx_risk_assessments_project_id ON public.risk_assessments USING btree (project_id);
CREATE INDEX idx_risk_assessments_risk ON public.risk_assessments USING btree (risk_id);
CREATE INDEX idx_risk_assessments_score ON public.risk_assessments USING btree (risk_score);
CREATE INDEX idx_risk_checklists_project_id ON public.risk_checklists USING btree (project_id);
CREATE INDEX idx_risk_escalation_event_steps_event ON public.risk_escalation_event_steps USING btree (event_id, status);
CREATE INDEX idx_risk_escalation_events_status ON public.risk_escalation_events USING btree (status, triggered_at DESC);
CREATE INDEX idx_risk_escalation_policies_active ON public.risk_escalation_policies USING btree (active, escalation_type);
CREATE UNIQUE INDEX risk_escalation_steps_policy_id_step_order_key ON public.risk_escalation_steps USING btree (policy_id, step_order);
CREATE INDEX idx_risk_escalation_steps_policy ON public.risk_escalation_steps USING btree (policy_id, step_order);
CREATE UNIQUE INDEX risk_metrics_project_id_metric_date_key ON public.risk_metrics USING btree (project_id, metric_date);
CREATE INDEX idx_risk_metrics_date ON public.risk_metrics USING btree (metric_date);
CREATE INDEX idx_risk_metrics_project_id ON public.risk_metrics USING btree (project_id);
CREATE INDEX idx_risk_response_plans_project_id ON public.risk_response_plans USING btree (project_id);
CREATE INDEX idx_risk_response_plans_risk ON public.risk_response_plans USING btree (risk_id);
CREATE INDEX idx_risk_response_plans_status ON public.risk_response_plans USING btree (status);
CREATE INDEX idx_risk_response_plans_strategy ON public.risk_response_plans USING btree (response_strategy);
CREATE UNIQUE INDEX risk_responses_project_id_risk_title_response_date_key ON public.risk_responses USING btree (project_id, risk_title, response_date);
CREATE INDEX idx_risk_responses_project_id ON public.risk_responses USING btree (project_id);
CREATE INDEX idx_risk_responses_risk_id ON public.risk_responses USING btree (risk_id);
CREATE INDEX idx_risk_responses_source_document ON public.risk_responses USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE UNIQUE INDEX risk_reviews_project_id_review_id_key ON public.risk_reviews USING btree (project_id, review_id);
CREATE INDEX idx_risk_reviews_date ON public.risk_reviews USING btree (review_date);
CREATE INDEX idx_risk_reviews_project_id ON public.risk_reviews USING btree (project_id);
CREATE INDEX idx_risk_reviews_type ON public.risk_reviews USING btree (review_type);
CREATE UNIQUE INDEX risk_triggers_project_id_risk_id_trigger_name_key ON public.risk_triggers USING btree (project_id, risk_id, trigger_name);
CREATE INDEX idx_risk_triggers_project_id ON public.risk_triggers USING btree (project_id);
CREATE INDEX idx_risk_triggers_risk ON public.risk_triggers USING btree (risk_id);
CREATE INDEX idx_risk_triggers_status ON public.risk_triggers USING btree (status);
CREATE INDEX idx_risk_triggers_title ON public.risk_triggers USING btree (risk_title);
CREATE INDEX idx_risk_triggers_response_action ON public.risk_triggers USING btree (response_action) WHERE (response_action IS NOT NULL);
CREATE UNIQUE INDEX risks_project_id_name_key ON public.risks USING btree (project_id, name);
CREATE UNIQUE INDEX risks_project_name_unique ON public.risks USING btree (project_id, name);
CREATE UNIQUE INDEX risks_project_title_unique ON public.risks USING btree (project_id, title);
CREATE INDEX idx_risks_affects_programs ON public.risks USING gin (affects_programs);
CREATE INDEX idx_risks_cross_program ON public.risks USING btree (cross_program) WHERE (cross_program = true);
CREATE INDEX idx_risks_is_curated ON public.risks USING btree (is_curated);
CREATE INDEX idx_risks_last_review_date ON public.risks USING btree (last_review_date);
CREATE INDEX idx_risks_monthly_review_status ON public.risks USING btree (monthly_review_status);
CREATE INDEX idx_risks_next_review_due_date ON public.risks USING btree (next_review_due_date);
CREATE INDEX idx_risks_playbook_execution ON public.risks USING btree (playbook_execution_id) WHERE (playbook_execution_id IS NOT NULL);
CREATE INDEX idx_risks_program_id ON public.risks USING btree (program_id) WHERE (program_id IS NOT NULL);
CREATE INDEX idx_risks_project_id ON public.risks USING btree (project_id);
CREATE INDEX idx_risks_recommended_playbook ON public.risks USING btree (recommended_playbook_id) WHERE (recommended_playbook_id IS NOT NULL);
CREATE INDEX idx_risks_risk_level ON public.risks USING btree (risk_level);
CREATE INDEX idx_risks_risk_origin ON public.risks USING btree (risk_origin);
CREATE INDEX idx_risks_source_document ON public.risks USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE INDEX idx_risks_source_location ON public.risks USING btree (source_document_id, source_text_start);
CREATE INDEX idx_risks_status ON public.risks USING btree (status);
CREATE INDEX idx_risks_systemic ON public.risks USING btree (systemic_risk) WHERE (systemic_risk = true);
CREATE INDEX idx_risks_tags ON public.risks USING gin (tags);
CREATE UNIQUE INDEX idx_risks_idempotency ON public.risks USING btree (project_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX idx_risks_idempotency_key ON public.risks USING btree (idempotency_key);
CREATE UNIQUE INDEX unique_role_competency ON public.role_competencies USING btree (role_id, competency_id);
CREATE INDEX idx_role_competencies_competency ON public.role_competencies USING btree (competency_id);
CREATE INDEX idx_role_competencies_role ON public.role_competencies USING btree (role_id);
CREATE UNIQUE INDEX unique_role_skill ON public.role_skills USING btree (role_id, skill_id);
CREATE INDEX idx_role_skills_role ON public.role_skills USING btree (role_id);
CREATE INDEX idx_role_skills_skill ON public.role_skills USING btree (skill_id);
CREATE INDEX idx_roles_responsibilities_project_id ON public.roles_and_responsibilities USING btree (project_id);
CREATE UNIQUE INDEX satisfaction_surveys_project_id_survey_id_key ON public.satisfaction_surveys USING btree (project_id, survey_id);
CREATE INDEX idx_satisfaction_surveys_date ON public.satisfaction_surveys USING btree (survey_date);
CREATE INDEX idx_satisfaction_surveys_nps ON public.satisfaction_surveys USING btree (nps_score);
CREATE INDEX idx_satisfaction_surveys_project_id ON public.satisfaction_surveys USING btree (project_id);
CREATE INDEX idx_satisfaction_surveys_score ON public.satisfaction_surveys USING btree (satisfaction_score);
CREATE INDEX idx_satisfaction_surveys_stakeholder ON public.satisfaction_surveys USING btree (stakeholder_id);
CREATE INDEX idx_satisfaction_surveys_sentiment ON public.satisfaction_surveys USING btree (sentiment);
CREATE INDEX idx_schedule_activities_project_id ON public.schedule_activities USING btree (project_id);
CREATE INDEX idx_schedule_baseline_project_id ON public.schedule_baseline USING btree (project_id);
CREATE UNIQUE INDEX schedule_baselines_project_id_baseline_name_baseline_versio_key ON public.schedule_baselines USING btree (project_id, baseline_name, baseline_version);
CREATE INDEX idx_schedule_baselines_current ON public.schedule_baselines USING btree (project_id, is_current) WHERE (is_current = true);
CREATE INDEX idx_schedule_baselines_dates ON public.schedule_baselines USING btree (baseline_start_date, baseline_end_date);
CREATE INDEX idx_schedule_baselines_project_id ON public.schedule_baselines USING btree (project_id);
CREATE INDEX idx_schedule_forecasts_project_id ON public.schedule_forecasts USING btree (project_id);
CREATE INDEX idx_schedule_variances_project_id ON public.schedule_variances USING btree (project_id);
CREATE INDEX idx_scope_baseline_project_id ON public.scope_baseline USING btree (project_id);
CREATE UNIQUE INDEX scope_baselines_project_id_baseline_name_baseline_version_key ON public.scope_baselines USING btree (project_id, baseline_name, baseline_version);
CREATE INDEX idx_scope_baselines_current ON public.scope_baselines USING btree (project_id, is_current) WHERE (is_current = true);
CREATE INDEX idx_scope_baselines_project_id ON public.scope_baselines USING btree (project_id);
CREATE INDEX idx_scope_baselines_status ON public.scope_baselines USING btree (status);
CREATE INDEX idx_scope_change_requests_project_id ON public.scope_change_requests USING btree (project_id);
CREATE UNIQUE INDEX scope_items_project_name_unique ON public.scope_items USING btree (project_id, item_name);
CREATE INDEX idx_scope_items_source_document ON public.scope_items USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE INDEX idx_scope_items_source_location ON public.scope_items USING btree (source_document_id, source_text_start);
CREATE INDEX idx_scope_verification_project_id ON public.scope_verification USING btree (project_id);
CREATE INDEX idx_search_analytics_created ON public.search_analytics USING btree (created_at DESC);
CREATE INDEX idx_search_analytics_frameworks ON public.search_analytics USING gin (frameworks);
CREATE INDEX idx_search_analytics_has_results ON public.search_analytics USING btree (has_results, created_at DESC);
CREATE INDEX idx_search_analytics_mode ON public.search_analytics USING btree (search_mode, created_at DESC);
CREATE INDEX idx_search_analytics_query ON public.search_analytics USING btree (query, created_at DESC);
CREATE INDEX idx_search_analytics_query_fts ON public.search_analytics USING gin (to_tsvector('english'::regconfig, query));
CREATE INDEX idx_search_analytics_types ON public.search_analytics USING gin (types);
CREATE INDEX idx_search_analytics_user ON public.search_analytics USING btree (user_id, created_at DESC);
CREATE INDEX idx_search_history_created_at ON public.search_history USING btree (created_at);
CREATE INDEX idx_search_history_project_id ON public.search_history USING btree (project_id);
CREATE INDEX idx_search_history_query ON public.search_history USING gin (to_tsvector('english'::regconfig, query));
CREATE INDEX idx_search_history_search_strategy ON public.search_history USING btree (search_strategy);
CREATE INDEX idx_search_history_template_id ON public.search_history USING btree (template_id);
CREATE INDEX idx_search_history_user_id ON public.search_history USING btree (user_id);
CREATE UNIQUE INDEX search_index_source_source_id_key ON public.search_index USING btree (source, source_id);
CREATE INDEX idx_search_index_access_count ON public.search_index USING btree (access_count);
CREATE INDEX idx_search_index_created_at ON public.search_index USING btree (created_at);
CREATE INDEX idx_search_index_keywords ON public.search_index USING gin (keywords);
CREATE INDEX idx_search_index_metadata ON public.search_index USING gin (metadata);
CREATE INDEX idx_search_index_relevance_score ON public.search_index USING btree (relevance_score);
CREATE INDEX idx_search_index_source ON public.search_index USING btree (source);
CREATE INDEX idx_search_index_type ON public.search_index USING btree (type);
CREATE INDEX idx_search_clicks_created ON public.search_result_clicks USING btree (created_at DESC);
CREATE INDEX idx_search_clicks_position ON public.search_result_clicks USING btree (result_position);
CREATE INDEX idx_search_clicks_result ON public.search_result_clicks USING btree (result_id, result_type);
CREATE INDEX idx_search_clicks_search ON public.search_result_clicks USING btree (search_id, created_at DESC);
CREATE INDEX idx_search_clicks_user ON public.search_result_clicks USING btree (user_id, created_at DESC);
CREATE INDEX idx_suggestion_clicks_created ON public.search_suggestion_clicks USING btree (created_at DESC);
CREATE INDEX idx_suggestion_clicks_text ON public.search_suggestion_clicks USING btree (suggestion_text, created_at DESC);
CREATE INDEX idx_suggestion_clicks_type ON public.search_suggestion_clicks USING btree (suggestion_type, created_at DESC);
CREATE INDEX idx_suggestion_clicks_user ON public.search_suggestion_clicks USING btree (user_id, created_at DESC);
CREATE INDEX idx_security_events_created_at ON public.security_events USING btree (created_at);
CREATE INDEX idx_security_events_type ON public.security_events USING btree (event_type);
CREATE INDEX idx_semantic_units_created_at ON public.semantic_units USING btree (created_at);
CREATE INDEX idx_semantic_units_document_id ON public.semantic_units USING btree (document_id);
CREATE INDEX idx_semantic_units_type ON public.semantic_units USING btree (type);
CREATE INDEX idx_signature_audit_logs_action_type ON public.signature_audit_logs USING btree (action_type);
CREATE INDEX idx_signature_audit_logs_document_id ON public.signature_audit_logs USING btree (document_id);
CREATE INDEX idx_signature_audit_logs_document_signature_id ON public.signature_audit_logs USING btree (document_signature_id);
CREATE INDEX idx_signature_audit_logs_performed_at ON public.signature_audit_logs USING btree (performed_at DESC);
CREATE INDEX idx_signature_audit_logs_performed_by ON public.signature_audit_logs USING btree (performed_by) WHERE (performed_by IS NOT NULL);
CREATE INDEX idx_signature_fields_approval_request ON public.signature_fields USING btree (approval_request_id) WHERE (approval_request_id IS NOT NULL);
CREATE INDEX idx_signature_fields_assigned_to ON public.signature_fields USING btree (assigned_to_user_id) WHERE (assigned_to_user_id IS NOT NULL);
CREATE INDEX idx_signature_fields_document_id ON public.signature_fields USING btree (document_id);
CREATE INDEX idx_signature_fields_status ON public.signature_fields USING btree (status) WHERE ((status)::text = 'pending'::text);
CREATE UNIQUE INDEX signature_recipients_invitation_token_key ON public.signature_recipients USING btree (invitation_token);
CREATE INDEX idx_signature_recipients_document_signature_id ON public.signature_recipients USING btree (document_signature_id);
CREATE INDEX idx_signature_recipients_email ON public.signature_recipients USING btree (email);
CREATE INDEX idx_signature_recipients_invitation_token ON public.signature_recipients USING btree (invitation_token) WHERE (invitation_token IS NOT NULL);
CREATE INDEX idx_signature_recipients_status ON public.signature_recipients USING btree (status);
CREATE INDEX idx_signature_recipients_user_id ON public.signature_recipients USING btree (user_id) WHERE (user_id IS NOT NULL);
CREATE UNIQUE INDEX skills_name_key ON public.skills USING btree (name);
CREATE INDEX idx_skills_category ON public.skills USING btree (category);
CREATE INDEX idx_skills_name ON public.skills USING btree (name);
CREATE INDEX idx_sla_violations_detected_at ON public.sla_violations USING btree (detected_at DESC);
CREATE INDEX idx_sla_violations_resolved ON public.sla_violations USING btree (resolved_at) WHERE (resolved_at IS NULL);
CREATE INDEX idx_sla_violations_template_id ON public.sla_violations USING btree (template_id);
CREATE UNIQUE INDEX source_authority_source_source_id_key ON public.source_authority USING btree (source, source_id);
CREATE INDEX idx_source_authority_authority_score ON public.source_authority USING btree (authority_score);
CREATE INDEX idx_source_authority_source ON public.source_authority USING btree (source);
CREATE INDEX idx_source_authority_verification_status ON public.source_authority USING btree (verification_status);
CREATE UNIQUE INDEX src_schema_migrations_migration_number_migration_name_key ON public.src_schema_migrations USING btree (migration_number, migration_name);
CREATE INDEX idx_stage_executions_job_id ON public.stage_executions USING btree (job_id);
CREATE INDEX idx_stage_executions_job_stage ON public.stage_executions USING btree (job_id, stage_id, created_at DESC);
CREATE INDEX idx_stage_executions_stage_id ON public.stage_executions USING btree (stage_id);
CREATE INDEX idx_stage_executions_status ON public.stage_executions USING btree (status);
CREATE UNIQUE INDEX stage_jobs_job_id_key ON public.stage_jobs USING btree (job_id);
CREATE INDEX idx_stage_jobs_created_at ON public.stage_jobs USING btree (created_at);
CREATE INDEX idx_stage_jobs_job_id ON public.stage_jobs USING btree (job_id);
CREATE INDEX idx_stage_jobs_stage_id ON public.stage_jobs USING btree (stage_id);
CREATE INDEX idx_stage_jobs_stage_type ON public.stage_jobs USING btree (stage_type);
CREATE INDEX idx_stage_jobs_status ON public.stage_jobs USING btree (status);
CREATE INDEX idx_stage_metrics_created_at ON public.stage_metrics USING btree (created_at);
CREATE INDEX idx_stage_metrics_stage_id ON public.stage_metrics USING btree (stage_id);
CREATE INDEX idx_stage_metrics_stage_type ON public.stage_metrics USING btree (stage_type);
CREATE INDEX idx_stage_metrics_success ON public.stage_metrics USING btree (success);
CREATE UNIQUE INDEX unique_stakeholder_competency ON public.stakeholder_competencies USING btree (stakeholder_id, competency_id);
CREATE INDEX idx_stakeholder_competencies_competency ON public.stakeholder_competencies USING btree (competency_id);
CREATE INDEX idx_stakeholder_competencies_stakeholder ON public.stakeholder_competencies USING btree (stakeholder_id);
CREATE INDEX idx_stakeholder_engagements_project_id ON public.stakeholder_engagements USING btree (project_id);
CREATE UNIQUE INDEX stakeholder_issues_project_id_issue_id_key ON public.stakeholder_issues USING btree (project_id, issue_id);
CREATE INDEX idx_stakeholder_issues_date ON public.stakeholder_issues USING btree (reported_date);
CREATE INDEX idx_stakeholder_issues_issue_id ON public.stakeholder_issues USING btree (issue_id);
CREATE INDEX idx_stakeholder_issues_priority ON public.stakeholder_issues USING btree (priority);
CREATE INDEX idx_stakeholder_issues_project_id ON public.stakeholder_issues USING btree (project_id);
CREATE INDEX idx_stakeholder_issues_stakeholder ON public.stakeholder_issues USING btree (stakeholder_id);
CREATE INDEX idx_stakeholder_issues_status ON public.stakeholder_issues USING btree (resolution_status);
CREATE INDEX idx_stakeholder_issues_reported_date ON public.stakeholder_issues USING btree (reported_date) WHERE (reported_date IS NOT NULL);
CREATE UNIQUE INDEX unique_stakeholder_role_project ON public.stakeholder_role_assignments USING btree (stakeholder_id, role_id, project_id);
CREATE INDEX idx_stakeholder_role_assignments_project ON public.stakeholder_role_assignments USING btree (project_id);
CREATE INDEX idx_stakeholder_role_assignments_role ON public.stakeholder_role_assignments USING btree (role_id);
CREATE INDEX idx_stakeholder_role_assignments_stakeholder ON public.stakeholder_role_assignments USING btree (stakeholder_id);
CREATE INDEX idx_stakeholder_role_assignments_status ON public.stakeholder_role_assignments USING btree (status);
CREATE UNIQUE INDEX unique_stakeholder_skill ON public.stakeholder_skills USING btree (stakeholder_id, skill_id);
CREATE INDEX idx_stakeholder_skills_skill ON public.stakeholder_skills USING btree (skill_id);
CREATE INDEX idx_stakeholder_skills_stakeholder ON public.stakeholder_skills USING btree (stakeholder_id);
CREATE INDEX idx_stakeholder_skills_verified ON public.stakeholder_skills USING btree (verified);
CREATE UNIQUE INDEX stakeholders_project_name_unique ON public.stakeholders USING btree (project_id, name);
CREATE INDEX idx_stakeholders_email ON public.stakeholders USING btree (email);
CREATE INDEX idx_stakeholders_engagement_approach ON public.stakeholders USING btree (engagement_approach);
CREATE INDEX idx_stakeholders_is_team_member ON public.stakeholders USING btree (project_id, is_team_member) WHERE (is_team_member = true);
CREATE INDEX idx_stakeholders_project_id ON public.stakeholders USING btree (project_id);
CREATE INDEX idx_stakeholders_role ON public.stakeholders USING btree (role);
CREATE INDEX idx_stakeholders_source_document ON public.stakeholders USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE INDEX idx_stakeholders_source_location ON public.stakeholders USING btree (source_document_id, source_text_start);
CREATE INDEX idx_stakeholders_stakeholder_type ON public.stakeholders USING btree (stakeholder_type);
CREATE INDEX idx_stakeholders_user_id ON public.stakeholders USING btree (user_id);
CREATE INDEX idx_stakeholders_interest_level ON public.stakeholders USING btree (interest_level);
CREATE INDEX idx_stakeholders_influence_level ON public.stakeholders USING btree (influence_level);
CREATE INDEX idx_stakeholders_stakeholder_category ON public.stakeholders USING btree (stakeholder_category);
CREATE UNIQUE INDEX idx_stakeholders_idempotency ON public.stakeholders USING btree (project_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX idx_stakeholders_idempotency_key ON public.stakeholders USING btree (idempotency_key);
CREATE INDEX idx_steering_committees_project_id ON public.steering_committees USING btree (project_id);
CREATE UNIQUE INDEX success_criteria_project_name_unique ON public.success_criteria USING btree (project_id, name);
CREATE INDEX idx_success_criteria_project_id ON public.success_criteria USING btree (project_id);
CREATE INDEX idx_success_criteria_source_document ON public.success_criteria USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE INDEX idx_success_criteria_source_location ON public.success_criteria USING btree (source_document_id, source_text_start);
CREATE UNIQUE INDEX success_criteria_idempotency_key_key ON public.success_criteria USING btree (idempotency_key);
CREATE INDEX idx_success_criteria_idempotency_key ON public.success_criteria USING btree (idempotency_key);
CREATE INDEX idx_system_metrics_recorded_at ON public.system_metrics USING btree (recorded_at);
CREATE UNIQUE INDEX system_settings_setting_key_key ON public.system_settings USING btree (setting_key);
CREATE INDEX idx_system_settings_key ON public.system_settings USING btree (setting_key);
CREATE UNIQUE INDEX unique_task_user_assignment ON public.task_assignments USING btree (task_id, user_id);
CREATE INDEX idx_task_assignments_resource ON public.task_assignments USING btree (resource_assignment_id);
CREATE INDEX idx_task_assignments_status ON public.task_assignments USING btree (status);
CREATE INDEX idx_task_assignments_task ON public.task_assignments USING btree (task_id);
CREATE INDEX idx_task_assignments_user ON public.task_assignments USING btree (user_id);
CREATE UNIQUE INDEX unique_dependency ON public.task_dependencies USING btree (task_id, depends_on_task_id);
CREATE INDEX idx_task_dependencies_depends_on ON public.task_dependencies USING btree (depends_on_task_id);
CREATE INDEX idx_task_dependencies_task ON public.task_dependencies USING btree (task_id);
CREATE UNIQUE INDEX unique_task_role ON public.task_roles USING btree (task_id, role_id, role_type);
CREATE INDEX idx_task_roles_role ON public.task_roles USING btree (role_id);
CREATE INDEX idx_task_roles_task ON public.task_roles USING btree (task_id);
CREATE INDEX idx_task_roles_type ON public.task_roles USING btree (role_type);
CREATE INDEX idx_adherence_log_agreement ON public.team_agreement_adherence_log USING btree (agreement_id);
CREATE INDEX idx_adherence_log_agreement_date ON public.team_agreement_adherence_log USING btree (agreement_id, date_recorded DESC);
CREATE INDEX idx_adherence_log_date ON public.team_agreement_adherence_log USING btree (date_recorded DESC);
CREATE UNIQUE INDEX team_agreements_project_id_title_key ON public.team_agreements USING btree (project_id, title);
CREATE INDEX idx_team_agreements_agreed_by ON public.team_agreements USING gin (agreed_by);
CREATE INDEX idx_team_agreements_category ON public.team_agreements USING btree (category);
CREATE INDEX idx_team_agreements_effective_date ON public.team_agreements USING btree (effective_date DESC);
CREATE INDEX idx_team_agreements_next_review ON public.team_agreements USING btree (next_review_date) WHERE (next_review_date IS NOT NULL);
CREATE INDEX idx_team_agreements_project ON public.team_agreements USING btree (project_id);
CREATE INDEX idx_team_agreements_project_id ON public.team_agreements USING btree (project_id);
CREATE INDEX idx_team_agreements_status ON public.team_agreements USING btree (status);
CREATE INDEX idx_team_availability_project_id ON public.team_availability USING btree (project_id);
CREATE UNIQUE INDEX technologies_project_id_name_key ON public.technologies USING btree (project_id, name);
CREATE INDEX idx_technologies_category ON public.technologies USING btree (project_id, category);
CREATE INDEX idx_technologies_project_id ON public.technologies USING btree (project_id);
CREATE INDEX idx_technologies_source_document ON public.technologies USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE UNIQUE INDEX template_comparison_metrics_template_id_a_template_id_b_met_key ON public.template_comparison_metrics USING btree (template_id_a, template_id_b, metric_name, comparison_period_start);
CREATE INDEX idx_template_comparison_a ON public.template_comparison_metrics USING btree (template_id_a);
CREATE INDEX idx_template_comparison_b ON public.template_comparison_metrics USING btree (template_id_b);
CREATE INDEX idx_template_comparison_type ON public.template_comparison_metrics USING btree (comparison_type);
CREATE INDEX idx_template_improvement_suggestions_source_document ON public.template_improvement_suggestions USING btree (source_document_id);
CREATE INDEX idx_template_improvement_suggestions_source_location ON public.template_improvement_suggestions USING btree (source_document_id, source_text_start);
CREATE INDEX idx_template_improvements_date ON public.template_improvement_suggestions USING btree (created_at DESC);
CREATE INDEX idx_template_improvements_pending ON public.template_improvement_suggestions USING btree (status, priority) WHERE ((status)::text = 'pending_review'::text);
CREATE INDEX idx_template_improvements_priority ON public.template_improvement_suggestions USING btree (priority);
CREATE INDEX idx_template_improvements_status ON public.template_improvement_suggestions USING btree (status);
CREATE INDEX idx_template_improvements_template ON public.template_improvement_suggestions USING btree (template_id);
CREATE INDEX idx_maintenance_assigned ON public.template_maintenance_log USING btree (assigned_to);
CREATE INDEX idx_maintenance_priority ON public.template_maintenance_log USING btree (priority);
CREATE INDEX idx_maintenance_status ON public.template_maintenance_log USING btree (action_status);
CREATE INDEX idx_maintenance_template ON public.template_maintenance_log USING btree (template_id, created_at DESC);
CREATE INDEX idx_template_performance_created_at ON public.template_performance USING btree (created_at);
CREATE INDEX idx_template_performance_template_id ON public.template_performance USING btree (template_id);
CREATE UNIQUE INDEX template_quality_metrics_template_id_period_type_period_sta_key ON public.template_quality_metrics USING btree (template_id, period_type, period_start);
CREATE INDEX idx_template_quality_period ON public.template_quality_metrics USING btree (period_type, period_start DESC);
CREATE INDEX idx_template_quality_priority ON public.template_quality_metrics USING btree (maintenance_priority);
CREATE INDEX idx_template_quality_success_rate ON public.template_quality_metrics USING btree (success_rate DESC);
CREATE INDEX idx_template_quality_template ON public.template_quality_metrics USING btree (template_id);
CREATE INDEX idx_template_status_history_date ON public.template_status_history USING btree (created_at);
CREATE INDEX idx_template_status_history_template ON public.template_status_history USING btree (template_id);
CREATE INDEX idx_template_usage_project ON public.template_usage USING btree (project_id, used_at DESC);
CREATE INDEX idx_template_usage_success ON public.template_usage USING btree (success, used_at DESC);
CREATE INDEX idx_template_usage_template_id ON public.template_usage USING btree (template_id);
CREATE INDEX idx_template_usage_template_time ON public.template_usage USING btree (template_id, used_at DESC);
CREATE INDEX idx_template_usage_used_at ON public.template_usage USING btree (used_at DESC);
CREATE INDEX idx_template_usage_user ON public.template_usage USING btree (user_id, used_at DESC);
CREATE INDEX idx_template_usage_user_id ON public.template_usage USING btree (user_id);
CREATE UNIQUE INDEX unique_template_version ON public.template_versions USING btree (template_id, version_number);
CREATE INDEX idx_template_versions_created ON public.template_versions USING btree (created_at DESC);
CREATE INDEX idx_template_versions_number ON public.template_versions USING btree (template_id, version_number DESC);
CREATE INDEX idx_template_versions_suggestion ON public.template_versions USING btree (improvement_suggestion_id);
CREATE INDEX idx_template_versions_tag ON public.template_versions USING btree (version_tag);
CREATE INDEX idx_template_versions_template ON public.template_versions USING btree (template_id, created_at DESC);
CREATE INDEX idx_templates_archived ON public.templates USING btree (archived_at);
CREATE INDEX idx_templates_category ON public.templates USING btree (category);
CREATE INDEX idx_templates_company_id ON public.templates USING btree (company_id);
CREATE INDEX idx_templates_compliance_checked ON public.templates USING btree (compliance_checked_at);
CREATE INDEX idx_templates_context_injection_config ON public.templates USING gin (context_injection_config);
CREATE INDEX idx_templates_created_by ON public.templates USING btree (created_by) WHERE (deleted_at IS NULL);
CREATE INDEX idx_templates_deleted_at ON public.templates USING btree (deleted_at);
CREATE INDEX idx_templates_deleted_by ON public.templates USING btree (deleted_by);
CREATE INDEX idx_templates_dev_status ON public.templates USING btree (development_status);
CREATE INDEX idx_templates_framework ON public.templates USING btree (framework) WHERE ((deleted_at IS NULL) AND (framework IS NOT NULL));
CREATE INDEX idx_templates_gkg_context_strategy ON public.templates USING gin (gkg_context_strategy) WHERE (gkg_context_strategy IS NOT NULL);
CREATE INDEX idx_templates_last_used_at ON public.templates USING btree (last_used_at DESC NULLS LAST);
CREATE INDEX idx_templates_prompt_build_up ON public.templates USING gin (prompt_build_up);
CREATE INDEX idx_templates_scope ON public.templates USING btree (template_scope);
CREATE INDEX idx_templates_scope_company ON public.templates USING btree (template_scope, company_id) WHERE ((template_scope)::text = 'company'::text);
CREATE INDEX idx_templates_scope_standard ON public.templates USING btree (template_scope) WHERE ((template_scope)::text = 'standard'::text);
CREATE INDEX idx_templates_scope_user ON public.templates USING btree (template_scope, created_by) WHERE ((template_scope)::text = 'user'::text);
CREATE INDEX idx_templates_search ON public.templates USING gin (to_tsvector('english'::regconfig, (((((COALESCE(name, ''::character varying))::text || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || COALESCE(system_prompt, ''::text)))) WHERE (deleted_at IS NULL);
CREATE INDEX idx_templates_template_paragraphs ON public.templates USING gin (template_paragraphs);
CREATE INDEX idx_templates_updated_at ON public.templates USING btree (updated_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_templates_validated ON public.templates USING btree (last_validated_at);
CREATE UNIQUE INDEX time_entries_assignment_id_user_id_entry_date_key ON public.time_entries USING btree (assignment_id, user_id, entry_date);
CREATE INDEX idx_time_entries_assignment ON public.time_entries USING btree (assignment_id);
CREATE INDEX idx_time_entries_billable ON public.time_entries USING btree (is_billable);
CREATE INDEX idx_time_entries_category ON public.time_entries USING btree (time_entry_category);
CREATE INDEX idx_time_entries_date ON public.time_entries USING btree (entry_date);
CREATE INDEX idx_time_entries_project ON public.time_entries USING btree (project_id);
CREATE INDEX idx_time_entries_status ON public.time_entries USING btree (status);
CREATE INDEX idx_time_entries_task ON public.time_entries USING btree (task_id);
CREATE INDEX idx_time_entries_task_assignment ON public.time_entries USING btree (task_assignment_id);
CREATE INDEX idx_time_entries_user ON public.time_entries USING btree (user_id);
CREATE INDEX idx_upload_batches_company_id ON public.upload_batches USING btree (company_id);
CREATE INDEX idx_upload_batches_created_at ON public.upload_batches USING btree (created_at DESC);
CREATE INDEX idx_upload_batches_metadata ON public.upload_batches USING gin (batch_metadata);
CREATE INDEX idx_upload_batches_project_id ON public.upload_batches USING btree (project_id);
CREATE INDEX idx_upload_batches_status ON public.upload_batches USING btree (status);
CREATE INDEX idx_upload_batches_uploaded_by ON public.upload_batches USING btree (uploaded_by);
CREATE INDEX idx_user_activity_category ON public.user_activity_logs USING btree (activity_category, created_at DESC);
CREATE INDEX idx_user_activity_created ON public.user_activity_logs USING btree (created_at DESC);
CREATE INDEX idx_user_activity_type ON public.user_activity_logs USING btree (activity_type, created_at DESC);
CREATE INDEX idx_user_activity_user ON public.user_activity_logs USING btree (user_id, created_at DESC);
CREATE INDEX idx_user_analysis_analyzed_at ON public.user_analysis USING btree (analyzed_at);
CREATE INDEX idx_user_analysis_average_quality_score ON public.user_analysis USING btree (average_quality_score);
CREATE INDEX idx_user_analysis_user_id ON public.user_analysis USING btree (user_id);
CREATE UNIQUE INDEX user_collaboration_preferences_user_id_key ON public.user_collaboration_preferences USING btree (user_id);
CREATE INDEX idx_user_collaboration_preferences_user_id ON public.user_collaboration_preferences USING btree (user_id);
CREATE UNIQUE INDEX user_domain_knowledge_user_id_key ON public.user_domain_knowledge USING btree (user_id);
CREATE INDEX idx_user_domain_knowledge_frameworks ON public.user_domain_knowledge USING gin (frameworks);
CREATE INDEX idx_user_domain_knowledge_user_id ON public.user_domain_knowledge USING btree (user_id);
CREATE UNIQUE INDEX user_expertise_user_id_key ON public.user_expertise USING btree (user_id);
CREATE INDEX idx_user_expertise_domains ON public.user_expertise USING gin (domains);
CREATE INDEX idx_user_expertise_level ON public.user_expertise USING btree (level);
CREATE INDEX idx_user_expertise_user_id ON public.user_expertise USING btree (user_id);
CREATE UNIQUE INDEX user_model_preferences_user_id_task_type_key ON public.user_model_preferences USING btree (user_id, task_type);
CREATE INDEX idx_user_model_preferences_user ON public.user_model_preferences USING btree (user_id);
CREATE UNIQUE INDEX user_preferences_user_id_key ON public.user_preferences USING btree (user_id);
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences USING btree (user_id);
CREATE UNIQUE INDEX user_search_preferences_user_id_key ON public.user_search_preferences USING btree (user_id);
CREATE INDEX idx_user_search_preferences_frameworks ON public.user_search_preferences USING gin (preferred_frameworks);
CREATE INDEX idx_user_search_preferences_user_id ON public.user_search_preferences USING btree (user_id);
CREATE INDEX idx_user_search_preferences_categories ON public.user_search_preferences USING gin (preferred_categories);
CREATE UNIQUE INDEX user_writing_style_user_id_key ON public.user_writing_style USING btree (user_id);
CREATE INDEX idx_user_writing_style_user_id ON public.user_writing_style USING btree (user_id);
CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);
CREATE INDEX idx_users_active_search ON public.users USING btree (name, email) WHERE (is_active = true);
CREATE INDEX idx_users_company_id ON public.users USING btree (company_id);
CREATE INDEX idx_users_date_format ON public.users USING btree (date_format) WHERE (date_format IS NOT NULL);
CREATE INDEX idx_users_metadata ON public.users USING gin (metadata);
CREATE INDEX idx_users_tenant_id ON public.users USING btree (tenant_id);
CREATE INDEX idx_users_timezone ON public.users USING btree (timezone) WHERE (timezone IS NOT NULL);
CREATE UNIQUE INDEX utilization_records_project_id_record_date_resource_id_key ON public.utilization_records USING btree (project_id, record_date, resource_id);
CREATE INDEX idx_utilization_records_date ON public.utilization_records USING btree (record_date);
CREATE INDEX idx_utilization_records_period ON public.utilization_records USING btree (period);
CREATE INDEX idx_utilization_records_project_id ON public.utilization_records USING btree (project_id);
CREATE INDEX idx_utilization_records_resource ON public.utilization_records USING btree (resource_id);
CREATE UNIQUE INDEX variable_analysis_results_analysis_id_key ON public.variable_analysis_results USING btree (analysis_id);
CREATE INDEX idx_variable_analysis_complexity ON public.variable_analysis_results USING btree (complexity_score);
CREATE INDEX idx_variable_analysis_created ON public.variable_analysis_results USING btree (created_at);
CREATE INDEX idx_variable_analysis_data_gin ON public.variable_analysis_results USING gin (analysis_data);
CREATE INDEX idx_variable_analysis_quality ON public.variable_analysis_results USING btree (quality_score);
CREATE INDEX idx_variable_analysis_recommendations_gin ON public.variable_analysis_results USING gin (recommendations);
CREATE INDEX idx_variable_analysis_template ON public.variable_analysis_results USING btree (template_id);
CREATE UNIQUE INDEX variable_patterns_pattern_id_key ON public.variable_patterns USING btree (pattern_id);
CREATE INDEX idx_variable_patterns_confidence ON public.variable_patterns USING btree (pattern_confidence);
CREATE INDEX idx_variable_patterns_examples_gin ON public.variable_patterns USING gin (pattern_examples);
CREATE INDEX idx_variable_patterns_frequency ON public.variable_patterns USING btree (pattern_frequency);
CREATE INDEX idx_variable_patterns_metadata_gin ON public.variable_patterns USING gin (pattern_metadata);
CREATE INDEX idx_variable_patterns_type ON public.variable_patterns USING btree (pattern_type);
CREATE UNIQUE INDEX variable_resolution_cache_cache_key_key ON public.variable_resolution_cache USING btree (cache_key);
CREATE INDEX idx_variable_resolution_cache_data_gin ON public.variable_resolution_cache USING gin (resolution_data);
CREATE INDEX idx_variable_resolution_cache_expires ON public.variable_resolution_cache USING btree (expires_at);
CREATE INDEX idx_variable_resolution_cache_key ON public.variable_resolution_cache USING btree (cache_key);
CREATE INDEX idx_variable_resolution_metrics_context_gin ON public.variable_resolution_metrics USING gin (context_data);
CREATE INDEX idx_variable_resolution_metrics_created ON public.variable_resolution_metrics USING btree (created_at);
CREATE INDEX idx_variable_resolution_metrics_name ON public.variable_resolution_metrics USING btree (variable_name);
CREATE INDEX idx_variable_resolution_metrics_status ON public.variable_resolution_metrics USING btree (status);
CREATE INDEX idx_variable_resolution_metrics_strategy ON public.variable_resolution_metrics USING btree (resolution_strategy);
CREATE INDEX idx_variable_resolution_metrics_type ON public.variable_resolution_metrics USING btree (variable_type);
CREATE UNIQUE INDEX variable_resolution_results_result_id_key ON public.variable_resolution_results USING btree (result_id);
CREATE INDEX idx_variable_resolution_results_created ON public.variable_resolution_results USING btree (created_at);
CREATE INDEX idx_variable_resolution_results_metrics_gin ON public.variable_resolution_results USING gin (resolution_metrics);
CREATE INDEX idx_variable_resolution_results_quality_gin ON public.variable_resolution_results USING gin (quality_assessment);
CREATE INDEX idx_variable_resolution_results_recommendations_gin ON public.variable_resolution_results USING gin (recommendations);
CREATE INDEX idx_variable_resolution_results_request ON public.variable_resolution_results USING btree (request_id);
CREATE INDEX idx_variable_resolution_results_template ON public.variable_resolution_results USING btree (template_id);
CREATE INDEX idx_variable_resolution_results_unresolved_gin ON public.variable_resolution_results USING gin (unresolved_variables);
CREATE INDEX idx_variable_resolution_results_variables_gin ON public.variable_resolution_results USING gin (resolved_variables);
CREATE INDEX idx_wbs_nodes_code ON public.wbs_nodes USING btree (project_id, wbs_code);
CREATE INDEX idx_wbs_nodes_project_id ON public.wbs_nodes USING btree (project_id);
CREATE UNIQUE INDEX idx_wbs_nodes_idempotency ON public.wbs_nodes USING btree (project_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE UNIQUE INDEX work_items_project_id_name_key ON public.work_items USING btree (project_id, name);
CREATE INDEX idx_work_items_activity ON public.work_items USING btree (activity_id);
CREATE INDEX idx_work_items_project ON public.work_items USING btree (project_id);
CREATE INDEX idx_work_items_project_id ON public.work_items USING btree (project_id);
CREATE INDEX idx_work_items_source_document ON public.work_items USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE INDEX idx_work_items_source_location ON public.work_items USING btree (source_document_id, source_text_start);
CREATE INDEX idx_work_items_status ON public.work_items USING btree (status);
CREATE INDEX idx_worker_heartbeats_last_heartbeat ON public.worker_heartbeats USING btree (last_heartbeat);
CREATE INDEX idx_workflow_executions_created_at ON public.workflow_executions USING btree (created_at);
CREATE INDEX idx_workflow_executions_project_id ON public.workflow_executions USING btree (project_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions USING btree (status);
CREATE INDEX idx_workflow_executions_template_id ON public.workflow_executions USING btree (template_id);
CREATE INDEX idx_workflow_executions_user_id ON public.workflow_executions USING btree (user_id);
CREATE INDEX idx_workflow_presets_category ON public.workflow_presets USING btree (category);
CREATE INDEX idx_workflow_presets_created_by ON public.workflow_presets USING btree (created_by);
CREATE INDEX idx_workflow_presets_public ON public.workflow_presets USING btree (is_public);

-- Functions
CREATE OR REPLACE FUNCTION public.trigger_entity_extraction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  -- REPLACE THIS with your actual Service Role Key (starting with eyJ...)
  service_key text := 'YOUR_SERVICE_ROLE_KEY';
  
  -- This is your project URL we deployed to
  url text := 'https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/entity-extractor';
  
  result http_response;
BEGIN
  -- Validate key is set
  IF service_key = 'YOUR_SERVICE_ROLE_KEY' THEN
    RAISE WARNING 'Entity extraction trigger: Service Key not configured in function code.';
    RETURN NEW;
  END IF;

  -- Call the Edge Function
  SELECT
    * INTO result
  FROM
    http((
      'POST',
      url,
      ARRAY[http_header('Authorization', 'Bearer ' || service_key), http_header('Content-Type', 'application/json')],
      'application/json',
      json_build_object('document_id', NEW.id)::text
    )::http_request);

  -- Log the result status (optional)
  IF result.status != 200 THEN
    RAISE WARNING 'Entity extraction failed with status %: %', result.status, result.content;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error triggering entity extraction: %', SQLERRM;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.log_issue_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Log status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO issue_status_history (issue_id, old_status, new_status, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, NOW());
  END IF;

  -- Auto-set resolution date (not persisted in AFTER trigger)
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.date_resolved := NOW();
  END IF;

  -- Auto-set closed date (not persisted in AFTER trigger)
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.date_closed := NOW();
  END IF;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.match_document_chunks(query_embedding vector, similarity_threshold double precision DEFAULT 0.5, match_count integer DEFAULT 5, filter jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(id uuid, document_id uuid, content text, chunk_index integer, metadata jsonb, similarity double precision)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        dc.chunk_index,
        dc.metadata,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    WHERE 
        dc.embedding IS NOT NULL
        AND (1 - (dc.embedding <=> query_embedding)) >= similarity_threshold
        AND (
            filter = '{}'::jsonb
            OR dc.metadata @> filter
        )
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_infrared_optimization(qubit_id_param character varying)
 RETURNS TABLE(current_wavelength numeric, recommended_wavelength numeric, optimization_reason text, expected_improvement numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        qs.infrared_spectrum as current_wavelength,
        CASE 
            WHEN qs.coherence < 85 THEN 775.0  -- Optimal for coherence
            WHEN qs.temperature > 0.02 THEN 790.0  -- Better cooling
            WHEN qs.noise_level > 15 THEN 760.0  -- Better noise reduction
            ELSE qs.infrared_spectrum  -- Keep current if stable
        END as recommended_wavelength,
        CASE 
            WHEN qs.coherence < 85 THEN 'Optimize for coherence restoration'
            WHEN qs.temperature > 0.02 THEN 'Optimize for thermal cooling'
            WHEN qs.noise_level > 15 THEN 'Optimize for noise reduction'
            ELSE 'Current wavelength is optimal'
        END as optimization_reason,
        CASE 
            WHEN qs.coherence < 85 THEN 15.0  -- Expected coherence improvement
            WHEN qs.temperature > 0.02 THEN 12.0  -- Expected temperature reduction
            WHEN qs.noise_level > 15 THEN 18.0  -- Expected noise reduction
            ELSE 0.0
        END as expected_improvement
    FROM qubit_states qs
    WHERE qs.qubit_id = qubit_id_param;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_stakeholders_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_rag_analytics_summary(time_range_hours integer DEFAULT 24)
 RETURNS TABLE(operation_type character varying, total_operations bigint, successful_operations bigint, failed_operations bigint, avg_duration_ms numeric, total_chunks_processed bigint, total_vectors_created bigint, success_rate numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ra.operation_type,
    COUNT(*) as total_operations,
    COUNT(*) FILTER (WHERE ra.success = true) as successful_operations,
    COUNT(*) FILTER (WHERE ra.success = false) as failed_operations,
    ROUND(AVG(ra.duration_ms)::NUMERIC, 2) as avg_duration_ms,
    COALESCE(SUM(ra.chunks_processed), 0) as total_chunks_processed,
    COALESCE(SUM(ra.vectors_created), 0) as total_vectors_created,
    ROUND((COUNT(*) FILTER (WHERE ra.success = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as success_rate
  FROM rag_analytics ra
  WHERE ra.created_at >= NOW() - (time_range_hours || ' hours')::INTERVAL
  GROUP BY ra.operation_type;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_hourly_rag_ingestion(days_back integer DEFAULT 7)
 RETURNS TABLE(hour_bucket timestamp with time zone, successful_count bigint, failed_count bigint, total_chunks bigint, total_vectors bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('hour', ra.created_at) as hour_bucket,
    COUNT(*) FILTER (WHERE ra.success = true) as successful_count,
    COUNT(*) FILTER (WHERE ra.success = false) as failed_count,
    COALESCE(SUM(ra.chunks_processed), 0) as total_chunks,
    COALESCE(SUM(ra.vectors_created), 0) as total_vectors
  FROM rag_analytics ra
  WHERE ra.operation_type = 'ingest'
    AND ra.created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY hour_bucket
  ORDER BY hour_bucket DESC;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_document_integrations_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.aggregate_daily_statistics(target_date date)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO daily_statistics (
        date,
        ai_requests_total,
        ai_requests_success,
        ai_tokens_total,
        ai_cost_total,
        api_requests_total,
        api_requests_2xx,
        api_requests_4xx,
        api_requests_5xx,
        api_avg_response_time_ms,
        active_users,
        documents_created,
        documents_edited,
        documents_viewed
    )
    SELECT 
        target_date,
        (SELECT COUNT(*) FROM ai_usage_logs WHERE DATE(created_at) = target_date),
        (SELECT COUNT(*) FROM ai_usage_logs WHERE DATE(created_at) = target_date AND success = true),
        (SELECT COALESCE(SUM(total_tokens), 0) FROM ai_usage_logs WHERE DATE(created_at) = target_date),
        (SELECT COALESCE(SUM(estimated_cost), 0) FROM ai_usage_logs WHERE DATE(created_at) = target_date),
        (SELECT COUNT(*) FROM api_request_logs WHERE DATE(created_at) = target_date),
        (SELECT COUNT(*) FROM api_request_logs WHERE DATE(created_at) = target_date AND status_code BETWEEN 200 AND 299),
        (SELECT COUNT(*) FROM api_request_logs WHERE DATE(created_at) = target_date AND status_code BETWEEN 400 AND 499),
        (SELECT COUNT(*) FROM api_request_logs WHERE DATE(created_at) = target_date AND status_code BETWEEN 500 AND 599),
        (SELECT COALESCE(AVG(response_time_ms), 0)::INTEGER FROM api_request_logs WHERE DATE(created_at) = target_date),
        (SELECT COUNT(DISTINCT user_id) FROM user_activity_logs WHERE DATE(created_at) = target_date),
        (SELECT COUNT(*) FROM documents WHERE DATE(created_at) = target_date),
        (SELECT COUNT(DISTINCT document_id) FROM user_activity_logs WHERE DATE(created_at) = target_date AND activity_type = 'edit_document'),
        (SELECT COUNT(DISTINCT document_id) FROM user_activity_logs WHERE DATE(created_at) = target_date AND activity_type = 'view_document')
    ON CONFLICT (date) DO UPDATE SET
        ai_requests_total = EXCLUDED.ai_requests_total,
        ai_requests_success = EXCLUDED.ai_requests_success,
        ai_tokens_total = EXCLUDED.ai_tokens_total,
        ai_cost_total = EXCLUDED.ai_cost_total,
        api_requests_total = EXCLUDED.api_requests_total,
        api_requests_2xx = EXCLUDED.api_requests_2xx,
        api_requests_4xx = EXCLUDED.api_requests_4xx,
        api_requests_5xx = EXCLUDED.api_requests_5xx,
        api_avg_response_time_ms = EXCLUDED.api_avg_response_time_ms,
        active_users = EXCLUDED.active_users,
        documents_created = EXCLUDED.documents_created,
        documents_edited = EXCLUDED.documents_edited,
        documents_viewed = EXCLUDED.documents_viewed,
        updated_at = CURRENT_TIMESTAMP;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.match_documents(query_embedding vector, match_threshold double precision, match_count integer, filter jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(id uuid, content text, metadata jsonb, similarity double precision)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  -- Optional: Add metadata filtering logic here if needed, e.g.:
  -- AND documents.metadata @> filter
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_program_budget(p_program_id uuid)
 RETURNS TABLE(total_budget numeric, total_spent numeric, total_forecast numeric, total_benefits numeric, budget_utilization numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(p.budget), 0) as total_budget,
    COALESCE(SUM(p.actual_cost), 0) as total_spent,
    COALESCE(SUM(p.forecast_cost), 0) as total_forecast,
    COALESCE(SUM(p.expected_benefits), 0) as total_benefits,
    CASE 
      WHEN COALESCE(SUM(p.budget), 0) > 0 THEN 
        ROUND((COALESCE(SUM(p.actual_cost), 0) / SUM(p.budget) * 100)::numeric, 2)
      ELSE 0
    END as budget_utilization
  FROM projects p
  WHERE p.program_id = p_program_id 
    AND p.archived = false;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_task_planned_cost(p_task_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_total_cost DECIMAL;
BEGIN
  SELECT COALESCE(SUM(planned_cost), 0)
  INTO v_total_cost
  FROM task_assignments
  WHERE task_id = p_task_id;
  
  RETURN v_total_cost;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.cleanup_expired_context_bundles()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Delete expired bundles and their related data
    DELETE FROM context_bundles 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    -- Log cleanup activity
    INSERT INTO context_bundle_processing_history (
        bundle_id, processing_type, processing_status, processing_start_time, processing_end_time
    ) VALUES (
        'system', 'cleanup', 'completed', NOW(), NOW()
    );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.cleanup_expired_resolution_cache()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM variable_resolution_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.create_document_version(p_document_id uuid, p_version character varying, p_version_type character varying, p_change_summary text, p_change_reason character varying, p_created_by uuid, p_content jsonb, p_metadata jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_version_id UUID;
BEGIN
  v_version_id := gen_random_uuid();
  
  -- Insert new document version with content, word_count, and metadata
  INSERT INTO document_versions (
    id,
    document_id,
    version,
    content,
    changes,
    author_id,
    word_count,
    metadata,
    created_at
  ) VALUES (
    v_version_id,
    p_document_id,
    p_version,
    p_content->>'content',
    p_change_summary,
    p_created_by,
    -- Calculate word count from content
    COALESCE(
      array_length(
        regexp_split_to_array(trim(p_content->>'content'), E'\\s+'), 
        1
      ), 
      0
    ),
    p_metadata,
    NOW()
  );
  
  -- Update main documents table with content
  UPDATE documents
  SET 
    content = p_content->>'content',
    updated_at = NOW()
  WHERE id = p_document_id;
  
  RETURN v_version_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.gbtreekey8_out(gbtreekey8)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;
CREATE OR REPLACE FUNCTION public.gbtreekey_var_in(cstring)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;
CREATE OR REPLACE FUNCTION public.gbtreekey_var_out(gbtreekey_var)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;
CREATE OR REPLACE FUNCTION public.update_portfolio_vision_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.safe_count_entity(table_name text, project_id_param uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  count_result INTEGER;
  table_exists BOOLEAN;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = safe_count_entity.table_name
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RETURN 0;
  END IF;
  
  -- Execute count query using dynamic SQL
  EXECUTE format('SELECT COUNT(*) FROM %I WHERE project_id = $1', table_name)
    USING project_id_param
    INTO count_result;
  
  RETURN COALESCE(count_result, 0);
EXCEPTION
  WHEN OTHERS THEN
    -- Return 0 if any error occurs (table exists but query fails)
    RETURN 0;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.trigger_calculate_assignment_planned_cost()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Calculate planned cost
  NEW.planned_cost := NEW.planned_hours * NEW.hourly_rate;
  
  -- Update task estimated cost (sum of all assignments)
  UPDATE project_tasks
  SET estimated_cost = (
    SELECT COALESCE(SUM(planned_cost), 0)
    FROM task_assignments
    WHERE task_id = NEW.task_id
  )
  WHERE id = NEW.task_id;
  
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.trigger_update_approval_request_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_quality_audits_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.trigger_update_cost_breakdown()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Recalculate cost breakdown for the project
  PERFORM update_project_cost_breakdown(NEW.project_id);
  
  -- Update resource assignment actual hours and cost
  UPDATE project_resource_assignments
  SET 
    actual_hours = (
      SELECT COALESCE(SUM(hours_worked), 0)
      FROM time_entries
      WHERE assignment_id = NEW.assignment_id AND status = 'approved'
    ),
    actual_cost = (
      SELECT COALESCE(SUM(total_cost), 0)
      FROM time_entries
      WHERE assignment_id = NEW.assignment_id AND status = 'approved'
    ),
    updated_at = NOW()
  WHERE id = NEW.assignment_id;
  
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.trigger_update_daily_analysis_metrics()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM update_daily_analysis_metrics();
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.trigger_update_template_metrics()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.ts_dist(timestamp without time zone, timestamp without time zone)
 RETURNS interval
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$ts_dist$function$
;
CREATE OR REPLACE FUNCTION public.update_mitigation_plans_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- Auto-set completion fields when status changes to completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completion_percentage = 100;
        NEW.actual_completion_date = COALESCE(NEW.actual_completion_date, CURRENT_DATE);
        NEW.completed_at = COALESCE(NEW.completed_at, CURRENT_TIMESTAMP);
        NEW.completed_by = COALESCE(NEW.completed_by, NEW.updated_by);
    END IF;
    
    -- Reset completion fields if status changes from completed
    IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
        NEW.completed_at = NULL;
        NEW.completed_by = NULL;
        NEW.actual_completion_date = NULL;
    END IF;
    
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_performance_actuals_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_query_analytics(p_query text, p_relevance_score numeric, p_processing_time integer, p_success boolean)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    query_hash_val VARCHAR(64);
BEGIN
    -- Generate hash for the query
    query_hash_val := encode(digest(p_query, 'sha256'), 'hex');
    
    -- Update or insert query analytics
    INSERT INTO query_analytics (query, query_hash, frequency, average_relevance, average_processing_time, success_rate, last_searched)
    VALUES (p_query, query_hash_val, 1, p_relevance_score, p_processing_time, CASE WHEN p_success THEN 1.0 ELSE 0.0 END, CURRENT_TIMESTAMP)
    ON CONFLICT (query_hash) DO UPDATE SET
        frequency = query_analytics.frequency + 1,
        average_relevance = (query_analytics.average_relevance * query_analytics.frequency + p_relevance_score) / (query_analytics.frequency + 1),
        average_processing_time = (query_analytics.average_processing_time * query_analytics.frequency + p_processing_time) / (query_analytics.frequency + 1),
        success_rate = (query_analytics.success_rate * query_analytics.frequency + CASE WHEN p_success THEN 1.0 ELSE 0.0 END) / (query_analytics.frequency + 1),
        last_searched = CURRENT_TIMESTAMP;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.gbtreekey16_out(gbtreekey16)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;
CREATE OR REPLACE FUNCTION public.gbtreekey2_in(cstring)
 RETURNS gbtreekey2
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;
CREATE OR REPLACE FUNCTION public.gbtreekey2_out(gbtreekey2)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;
CREATE OR REPLACE FUNCTION public.gbtreekey32_in(cstring)
 RETURNS gbtreekey32
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;
CREATE OR REPLACE FUNCTION public.gbtreekey32_out(gbtreekey32)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;
CREATE OR REPLACE FUNCTION public.gbtreekey4_in(cstring)
 RETURNS gbtreekey4
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;
CREATE OR REPLACE FUNCTION public.gbtreekey4_out(gbtreekey4)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;
CREATE OR REPLACE FUNCTION public.gbtreekey8_in(cstring)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;
CREATE OR REPLACE FUNCTION public.gbtreekey16_in(cstring)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;
CREATE OR REPLACE FUNCTION public.advance_approval_to_next_stage(p_approval_request_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_current_stage INTEGER;
    v_total_stages INTEGER;
    v_next_stage_exists BOOLEAN;
BEGIN
    -- Get current stage info
    SELECT current_stage, total_stages INTO v_current_stage, v_total_stages
    FROM approval_requests
    WHERE id = p_approval_request_id;
    
    -- Check if we have more stages
    IF v_current_stage >= v_total_stages THEN
        -- All stages complete, mark as approved
        UPDATE approval_requests
        SET status = 'approved',
            completed_at = NOW()
        WHERE id = p_approval_request_id;
        
        RETURN FALSE; -- No more stages
    END IF;
    
    -- Advance to next stage
    UPDATE approval_requests
    SET current_stage = current_stage + 1,
        status = 'in_progress'
    WHERE id = p_approval_request_id;
    
    RETURN TRUE; -- Advanced to next stage
END;
$function$
;
CREATE OR REPLACE FUNCTION public.approve_template_compliance(p_template_id uuid, p_user_id uuid, p_compliance_score numeric, p_notes text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_current_status VARCHAR(20);
BEGIN
  -- Check current status
  SELECT development_status INTO v_current_status
  FROM templates
  WHERE id = p_template_id;
  
  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Template not found'::TEXT;
    RETURN;
  END IF;
  
  IF v_current_status != 'compliance' THEN
    RETURN QUERY SELECT FALSE, 
      'Template must be in compliance stage (currently: ' || v_current_status || ')'::TEXT;
    RETURN;
  END IF;
  
  -- Record compliance approval
  UPDATE templates
  SET 
    compliance_checked_at = NOW(),
    compliance_checked_by = p_user_id,
    compliance_notes = p_notes,
    framework_compliance_score = p_compliance_score / 100,  -- Convert percentage to 0-1
    updated_at = NOW()
  WHERE id = p_template_id;
  
  RETURN QUERY SELECT TRUE, 
    'Compliance approved with score: ' || p_compliance_score || '%'::TEXT;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.archive_template(p_template_id uuid, p_user_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, old_status character varying, message text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_current_status VARCHAR(20);
  v_has_generations BOOLEAN;
BEGIN
  -- Get current status and check if template has generated documents
  SELECT 
    development_status,
    validation_count > 0
  INTO v_current_status, v_has_generations
  FROM templates
  WHERE id = p_template_id AND deleted_at IS NULL;
  
  -- Check if template exists
  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::VARCHAR, 'Template not found'::TEXT;
    RETURN;
  END IF;
  
  -- Already archived
  IF v_current_status = 'archived' THEN
    RETURN QUERY SELECT FALSE, v_current_status, 'Template is already archived'::TEXT;
    RETURN;
  END IF;
  
  -- Perform archival
  UPDATE templates
  SET 
    development_status = 'archived',
    archived_at = NOW(),
    archived_by = p_user_id,
    archive_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_template_id;
  
  -- Log the archival
  INSERT INTO template_status_history (template_id, old_status, new_status, changed_by, reason)
  VALUES (p_template_id, v_current_status, 'archived', p_user_id, p_reason);
  
  RETURN QUERY SELECT TRUE, v_current_status,
    'Template archived from ' || v_current_status || 
    CASE WHEN v_has_generations THEN ' (has generated documents - preserved)' ELSE '' END::TEXT;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.audit_documents_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(table_name, row_id, action, new_values)
    VALUES ('documents', NEW.id, 'create', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(table_name, row_id, action, old_values, new_values)
    VALUES ('documents', NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(table_name, row_id, action, old_values)
    VALUES ('documents', OLD.id, 'delete', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.audit_log_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  last_hash TEXT;
  payload TEXT;
BEGIN
  SELECT hash INTO last_hash
  FROM audit_log
  WHERE table_name = NEW.table_name AND (NEW.row_id IS NULL OR row_id = NEW.row_id)
  ORDER BY occurred_at DESC
  LIMIT 1;

  NEW.prev_hash := last_hash;

  payload := COALESCE(NEW.table_name,'') || '|' || COALESCE(NEW.action,'') || '|' || COALESCE(NEW.row_id::text,'') || '|' ||
             COALESCE(NEW.actor_user_id::text,'') || '|' || COALESCE(NEW.reason,'') || '|' ||
             COALESCE(NEW.old_values::text,'') || '|' || COALESCE(NEW.new_values::text,'') || '|' || COALESCE(NEW.occurred_at::text,'') || '|' || COALESCE(NEW.prev_hash,'');

  NEW.hash := encode(digest(payload, 'sha256'), 'hex');
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_approval_sla_deadline(p_priority character varying, p_workflow_id uuid)
 RETURNS timestamp without time zone
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_sla_hours INTEGER;
BEGIN
    -- Get appropriate SLA hours based on priority
    CASE p_priority
        WHEN 'emergency' THEN
            SELECT emergency_sla_hours INTO v_sla_hours
            FROM approval_workflows WHERE id = p_workflow_id;
        WHEN 'critical' THEN
            SELECT critical_sla_hours INTO v_sla_hours
            FROM approval_workflows WHERE id = p_workflow_id;
        ELSE
            SELECT sla_hours INTO v_sla_hours
            FROM approval_workflows WHERE id = p_workflow_id;
    END CASE;
    
    -- Default to 72 hours if workflow not found
    v_sla_hours := COALESCE(v_sla_hours, 72);
    
    RETURN NOW() + (v_sla_hours || ' hours')::INTERVAL;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_capacity_forecast(p_program_id uuid, p_forecast_period date)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_human_capacity DECIMAL(10,2) := 0;
  v_human_demand DECIMAL(10,2) := 0;
  v_financial_capacity DECIMAL(15,2) := 0;
  v_financial_demand DECIMAL(15,2) := 0;
  v_bottleneck_resources TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Calculate human resource capacity (from active allocations)
  SELECT COALESCE(SUM(allocation_percentage / 100.0), 0)
  INTO v_human_capacity
  FROM program_resource_allocations
  WHERE program_id = p_program_id
    AND resource_type = 'human'
    AND allocation_status = 'active'
    AND p_forecast_period BETWEEN allocation_start AND COALESCE(allocation_end, '9999-12-31'::date);
  
  -- Calculate human resource demand (from resource plan)
  SELECT COALESCE(SUM(required_quantity), 0)
  INTO v_human_demand
  FROM program_resource_plan
  WHERE program_id = p_program_id
    AND resource_type = 'human'
    AND planning_status IN ('requested', 'approved', 'allocated')
    AND p_forecast_period BETWEEN needed_from AND COALESCE(needed_until, '9999-12-31'::date);
  
  -- Calculate financial capacity (from program budget)
  SELECT COALESCE(budget, 0)
  INTO v_financial_capacity
  FROM programs
  WHERE id = p_program_id;
  
  -- Calculate financial demand (from project budgets)
  SELECT COALESCE(SUM(budget), 0)
  INTO v_financial_demand
  FROM projects
  WHERE program_id = p_program_id
    AND archived = FALSE;
  
  -- Identify bottleneck resources
  SELECT ARRAY_AGG(resource_name)
  INTO v_bottleneck_resources
  FROM program_resource_conflicts
  WHERE program_id = p_program_id
    AND conflict_severity IN ('over-allocated', 'near-capacity');
  
  -- Insert or update forecast
  INSERT INTO program_capacity_forecast (
    program_id,
    forecast_period,
    human_capacity_fte,
    human_demand_fte,
    financial_capacity,
    financial_demand,
    is_bottleneck_period,
    bottleneck_resources,
    updated_at
  ) VALUES (
    p_program_id,
    p_forecast_period,
    v_human_capacity,
    v_human_demand,
    v_financial_capacity,
    v_financial_demand,
    (v_human_demand > v_human_capacity OR array_length(v_bottleneck_resources, 1) > 0),
    v_bottleneck_resources,
    NOW()
  )
  ON CONFLICT (program_id, forecast_period) DO UPDATE SET
    human_capacity_fte = EXCLUDED.human_capacity_fte,
    human_demand_fte = EXCLUDED.human_demand_fte,
    financial_capacity = EXCLUDED.financial_capacity,
    financial_demand = EXCLUDED.financial_demand,
    is_bottleneck_period = EXCLUDED.is_bottleneck_period,
    bottleneck_resources = EXCLUDED.bottleneck_resources,
    updated_at = NOW();
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_evm_metrics(p_program_id uuid, p_reporting_date date DEFAULT CURRENT_DATE)
 RETURNS program_cost_performance
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_result program_cost_performance;
  v_pv DECIMAL;
  v_ev DECIMAL;
  v_ac DECIMAL;
  v_bac DECIMAL;
BEGIN
  -- Aggregate metrics from all projects in the program
  SELECT 
    COALESCE(SUM(planned_value), 0),
    COALESCE(SUM(earned_value), 0),
    COALESCE(SUM(actual_cost), 0),
    COALESCE(SUM(budget), 0)
  INTO v_pv, v_ev, v_ac, v_bac
  FROM projects
  WHERE program_id = p_program_id 
    AND archived = false;
  
  -- Initialize result record
  v_result.program_id := p_program_id;
  v_result.reporting_date := p_reporting_date;
  v_result.planned_value := v_pv;
  v_result.earned_value := v_ev;
  v_result.actual_cost := v_ac;
  v_result.budget_at_completion := v_bac;
  
  -- Calculate variances
  v_result.schedule_variance := v_ev - v_pv;
  v_result.cost_variance := v_ev - v_ac;
  
  -- Calculate performance indices (avoid division by zero)
  v_result.schedule_performance_index := CASE 
    WHEN v_pv > 0 THEN ROUND((v_ev / v_pv)::numeric, 4)
    ELSE 0
  END;
  
  v_result.cost_performance_index := CASE 
    WHEN v_ac > 0 THEN ROUND((v_ev / v_ac)::numeric, 4)
    ELSE 0
  END;
  
  -- Calculate forecasts
  v_result.estimate_at_completion := CASE 
    WHEN v_result.cost_performance_index > 0 THEN 
      ROUND((v_bac / v_result.cost_performance_index)::numeric, 2)
    ELSE v_bac
  END;
  
  v_result.estimate_to_complete := v_result.estimate_at_completion - v_ac;
  v_result.variance_at_completion := v_bac - v_result.estimate_at_completion;
  
  -- Calculate TCPI
  v_result.tcpi_bac := CASE 
    WHEN (v_bac - v_ac) > 0 THEN 
      ROUND(((v_bac - v_ev) / (v_bac - v_ac))::numeric, 4)
    ELSE 0
  END;
  
  v_result.tcpi_eac := CASE 
    WHEN (v_result.estimate_at_completion - v_ac) > 0 THEN 
      ROUND(((v_bac - v_ev) / (v_result.estimate_at_completion - v_ac))::numeric, 4)
    ELSE 0
  END;
  
  -- Determine performance status
  v_result.performance_status := CASE 
    WHEN v_result.cost_performance_index >= 0.95 AND v_result.schedule_performance_index >= 0.95 THEN 'on-track'
    WHEN v_result.cost_performance_index >= 0.85 OR v_result.schedule_performance_index >= 0.85 THEN 'at-risk'
    ELSE 'critical'
  END;
  
  v_result.calculated_at := NOW();
  v_result.created_at := NOW();
  v_result.updated_at := NOW();
  
  RETURN v_result;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_kr_progress()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  progress_calc DECIMAL(5,2);
BEGIN
  -- Calculate progress percentage
  -- Formula: ((current_value - baseline_value) / (target_value - baseline_value)) * 100
  IF NEW.target_value IS NOT NULL AND NEW.baseline_value IS NOT NULL THEN
    IF NEW.target_value - NEW.baseline_value != 0 THEN
      progress_calc := ((NEW.current_value - NEW.baseline_value) / 
                       (NEW.target_value - NEW.baseline_value)) * 100;
      
      -- Cap at 100% and floor at 0%
      IF progress_calc > 100 THEN
        progress_calc := 100;
      ELSIF progress_calc < 0 THEN
        progress_calc := 0;
      END IF;
      
      NEW.progress_percentage := progress_calc;
    ELSE
      -- If baseline equals target, set progress to 100% if current >= target, else 0%
      IF NEW.current_value >= NEW.target_value THEN
        NEW.progress_percentage := 100;
      ELSE
        NEW.progress_percentage := 0;
      END IF;
    END IF;
  END IF;
  
  -- Determine progress status based on percentage
  IF NEW.progress_percentage IS NOT NULL THEN
    NEW.progress_status := CASE
      WHEN NEW.progress_percentage >= 100 THEN 'achieved'
      WHEN NEW.progress_percentage >= 70 THEN 'on-track'
      WHEN NEW.progress_percentage >= 40 THEN 'at-risk'
      ELSE 'behind'
    END;
  END IF;
  
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_labor_cost(p_project_id uuid, p_role_type character varying DEFAULT NULL::character varying)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_total_cost DECIMAL;
BEGIN
  SELECT COALESCE(SUM(te.total_cost), 0)
  INTO v_total_cost
  FROM time_entries te
  JOIN project_resource_assignments pra ON te.assignment_id = pra.id
  JOIN project_roles pr ON pra.role_id = pr.id
  WHERE te.project_id = p_project_id
    AND te.status = 'approved'
    AND (p_role_type IS NULL OR pr.role_type = p_role_type);
  
  RETURN v_total_cost;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_next_document_version(p_document_id uuid, p_increment_type character varying)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_current_version VARCHAR(20);
  v_major INTEGER;
  v_minor INTEGER;
  v_patch INTEGER;
  v_next_version VARCHAR(20);
BEGIN
  -- Get current version from document
  SELECT version INTO v_current_version
  FROM documents
  WHERE id = p_document_id;
  
  -- Handle NULL or missing version (default to 1.0.0)
  IF v_current_version IS NULL OR v_current_version = '' THEN
    v_current_version := '1.0.0';
  END IF;
  
  -- Parse semantic version (handles "1", "1.0", "1.0.0" formats)
  -- Split by dots and cast to integers
  DECLARE
    v_parts TEXT[];
  BEGIN
    v_parts := string_to_array(v_current_version, '.');
    
    v_major := COALESCE(v_parts[1]::INTEGER, 1);
    v_minor := COALESCE(v_parts[2]::INTEGER, 0);
    v_patch := COALESCE(v_parts[3]::INTEGER, 0);
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to 1.0.0 if parsing fails
    v_major := 1;
    v_minor := 0;
    v_patch := 0;
  END;
  
  -- Increment based on type
  CASE p_increment_type
    WHEN 'major' THEN
      v_major := v_major + 1;
      v_minor := 0;
      v_patch := 0;
    WHEN 'minor' THEN
      v_minor := v_minor + 1;
      v_patch := 0;
    WHEN 'patch' THEN
      v_patch := v_patch + 1;
    ELSE
      -- Default to patch if invalid type
      v_patch := v_patch + 1;
  END CASE;
  
  -- Build next version string
  v_next_version := v_major || '.' || v_minor || '.' || v_patch;
  
  RETURN v_next_version;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_next_review_due_date(last_review date)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  IF last_review IS NULL THEN
    RETURN CURRENT_DATE + INTERVAL '1 month';
  ELSE
    RETURN last_review + INTERVAL '1 month';
  END IF;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_next_version(p_document_id uuid, p_version_type character varying)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_current_version VARCHAR(20);
  v_major INTEGER;
  v_minor INTEGER;
  v_patch INTEGER;
  v_parts TEXT[];
BEGIN
  -- Get current version (column is 'version', not 'version_number')
  SELECT version INTO v_current_version
  FROM document_versions
  WHERE document_id = p_document_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no version exists, check documents table
  IF v_current_version IS NULL THEN
    SELECT version INTO v_current_version
    FROM documents
    WHERE id = p_document_id;
  END IF;
  
  -- Default to 1.0 if still no version
  IF v_current_version IS NULL THEN
    v_current_version := '1.0';
  END IF;
  
  -- Parse version number
  v_parts := string_to_array(v_current_version, '.');
  v_major := COALESCE(v_parts[1]::INTEGER, 1);
  v_minor := COALESCE(v_parts[2]::INTEGER, 0);
  v_patch := COALESCE(v_parts[3]::INTEGER, 0);
  
  -- Increment based on type
  IF p_version_type = 'major' THEN
    v_major := v_major + 1;
    v_minor := 0;
    v_patch := 0;
  ELSIF p_version_type = 'minor' THEN
    v_minor := v_minor + 1;
    v_patch := 0;
  ELSIF p_version_type = 'patch' THEN
    v_patch := v_patch + 1;
  END IF;
  
  -- Return formatted version
  RETURN CONCAT(v_major, '.', v_minor, '.', v_patch);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_npv(p_program_id uuid, p_discount_rate numeric DEFAULT 8.0, p_years integer DEFAULT 5)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_initial_investment DECIMAL;
  v_annual_benefit DECIMAL;
  v_npv DECIMAL := 0;
  v_year INTEGER;
BEGIN
  -- Get initial investment (total budget)
  SELECT COALESCE(SUM(budget), 0)
  INTO v_initial_investment
  FROM projects
  WHERE program_id = p_program_id AND archived = false;
  
  -- Get expected annual benefit
  SELECT COALESCE(SUM(expected_value), 0) / NULLIF(p_years, 0)
  INTO v_annual_benefit
  FROM program_benefits
  WHERE program_id = p_program_id;
  
  -- Initial investment (negative cash flow)
  v_npv := -v_initial_investment;
  
  -- Discounted future benefits
  FOR v_year IN 1..p_years LOOP
    v_npv := v_npv + (v_annual_benefit / POWER(1 + (p_discount_rate / 100), v_year));
  END LOOP;
  
  RETURN ROUND(v_npv::numeric, 2);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_okr_progress(okr_uuid uuid)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
  avg_progress DECIMAL(5,2);
BEGIN
  SELECT COALESCE(AVG(progress_percentage), 0)
  INTO avg_progress
  FROM portfolio_key_results
  WHERE okr_id = okr_uuid;
  
  RETURN COALESCE(avg_progress, 0);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bit_consistent(internal, bit, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_consistent$function$
;
CREATE OR REPLACE FUNCTION public.calculate_payback_period(p_program_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_total_investment DECIMAL;
  v_annual_benefit DECIMAL;
  v_payback_months INTEGER;
BEGIN
  -- Get total investment
  SELECT COALESCE(SUM(budget), 0)
  INTO v_total_investment
  FROM projects
  WHERE program_id = p_program_id AND archived = false;
  
  -- Get annual benefit
  SELECT COALESCE(SUM(expected_value), 0) / 12  -- Monthly benefit
  INTO v_annual_benefit
  FROM program_benefits
  WHERE program_id = p_program_id;
  
  -- Calculate payback period in months
  IF v_annual_benefit > 0 THEN
    v_payback_months := CEIL(v_total_investment / v_annual_benefit);
  ELSE
    v_payback_months := 0;  -- Infinite payback
  END IF;
  
  RETURN v_payback_months;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_performance_variances()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  planned_duration_days INTEGER;
BEGIN
  -- Calculate schedule variance
  IF NEW.planned_end_date IS NOT NULL AND NEW.actual_end_date IS NOT NULL THEN
    NEW.schedule_variance_days := EXTRACT(DAY FROM (NEW.actual_end_date - NEW.planned_end_date))::INTEGER;
    
    -- Calculate schedule variance percentage
    IF NEW.planned_start_date IS NOT NULL AND NEW.planned_end_date IS NOT NULL THEN
      planned_duration_days := EXTRACT(DAY FROM (NEW.planned_end_date - NEW.planned_start_date))::INTEGER;
      IF planned_duration_days > 0 THEN
        NEW.schedule_variance_percent := (NEW.schedule_variance_days::DECIMAL / planned_duration_days::DECIMAL) * 100;
      END IF;
    END IF;
  END IF;
  
  -- Calculate cost variance
  IF NEW.planned_cost IS NOT NULL AND NEW.actual_cost IS NOT NULL THEN
    NEW.cost_variance := NEW.planned_cost - NEW.actual_cost;
    IF NEW.planned_cost > 0 THEN
      NEW.cost_variance_percent := (NEW.cost_variance / NEW.planned_cost) * 100;
    END IF;
  END IF;
  
  -- Calculate progress variance
  IF NEW.planned_progress_percent IS NOT NULL AND NEW.actual_progress_percent IS NOT NULL THEN
    NEW.progress_variance := NEW.actual_progress_percent - NEW.planned_progress_percent;
  END IF;
  
  -- Calculate EVM metrics
  -- Earned Value (EV) = % complete * planned cost
  IF NEW.planned_cost IS NOT NULL AND NEW.actual_progress_percent IS NOT NULL THEN
    NEW.earned_value := (NEW.actual_progress_percent / 100.0) * NEW.planned_cost;
  END IF;
  
  -- Actual Cost (AC) = actual_cost
  IF NEW.actual_cost IS NOT NULL THEN
    NEW.actual_cost_evm := NEW.actual_cost;
  END IF;
  
  -- Planned Value (PV) = planned_cost (for simplicity, can be enhanced with time-phased budget)
  IF NEW.planned_cost IS NOT NULL THEN
    NEW.planned_value := NEW.planned_cost;
  END IF;
  
  -- Schedule Performance Index (SPI) = EV / PV
  IF NEW.earned_value IS NOT NULL AND NEW.planned_value IS NOT NULL AND NEW.planned_value > 0 THEN
    NEW.schedule_performance_index := NEW.earned_value / NEW.planned_value;
  END IF;
  
  -- Cost Performance Index (CPI) = EV / AC
  IF NEW.earned_value IS NOT NULL AND NEW.actual_cost_evm IS NOT NULL AND NEW.actual_cost_evm > 0 THEN
    NEW.cost_performance_index := NEW.earned_value / NEW.actual_cost_evm;
  END IF;
  
  -- Update updated_at timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_risk_mitigation_completion(p_risk_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    total_plans INTEGER;
    completed_plans INTEGER;
    avg_completion DECIMAL;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COALESCE(AVG(completion_percentage), 0)
    INTO total_plans, completed_plans, avg_completion
    FROM mitigation_plans
    WHERE risk_id = p_risk_id
      AND status != 'cancelled';
    
    IF total_plans = 0 THEN
        RETURN 0;
    END IF;
    
    -- Calculate weighted completion: completed plans count as 100%, others use their completion_percentage
    RETURN ROUND(
        (completed_plans * 100.0 + (total_plans - completed_plans) * avg_completion) / total_plans
    );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_risk_severity(prob character varying, imp character varying, existing_severity character varying DEFAULT NULL::character varying)
 RETURNS character varying
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  -- If severity column exists and has a value, use it
  IF existing_severity IS NOT NULL THEN
    RETURN existing_severity;
  END IF;
  
  -- Otherwise calculate from probability and impact
  IF prob IN ('very_high', 'high') AND imp IN ('very_high', 'high') THEN
    RETURN 'critical';
  ELSIF prob IN ('very_high', 'high') OR imp IN ('very_high', 'high') THEN
    RETURN 'high';
  ELSIF prob = 'medium' AND imp = 'medium' THEN
    RETURN 'medium';
  ELSE
    RETURN 'low';
  END IF;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_roi(p_program_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_total_cost DECIMAL;
  v_total_benefits DECIMAL;
  v_roi DECIMAL;
BEGIN
  -- Get total costs from projects
  SELECT COALESCE(SUM(actual_cost), 0)
  INTO v_total_cost
  FROM projects
  WHERE program_id = p_program_id AND archived = false;
  
  -- Get total benefits
  SELECT COALESCE(SUM(realized_value), 0)
  INTO v_total_benefits
  FROM program_benefits
  WHERE program_id = p_program_id;
  
  -- Calculate ROI
  IF v_total_cost > 0 THEN
    v_roi := ROUND((((v_total_benefits - v_total_cost) / v_total_cost) * 100)::numeric, 2);
  ELSE
    v_roi := 0;
  END IF;
  
  RETURN v_roi;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_weighted_score()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Calculate weighted_score = raw_score × (criteria.weight / 100)
  SELECT (NEW.raw_score * (c.weight / 100.0))
  INTO NEW.weighted_score
  FROM prioritization_criteria c
  WHERE c.id = NEW.criteria_id;
  
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_skill_match(p_stakeholder_id uuid, p_role_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_total_skills INTEGER;
  v_matched_skills INTEGER;
  v_match_percentage DECIMAL(5,2);
BEGIN
  -- Count total required skills for the role
  SELECT COUNT(*) INTO v_total_skills
  FROM role_skills
  WHERE role_id = p_role_id AND is_required = TRUE;
  
  IF v_total_skills = 0 THEN
    RETURN 100.00; -- No skills required, perfect match
  END IF;
  
  -- Count matched skills (stakeholder has skill with sufficient proficiency)
  SELECT COUNT(*) INTO v_matched_skills
  FROM role_skills rs
  INNER JOIN stakeholder_skills ss ON rs.skill_id = ss.skill_id
  WHERE rs.role_id = p_role_id
    AND rs.is_required = TRUE
    AND ss.stakeholder_id = p_stakeholder_id
    AND (
      -- Proficiency level matching (expert >= advanced >= intermediate >= beginner)
      (rs.required_proficiency = 'beginner' AND ss.proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert'))
      OR (rs.required_proficiency = 'intermediate' AND ss.proficiency_level IN ('intermediate', 'advanced', 'expert'))
      OR (rs.required_proficiency = 'advanced' AND ss.proficiency_level IN ('advanced', 'expert'))
      OR (rs.required_proficiency = 'expert' AND ss.proficiency_level = 'expert')
    );
  
  v_match_percentage := (v_matched_skills::DECIMAL / v_total_skills::DECIMAL) * 100.00;
  
  RETURN ROUND(v_match_percentage, 2);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_template_quality_metrics(p_template_id uuid, p_period_type character varying DEFAULT 'all_time'::character varying, p_period_start date DEFAULT NULL::date, p_period_end date DEFAULT NULL::date)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.cash_dist(money, money)
 RETURNS money
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$cash_dist$function$
;
CREATE OR REPLACE FUNCTION public.check_approval_sla_breach(p_approval_request_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_sla_deadline TIMESTAMP;
    v_status VARCHAR;
BEGIN
    SELECT sla_deadline, status INTO v_sla_deadline, v_status
    FROM approval_requests
    WHERE id = p_approval_request_id;
    
    -- SLA breached if deadline passed and still pending/in_progress
    RETURN (
        v_sla_deadline IS NOT NULL AND
        v_sla_deadline < NOW() AND
        v_status IN ('pending', 'in_progress')
    );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.check_task_dependencies_met(p_task_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_unmet_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_unmet_count
  FROM task_dependencies td
  JOIN project_tasks pt ON td.depends_on_task_id = pt.id
  WHERE td.task_id = p_task_id
    AND pt.status != 'completed';
  
  RETURN v_unmet_count = 0;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.cleanup_old_logs(days_to_keep integer DEFAULT 90)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Keep detailed logs for 90 days, delete older
    DELETE FROM ai_usage_logs WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    DELETE FROM api_request_logs WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    DELETE FROM user_activity_logs WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    DELETE FROM job_execution_logs WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    DELETE FROM system_metrics WHERE measured_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    -- Keep daily statistics for 2 years
    DELETE FROM daily_statistics WHERE date < CURRENT_DATE - INTERVAL '730 days';
END;
$function$
;
CREATE OR REPLACE FUNCTION public.cleanup_old_processing_data()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Cleanup old processing jobs (older than 90 days)
    DELETE FROM document_processing_jobs 
    WHERE created_at < NOW() - INTERVAL '90 days' 
    AND status IN ('completed', 'failed', 'cancelled');
    
    -- Cleanup old pipeline executions
    DELETE FROM pipeline_executions 
    WHERE created_at < NOW() - INTERVAL '90 days' 
    AND status IN ('completed', 'failed', 'cancelled');
    
    -- Cleanup old stage jobs
    DELETE FROM stage_jobs 
    WHERE created_at < NOW() - INTERVAL '90 days' 
    AND status IN ('completed', 'failed', 'cancelled');
    
    -- Cleanup old stage executions
    DELETE FROM stage_executions 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Cleanup old metrics (older than 1 year)
    DELETE FROM processing_metrics 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    DELETE FROM stage_metrics 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Cleanup old quality reports (older than 1 year)
    DELETE FROM quality_reports 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Cleanup old processing history (older than 1 year)
    DELETE FROM document_processing_history 
    WHERE created_at < NOW() - INTERVAL '1 year';
END;
$function$
;
CREATE OR REPLACE FUNCTION public.cleanup_old_regeneration_jobs()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM regeneration_jobs
  WHERE status IN ('completed', 'failed')
  AND completed_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.create_template_version(p_template_id uuid, p_version_number character varying, p_change_type character varying, p_change_summary text, p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.current_jwt_role()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(current_setting('request.jwt.claim.role', true), '')
$function$
;
CREATE OR REPLACE FUNCTION public.date_dist(date, date)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$date_dist$function$
;
CREATE OR REPLACE FUNCTION public.detect_resource_conflicts(p_program_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_conflict_count INTEGER := 0;
  v_allocation RECORD;
BEGIN
  -- Reset conflict flags
  UPDATE program_resource_allocations
  SET has_conflicts = FALSE,
      conflict_projects = NULL,
      conflict_details = NULL
  WHERE program_id = p_program_id;
  
  -- Detect conflicts: resources allocated > 100% across active projects
  FOR v_allocation IN
    SELECT 
      resource_id,
      resource_name,
      SUM(allocation_percentage) as total_allocation,
      ARRAY_AGG(DISTINCT project_id) FILTER (WHERE project_id IS NOT NULL) as project_ids,
      jsonb_agg(jsonb_build_object(
        'project_id', project_id,
        'allocation_percentage', allocation_percentage,
        'start_date', allocation_start,
        'end_date', allocation_end
      )) as allocation_details
    FROM program_resource_allocations
    WHERE program_id = p_program_id
      AND allocation_status IN ('planned', 'active')
      AND CURRENT_DATE BETWEEN allocation_start AND COALESCE(allocation_end, '9999-12-31'::date)
    GROUP BY resource_id, resource_name
    HAVING SUM(allocation_percentage) > 100
  LOOP
    -- Mark all allocations for this resource as having conflicts
    UPDATE program_resource_allocations
    SET 
      has_conflicts = TRUE,
      conflict_projects = v_allocation.project_ids,
      conflict_details = jsonb_build_object(
        'total_allocation', v_allocation.total_allocation,
        'allocations', v_allocation.allocation_details,
        'severity', CASE 
          WHEN v_allocation.total_allocation > 120 THEN 'critical'
          WHEN v_allocation.total_allocation > 110 THEN 'high'
          ELSE 'medium'
        END
      ),
      updated_at = NOW()
    WHERE program_id = p_program_id
      AND resource_id = v_allocation.resource_id
      AND allocation_status IN ('planned', 'active');
    
    v_conflict_count := v_conflict_count + 1;
  END LOOP;
  
  RETURN v_conflict_count;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bit_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_penalty$function$
;
CREATE OR REPLACE FUNCTION public.determine_template_maintenance_priority(p_template_id uuid)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.ensure_single_active_template_version()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.active = true THEN
    -- Deactivate all other versions for this template
    UPDATE template_versions
    SET active = false
    WHERE template_id = NEW.template_id
    AND id != NEW.id
    AND active = true;
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.float4_dist(real, real)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$float4_dist$function$
;
CREATE OR REPLACE FUNCTION public.float8_dist(double precision, double precision)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$float8_dist$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bit_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bit_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bit_same(gbtreekey_var, gbtreekey_var, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bit_union(internal, internal)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bool_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bool_consistent(internal, boolean, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bool_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_fetch$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bool_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bool_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bool_same(gbtreekey2, gbtreekey2, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bool_union(internal, internal)
 RETURNS gbtreekey2
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bpchar_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bpchar_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bpchar_consistent(internal, character, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bpchar_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bytea_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bytea_consistent(internal, bytea, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bytea_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bytea_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bytea_same(gbtreekey_var, gbtreekey_var, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_bytea_union(internal, internal)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_cash_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_cash_consistent(internal, money, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_cash_distance(internal, money, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_distance$function$
;
CREATE OR REPLACE FUNCTION public.gbt_cash_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_fetch$function$
;
CREATE OR REPLACE FUNCTION public.gbt_cash_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_cash_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_cash_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_cash_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_date_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_date_consistent(internal, date, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_date_distance(internal, date, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_distance$function$
;
CREATE OR REPLACE FUNCTION public.gbt_date_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_fetch$function$
;
CREATE OR REPLACE FUNCTION public.gbt_date_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_date_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_date_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_date_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_decompress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_enum_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_enum_consistent(internal, anyenum, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_enum_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_fetch$function$
;
CREATE OR REPLACE FUNCTION public.gbt_enum_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_enum_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_enum_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_enum_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_float4_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_float4_consistent(internal, real, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_float4_distance(internal, real, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_distance$function$
;
CREATE OR REPLACE FUNCTION public.gbt_float4_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_fetch$function$
;
CREATE OR REPLACE FUNCTION public.gbt_float4_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_float4_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_float4_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_float4_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_float8_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_float8_consistent(internal, double precision, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_float8_distance(internal, double precision, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_distance$function$
;
CREATE OR REPLACE FUNCTION public.gbt_float8_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_fetch$function$
;
CREATE OR REPLACE FUNCTION public.gbt_float8_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_float8_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_float8_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_float8_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_inet_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_inet_consistent(internal, inet, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_inet_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_inet_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_inet_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_inet_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int2_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int2_consistent(internal, smallint, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int2_distance(internal, smallint, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_distance$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int2_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_fetch$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int2_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int2_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int2_same(gbtreekey4, gbtreekey4, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int2_union(internal, internal)
 RETURNS gbtreekey4
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int4_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int4_consistent(internal, integer, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int4_distance(internal, integer, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_distance$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int4_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_fetch$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int4_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int4_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int4_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int4_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int8_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int8_consistent(internal, bigint, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int8_distance(internal, bigint, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_distance$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int8_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_fetch$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int8_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int8_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int8_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_int8_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_intv_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_intv_consistent(internal, interval, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_intv_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_decompress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_intv_distance(internal, interval, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_distance$function$
;
CREATE OR REPLACE FUNCTION public.gbt_intv_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_fetch$function$
;
CREATE OR REPLACE FUNCTION public.gbt_intv_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_intv_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_intv_same(gbtreekey32, gbtreekey32, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_intv_union(internal, internal)
 RETURNS gbtreekey32
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_macad8_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_macad8_consistent(internal, macaddr8, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_macad8_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_fetch$function$
;
CREATE OR REPLACE FUNCTION public.gbt_macad8_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_macad8_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_macad8_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_macad8_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_macad_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_macad_consistent(internal, macaddr, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_macad_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_fetch$function$
;
CREATE OR REPLACE FUNCTION public.gbt_macad_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_macad_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_macad_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_macad_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_numeric_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_numeric_consistent(internal, numeric, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_numeric_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_numeric_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_numeric_same(gbtreekey_var, gbtreekey_var, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_numeric_union(internal, internal)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_oid_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_oid_consistent(internal, oid, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_oid_distance(internal, oid, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_distance$function$
;
CREATE OR REPLACE FUNCTION public.gbt_oid_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_fetch$function$
;
CREATE OR REPLACE FUNCTION public.gbt_oid_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_oid_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_oid_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_oid_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_text_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_text_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_text_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_text_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_text_same(gbtreekey_var, gbtreekey_var, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_text_union(internal, internal)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_time_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_time_consistent(internal, time without time zone, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_time_distance(internal, time without time zone, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_distance$function$
;
CREATE OR REPLACE FUNCTION public.gbt_time_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_fetch$function$
;
CREATE OR REPLACE FUNCTION public.gbt_time_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_time_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_time_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_time_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_timetz_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_timetz_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_timetz_consistent(internal, time with time zone, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_timetz_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_ts_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_ts_consistent(internal, timestamp without time zone, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_ts_distance(internal, timestamp without time zone, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_distance$function$
;
CREATE OR REPLACE FUNCTION public.gbt_ts_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_fetch$function$
;
CREATE OR REPLACE FUNCTION public.gbt_ts_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_ts_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_ts_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_ts_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_tstz_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_tstz_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_tstz_consistent(internal, timestamp with time zone, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_tstz_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_tstz_distance(internal, timestamp with time zone, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_tstz_distance$function$
;
CREATE OR REPLACE FUNCTION public.gbt_uuid_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_compress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_uuid_consistent(internal, uuid, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_consistent$function$
;
CREATE OR REPLACE FUNCTION public.gbt_uuid_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_fetch$function$
;
CREATE OR REPLACE FUNCTION public.gbt_uuid_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_penalty$function$
;
CREATE OR REPLACE FUNCTION public.gbt_uuid_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_picksplit$function$
;
CREATE OR REPLACE FUNCTION public.gbt_uuid_same(gbtreekey32, gbtreekey32, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_same$function$
;
CREATE OR REPLACE FUNCTION public.gbt_uuid_union(internal, internal)
 RETURNS gbtreekey32
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_union$function$
;
CREATE OR REPLACE FUNCTION public.gbt_var_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_var_decompress$function$
;
CREATE OR REPLACE FUNCTION public.gbt_var_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_var_fetch$function$
;
CREATE OR REPLACE FUNCTION public.get_ai_usage_by_date_range(start_date timestamp without time zone, end_date timestamp without time zone, p_provider_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid, p_project_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(date timestamp without time zone, provider_type character varying, model_name character varying, request_count bigint, total_tokens bigint, avg_response_time numeric, total_cost numeric, success_rate numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('day', aul.created_at) as date,
    aul.provider_type,
    aul.model_name,
    COUNT(*) as request_count,
    SUM(aul.total_tokens) as total_tokens,
    AVG(aul.response_time_ms) as avg_response_time,
    SUM(aul.estimated_cost) as total_cost,
    (COUNT(*) FILTER (WHERE aul.success = true)::DECIMAL / COUNT(*) * 100) as success_rate
  FROM ai_usage_logs aul
  WHERE aul.created_at >= start_date 
    AND aul.created_at <= end_date
    AND (p_provider_id IS NULL OR aul.provider_id = p_provider_id)
    AND (p_user_id IS NULL OR aul.user_id = p_user_id)
    AND (p_project_id IS NULL OR aul.project_id = p_project_id)
  GROUP BY DATE_TRUNC('day', aul.created_at), aul.provider_type, aul.model_name
  ORDER BY date DESC, total_tokens DESC;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.int4_dist(integer, integer)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$int4_dist$function$
;
CREATE OR REPLACE FUNCTION public.get_all_entity_counts(project_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  result JSONB := '{}'::JSONB;
BEGIN
  -- Core entities (0-14)
  result := result || jsonb_build_object(
    'stakeholders', safe_count_entity('stakeholders', project_id_param),
    'requirements', safe_count_entity('requirements', project_id_param),
    'risks', safe_count_entity('risks', project_id_param),
    'milestones', safe_count_entity('milestones', project_id_param),
    'constraints', safe_count_entity('constraints', project_id_param),
    'success_criteria', safe_count_entity('success_criteria', project_id_param),
    'best_practices', safe_count_entity('best_practices', project_id_param),
    'phases', safe_count_entity('phases', project_id_param),
    'resources', safe_count_entity('resources', project_id_param),
    'technologies', safe_count_entity('technologies', project_id_param),
    'quality_standards', safe_count_entity('quality_standards', project_id_param),
    'compliance_security', safe_count_entity('compliance_security', project_id_param),
    'deliverables', safe_count_entity('deliverables', project_id_param),
    'scope_items', safe_count_entity('scope_items', project_id_param),
    'activities', safe_count_entity('activities', project_id_param)
  );
  
  -- Performance Domain entities (15-24)
  result := result || jsonb_build_object(
    'team_agreements', safe_count_entity('team_agreements', project_id_param),
    'development_approaches', safe_count_entity('development_approaches', project_id_param),
    'project_iterations', safe_count_entity('project_iterations', project_id_param),
    'work_items', safe_count_entity('work_items', project_id_param),
    'capacity_plans', safe_count_entity('capacity_plans', project_id_param),
    'performance_measurements', safe_count_entity('performance_measurements', project_id_param),
    'earned_value_metrics', safe_count_entity('earned_value_metrics', project_id_param),
    'opportunities', safe_count_entity('opportunities', project_id_param),
    'risk_responses', safe_count_entity('risk_responses', project_id_param),
    'performance_actuals', safe_count_entity('performance_actuals', project_id_param)
  );
  
  -- Knowledge Area Domain entities (25-62)
  -- Governance (5)
  result := result || jsonb_build_object(
    'governance_decisions', safe_count_entity('governance_decisions', project_id_param),
    'approval_workflows', safe_count_entity('approval_workflows', project_id_param),
    'steering_committees', safe_count_entity('steering_committees', project_id_param),
    'change_control_boards', safe_count_entity('change_control_boards', project_id_param),
    'policy_compliance', safe_count_entity('policy_compliance', project_id_param)
  );
  
  -- Scope (5)
  result := result || jsonb_build_object(
    'scope_baselines', safe_count_entity('scope_baselines', project_id_param),
    'wbs_nodes', safe_count_entity('wbs_nodes', project_id_param),
    'scope_change_requests', safe_count_entity('scope_change_requests', project_id_param),
    'requirements_traceability', safe_count_entity('requirements_traceability', project_id_param),
    'scope_verification', safe_count_entity('scope_verification', project_id_param)
  );
  
  -- Schedule (5)
  result := result || jsonb_build_object(
    'schedule_baselines', safe_count_entity('schedule_baselines', project_id_param),
    'schedule_activities', safe_count_entity('schedule_activities', project_id_param),
    'critical_path_activities', safe_count_entity('critical_path_activities', project_id_param),
    'schedule_variances', safe_count_entity('schedule_variances', project_id_param),
    'schedule_forecasts', safe_count_entity('schedule_forecasts', project_id_param)
  );
  
  -- Finance (6)
  result := result || jsonb_build_object(
    'budget_baselines', safe_count_entity('budget_baselines', project_id_param),
    'cost_actuals', safe_count_entity('cost_actuals', project_id_param),
    'cost_estimates', safe_count_entity('cost_estimates', project_id_param),
    'funding_tranches', safe_count_entity('funding_tranches', project_id_param),
    'financial_variances', safe_count_entity('financial_variances', project_id_param),
    'procurement_costs', safe_count_entity('procurement_costs', project_id_param)
  );
  
  -- Resources (6)
  result := result || jsonb_build_object(
    'resource_assignments', safe_count_entity('resource_assignments', project_id_param),
    'resource_pool', safe_count_entity('resource_pool', project_id_param),
    'capacity_forecasts', safe_count_entity('capacity_forecasts', project_id_param),
    'utilization_records', safe_count_entity('utilization_records', project_id_param),
    'resource_conflicts', safe_count_entity('resource_conflicts', project_id_param),
    'onboarding_offboarding', safe_count_entity('onboarding_offboarding', project_id_param)
  );
  
  -- Risk (6)
  result := result || jsonb_build_object(
    'risk_assessments', safe_count_entity('risk_assessments', project_id_param),
    'risk_response_plans', safe_count_entity('risk_response_plans', project_id_param),
    'risk_triggers', safe_count_entity('risk_triggers', project_id_param),
    'risk_reviews', safe_count_entity('risk_reviews', project_id_param),
    'contingency_reserves', safe_count_entity('contingency_reserves', project_id_param),
    'risk_metrics', safe_count_entity('risk_metrics', project_id_param)
  );
  
  -- Stakeholders Ops (5)
  result := result || jsonb_build_object(
    'engagement_actions', safe_count_entity('engagement_actions', project_id_param),
    'communication_logs', safe_count_entity('communication_logs', project_id_param),
    'satisfaction_surveys', safe_count_entity('satisfaction_surveys', project_id_param),
    'stakeholder_issues', safe_count_entity('stakeholder_issues', project_id_param),
    'relationship_health', safe_count_entity('relationship_health', project_id_param)
  );
  
  RETURN result;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_context_bundle_stats(template_id_param uuid DEFAULT NULL::uuid, project_id_param uuid DEFAULT NULL::uuid, user_id_param uuid DEFAULT NULL::uuid, days_back integer DEFAULT 30)
 RETURNS TABLE(total_bundles bigint, successful_bundles bigint, failed_bundles bigint, average_processing_time_ms numeric, average_success_rate numeric, total_context_sources bigint, average_context_size_bytes numeric, most_used_strategy text, error_rate numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_bundles,
        COUNT(*) FILTER (WHERE (metadata->>'successful_sources')::integer > 0) as successful_bundles,
        COUNT(*) FILTER (WHERE (metadata->>'failed_sources')::integer > 0) as failed_bundles,
        AVG((metadata->>'processing_time_ms')::integer) as average_processing_time_ms,
        AVG(
            CASE 
                WHEN (metadata->>'total_sources')::integer > 0 
                THEN (metadata->>'successful_sources')::integer::float / (metadata->>'total_sources')::integer
                ELSE 0 
            END
        ) as average_success_rate,
        SUM((metadata->>'total_sources')::integer) as total_context_sources,
        AVG((metadata->>'total_size_bytes')::bigint) as average_context_size_bytes,
        MODE() WITHIN GROUP (ORDER BY injection_strategy) as most_used_strategy,
        AVG(
            CASE 
                WHEN (metadata->>'total_sources')::integer > 0 
                THEN (metadata->>'failed_sources')::integer::float / (metadata->>'total_sources')::integer
                ELSE 0 
            END
        ) as error_rate
    FROM context_bundles
    WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * days_back
    AND (template_id_param IS NULL OR template_id = template_id_param)
    AND (project_id_param IS NULL OR project_id = project_id_param)
    AND (user_id_param IS NULL OR user_id = user_id_param);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_document_versions(p_document_id uuid)
 RETURNS TABLE(id uuid, name text, semantic_version character varying, content text, created_at timestamp with time zone, updated_at timestamp with time zone, author_id uuid, author_name text, word_count integer, is_regeneration boolean, generation_metadata jsonb, is_current boolean)
 LANGUAGE plpgsql
AS $function$
DECLARE
  root_id UUID;
BEGIN
  -- Find the root document by traversing up the tree
  WITH RECURSIVE parent_tree AS (
    SELECT d.id, d.parent_document_id, 0 as depth
    FROM documents d
    WHERE d.id = p_document_id
    
    UNION ALL
    
    SELECT p.id, p.parent_document_id, pt.depth + 1
    FROM documents p
    INNER JOIN parent_tree pt ON p.id = pt.parent_document_id
    WHERE pt.parent_document_id IS NOT NULL
  )
  SELECT parent_tree.id INTO root_id
  FROM parent_tree
  WHERE parent_tree.parent_document_id IS NULL
  LIMIT 1;
  
  -- If no parent chain found, use the provided document as root
  IF root_id IS NULL THEN
    root_id := p_document_id;
  END IF;
  
  -- Return all documents in this version tree (root and all descendants)
  RETURN QUERY
  WITH RECURSIVE version_tree AS (
    SELECT d.id, d.name, d.semantic_version, d.content, d.created_at, d.updated_at, 
           d.created_by, d.author, d.word_count, d.is_regeneration, d.generation_metadata
    FROM documents d
    WHERE d.id = root_id
    
    UNION ALL
    
    SELECT d.id, d.name, d.semantic_version, d.content, d.created_at, d.updated_at,
           d.created_by, d.author, d.word_count, d.is_regeneration, d.generation_metadata
    FROM documents d
    INNER JOIN version_tree vt ON d.parent_document_id = vt.id
  )
  SELECT 
    vt.id,
    vt.name::TEXT,
    vt.semantic_version,
    vt.content,
    vt.created_at,
    vt.updated_at,
    vt.created_by as author_id,
    COALESCE(vt.author, u.name, 'System')::TEXT as author_name,
    COALESCE(vt.word_count, 0)::INTEGER as word_count,
    COALESCE(vt.is_regeneration, FALSE)::BOOLEAN as is_regeneration,
    vt.generation_metadata,
    (vt.id = p_document_id)::BOOLEAN as is_current
  FROM version_tree vt
  LEFT JOIN users u ON vt.created_by = u.id
  ORDER BY vt.created_at ASC;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_processing_statistics(timeframe_hours integer DEFAULT 24)
 RETURNS TABLE(total_jobs bigint, successful_jobs bigint, failed_jobs bigint, average_processing_time numeric, average_quality_score numeric, most_common_stage_type text, most_common_error_type text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN dpj.status = 'completed' THEN 1 END) as successful_jobs,
        COUNT(CASE WHEN dpj.status = 'failed' THEN 1 END) as failed_jobs,
        AVG(EXTRACT(EPOCH FROM (dpj.completed_at - dpj.started_at))) as average_processing_time,
        AVG(pm.quality_score) as average_quality_score,
        (SELECT stage_type FROM stage_metrics 
         WHERE created_at >= NOW() - INTERVAL '1 hour' * timeframe_hours 
         GROUP BY stage_type ORDER BY COUNT(*) DESC LIMIT 1) as most_common_stage_type,
        (SELECT error->>'error_type' FROM document_processing_jobs 
         WHERE created_at >= NOW() - INTERVAL '1 hour' * timeframe_hours 
         AND error IS NOT NULL 
         GROUP BY error->>'error_type' ORDER BY COUNT(*) DESC LIMIT 1) as most_common_error_type
    FROM document_processing_jobs dpj
    LEFT JOIN processing_metrics pm ON dpj.request_id = pm.request_id
    WHERE dpj.created_at >= NOW() - INTERVAL '1 hour' * timeframe_hours;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_provider_test_statistics(p_provider_id uuid, p_days_back integer DEFAULT 7)
 RETURNS TABLE(test_type character varying, total_tests bigint, passed_tests bigint, failed_tests bigint, avg_score numeric, avg_response_time numeric, success_rate numeric, last_test_date timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.test_type,
    COUNT(*) as total_tests,
    COUNT(*) FILTER (WHERE t.status = 'pass') as passed_tests,
    COUNT(*) FILTER (WHERE t.status IN ('fail', 'timeout')) as failed_tests,
    AVG(t.score) as avg_score,
    AVG(t.response_time) as avg_response_time,
    (COUNT(*) FILTER (WHERE t.status = 'pass')::DECIMAL / COUNT(*) * 100) as success_rate,
    MAX(t.timestamp) as last_test_date
  FROM ai_provider_test_results t
  WHERE t.provider_id = p_provider_id
    AND t.timestamp >= NOW() - INTERVAL '1 day' * p_days_back
  GROUP BY t.test_type
  ORDER BY t.test_type;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_quality_trends(timeframe_hours integer DEFAULT 24)
 RETURNS TABLE(date_hour timestamp with time zone, average_quality_score numeric, job_count bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        DATE_TRUNC('hour', pm.created_at) as date_hour,
        AVG(pm.quality_score) as average_quality_score,
        COUNT(*) as job_count
    FROM processing_metrics pm
    WHERE pm.created_at >= NOW() - INTERVAL '1 hour' * timeframe_hours
    GROUP BY DATE_TRUNC('hour', pm.created_at)
    ORDER BY date_hour;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_resolution_statistics(days_back integer DEFAULT 7)
 RETURNS TABLE(total_resolutions bigint, successful_resolutions bigint, failed_resolutions bigint, success_rate numeric, avg_resolution_time numeric, cache_hit_rate numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_resolutions,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as successful_resolutions,
        COUNT(CASE WHEN status = 'unresolved' OR status = 'failed' THEN 1 END) as failed_resolutions,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND(COUNT(CASE WHEN status = 'resolved' THEN 1 END)::DECIMAL / COUNT(*), 4)
            ELSE 0 
        END as success_rate,
        ROUND(AVG(resolution_time), 2) as avg_resolution_time,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND(COUNT(CASE WHEN cache_hit = true THEN 1 END)::DECIMAL / COUNT(*), 4)
            ELSE 0 
        END as cache_hit_rate
    FROM variable_resolution_metrics
    WHERE created_at >= NOW() - INTERVAL '1 day' * days_back;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_search_statistics(start_date timestamp with time zone, end_date timestamp with time zone)
 RETURNS TABLE(total_searches bigint, unique_users bigint, successful_searches bigint, failed_searches bigint, success_rate numeric, avg_results_per_search numeric, avg_response_time_ms numeric, total_clicks bigint, cache_hit_rate numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_searches,
        COUNT(DISTINCT user_id)::BIGINT as unique_users,
        SUM(CASE WHEN has_results THEN 1 ELSE 0 END)::BIGINT as successful_searches,
        SUM(CASE WHEN has_results THEN 0 ELSE 1 END)::BIGINT as failed_searches,
        ROUND(SUM(CASE WHEN has_results THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*)::numeric, 0) * 100, 2) as success_rate,
        ROUND(AVG(total_results), 2) as avg_results_per_search,
        ROUND(AVG(response_time_ms), 2) as avg_response_time_ms,
        SUM(result_clicks)::BIGINT as total_clicks,
        ROUND(SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*)::numeric, 0) * 100, 2) as cache_hit_rate
    FROM search_analytics
    WHERE created_at >= start_date AND created_at <= end_date;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_stage_performance_metrics(timeframe_hours integer DEFAULT 24)
 RETURNS TABLE(stage_type text, total_executions bigint, successful_executions bigint, failed_executions bigint, average_execution_time numeric, average_quality_score numeric, success_rate numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        sm.stage_type,
        COUNT(*) as total_executions,
        COUNT(CASE WHEN sm.success = true THEN 1 END) as successful_executions,
        COUNT(CASE WHEN sm.success = false THEN 1 END) as failed_executions,
        AVG(sm.execution_time) as average_execution_time,
        AVG(sm.quality_score) as average_quality_score,
        (COUNT(CASE WHEN sm.success = true THEN 1 END)::NUMERIC / COUNT(*)) as success_rate
    FROM stage_metrics sm
    WHERE sm.created_at >= NOW() - INTERVAL '1 hour' * timeframe_hours
    GROUP BY sm.stage_type
    ORDER BY sm.stage_type;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_task_hierarchy(p_project_id uuid)
 RETURNS TABLE(task_id uuid, parent_id uuid, level integer, task_name character varying, wbs_code character varying, path text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH RECURSIVE task_tree AS (
    -- Root tasks (no parent)
    SELECT 
      id,
      parent_task_id,
      1 as level,
      task_name,
      wbs_code,
      task_name::TEXT as path
    FROM project_tasks
    WHERE project_id = p_project_id
      AND parent_task_id IS NULL
    
    UNION ALL
    
    -- Child tasks
    SELECT 
      t.id,
      t.parent_task_id,
      tt.level + 1,
      t.task_name,
      t.wbs_code,
      tt.path || ' > ' || t.task_name
    FROM project_tasks t
    JOIN task_tree tt ON t.parent_task_id = tt.task_id
    WHERE t.project_id = p_project_id
  )
  SELECT * FROM task_tree
  ORDER BY path;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_user_capacity_settings(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(contracted_hours_per_week numeric, contracted_hours_per_day numeric, target_utilization_percent numeric, max_allocation_percent numeric, resource_type character varying, work_start_time time without time zone, work_end_time time without time zone)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(rcs.contracted_hours_per_week, 40::DECIMAL),
    COALESCE(rcs.contracted_hours_per_day, 8::DECIMAL),
    COALESCE(rcs.target_utilization_percent, 80::DECIMAL),
    COALESCE(rcs.max_allocation_percent, 100::DECIMAL),
    COALESCE(rcs.resource_type, 'full-time'::VARCHAR),
    COALESCE(rcs.work_start_time, '09:00'::TIME),
    COALESCE(rcs.work_end_time, '17:00'::TIME)
  FROM users u
  LEFT JOIN resource_capacity_settings rcs 
    ON u.id = rcs.user_id 
    AND rcs.is_active = TRUE
    AND p_date >= rcs.effective_from
    AND (rcs.effective_until IS NULL OR p_date <= rcs.effective_until)
  WHERE u.id = p_user_id
  LIMIT 1;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_variable_usage_stats(variable_name_param character varying)
 RETURNS TABLE(variable_name character varying, total_usage bigint, successful_resolutions bigint, failed_resolutions bigint, success_rate numeric, avg_resolution_time numeric, most_used_strategy character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        vrm.variable_name,
        COUNT(*) as total_usage,
        COUNT(CASE WHEN vrm.status = 'resolved' THEN 1 END) as successful_resolutions,
        COUNT(CASE WHEN vrm.status = 'unresolved' OR vrm.status = 'failed' THEN 1 END) as failed_resolutions,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND(COUNT(CASE WHEN vrm.status = 'resolved' THEN 1 END)::DECIMAL / COUNT(*), 4)
            ELSE 0 
        END as success_rate,
        ROUND(AVG(vrm.resolution_time), 2) as avg_resolution_time,
        (SELECT resolution_strategy 
         FROM variable_resolution_metrics vrm2 
         WHERE vrm2.variable_name = vrm.variable_name 
         GROUP BY resolution_strategy 
         ORDER BY COUNT(*) DESC 
         LIMIT 1) as most_used_strategy
    FROM variable_resolution_metrics vrm
    WHERE vrm.variable_name = variable_name_param
    AND vrm.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY vrm.variable_name;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.import_wbs_from_extraction(p_project_id uuid, p_document_id uuid, p_user_id uuid)
 RETURNS TABLE(tasks_created integer, total_estimated_hours numeric, tasks_needing_assignment integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_tasks_created INTEGER := 0;
  v_total_hours DECIMAL := 0;
  v_needs_assignment INTEGER := 0;
BEGIN
  -- This is a placeholder function
  -- Actual implementation will be in the backend service
  -- Returns summary of WBS import results
  
  RETURN QUERY SELECT 0, 0::DECIMAL, 0;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.int2_dist(smallint, smallint)
 RETURNS smallint
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$int2_dist$function$
;
CREATE OR REPLACE FUNCTION public.int8_dist(bigint, bigint)
 RETURNS bigint
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$int8_dist$function$
;
CREATE OR REPLACE FUNCTION public.interval_dist(interval, interval)
 RETURNS interval
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$interval_dist$function$
;
CREATE OR REPLACE FUNCTION public.maintain_current_state_flag()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE digital_twin_asset_states
    SET is_current = false
    WHERE asset_id = NEW.asset_id
      AND id != NEW.id
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.notify_entity_extractor()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  fn_url text := current_setting('app.settings.entity_extractor_url', true);
  svc_key text := current_setting('app.settings.service_role_key', true);
  http_response extensions.http_response;
begin
  if fn_url is null or fn_url = '' then
    -- raise notice 'entity extractor URL not set';
    -- return new;
    fn_url := 'https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/entity-extractor';
  end if;

  if svc_key is null or svc_key = '' then
    raise notice 'service role key not set';
    return new;
  end if;

  -- Switched to extensions.http() for proper JSON support
  SELECT * INTO http_response FROM extensions.http((
      'POST',
      fn_url,
      ARRAY[extensions.http_header('Content-Type', 'application/json'), extensions.http_header('Authorization', 'Bearer ' || svc_key)],
      'application/json',
      jsonb_build_object('document_id', NEW.id::text)::text
  )::extensions.http_request);

  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.oid_dist(oid, oid)
 RETURNS oid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$oid_dist$function$
;
CREATE OR REPLACE FUNCTION public.process_scheduled_refreshes()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.promote_template_status(p_template_id uuid, p_user_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, old_status character varying, new_status character varying, message text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_current_status VARCHAR(20);
  v_new_status VARCHAR(20);
  v_validation_count INTEGER;
  v_success_count INTEGER;
  v_success_rate NUMERIC;
  v_compliance_checked BOOLEAN;
BEGIN
  -- Get current status and validation counts
  SELECT 
    development_status,
    validation_count,
    success_count,
    CASE 
      WHEN validation_count = 0 THEN 0
      ELSE (success_count::NUMERIC / validation_count::NUMERIC)
    END,
    compliance_checked_at IS NOT NULL
  INTO v_current_status, v_validation_count, v_success_count, v_success_rate, v_compliance_checked
  FROM templates
  WHERE id = p_template_id;
  
  -- Check if template exists
  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::VARCHAR, NULL::VARCHAR, 'Template not found'::TEXT;
    RETURN;
  END IF;
  
  -- Cannot promote from archived
  IF v_current_status = 'archived' THEN
    RETURN QUERY SELECT FALSE, v_current_status, NULL::VARCHAR, 'Cannot promote archived templates. Restore first.'::TEXT;
    RETURN;
  END IF;
  
  -- Determine next status and check requirements
  IF v_current_status = 'draft' THEN
    v_new_status := 'testing';
    
  ELSIF v_current_status = 'testing' THEN
    -- Check requirements for compliance stage
    IF v_validation_count < 3 THEN
      RETURN QUERY SELECT FALSE, v_current_status, NULL::VARCHAR, 
        'Need 3+ validations (currently ' || v_validation_count || ')'::TEXT;
      RETURN;
    END IF;
    IF v_success_rate < 0.75 THEN
      RETURN QUERY SELECT FALSE, v_current_status, NULL::VARCHAR,
        'Need 75%+ success rate (currently ' || ROUND(v_success_rate * 100, 1) || '%)'::TEXT;
      RETURN;
    END IF;
    v_new_status := 'compliance';
    
  ELSIF v_current_status = 'compliance' THEN
    -- Check requirements for validated stage
    IF v_validation_count < 5 THEN
      RETURN QUERY SELECT FALSE, v_current_status, NULL::VARCHAR,
        'Need 5+ validations (currently ' || v_validation_count || ')'::TEXT;
      RETURN;
    END IF;
    IF v_success_rate < 0.80 THEN
      RETURN QUERY SELECT FALSE, v_current_status, NULL::VARCHAR,
        'Need 80%+ success rate (currently ' || ROUND(v_success_rate * 100, 1) || '%)'::TEXT;
      RETURN;
    END IF;
    IF NOT v_compliance_checked THEN
      RETURN QUERY SELECT FALSE, v_current_status, NULL::VARCHAR,
        'Manual compliance review required'::TEXT;
      RETURN;
    END IF;
    v_new_status := 'validated';
    
  ELSIF v_current_status = 'validated' THEN
    -- Check requirements for production
    IF v_validation_count < 10 THEN
      RETURN QUERY SELECT FALSE, v_current_status, NULL::VARCHAR,
        'Need 10+ validations (currently ' || v_validation_count || ')'::TEXT;
      RETURN;
    END IF;
    IF v_success_rate < 0.90 THEN
      RETURN QUERY SELECT FALSE, v_current_status, NULL::VARCHAR,
        'Need 90%+ success rate (currently ' || ROUND(v_success_rate * 100, 1) || '%)'::TEXT;
      RETURN;
    END IF;
    v_new_status := 'production';
    
  ELSE
    RETURN QUERY SELECT FALSE, v_current_status, NULL::VARCHAR,
      'No promotion path from ' || v_current_status::TEXT;
    RETURN;
  END IF;
  
  -- Perform the promotion
  UPDATE templates
  SET 
    development_status = v_new_status,
    updated_at = NOW()
  WHERE id = p_template_id;
  
  -- Log the promotion
  INSERT INTO template_status_history (template_id, old_status, new_status, changed_by, reason)
  VALUES (p_template_id, v_current_status, v_new_status, p_user_id, p_reason);
  
  RETURN QUERY SELECT TRUE, v_current_status, v_new_status, 
    'Successfully promoted from ' || v_current_status || ' to ' || v_new_status::TEXT;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_provider_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_model_performance;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.refresh_search_analytics_views()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_searches;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_search_mode_usage;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_search_success_rate;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_clicked_results;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.refresh_template_analytics_views()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_template_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_template_trends;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.reset_ai_provider_usage_counters()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE ai_providers 
  SET usage_stats = jsonb_set(
    jsonb_set(
      usage_stats,
      '{requestsThisMinute}',
      '0'
    ),
    '{tokensThisMinute}',
    '0'
  )
  WHERE 
    provider_type = 'openai' 
    AND is_active = true
    AND (usage_stats->>'lastReset')::timestamp < (CURRENT_TIMESTAMP - INTERVAL '1 minute');
    
  UPDATE ai_providers 
  SET usage_stats = jsonb_set(
    usage_stats,
    '{requestsToday}',
    '0'
  )
  WHERE 
    provider_type = 'openai' 
    AND is_active = true
    AND (usage_stats->>'lastReset')::timestamp < (CURRENT_TIMESTAMP - INTERVAL '1 day');
END;
$function$
;
CREATE OR REPLACE FUNCTION public.restore_document(document_id uuid, restored_by_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE documents 
    SET 
        deleted_at = NULL,
        deleted_by = NULL,
        updated_at = NOW()
    WHERE id = document_id 
    AND deleted_at IS NOT NULL; -- Only update if currently deleted
    
    RETURN FOUND;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_compliance_security_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_document_chunks_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_competencies_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_context_bundles_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_search_result_clicks()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE search_analytics
    SET result_clicks = result_clicks + 1
    WHERE id = NEW.search_id;
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.soft_delete_document(document_id uuid, deleted_by_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE documents 
    SET 
        deleted_at = NOW(),
        deleted_by = deleted_by_user_id,
        updated_at = NOW()
    WHERE id = document_id 
    AND deleted_at IS NULL; -- Only update if not already deleted
    
    RETURN FOUND;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.time_dist(time without time zone, time without time zone)
 RETURNS interval
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$time_dist$function$
;
CREATE OR REPLACE FUNCTION public.trigger_update_query_analytics()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM update_query_analytics(
        NEW.query,
        NEW.relevance_threshold,
        NEW.processing_time,
        NEW.error IS NULL
    );
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.trigger_audit_approval_step_decision()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Only log when status changes to approved/rejected
    IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
        INSERT INTO approval_audit_log (
            approval_request_id,
            approval_step_id,
            action_type,
            action_description,
            performed_by,
            previous_state,
            new_state
        ) VALUES (
            NEW.approval_request_id,
            NEW.id,
            CASE WHEN NEW.status = 'approved' THEN 'approval_granted' ELSE 'approval_rejected' END,
            format('Step %s: %s', NEW.step_order, NEW.step_name),
            NEW.approver_user_id,
            jsonb_build_object('status', OLD.status, 'decision', OLD.decision),
            jsonb_build_object('status', NEW.status, 'decision', NEW.decision, 'notes', NEW.decision_notes)
        );
    END IF;
    
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.trigger_update_daily_context_bundle_usage_analytics()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM update_daily_context_bundle_usage_analytics();
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.trigger_update_daily_context_freshness_metrics()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM update_daily_context_freshness_metrics();
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.trigger_update_resource_conflicts()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Detect conflicts for the affected program
  PERFORM detect_resource_conflicts(COALESCE(NEW.program_id, OLD.program_id));
  
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_portfolio_strategic_goals_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.trigger_update_task_from_time_entry()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update task actuals if task_id is set
  IF NEW.task_id IS NOT NULL THEN
    PERFORM update_task_actuals(NEW.task_id);
  END IF;
  
  -- Update task assignment actuals if task_assignment_id is set
  IF NEW.task_assignment_id IS NOT NULL THEN
    PERFORM update_task_assignment_actuals(NEW.task_assignment_id);
  END IF;
  
  -- Update project cost breakdown (existing function from Migration 206)
  IF NEW.project_id IS NOT NULL THEN
    PERFORM update_project_cost_breakdown(NEW.project_id);
  END IF;
  
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.trigger_update_task_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Auto-set status based on dates and completion
  IF NEW.percent_complete >= 100 THEN
    NEW.status := 'completed';
    NEW.completed_at := NOW();
  ELSIF NEW.actual_start_date IS NOT NULL AND NEW.status = 'planned' THEN
    NEW.status := 'in-progress';
  END IF;
  
  -- Calculate variances
  IF NEW.estimated_hours IS NOT NULL AND NEW.actual_hours > 0 THEN
    NEW.hours_variance := NEW.actual_hours - NEW.estimated_hours;
  END IF;
  
  IF NEW.estimated_cost IS NOT NULL AND NEW.actual_cost > 0 THEN
    NEW.cost_variance := NEW.actual_cost - NEW.estimated_cost;
  END IF;
  
  IF NEW.planned_end_date IS NOT NULL AND NEW.actual_end_date IS NOT NULL THEN
    NEW.schedule_variance_days := NEW.actual_end_date - NEW.planned_end_date;
  END IF;
  
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.tstz_dist(timestamp with time zone, timestamp with time zone)
 RETURNS interval
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$tstz_dist$function$
;
CREATE OR REPLACE FUNCTION public.update_ai_model_configurations_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_asset_current_state()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE digital_twin_assets
    SET current_state_id = NEW.id,
        current_state_version = NEW.state_version,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.asset_id;
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_daily_analysis_metrics()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.update_daily_context_bundle_usage_analytics()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    usage_date_val DATE;
    bundle_id_val VARCHAR(255);
    usage_count_val INTEGER;
    unique_users_val INTEGER;
    avg_session_duration_val INTEGER;
    user_satisfaction_val DECIMAL(3,2);
BEGIN
    usage_date_val := CURRENT_DATE;
    
    -- Calculate metrics for each bundle
    FOR bundle_id_val IN SELECT DISTINCT id FROM context_bundles WHERE expires_at IS NULL OR expires_at > NOW()
    LOOP
        -- Calculate usage count
        SELECT COUNT(*)
        INTO usage_count_val
        FROM context_bundle_access_log
        WHERE bundle_id = bundle_id_val AND DATE(accessed_at) = usage_date_val;
        
        -- Calculate unique users
        SELECT COUNT(DISTINCT user_id)
        INTO unique_users_val
        FROM context_bundle_access_log
        WHERE bundle_id = bundle_id_val AND DATE(accessed_at) = usage_date_val AND user_id IS NOT NULL;
        
        -- Calculate average session duration
        SELECT COALESCE(AVG(access_duration), 0)
        INTO avg_session_duration_val
        FROM context_bundle_access_log
        WHERE bundle_id = bundle_id_val AND DATE(accessed_at) = usage_date_val AND access_duration IS NOT NULL;
        
        -- Calculate user satisfaction (placeholder)
        user_satisfaction_val := 0.8;
        
        -- Insert or update daily metrics
        INSERT INTO context_bundle_usage_analytics (
            bundle_id, usage_date, usage_count, unique_users, average_session_duration, user_satisfaction
        ) VALUES (
            bundle_id_val, usage_date_val, usage_count_val, unique_users_val, avg_session_duration_val, user_satisfaction_val
        )
        ON CONFLICT (bundle_id, usage_date) DO UPDATE SET
            usage_count = EXCLUDED.usage_count,
            unique_users = EXCLUDED.unique_users,
            average_session_duration = EXCLUDED.average_session_duration,
            user_satisfaction = EXCLUDED.user_satisfaction;
    END LOOP;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_daily_context_freshness_metrics()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.update_daily_metrics()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    metric_date_val DATE;
    total_queries_val INTEGER;
    successful_queries_val INTEGER;
    failed_queries_val INTEGER;
    avg_response_time_val INTEGER;
    cache_hit_rate_val DECIMAL;
    avg_relevance_val DECIMAL;
    semantic_usage_val INTEGER;
    keyword_usage_val INTEGER;
    hybrid_usage_val INTEGER;
BEGIN
    metric_date_val := CURRENT_DATE;
    
    -- Calculate metrics for today
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN error IS NULL THEN 1 END),
        COUNT(CASE WHEN error IS NOT NULL THEN 1 END),
        COALESCE(AVG(processing_time), 0),
        COALESCE(AVG(CASE WHEN cache_hit THEN 1.0 ELSE 0.0 END), 0),
        COALESCE(AVG(relevance_threshold), 0),
        COUNT(CASE WHEN search_strategy = 'semantic' THEN 1 END),
        COUNT(CASE WHEN search_strategy = 'keyword' THEN 1 END),
        COUNT(CASE WHEN search_strategy = 'hybrid' THEN 1 END)
    INTO 
        total_queries_val,
        successful_queries_val,
        failed_queries_val,
        avg_response_time_val,
        cache_hit_rate_val,
        avg_relevance_val,
        semantic_usage_val,
        keyword_usage_val,
        hybrid_usage_val
    FROM search_history
    WHERE DATE(created_at) = metric_date_val;
    
    -- Insert or update daily metrics
    INSERT INTO context_retrieval_metrics (
        metric_date, total_queries, successful_queries, failed_queries,
        average_response_time, cache_hit_rate, average_relevance_score,
        semantic_search_usage, keyword_search_usage, hybrid_search_usage
    ) VALUES (
        metric_date_val, total_queries_val, successful_queries_val, failed_queries_val,
        avg_response_time_val, cache_hit_rate_val, avg_relevance_val,
        semantic_usage_val, keyword_usage_val, hybrid_usage_val
    )
    ON CONFLICT (metric_date) DO UPDATE SET
        total_queries = EXCLUDED.total_queries,
        successful_queries = EXCLUDED.successful_queries,
        failed_queries = EXCLUDED.failed_queries,
        average_response_time = EXCLUDED.average_response_time,
        cache_hit_rate = EXCLUDED.cache_hit_rate,
        average_relevance_score = EXCLUDED.average_relevance_score,
        semantic_search_usage = EXCLUDED.semantic_search_usage,
        keyword_search_usage = EXCLUDED.keyword_search_usage,
        hybrid_search_usage = EXCLUDED.hybrid_search_usage;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_digital_twin_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_execution_progress()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update completed_steps count when step execution status changes to completed
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'completed' THEN
    UPDATE playbook_executions
    SET 
      completed_steps = completed_steps + 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.execution_id;
    
    -- Check if all steps are completed and mark execution as completed
    UPDATE playbook_executions
    SET 
      status = 'completed',
      completed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.execution_id
      AND completed_steps >= total_steps
      AND status = 'in_progress';
  END IF;
  
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_monthly_review_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update next_review_due_date when last_review_date changes
  IF NEW.last_review_date IS NOT NULL AND 
     (OLD.last_review_date IS DISTINCT FROM NEW.last_review_date) THEN
    NEW.next_review_due_date := NEW.last_review_date + INTERVAL '1 month';
    NEW.monthly_review_status := 'completed';
  ELSIF NEW.next_review_due_date IS NULL AND NEW.last_review_date IS NULL THEN
    -- First time: set next review to 1 month from now
    NEW.next_review_due_date := CURRENT_DATE + INTERVAL '1 month';
  END IF;
  
  -- Update monthly_review_status based on next_review_due_date
  IF NEW.next_review_due_date IS NOT NULL THEN
    IF NEW.next_review_due_date < CURRENT_DATE THEN
      NEW.monthly_review_status := 'overdue';
    ELSIF NEW.next_review_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN
      IF NEW.monthly_review_status = 'completed' THEN
        -- Keep completed status
      ELSE
        NEW.monthly_review_status := 'pending';
      END IF;
    END IF;
  END IF;
  
  -- Check if risk exceeds financial threshold
  IF NEW.financial_threshold IS NOT NULL AND NEW.financial_impact IS NOT NULL THEN
    NEW.exceeds_threshold := NEW.financial_impact >= NEW.financial_threshold;
  END IF;
  
  -- Normalize risk_level: trim whitespace and convert to lowercase for comparison
  IF NEW.risk_level IS NOT NULL THEN
    NEW.risk_level := TRIM(LOWER(NEW.risk_level));
  END IF;
  
  -- Update risk_level based on flags (only if not explicitly set or if flags require override)
  -- Only override if user hasn't explicitly set a value, or if flags require a higher level
  -- Handle NULL, empty string, or invalid values
  IF NEW.risk_level IS NULL OR NEW.risk_level = '' OR NEW.risk_level NOT IN ('project', 'program', 'portfolio', 'systemic') THEN
    -- No explicit valid value set - determine from flags
    IF NEW.systemic_risk = TRUE THEN
      NEW.risk_level := 'systemic';
    ELSIF NEW.cross_program = TRUE THEN
      NEW.risk_level := 'portfolio';
    ELSIF NEW.program_id IS NOT NULL THEN
      NEW.risk_level := 'program';
    ELSE
      NEW.risk_level := 'project';
    END IF;
  ELSE
    -- User has explicitly set a valid risk_level - only override if flags require higher level
    -- Don't downgrade, only upgrade based on flags
    IF NEW.systemic_risk = TRUE AND NEW.risk_level != 'systemic' THEN
      NEW.risk_level := 'systemic';
    ELSIF NEW.cross_program = TRUE AND NEW.risk_level NOT IN ('systemic', 'portfolio') THEN
      NEW.risk_level := 'portfolio';
    ELSIF NEW.program_id IS NOT NULL AND NEW.risk_level NOT IN ('systemic', 'portfolio', 'program') THEN
      NEW.risk_level := 'program';
    END IF;
  END IF;
  
  -- Update updated_at timestamp
  NEW.updated_at := NOW();
  IF NEW.last_updated_date IS DISTINCT FROM CURRENT_DATE THEN
    NEW.last_updated_date := CURRENT_DATE;
  END IF;
  
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_pipeline_executions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_playbook_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_pmbok6_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_portfolio_kpis_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_portfolio_ksf_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_program_financial_metrics(p_program_id uuid, p_analysis_date date DEFAULT CURRENT_DATE)
 RETURNS program_financial_analysis
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_analysis program_financial_analysis;
  v_total_cost DECIMAL;
  v_total_benefits DECIMAL;
  v_realized_benefits DECIMAL;
BEGIN
  -- Get cost data
  SELECT 
    COALESCE(SUM(actual_cost), 0),
    COALESCE(SUM(budget) - SUM(actual_cost), 0)
  INTO v_total_cost, v_analysis.remaining_costs
  FROM projects
  WHERE program_id = p_program_id AND archived = false;
  
  -- Get benefit data
  SELECT 
    COALESCE(SUM(expected_value), 0),
    COALESCE(SUM(realized_value), 0)
  INTO v_total_benefits, v_realized_benefits
  FROM program_benefits
  WHERE program_id = p_program_id;
  
  -- Initialize record
  v_analysis.program_id := p_program_id;
  v_analysis.analysis_date := p_analysis_date;
  v_analysis.analysis_type := 'periodic';
  v_analysis.total_investment := v_total_cost;
  v_analysis.total_expected_benefits := v_total_benefits;
  v_analysis.realized_benefits := v_realized_benefits;
  
  -- Calculate metrics
  v_analysis.roi_percent := calculate_roi(p_program_id);
  v_analysis.npv := calculate_npv(p_program_id, 8.0, 5);
  v_analysis.payback_period_months := calculate_payback_period(p_program_id);
  
  -- Benefit-cost ratio
  IF v_total_cost > 0 THEN
    v_analysis.benefit_cost_ratio := ROUND((v_total_benefits / v_total_cost)::numeric, 4);
  ELSE
    v_analysis.benefit_cost_ratio := 0;
  END IF;
  
  -- Recommendation
  v_analysis.continue_recommendation := (
    v_analysis.roi_percent > 0 AND 
    v_analysis.npv > 0 AND 
    v_analysis.benefit_cost_ratio > 1.0
  );
  
  v_analysis.created_at := NOW();
  v_analysis.updated_at := NOW();
  
  RETURN v_analysis;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_project_context_items_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_project_cost_breakdown(p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_internal_labor_cost DECIMAL;
  v_internal_labor_hours DECIMAL;
  v_external_labor_cost DECIMAL;
  v_external_labor_hours DECIMAL;
  v_cloud_cost DECIMAL;
  v_ai_cost DECIMAL;
  v_software_cost DECIMAL;
  v_equipment_cost DECIMAL;
  v_materials_cost DECIMAL;
  v_overhead_cost DECIMAL;
BEGIN
  -- Calculate internal labor
  SELECT 
    COALESCE(SUM(te.total_cost), 0),
    COALESCE(SUM(te.hours_worked), 0)
  INTO v_internal_labor_cost, v_internal_labor_hours
  FROM time_entries te
  JOIN project_resource_assignments pra ON te.assignment_id = pra.id
  JOIN project_roles pr ON pra.role_id = pr.id
  WHERE te.project_id = p_project_id
    AND te.status = 'approved'
    AND pr.role_type = 'internal';
  
  -- Calculate external labor (contractors, consultants)
  SELECT 
    COALESCE(SUM(te.total_cost), 0),
    COALESCE(SUM(te.hours_worked), 0)
  INTO v_external_labor_cost, v_external_labor_hours
  FROM time_entries te
  JOIN project_resource_assignments pra ON te.assignment_id = pra.id
  JOIN project_roles pr ON pra.role_id = pr.id
  WHERE te.project_id = p_project_id
    AND te.status = 'approved'
    AND pr.role_type IN ('external', 'contractor');
  
  -- Calculate non-labor costs from expenses
  SELECT COALESCE(SUM(amount), 0)
  INTO v_cloud_cost
  FROM project_expenses pe
  JOIN cost_categories cc ON pe.cost_category_id = cc.id
  WHERE pe.project_id = p_project_id
    AND pe.status = 'approved'
    AND cc.category_code = 'CLOUD_INFRA';
  
  SELECT COALESCE(SUM(amount), 0)
  INTO v_ai_cost
  FROM project_expenses pe
  JOIN cost_categories cc ON pe.cost_category_id = cc.id
  WHERE pe.project_id = p_project_id
    AND pe.status = 'approved'
    AND cc.category_code = 'AI_SERVICES';
  
  SELECT COALESCE(SUM(amount), 0)
  INTO v_software_cost
  FROM project_expenses pe
  JOIN cost_categories cc ON pe.cost_category_id = cc.id
  WHERE pe.project_id = p_project_id
    AND pe.status = 'approved'
    AND cc.category_code = 'SOFTWARE';
  
  SELECT COALESCE(SUM(amount), 0)
  INTO v_equipment_cost
  FROM project_expenses pe
  JOIN cost_categories cc ON pe.cost_category_id = cc.id
  WHERE pe.project_id = p_project_id
    AND pe.status = 'approved'
    AND cc.category_code = 'EQUIPMENT';
  
  SELECT COALESCE(SUM(amount), 0)
  INTO v_materials_cost
  FROM project_expenses pe
  JOIN cost_categories cc ON pe.cost_category_id = cc.id
  WHERE pe.project_id = p_project_id
    AND pe.status = 'approved'
    AND cc.category_code = 'MATERIALS';
  
  SELECT COALESCE(SUM(amount), 0)
  INTO v_overhead_cost
  FROM project_expenses pe
  JOIN cost_categories cc ON pe.cost_category_id = cc.id
  WHERE pe.project_id = p_project_id
    AND pe.status = 'approved'
    AND cc.category_code = 'OVERHEAD';
  
  -- Insert or update breakdown
  INSERT INTO project_cost_breakdown (
    project_id,
    internal_labor_cost,
    internal_labor_hours,
    external_labor_cost,
    external_labor_hours,
    total_labor_cost,
    cloud_infrastructure_cost,
    ai_services_cost,
    software_tools_cost,
    equipment_cost,
    materials_cost,
    overhead_cost,
    total_actual_cost,
    last_calculated_at
  ) VALUES (
    p_project_id,
    v_internal_labor_cost,
    v_internal_labor_hours,
    v_external_labor_cost,
    v_external_labor_hours,
    v_internal_labor_cost + v_external_labor_cost,
    v_cloud_cost,
    v_ai_cost,
    v_software_cost,
    v_equipment_cost,
    v_materials_cost,
    v_overhead_cost,
    v_internal_labor_cost + v_external_labor_cost + v_cloud_cost + v_ai_cost + 
    v_software_cost + v_equipment_cost + v_materials_cost + v_overhead_cost,
    NOW()
  )
  ON CONFLICT (project_id) DO UPDATE SET
    internal_labor_cost = EXCLUDED.internal_labor_cost,
    internal_labor_hours = EXCLUDED.internal_labor_hours,
    external_labor_cost = EXCLUDED.external_labor_cost,
    external_labor_hours = EXCLUDED.external_labor_hours,
    total_labor_cost = EXCLUDED.total_labor_cost,
    cloud_infrastructure_cost = EXCLUDED.cloud_infrastructure_cost,
    ai_services_cost = EXCLUDED.ai_services_cost,
    software_tools_cost = EXCLUDED.software_tools_cost,
    equipment_cost = EXCLUDED.equipment_cost,
    materials_cost = EXCLUDED.materials_cost,
    overhead_cost = EXCLUDED.overhead_cost,
    total_actual_cost = EXCLUDED.total_actual_cost,
    last_calculated_at = NOW(),
    updated_at = NOW();
  
  -- Also update projects.actual_cost for rollup
  UPDATE projects
  SET actual_cost = (
    SELECT total_actual_cost FROM project_cost_breakdown WHERE project_id = p_project_id
  ),
  updated_at = NOW()
  WHERE id = p_project_id;
  
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_project_earned_value(p_project_id uuid, p_percent_complete numeric)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE projects
  SET 
    earned_value = (budget * p_percent_complete / 100),
    percent_complete = p_percent_complete,
    updated_at = NOW()
  WHERE id = p_project_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_skills_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_stakeholder_competencies_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_stakeholder_skills_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_task_actuals(p_task_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE project_tasks
  SET 
    actual_hours = (
      SELECT COALESCE(SUM(hours_worked), 0)
      FROM time_entries
      WHERE task_id = p_task_id AND status = 'approved'
    ),
    actual_cost = (
      SELECT COALESCE(SUM(total_cost), 0)
      FROM time_entries
      WHERE task_id = p_task_id AND status = 'approved'
    ),
    hours_variance = actual_hours - COALESCE(estimated_hours, 0),
    cost_variance = actual_cost - COALESCE(estimated_cost, 0),
    updated_at = NOW()
  WHERE id = p_task_id;
  
  -- Update task percent complete based on hours
  UPDATE project_tasks
  SET percent_complete = CASE
    WHEN estimated_hours > 0 THEN 
      LEAST(100, (actual_hours / estimated_hours) * 100)
    ELSE percent_complete
  END
  WHERE id = p_task_id;
  
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_work_items_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_task_assignment_actuals(p_assignment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE task_assignments
  SET 
    actual_hours = (
      SELECT COALESCE(SUM(hours_worked), 0)
      FROM time_entries
      WHERE task_assignment_id = p_assignment_id AND status = 'approved'
    ),
    actual_cost = (
      SELECT COALESCE(SUM(total_cost), 0)
      FROM time_entries
      WHERE task_assignment_id = p_assignment_id AND status = 'approved'
    ),
    hours_variance = actual_hours - planned_hours,
    cost_variance = actual_cost - planned_cost,
    efficiency_percent = CASE
      WHEN actual_hours > 0 THEN (planned_hours / actual_hours) * 100
      ELSE NULL
    END,
    percent_complete = CASE
      WHEN planned_hours > 0 THEN 
        LEAST(100, (actual_hours / planned_hours) * 100)
      ELSE 0
    END
  WHERE id = p_assignment_id;
  
  -- Update status based on completion
  UPDATE task_assignments
  SET status = CASE
    WHEN percent_complete >= 100 THEN 'completed'
    WHEN percent_complete > 0 THEN 'in-progress'
    ELSE 'scheduled'
  END
  WHERE id = p_assignment_id;
  
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_template_improvements_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_template_validation(p_template_id uuid, p_quality_score numeric, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_threshold NUMERIC;
BEGIN
  -- Get quality threshold
  SELECT quality_threshold INTO v_threshold
  FROM templates
  WHERE id = p_template_id;
  
  -- Update validation counts
  UPDATE templates
  SET 
    validation_count = validation_count + 1,
    success_count = CASE 
      WHEN p_quality_score >= v_threshold THEN success_count + 1
      ELSE success_count
    END,
    last_validated_at = NOW(),
    last_validated_by = p_user_id
  WHERE id = p_template_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_variable_resolution_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.uuid_generate_v1()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1$function$
;
CREATE OR REPLACE FUNCTION public.uuid_generate_v1mc()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1mc$function$
;
CREATE OR REPLACE FUNCTION public.uuid_generate_v3(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v3$function$
;
CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v4$function$
;
CREATE OR REPLACE FUNCTION public.uuid_generate_v5(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v5$function$
;
CREATE OR REPLACE FUNCTION public.uuid_nil()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_nil$function$
;
CREATE OR REPLACE FUNCTION public.uuid_ns_dns()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_dns$function$
;
CREATE OR REPLACE FUNCTION public.uuid_ns_oid()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_oid$function$
;
CREATE OR REPLACE FUNCTION public.uuid_ns_url()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_url$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_recv(internal, oid, integer)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_recv$function$
;
CREATE OR REPLACE FUNCTION public.uuid_ns_x500()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_x500$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_send(halfvec)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_send$function$
;
CREATE OR REPLACE FUNCTION public.l2_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l2_distance$function$
;
CREATE OR REPLACE FUNCTION public.inner_product(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_inner_product$function$
;
CREATE OR REPLACE FUNCTION public.cosine_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_cosine_distance$function$
;
CREATE OR REPLACE FUNCTION public.l1_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l1_distance$function$
;
CREATE OR REPLACE FUNCTION public.vector_dims(halfvec)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_vector_dims$function$
;
CREATE OR REPLACE FUNCTION public.l2_norm(halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l2_norm$function$
;
CREATE OR REPLACE FUNCTION public.l2_normalize(halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l2_normalize$function$
;
CREATE OR REPLACE FUNCTION public.binary_quantize(halfvec)
 RETURNS bit
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_binary_quantize$function$
;
CREATE OR REPLACE FUNCTION public.subvector(halfvec, integer, integer)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_subvector$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_add(halfvec, halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_add$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_sub(halfvec, halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_sub$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_mul(halfvec, halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_mul$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_concat(halfvec, halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_concat$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_lt(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_lt$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_le(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_le$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_eq(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_eq$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_ne(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_ne$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_ge(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_ge$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_gt(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_gt$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_cmp(halfvec, halfvec)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_cmp$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_l2_squared_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l2_squared_distance$function$
;
CREATE OR REPLACE FUNCTION public.vector_ge(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_ge$function$
;
CREATE OR REPLACE FUNCTION public.vector_sub(vector, vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_sub$function$
;
CREATE OR REPLACE FUNCTION public.vector_mul(vector, vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_mul$function$
;
CREATE OR REPLACE FUNCTION public.vector_concat(vector, vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_concat$function$
;
CREATE OR REPLACE FUNCTION public.vector_lt(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_lt$function$
;
CREATE OR REPLACE FUNCTION public.vector_le(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_le$function$
;
CREATE OR REPLACE FUNCTION public.vector_eq(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_eq$function$
;
CREATE OR REPLACE FUNCTION public.vector_ne(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_ne$function$
;
CREATE OR REPLACE FUNCTION public.vector_gt(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_gt$function$
;
CREATE OR REPLACE FUNCTION public.vector_cmp(vector, vector)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_cmp$function$
;
CREATE OR REPLACE FUNCTION public.vector_l2_squared_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_l2_squared_distance$function$
;
CREATE OR REPLACE FUNCTION public.vector_negative_inner_product(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_negative_inner_product$function$
;
CREATE OR REPLACE FUNCTION public.vector_spherical_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_spherical_distance$function$
;
CREATE OR REPLACE FUNCTION public.vector_accum(double precision[], vector)
 RETURNS double precision[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_accum$function$
;
CREATE OR REPLACE FUNCTION public.vector_avg(double precision[])
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_avg$function$
;
CREATE OR REPLACE FUNCTION public.vector_combine(double precision[], double precision[])
 RETURNS double precision[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_combine$function$
;
CREATE OR REPLACE FUNCTION public.vector(vector, integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector$function$
;
CREATE OR REPLACE FUNCTION public.array_to_vector(integer[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$
;
CREATE OR REPLACE FUNCTION public.array_to_vector(real[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$
;
CREATE OR REPLACE FUNCTION public.array_to_vector(double precision[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$
;
CREATE OR REPLACE FUNCTION public.array_to_vector(numeric[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$
;
CREATE OR REPLACE FUNCTION public.vector_to_float4(vector, integer, boolean)
 RETURNS real[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_to_float4$function$
;
CREATE OR REPLACE FUNCTION public.ivfflathandler(internal)
 RETURNS index_am_handler
 LANGUAGE c
AS '$libdir/vector', $function$ivfflathandler$function$
;
CREATE OR REPLACE FUNCTION public.hnswhandler(internal)
 RETURNS index_am_handler
 LANGUAGE c
AS '$libdir/vector', $function$hnswhandler$function$
;
CREATE OR REPLACE FUNCTION public.ivfflat_halfvec_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$ivfflat_halfvec_support$function$
;
CREATE OR REPLACE FUNCTION public.ivfflat_bit_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$ivfflat_bit_support$function$
;
CREATE OR REPLACE FUNCTION public.hnsw_halfvec_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$hnsw_halfvec_support$function$
;
CREATE OR REPLACE FUNCTION public.hnsw_bit_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$hnsw_bit_support$function$
;
CREATE OR REPLACE FUNCTION public.hnsw_sparsevec_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$hnsw_sparsevec_support$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_in(cstring, oid, integer)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_in$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_out(halfvec)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_out$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_typmod_in(cstring[])
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_typmod_in$function$
;
CREATE OR REPLACE FUNCTION public.vector_in(cstring, oid, integer)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_in$function$
;
CREATE OR REPLACE FUNCTION public.vector_out(vector)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_out$function$
;
CREATE OR REPLACE FUNCTION public.vector_typmod_in(cstring[])
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_typmod_in$function$
;
CREATE OR REPLACE FUNCTION public.vector_recv(internal, oid, integer)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_recv$function$
;
CREATE OR REPLACE FUNCTION public.vector_send(vector)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_send$function$
;
CREATE OR REPLACE FUNCTION public.l2_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$l2_distance$function$
;
CREATE OR REPLACE FUNCTION public.inner_product(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$inner_product$function$
;
CREATE OR REPLACE FUNCTION public.cosine_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$cosine_distance$function$
;
CREATE OR REPLACE FUNCTION public.l1_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$l1_distance$function$
;
CREATE OR REPLACE FUNCTION public.vector_dims(vector)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_dims$function$
;
CREATE OR REPLACE FUNCTION public.vector_norm(vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_norm$function$
;
CREATE OR REPLACE FUNCTION public.l2_normalize(vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$l2_normalize$function$
;
CREATE OR REPLACE FUNCTION public.binary_quantize(vector)
 RETURNS bit
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$binary_quantize$function$
;
CREATE OR REPLACE FUNCTION public.subvector(vector, integer, integer)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$subvector$function$
;
CREATE OR REPLACE FUNCTION public.vector_add(vector, vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_add$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_negative_inner_product(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_negative_inner_product$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_spherical_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_spherical_distance$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_accum(double precision[], halfvec)
 RETURNS double precision[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_accum$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_avg(double precision[])
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_avg$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_combine(double precision[], double precision[])
 RETURNS double precision[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_combine$function$
;
CREATE OR REPLACE FUNCTION public.halfvec(halfvec, integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_to_vector(halfvec, integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_to_vector$function$
;
CREATE OR REPLACE FUNCTION public.vector_to_halfvec(vector, integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_to_halfvec$function$
;
CREATE OR REPLACE FUNCTION public.array_to_halfvec(integer[], integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_halfvec$function$
;
CREATE OR REPLACE FUNCTION public.array_to_halfvec(real[], integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_halfvec$function$
;
CREATE OR REPLACE FUNCTION public.array_to_halfvec(double precision[], integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_halfvec$function$
;
CREATE OR REPLACE FUNCTION public.array_to_halfvec(numeric[], integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_halfvec$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_to_float4(halfvec, integer, boolean)
 RETURNS real[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_to_float4$function$
;
CREATE OR REPLACE FUNCTION public.hamming_distance(bit, bit)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$hamming_distance$function$
;
CREATE OR REPLACE FUNCTION public.jaccard_distance(bit, bit)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$jaccard_distance$function$
;
CREATE OR REPLACE FUNCTION public.sparsevec_in(cstring, oid, integer)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_in$function$
;
CREATE OR REPLACE FUNCTION public.sparsevec_out(sparsevec)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_out$function$
;
CREATE OR REPLACE FUNCTION public.sparsevec_typmod_in(cstring[])
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_typmod_in$function$
;
CREATE OR REPLACE FUNCTION public.sparsevec_recv(internal, oid, integer)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_recv$function$
;
CREATE OR REPLACE FUNCTION public.sparsevec_send(sparsevec)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_send$function$
;
CREATE OR REPLACE FUNCTION public.l2_distance(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l2_distance$function$
;
CREATE OR REPLACE FUNCTION public.inner_product(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_inner_product$function$
;
CREATE OR REPLACE FUNCTION public.cosine_distance(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_cosine_distance$function$
;
CREATE OR REPLACE FUNCTION public.l1_distance(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l1_distance$function$
;
CREATE OR REPLACE FUNCTION public.l2_norm(sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l2_norm$function$
;
CREATE OR REPLACE FUNCTION public.l2_normalize(sparsevec)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l2_normalize$function$
;
CREATE OR REPLACE FUNCTION public.sparsevec_lt(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_lt$function$
;
CREATE OR REPLACE FUNCTION public.sparsevec_le(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_le$function$
;
CREATE OR REPLACE FUNCTION public.sparsevec_eq(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_eq$function$
;
CREATE OR REPLACE FUNCTION public.sparsevec_ne(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_ne$function$
;
CREATE OR REPLACE FUNCTION public.sparsevec_ge(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_ge$function$
;
CREATE OR REPLACE FUNCTION public.sparsevec_gt(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_gt$function$
;
CREATE OR REPLACE FUNCTION public.sparsevec_cmp(sparsevec, sparsevec)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_cmp$function$
;
CREATE OR REPLACE FUNCTION public.sparsevec_l2_squared_distance(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l2_squared_distance$function$
;
CREATE OR REPLACE FUNCTION public.sparsevec_negative_inner_product(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_negative_inner_product$function$
;
CREATE OR REPLACE FUNCTION public.sparsevec(sparsevec, integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec$function$
;
CREATE OR REPLACE FUNCTION public.vector_to_sparsevec(vector, integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_to_sparsevec$function$
;
CREATE OR REPLACE FUNCTION public.sparsevec_to_vector(sparsevec, integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_to_vector$function$
;
CREATE OR REPLACE FUNCTION public.halfvec_to_sparsevec(halfvec, integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_to_sparsevec$function$
;
CREATE OR REPLACE FUNCTION public.sparsevec_to_halfvec(sparsevec, integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_to_halfvec$function$
;
CREATE OR REPLACE FUNCTION public.array_to_sparsevec(integer[], integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_sparsevec$function$
;
CREATE OR REPLACE FUNCTION public.array_to_sparsevec(real[], integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_sparsevec$function$
;
CREATE OR REPLACE FUNCTION public.array_to_sparsevec(double precision[], integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_sparsevec$function$
;
CREATE OR REPLACE FUNCTION public.array_to_sparsevec(numeric[], integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_sparsevec$function$
;

-- Views
CREATE OR REPLACE VIEW public."recent_rag_errors" AS
 SELECT id,
    operation_type,
    document_id,
    error_message,
    error_type,
    duration_ms,
    metadata,
    created_at
   FROM rag_analytics
  WHERE ((success = false) AND (created_at >= (now() - '7 days'::interval)))
  ORDER BY created_at DESC
 LIMIT 100;;
CREATE OR REPLACE VIEW public."quantum_stability_dashboard" AS
 SELECT qubit_id,
    state,
    coherence,
    temperature,
    noise_level,
    stability,
    infrared_spectrum,
    last_measurement,
        CASE
            WHEN ((coherence > (90)::numeric) AND (temperature < 0.015) AND (noise_level < (10)::numeric)) THEN 'STABLE'::text
            WHEN ((coherence > (80)::numeric) AND (temperature < 0.025) AND (noise_level < (20)::numeric)) THEN 'WARNING'::text
            ELSE 'CRITICAL'::text
        END AS stability_status,
    (((coherence * stability) * ((100)::numeric - noise_level)) / (10000)::numeric) AS overall_health_score
   FROM qubit_states qs
  ORDER BY coherence DESC, stability DESC;;
CREATE OR REPLACE VIEW public."v_dynamics365_guides_sync" AS
 SELECT d.id AS document_id,
    d.title AS document_title,
    d.project_id,
    p.name AS project_name,
    di.external_id AS guide_id,
    di.external_url AS guide_url,
    di.synced_at,
    di.sync_status,
    di.sync_version,
    di.metadata,
    u.email AS synced_by_email
   FROM (((documents d
     LEFT JOIN document_integrations di ON (((d.id = di.document_id) AND ((di.integration_type)::text = 'dynamics365_guides'::text))))
     LEFT JOIN projects p ON ((d.project_id = p.id)))
     LEFT JOIN users u ON ((di.synced_by = u.id)));;
CREATE OR REPLACE VIEW public."document_entity_counts" AS
 SELECT id AS document_id,
    project_id,
    template_id,
    COALESCE(((entity_counts ->> 'total'::text))::integer, 0) AS total_entities,
    entity_counts
   FROM documents d;;
CREATE OR REPLACE VIEW public."aggregated_template_entity_view" AS
 SELECT template_id,
    count(*) AS total_documents,
    sum(total_entities) AS total_entities,
    COALESCE(( SELECT jsonb_object_agg(s.key, s.avg_value) AS jsonb_object_agg
           FROM ( SELECT jsonb_each_text.key,
                    avg((jsonb_each_text.value)::numeric) AS avg_value
                   FROM document_entity_counts d2,
                    LATERAL jsonb_each_text(d2.entity_counts) jsonb_each_text(key, value)
                  WHERE ((d2.template_id = "dec".template_id) AND (jsonb_each_text.key <> 'total'::text))
                  GROUP BY jsonb_each_text.key) s), '{}'::jsonb) AS avg_entity_counts
   FROM document_entity_counts "dec"
  WHERE (template_id IS NOT NULL)
  GROUP BY template_id;;
CREATE OR REPLACE VIEW public."checklist_resource_utilization" AS
 SELECT ci.assigned_user_id AS user_id,
    u.name AS user_name,
    u.email AS user_email,
    pt.project_id,
    p.name AS project_name,
    p.program_id,
    ci.task_id,
    pt.task_name,
    ci.id AS checklist_item_id,
    ci.item_name,
    COALESCE(ci.estimated_hours, (0)::numeric) AS estimated_hours,
    COALESCE(ci.actual_hours, (0)::numeric) AS actual_hours,
    ci.is_completed,
    ci.priority,
    ci.due_date,
    (COALESCE(ci.actual_hours, (0)::numeric) - COALESCE(ci.estimated_hours, (0)::numeric)) AS hours_variance
   FROM (((checklist_items ci
     JOIN users u ON ((ci.assigned_user_id = u.id)))
     JOIN project_tasks pt ON ((ci.task_id = pt.id)))
     JOIN projects p ON ((pt.project_id = p.id)))
  WHERE (ci.assigned_user_id IS NOT NULL);;
CREATE OR REPLACE VIEW public."documents_active" AS
 SELECT d.id,
    d.project_id,
    d.name,
    d.content,
    d.template_id,
    d.version,
    d.status,
    d.file_path,
    d.file_size,
    d.mime_type,
    d.framework,
    d.metadata,
    d.created_by,
    d.updated_by,
    d.created_at,
    d.updated_at,
    d.sharepoint_file_id,
    d.sharepoint_drive_id,
    d.sharepoint_site_id,
    d.web_url,
    d.word_count,
    d.character_count,
    d.compression_ratio,
    d.original_size,
    d.compressed_size,
    d.processing_time,
    d.ai_model,
    d.input_tokens,
    d.output_tokens,
    d.tags,
    d.source_documents,
    d.comments,
    d.author,
    d.title,
    d.template_version,
    d.template_author,
    d.template_framework,
    d.template_category,
    d.template_complexity,
    d.template_metadata,
    d.generation_metadata,
    d.parent_document_id,
    d.compression_stats,
    d.deleted_at,
    d.deleted_by,
    u.name AS author_name,
    u.email AS author_email,
    t.name AS template_name,
    t.framework AS template_framework_name,
    p.name AS project_name
   FROM (((documents d
     LEFT JOIN users u ON ((d.created_by = u.id)))
     LEFT JOIN templates t ON ((d.template_id = t.id)))
     LEFT JOIN projects p ON ((d.project_id = p.id)))
  WHERE (d.deleted_at IS NULL);;
CREATE OR REPLACE VIEW public."documents_deleted" AS
 SELECT d.id,
    d.project_id,
    d.name,
    d.content,
    d.template_id,
    d.version,
    d.status,
    d.file_path,
    d.file_size,
    d.mime_type,
    d.framework,
    d.metadata,
    d.created_by,
    d.updated_by,
    d.created_at,
    d.updated_at,
    d.sharepoint_file_id,
    d.sharepoint_drive_id,
    d.sharepoint_site_id,
    d.web_url,
    d.word_count,
    d.character_count,
    d.compression_ratio,
    d.original_size,
    d.compressed_size,
    d.processing_time,
    d.ai_model,
    d.input_tokens,
    d.output_tokens,
    d.tags,
    d.source_documents,
    d.comments,
    d.author,
    d.title,
    d.template_version,
    d.template_author,
    d.template_framework,
    d.template_category,
    d.template_complexity,
    d.template_metadata,
    d.generation_metadata,
    d.parent_document_id,
    d.compression_stats,
    d.deleted_at,
    d.deleted_by,
    (EXTRACT(epoch FROM (now() - d.deleted_at)) / (3600)::numeric) AS deleted_age_hours,
    u.name AS author_name,
    u.email AS author_email,
    du.name AS deleted_by_name,
    du.email AS deleted_by_email,
    t.name AS template_name,
    t.framework AS template_framework_name,
    p.name AS project_name
   FROM ((((documents d
     LEFT JOIN users u ON ((d.created_by = u.id)))
     LEFT JOIN users du ON ((d.deleted_by = du.id)))
     LEFT JOIN templates t ON ((d.template_id = t.id)))
     LEFT JOIN projects p ON ((d.project_id = p.id)))
  WHERE (d.deleted_at IS NOT NULL);;
CREATE OR REPLACE VIEW public."project_resource_summary" AS
 SELECT p.id AS project_id,
    p.name AS project_name,
    p.program_id,
    u.id AS user_id,
    u.name AS user_name,
    COALESCE(sum(ta.planned_hours), (0)::numeric) AS task_planned_hours,
    COALESCE(sum(ta.actual_hours), (0)::numeric) AS task_actual_hours,
    COALESCE(sum(ci.estimated_hours), (0)::numeric) AS checklist_estimated_hours,
    COALESCE(sum(ci.actual_hours), (0)::numeric) AS checklist_actual_hours,
    (COALESCE(sum(ta.planned_hours), (0)::numeric) + COALESCE(sum(ci.estimated_hours), (0)::numeric)) AS total_planned_hours,
    (COALESCE(sum(ta.actual_hours), (0)::numeric) + COALESCE(sum(ci.actual_hours), (0)::numeric)) AS total_actual_hours,
    count(DISTINCT ta.task_id) AS assigned_tasks,
    count(DISTINCT ci.id) AS assigned_checklist_items
   FROM ((((projects p
     CROSS JOIN users u)
     LEFT JOIN project_tasks pt ON ((p.id = pt.project_id)))
     LEFT JOIN task_assignments ta ON (((pt.id = ta.task_id) AND (ta.user_id = u.id) AND ((ta.status)::text <> 'cancelled'::text))))
     LEFT JOIN checklist_items ci ON (((pt.id = ci.task_id) AND (ci.assigned_user_id = u.id))))
  WHERE ((ta.id IS NOT NULL) OR (ci.id IS NOT NULL))
  GROUP BY p.id, p.name, p.program_id, u.id, u.name;;
CREATE OR REPLACE VIEW public."portfolio_resource_utilization" AS
 WITH user_capacity AS (
         SELECT u.id AS user_id,
            u.name AS user_name,
            u.email AS user_email,
            COALESCE(rcs.contracted_hours_per_week, (40)::numeric) AS weekly_hours,
            COALESCE(rcs.target_utilization_percent, (80)::numeric) AS target_percent,
            COALESCE(rcs.max_allocation_percent, (100)::numeric) AS max_percent,
            COALESCE(rcs.resource_type, 'full-time'::character varying) AS resource_type
           FROM (users u
             LEFT JOIN resource_capacity_settings rcs ON (((u.id = rcs.user_id) AND (rcs.is_active = true) AND (CURRENT_DATE >= rcs.effective_from) AND ((rcs.effective_until IS NULL) OR (CURRENT_DATE <= rcs.effective_until)))))
        ), user_allocations AS (
         SELECT project_resource_summary.user_id,
            sum(project_resource_summary.total_planned_hours) AS total_planned_hours,
            sum(project_resource_summary.total_actual_hours) AS total_actual_hours,
            count(DISTINCT project_resource_summary.project_id) AS projects_count
           FROM project_resource_summary
          GROUP BY project_resource_summary.user_id
        ), user_unavailability AS (
         SELECT resource_unavailability.user_id,
            sum(resource_unavailability.hours_unavailable) AS total_unavailable_hours
           FROM resource_unavailability
          WHERE (((resource_unavailability.status)::text = 'approved'::text) AND (resource_unavailability.start_date <= (CURRENT_DATE + '30 days'::interval)) AND (resource_unavailability.end_date >= CURRENT_DATE))
          GROUP BY resource_unavailability.user_id
        )
 SELECT uc.user_id,
    uc.user_name,
    uc.user_email,
    uc.resource_type,
    uc.weekly_hours AS contracted_weekly_hours,
    (uc.weekly_hours * (4)::numeric) AS monthly_capacity_hours,
    uc.target_percent AS target_utilization_percent,
    uc.max_percent AS max_allocation_percent,
    COALESCE(ua.total_planned_hours, (0)::numeric) AS total_planned_hours,
    COALESCE(ua.total_actual_hours, (0)::numeric) AS total_actual_hours,
    COALESCE(ua.projects_count, (0)::bigint) AS projects_assigned,
    COALESCE(uu.total_unavailable_hours, (0)::numeric) AS unavailable_hours_next_30_days,
    ((uc.weekly_hours * (4)::numeric) - COALESCE(uu.total_unavailable_hours, (0)::numeric)) AS available_capacity_hours,
        CASE
            WHEN (uc.weekly_hours > (0)::numeric) THEN round(((COALESCE(ua.total_planned_hours, (0)::numeric) / (uc.weekly_hours * (4)::numeric)) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS planned_utilization_percent,
        CASE
            WHEN (uc.weekly_hours > (0)::numeric) THEN round(((COALESCE(ua.total_actual_hours, (0)::numeric) / (uc.weekly_hours * (4)::numeric)) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS actual_utilization_percent,
        CASE
            WHEN (((COALESCE(ua.total_planned_hours, (0)::numeric) / NULLIF((uc.weekly_hours * (4)::numeric), (0)::numeric)) * (100)::numeric) > uc.max_percent) THEN 'OVER_ALLOCATED'::text
            WHEN (((COALESCE(ua.total_planned_hours, (0)::numeric) / NULLIF((uc.weekly_hours * (4)::numeric), (0)::numeric)) * (100)::numeric) > (100)::numeric) THEN 'OVER_100'::text
            WHEN (((COALESCE(ua.total_planned_hours, (0)::numeric) / NULLIF((uc.weekly_hours * (4)::numeric), (0)::numeric)) * (100)::numeric) >= uc.target_percent) THEN 'OPTIMAL'::text
            WHEN (((COALESCE(ua.total_planned_hours, (0)::numeric) / NULLIF((uc.weekly_hours * (4)::numeric), (0)::numeric)) * (100)::numeric) >= (50)::numeric) THEN 'UNDER_TARGET'::text
            WHEN (COALESCE(ua.total_planned_hours, (0)::numeric) > (0)::numeric) THEN 'LOW_UTILIZATION'::text
            ELSE 'UNALLOCATED'::text
        END AS allocation_status,
    ((((uc.weekly_hours * (4)::numeric) * uc.target_percent) / (100)::numeric) - COALESCE(ua.total_planned_hours, (0)::numeric)) AS hours_to_target,
    ((((uc.weekly_hours * (4)::numeric) * uc.max_percent) / (100)::numeric) - COALESCE(ua.total_planned_hours, (0)::numeric)) AS hours_to_max
   FROM ((user_capacity uc
     LEFT JOIN user_allocations ua ON ((uc.user_id = ua.user_id)))
     LEFT JOIN user_unavailability uu ON ((uc.user_id = uu.user_id)));;
CREATE OR REPLACE VIEW public."portfolio_capacity_summary" AS
 SELECT count(*) AS total_resources,
    count(*) FILTER (WHERE ((resource_type)::text = 'full-time'::text)) AS full_time_count,
    count(*) FILTER (WHERE ((resource_type)::text <> 'full-time'::text)) AS other_count,
    COALESCE(sum(contracted_weekly_hours), (0)::numeric) AS total_weekly_capacity,
    COALESCE(sum(monthly_capacity_hours), (0)::numeric) AS total_monthly_capacity,
    COALESCE(sum(available_capacity_hours), (0)::numeric) AS total_available_capacity,
    COALESCE(sum(total_planned_hours), (0)::numeric) AS total_planned_hours,
    COALESCE(sum(total_actual_hours), (0)::numeric) AS total_actual_hours,
    round(avg(planned_utilization_percent), 1) AS avg_utilization_percent,
    round(avg(
        CASE
            WHEN (allocation_status <> 'UNALLOCATED'::text) THEN planned_utilization_percent
            ELSE NULL::numeric
        END), 1) AS avg_active_utilization,
    count(*) FILTER (WHERE (allocation_status = 'OVER_ALLOCATED'::text)) AS over_allocated_count,
    count(*) FILTER (WHERE (allocation_status = 'OVER_100'::text)) AS over_100_count,
    count(*) FILTER (WHERE (allocation_status = 'OPTIMAL'::text)) AS optimal_count,
    count(*) FILTER (WHERE (allocation_status = 'UNDER_TARGET'::text)) AS under_target_count,
    count(*) FILTER (WHERE (allocation_status = 'LOW_UTILIZATION'::text)) AS low_utilization_count,
    count(*) FILTER (WHERE (allocation_status = 'UNALLOCATED'::text)) AS unallocated_count,
    round((((count(*) FILTER (WHERE (allocation_status = ANY (ARRAY['OPTIMAL'::text, 'OVER_100'::text, 'OVER_ALLOCATED'::text]))))::numeric / (NULLIF(count(*) FILTER (WHERE (allocation_status <> 'UNALLOCATED'::text)), 0))::numeric) * (100)::numeric), 1) AS target_achievement_percent
   FROM portfolio_resource_utilization;;
CREATE OR REPLACE VIEW public."portfolio_risk_register" AS
 SELECT pr.id,
    pr.portfolio_id,
    pr.risk_title,
    pr.risk_description,
    pr.risk_category,
    pr.risk_status,
    pr.impact_level,
    pr.likelihood_level,
    pr.severity,
    pr.probability_level,
    pr.financial_exposure,
    pr.schedule_impact_days,
    pr.systemic,
    pr.escalation_status,
    pr.escalation_policy_id,
    pr.threshold_breach_reason,
    pr.last_reviewed_at,
    pr.next_review_due,
    pr.review_notes,
    mp.mitigation_plan_count,
    mp.mitigation_completed_count,
    mp.avg_completion_percentage,
    agg.aggregated_financial_impact,
    agg.max_probability_level,
    agg.max_impact_level,
    pr.source_risk_ids
   FROM ((portfolio_risks pr
     LEFT JOIN LATERAL ( SELECT count(*) AS mitigation_plan_count,
            count(*) FILTER (WHERE ((mp_1.status)::text = 'completed'::text)) AS mitigation_completed_count,
            COALESCE(avg(mp_1.completion_percentage), (0)::numeric) AS avg_completion_percentage
           FROM mitigation_plans mp_1
          WHERE ((pr.source_risk_ids IS NOT NULL) AND (mp_1.risk_id = ANY (pr.source_risk_ids)))) mp ON (true))
     LEFT JOIN LATERAL ( SELECT COALESCE(sum(COALESCE(r.financial_impact, (0)::numeric)), pr.financial_exposure) AS aggregated_financial_impact,
            max((r.probability)::text) AS max_probability_level,
            max((r.impact)::text) AS max_impact_level
           FROM risks r
          WHERE ((pr.source_risk_ids IS NOT NULL) AND (r.id = ANY (pr.source_risk_ids)))) agg ON (true));;
CREATE OR REPLACE VIEW public."portfolio_risk_threshold_breaches" AS
 SELECT pr.id AS portfolio_risk_id,
    pr.portfolio_id,
    pr.risk_title,
    pr.severity,
    pr.financial_exposure,
    pr.schedule_impact_days,
    pr.escalation_status,
    pr.threshold_breach_reason,
    rep.name AS policy_name,
    rep.sla_hours,
    rep.notification_channel
   FROM (portfolio_risks pr
     LEFT JOIN risk_escalation_policies rep ON ((rep.id = pr.escalation_policy_id)))
  WHERE ((pr.threshold_breach_reason IS NOT NULL) OR ((pr.escalation_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('acknowledged'::character varying)::text, ('overdue'::character varying)::text])));;
CREATE OR REPLACE VIEW public."program_benefits_summary" AS
 SELECT program_id,
    count(*) AS total_benefits,
    sum(expected_value) AS total_expected,
    sum(realized_value) AS total_realized,
        CASE
            WHEN (sum(expected_value) > (0)::numeric) THEN round(((sum(realized_value) / sum(expected_value)) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS realization_rate,
    count(*) FILTER (WHERE ((status)::text = 'realized'::text)) AS benefits_realized,
    count(*) FILTER (WHERE ((status)::text = 'in-progress'::text)) AS benefits_in_progress,
    count(*) FILTER (WHERE ((status)::text = 'not-achieved'::text)) AS benefits_not_achieved
   FROM program_benefits
  GROUP BY program_id;;
CREATE OR REPLACE VIEW public."program_resource_conflicts" AS
 SELECT resource_id,
    resource_name,
    program_id,
    count(DISTINCT project_id) AS conflicting_projects,
    sum(allocation_percentage) AS total_allocation,
        CASE
            WHEN (sum(allocation_percentage) > (100)::numeric) THEN 'over-allocated'::text
            WHEN (sum(allocation_percentage) > (90)::numeric) THEN 'near-capacity'::text
            ELSE 'ok'::text
        END AS conflict_severity,
    array_agg(DISTINCT project_id) FILTER (WHERE (project_id IS NOT NULL)) AS project_ids,
    min(allocation_start) AS earliest_allocation,
    max(COALESCE(allocation_end, '9999-12-31'::date)) AS latest_allocation
   FROM program_resource_allocations r
  WHERE (((allocation_status)::text = ANY (ARRAY[('planned'::character varying)::text, ('active'::character varying)::text])) AND ((CURRENT_DATE >= allocation_start) AND (CURRENT_DATE <= COALESCE(allocation_end, '9999-12-31'::date))))
  GROUP BY resource_id, resource_name, program_id
 HAVING (sum(allocation_percentage) > (90)::numeric);;
CREATE OR REPLACE VIEW public."program_resource_demand" AS
 SELECT program_id,
    resource_type,
    sum(required_quantity) AS total_demand,
    min(needed_from) AS earliest_need,
    max(needed_until) AS latest_need,
    count(*) AS requirement_count
   FROM program_resource_plan
  WHERE ((planning_status)::text = ANY (ARRAY[('requested'::character varying)::text, ('approved'::character varying)::text, ('allocated'::character varying)::text]))
  GROUP BY program_id, resource_type;;
CREATE OR REPLACE VIEW public."program_resource_summary" AS
 SELECT prog.id AS program_id,
    prog.name AS program_name,
    u.id AS user_id,
    u.name AS user_name,
    COALESCE(sum(prs.total_planned_hours), (0)::numeric) AS total_planned_hours,
    COALESCE(sum(prs.total_actual_hours), (0)::numeric) AS total_actual_hours,
    count(DISTINCT prs.project_id) AS projects_assigned,
    sum(prs.assigned_tasks) AS total_tasks,
    sum(prs.assigned_checklist_items) AS total_checklist_items,
    COALESCE(sum(pra.allocated_amount), (0)::numeric) AS program_allocated_hours
   FROM (((programs prog
     CROSS JOIN users u)
     LEFT JOIN project_resource_summary prs ON (((prog.id = prs.program_id) AND (u.id = prs.user_id))))
     LEFT JOIN program_resource_allocations pra ON (((prog.id = pra.program_id) AND ((pra.resource_type)::text = 'human'::text) AND ((pra.allocation_status)::text <> ALL (ARRAY[('cancelled'::character varying)::text, ('released'::character varying)::text])) AND (((pra.resource_id)::text = (u.id)::text) OR ((pra.resource_name)::text = (u.name)::text)))))
  WHERE (prs.user_id IS NOT NULL)
  GROUP BY prog.id, prog.name, u.id, u.name;;
CREATE OR REPLACE VIEW public."program_resource_utilization_summary" AS
 SELECT program_id,
    avg(utilization_rate) AS avg_utilization,
    count(*) FILTER (WHERE (utilization_rate > (90)::numeric)) AS over_utilized_count,
    count(*) FILTER (WHERE (utilization_rate < (50)::numeric)) AS under_utilized_count,
    count(*) FILTER (WHERE ((utilization_rate >= (75)::numeric) AND (utilization_rate <= (85)::numeric))) AS optimal_count,
    count(*) AS total_resources,
        CASE
            WHEN ((avg(utilization_rate) >= (75)::numeric) AND (avg(utilization_rate) <= (85)::numeric)) THEN 'Efficient'::text
            WHEN (avg(utilization_rate) > (90)::numeric) THEN 'Over-utilized'::text
            WHEN (avg(utilization_rate) < (60)::numeric) THEN 'Under-utilized'::text
            ELSE 'Acceptable'::text
        END AS utilization_status
   FROM program_resource_performance
  WHERE (reporting_period = date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))
  GROUP BY program_id;;
CREATE OR REPLACE VIEW public."program_skills_gap" AS
 SELECT rp.program_id,
    t.skill_name,
    sum(rp.required_quantity) AS required_count,
    count(DISTINCT si.user_id) FILTER (WHERE ((si.proficiency_level)::text = ANY (ARRAY[('advanced'::character varying)::text, ('expert'::character varying)::text]))) AS available_experts,
    count(DISTINCT si.user_id) FILTER (WHERE ((si.proficiency_level)::text = ANY (ARRAY[('intermediate'::character varying)::text, ('advanced'::character varying)::text, ('expert'::character varying)::text]))) AS available_resources,
        CASE
            WHEN ((count(DISTINCT si.user_id) FILTER (WHERE ((si.proficiency_level)::text = ANY (ARRAY[('advanced'::character varying)::text, ('expert'::character varying)::text]))))::numeric >= sum(rp.required_quantity)) THEN 'met'::text
            WHEN (count(DISTINCT si.user_id) FILTER (WHERE ((si.proficiency_level)::text = ANY (ARRAY[('intermediate'::character varying)::text, ('advanced'::character varying)::text, ('expert'::character varying)::text]))) > 0) THEN 'partial'::text
            ELSE 'gap'::text
        END AS gap_status
   FROM ((program_resource_plan rp
     CROSS JOIN LATERAL unnest(rp.required_skills) t(skill_name))
     LEFT JOIN program_skills_inventory si ON (((si.program_id = rp.program_id) AND ((si.skill_name)::text = t.skill_name))))
  WHERE (((rp.resource_type)::text = 'human'::text) AND ((rp.planning_status)::text = ANY (ARRAY[('requested'::character varying)::text, ('approved'::character varying)::text, ('allocated'::character varying)::text])))
  GROUP BY rp.program_id, t.skill_name;;
CREATE OR REPLACE VIEW public."project_priority_rankings" AS
 SELECT p.id AS project_id,
    p.name AS project_name,
    p.program_id,
    pr.name AS program_name,
    COALESCE(sum(ps.weighted_score), (0)::numeric) AS total_score,
    row_number() OVER (PARTITION BY p.program_id ORDER BY COALESCE(sum(ps.weighted_score), (0)::numeric) DESC) AS rank,
        CASE
            WHEN (COALESCE(sum(ps.weighted_score), (0)::numeric) >= 4.0) THEN 'Critical'::text
            WHEN (COALESCE(sum(ps.weighted_score), (0)::numeric) >= 3.0) THEN 'High'::text
            WHEN (COALESCE(sum(ps.weighted_score), (0)::numeric) >= 2.0) THEN 'Medium'::text
            ELSE 'Low'::text
        END AS priority_tier,
    count(ps.id) AS criteria_count,
    max(ps.scored_at) AS last_scored_at
   FROM ((projects p
     LEFT JOIN programs pr ON ((p.program_id = pr.id)))
     LEFT JOIN project_priority_scores ps ON ((p.id = ps.project_id)))
  GROUP BY p.id, p.name, p.program_id, pr.name;;
CREATE OR REPLACE VIEW public."resource_workload" AS
 SELECT u.id AS user_id,
    u.name AS user_name,
    u.email,
    pr.role_name,
    p.id AS project_id,
    p.name AS project_name,
    count(DISTINCT ta.task_id) AS tasks_assigned,
    COALESCE(sum(ta.planned_hours), (0)::numeric) AS total_planned_hours,
    COALESCE(sum(ta.planned_cost), (0)::numeric) AS total_planned_cost,
    COALESCE(sum(ta.actual_hours), (0)::numeric) AS total_actual_hours,
    COALESCE(sum(ta.actual_cost), (0)::numeric) AS total_actual_cost,
        CASE
            WHEN (sum(ta.actual_hours) > (0)::numeric) THEN round(((sum(ta.planned_hours) / sum(ta.actual_hours)) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS efficiency_percent,
    pra.allocation_percentage,
    pra.estimated_hours AS total_budgeted_hours,
    (pra.estimated_hours - COALESCE(sum(ta.planned_hours), (0)::numeric)) AS remaining_budget_hours
   FROM ((((users u
     JOIN project_resource_assignments pra ON ((u.id = pra.user_id)))
     JOIN projects p ON ((pra.project_id = p.id)))
     JOIN project_roles pr ON ((pra.role_id = pr.id)))
     LEFT JOIN task_assignments ta ON ((pra.id = ta.resource_assignment_id)))
  WHERE ((pra.status)::text = 'active'::text)
  GROUP BY u.id, u.name, u.email, pr.role_name, p.id, p.name, pra.allocation_percentage, pra.estimated_hours;;
CREATE OR REPLACE VIEW public."review_cadence_compliance" AS
 SELECT rs.id AS schedule_id,
    rs.program_id,
    rs.review_type,
    rs.frequency,
    count(rm.id) AS total_reviews_held,
    count(rm.id) FILTER (WHERE (rm.was_on_time = true)) AS on_time_reviews,
    count(rm.id) FILTER (WHERE ((rm.status)::text = 'completed'::text)) AS completed_reviews,
    max(rm.actual_date) AS last_review_date,
        CASE
            WHEN (((rs.frequency)::text = 'monthly'::text) AND (max(rm.actual_date) IS NOT NULL)) THEN (max(rm.actual_date) + '1 mon'::interval)
            WHEN (((rs.frequency)::text = 'quarterly'::text) AND (max(rm.actual_date) IS NOT NULL)) THEN (max(rm.actual_date) + '3 mons'::interval)
            WHEN (((rs.frequency)::text = 'bi-annually'::text) AND (max(rm.actual_date) IS NOT NULL)) THEN (max(rm.actual_date) + '6 mons'::interval)
            WHEN (((rs.frequency)::text = 'annually'::text) AND (max(rm.actual_date) IS NOT NULL)) THEN (max(rm.actual_date) + '1 year'::interval)
            ELSE NULL::timestamp without time zone
        END AS next_review_due_date,
        CASE
            WHEN (((rs.frequency)::text = 'monthly'::text) AND (max(rm.actual_date) < ((now())::date - '1 mon'::interval))) THEN 'overdue'::text
            WHEN (((rs.frequency)::text = 'quarterly'::text) AND (max(rm.actual_date) < ((now())::date - '3 mons'::interval))) THEN 'overdue'::text
            WHEN (((rs.frequency)::text = 'bi-annually'::text) AND (max(rm.actual_date) < ((now())::date - '6 mons'::interval))) THEN 'overdue'::text
            WHEN (((rs.frequency)::text = 'annually'::text) AND (max(rm.actual_date) < ((now())::date - '1 year'::interval))) THEN 'overdue'::text
            WHEN (((rs.frequency)::text = 'monthly'::text) AND (max(rm.actual_date) >= ((now())::date - '1 mon'::interval))) THEN 'on-track'::text
            WHEN (((rs.frequency)::text = 'quarterly'::text) AND (max(rm.actual_date) >= ((now())::date - '3 mons'::interval))) THEN 'on-track'::text
            WHEN (((rs.frequency)::text = 'bi-annually'::text) AND (max(rm.actual_date) >= ((now())::date - '6 mons'::interval))) THEN 'on-track'::text
            WHEN (((rs.frequency)::text = 'annually'::text) AND (max(rm.actual_date) >= ((now())::date - '1 year'::interval))) THEN 'on-track'::text
            ELSE 'no-reviews'::text
        END AS compliance_status
   FROM (review_schedules rs
     LEFT JOIN review_meetings rm ON ((rs.id = rm.schedule_id)))
  WHERE (rs.is_active = true)
  GROUP BY rs.id, rs.program_id, rs.review_type, rs.frequency;;
CREATE OR REPLACE VIEW public."risk_mitigation_report" AS
 SELECT r.id AS risk_id,
    r.title AS risk_title,
    r.category AS risk_category,
    r.probability,
    r.impact,
    r.status AS risk_status,
    mp.id AS mitigation_plan_id,
    mp.title AS mitigation_title,
    mp.action_type,
    mp.status AS mitigation_status,
    mp.completion_percentage,
    mp.priority AS mitigation_priority,
    mp.expected_effectiveness,
    mp.owner_id,
    u1.name AS owner_name,
    mp.assigned_to,
    u2.name AS assigned_to_name,
    mp.planned_start_date,
    mp.planned_completion_date,
    mp.actual_start_date,
    mp.actual_completion_date,
    mp.due_date,
        CASE
            WHEN ((mp.due_date < CURRENT_DATE) AND ((mp.status)::text <> ALL (ARRAY[('completed'::character varying)::text, ('cancelled'::character varying)::text]))) THEN true
            ELSE false
        END AS is_overdue,
    mp.created_at AS mitigation_created_at,
    mp.updated_at AS mitigation_updated_at
   FROM (((risks r
     LEFT JOIN mitigation_plans mp ON ((r.id = mp.risk_id)))
     LEFT JOIN users u1 ON ((mp.owner_id = u1.id)))
     LEFT JOIN users u2 ON ((mp.assigned_to = u2.id)))
  WHERE (((r.status)::text <> ALL (ARRAY[('closed'::character varying)::text, ('mitigated'::character varying)::text])) OR ((COALESCE(r.risk_level, 'project'::character varying))::text = ANY (ARRAY[('portfolio'::character varying)::text, ('systemic'::character varying)::text])))
  ORDER BY r.id, mp.priority DESC, mp.due_date;;
CREATE OR REPLACE VIEW public."risk_registry" AS
 SELECT r.id,
    r.title,
    r.description,
    r.category,
    r.probability,
    r.impact,
    COALESCE(r.risk_level, 'project'::character varying) AS risk_level,
    r.status,
    r.mitigation_strategy,
    r.contingency_plan,
    r.owner,
    r.project_id,
    p.name AS project_name,
    r.program_id,
    pr.name AS program_name,
    r.financial_impact,
    r.schedule_impact_days,
    r.exceeds_threshold,
    r.cross_program,
    r.systemic_risk,
    r.last_review_date,
    r.monthly_review_status,
    r.next_review_due_date,
    ( SELECT count(*) AS count
           FROM mitigation_plans mp
          WHERE (mp.risk_id = r.id)) AS mitigation_plan_count,
    ( SELECT count(*) AS count
           FROM mitigation_plans mp
          WHERE ((mp.risk_id = r.id) AND ((mp.status)::text = 'completed'::text))) AS completed_mitigation_count,
    ( SELECT round(avg(mp.completion_percentage), 0) AS round
           FROM mitigation_plans mp
          WHERE (mp.risk_id = r.id)) AS avg_mitigation_completion,
    ( SELECT calculate_risk_mitigation_completion(r.id) AS calculate_risk_mitigation_completion) AS overall_mitigation_completion,
    ( SELECT count(*) AS count
           FROM issues i
          WHERE (i.related_risk_id = r.id)) AS related_issues_count,
    ( SELECT count(*) AS count
           FROM issues i
          WHERE ((i.related_risk_id = r.id) AND ((i.status)::text <> ALL (ARRAY[('closed'::character varying)::text, ('resolved'::character varying)::text])))) AS active_related_issues_count,
    r.created_at,
    r.updated_at
   FROM ((risks r
     LEFT JOIN projects p ON ((r.project_id = p.id)))
     LEFT JOIN programs pr ON (((r.program_id = pr.id) OR (p.program_id = pr.id))))
  WHERE (((r.status)::text <> ALL (ARRAY[('closed'::character varying)::text, ('mitigated'::character varying)::text])) OR ((COALESCE(r.risk_level, 'project'::character varying))::text = ANY (ARRAY[('portfolio'::character varying)::text, ('systemic'::character varying)::text])));;
CREATE OR REPLACE VIEW public."task_resource_utilization" AS
 SELECT ta.user_id,
    u.name AS user_name,
    u.email AS user_email,
    pt.project_id,
    p.name AS project_name,
    p.program_id,
    ta.task_id,
    pt.task_name,
    pt.wbs_code,
    COALESCE(ta.planned_hours, (0)::numeric) AS planned_hours,
    COALESCE(ta.actual_hours, (0)::numeric) AS actual_hours,
    COALESCE(ta.allocation_percentage, (100)::numeric) AS allocation_percentage,
    ta.status AS assignment_status,
    pt.status AS task_status,
    ta.scheduled_start_date,
    ta.scheduled_end_date,
    (COALESCE(ta.actual_hours, (0)::numeric) - COALESCE(ta.planned_hours, (0)::numeric)) AS hours_variance
   FROM (((task_assignments ta
     JOIN users u ON ((ta.user_id = u.id)))
     JOIN project_tasks pt ON ((ta.task_id = pt.id)))
     JOIN projects p ON ((pt.project_id = p.id)))
  WHERE ((ta.status)::text <> 'cancelled'::text);;
CREATE OR REPLACE VIEW public."task_summary" AS
 SELECT t.id AS task_id,
    t.project_id,
    p.name AS project_name,
    t.task_number,
    t.wbs_code,
    t.task_name,
    t.phase,
    t.status,
    t.priority,
    t.estimated_hours,
    t.estimated_cost,
    t.planned_start_date,
    t.planned_end_date,
    t.actual_hours,
    t.actual_cost,
    t.percent_complete,
    t.hours_variance,
    t.cost_variance,
        CASE
            WHEN (t.estimated_hours > (0)::numeric) THEN round(((t.actual_hours / t.estimated_hours) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS hours_utilization_percent,
    count(DISTINCT ta.id) AS assigned_resources,
    string_agg(DISTINCT (ta.user_name)::text, ', '::text) AS assigned_to,
    ( SELECT count(*) AS count
           FROM task_dependencies td
          WHERE (td.task_id = t.id)) AS dependency_count,
    t.imported_from_wbs,
    d.title AS source_document_title
   FROM (((project_tasks t
     JOIN projects p ON ((t.project_id = p.id)))
     LEFT JOIN task_assignments ta ON ((t.id = ta.task_id)))
     LEFT JOIN documents d ON ((t.source_document_id = d.id)))
  GROUP BY t.id, p.name, d.title;;
CREATE OR REPLACE VIEW public."task_variance_report" AS
 SELECT p.id AS project_id,
    p.name AS project_name,
    t.task_number,
    t.task_name,
    t.wbs_code,
    t.status,
    t.estimated_hours,
    t.actual_hours,
    t.hours_variance,
        CASE
            WHEN (t.estimated_hours > (0)::numeric) THEN round((((t.actual_hours - t.estimated_hours) / t.estimated_hours) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS hours_variance_percent,
    t.estimated_cost,
    t.actual_cost,
    t.cost_variance,
        CASE
            WHEN (t.estimated_cost > (0)::numeric) THEN round((((t.actual_cost - t.estimated_cost) / t.estimated_cost) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS cost_variance_percent,
    t.planned_end_date,
    t.actual_end_date,
    t.schedule_variance_days,
        CASE
            WHEN (t.hours_variance > (t.estimated_hours * 0.1)) THEN 'Over Estimate'::text
            WHEN (t.hours_variance < (- (t.estimated_hours * 0.1))) THEN 'Under Estimate'::text
            ELSE 'On Target'::text
        END AS hours_status,
        CASE
            WHEN (t.cost_variance > (t.estimated_cost * 0.1)) THEN 'Over Budget'::text
            WHEN (t.cost_variance < (- (t.estimated_cost * 0.1))) THEN 'Under Budget'::text
            ELSE 'On Budget'::text
        END AS cost_status
   FROM (project_tasks t
     JOIN projects p ON ((t.project_id = p.id)))
  WHERE ((t.actual_hours > (0)::numeric) OR ((t.status)::text = 'completed'::text));;

-- Triggers
CREATE TRIGGER update_qubit_states_updated_at BEFORE UPDATE ON public.qubit_states FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_document_integrations_updated_at BEFORE UPDATE ON public.document_integrations FOR EACH ROW EXECUTE FUNCTION update_document_integrations_updated_at();
CREATE TRIGGER on_document_created_extract_entities AFTER INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION trigger_entity_extraction();
CREATE TRIGGER trg_audit_documents_changes AFTER INSERT OR DELETE OR UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION audit_documents_changes();
CREATE TRIGGER trg_documents_entity_extract AFTER INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION notify_entity_extractor();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_model_configurations_updated_at BEFORE UPDATE ON public.ai_model_configurations FOR EACH ROW EXECUTE FUNCTION update_ai_model_configurations_updated_at();
CREATE TRIGGER update_ai_providers_updated_at BEFORE UPDATE ON public.ai_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_audit_approval_step_decision AFTER UPDATE ON public.approval_steps FOR EACH ROW EXECUTE FUNCTION trigger_audit_approval_step_decision();
CREATE TRIGGER trigger_approval_requests_updated_at BEFORE UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION trigger_update_approval_request_timestamp();
CREATE TRIGGER trg_audit_log_before_insert BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION audit_log_before_insert();
CREATE TRIGGER trg_budget_baselines_updated_at BEFORE UPDATE ON public.budget_baselines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_capacity_forecasts_updated_at BEFORE UPDATE ON public.capacity_forecasts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_capacity_plans_updated_at BEFORE UPDATE ON public.capacity_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compression_metrics_updated_at BEFORE UPDATE ON public.compression_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_competencies_updated_at BEFORE UPDATE ON public.competencies FOR EACH ROW EXECUTE FUNCTION update_competencies_updated_at();
CREATE TRIGGER update_compliance_security_updated_at BEFORE UPDATE ON public.compliance_security FOR EACH ROW EXECUTE FUNCTION update_compliance_security_updated_at();
CREATE TRIGGER update_compression_strategies_updated_at BEFORE UPDATE ON public.compression_strategies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_constraints_updated_at BEFORE UPDATE ON public.constraints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_context_bundles_updated_at BEFORE UPDATE ON public.context_bundles FOR EACH ROW EXECUTE FUNCTION update_context_bundles_updated_at();
CREATE TRIGGER update_context_bundles_updated_at BEFORE UPDATE ON public.context_bundles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_context_freshness_policies_updated_at BEFORE UPDATE ON public.context_freshness_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_context_refresh_schedules_updated_at BEFORE UPDATE ON public.context_refresh_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_context_items_updated_at BEFORE UPDATE ON public.context_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_context_freshness_metrics_trigger AFTER INSERT OR UPDATE ON public.context_items FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_context_freshness_metrics();
CREATE TRIGGER trg_contingency_reserves_updated_at BEFORE UPDATE ON public.contingency_reserves FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_cost_actuals_updated_at BEFORE UPDATE ON public.cost_actuals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_critical_path_activities_updated_at BEFORE UPDATE ON public.critical_path_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_deliverable_acceptance_updated_at BEFORE UPDATE ON public.deliverable_acceptance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dt_assets_updated_at BEFORE UPDATE ON public.digital_twin_assets FOR EACH ROW EXECUTE FUNCTION update_digital_twin_updated_at();
CREATE TRIGGER task_status_update_trigger BEFORE INSERT OR UPDATE ON public.project_tasks FOR EACH ROW EXECUTE FUNCTION trigger_update_task_status();
CREATE TRIGGER trg_dev_approach_updated_at BEFORE UPDATE ON public.development_approach FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_development_approaches_updated_at BEFORE UPDATE ON public.development_approaches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER maintain_current_state_trigger BEFORE INSERT OR UPDATE ON public.digital_twin_asset_states FOR EACH ROW EXECUTE FUNCTION maintain_current_state_flag();
CREATE TRIGGER update_asset_current_state_trigger AFTER INSERT OR UPDATE ON public.digital_twin_asset_states FOR EACH ROW EXECUTE FUNCTION update_asset_current_state();
CREATE TRIGGER update_dt_triggers_updated_at BEFORE UPDATE ON public.digital_twin_document_triggers FOR EACH ROW EXECUTE FUNCTION update_digital_twin_updated_at();
CREATE TRIGGER update_document_jira_links_updated_at BEFORE UPDATE ON public.document_jira_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_analysis_metrics_trigger AFTER INSERT ON public.document_analysis FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_analysis_metrics();
CREATE TRIGGER update_document_analysis_updated_at BEFORE UPDATE ON public.document_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_pattern_analysis_updated_at BEFORE UPDATE ON public.document_pattern_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_patterns_updated_at BEFORE UPDATE ON public.document_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_pmbok7_refs_updated_at BEFORE UPDATE ON public.document_pmbok7_principle_refs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_processing_jobs_updated_at BEFORE UPDATE ON public.document_processing_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_domain_entities_updated_at BEFORE UPDATE ON public.domain_entities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rules_updated_at BEFORE UPDATE ON public.drift_detection_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drift_updated_at BEFORE UPDATE ON public.drift_detections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entity_extractions_updated_at BEFORE UPDATE ON public.entity_extractions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_engagement_actions_updated_at BEFORE UPDATE ON public.engagement_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_earned_value_metrics_updated_at BEFORE UPDATE ON public.earned_value_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_extracted_dt_assets_updated_at BEFORE UPDATE ON public.extracted_dt_assets FOR EACH ROW EXECUTE FUNCTION update_digital_twin_updated_at();
CREATE TRIGGER trigger_fallback_strategies_updated_at BEFORE UPDATE ON public.fallback_strategies FOR EACH ROW EXECUTE FUNCTION update_variable_resolution_updated_at();
CREATE TRIGGER update_framework_analysis_updated_at BEFORE UPDATE ON public.framework_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_improvement_suggestions_updated_at BEFORE UPDATE ON public.improvement_suggestions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suggestions_updated_at BEFORE UPDATE ON public.improvement_suggestions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_log_issue_status_change AFTER UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION log_issue_status_change();
CREATE TRIGGER update_integration_sync_metadata_updated_at BEFORE UPDATE ON public.integration_sync_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_lessons_learned_updated_at BEFORE UPDATE ON public.lessons_learned FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
CREATE TRIGGER trg_update_mitigation_plans_updated_at BEFORE UPDATE ON public.mitigation_plans FOR EACH ROW EXECUTE FUNCTION update_mitigation_plans_updated_at();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_search_clicks AFTER INSERT ON public.search_result_clicks FOR EACH ROW EXECUTE FUNCTION update_search_result_clicks();
CREATE TRIGGER trg_onboarding_offboarding_updated_at BEFORE UPDATE ON public.onboarding_offboarding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_playbooks_updated_at BEFORE UPDATE ON public.operational_playbooks FOR EACH ROW EXECUTE FUNCTION update_playbook_updated_at();
CREATE TRIGGER trg_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_output_templates_updated_at BEFORE UPDATE ON public.output_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_calculate_performance_variances BEFORE INSERT OR UPDATE ON public.performance_actuals FOR EACH ROW EXECUTE FUNCTION calculate_performance_variances();
CREATE TRIGGER trg_performance_actuals_updated_at BEFORE UPDATE ON public.performance_actuals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_calculate_performance_variances BEFORE INSERT OR UPDATE ON public.performance_actuals FOR EACH ROW EXECUTE FUNCTION calculate_performance_variances();
CREATE TRIGGER trigger_update_performance_actuals_updated_at BEFORE UPDATE ON public.performance_actuals FOR EACH ROW EXECUTE FUNCTION update_performance_actuals_updated_at();
CREATE TRIGGER trg_performance_measurements_updated_at BEFORE UPDATE ON public.performance_measurements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_steps_updated_at BEFORE UPDATE ON public.playbook_response_steps FOR EACH ROW EXECUTE FUNCTION update_playbook_updated_at();
CREATE TRIGGER update_phases_updated_at BEFORE UPDATE ON public.phases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_pipeline_configurations_updated_at BEFORE UPDATE ON public.pipeline_configurations FOR EACH ROW EXECUTE FUNCTION update_pipeline_executions_updated_at();
CREATE TRIGGER trg_update_pipeline_executions_updated_at BEFORE UPDATE ON public.pipeline_executions FOR EACH ROW EXECUTE FUNCTION update_pipeline_executions_updated_at();
CREATE TRIGGER update_executions_updated_at BEFORE UPDATE ON public.playbook_executions FOR EACH ROW EXECUTE FUNCTION update_playbook_updated_at();
CREATE TRIGGER trg_update_pmbok6_processes_updated_at BEFORE UPDATE ON public.pmbok6_processes FOR EACH ROW EXECUTE FUNCTION update_pmbok6_updated_at();
CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON public.playbook_scenarios FOR EACH ROW EXECUTE FUNCTION update_playbook_updated_at();
CREATE TRIGGER update_execution_progress_trigger AFTER INSERT OR UPDATE ON public.playbook_step_executions FOR EACH ROW EXECUTE FUNCTION update_execution_progress();
CREATE TRIGGER update_step_executions_updated_at BEFORE UPDATE ON public.playbook_step_executions FOR EACH ROW EXECUTE FUNCTION update_playbook_updated_at();
CREATE TRIGGER trg_update_pmbok6_knowledge_areas_updated_at BEFORE UPDATE ON public.pmbok6_knowledge_areas FOR EACH ROW EXECUTE FUNCTION update_pmbok6_updated_at();
CREATE TRIGGER trg_update_pmbok6_process_groups_updated_at BEFORE UPDATE ON public.pmbok6_process_groups FOR EACH ROW EXECUTE FUNCTION update_pmbok6_updated_at();
CREATE TRIGGER assignment_planned_cost_trigger BEFORE INSERT OR UPDATE OF planned_hours, hourly_rate ON public.task_assignments FOR EACH ROW EXECUTE FUNCTION trigger_calculate_assignment_planned_cost();
CREATE TRIGGER update_pmbok7_domains_updated_at BEFORE UPDATE ON public.pmbok7_performance_domains FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pmbok7_principles_updated_at BEFORE UPDATE ON public.pmbok7_principles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_resource_capacity_updated BEFORE UPDATE ON public.resource_capacity_settings FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trigger_resource_unavailability_updated BEFORE UPDATE ON public.resource_unavailability FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_portfolio_okrs_updated_at BEFORE UPDATE ON public.portfolio_okrs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_checklist_items_updated BEFORE UPDATE ON public.checklist_items FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_kr_progress BEFORE INSERT OR UPDATE ON public.portfolio_key_results FOR EACH ROW EXECUTE FUNCTION calculate_kr_progress();
CREATE TRIGGER update_portfolio_key_results_updated_at BEFORE UPDATE ON public.portfolio_key_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_portfolio_ksf_updated_at BEFORE UPDATE ON public.portfolio_key_success_factors FOR EACH ROW EXECUTE FUNCTION update_portfolio_ksf_updated_at();
CREATE TRIGGER trigger_update_portfolio_kpis_updated_at BEFORE UPDATE ON public.portfolio_kpis FOR EACH ROW EXECUTE FUNCTION update_portfolio_kpis_updated_at();
CREATE TRIGGER trigger_update_portfolio_strategic_goals_updated_at BEFORE UPDATE ON public.portfolio_strategic_goals FOR EACH ROW EXECUTE FUNCTION update_portfolio_strategic_goals_updated_at();
CREATE TRIGGER trigger_update_risk_review_status BEFORE INSERT OR UPDATE ON public.risks FOR EACH ROW EXECUTE FUNCTION update_monthly_review_status();
CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON public.risks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_portfolio_vision_updated_at BEFORE UPDATE ON public.portfolio_vision FOR EACH ROW EXECUTE FUNCTION update_portfolio_vision_updated_at();
CREATE TRIGGER update_prioritization_criteria_updated_at BEFORE UPDATE ON public.prioritization_criteria FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER resource_allocation_conflict_trigger AFTER INSERT OR DELETE OR UPDATE ON public.program_resource_allocations FOR EACH ROW EXECUTE FUNCTION trigger_update_resource_conflicts();
CREATE TRIGGER update_project_analysis_updated_at BEFORE UPDATE ON public.project_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_project_context_items_updated_at BEFORE UPDATE ON public.project_context_items FOR EACH ROW EXECUTE FUNCTION update_project_context_items_updated_at();
CREATE TRIGGER update_baselines_updated_at BEFORE UPDATE ON public.project_entity_baselines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_project_iterations_updated_at BEFORE UPDATE ON public.project_iterations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_pmbok7_domains_updated_at BEFORE UPDATE ON public.project_pmbok7_domains FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_pmbok7_principles_updated_at BEFORE UPDATE ON public.project_pmbok7_principles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER calculate_project_priority_weighted_score BEFORE INSERT OR UPDATE OF raw_score, criteria_id ON public.project_priority_scores FOR EACH ROW EXECUTE FUNCTION calculate_weighted_score();
CREATE TRIGGER update_project_priority_scores_updated_at BEFORE UPDATE ON public.project_priority_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prompt_templates_updated_at BEFORE UPDATE ON public.prompt_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_quality_audits_updated_at BEFORE UPDATE ON public.quality_audits FOR EACH ROW EXECUTE FUNCTION update_quality_audits_updated_at();
CREATE TRIGGER trg_relationship_health_updated_at BEFORE UPDATE ON public.relationship_health FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON public.requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_resolution_strategies_updated_at BEFORE UPDATE ON public.resolution_strategies FOR EACH ROW EXECUTE FUNCTION update_variable_resolution_updated_at();
CREATE TRIGGER trg_releases_updated_at BEFORE UPDATE ON public.releases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_relevance_feedback_updated_at BEFORE UPDATE ON public.relevance_feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_resource_pool_updated_at BEFORE UPDATE ON public.resource_pool FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_resource_conflicts_updated_at BEFORE UPDATE ON public.resource_conflicts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_resource_articles_updated_at BEFORE UPDATE ON public.resource_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_resource_assignments_updated_at BEFORE UPDATE ON public.resource_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_resource_templates_updated_at BEFORE UPDATE ON public.resource_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_risk_assessments_updated_at BEFORE UPDATE ON public.risk_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_risk_metrics_updated_at BEFORE UPDATE ON public.risk_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_risk_triggers_updated_at BEFORE UPDATE ON public.risk_triggers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_risk_response_plans_updated_at BEFORE UPDATE ON public.risk_response_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_risk_responses_updated_at BEFORE UPDATE ON public.risk_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_risk_reviews_updated_at BEFORE UPDATE ON public.risk_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_satisfaction_surveys_updated_at BEFORE UPDATE ON public.satisfaction_surveys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_schedule_baselines_updated_at BEFORE UPDATE ON public.schedule_baselines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_scope_baselines_updated_at BEFORE UPDATE ON public.scope_baselines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_query_analytics_trigger AFTER INSERT ON public.search_history FOR EACH ROW EXECUTE FUNCTION trigger_update_query_analytics();
CREATE TRIGGER update_search_index_updated_at BEFORE UPDATE ON public.search_index FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_source_authority_updated_at BEFORE UPDATE ON public.source_authority FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION update_skills_updated_at();
CREATE TRIGGER trg_stakeholder_issues_updated_at BEFORE UPDATE ON public.stakeholder_issues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stage_jobs_updated_at BEFORE UPDATE ON public.stage_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stakeholder_competencies_updated_at BEFORE UPDATE ON public.stakeholder_competencies FOR EACH ROW EXECUTE FUNCTION update_stakeholder_competencies_updated_at();
CREATE TRIGGER trigger_update_stakeholders_updated_at BEFORE UPDATE ON public.stakeholders FOR EACH ROW EXECUTE FUNCTION update_stakeholders_updated_at();
CREATE TRIGGER update_success_criteria_updated_at BEFORE UPDATE ON public.success_criteria FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stakeholder_skills_updated_at BEFORE UPDATE ON public.stakeholder_skills FOR EACH ROW EXECUTE FUNCTION update_stakeholder_skills_updated_at();
CREATE TRIGGER trigger_update_template_improvements_updated_at BEFORE UPDATE ON public.template_improvement_suggestions FOR EACH ROW EXECUTE FUNCTION update_template_improvements_updated_at();
CREATE TRIGGER trg_team_agreements_updated_at BEFORE UPDATE ON public.team_agreements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_agreements_updated_at BEFORE UPDATE ON public.team_agreements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_template_metrics_on_usage AFTER INSERT OR DELETE OR UPDATE ON public.template_usage FOR EACH ROW EXECUTE FUNCTION trigger_update_template_metrics();
CREATE TRIGGER update_user_analysis_updated_at BEFORE UPDATE ON public.user_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_collaboration_preferences_updated_at BEFORE UPDATE ON public.user_collaboration_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER time_entry_approved_trigger AFTER INSERT OR UPDATE OF status ON public.time_entries FOR EACH ROW WHEN (((new.status)::text = 'approved'::text)) EXECUTE FUNCTION trigger_update_cost_breakdown();
CREATE TRIGGER time_entry_task_update_trigger AFTER INSERT OR UPDATE OF status ON public.time_entries FOR EACH ROW WHEN (((new.status)::text = 'approved'::text)) EXECUTE FUNCTION trigger_update_task_from_time_entry();
CREATE TRIGGER update_user_writing_style_updated_at BEFORE UPDATE ON public.user_writing_style FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_domain_knowledge_updated_at BEFORE UPDATE ON public.user_domain_knowledge FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_expertise_updated_at BEFORE UPDATE ON public.user_expertise FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_search_preferences_updated_at BEFORE UPDATE ON public.user_search_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_utilization_records_updated_at BEFORE UPDATE ON public.utilization_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_variable_analysis_results_updated_at BEFORE UPDATE ON public.variable_analysis_results FOR EACH ROW EXECUTE FUNCTION update_variable_resolution_updated_at();
CREATE TRIGGER trigger_variable_patterns_updated_at BEFORE UPDATE ON public.variable_patterns FOR EACH ROW EXECUTE FUNCTION update_variable_resolution_updated_at();
CREATE TRIGGER trigger_variable_resolution_cache_updated_at BEFORE UPDATE ON public.variable_resolution_cache FOR EACH ROW EXECUTE FUNCTION update_variable_resolution_updated_at();
CREATE TRIGGER trigger_variable_resolution_results_updated_at BEFORE UPDATE ON public.variable_resolution_results FOR EACH ROW EXECUTE FUNCTION update_variable_resolution_updated_at();
CREATE TRIGGER trg_work_items_updated_at BEFORE UPDATE ON public.work_items FOR EACH ROW EXECUTE FUNCTION update_work_items_updated_at();
CREATE TRIGGER update_workflow_presets_updated_at BEFORE UPDATE ON public.workflow_presets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_context_freshness_trends_updated_at BEFORE UPDATE ON public.context_freshness_trends FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'digital_twin_asset_states' AND policyname = 'digital_twin_asset_states_select_policy') THEN CREATE POLICY "digital_twin_asset_states_select_policy" ON public."digital_twin_asset_states" FOR SELECT USING ((asset_id IN ( SELECT digital_twin_assets.id
   FROM digital_twin_assets
  WHERE (digital_twin_assets.project_id IN ( SELECT projects.id
           FROM projects
          WHERE (projects.owner_id = (current_setting('app.current_user_id'::text, true))::uuid)))))) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'digital_twin_assets' AND policyname = 'digital_twin_assets_select_policy') THEN CREATE POLICY "digital_twin_assets_select_policy" ON public."digital_twin_assets" FOR SELECT USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.owner_id = (current_setting('app.current_user_id'::text, true))::uuid)))) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'digital_twin_document_triggers' AND policyname = 'digital_twin_document_triggers_select_policy') THEN CREATE POLICY "digital_twin_document_triggers_select_policy" ON public."digital_twin_document_triggers" FOR SELECT USING ((asset_id IN ( SELECT digital_twin_assets.id
   FROM digital_twin_assets
  WHERE (digital_twin_assets.project_id IN ( SELECT projects.id
           FROM projects
          WHERE (projects.owner_id = (current_setting('app.current_user_id'::text, true))::uuid)))))) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'digital_twin_events' AND policyname = 'digital_twin_events_select_policy') THEN CREATE POLICY "digital_twin_events_select_policy" ON public."digital_twin_events" FOR SELECT USING ((asset_id IN ( SELECT digital_twin_assets.id
   FROM digital_twin_assets
  WHERE (digital_twin_assets.project_id IN ( SELECT projects.id
           FROM projects
          WHERE (projects.owner_id = (current_setting('app.current_user_id'::text, true))::uuid)))))) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'digital_twin_ingestion_sources' AND policyname = 'digital_twin_ingestion_sources_select_policy') THEN CREATE POLICY "digital_twin_ingestion_sources_select_policy" ON public."digital_twin_ingestion_sources" FOR SELECT USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.owner_id = (current_setting('app.current_user_id'::text, true))::uuid)))) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'digital_twin_trigger_rules' AND policyname = 'digital_twin_trigger_rules_select_policy') THEN CREATE POLICY "digital_twin_trigger_rules_select_policy" ON public."digital_twin_trigger_rules" FOR SELECT USING ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.owner_id = (current_setting('app.current_user_id'::text, true))::uuid)))) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playbook_executions' AND policyname = 'executions_all_policy') THEN CREATE POLICY "executions_all_policy" ON public."playbook_executions" USING (true) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'operational_playbooks' AND policyname = 'playbooks_delete_policy') THEN CREATE POLICY "playbooks_delete_policy" ON public."operational_playbooks" FOR DELETE USING (true) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'operational_playbooks' AND policyname = 'playbooks_insert_policy') THEN CREATE POLICY "playbooks_insert_policy" ON public."operational_playbooks" FOR INSERT WITH CHECK (true) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'operational_playbooks' AND policyname = 'playbooks_select_policy') THEN CREATE POLICY "playbooks_select_policy" ON public."operational_playbooks" FOR SELECT USING (true) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'operational_playbooks' AND policyname = 'playbooks_update_policy') THEN CREATE POLICY "playbooks_update_policy" ON public."operational_playbooks" FOR UPDATE USING (true) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'resource_articles' AND policyname = 'resource_articles_manage_admins') THEN CREATE POLICY "resource_articles_manage_admins" ON public."resource_articles" USING ((current_jwt_role() = ANY (ARRAY['admin'::text, 'editor'::text]))) WITH CHECK ((current_jwt_role() = ANY (ARRAY['admin'::text, 'editor'::text]))) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'resource_articles' AND policyname = 'resource_articles_select_published') THEN CREATE POLICY "resource_articles_select_published" ON public."resource_articles" FOR SELECT USING ((status = 'published'::text)) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'resource_templates' AND policyname = 'resource_templates_manage_admins') THEN CREATE POLICY "resource_templates_manage_admins" ON public."resource_templates" USING ((current_jwt_role() = ANY (ARRAY['admin'::text, 'editor'::text]))) WITH CHECK ((current_jwt_role() = ANY (ARRAY['admin'::text, 'editor'::text]))) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'resource_templates' AND policyname = 'resource_templates_select_published') THEN CREATE POLICY "resource_templates_select_published" ON public."resource_templates" FOR SELECT USING ((status = 'published'::text)) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playbook_scenarios' AND policyname = 'scenarios_all_policy') THEN CREATE POLICY "scenarios_all_policy" ON public."playbook_scenarios" USING (true) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playbook_step_executions' AND policyname = 'step_executions_all_policy') THEN CREATE POLICY "step_executions_all_policy" ON public."playbook_step_executions" USING (true) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playbook_response_steps' AND policyname = 'steps_all_policy') THEN CREATE POLICY "steps_all_policy" ON public."playbook_response_steps" USING (true) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'morphic_ai_model_config' AND policyname = 'admins_manage_morphic_model_config') THEN CREATE POLICY "admins_manage_morphic_model_config" ON public."morphic_ai_model_config" USING ((current_setting('app.current_user_id'::text, true) IS NOT NULL)) WITH CHECK ((current_setting('app.current_user_id'::text, true) IS NOT NULL)) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'morphic_ai_models' AND policyname = 'admins_manage_morphic_models') THEN CREATE POLICY "admins_manage_morphic_models" ON public."morphic_ai_models" USING ((current_setting('app.current_user_id'::text, true) IS NOT NULL)) WITH CHECK ((current_setting('app.current_user_id'::text, true) IS NOT NULL)) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'morphic_ai_providers' AND policyname = 'admins_manage_morphic_providers') THEN CREATE POLICY "admins_manage_morphic_providers" ON public."morphic_ai_providers" USING ((current_setting('app.current_user_id'::text, true) IS NOT NULL)) WITH CHECK ((current_setting('app.current_user_id'::text, true) IS NOT NULL)) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'morphic_chats' AND policyname = 'users_manage_own_morphic_chats') THEN CREATE POLICY "users_manage_own_morphic_chats" ON public."morphic_chats" USING (((user_id)::text = current_setting('app.current_user_id'::text, true))) WITH CHECK (((user_id)::text = current_setting('app.current_user_id'::text, true))) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'morphic_chats' AND policyname = 'public_morphic_chats_readable') THEN CREATE POLICY "public_morphic_chats_readable" ON public."morphic_chats" FOR SELECT USING (((visibility)::text = 'public'::text)) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'morphic_feedback' AND policyname = 'anyone_can_insert_morphic_feedback') THEN CREATE POLICY "anyone_can_insert_morphic_feedback" ON public."morphic_feedback" FOR INSERT WITH CHECK (true) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'morphic_messages' AND policyname = 'users_manage_morphic_chat_messages') THEN CREATE POLICY "users_manage_morphic_chat_messages" ON public."morphic_messages" USING ((EXISTS ( SELECT 1
   FROM morphic_chats
  WHERE (((morphic_chats.id)::text = (morphic_messages.chat_id)::text) AND ((morphic_chats.user_id)::text = current_setting('app.current_user_id'::text, true)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM morphic_chats
  WHERE (((morphic_chats.id)::text = (morphic_messages.chat_id)::text) AND ((morphic_chats.user_id)::text = current_setting('app.current_user_id'::text, true)))))) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'morphic_messages' AND policyname = 'public_morphic_chat_messages_readable') THEN CREATE POLICY "public_morphic_chat_messages_readable" ON public."morphic_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM morphic_chats
  WHERE (((morphic_chats.id)::text = (morphic_messages.chat_id)::text) AND ((morphic_chats.visibility)::text = 'public'::text))))) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'morphic_parts' AND policyname = 'users_manage_morphic_message_parts') THEN CREATE POLICY "users_manage_morphic_message_parts" ON public."morphic_parts" USING ((EXISTS ( SELECT 1
   FROM (morphic_messages
     JOIN morphic_chats ON (((morphic_chats.id)::text = (morphic_messages.chat_id)::text)))
  WHERE (((morphic_messages.id)::text = (morphic_parts.message_id)::text) AND ((morphic_chats.user_id)::text = current_setting('app.current_user_id'::text, true)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (morphic_messages
     JOIN morphic_chats ON (((morphic_chats.id)::text = (morphic_messages.chat_id)::text)))
  WHERE (((morphic_messages.id)::text = (morphic_parts.message_id)::text) AND ((morphic_chats.user_id)::text = current_setting('app.current_user_id'::text, true)))))) ; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'morphic_parts' AND policyname = 'public_morphic_chat_parts_readable') THEN CREATE POLICY "public_morphic_chat_parts_readable" ON public."morphic_parts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (morphic_messages
     JOIN morphic_chats ON (((morphic_chats.id)::text = (morphic_messages.chat_id)::text)))
  WHERE (((morphic_messages.id)::text = (morphic_parts.message_id)::text) AND ((morphic_chats.visibility)::text = 'public'::text))))) ; END IF; END $$;

-- COMMIT;