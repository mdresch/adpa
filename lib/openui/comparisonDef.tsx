import { defineComponent } from "@openuidev/react-lang"
import { z } from "zod/v4"

import { stringRecord } from "./zodRecords"

/** Side-by-side option columns — ADPA extension (not in genui-lib). */
export const ComparisonDef = defineComponent({
  name: "Comparison",
  description:
    "Side-by-side comparison of 2–4 options (in-scope vs out-of-scope, vendor A vs B). Use instead of Table when columns are heterogeneous attribute sets per side.",
  props: z.object({
    title: z.string().optional().describe("Comparison heading"),
    sides: z
      .array(
        z.object({
          name: z.string().describe("Column heading, e.g. 'In-Scope'"),
          highlighted: z.boolean().optional().default(false),
          attributes: stringRecord.describe("Attribute name → value pairs"),
        })
      )
      .describe("Comparison columns"),
  }),
  component: ({ props }) => {
    const { ComparisonComponent } = require("@/components/openui-chat/components/ComparisonComponent")
    return (
      <ComparisonComponent
        props={{ title: props.title } as any}
        data={((props.sides as any[]) ?? []).map((s) => ({
          name: s.name,
          highlighted: s.highlighted ?? false,
          ...s.attributes,
        }))}
      />
    )
  },
})
