/**
 * RPAS-CM Ritual API Client (v2.4.0)
 * 
 * This client provides a direct line to the C# Orchestrator (Authority Tier).
 * All ritual state and transformations are handled by the Orchestrator.
 */

import { getApiBaseUrl } from './api-url';

// Use dedicated orchestrator URL or fallback to standard API base
const ORCHESTRATOR_URL = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL 
  ? `${process.env.NEXT_PUBLIC_ORCHESTRATOR_URL.replace(/\/$/, '')}/api/Ritual`
  : `${getApiBaseUrl()}/Ritual`;

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

/**
 * Phase 0: Ingest raw ideation data.
 */
export async function ingestIdeation(payload: IngestionRequest): Promise<IdeationSummary> {
  const response = await fetch(`${ORCHESTRATOR_URL}/phase0/ingest`, {
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
  const response = await fetch(`${ORCHESTRATOR_URL}/phase0/business-case`, {
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
 */
export async function approveBusinessCase(businessCaseId: string) {
  const response = await fetch(`${ORCHESTRATOR_URL}/phase0/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(businessCaseId)
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
  const response = await fetch(`${ORCHESTRATOR_URL}/rtm/research-advice/${targetId}`, {
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
  const response = await fetch(`${ORCHESTRATOR_URL}/rtm/propose-amendment`, {
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
  const response = await fetch(`${ORCHESTRATOR_URL}/rtm/decide-amendment`, {
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
}) {
  const response = await fetch(`${ORCHESTRATOR_URL}/rtm/apply-amendment`, {
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
  const response = await fetch(`${ORCHESTRATOR_URL}/ledger/ideation`);
  if (!response.ok) throw new Error("Ledger Access Failure: Ideation");
  return response.json();
}

/**
 * Ledger: Fetch RTM Ledger.
 */
export async function getRtmLedger() {
  const response = await fetch(`${ORCHESTRATOR_URL}/ledger/rtm`);
  if (!response.ok) throw new Error("Ledger Access Failure: RTM");
  return response.json();
}
