import { defineComponent } from "@openuidev/react-lang"
import { z } from "zod/v4"

/** Side-by-side narrative prose — ADPA extension for §1.1-style two-paragraph sections. */
export const TwoColumnProseDef = defineComponent({
  name: "TwoColumnProse",
  description:
    "Two columns of narrative prose (left and right). Use when the layout plan marks twoColumn or REQUIRED_LANG TwoColumnProse — never substitute three stacked TextContent blocks or a column Stack.",
  props: z.object({
    left: z.string().describe("Left column text (first paragraph block)"),
    right: z.string().describe("Right column text (second paragraph block)"),
  }),
  component: ({ props }) => {
    const { TwoColumnProseComponent } = require("@/components/openui-chat/components/TwoColumnProseComponent")
    return <TwoColumnProseComponent props={props as Record<string, unknown>} data={[]} />
  },
})
