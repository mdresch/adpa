"use client"

import { FileStack, Sparkles, Telescope } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { extractMessageText, type OpenUIChatJson } from "@/lib/openui/library"

type ReportComponentsProps = {
  payload: OpenUIChatJson
}

export function ReportComponents({ payload }: ReportComponentsProps) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return (
      <Card className="border-slate-200 bg-white/90 shadow-sm">
        <CardContent className="pt-6 text-sm text-slate-600">
          {extractMessageText(payload) || "Structured response ready."}
        </CardContent>
      </Card>
    )
  }

  const record = payload as Record<string, OpenUIChatJson>
  const props = record.props && typeof record.props === "object" && !Array.isArray(record.props)
    ? (record.props as Record<string, OpenUIChatJson>)
    : {}

  const title = typeof props.title === "string" ? props.title : "Project report"
  const synopsis = typeof props.synopsis === "string" ? props.synopsis : "No synopsis available yet."
  const supportingEvidence = typeof props.supportingEvidence === "number" ? props.supportingEvidence : 0
  const prompt = typeof props.prompt === "string" ? props.prompt : ""

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-emerald-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_rgba(255,255,255,0.92)_45%)] shadow-lg shadow-emerald-100/60">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-slate-950 text-white hover:bg-slate-950">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Report mode
            </Badge>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-900">
              <Telescope className="mr-1 h-3.5 w-3.5" />
              {supportingEvidence} sources
            </Badge>
          </div>
          <CardTitle className="text-2xl text-slate-950">{title}</CardTitle>
          <p className="max-w-3xl text-sm leading-6 text-slate-700">{synopsis}</p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600">
              <FileStack className="h-4 w-4 text-emerald-600" />
              Source-driven synopsis
            </div>
            <p className="text-sm leading-7 text-slate-700">{synopsis}</p>
          </div>
          <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-50 shadow-sm">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Prompt</div>
              <p className="mt-2 text-sm leading-6 text-slate-100">{prompt || "No explicit prompt captured."}</p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Generated outcome</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                This report payload is ready to drive richer in-app report views, export flows, or executive summaries.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}