/**
 * ADPA OpenUI Library
 * Defines the full ADPA component library using @openuidev/react-lang.
 * The LLM generates OpenUI Lang XML; <Renderer> parses and renders it on the client.
 */

import { createLibrary, defineComponent } from "@openuidev/react-lang"
import { z } from "zod/v4"
import type { ReactNode } from "react"

import { BulletsDef } from "./bulletsDef"
import { ComparisonDef } from "./comparisonDef"
import { TableOfContentsDef } from "./tableOfContentsDef"
import { TeamDef } from "./teamDef"
import { TimelineDef } from "./timelineDef"
import { looseRecord, stringRecord } from "./zodRecords"

// ─── Table ────────────────────────────────────────────────────────────────────
const TableDef = defineComponent({
  name: "Table",
  description:
    "Tabular data with column headers and rows. Use ONLY when the section is clearly a table/matrix AND every row from the source is included. Otherwise use Prose.",
  props: z.object({
    title: z.string().optional().describe("Section heading for the table"),
    columns: z.array(z.string()).optional().describe("Column headers (inferred from row keys if omitted)"),
    rows: z.array(looseRecord).describe("Array of row objects, keys match column headers"),
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

// ─── Card ─────────────────────────────────────────────────────────────────────
const CardDef = defineComponent({
  name: "Card",
  description:
    "Key-value fields. Use ONLY for small sets where every field from the source is included. Otherwise use Prose.",
  props: z.object({
    title: z.string().optional().describe("Card heading"),
    subtitle: z.string().optional().describe("Card subheading or section label"),
    fields: stringRecord.optional().describe("Key-value pairs to display in the card body"),
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

// ─── Prose ────────────────────────────────────────────────────────────────────
const ProseDef = defineComponent({
  name: "Prose",
  description:
    "Default section body: full narrative content from the source document. Use when text cannot be fully captured in Table/Card/Bullets without loss. Include every paragraph and list item — never summarize.",
  props: z.object({
    title: z.string().optional().describe("Optional subheading inside the section (usually omit; Section already has the heading)"),
    paragraphs: z.array(z.string()).optional().describe("Each paragraph or list block from the source, copied verbatim"),
    body: z.string().optional().describe("Full section markdown when a single block is easier than paragraphs array"),
  }),
  component: ({ props }) => {
    const { ProseComponent } = require("@/components/openui-chat/components/ProseComponent")
    return <ProseComponent props={props as Record<string, unknown>} data={[]} />
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
      content: stringRecord.optional().describe("Key-value details inside the section"),
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

// Content blocks used inside Report sections or Tabs panels
const ContentBlockRef = z.union([
  ProseDef.ref,
  TableOfContentsDef.ref,
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

// ─── Section ──────────────────────────────────────────────────────────────────
const SectionDef = defineComponent({
  name: "Section",
  description:
    "One section from the source document (match each # / ## heading). Body is Prose (full text) OR a structured block only when it can hold ALL information from that section.",
  props: z.object({
    heading: z.string().describe("Section title matching the source heading"),
    intro: z.string().optional().describe("Omit when using Prose with full body; only for a one-line lead-in before a Table/Team block"),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().default(1).describe("Heading depth: 1 = major section, 2 = subsection"),
    content: ContentBlockRef.describe("Prose (default) or Table/Bullets/Card/Team only when nothing is omitted"),
  }),
  component: ({ props, renderNode }) => {
    const { SectionComponent } = require("@/components/openui-chat/components/SectionComponent")
    const body = props.content ? renderNode(props.content) : null
    return (
      <SectionComponent
        props={{ heading: props.heading, intro: props.intro, level: props.level ?? 1 } as any}
        data={[]}
        content={body}
      />
    )
  },
})

// ─── Report ───────────────────────────────────────────────────────────────────
const ReportDef = defineComponent({
  name: "Report",
  description:
    "Complete document report: header plus every source section in order. Must include ALL content from the document — no summaries or skipped sections.",
  props: z.object({
    title: z.string().describe("Document title"),
    subtitle: z.string().optional().describe("Document type or template name"),
    meta: stringRecord.optional().describe("Header metadata: Status, Version, Author, Date, etc."),
    sections: z.array(SectionDef.ref).describe("Ordered report sections — one Section per major document part"),
  }),
  component: ({ props, renderNode }) => {
    const { ReportComponent } = require("@/components/openui-chat/components/ReportComponent")
    const sections = ((props.sections as unknown[]) ?? []).map((section) => renderNode(section))
    return (
      <ReportComponent
        props={{ title: props.title, subtitle: props.subtitle, meta: props.meta } as any}
        data={[]}
        sectionContent={sections}
      />
    )
  },
})

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TabsDef = defineComponent({
  name: "Tabs",
  description: "Switchable tab panels — use ONLY when the user explicitly asks for a tabbed or dashboard layout. Prefer Report for document views.",
  props: z.object({
    title: z.string().optional().describe("Dashboard or document title shown above the tabs"),
    tabs: z.array(z.string()).optional().describe("Tab labels (one per nested child panel)"),
    panels: z.array(ContentBlockRef).optional().describe("Tab panel content — one nested component per tab"),
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
  root: "Report",
  components: [
    ReportDef,
    SectionDef,
    ProseDef,
    TableOfContentsDef,
    TabsDef,
    CardDef,
    TeamDef,
    TableDef,
    ChartDef,
    TimelineDef,
    BulletsDef,
    AlertDef,
    AccordionDef,
    ComparisonDef,
    StepsDef,
  ],
  componentGroups: [
    {
      name: "Report layout",
      components: ["Report", "Section"],
      notes: [
        "Every response MUST start with: root = Report(title, subtitle, meta, [sectionRef1, sectionRef2, ...])",
        "Create one Section per heading in the source document — do not merge or skip sections.",
        "FIDELITY: Include every paragraph, list item, table row, and field from the source. Never summarize, sample, or use placeholder text.",
        "Default content block is Prose with all section text. Use Table/Bullets/Card/Team ONLY when they can contain the same information without omission.",
        "Each section: sectionRef = Section(heading, introOrNull, level, contentRef); define contentRef on a separate line below.",
        "Do NOT use Tabs unless the user explicitly requests a tabbed dashboard.",
      ],
    },
    {
      name: "Content",
      components: ["Prose", "TableOfContents", "Card", "Team", "Table", "Timeline", "Bullets", "Alert", "Accordion", "Comparison", "Steps", "Chart"],
      notes: ["Prefer Prose when in doubt. Charts only for numeric data already in the source."],
    },
    {
      name: "Optional dashboard",
      components: ["Tabs"],
      notes: ["Tabbed layout only on explicit user request."],
    },
  ],
})

export type { Library } from "@openuidev/react-lang"
