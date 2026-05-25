import { defineComponent } from "@openuidev/react-lang"
import { z } from "zod/v4"

/** Shared Bullets component for OpenUI Lang (used by GenUI + project chat libraries). */
export const BulletsDef = defineComponent({
  name: "Bullets",
  description:
    "Bulleted or numbered list. Use for unordered lists inside Accordion sections, status highlights, or any list of items from context.",
  props: z.object({
    title: z.string().optional().describe("List heading"),
    style: z.enum(["bullet", "numbered", "checklist"]).optional().default("bullet"),
    items: z.array(z.string()).describe("List items"),
  }),
  component: ({ props }) => {
    const { BulletsComponent } = require("@/components/openui-chat/components/BulletsComponent")
    const rawItems = props.items
    const items: string[] = Array.isArray(rawItems)
      ? rawItems.map((t) => String(t))
      : typeof rawItems === "string" && rawItems.trim()
        ? [rawItems]
        : []
    return (
      <BulletsComponent
        props={{ title: props.title, style: props.style ?? "bullet" } as any}
        data={items.map((text) => ({ text }))}
      />
    )
  },
})
