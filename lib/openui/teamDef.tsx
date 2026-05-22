import { defineComponent } from "@openuidev/react-lang"
import { z } from "zod/v4"

/** Project roster — ADPA extension (not in genui-lib). */
export const TeamDef = defineComponent({
  name: "Team",
  description:
    "Team roster with named members and roles. Use when rows represent people; prefer Table for generic registers (risks, requirements).",
  props: z.object({
    title: z.string().optional().describe("Team section heading"),
    members: z
      .array(
        z.object({
          name: z.string().describe("Full name"),
          role: z.string().describe("Project role or title"),
          department: z.string().optional().describe("Organizational unit"),
          email: z.string().optional().describe("Contact email"),
          responsibility: z.string().optional().describe("Key responsibilities"),
        })
      )
      .describe("Team members"),
  }),
  component: ({ props }) => {
    const { TeamComponent } = require("@/components/openui-chat/components/TeamComponent")
    return (
      <TeamComponent
        props={{ title: props.title } as any}
        data={(props.members as any[]) ?? []}
      />
    )
  },
})
