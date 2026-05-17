"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OpenUIChatJson } from "@/lib/openui/library"
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react"

interface AlertComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

type AlertVariant = "info" | "warning" | "error" | "success"

const variantConfig: Record<
  AlertVariant,
  { icon: React.ReactNode; classes: string; badgeClass: string; label: string }
> = {
  info: {
    icon: <Info className="h-4 w-4" />,
    classes: "border-blue-200 bg-blue-50 text-blue-900",
    badgeClass: "bg-blue-100 text-blue-900",
    label: "Info",
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
    classes: "border-yellow-200 bg-yellow-50 text-yellow-900",
    badgeClass: "bg-yellow-100 text-yellow-900",
    label: "Warning",
  },
  error: {
    icon: <AlertCircle className="h-4 w-4 text-red-600" />,
    classes: "border-red-200 bg-red-50 text-red-900",
    badgeClass: "bg-red-100 text-red-900",
    label: "Critical",
  },
  success: {
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    classes: "border-emerald-200 bg-emerald-50 text-emerald-900",
    badgeClass: "bg-emerald-100 text-emerald-900",
    label: "Success",
  },
}

export function AlertComponent({ props, data }: AlertComponentProps) {
  const title = (props.title as string) || "Notices"

  // Support single alert via props, or multiple via data array
  const alerts: Array<{ variant: AlertVariant; title: string; message: string }> =
    data.length > 0
      ? data.map((item) => ({
          variant: ((item.variant || item.type || item.severity) as AlertVariant) || "info",
          title: (item.title as string) || "",
          message: (item.message || item.description || item.body || "") as string,
        }))
      : [
          {
            variant: ((props.variant || props.type || "info") as AlertVariant),
            title: (props.alertTitle as string) || title,
            message: (props.message || props.description || "") as string,
          },
        ]

  return (
    <Card className="overflow-hidden border-slate-200 shadow-lg">
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-slate-700">
          Alerts & Notices
          <Badge variant="secondary" className="ml-1">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert, idx) => {
          const variant = variantConfig[alert.variant] || variantConfig.info
          return (
            <Alert key={idx} className={variant.classes}>
              {variant.icon}
              {alert.title && <AlertTitle className="font-semibold">{alert.title}</AlertTitle>}
              {alert.message && <AlertDescription>{alert.message}</AlertDescription>}
            </Alert>
          )
        })}
      </CardContent>
    </Card>
  )
}
