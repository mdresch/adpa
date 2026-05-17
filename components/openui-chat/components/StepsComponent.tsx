"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { OpenUIChatJson } from "@/lib/openui/library"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"

interface StepsComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

type StepStatus = "completed" | "current" | "pending"

export function StepsComponent({ props, data }: StepsComponentProps) {
  const title = (props.title as string) || "Process Steps"
  const currentStep = (props.currentStep as number) ?? 0

  const steps = data.map((item, idx) => ({
    title: (item.title || item.name || `Step ${idx + 1}`) as string,
    description: (item.description || item.detail || "") as string,
    status: item.status
      ? (item.status as StepStatus)
      : idx < currentStep
      ? "completed"
      : idx === currentStep
      ? "current"
      : "pending",
  }))

  const completedCount = steps.filter((s) => s.status === "completed").length
  const progressPct = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0

  return (
    <Card className="overflow-hidden border-slate-200 shadow-lg">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Badge variant="secondary" className="bg-violet-100 text-violet-900">
            {completedCount}/{steps.length} done
          </Badge>
        </div>
        {steps.length > 0 && (
          <Progress value={progressPct} className="h-1.5" />
        )}
      </CardHeader>
      <CardContent>
        <ol className="space-y-5">
          {steps.map((step, idx) => {
            const isCompleted = step.status === "completed"
            const isCurrent = step.status === "current"

            return (
              <li key={idx} className="flex gap-4">
                {/* Step indicator */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      isCompleted
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : isCurrent
                        ? "border-violet-600 bg-violet-50 text-violet-600"
                        : "border-slate-300 bg-white text-slate-400"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isCurrent ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="text-xs font-bold">{idx + 1}</span>
                    )}
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`mt-1 h-10 w-0.5 ${
                        isCompleted ? "bg-emerald-300" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>

                {/* Step content */}
                <div className="pb-2 pt-1">
                  <p
                    className={`font-semibold text-sm ${
                      isCompleted
                        ? "text-emerald-700"
                        : isCurrent
                        ? "text-violet-700"
                        : "text-slate-500"
                    }`}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{step.description}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>

        {steps.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No steps defined
          </div>
        )}
      </CardContent>
    </Card>
  )
}
