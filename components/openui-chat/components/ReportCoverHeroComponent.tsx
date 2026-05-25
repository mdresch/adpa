"use client"

import { coerceReportCoverImageUrl } from "@/lib/openui/reportCoverImages"

type ReportCoverHeroProps = {
  imageUrl?: string
  alt?: string
  /** `section` = in-chapter banner; `thumb` = small inline / gap filler */
  variant?: "cover" | "section" | "thumb"
}

export function ReportCoverHeroComponent({
  props,
}: {
  props: Record<string, unknown>
  data?: unknown[]
}) {
  const { imageUrl, alt, variant } = props as ReportCoverHeroProps
  const safeUrl = coerceReportCoverImageUrl(
    typeof imageUrl === "string" ? imageUrl : undefined
  )
  if (!safeUrl) return null

  const isSection = variant === "section"
  const isThumb = variant === "thumb"

  return (
    <div
      className={
        isThumb
          ? "report-thumb-hero relative aspect-[4/3] min-h-[5.5rem] w-full overflow-hidden rounded-md border border-dashed border-neutral-500/50 bg-neutral-900/20 my-2"
          : isSection
            ? "report-section-hero relative aspect-[2/1] w-full overflow-hidden rounded-md border border-neutral-700/40 my-3"
            : "report-cover-hero relative aspect-[21/9] w-full overflow-hidden rounded-t-lg border-b border-neutral-700/60"
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static public assets with encoded paths */}
      <img
        src={safeUrl}
        alt={
          typeof alt === "string" && alt.length > 0
            ? alt
            : isThumb
              ? "Report illustration"
              : isSection
                ? "Section illustration"
                : "Report cover"
        }
        className="h-full w-full object-cover"
        loading="eager"
        decoding="async"
      />
    </div>
  )
}
