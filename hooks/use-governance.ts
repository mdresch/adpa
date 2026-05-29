import useSWR, { mutate } from 'swr';
import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api-url';

const API_BASE_URL = getApiBaseUrl();

export interface AuditRecord {
  audit_id: string;
  timestamp: string;
  rule_code: string;
  document_type: string;
  event_type: 'DRACO_CANDIDATE' | 'COUNCIL_DEADLOCK' | 'DATA_INTEGRITY_FAILURE';
  decision_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  consensus_achieved: boolean;
  evidence_validation_report: { findings: string; confidenceScore: number; isValid: boolean };
  purist_verdict: { rationale: string; approved: boolean };
  realist_verdict: { rationale: string; approved: boolean };
  arbitrator_verdict: { rationale: string; approved: boolean; proposedDescriptionUpdate: string; proposedThresholdAdjustment: string; human_override_notes?: string };
  final_patch_payload: { description: string; thresholds: string } | null;
  template_gate_context: { minimumRequiredScore: number; mandatoryKeywords: string[] };
  reviewed_by: string | null;
  resolved_at: string | null;
}

export interface AdjudicationRequest {
  action: 'APPROVE' | 'REJECT';
  auditorId: string;
  overrideRationale: string;
}

const fetcher = (url: string) => axios.get(url, { withCredentials: true }).then(res => res.data);

/**
 * Hook for managing Governance Audit records and adjudication.
 */
export function useGovernance() {
  const { data, error, isLoading } = useSWR<AuditRecord[]>(
    `${API_BASE_URL}/api/v1/governance/ledger`,
    fetcher
  );

  /**
   * Adjudicates a specific audit record.
   */
  const adjudicate = async (auditId: string, request: AdjudicationRequest) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/governance/ledger/${auditId}/adjudicate`,
        request,
        { withCredentials: true }
      );

      // Optimistically update the local cache
      await mutate(`${API_BASE_URL}/api/v1/governance/ledger`);
      
      return response.data;
    } catch (err) {
      console.error('[useGovernance] Adjudication failed:', err);
      throw err;
    }
  };

  return {
    audits: data || [],
    isLoading,
    isError: error,
    adjudicate
  };
}
