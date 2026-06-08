'use client'

import { useState } from 'react'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Target, AlertTriangle, CheckCircle2 } from '@/components/ui/icons-shim'
import { AnimatedCard } from '@/components/animated-layout'
import type { EntityExtractionQuality, ExtractionConcern } from '@/types/adpa'

const PREVIEW_TYPE_COUNT = 6

const CONCERN_LABELS: Record<ExtractionConcern, string> = {
  too_many: 'Too many entities',
  wrong_types: 'Wrong entity types',
  off_context: 'Off-context tags',
  under_extracted: 'Under-extracted',
}

function scoreTone(score: number): string {
  if (score >= 75) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

function volumeStatusLabel(status: EntityExtractionQuality['volumeStatus']): string {
  switch (status) {
    case 'appropriate':
      return 'Appropriate volume'
    case 'elevated':
      return 'Elevated volume'
    case 'high':
      return 'High volume'
    case 'very_high':
      return 'Very high volume'
    case 'low':
      return 'Low volume'
    default:
      return 'Volume unknown'
  }
}

function formatTypeLabel(type: string): string {
  return type.replace(/_/g, ' ')
}

export interface EntityExtractionQualityCardProps {
  quality?: EntityExtractionQuality | null
}

export function EntityExtractionQualityCard({ quality }: EntityExtractionQualityCardProps) {
  const [showAllUnexpected, setShowAllUnexpected] = useState(false)
  const [showAllMissing, setShowAllMissing] = useState(false)

  if (!quality || quality.extractedTypeCount === 0) return null

  const radius = 36
  const circumference = 2 * Math.PI * radius
  const overall = quality.overallFitScore
  const strokeDashoffset = circumference - (overall / 100) * circumference
  const hasConcerns = quality.concerns.length > 0

  const unexpected = quality.unexpectedTypes
  const missing = quality.missingExpectedTypes
  const visibleUnexpected = showAllUnexpected ? unexpected : unexpected.slice(0, PREVIEW_TYPE_COUNT)
  const visibleMissing = showAllMissing ? missing : missing.slice(0, PREVIEW_TYPE_COUNT)

  return (
    <AnimatedCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-sky-500" />
          Entity Extraction Fit
        </CardTitle>
        <CardDescription>
          Are we extracting the right entities — and the right amount?
          {quality.documentProfileLabel ? (
            <> Profile: <span className="font-medium">{quality.documentProfileLabel}</span>.</>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div
            className={`rounded-lg border p-3 ${
              hasConcerns
                ? 'border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/20'
                : 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/20'
            }`}
          >
            <div className="flex items-start gap-2">
              {hasConcerns ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium">{quality.diagnosisHeadline}</p>
                <p className="text-xs text-muted-foreground">{quality.diagnosisDetail}</p>
                {quality.concerns.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {quality.concerns.map((concern) => (
                      <Badge key={concern} variant="outline" className="text-xs">
                        {CONCERN_LABELS[concern]}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0">
              <svg className="h-full w-full -rotate-90" aria-hidden>
                <circle cx="40" cy="40" r={radius} className="stroke-muted" strokeWidth="6" fill="transparent" />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className="stroke-sky-500 transition-all duration-500"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className={`text-lg font-bold ${scoreTone(overall)}`}>{overall}%</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-wide">Overall</span>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Volume</p>
                <p className={`font-semibold ${scoreTone(quality.volumeScore)}`}>
                  {quality.volumeScore}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {quality.totalEntityCount} entities · {volumeStatusLabel(quality.volumeStatus)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Type fit</p>
                <p className={`font-semibold ${scoreTone(quality.typeFitScore)}`}>
                  {quality.typeFitScore}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {quality.matchedTypeCount}/{quality.extractedTypeCount} types match profile
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Context grounded</p>
                <p className={`font-semibold ${scoreTone(quality.contextGroundedScore)}`}>
                  {quality.contextGroundedScore}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {quality.contextBackedTagCount}/{quality.totalTagCount} H8 tags reuse context
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Density</p>
                <p className="font-semibold">
                  {quality.entitiesPer1000Words != null
                    ? `${quality.entitiesPer1000Words}/1k words`
                    : '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {quality.novelTagCount} novel tags · {unexpected.length} unexpected types
                </p>
              </div>
            </div>
          </div>

          {unexpected.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Wrong types for this document
              </p>
              <div className="flex flex-wrap gap-1.5">
                {visibleUnexpected.map((type) => (
                  <Badge key={type} variant="outline" className="text-xs capitalize">
                    {formatTypeLabel(type)}
                  </Badge>
                ))}
              </div>
              {unexpected.length > PREVIEW_TYPE_COUNT ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setShowAllUnexpected((v) => !v)}
                >
                  {showAllUnexpected ? 'Show fewer' : `Show all ${unexpected.length}`}
                </Button>
              ) : null}
            </div>
          ) : quality.documentProfile ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Entity types match the expected profile for this document.
            </p>
          ) : null}

          {missing.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Expected but not extracted
              </p>
              <div className="flex flex-wrap gap-1.5">
                {visibleMissing.map((type) => (
                  <Badge key={type} variant="secondary" className="text-xs capitalize">
                    {formatTypeLabel(type)}
                  </Badge>
                ))}
              </div>
              {missing.length > PREVIEW_TYPE_COUNT ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setShowAllMissing((v) => !v)}
                >
                  {showAllMissing ? 'Show fewer' : `Show all ${missing.length}`}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardContent>
    </AnimatedCard>
  )
}
