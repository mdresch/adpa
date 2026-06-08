'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Gauge } from '@/components/ui/icons-shim'
import { AnimatedCard } from '@/components/animated-layout'
import type { ContextConsistencyStats } from '@/types/adpa'

const PREVIEW_WIN_COUNT = 8

function formatMatchMethod(method?: string): string | null {
  if (!method) return null
  if (method === 'exact') return 'exact'
  if (method === 'jaro_winkler') return 'fuzzy'
  return method.replace(/_/g, ' ')
}

export interface ContextConsistencyCardProps {
  stats?: ContextConsistencyStats | null
  occurrenceConsistencyScore?: number | null
  contextMatchingScore?: number | null
  entitiesPageHref?: string
}

export function ContextConsistencyCard({
  stats,
  occurrenceConsistencyScore,
  contextMatchingScore,
  entitiesPageHref,
}: ContextConsistencyCardProps) {
  const [showAllWins, setShowAllWins] = useState(false)

  if (!stats && occurrenceConsistencyScore == null) return null

  const consistencyScore =
    occurrenceConsistencyScore ??
    stats?.occurrenceConsistencyScore ??
    0
  const wins = stats?.winsByEntity ?? []
  const visibleWins = showAllWins ? wins : wins.slice(0, PREVIEW_WIN_COUNT)

  const radius = 36
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (consistencyScore / 100) * circumference

  return (
    <AnimatedCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-emerald-500" />
          Context Consistency
        </CardTitle>
        <CardDescription>
          H8 inline tags matched against project context during generation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0">
              <svg className="h-full w-full -rotate-90" aria-hidden>
                <circle cx="40" cy="40" r={radius} className="stroke-muted" strokeWidth="6" fill="transparent" />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className="stroke-emerald-500 transition-all duration-500"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-bold">{consistencyScore}%</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-wide">Tag Reuse</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Occurrence consistency</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Each H8 tag that reuses project context counts as a win — repeated mentions strengthen consistency.
              </p>
              {contextMatchingScore != null && contextMatchingScore > 0 ? (
                <p className="text-[10px] text-muted-foreground mt-1">
                  CUR (unique entities): {contextMatchingScore}%
                </p>
              ) : null}
            </div>
          </div>

          {stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t">
              <div className="text-center p-2 bg-emerald-500/10 rounded border border-emerald-500/20">
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.consistencyWins}
                </div>
                <div className="text-[9px] text-muted-foreground uppercase font-medium">Consistency Wins</div>
                {stats.totalOccurrences > 0 ? (
                  <div className="text-[8px] text-muted-foreground">of {stats.totalOccurrences} tags</div>
                ) : null}
              </div>
              <div className="text-center p-2 bg-muted/40 rounded">
                <div className="text-base font-bold">{stats.uniqueEntitiesTagged}</div>
                <div className="text-[9px] text-muted-foreground uppercase font-medium">Unique Tagged</div>
              </div>
              <div className="text-center p-2 bg-muted/40 rounded">
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.uniqueContextEntitiesReused}
                </div>
                <div className="text-[9px] text-muted-foreground uppercase font-medium">Context Reused</div>
              </div>
              <div className="text-center p-2 bg-muted/40 rounded">
                <div className="text-base font-bold">{stats.totalOccurrences}</div>
                <div className="text-[9px] text-muted-foreground uppercase font-medium">H8 Occurrences</div>
              </div>
            </div>
          ) : null}

          {wins.length > 0 ? (
            <div className="pt-3 border-t space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Consistency wins by entity
                </p>
                {wins.length > PREVIEW_WIN_COUNT ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowAllWins((prev) => !prev)}
                  >
                    {showAllWins ? 'Show less' : `Show all ${wins.length}`}
                  </Button>
                ) : null}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {visibleWins.map((win) => {
                  const methodLabel = formatMatchMethod(win.method)
                  return (
                    <div
                      key={`${win.type}-${win.name}`}
                      className="flex items-start justify-between gap-2 text-xs rounded-md border border-border/60 px-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate" title={win.name}>
                          {win.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 capitalize">
                            {win.type.replace(/_/g, ' ')}
                          </Badge>
                          {methodLabel ? (
                            <span className="text-[10px] text-muted-foreground">{methodLabel}</span>
                          ) : null}
                          {win.matchScore < 1 ? (
                            <span className="text-[10px] text-muted-foreground">
                              {Math.round(win.matchScore * 100)}% match
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                      >
                        {win.occurrences}×
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {entitiesPageHref ? (
            <div className="pt-2 border-t">
              <Link
                href={entitiesPageHref}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                Open full entity consistency dashboard
              </Link>
            </div>
          ) : null}
        </div>
      </CardContent>
    </AnimatedCard>
  )
}
