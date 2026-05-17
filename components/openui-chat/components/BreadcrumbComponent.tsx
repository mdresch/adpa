"use client"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { OpenUIChatJson } from "@/lib/openui/library"
import { Navigation } from "lucide-react"

interface BreadcrumbComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

export function BreadcrumbComponent({ props, data }: BreadcrumbComponentProps) {
  const title = (props.title as string) || "Navigation Path"

  // data items: { label, href?, current? }
  const crumbs = data.map((item, idx) => ({
    label: (item.label || item.title || item.name || `Level ${idx + 1}`) as string,
    href: (item.href || item.url || null) as string | null,
    current: (item.current as boolean) || idx === data.length - 1,
  }))

  return (
    <Card className="overflow-hidden border-slate-200 shadow-lg">
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Navigation className="h-5 w-5 text-slate-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {crumbs.length > 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <Breadcrumb>
              <BreadcrumbList>
                {crumbs.map((crumb, idx) => (
                  <span key={idx} className="flex items-center gap-1.5">
                    <BreadcrumbItem>
                      {crumb.current ? (
                        <BreadcrumbPage className="font-semibold text-slate-900">
                          {crumb.label}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink
                          href={crumb.href || "#"}
                          className="text-slate-600 hover:text-slate-900"
                        >
                          {crumb.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {idx < crumbs.length - 1 && <BreadcrumbSeparator />}
                  </span>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No breadcrumb path defined
          </div>
        )}

        {/* Depth summary */}
        {crumbs.length > 1 && (
          <p className="mt-3 text-xs text-slate-400">
            {crumbs.length} levels deep
          </p>
        )}
      </CardContent>
    </Card>
  )
}
