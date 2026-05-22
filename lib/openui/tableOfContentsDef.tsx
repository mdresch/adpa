import { defineComponent } from "@openuidev/react-lang"
import { z } from "zod/v4"

/** Section navigation for long answers — ADPA extension (not in genui-lib). */
export const TableOfContentsDef = defineComponent({
  name: "TableOfContents",
  description:
    "Navigation list of section titles for long multi-section answers (4+ sections). Place at the top of a Stack; list only headings grounded in context.",
  props: z.object({
    title: z.string().optional().describe("Usually 'Table of Contents'"),
    entries: z
      .array(
        z.object({
          title: z.string().describe("Section title as it appears in the answer"),
          level: z
            .union([z.literal(1), z.literal(2), z.literal(3)])
            .optional()
            .describe("1 = major, 2 = subsection"),
        })
      )
      .describe("Section headings in order"),
  }),
  component: ({ props }) => {
    const { TableOfContentsComponent } = require("@/components/openui-chat/components/TableOfContentsComponent")
    return <TableOfContentsComponent props={props as Record<string, unknown>} data={[]} />
  },
})
