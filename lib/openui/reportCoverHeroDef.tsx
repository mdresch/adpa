import { defineComponent } from "@openuidev/react-lang"
import { z } from "zod/v4"

/** Hero image on report cover cards — ADPA extension (static lighthouse library). */
export const ReportCoverHeroDef = defineComponent({
  name: "ReportCoverHero",
  description:
    "Report illustration from /images/report-covers/. Use imageUrl from layout plan hints exactly. Cover: doc-cover. Section: after CardHeader (variant=section). Thumb: small inline pair under TwoColumnProse or between tables (variant=thumb).",
  props: z.object({
    imageUrl: z.string().describe("Public URL e.g. /images/report-covers/..."),
    alt: z.string().optional().describe("Accessible description of the image"),
    variant: z
      .enum(["cover", "section", "thumb"])
      .optional()
      .describe("section = chapter banner; thumb = small inline / gap filler; omit on doc-cover"),
  }),
  component: ({ props }) => {
    const { ReportCoverHeroComponent } = require("@/components/openui-chat/components/ReportCoverHeroComponent")
    return <ReportCoverHeroComponent props={props as Record<string, unknown>} data={[]} />
  },
})
