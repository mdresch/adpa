"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Shield,
  AlertTriangle,
  RefreshCw,
  FileText,
  Sparkles,
  History,
  Play,
  ArrowRight,
  TrendingUp,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { apiClient } from "@/lib/api"
import { toast } from "@/lib/notify"
import { formatDistanceToNow } from "date-fns"

type AuditListEntry =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>

interface TemplateAudit {
  id: string
  template_id: string
  template_version: number
  status: "pending" | "completed" | "failed"
  trigger_type: "lifecycle" | "manual" | "document_failure"
  overall_score: number | null
  governance_score: number | null
  resilience_score: number | null
  verdict: "pass" | "flagged" | "fail" | null
  governance_findings: AuditListEntry[]
  governance_recommendations: AuditListEntry[]
  compliance_gaps: Array<{
    framework: string
    requirement: string
    gap_description: string
    severity: "minor" | "major" | "critical"
  }>
  challenger_findings: AuditListEntry[]
  challenger_recommendations: AuditListEntry[]
  challenged_assumptions: Array<{
    assumption: string
    counter_argument: string
    severity: "low" | "medium" | "high"
  }>
  logical_vulnerabilities: Array<{
    location: string
    description: string
    severity: "low" | "medium" | "high"
    suggested_fix: string
  }>
  error_message: string | null
  created_at: string
  completed_at: string | null
  document_failure_context?: any
}

function readStringField(value: Record<string, unknown>, key: string) {
  const field = value[key]
  return typeof field === "string" && field.trim().length > 0 ? field.trim() : ""
}

function humanizeKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatAuditListEntry(entry: AuditListEntry): string {
  if (entry === null || entry === undefined) return ""
  if (typeof entry === "string") return entry
  if (typeof entry === "number" || typeof entry === "boolean") return String(entry)

  const framework = readStringField(entry, "framework")
  const requirement = readStringField(entry, "requirement")
  const severity = readStringField(entry, "severity")
  const primaryText =
    readStringField(entry, "recommendation") ||
    readStringField(entry, "description") ||
    readStringField(entry, "gap_description") ||
    readStringField(entry, "suggested_fix") ||
    readStringField(entry, "counter_argument") ||
    readStringField(entry, "assumption")

  const context = [framework, requirement].filter(Boolean).join(": ")
  if (context && primaryText) {
    return `${context} - ${primaryText}${severity ? ` (${severity})` : ""}`
  }
  if (primaryText) return primaryText

  return Object.entries(entry)
    .flatMap(([key, value]) => {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return [`${humanizeKey(key)}: ${String(value)}`]
      }
      return []
    })
    .join("; ")
}

function ScoreRing({ score, size = 56, color }: { score: number | null; size?: number; color: string }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const isValid = score !== null && !isNaN(score)
  const offset = isValid ? circ - (score / 100) * circ : circ
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white">{isValid ? Math.round(score) : 'NA'}</span>
      </div>
    </div>
  )
}

export function TemplateAuditsPanel({ templateId }: { templateId: string }) {
  const [audits, setAudits] = useState<TemplateAudit[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null)

  const fetchAudits = useCallback(async (showLoading = false) => {
    if (!templateId || templateId === 'undefined') return
    try {
      if (showLoading) setLoading(true)
      const data = await apiClient.get<{ audits: TemplateAudit[] }>(`/document-templates/${templateId}/audits`)
      setAudits(data.audits || [])
    } catch (err: any) {
      console.error("Failed to fetch template audits:", err)
      setError(err.message || "Failed to load template audits")
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [templateId])

  // Initial fetch
  useEffect(() => {
    fetchAudits(true)
  }, [fetchAudits])

  // Setup background polling if any audit is pending
  useEffect(() => {
    const hasPending = audits.some(a => a.status === 'pending')
    if (!hasPending) return

    const interval = setInterval(() => {
      fetchAudits(false)
    }, 3000)

    return () => clearInterval(interval)
  }, [audits, fetchAudits])

  const handleRunAudit = async () => {
    if (triggering) return
    try {
      setTriggering(true)
      await apiClient.post(`/document-templates/${templateId}/audit`)
      toast.success("Template audit triggered successfully. Running in background...")
      fetchAudits(false)
    } catch (err: any) {
      console.error("Failed to run manual audit:", err)
      toast.error(err.message || "Failed to start audit")
    } finally {
      setTriggering(false)
    }
  }

  const getVerdictDetails = (verdict: string | null, status: string) => {
    if (status === 'pending') {
      return {
        label: "AUDITING",
        color: "text-blue-400 border-blue-500/20 bg-blue-500/10",
        ringColor: "#3b82f6"
      }
    }
    if (status === 'failed') {
      return {
        label: "ERROR",
        color: "text-slate-400 border-slate-500/20 bg-slate-500/10",
        ringColor: "#64748b"
      }
    }
    switch (verdict) {
      case 'pass':
        return {
          label: "PASSED",
          color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
          ringColor: "#10b981"
        }
      case 'flagged':
        return {
          label: "FLAGGED",
          color: "text-amber-400 border-amber-500/20 bg-amber-500/10",
          ringColor: "#f59e0b"
        }
      case 'fail':
        return {
          label: "FAILED",
          color: "text-red-400 border-red-500/20 bg-red-500/10",
          ringColor: "#ef4444"
        }
      default:
        return {
          label: "UNKNOWN",
          color: "text-slate-400 border-slate-500/20 bg-slate-500/10",
          ringColor: "#64748b"
        }
    }
  }

  const getTriggerLabel = (type: string) => {
    switch (type) {
      case 'manual':
        return "Manual Run"
      case 'lifecycle':
        return "Lifecycle Trigger (Save/Edit)"
      case 'document_failure':
        return "Closed-Loop feedback (Low Doc Quality)"
      default:
        return type
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedAuditId(expandedAuditId === id ? null : id)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading template audits...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Failed to load template audits</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const pendingCount = audits.filter(a => a.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Header / Actions Card */}
      <div className="space-y-4 border border-white/10 rounded-xl p-4 bg-white/5 backdrop-blur-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">DRACO Compliance & Security Audits</h3>
            <p className="text-xs text-slate-400 mt-1">
              Audits enforce rules matching TOGAF, SABSA, and PMBOK framework guidelines.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-blue-400 animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Running {pendingCount} background audit{pendingCount !== 1 ? 's' : ''}...</span>
              </div>
            )}
            <Button
              onClick={handleRunAudit}
              disabled={triggering || pendingCount > 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg transition duration-200"
            >
              <Play className="h-4 w-4 mr-2" />
              Trigger Audit
            </Button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {audits.length === 0 ? (
        <div className="border border-white/5 bg-white/2 rounded-xl py-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-slate-500 opacity-60 mb-4" />
          <h4 className="text-sm font-semibold text-white">No Audits Performed Yet</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2">
            Trigger a manual audit or edit the template to initialize compliance auditing.
          </p>
          <Button
            onClick={handleRunAudit}
            disabled={triggering}
            variant="outline"
            className="mt-4 border-slate-700 hover:bg-white/5"
          >
            Run First Audit
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {audits.map((audit) => {
            const isExpanded = expandedAuditId === audit.id
            const details = getVerdictDetails(audit.verdict, audit.status)
            
            return (
              <div 
                key={audit.id} 
                className={`border rounded-xl transition duration-200 overflow-hidden ${
                  isExpanded 
                    ? "border-indigo-500/50 bg-white/5" 
                    : "border-white/5 bg-white/2 hover:bg-white/3"
                }`}
              >
                {/* Header Summary Row */}
                <div 
                  onClick={() => toggleExpand(audit.id)}
                  className="flex items-center justify-between p-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-4">
                    {/* Ring Score */}
                    {audit.status === 'completed' && audit.overall_score !== null ? (
                      <ScoreRing score={audit.overall_score} size={48} color={details.ringColor} />
                    ) : (
                      <div className="h-12 w-12 rounded-full border border-dashed border-white/10 flex items-center justify-center">
                        <Clock className={`h-5 w-5 ${audit.status === 'pending' ? 'animate-spin text-blue-400' : 'text-slate-500'}`} />
                      </div>
                    )}
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">Version {audit.template_version}</span>
                        <Badge className={`text-[10px] font-bold px-2 py-0.5 border ${details.color}`}>
                          {details.label}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                        <span>Trigger: <strong className="text-slate-300">{getTriggerLabel(audit.trigger_type)}</strong></span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(audit.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {audit.status === 'completed' && (
                      <div className="hidden md:flex items-center gap-4 text-xs text-slate-400">
                        <div className="text-center">
                          <p className="font-semibold text-white">{audit.governance_score ?? 'NA'}</p>
                          <p className="text-[10px] text-slate-500">Governance</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-white">{audit.resilience_score ?? 'NA'}</p>
                          <p className="text-[10px] text-slate-500">Resilience</p>
                        </div>
                      </div>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Card Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="border-t border-white/5 bg-black/20"
                    >
                      <div className="p-5 space-y-6">
                        {/* Error Message */}
                        {audit.status === 'failed' && audit.error_message && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Audit Execution Error</AlertTitle>
                            <AlertDescription>{audit.error_message}</AlertDescription>
                          </Alert>
                        )}

                        {/* Closed-Loop failure context banner */}
                        {audit.trigger_type === 'document_failure' && audit.document_failure_context && (
                          <div className="border border-red-500/20 bg-red-950/20 rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
                              <AlertTriangle className="h-4 w-4" />
                              <span>Closed-Loop Failure Trigger Event</span>
                            </div>
                            <p className="text-xs text-red-200">
                              This audit was automatically triggered because a document generated from this template scored <strong>{audit.document_failure_context.documentScore}/100</strong>.
                            </p>
                          </div>
                        )}

                        {audit.status === 'completed' && (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Governance Evaluator Card */}
                            <Card className="border-white/5 bg-white/2">
                              <CardHeader className="pb-3 border-b border-white/5">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-400">
                                  <Shield className="h-4 w-4" />
                                  Governance Evaluator Board Member
                                </CardTitle>
                                <CardDescription className="text-[11px] text-slate-400">
                                  Audits compliance and rules enforcement against stated architecture frameworks.
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="pt-4 space-y-5">
                                <div>
                                  <h5 className="text-xs font-semibold text-white mb-2">Findings</h5>
                                  <ul className="list-disc pl-4 space-y-1">
                                    {(audit.governance_findings || []).map((finding, idx) => (
                                      <li key={idx} className="text-xs text-slate-300">{formatAuditListEntry(finding)}</li>
                                    ))}
                                    {(audit.governance_findings || []).length === 0 && (
                                      <p className="text-xs text-slate-500 italic">No specific findings logged.</p>
                                    )}
                                  </ul>
                                </div>
                                
                                <div>
                                  <h5 className="text-xs font-semibold text-white mb-2">Compliance Gaps</h5>
                                  <div className="border border-white/5 rounded-lg overflow-hidden bg-black/10">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-white/5 text-slate-400 font-semibold border-b border-white/5">
                                          <th className="p-2">Framework</th>
                                          <th className="p-2">Requirement</th>
                                          <th className="p-2">Severity</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(audit.compliance_gaps || []).map((gap, idx) => (
                                          <React.Fragment key={idx}>
                                            <tr className="border-b border-white/5 text-slate-200">
                                              <td className="p-2 font-medium">{gap.framework}</td>
                                              <td className="p-2">{gap.requirement}</td>
                                              <td className="p-2">
                                                <Badge variant="outline" className={`text-[10px] px-2 ${
                                                  gap.severity === 'critical' ? 'text-red-400 border-red-500/20 bg-red-500/5' :
                                                  gap.severity === 'major' ? 'text-amber-400 border-amber-500/20 bg-amber-500/5' :
                                                  'text-slate-400 border-white/10'
                                                }`}>
                                                  {gap.severity}
                                                </Badge>
                                              </td>
                                            </tr>
                                            <tr>
                                              <td colSpan={3} className="p-2 pt-0 text-[11px] text-slate-400 bg-white/1">
                                                {gap.gap_description}
                                              </td>
                                            </tr>
                                          </React.Fragment>
                                        ))}
                                        {(audit.compliance_gaps || []).length === 0 && (
                                          <tr>
                                            <td colSpan={3} className="p-3 text-center text-xs text-slate-500 italic">
                                              No compliance gaps identified.
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                <div>
                                  <h5 className="text-xs font-semibold text-white mb-2">Remediation Guidelines</h5>
                                  <ul className="list-disc pl-4 space-y-1">
                                    {(audit.governance_recommendations || []).map((rec, idx) => (
                                      <li key={idx} className="text-xs text-slate-300">{formatAuditListEntry(rec)}</li>
                                    ))}
                                    {(audit.governance_recommendations || []).length === 0 && (
                                      <p className="text-xs text-slate-500 italic">No recommendations provided.</p>
                                    )}
                                  </ul>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Counterfactual Challenger Card */}
                            <Card className="border-white/5 bg-white/2">
                              <CardHeader className="pb-3 border-b border-white/5">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-orange-400">
                                  <Sparkles className="h-4 w-4" />
                                  Counterfactual Challenger Board Member
                                </CardTitle>
                                <CardDescription className="text-[11px] text-slate-400">
                                  Stresses template instructions, loops, and vagueness to prevent AI hallucinations.
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="pt-4 space-y-5">
                                <div>
                                  <h5 className="text-xs font-semibold text-white mb-2">Findings</h5>
                                  <ul className="list-disc pl-4 space-y-1">
                                    {(audit.challenger_findings || []).map((finding, idx) => (
                                      <li key={idx} className="text-xs text-slate-300">{formatAuditListEntry(finding)}</li>
                                    ))}
                                    {(audit.challenger_findings || []).length === 0 && (
                                      <p className="text-xs text-slate-500 italic">No specific loopholes logged.</p>
                                    )}
                                  </ul>
                                </div>

                                <div>
                                  <h5 className="text-xs font-semibold text-white mb-2">Logical Vulnerabilities</h5>
                                  <div className="border border-white/5 rounded-lg overflow-hidden bg-black/10">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-white/5 text-slate-400 font-semibold border-b border-white/5">
                                          <th className="p-2">Location</th>
                                          <th className="p-2">Description</th>
                                          <th className="p-2">Severity</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(audit.logical_vulnerabilities || []).map((vuln, idx) => (
                                          <React.Fragment key={idx}>
                                            <tr className="border-b border-white/5 text-slate-200">
                                              <td className="p-2 font-medium">{vuln.location}</td>
                                              <td className="p-2">{vuln.description}</td>
                                              <td className="p-2">
                                                <Badge variant="outline" className={`text-[10px] px-2 ${
                                                  vuln.severity === 'high' ? 'text-red-400 border-red-500/20 bg-red-500/5' :
                                                  vuln.severity === 'medium' ? 'text-amber-400 border-amber-500/20 bg-amber-500/5' :
                                                  'text-slate-400 border-white/10'
                                                }`}>
                                                  {vuln.severity}
                                                </Badge>
                                              </td>
                                            </tr>
                                            <tr>
                                              <td colSpan={3} className="p-2 pt-0 text-[11px] text-slate-400 bg-white/1">
                                                💡 Suggested Fix: {vuln.suggested_fix}
                                              </td>
                                            </tr>
                                          </React.Fragment>
                                        ))}
                                        {(audit.logical_vulnerabilities || []).length === 0 && (
                                          <tr>
                                            <td colSpan={3} className="p-3 text-center text-xs text-slate-500 italic">
                                              No logical vulnerabilities identified.
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                <div>
                                  <h5 className="text-xs font-semibold text-white mb-2">Prompt Sharpening Guidelines</h5>
                                  <ul className="list-disc pl-4 space-y-1">
                                    {(audit.challenger_recommendations || []).map((rec, idx) => (
                                      <li key={idx} className="text-xs text-slate-300">{formatAuditListEntry(rec)}</li>
                                    ))}
                                    {(audit.challenger_recommendations || []).length === 0 && (
                                      <p className="text-xs text-slate-500 italic">No recommendations provided.</p>
                                    )}
                                  </ul>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
