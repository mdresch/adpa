"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle, RefreshCw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/api"
import { toast } from "@/lib/notify"
import { TemplateRecommendations } from "@/components/templates/TemplateRecommendations"

interface AuditPromptSuggestion {
  id: string
  status: string
}

export function TemplatePromptSuggestionsPanel({ templateId }: { templateId: string }) {
  const [auditPromptSuggestion, setAuditPromptSuggestion] = useState<AuditPromptSuggestion | null>(null)
  const [loadingSuggestion, setLoadingSuggestion] = useState(true)
  const [generatingPromptSuggestion, setGeneratingPromptSuggestion] = useState(false)
  const [applyingPromptSuggestion, setApplyingPromptSuggestion] = useState(false)
  const [recommendationsRefreshKey, setRecommendationsRefreshKey] = useState(0)

  const fetchAuditPromptSuggestion = useCallback(async () => {
    if (!templateId || templateId === "undefined") return

    try {
      setLoadingSuggestion(true)
      const data = await apiClient.get<{ suggestion: AuditPromptSuggestion | null }>(
        `/quality-audits/template-optimization/audit-prompt-suggestion?templateId=${templateId}`,
        { suppressNotFoundError: true },
      )
      setAuditPromptSuggestion(data.suggestion || null)
    } catch (err) {
      console.warn("Failed to fetch audit prompt suggestion:", err)
      setAuditPromptSuggestion(null)
    } finally {
      setLoadingSuggestion(false)
    }
  }, [templateId])

  useEffect(() => {
    fetchAuditPromptSuggestion()
  }, [fetchAuditPromptSuggestion])

  const handleGeneratePromptSuggestion = async () => {
    if (generatingPromptSuggestion) return

    try {
      setGeneratingPromptSuggestion(true)
      const data = await apiClient.post<{
        suggestionId: string
        suggestion?: AuditPromptSuggestion | null
      }>("/quality-audits/template-optimization/audit-prompt-suggestion/generate", {
        templateId,
      })

      setAuditPromptSuggestion(data.suggestion || { id: data.suggestionId, status: "pending_review" })
      setRecommendationsRefreshKey((current) => current + 1)
      toast.success("Prompt suggestion generated from latest audit and added to the Review tab.")
    } catch (err: any) {
      console.error("Failed to generate prompt suggestion:", err)
      toast.error(err.message || "Failed to generate prompt suggestion from audit")
    } finally {
      setGeneratingPromptSuggestion(false)
    }
  }

  const handleApplyPromptSuggestion = async () => {
    if (!auditPromptSuggestion || applyingPromptSuggestion) return

    try {
      setApplyingPromptSuggestion(true)
      await apiClient.post(`/quality-audits/template-optimization/${auditPromptSuggestion.id}/apply`)
      toast.success("Improved system prompt applied to template. Refreshing template...")
      setAuditPromptSuggestion(null)
      setRecommendationsRefreshKey((current) => current + 1)
      if (process.env.NODE_ENV !== "test") {
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (err: any) {
      console.error("Failed to apply prompt suggestion:", err)
      toast.error(err.message || "Failed to apply improved system prompt")
    } finally {
      setApplyingPromptSuggestion(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Audit-Driven Prompt Suggestions
          </CardTitle>
          <CardDescription>
            Generate a reviewable system prompt suggestion from the latest completed audit, then apply it when ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleGeneratePromptSuggestion}
              disabled={generatingPromptSuggestion}
              variant="outline"
              className="border-purple-500/40 text-purple-200 hover:bg-purple-500/10"
            >
              {generatingPromptSuggestion ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate prompt suggestion from audit
            </Button>
            <Button
              onClick={handleApplyPromptSuggestion}
              disabled={applyingPromptSuggestion || loadingSuggestion || !auditPromptSuggestion}
              variant="outline"
              className="border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10"
            >
              {applyingPromptSuggestion ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Apply improved system prompt to template
            </Button>
          </div>
          {!loadingSuggestion && !auditPromptSuggestion && (
            <p className="mt-3 text-xs text-slate-400">
              Generate a prompt suggestion first, or review existing recommendations below.
            </p>
          )}
        </CardContent>
      </Card>

      <TemplateRecommendations key={`${templateId}-${recommendationsRefreshKey}`} templateId={templateId} />
    </div>
  )
}
