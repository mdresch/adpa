"use client"

type ReportCoverHeroProps = {
  imageUrl?: string
  alt?: string
}

export function ReportCoverHeroComponent({
  props,
}: {
  props: Record<string, unknown>
  data?: unknown[]
}) {
  const { imageUrl, alt } = props as ReportCoverHeroProps
  if (!imageUrl || typeof imageUrl !== "string") return null

  return (
    <div className="report-cover-hero relative aspect-[21/9] w-full overflow-hidden rounded-t-lg border-b border-neutral-700/60">
      {/* eslint-disable-next-line @next/next/no-img-element -- static public assets with encoded paths */}
      <img
        src={imageUrl}
        alt={typeof alt === "string" && alt.length > 0 ? alt : "Report cover"}
        className="h-full w-full object-cover"
        loading="eager"
        decoding="async"
      />
    </div>
  )
}
