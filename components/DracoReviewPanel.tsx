"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"

// ─── Types ────────────────────────────────────────────────────────────────────

type DracoVerdict = "PASS" | "CONDITIONAL_PASS" | "REJECT"
type AgreementSignal = "BLIND_SPOT_RISK" | "LOW_INDEPENDENCE" | "HEALTHY_DIVERGENCE" | "NORMAL"

interface BoardMemberResult {
  role: string
  role_display_name: string
  provider_used: string
  model_used: string
  score: number
  passed: boolean
  threshold_applied: number
  reasoning: string
  findings: string[]
  strengths: string[]
  recommendations: string[]
  template_prompt_suggestions: string[]
  processing_time_ms: number
  unverified_claims?: Array<{ claim: string; severity: string; location: string }>
  hallucination_risk?: string
  compliance_gaps?: Array<{ framework: string; requirement: string; severity: string }>
  risk_flags?: Array<{ risk_type: string; description: string }>
  challenged_assumptions?: Array<{ assumption: string; counter_argument: string; severity: string }>
  overall_resilience?: string
}

interface BoardAgreementSignal {
  score_spread: number
  mean_score: number
  is_over_agreed: boolean
  is_healthily_divergent: boolean
  signal: AgreementSignal
  note: string
}

interface DracoReviewResult {
  review_id: string
  document_id: string
  verdict: DracoVerdict
  mode: "advisory" | "blocking"
  overall_draco_score: number
  quality_scores: {
    accuracy: number
    completeness: number
    objectivity: number
    citation_integrity: number
    professional_quality: number
    standards_compliance: number
  }
  board_results: {
    evidence_validator: BoardMemberResult
    governance_evaluator: BoardMemberResult
    counterfactual_challenger: BoardMemberResult
  }
  strategic_assessment: {
    score: number
    passed: boolean
    document_purpose_alignment: string
    business_value_assessment: string
    strategic_objectives_covered: string[]
    strategic_objectives_missing: string[]
    alignment_gaps: Array<{ objective: string; gap_description: string; impact: string; recommendation: string }>
    provider_used: string
  }
  model_rotation_used: Array<{ board_role: string; provider: string; model: string }>
  verdict_reasoning: string
  remediation_steps: Array<{
    priority: "critical" | "high" | "medium" | "low"
    dimension: string
    description: string
    action_required: string
    originating_board_member?: string
  }>
  publication_advisory: {
    advisable_to_publish: boolean
    advisory_summary: string
    blocking_enabled: boolean
    override_required?: boolean
    conditions_for_approval?: string[]
  }
  processing_time_ms: number
  created_at: string
  board_agreement?: BoardAgreementSignal
}

// SSE progress event from the server
interface DracoProgressEvent {
  type: "connected" | "convening" | "board_member_started" | "board_member_slow" |
        "board_member_complete" | "board_member_timed_out" |
        "strategic_started" | "strategic_complete" | "verdict_rendering" | "complete" | "failed"
  documentId: string
  message: string
  progress_percent: number
  board_role?: string
  score?: number
  passed?: boolean
  provider?: string
  timestamp: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const VERDICT_CONFIG: Record<DracoVerdict, { label: string; color: string; bg: string; border: string; icon: string }> = {
  PASS: {
    label: "REVIEW BOARD APPROVED",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: "✦",
  },
  CONDITIONAL_PASS: {
    label: "CONDITIONALLY APPROVED",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: "◈",
  },
  REJECT: {
    label: "BOARD CONCERNS RAISED",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    icon: "◉",
  },
}

// UI copy for agreement signal — softened from internal signal names
const AGREEMENT_COPY: Record<AgreementSignal, { label: string; color: string; icon: string }> = {
  BLIND_SPOT_RISK:     { label: "High convergence — review shared assumptions", color: "text-amber-400", icon: "⚠" },
  LOW_INDEPENDENCE:    { label: "Consistent findings across reviewers", color: "text-slate-400", icon: "◦" },
  HEALTHY_DIVERGENCE:  { label: "Strong independent reasoning detected", color: "text-emerald-400", icon: "✦" },
  NORMAL:              { label: "Normal reviewer agreement range", color: "text-slate-400", icon: "◦" },
}

const BOARD_MEMBERS = [
  { key: "evidence_validator",       label: "Evidence Validator",       icon: "⬡", description: "Factual grounding & hallucination detection", color: "blue"   },
  { key: "governance_evaluator",     label: "Governance Evaluator",     icon: "⚖", description: "Compliance & governance risk",              color: "purple" },
  { key: "counterfactual_challenger",label: "Counterfactual Challenger",icon: "⟁", description: "Adversarial critical review",               color: "orange" },
]

const BOARD_MEMBER_PROGRESS = new Map([
  ["evidence_validator",       { started: 15, complete: 50 }],
  ["governance_evaluator",     { started: 20, complete: 60 }],
  ["counterfactual_challenger",{ started: 25, complete: 70 }],
])

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-500/20 text-red-300 border-red-500/30",
  high:     "bg-orange-500/20 text-orange-300 border-orange-500/30",
  medium:   "bg-amber-500/20 text-amber-300 border-amber-500/30",
  low:      "bg-slate-500/20 text-slate-300 border-slate-500/30",
}

// ─── Progressive Loading State ────────────────────────────────────────────────

type BoardMemberStatus = "idle" | "running" | "complete" | "timed_out"

interface ProgressState {
  percent: number
  message: string
  board_status: Record<string, { status: BoardMemberStatus; score?: number; passed?: boolean; startedAt?: number }>
  strategic_started: boolean
  strategic_score?: number
  reviewStartedAt: number | null
}

const INITIAL_PROGRESS: ProgressState = {
  percent: 0,
  message: "",
  board_status: {
    evidence_validator:       { status: "idle" },
    governance_evaluator:     { status: "idle" },
    counterfactual_challenger:{ status: "idle" },
  },
  strategic_started: false,
  reviewStartedAt: null,
}

// ─── Elapsed Timer Hooks ──────────────────────────────────────────────────────
// A ticking clock is the clearest possible signal that the system is alive.
// Users abandon silent UIs after ~8 seconds. A visible seconds counter removes
// all ambiguity: if the clock is moving, the system is working.

function useElapsedSeconds(startedAt: number | null): number {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startedAt) { setElapsed(0); return }
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])
  return elapsed
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function ScoreRing({ score, size = 64, color }: { score: number; size?: number; color: string }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white">{Math.round(score)}</span>
      </div>
    </div>
  )
}

// Progressive loading view — proof-of-life design
// The elapsed timer is the primary trust signal: a clock that moves is
// unambiguous evidence the system is running. No animation substitutes for it.
function ProgressView({ state }: { state: ProgressState }) {
  const totalElapsed = useElapsedSeconds(state.reviewStartedAt)
  const colorMap: Record<string, string> = {
    evidence_validator: "text-blue-400",
    governance_evaluator: "text-purple-400",
    counterfactual_challenger: "text-orange-400",
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-slate-950/60 backdrop-blur-xl p-6 space-y-5">
      {/* Header — total elapsed timer prominently visible */}
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 flex-shrink-0">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500/20 flex items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="text-lg text-violet-400">⬡</motion.div>
          </div>
          <motion.div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500"
            animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-slate-200">Review Board Deliberating</div>
            {/* Total elapsed — the clock proves the system is alive */}
            {state.reviewStartedAt && (
              <div className="flex items-center gap-1 bg-white/5 rounded-md px-2 py-0.5 border border-white/8">
                <span className="text-[10px] text-slate-500">elapsed</span>
                <motion.span
                  key={totalElapsed}
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 1 }}
                  className="text-[11px] font-mono font-semibold text-violet-300 tabular-nums"
                >
                  {formatElapsed(totalElapsed)}
                </motion.span>
              </div>
            )}
          </div>
          <motion.div
            key={state.message}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-slate-400 mt-0.5"
          >
            {state.message || "Preparing independent reviewers…"}
          </motion.div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full"
          animate={{ width: `${state.percent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Board members — showing parallel work */}
      <div className="space-y-2">
        {BOARD_MEMBERS.map(member => {
          const ms = state.board_status[member.key]
          const isRunning = ms?.status === "running"
          const isDone = ms?.status === "complete" || ms?.status === "timed_out"
          const isTimedOut = ms?.status === "timed_out"
          // Each running member gets its own elapsed counter
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const memberElapsed = useElapsedSeconds(isRunning ? (ms?.startedAt ?? state.reviewStartedAt) : null)

          return (
            <motion.div
              key={member.key}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-300 ${
                isDone    ? (isTimedOut ? "border-amber-500/20 bg-amber-500/5" : "border-white/10 bg-white/5") :
                isRunning ? "border-violet-500/25 bg-violet-500/5" :
                "border-white/5 bg-transparent"
              }`}
              animate={{ opacity: ms?.status === "idle" ? 0.4 : 1 }}
            >
              <div className={`text-base ${colorMap[member.key]} transition-all`}>
                {isTimedOut ? "⏱" :
                 isDone ? (ms?.passed ? "✓" : "○") :
                 member.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-300">{member.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {isTimedOut ? "Conservative score applied — reviewer timed out" :
                   isDone ? member.description :
                   isRunning ? "Reviewing document…" :
                   "Waiting to convene"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isDone && ms?.score !== undefined && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${ms.passed ? "text-emerald-400" : "text-red-400"}`}>
                      {Math.round(ms.score)}
                    </span>
                    <span className="text-[10px] text-slate-600">/100</span>
                  </motion.div>
                )}
                {isRunning && (
                  <div className="flex items-center gap-1.5">
                    {/* Per-member elapsed — shows reviewer is actively working */}
                    <motion.span
                      key={memberElapsed}
                      initial={{ opacity: 0.5 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] font-mono text-violet-400/70 tabular-nums"
                    >
                      {formatElapsed(memberElapsed)}
                    </motion.span>
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-[10px] text-violet-400 font-medium"
                    >
                      deliberating
                    </motion.div>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Strategic assessor */}
      {state.strategic_started && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5"
        >
          <div className="text-cyan-400">◎</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-300">Strategic Assessor</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {state.strategic_score !== undefined
                ? `Assessment complete — score: ${Math.round(state.strategic_score)}`
                : "Evaluating strategic alignment…"}
            </div>
          </div>
          {state.strategic_score !== undefined && (
            <span className="text-sm font-bold text-cyan-400">{Math.round(state.strategic_score)}</span>
          )}
        </motion.div>
      )}

      <div className="text-[10px] text-slate-600 text-center border-t border-white/5 pt-3 mt-1">
        All board members carry equal weight — completion order does not reflect priority
      </div>
    </div>
  )
}

function BoardMemberCard({ member, result, isExpanded, onToggle }: {
  member: (typeof BOARD_MEMBERS)[0]
  result: BoardMemberResult
  isExpanded: boolean
  onToggle: () => void
}) {
  const colorMap: Record<string, { ring: string; text: string; bg: string; border: string }> = {
    blue:   { ring: "#3b82f6", text: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/25"   },
    purple: { ring: "#a855f7", text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/25" },
    orange: { ring: "#f97316", text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/25" },
  }
  const c = colorMap[member.color]
  return (
    <motion.div layout className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden cursor-pointer select-none`}
      onClick={onToggle} whileHover={{ scale: 1.005 }}>
      <div className="p-4 flex items-center gap-3">
        <div className={`text-xl font-bold ${c.text}`}>{member.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm">{member.label}</div>
          <div className="text-xs text-slate-400 mt-0.5">{member.description}</div>
          <div className="text-[10px] text-slate-500 mt-1">{result.provider_used} · {result.model_used}</div>
        </div>
        <div className="flex items-center gap-3">
          <ScoreRing score={result.score} size={52} color={result.passed ? "#22c55e" : "#ef4444"} />
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${result.passed ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}`}>
              {result.passed ? "PASSED" : "FAILED"}
            </span>
            <span className="text-[10px] text-slate-500">threshold {result.threshold_applied}</span>
          </div>
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="text-slate-500 text-sm">▾</motion.div>
        </div>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} onClick={e => e.stopPropagation()}>
            <div className="border-t border-white/5 p-4 space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Board Deliberation</div>
                <p className="text-sm text-slate-300 leading-relaxed italic">&ldquo;{result.reasoning}&rdquo;</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {result.findings.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-red-400/70 mb-2">⚠ Issues Found</div>
                    <ul className="space-y-1">
                      {result.findings.slice(0, 4).map((f, i) => (
                        <li key={i} className="text-xs text-slate-400 flex gap-1.5"><span className="text-red-400 mt-0.5 shrink-0">·</span>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.strengths.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-emerald-400/70 mb-2">✦ Strengths</div>
                    <ul className="space-y-1">
                      {result.strengths.slice(0, 4).map((s, i) => (
                        <li key={i} className="text-xs text-slate-400 flex gap-1.5"><span className="text-emerald-400 mt-0.5 shrink-0">·</span>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {result.recommendations.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-2">↗ Recommendations</div>
                  <ul className="space-y-1">
                    {result.recommendations.slice(0, 3).map((r, i) => (
                      <li key={i} className="text-xs text-slate-400 flex gap-1.5"><span className="text-amber-400 mt-0.5 shrink-0">→</span>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="text-[10px] text-slate-600 pt-1 border-t border-white/5">
                Processing time: {(result.processing_time_ms / 1000).toFixed(1)}s
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function QualityDimensionBar({ label, score, threshold }: { label: string; score: number; threshold: number }) {
  const passed = score >= threshold
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${passed ? "text-emerald-400" : "text-red-400"}`}>{Math.round(score)}</span>
          <span className="text-[10px] text-slate-600">/ {threshold}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${passed ? "bg-emerald-500" : "bg-red-500"}`} />
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface DracoReviewPanelProps {
  documentId: string
  initialReview?: DracoReviewResult | null
  /** Called when user clicks "Run Review" — should trigger POST to /draco-review */
  onRequestReview?: () => Promise<DracoReviewResult>
  /** Base URL for the SSE progress endpoint. Defaults to /api/quality-audits/draco-progress */
  progressBaseUrl?: string
}

export function DracoReviewPanel({
  documentId,
  initialReview,
  onRequestReview,
  progressBaseUrl = "/api/quality-audits/draco-progress",
}: DracoReviewPanelProps) {
  const [review, setReview] = useState<DracoReviewResult | null>(initialReview ?? null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<ProgressState>(INITIAL_PROGRESS)
  const [error, setError] = useState<string | null>(null)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"verdict" | "board" | "remediation" | "strategic">("verdict")
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)
  const [overrideReason, setOverrideReason] = useState("")
  const [isOverriding, setIsOverriding] = useState(false)
  const sseRef = useRef<EventSource | null>(null)

  // Subscribe to SSE progress stream
  const startProgressStream = useCallback(() => {
    // Close any existing stream
    sseRef.current?.close()

    const es = new EventSource(`${progressBaseUrl}/${documentId}`)
    sseRef.current = es

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as DracoProgressEvent

        setProgress(prev => {
          const next = { ...prev, percent: event.progress_percent, message: event.message }

          if (event.type === "board_member_started" && event.board_role) {
            next.board_status = {
              ...prev.board_status,
              [event.board_role]: { status: "running", startedAt: Date.now() },
            }
          }
          if ((event.type === "board_member_complete" || event.type === "board_member_timed_out") && event.board_role) {
            next.board_status = {
              ...prev.board_status,
              [event.board_role]: {
                status: event.type === "board_member_timed_out" ? "timed_out" : "complete",
                score: event.score,
                passed: event.passed,
              },
            }
          }
          if (event.type === "board_member_slow" && event.board_role) {
            // Keep running state but update the displayed message (handled via state.message)
          }
          if (event.type === "strategic_started") {
            next.strategic_started = true
          }
          if (event.type === "strategic_complete") {
            next.strategic_score = event.score
          }

          return next
        })

        // Stream auto-closes on terminal events (see route handler)
        if (event.type === "complete" || event.type === "failed") {
          es.close()
          sseRef.current = null
        }
      } catch {
        // malformed event — ignore
      }
    }

    es.onerror = () => {
      es.close()
      sseRef.current = null
    }
  }, [documentId, progressBaseUrl])

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => { sseRef.current?.close() }
  }, [])

  const handleRunReview = async () => {
    if (!onRequestReview) return
    setLoading(true)
    setError(null)
    setReview(null)
    // Start the clock immediately — before the SSE even connects
    setProgress({ ...INITIAL_PROGRESS, reviewStartedAt: Date.now() })

    // Start SSE stream BEFORE making the request so we catch early events
    startProgressStream()

    try {
      const result = await onRequestReview()
      setReview(result)
      setActiveTab("verdict")
    } catch (e: any) {
      setError(e.message ?? "DRACO review failed")
    } finally {
      setLoading(false)
    }
  }

  const handleOverride = async () => {
    if (!review || !overrideReason) return
    setIsOverriding(true)
    try {
      const response = await fetch("/api/quality-audits/draco-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: review.document_id,
          reviewId: review.review_id,
          reason: overrideReason
        })
      })

      if (!response.ok) throw new Error("Failed to record override")
      
      // Update local state: effectively "lift" the override requirement
      setReview(prev => {
        if (!prev) return null
        return {
          ...prev,
          publication_advisory: {
            ...prev.publication_advisory,
            override_required: false,
            advisory_summary: `✅ Human Override Recorded: ${overrideReason}. Governance block lifted. Original verdict remains REJECT for audit history.`
          }
        }
      })
      setShowOverrideDialog(false)
      setOverrideReason("")
    } catch (e: any) {
      setError(e.message ?? "Override failed")
    } finally {
      setIsOverriding(false)
    }
  }

  const toggleMember = (key: string) => {
    setExpandedMember(prev => prev === key ? null : key)
  }

  // ── Empty state ──
  if (!review && !loading) {
    return (
      <div className="rounded-2xl border border-white/8 bg-slate-950/60 backdrop-blur-xl p-8 flex flex-col items-center gap-4 text-center">
        <div className="text-4xl text-slate-600 font-thin">⬡</div>
        <div>
          <div className="text-base font-semibold text-slate-300">DRACO Review Board</div>
          <div className="text-sm text-slate-500 mt-1">No review has been conducted for this document yet.</div>
        </div>
        {onRequestReview && (
          <button id="draco-trigger-review" onClick={handleRunReview}
            className="px-5 py-2 rounded-lg bg-violet-600/80 hover:bg-violet-500/90 text-white text-sm font-medium transition-all border border-violet-500/30 hover:border-violet-400/50">
            Convene Review Board
          </button>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    )
  }

  // ── Progressive loading ──
  if (loading) {
    return <ProgressView state={progress} />
  }

  if (!review) return null

  const verdictCfg = VERDICT_CONFIG[review.verdict]
  const agreement = review.board_agreement
  const agreementCopy = agreement ? AGREEMENT_COPY[agreement.signal] : null

  const QUALITY_THRESHOLDS = {
    accuracy: 90, completeness: 85, objectivity: 80,
    citation_integrity: 85, professional_quality: 82, standards_compliance: 85,
  }

  return (
    <div className="space-y-3 font-['Inter',sans-serif]">
      {/* ── Verdict Banner ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border ${verdictCfg.border} ${verdictCfg.bg} p-5`}>
        <div className="flex items-start gap-4">
          <div className={`text-3xl font-thin ${verdictCfg.color} mt-0.5`}>{verdictCfg.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-xs font-bold tracking-widest ${verdictCfg.color}`}>{verdictCfg.label}</span>
              <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                {review.mode === "advisory" ? "Advisory Mode" : "Blocking Mode"}
              </span>
              {agreementCopy && (
                <span className={`text-[10px] ${agreementCopy.color} flex items-center gap-1`}>
                  <span>{agreementCopy.icon}</span> {agreementCopy.label}
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-4">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-widest">Overall Score</div>
                <div className={`text-4xl font-bold ${verdictCfg.color} leading-none mt-1`}>
                  {Math.round(review.overall_draco_score)}
                  <span className="text-base text-slate-500 font-normal ml-1">/100</span>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed flex-1 min-w-0 border-l border-white/10 pl-4">
                {review.publication_advisory.advisory_summary}
              </p>
            </div>
          </div>
          {onRequestReview && (
            <button id="draco-rerun-review" onClick={handleRunReview} disabled={loading}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-400 border border-white/10 transition-all">
              Re-run
            </button>
          )}
        </div>
        
        {/* 🛡️ OVERRIDE ACTION — Only shown if blocking is active and verdict is REJECT */}
        {review.publication_advisory.override_required && (
          <div className="mt-4 pt-4 border-t border-red-500/20 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <div className="text-xs font-bold text-red-400 uppercase tracking-wider">Governance Block Active</div>
              <p className="text-[11px] text-red-300/70 mt-1">
                This document cannot be approved without a formal human override.
              </p>
            </div>
            <button
              onClick={() => setShowOverrideDialog(true)}
              className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/30 transition-all shadow-lg shadow-red-500/10 whitespace-nowrap"
            >
              🛡️ Provide Human Override
            </button>
          </div>
        )}
      </motion.div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-white/3 rounded-xl border border-white/8 w-fit">
        {(["verdict", "board", "remediation", "strategic"] as const).map(tab => (
          <button key={tab} id={`draco-tab-${tab}`} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
              activeTab === tab ? "bg-white/10 text-white border border-white/15" : "text-slate-500 hover:text-slate-300"
            }`}>
            {tab === "board" ? "Board Members" : tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── VERDICT TAB ── */}
        {activeTab === "verdict" && (
          <motion.div key="verdict" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="rounded-xl border border-white/8 bg-white/3 p-4">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">Quality Dimensions — DRACO Standard</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <QualityDimensionBar label="Accuracy" score={review.quality_scores.accuracy} threshold={QUALITY_THRESHOLDS.accuracy} />
                <QualityDimensionBar label="Completeness" score={review.quality_scores.completeness} threshold={QUALITY_THRESHOLDS.completeness} />
                <QualityDimensionBar label="Objectivity" score={review.quality_scores.objectivity} threshold={QUALITY_THRESHOLDS.objectivity} />
                <QualityDimensionBar label="Citation Integrity" score={review.quality_scores.citation_integrity} threshold={QUALITY_THRESHOLDS.citation_integrity} />
                <QualityDimensionBar label="Professional Quality" score={review.quality_scores.professional_quality} threshold={QUALITY_THRESHOLDS.professional_quality} />
                <QualityDimensionBar label="Standards Compliance" score={review.quality_scores.standards_compliance} threshold={QUALITY_THRESHOLDS.standards_compliance} />
              </div>
            </div>

            {/* Agreement signal — only shown when noteworthy */}
            {agreement && agreement.signal !== "NORMAL" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`rounded-xl border ${agreement.signal === "BLIND_SPOT_RISK" ? "border-amber-500/25 bg-amber-500/5" : "border-emerald-500/20 bg-emerald-500/5"} p-3`}>
                <div className="flex items-start gap-2">
                  <span className={`text-sm ${agreementCopy?.color}`}>{agreementCopy?.icon}</span>
                  <div>
                    <div className={`text-xs font-semibold ${agreementCopy?.color}`}>{agreementCopy?.label}</div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{agreement.note}</p>
                    <div className="text-[10px] text-slate-600 mt-1">Score spread: {agreement.score_spread} pts · Mean: {agreement.mean_score}</div>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="rounded-xl border border-white/8 bg-white/3 p-4">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">Provider Independence — Rotation This Session</div>
              <div className="flex gap-3 flex-wrap">
                {review.model_rotation_used.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 border border-white/8">
                    <span className="text-slate-400 text-xs">
                      {BOARD_MEMBERS.find(m => m.key === r.board_role)?.icon ?? "·"}{" "}
                      {BOARD_MEMBERS.find(m => m.key === r.board_role)?.label ?? r.board_role}
                    </span>
                    <div className="h-3 w-px bg-white/10" />
                    <span className="text-xs font-medium text-slate-300">{r.provider}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── BOARD MEMBERS TAB ── */}
        {activeTab === "board" && (
          <motion.div key="board" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {BOARD_MEMBERS.map(member => {
              const result = review.board_results[member.key as keyof typeof review.board_results]
              if (!result) return null
              return (
                <BoardMemberCard key={member.key} member={member} result={result}
                  isExpanded={expandedMember === member.key} onToggle={() => toggleMember(member.key)} />
              )
            })}
          </motion.div>
        )}

        {/* ── REMEDIATION TAB ── */}
        {activeTab === "remediation" && (
          <motion.div key="remediation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {review.remediation_steps.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
                <div className="text-emerald-400 text-xl mb-2">✦</div>
                <div className="text-sm text-emerald-300">No remediation steps required</div>
                <div className="text-xs text-slate-500 mt-1">Document passed all board checks</div>
              </div>
            ) : (
              <div className="space-y-2">
                {review.remediation_steps.map((step, i) => (
                  <div key={i} className="rounded-xl border border-white/8 bg-white/3 p-4 flex gap-3">
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_BADGE[step.priority]} h-fit mt-0.5 uppercase tracking-wider`}>
                      {step.priority}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-300">{step.dimension}</div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.description}</p>
                      <div className="mt-2 flex items-start gap-1.5">
                        <span className="text-amber-400 text-xs shrink-0 mt-0.5">→</span>
                        <p className="text-xs text-amber-300/80">{step.action_required}</p>
                      </div>
                      {step.originating_board_member && (
                        <div className="mt-2 text-[10px] text-slate-600">
                          From: {BOARD_MEMBERS.find(m => m.key === step.originating_board_member)?.label ?? step.originating_board_member}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── STRATEGIC TAB ── */}
        {activeTab === "strategic" && (
          <motion.div key="strategic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="rounded-xl border border-white/8 bg-white/3 p-5">
              <div className="flex items-start gap-4">
                <ScoreRing score={review.strategic_assessment.score} size={72}
                  color={review.strategic_assessment.passed ? "#22c55e" : "#f59e0b"} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Strategic Value Assessment</div>
                  <div className="text-sm font-semibold text-slate-200 mb-2">
                    Purpose Alignment:{" "}
                    <span className={review.strategic_assessment.document_purpose_alignment === "strong" ? "text-emerald-400" : "text-amber-400"}>
                      {review.strategic_assessment.document_purpose_alignment.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed italic">
                    &ldquo;{review.strategic_assessment.business_value_assessment}&rdquo;
                  </p>
                  <div className="text-[10px] text-slate-600 mt-2">Assessed by: {review.strategic_assessment.provider_used}</div>
                </div>
              </div>
            </div>
            {review.strategic_assessment.alignment_gaps.length > 0 && (
              <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">Alignment Gaps</div>
                <div className="space-y-3">
                  {review.strategic_assessment.alignment_gaps.map((gap, i) => (
                    <div key={i} className="flex gap-3">
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_BADGE[gap.impact]} h-fit mt-0.5 uppercase`}>
                        {gap.impact}
                      </span>
                      <div>
                        <div className="text-xs font-medium text-slate-300">{gap.objective}</div>
                        <p className="text-xs text-slate-400 mt-0.5">{gap.gap_description}</p>
                        <p className="text-xs text-amber-300/80 mt-1">→ {gap.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1">
        <span>Review ID: {review.review_id?.slice(0, 8)}…</span>
        <span>Processing: {(review.processing_time_ms / 1000).toFixed(1)}s · {new Date(review.created_at).toLocaleString()}</span>
      </div>

      {/* ── OVERRIDE DIALOG ── */}
      <AnimatePresence>
        {showOverrideDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-slate-900 shadow-2xl p-6 space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 text-2xl border border-red-500/20 shrink-0">
                  🛡️
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Document Governance Override</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Explain why this document is acceptable for publication despite the DRACO Review Board concerns.
                    This justification will be logged for security auditing.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">
                  Justification / Reasoning
                </label>
                <textarea
                  autoFocus
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g., Factual inaccuracies identified are in a non-critical section; risk is accepted based on [Context]..."
                  className="w-full h-32 bg-slate-950 border border-white/10 rounded-xl p-4 text-sm text-slate-300 focus:outline-none focus:border-red-500/50 transition-all resize-none"
                />
              </div>

              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setShowOverrideDialog(false)}
                  disabled={isOverriding}
                  className="px-4 py-2 rounded-lg text-slate-400 text-sm hover:text-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOverride}
                  disabled={isOverriding || !overrideReason.trim()}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-lg flex items-center gap-2 ${
                    !overrideReason.trim() || isOverriding
                      ? "bg-slate-800 text-slate-600 border border-white/5"
                      : "bg-red-600 hover:bg-red-500 text-white border border-red-400/30"
                  }`}
                >
                  {isOverriding ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Recording...
                    </>
                  ) : (
                    "Authorize Override"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DracoReviewPanel
