/**
 * Frontend types for Digital Twin POC.
 * Align with server services (digitalTwinAssetService, etc.) and API responses.
 */

export type PlatformType = 'iTwin' | 'AzureDT' | 'Generic';

export interface DigitalTwinAsset {
  id: string;
  project_id: string;
  company_id: string | null;
  external_id: string;
  platform_type: PlatformType;
  platform_instance_url: string | null;
  name: string;
  description: string | null;
  asset_type: string | null;
  location: Record<string, unknown> | null;
  current_state_id: string | null;
  current_state_version: number;
  metadata: Record<string, unknown>;
  last_synced_at: string | null;
  sync_status: 'active' | 'paused' | 'error' | 'disconnected';
  sync_error_message: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DigitalTwinAssetState {
  id: string;
  asset_id: string;
  state_snapshot: Record<string, unknown>;
  state_version: number;
  changed_fields: string[];
  previous_state_id: string | null;
  source_event_id: string | null;
  is_current: boolean;
  state_hash: string | null;
  change_summary: string | null;
  timestamp: string;
  created_at: string;
}

export interface DigitalTwinEvent {
  id: string;
  asset_id: string;
  event_type: string;
  event_payload: Record<string, unknown>;
  platform_event_id: string | null;
  platform_type: PlatformType;
  event_timestamp: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  processing_error: string | null;
  created_at: string;
}

export interface DigitalTwinTriggerRule {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  rule_config: Record<string, unknown>;
  trigger_type: string;
  template_id: string | null;
  generation_params: Record<string, unknown>;
  is_active: boolean;
  trigger_count: number;
  created_at: string;
  updated_at: string;
}

export interface DigitalTwinDocumentTrigger {
  id: string;
  asset_id: string;
  event_id: string | null;
  trigger_rule_id: string;
  template_id: string | null;
  status: string;
  document_id: string | null;
  triggered_at: string;
  created_at: string;
}

export interface DigitalTwinIngestionSource {
  id: string;
  project_id: string;
  name: string;
  platform_type: PlatformType;
  connection_config: Record<string, unknown>;
  sync_mode: string;
  poll_interval_seconds: number;
  last_sync_at: string | null;
  next_sync_at: string | null;
  is_active: boolean;
  sync_status: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}
