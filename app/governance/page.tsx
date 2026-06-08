'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { assertSafePathSegment, fetchRelativeApi } from '@/lib/safe-http-path';
import { useAuth } from '@/contexts/AuthContext';

const DracoDiffViewer = dynamic(() => import('./components/DracoDiffViewer'), { ssr: false });

const LEDGER_FETCH_TIMEOUT_MS = 20_000;
const LOADING_SAFETY_MS = 25_000;

async function fetchRelativeApiWithTimeout(path: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    // path is validated under /api/ by fetchRelativeApi (assertRelativeApiPath)
    return await fetchRelativeApi(path, { signal: controller.signal }); // codacy-disable-line SecurityRisk -- allowlisted relative API path
  } finally {
    window.clearTimeout(timer);
  }
}

interface AuditRecord {
  audit_id: string;
  rule_code: string;
  document_type: string;
  event_type: 'DRACO_CANDIDATE' | 'COUNCIL_DEADLOCK' | 'DATA_INTEGRITY_FAILURE';
  decision_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  template_gate_context: { minimumRequiredScore: number };
  evidence_validation_report: { findings: string; confidenceScore?: number };
  purist_verdict: { rationale: string };
  realist_verdict: { rationale: string };
  arbitrator_verdict: { proposedDescriptionUpdate: string; proposedThresholdAdjustment: string; rationale?: string };
  final_patch_payload?: { description: string; thresholds: string } | null;
  reviewed_by?: string | null;
  resolved_at?: string | null;
}

/**
 * Governance Adjudication Dashboard
 * 
 * Provides an analytical interface for council members to review and adjudicate 
 * AI-generated governance patches.
 */
export default function GovernanceDashboard() {
  const { user } = useAuth();
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null);
  const [rationale, setRationale] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch all pending and recent audits from the ledger api
  const fetchLedger = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchRelativeApiWithTimeout(
        '/api/v1/governance/ledger',
        LEDGER_FETCH_TIMEOUT_MS,
      );
      if (!res.ok) throw new Error(`Ledger request failed (${res.status})`);
      const data = await res.json();
      setAudits(data);

      setSelectedAudit((current) => {
        if (current) {
          const updatedSelected = data.find((a: AuditRecord) => a.audit_id === current.audit_id);
          return updatedSelected ?? current;
        }
        return data.length > 0 ? data[0] : null;
      });
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'AbortError'
          ? 'Ledger sync timed out. The backend may be waking up — try again.'
          : err instanceof Error
            ? err.message
            : 'Failed to load governance ledger';
      console.error('Failed to poll ADPA ledger data streams:', err);
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all active policies from the policy library
  const fetchPolicies = useCallback(async () => {
    try {
      const res = await fetchRelativeApiWithTimeout(
        '/api/v1/policy-library',
        LEDGER_FETCH_TIMEOUT_MS,
      );
      if (res.ok) {
        const data = await res.json();
        setPolicies(data);
      }
    } catch (err) {
      console.error('Failed to fetch policies:', err);
    }
  }, []);

  useEffect(() => {
    void fetchLedger();
    void fetchPolicies();
  }, [fetchLedger, fetchPolicies]);

  // Never leave the SSR spinner up indefinitely if the client fetch stalls
  useEffect(() => {
    const safety = window.setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          setLoadError((current) =>
            current ?? 'Ledger sync is taking longer than expected. Try refreshing.',
          );
        }
        return false;
      });
    }, LOADING_SAFETY_MS);
    return () => window.clearTimeout(safety);
  }, []);

  // Handle the atomic state mutation transaction
  const handleAdjudicate = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedAudit || rationale.length < 10) return;
    setIsSubmitting(true);

    try {
      const auditId = assertSafePathSegment(selectedAudit.audit_id, 'audit id');
      const res = await fetchRelativeApi(`/api/v1/governance/ledger/${auditId}/adjudicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          auditorId: user?.name || user?.email || 'Marcus Vance', // Bound human authority context token
          overrideRationale: rationale
        })
      });

      if (res.ok) {
        setRationale('');
        // Refresh ledger and policy data to reflect updates
        await fetchLedger();
        await fetchPolicies(); 
      } else {
        const errorData = await res.json();
        alert(`Adjudication transaction failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Network exception routing human authority patch:', err);
      alert('Network error occurred while processing adjudication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open the PDF compliance report in a new tab
  const handleGenerateReport = () => {
    if (!selectedAudit) return;
    window.open(`/api/v1/governance/ledger/${selectedAudit.audit_id}/export`, '_blank');
  };

  const shell = (content: React.ReactNode) => (
    <div className="flex h-screen bg-slate-900">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Header />
        <div className="flex-1 overflow-auto">{content}</div>
      </div>
    </div>
  );

  if (loading) {
    return shell(
      <div className="min-h-full text-slate-400 font-mono flex items-center justify-center p-8">
        📡 Syncing ADPA Governance Ledger Streams...
      </div>,
    );
  }

  if (loadError) {
    return shell(
      <div className="min-h-full text-slate-300 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="font-mono text-sm text-amber-400">⚠️ {loadError}</p>
        <button
          type="button"
          onClick={() => {
            void fetchLedger();
            void fetchPolicies();
          }}
          className="px-4 py-2 rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 text-sm font-mono"
        >
          Retry sync
        </button>
      </div>,
    );
  }

  // Find current active rule description to pass as oldText
  const activePolicy = policies.find(p => p.rule_code === selectedAudit?.rule_code);
  const oldText = activePolicy ? activePolicy.description : '';

  return shell(
    <div className="min-h-full text-slate-100 font-sans p-8">
      {/* ─── TITLE HEAD HEADER ────────────────────────────────────────────────── */}
      <header className="border-b border-slate-800 pb-4 mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            🏛️ ADPA Governance Adjudication Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">Autonomous AI Tribunal Tracking & Human Council Sovereignty Node</p>
        </div>
        <div className="bg-slate-800 px-4 py-2 rounded-md border border-slate-700 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-xs font-mono text-slate-300">
            Council Member: {user?.name || user?.email || 'Marcus Vance'}
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 xl:grid-cols-3 gap-8 text-left">
        {/* ─── COLUMN 1: PENDING LEDGER QUEUE ─────────────────────────────────── */}
        <section className="xl:col-span-1 bg-slate-950 border border-slate-800 rounded-lg p-4 h-[calc(100vh-200px)] overflow-y-auto">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 px-2">📂 Recovery Ledger Queue ({audits.length})</h2>
          <div className="space-y-3">
            {audits.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs italic border border-dashed border-slate-800 rounded-md">
                No active tribunal logs found.
              </div>
            ) : (
              audits.map((audit) => (
                <div 
                  key={audit.audit_id}
                  onClick={() => {
                    setSelectedAudit(audit);
                    setRationale('');
                  }}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${selectedAudit?.audit_id === audit.audit_id ? 'bg-slate-900 border-amber-500/50 shadow-md' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-mono font-bold text-white">{audit.rule_code}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${
                      audit.decision_status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                      audit.decision_status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {audit.decision_status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">Target Tier: {audit.document_type}</p>
                  <div className="text-[11px] font-mono text-slate-500 bg-slate-950 p-2 rounded border border-slate-800/80">Event: {audit.event_type}</div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ─── COLUMN 2 & 3: DETAIL PANEL & FORENSICS ─────────────────────────── */}
        <section className="xl:col-span-2 space-y-6">
          {selectedAudit ? (
            <>
              {/* 🧠 SECTION A: DISCREPANCY TRANSCRIPT ACCORDION ────────────────── */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-white flex items-center gap-2">🔍 Forensic Tribunal Review: {selectedAudit.rule_code}</h2>
                  <span className="text-[10px] font-mono text-slate-500">ID: {selectedAudit.audit_id}</span>
                </div>
                
                <div className="space-y-4">
                  {/* Evidence Validator */}
                  <div className="bg-slate-900/40 border border-slate-800 rounded-md p-4 border-l-4 border-l-teal-500">
                    <div className="text-xs font-bold text-teal-400 font-mono mb-1 text-left flex justify-between">
                      <span>🔍 AGENT 4 // EVIDENCE VALIDATOR</span>
                      {selectedAudit.evidence_validation_report.confidenceScore && (
                        <span>Confidence: {selectedAudit.evidence_validation_report.confidenceScore}%</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 italic">"{selectedAudit.evidence_validation_report?.findings || 'No validation remarks logged.'}"</p>
                  </div>

                  {selectedAudit.event_type !== 'DATA_INTEGRITY_FAILURE' && (
                    <>
                      {/* Purist */}
                      <div className="bg-slate-900/40 border border-slate-800 rounded-md p-4 border-l-4 border-l-red-500">
                        <div className="text-xs font-bold text-red-400 font-mono mb-1 text-left">📜 AGENT 1 // REGULATORY PURIST</div>
                        <p className="text-sm text-slate-300">"{selectedAudit.purist_verdict?.rationale || 'Dissent text missing.'}"</p>
                      </div>

                      {/* Realist */}
                      <div className="bg-slate-900/40 border border-slate-800 rounded-md p-4 border-l-4 border-l-sky-500">
                        <div className="text-xs font-bold text-sky-400 font-mono mb-1 text-left">🔨 AGENT 2 // OPERATIONAL REALIST</div>
                        <p className="text-sm text-slate-300">"{selectedAudit.realist_verdict?.rationale || 'Velocity brief missing.'}"</p>
                      </div>

                      {/* Arbitrator */}
                      <div className="bg-slate-900/40 border border-slate-800 rounded-md p-4 border-l-4 border-l-amber-500">
                        <div className="text-xs font-bold text-amber-400 font-mono mb-1 text-left">⚖️ AGENT 3 // GOVERNANCE ARBITRATOR (Synthesis)</div>
                        <p className="text-sm text-slate-300">"{selectedAudit.arbitrator_verdict?.rationale || 'Synthesis brief missing.'}"</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 🧬 SECTION B: PROPOSED COMPROMISE DIFF ───────────────────────── */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 text-left">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">🧬 Proposed Amendment Resolution (Arbitrator Compromise)</h3>
                {selectedAudit.arbitrator_verdict?.proposedDescriptionUpdate ? (
                  <DracoDiffViewer 
                    oldText={oldText} 
                    newText={selectedAudit.arbitrator_verdict.proposedDescriptionUpdate} 
                    ruleCode={selectedAudit.rule_code} 
                  />
                ) : (
                  <div className="p-4 rounded-md border border-red-500/20 bg-red-500/5 text-red-400 font-mono text-xs italic">
                    NO PATCH PAYLOAD GENERATED. THE COUNCIL MUST RE-EVALUATE THE CORE RULE OR MANUAL REMEDIATION IS REQUIRED.
                  </div>
                )}
              </div>

              {/* 👥 SECTION C: ACTION CONTROL NODE ────────────────────────────── */}
              {selectedAudit.decision_status === 'PENDING' ? (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 text-left">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">✍️ Constitutional Authority Adjudication Panel</h3>
                  <textarea
                    disabled={isSubmitting}
                    className="w-full h-24 bg-slate-900 border border-slate-800 rounded-md p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 mb-4 transition-all disabled:opacity-50"
                    placeholder="Provide mandatory human-grade executive rationale for promoting or rejecting this AI compensation patch (minimum 10 characters)..."
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                  />
                  
                  <div className="flex gap-4 justify-end items-center">
                    <button 
                      onClick={() => handleAdjudicate('REJECT')}
                      disabled={rationale.length < 10 || isSubmitting}
                      className="px-5 py-2.5 rounded text-sm font-medium font-mono border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      ❌ Deny & Retain Lockout
                    </button>
                    <button 
                      onClick={() => handleAdjudicate('APPROVE')}
                      disabled={rationale.length < 10 || isSubmitting || !selectedAudit.arbitrator_verdict?.proposedDescriptionUpdate}
                      className={`px-5 py-2.5 rounded text-sm font-medium font-mono shadow-lg transition-all ${
                        selectedAudit.event_type === 'COUNCIL_DEADLOCK' 
                          ? 'bg-amber-600 text-white hover:bg-amber-500 shadow-amber-950/40' 
                          : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-950/40'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {isSubmitting ? 'Promoting...' : selectedAudit.event_type === 'COUNCIL_DEADLOCK' ? '⚡ Resolve Deadlock & Promote' : '🟢 Promote Patch to Production'}
                    </button>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-800/80 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">📄 Audit Report Handshake</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Export this 4-agent adversarial debate transcript to a signed PDF</p>
                    </div>
                    <button 
                      onClick={handleGenerateReport}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-xs font-mono border border-slate-800 transition-all flex items-center gap-2"
                    >
                      📥 Generate Compliance Report
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 text-left">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Adjudication Complete</h3>
                      <p className="text-xs text-slate-400 italic">Resolved by {selectedAudit.reviewed_by || 'USR-M-VANCE'} at {selectedAudit.resolved_at ? new Date(selectedAudit.resolved_at).toLocaleString() : 'N/A'}</p>
                    </div>
                    <div className={`px-4 py-2 rounded font-mono font-bold border ${selectedAudit.decision_status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                      {selectedAudit.decision_status}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-800/60 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">📄 Audit Report Handshake</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Export this 4-agent adversarial debate transcript to a signed PDF</p>
                    </div>
                    <button 
                      onClick={handleGenerateReport}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-xs font-mono border border-slate-800 transition-all flex items-center gap-2"
                    >
                      📥 Generate Compliance Report
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-12 text-center text-slate-500 h-[calc(100vh-200px)] flex flex-col justify-center items-center">
              <span className="text-4xl mb-2">⚖️</span>
              <p className="text-sm">No active or pending tribunal logs require human intervention at this cycle.</p>
            </div>
          )}
        </section>
      </main>
    </div>,
  );
}
