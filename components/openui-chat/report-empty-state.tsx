"use client"

import { ArrowUpRight, Sparkles, Wand2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OpenUIStarterPrompt } from "@/lib/openui/system-prompt"

type ReportEmptyStateProps = {
  disabled?: boolean
  prompts: OpenUIStarterPrompt[]
  onPromptSelect: (prompt: OpenUIStarterPrompt) => void
}

export function ReportEmptyState({ disabled = false, prompts, onPromptSelect }: ReportEmptyStateProps) {
  return (
    <Card className="overflow-hidden border-slate-200 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(16,185,129,0.82))] text-white shadow-2xl shadow-slate-950/10">
      <CardHeader className="space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-3xl font-semibold tracking-tight">OpenUI project chat</CardTitle>
          <p className="max-w-2xl text-sm leading-6 text-white/80">
            Select a project, resume prior threads, and generate richer project responses that use structured components instead of plain text when the prompt calls for it.
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {prompts.map((prompt) => (
          <button
            key={prompt.id}
            className="group rounded-3xl border border-white/15 bg-white/8 p-4 text-left transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled}
            onClick={() => onPromptSelect(prompt)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Wand2 className="h-4 w-4 text-emerald-300" />
                  {prompt.title}
                </div>
                <p className="text-sm leading-6 text-white/72">{prompt.description}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-white/45 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}