import { defineComponent } from "@openuidev/react-lang"
import { z } from "zod/v4"

/** Hero image on report cover cards — ADPA extension (static lighthouse library). */
export const ReportCoverHeroDef = defineComponent({
  name: "ReportCoverHero",
  description:
    "Full-width cover image at the top of the doc-cover Card. Use imageUrl from layout plan hints exactly; place before CardHeader.",
  props: z.object({
    imageUrl: z.string().describe("Public URL e.g. /images/report-covers/..."),
    alt: z.string().optional().describe("Accessible description of the image"),
  }),
  component: ({ props }) => {
    const { ReportCoverHeroComponent } = require("@/components/openui-chat/components/ReportCoverHeroComponent")
    return <ReportCoverHeroComponent props={props as Record<string, unknown>} data={[]} />
  },
})
