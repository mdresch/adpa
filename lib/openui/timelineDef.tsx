import { defineComponent } from "@openuidev/react-lang"
import { z } from "zod/v4"

/** Chronological milestones — ADPA extension (not in genui-lib). */
export const TimelineDef = defineComponent({
  name: "Timeline",
  description:
    "Chronological milestones or phase gates with dates/labels and optional status. Use for roadmaps and schedules; prefer over Steps when items have dates or phase names.",
  props: z.object({
    title: z.string().optional().describe("Timeline heading"),
    milestones: z
      .array(
        z.object({
          date: z.string().describe("Date or phase label, e.g. '2025-10-01' or 'Phase 1'"),
          title: z.string().describe("Milestone name"),
          description: z.string().optional().describe("Additional context"),
          status: z.enum(["completed", "in-progress", "upcoming"]).optional(),
        })
      )
      .describe("Ordered list of milestones"),
  }),
  component: ({ props }) => {
    const { TimelineComponent } = require("@/components/openui-chat/components/TimelineComponent")
    return (
      <TimelineComponent
        props={{ title: props.title } as any}
        data={(props.milestones as any[]) ?? []}
      />
    )
  },
})
