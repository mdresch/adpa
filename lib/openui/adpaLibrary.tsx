/**
 * ADPA OpenUI Library
 * Defines the full ADPA component library using @openuidev/react-lang.
 * The LLM generates OpenUI Lang XML; <Renderer> parses and renders it on the client.
 */

import { createLibrary, defineComponent } from "@openuidev/react-lang"
import { z } from "zod/v4"
import type { ReactNode } from "react"

// ─── Table ────────────────────────────────────────────────────────────────────
const TableDef = defineComponent({
  name: "Table",
  description: "Renders tabular data with column headers and rows. Use for registers, lists of stakeholders, deliverables, risks, or any matrix-style data.",
  props: z.object({
    title: z.string().optional().describe("Section heading for the table"),
    columns: z.array(z.string()).optional().describe("Column headers (inferred from row keys if omitted)"),
    rows: z.array(z.record(z.any())).describe("Array of row objects, keys match column headers"),
    striped: z.boolean().optional().default(false).describe("Alternate row shading"),
  }),
  component: ({ props }) => {
    const { TableComponent } = require("@/components/openui-chat/components/TableComponent")
    const rows = (props.rows as Record<string, unknown>[]) ?? []
    const columns = (props.columns as string[]) ?? (rows[0] ? Object.keys(rows[0]) : [])
    return (
      <TableComponent
        props={{ title: props.title, ...props } as any}
        data={rows}
      />
    )
  },
})

// ─── Chart ────────────────────────────────────────────────────────────────────
const ChartDef = defineComponent({
  name: "Chart",
  description: "Renders a bar, pie, or line chart. Use for budgets, resource allocation, metrics, or any quantitative comparison.",
  props: z.object({
    title: z.string().optional().describe("Chart title"),
    chartType: z.enum(["bar", "pie", "line", "donut"]).default("bar").describe("Chart type"),
    data: z.array(z.object({
      label: z.string().describe("Category or series name"),
      value: z.number().describe("Numeric value"),
      color: z.string().optional().describe("Hex color override"),
    })).describe("Chart data points"),
  }),
  component: ({ props }) => {
    const { ChartComponent } = require("@/components/openui-chat/components/ChartComponent")
    return (
      <ChartComponent
        props={{ ...props, chartType: props.chartType ?? "bar" } as any}
        data={(props.data as any[]) ?? []}
      />
    )
  },
})

// ─── Timeline ─────────────────────────────────────────────────────────────────
const TimelineDef = defineComponent({
  name: "Timeline",
  description: "Renders a chronological sequence of milestones or phases. Use for project schedules, roadmaps, or phase gates.",
  props: z.object({
    title: z.string().optional().describe("Timeline heading"),
    milestones: z.array(z.object({
      date: z.string().describe("Date or phase label, e.g. '2025-10-01' or 'Phase 1'"),
      title: z.string().describe("Milestone name"),
      description: z.string().optional().describe("Additional context"),
      status: z.enum(["completed", "in-progress", "upcoming"]).optional(),
    })).describe("Ordered list of milestones"),
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

// ─── Card ─────────────────────────────────────────────────────────────────────
const CardDef = defineComponent({
  name: "Card",
  description: "Renders a structured info card with key-value fields. Use for project overview, authorization details, or single-entity summaries.",
  props: z.object({
    title: z.string().optional().describe("Card heading"),
    subtitle: z.string().optional().describe("Card subheading or section label"),
    fields: z.record(z.string()).optional().describe("Key-value pairs to display in the card body"),
    children: z.any().optional().describe("Nested OpenUI components inside this card"),
  }),
  component: ({ props, renderNode }) => {
    const { CardComponent } = require("@/components/openui-chat/components/CardComponent")
    const fieldRows = props.fields ? Object.entries(props.fields as Record<string, string>).map(([k, v]) => ({ title: k, value: v })) : []
    return (
      <CardComponent
        props={{ title: props.title, subtitle: props.subtitle } as any}
        data={fieldRows}
      />
    )
  },
})

// ─── Team ─────────────────────────────────────────────────────────────────────
const TeamDef = defineComponent({
  name: "Team",
  description: "Renders a team roster with member cards showing name, role, department, email, and responsibilities. Use for governance boards, stakeholder registers, or project teams.",
  props: z.object({
    title: z.string().optional().describe("Team section heading"),
    members: z.array(z.object({
      name: z.string().describe("Full name"),
      role: z.string().describe("Project role or title"),
      department: z.string().optional().describe("Organizational unit"),
      email: z.string().optional().describe("Contact email"),
      responsibility: z.string().optional().describe("Key responsibilities"),
    })).describe("Team members"),
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

// ─── Bullets ──────────────────────────────────────────────────────────────────
const BulletsDef = defineComponent({
  name: "Bullets",
  description: "Renders a bulleted or numbered list. Use for objectives, requirements, assumptions, lessons learned, or any list of items.",
  props: z.object({
    title: z.string().optional().describe("List heading"),
    style: z.enum(["bullet", "numbered", "checklist"]).optional().default("bullet"),
    items: z.array(z.string()).describe("List items"),
  }),
  component: ({ props }) => {
    const { BulletsComponent } = require("@/components/openui-chat/components/BulletsComponent")
    return (
      <BulletsComponent
        props={{ title: props.title, style: props.style ?? "bullet" } as any}
        data={((props.items as string[]) ?? []).map(text => ({ text }))}
      />
    )
  },
})

// ─── Alert ────────────────────────────────────────────────────────────────────
const AlertDef = defineComponent({
  name: "Alert",
  description: "Renders risk, warning, or info alerts. Use for risks, issues, constraints, or important notices.",
  props: z.object({
    title: z.string().optional().describe("Alert section heading"),
    severity: z.enum(["info", "warning", "error", "success"]).default("warning"),
    alerts: z.array(z.object({
      category: z.string().describe("Risk or alert category"),
      impact: z.string().optional().describe("Impact description"),
      mitigation: z.string().optional().describe("Mitigation or response strategy"),
    })).describe("List of alerts or risks"),
  }),
  component: ({ props }) => {
    const { AlertComponent } = require("@/components/openui-chat/components/AlertComponent")
    return (
      <AlertComponent
        props={{ title: props.title, severity: props.severity ?? "warning" } as any}
        data={((props.alerts as any[]) ?? []).map(a => ({
          "Risk Category": a.category,
          "Impact": a.impact ?? "",
          "Mitigation": a.mitigation ?? "",
        }))}
      />
    )
  },
})

// ─── Accordion ────────────────────────────────────────────────────────────────
const AccordionDef = defineComponent({
  name: "Accordion",
  description: "Renders collapsible sections. Use for assumptions, constraints, FAQs, or grouped details that benefit from progressive disclosure.",
  props: z.object({
    title: z.string().optional().describe("Accordion heading"),
    sections: z.array(z.object({
      heading: z.string().describe("Section title (clickable to expand)"),
      content: z.record(z.string()).optional().describe("Key-value details inside the section"),
      body: z.string().optional().describe("Free text body if key-value not applicable"),
    })).describe("Accordion sections"),
  }),
  component: ({ props }) => {
    const { AccordionComponent } = require("@/components/openui-chat/components/AccordionComponent")
    return (
      <AccordionComponent
        props={{ title: props.title } as any}
        data={((props.sections as any[]) ?? []).map(s => ({
          title: s.heading,
          ...(s.content ?? {}),
          ...(s.body ? { "Details": s.body } : {}),
        }))}
      />
    )
  },
})

// ─── Comparison ───────────────────────────────────────────────────────────────
const ComparisonDef = defineComponent({
  name: "Comparison",
  description: "Renders a side-by-side comparison table. Use for in-scope vs out-of-scope, options analysis, or feature comparisons.",
  props: z.object({
    title: z.string().optional().describe("Comparison heading"),
    sides: z.array(z.object({
      name: z.string().describe("Column heading, e.g. 'In-Scope'"),
      highlighted: z.boolean().optional().default(false),
      attributes: z.record(z.string()).describe("Attribute name → value pairs"),
    })).describe("Comparison columns"),
  }),
  component: ({ props }) => {
    const { ComparisonComponent } = require("@/components/openui-chat/components/ComparisonComponent")
    return (
      <ComparisonComponent
        props={{ title: props.title } as any}
        data={((props.sides as any[]) ?? []).map(s => ({
          name: s.name,
          highlighted: s.highlighted ?? false,
          ...s.attributes,
        }))}
      />
    )
  },
})

// ─── Steps ────────────────────────────────────────────────────────────────────
const StepsDef = defineComponent({
  name: "Steps",
  description: "Renders a sequential step-by-step process. Use for workflows, procedures, onboarding guides, or phase execution plans.",
  props: z.object({
    title: z.string().optional().describe("Process heading"),
    steps: z.array(z.object({
      label: z.string().describe("Step title"),
      description: z.string().optional().describe("Step detail"),
    })).describe("Ordered steps"),
  }),
  component: ({ props }) => {
    const { StepsComponent } = require("@/components/openui-chat/components/StepsComponent")
    return (
      <StepsComponent
        props={{ title: props.title } as any}
        data={((props.steps as any[]) ?? []).map(s => ({ title: s.label, description: s.description ?? "" }))}
      />
    )
  },
})

// Panel components that can appear inside Tabs (defined after all panel types exist)
const TabPanelRef = z.union([
  CardDef.ref,
  TeamDef.ref,
  TableDef.ref,
  ChartDef.ref,
  TimelineDef.ref,
  BulletsDef.ref,
  AlertDef.ref,
  AccordionDef.ref,
  ComparisonDef.ref,
  StepsDef.ref,
])

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TabsDef = defineComponent({
  name: "Tabs",
  description: "Renders switchable tab panels. Use as the top-level wrapper for multi-section documents like project charters, plans, or reports. Nest one child component per tab.",
  props: z.object({
    title: z.string().optional().describe("Dashboard or document title shown above the tabs"),
    tabs: z.array(z.string()).optional().describe("Tab labels (one per nested child panel)"),
    panels: z.array(TabPanelRef).optional().describe("Tab panel content — one nested component per tab"),
  }),
  component: ({ props, renderNode }) => {
    const { TabsComponent } = require("@/components/openui-chat/components/TabsComponent")
    const panels = (props.panels as unknown[]) ?? []
    const panelContent: ReactNode[] = panels.map((panel) => renderNode(panel))
    return (
      <TabsComponent
        props={{ title: props.title, tabs: props.tabs } as any}
        data={[]}
        panelContent={panelContent}
      />
    )
  },
})

// ─── Library ──────────────────────────────────────────────────────────────────
export const adpaLibrary = createLibrary({
  components: [
    TableDef,
    ChartDef,
    TimelineDef,
    CardDef,
    TeamDef,
    BulletsDef,
    AlertDef,
    AccordionDef,
    ComparisonDef,
    StepsDef,
    TabsDef,
  ],
  root: "Tabs",
})

export type { Library } from "@openuidev/react-lang"
