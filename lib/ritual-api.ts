/**
 * RPAS-CM Ritual API Client (v2.4.0)
 * 
 * This client provides a direct line to the C# Orchestrator (Authority Tier).
 * All ritual state and transformations are handled by the Orchestrator.
 */

import { getApiBaseUrl } from './api-url';

/** Direct orchestrator base (browser). When unset, use same-origin /api/Ritual (Next rewrite → ORCHESTRATOR_URL). */
function getOrchestratorRitualBase(): string {
  const explicit = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL?.trim()
  if (explicit) {
    return `${explicit.replace(/\/$/, '')}/api/Ritual`
  }
  return `${getApiBaseUrl()}/Ritual`
}

export function isRitualOrchestratorConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_ORCHESTRATOR_URL?.trim() ||
      (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ORCHESTRATOR_PROXY === 'true'),
  )
}

function ritualFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${getOrchestratorRitualBase()}${path}`, init)
}

/** True when Express returned HTML 404 for a missing ritual route (orchestrator not proxied / not running). */
export function isRitualOrchestratorUnavailableError(message: string): boolean {
  return (
    message.includes('Cannot POST /api/Ritual') ||
    message.includes('status: 404') ||
    (message.includes('Orchestration Ritual Failure') && message.includes('<!DOCTYPE html>'))
  )
}

export interface IngestionRequest {
  filename: string;
  content: string;
}

export interface IdeationSummary {
  id: string;
  session_id: string;
  version: number;
  title: string;
  problem_statement: string;
  proposed_solution: string;
  key_goals: string[];
  assumptions: string[];
  constraints: string[];
  conflicts: any[];
  approval_status: string;
  created_at: string;
}

export interface BusinessCase {
  id: string;
  ideation_summary_id: string;
  executive_summary: string;
  problem_statement: string;
  proposed_solution: string;
  expected_benefits: string[];
  estimated_costs: any[];
  key_risks: string[];
  recommendation: string;
  approval_status: string;
}

/** Use with {@link TaskApprovalAttestation.scope} when calling gated rituals under ApprovalsEnforced. */
export const TASK_APPROVAL_SCOPE_PHASE0_APPROVE = 'phase0.approve' as const;
export const TASK_APPROVAL_SCOPE_RTM_APPLY_AMENDMENT = 'rtm.apply_amendment' as const;

/** JIT human approval for a scoped task (required when Governance:ApprovalsEnforced is true). */
export interface TaskApprovalAttestation {
  scope: string;
  task_id: string;
  human_decision_id: string;
  decided_by: string;
  /** ISO-8601 instant; must be in the future and within the server's JIT window */
  expires_at: string;
}

/**
 * Phase 0: Ingest raw ideation data.
 */
export async function ingestIdeation(payload: IngestionRequest): Promise<IdeationSummary> {
  const response = await ritualFetch('/phase0/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Orchestration Ritual Failure (ingest): ${error}`);
  }

  return response.json();
}

/**
 * Phase 0: Generate Business Case from summary.
 */
export async function generateBusinessCase(ideationTitle: string): Promise<BusinessCase> {
  const response = await ritualFetch('/phase0/business-case', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ideationTitle)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Orchestration Ritual Failure (business-case): ${error}`);
  }

  return response.json();
}

/**
 * Phase 0: Approve Business Case and trigger RTM seeding.
 * When the orchestrator has Governance:ApprovalsEnforced, pass {@link TaskApprovalAttestation}
 * (scope should be `phase0.approve`, task_id should match the business case id).
 */
export async function approveBusinessCase(businessCaseId: string, approval?: TaskApprovalAttestation) {
  const body =
    approval !== undefined
      ? JSON.stringify({
          business_case_id: businessCaseId,
          approval: {
            scope: approval.scope,
            task_id: approval.task_id,
            human_decision_id: approval.human_decision_id,
            decided_by: approval.decided_by,
            expires_at: approval.expires_at,
          },
        })
      : JSON.stringify(businessCaseId);

  const response = await ritualFetch('/phase0/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Orchestration Ritual Failure (approve): ${error}`);
  }

  return response.json();
}

/**
 * RTM: Fetch Research Advice for a requirement.
 */
export async function getResearchAdvice(targetId: string) {
  const response = await ritualFetch(`/rtm/research-advice/${targetId}`, {
    method: 'POST'
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Orchestration Ritual Failure (research-advice): ${error}`);
  }

  return response.json();
}

/**
 * RTM: Propose an amendment to a requirement.
 */
export async function proposeAmendment(payload: {
  target_requirement_id: string;
  proposed_description: string;
  justification: string;
  requester: string;
  amendment_type?: string;
  amendment_sub_type?: string;
}) {
  const response = await ritualFetch('/rtm/propose-amendment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Orchestration Ritual Failure (propose-amendment): ${error}`);
  }

  return response.json();
}

/**
 * RTM: Decide on a pending amendment.
 */
export async function decideAmendment(payload: {
  amendment_id: string;
  status: 'APPROVED' | 'REJECTED';
  decided_by: string;
  decision_notes?: string;
}) {
  const response = await ritualFetch('/rtm/decide-amendment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Orchestration Ritual Failure (decide-amendment): ${error}`);
  }

  return response.json();
}

/**
 * RTM: Apply an approved amendment.
 */
export async function applyAmendment(payload: {
  amendment_id: string;
  actor: string;
  /** Required when Governance:ApprovalsEnforced (scope `rtm.apply_amendment`, task_id = amendment_id). */
  approval?: TaskApprovalAttestation;
}) {
  const response = await ritualFetch('/rtm/apply-amendment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Orchestration Ritual Failure (apply-amendment): ${error}`);
  }

  return response.json();
}

/**
 * Ledger: Fetch Ideation Ledger.
 */
export async function getIdeationLedger() {
  const response = await ritualFetch('/ledger/ideation');
  if (!response.ok) throw new Error("Ledger Access Failure: Ideation");
  return response.json();
}

/**
 * Ledger: Fetch RTM Ledger.
 */
export async function getRtmLedger() {
  const response = await ritualFetch('/ledger/rtm');
  if (!response.ok) throw new Error("Ledger Access Failure: RTM");
  return response.json();
}
