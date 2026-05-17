/**
 * Form Component
 * Renders interactive forms for data input and editing
 */

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OpenUIChatJson } from "@/lib/openui/library"
import { FileText } from "lucide-react"

interface FormComponentProps {
  props: Record<string, OpenUIChatJson>
  schema?: Record<string, OpenUIChatJson>
}

export function FormComponent({ props, schema }: FormComponentProps) {
  const title = (props.title as string) || "Input Form"
  const fields = (schema?.fields as Array<{ name: string; type: string }>) || []

  return (
    <Card className="overflow-hidden border-slate-200 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {fields.length > 0 ? (
            fields.map((field, idx) => (
              <div key={idx} className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">{field.name}</label>
                <input
                  type={field.type || "text"}
                  placeholder={`Enter ${field.name.toLowerCase()}`}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Form schema not yet defined. Fields will appear once the form structure is provided.
            </div>
          )}
          {fields.length > 0 && (
            <button className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">
              Submit
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
