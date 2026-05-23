import {
  buildLayoutPlan,
  formatLayoutPlanForExecutor,
  segmentSourceText,
  splitBodyIntoContentBlocks,
  splitProseIntoTwoColumns,
  stripProseDividers,
  wantsGenuiFocusedDetailRender,
  wantsGenuiReportDarkTheme,
  repairTwoColumnProseInLang,
  stripDividerNoiseInLang,
  repairGenuiExecutorLang,
  pruneUndefinedRefsInLang,
} from "@/lib/openui/layoutPlan"
import type { LayoutPlanNode } from "@/lib/openui/layoutPlanTypes"
import { validateExecutorLang } from "@/lib/openui/langValidation"

describe("segmentSourceText", () => {
  test("splits markdown headings into sections", () => {
    const text = `Intro paragraph here.

## Objectives
- Goal one
- Goal two

## Risks
| Risk | Severity |
| --- | --- |
| Delay | High |`

    const segments = segmentSourceText(text)
    expect(segments.some((s) => s.title === "Objectives")).toBe(true)
    expect(segments.some((s) => s.title === "Risks")).toBe(true)
  })
})

describe("buildLayoutPlan", () => {
  test("charter prompt with sections uses Card per heading, not Accordion", () => {
    const source = `## Overview
Short overview text.

## Scope
- In scope A
- In scope B`

    const plan = buildLayoutPlan({
      prompt: "Create a project charter",
      sourceText: source,
    })

    expect(plan.shell).toBe("charter")
    expect(plan.root).toBe("Stack")
    const flat = JSON.stringify(plan.nodes)
    expect(flat).toMatch(/card-section-overview/)
    expect(flat).toMatch(/CardHeader/)
    expect(flat).not.toMatch(/"component":"Accordion"/)
    expect(flat).toMatch(/Bullets/)
  })

  test("accordion only when user asks and section is not a bullet list", () => {
    const source = `## Details
Paragraph one about context.
Paragraph two with more narrative.`

    const withoutAsk = buildLayoutPlan({
      prompt: "Summarize the governance report",
      sourceText: source,
    })
    expect(JSON.stringify(withoutAsk.nodes)).not.toMatch(/"component":"Accordion"/)

    const withAsk = buildLayoutPlan({
      prompt: "Use an accordion for collapsible FAQ sections",
      sourceText: source,
    })
    expect(JSON.stringify(withAsk.nodes)).toMatch(/Accordion/)
  })

  test("unstructured paragraph gets typography fallback node", () => {
    const source =
      "This is a single unstructured narrative paragraph without lists or tables. It explains background context only."

    const plan = buildLayoutPlan({
      prompt: "Summarize background",
      sourceText: source,
    })

    const hasFallback = plan.nodes.some(
      (n) =>
        n.mapping === "typography-fallback" ||
        n.children?.some((c) => c.mapping === "typography-fallback")
    )
    expect(hasFallback).toBe(true)
    expect(plan.nodes.some((n) => n.sourceText.includes("unstructured"))).toBe(true)
  })

  test("risk prompt prefers Table widget", () => {
    const source = `| Risk | Owner |
| --- | --- |
| Budget | PM |`

    const plan = buildLayoutPlan({
      prompt: "List project risks in a table",
      sourceText: source,
    })

    expect(plan.shell).toBe("risk")
    const serialized = JSON.stringify(plan.nodes)
    expect(serialized).toMatch(/Table/)
  })

  test("focused timeline from a section omits cover and table of contents", () => {
    const source = `# Schedule Management Plan

## Executive Summary
Project overview paragraph.

## Schedule Management Plan
| Milestone | Date | Status |
| --- | --- | --- |
| Kickoff | 2026-05-01 | completed |
| OpenUI integration | 2026-05-10 | completed |
| Auto UI module | 2026-05-18 | in-progress |
| UAT | 2026-05-25 | upcoming |
| Launch | 2026-05-31 | upcoming |`

    const prompt = "Render a timeline from the Schedule Management Plan section"
    expect(wantsGenuiFocusedDetailRender(prompt)).toBe(true)

    const plan = buildLayoutPlan({
      prompt,
      sourceText: source,
      documentId: "82efd3d4-1482-4de6-859e-a940202cb0f1",
    })

    expect(plan.focusedDetail).toBe(true)
    expect(plan.shell).toBe("timeline")
    const serialized = JSON.stringify(plan.nodes)
    expect(serialized).toMatch(/Timeline/)
    expect(serialized).not.toMatch(/doc-cover/)
    expect(serialized).not.toMatch(/ReportCoverHero/)
    expect(serialized).not.toMatch(/TableOfContents/)

    const block = formatLayoutPlanForExecutor(plan)
    expect(block).toContain("focusedDetail: true")
    expect(block).toContain("FOCUSED DETAIL MODE")
    expect(block).toContain("no cover Card")
  })

  test("follow-up gantt from this report stays focused with table shell, no cover", () => {
    const source = `## 1. Executive Summary
Summary.

## 6. Schedule Development
### 6.4 Milestone Schedule
| Milestone | Date |
| --- | --- |
| Kickoff | 2026-05-01 |

## 12. Approval
Sign-off.`

    const prompt = "from this report could you generate a gantt chart?"
    expect(wantsGenuiFocusedDetailRender(prompt)).toBe(true)

    const plan = buildLayoutPlan({
      prompt,
      sourceText: source,
      documentId: "doc-1",
    })

    expect(plan.focusedDetail).toBe(true)
    expect(plan.shell).toBe("table")
    const serialized = JSON.stringify(plan.nodes)
    expect(serialized).not.toMatch(/doc-cover/)
    expect(serialized).not.toMatch(/TableOfContents/)
    expect(serialized).not.toMatch(/card_ch1/)
  })

  test("full document render still includes cover when governance doc has chapters", () => {
    const source = `## 1. Executive Summary
Summary text.

## 2. Schedule Management Plan
Milestone table here.`

    const plan = buildLayoutPlan({
      prompt: "Render the full document with cover page and table of contents",
      sourceText: source,
      documentId: "doc-1",
    })

    expect(plan.focusedDetail).toBeFalsy()
    expect(JSON.stringify(plan.nodes)).toMatch(/doc-cover/)
  })

  test("formatLayoutPlanForExecutor includes strict rules and source text", () => {
    const plan = buildLayoutPlan({
      prompt: "Status update",
      sourceText: "## Status\nOn track.",
    })
    const block = formatLayoutPlanForExecutor(plan)
    expect(block).toContain("REQUIRED LAYOUT PLAN")
    expect(block).toContain("EXECUTOR RULES")
    expect(block).toContain("On track")
    expect(block).toContain("do not add, remove, or swap")
    expect(block).toContain('REQUIRED_LANG: CardHeader("Summary")')
  })

  test("prompt-only plan still returns Stack root", () => {
    const plan = buildLayoutPlan({ prompt: "Give me a dashboard overview" })
    expect(plan.root).toBe("Stack")
    expect(plan.nodes.length).toBeGreaterThan(0)
  })

  test("business case: one Card per numbered chapter, ### nested not top-level", () => {
    const source = `# Business Case: Cloud Migration

## 1. Executive Summary

### 1.1 Project Overview
* **Project Name:** Cloud Migration Program

### 1.2 Business Need
The organization faces critical challenges.

## 2. Problem Statement

### 2.1 Current State
Legacy on-premises infrastructure with 4-6 week provisioning.

### 2.2 Business Impact
Cost of inaction exceeds $15M over five years.`

    const plan = buildLayoutPlan({
      prompt: "Transform this business case into a structured report",
      sourceText: source,
    })

    const flat = JSON.stringify(plan.nodes)
    const topLevelCards = plan.nodes.filter((n) => n.component === "Card" && n.id.startsWith("card-chapter"))
    expect(topLevelCards.length).toBe(2)
    expect(flat).toMatch(/sub-section-/)
    expect(flat).not.toMatch(/card-section-1-executive-summary/)
    expect(flat.match(/"component":"Card"/g)?.length).toBe(3)
    const ch1 = topLevelCards.find((n) => n.label?.includes("Executive"))
    expect(ch1?.children?.some((c) => c.id.startsWith("sub-"))).toBe(true)
  })

  test("long chapter intro plans TwoColumnProse with left/right hints", () => {
    const para1 =
      "The ADPA - Morphic AI Integration project aims to enhance the ADPA platform with state-of-the-art AI-powered search capabilities by integrating Morphic AI's technology. This integration addresses the current limitations of ADPA's search functionality, which impacts user productivity and decision-making."
    const para2 =
      "Key benefits include improved search accuracy, faster information retrieval, and a more intuitive user experience. The preferred recommendation is a phased integration approach, mitigating risks through comprehensive testing and stakeholder engagement."
    const source = `## 1. Executive Summary\n\n${para1}\n\n${para2}`

    const plan = buildLayoutPlan({
      prompt: "Render the full document with cover page and chapter cards",
      sourceText: source,
    })

    const allNodes = plan.nodes.flatMap(function collect(n): LayoutPlanNode[] {
      return [n, ...(n.children ?? []).flatMap(collect)]
    })
    const twoCol = allNodes.find((n) => n.hints?.twoColumn === "true")
    expect(twoCol?.component).toBe("TwoColumnProse")
    expect(typeof twoCol?.hints?.left).toBe("string")
    expect(typeof twoCol?.hints?.right).toBe("string")
    const block = formatLayoutPlanForExecutor(plan)
    expect(block).toMatch(/REQUIRED_LANG: TwoColumnProse\(left=/)
    expect(block).not.toMatch(/Stack\(\[TextContent\(/)
  })

  test("numbered purpose outline is Bullets not Table", () => {
    const source = `## 2. Project Charter

### 2.2 Purpose of this document

1. **Primary purpose:** Integrate Morphic AI search into ADPA.
2. **Secondary purpose:** Improve user productivity and decision-making.
3. **Scope alignment:** Support governance and delivery planning.`

    const plan = buildLayoutPlan({
      prompt: "Render the full document",
      sourceText: source,
    })

    const allNodes = plan.nodes.flatMap(function collect(n): LayoutPlanNode[] {
      return [n, ...(n.children ?? []).flatMap(collect)]
    })
    const purposeBullets = allNodes.find(
      (n) => n.component === "Bullets" && n.sourceText.includes("Primary purpose")
    )
    expect(purposeBullets).toBeDefined()
    expect(allNodes.some((n) => n.id.includes("section-2-2") && n.component === "Table")).toBe(
      false
    )
  })

  test("benefit bullets with 'lead to' are not classified as Team roster", () => {
    const source = `### 2.2 The Opportunity (Potential Future)

- What Gets Better? Integrating Morphic AI will lead to increased productivity.
- Who Benefits Most? Analysts and decision-makers will see the largest gains.
- Ripple Effects: Success could lead to increased adoption and enhanced visibility.`

    const plan = buildLayoutPlan({
      prompt: "Generate ideation report",
      sourceText: source,
    })

    const flat = JSON.stringify(plan.nodes)
    const allNodes = plan.nodes.flatMap(function collect(n): LayoutPlanNode[] {
      return [n, ...(n.children ?? []).flatMap(collect)]
    })
    const bulletsNode = allNodes.find((n) => n.component === "Bullets")

    expect(bulletsNode).toBeDefined()
    expect(flat).not.toMatch(/"component":"Team"/)
  })

  test("cover card skips preamble that is only a horizontal rule", () => {
    const source = `---

## 1. Executive Summary

### 1.1 Project Overview
Cloud migration program overview with measurable value.`

    const plan = buildLayoutPlan({
      prompt: "Transform this business case into a structured report",
      sourceText: source,
    })
    const cover = plan.nodes.find((n) => n.id === "doc-cover")
    const coverSummary = cover?.children?.find((c) => c.id === "cover-summary")
    expect(cover).toBeDefined()
    expect(coverSummary?.sourceText).not.toBe("---")
    expect(coverSummary?.sourceText).toMatch(/Cloud migration/i)
    expect(coverSummary?.sourceText?.length ?? 0).toBeLessThanOrEqual(500)
    expect(coverSummary?.hints?.coverBlurb).toBe("true")
  })

  test("full document prompt mentioning tables still plans all chapters", () => {
    const source = `# OpenUI Integration with ADPA Systems
Strategic Framework Enhancement

## 1. Executive Summary
Overview paragraph here.

### 1.1 Scope
Scope details.

## 2. Strategic Alignment
Alignment narrative.

## 2.2 Objectives
| Metric | Target |
| --- | --- |
| Adoption | 80% |

## 3. Technical Architecture
Architecture details.`

    const plan = buildLayoutPlan({
      prompt:
        "Render the full document using the REQUIRED LAYOUT PLAN. Use tables where needed. Dark report theme with black background.",
      sourceText: source,
    })

    expect(plan.shell).toBe("charter")
    const chapterCards = plan.nodes.filter((n) => n.id.startsWith("card-chapter"))
    expect(chapterCards.length).toBeGreaterThanOrEqual(2)
    expect(plan.nodes.find((n) => n.id === "doc-cover")).toBeDefined()
    expect(
      plan.nodes.some((n) => n.id.startsWith("card-chapter") && n.label?.includes("Objectives"))
    ).toBe(false)
    expect(plan.nodes.length).toBeGreaterThan(3)
  })

  test("SMP §1.1 two-column plan does not list duplicate col children to executor", () => {
    const para1 =
      "The purpose of this Scope Management Plan (SMP) is to establish a comprehensive framework for defining, documenting, validating, and controlling the project scope for the ADPA - Implementation of OpenUI and Auto UI Generation project."
    const para2 =
      "This document serves as a subsidiary plan to the Project Management Plan (PMP) and provides detailed guidance on scope-related processes, roles, responsibilities, and deliverables."
    const source = `## 1. Introduction and Scope Management Approach

### 1.1 Overview of the Scope Management Plan
${para1}

${para2}

---

### 1.2 Project Scope Management Approach
Intro paragraph before the table.

| Phase | Approach |
| --- | --- |
| Initiation | Predictive |
| Execution | Adaptive |

**Justification for Hybrid Approach:**
The hybrid model balances governance with agility.`

    const plan = buildLayoutPlan({
      prompt: "Render the full document to a interactive UI Component Report",
      sourceText: source,
    })

    const allNodes = plan.nodes.flatMap(function collect(n): LayoutPlanNode[] {
      return [n, ...(n.children ?? []).flatMap(collect)]
    })
    const twoCol = allNodes.find((n) => n.id.includes("1-1") && n.hints?.twoColumn === "true")
    expect(twoCol?.component).toBe("TwoColumnProse")
    const block = formatLayoutPlanForExecutor(plan)
    expect(block).toMatch(/REQUIRED_LANG: TwoColumnProse\(left=/)
    expect(block).not.toMatch(/section-1-1-overview-col1/)

    const section12Nodes = allNodes.filter((n) => n.id.includes("1-2"))
    expect(section12Nodes.some((n) => n.component === "Table" && n.sourceText.includes("Initiation"))).toBe(
      true
    )
    expect(
      section12Nodes.some((n) => n.sourceText.includes("Justification for Hybrid Approach"))
    ).toBe(true)
    expect(section12Nodes.some((n) => n.sourceText.includes("Intro paragraph"))).toBe(true)
  })

  test("scope management metadata headings do not become top-level chapter cards", () => {
    const source = `# Scope Management Plan

## Project: ADPA - Implementation of OpenUI and Auto UI Generation
## Date: May 15, 2026
## Version: 1.0

---

## 1. Introduction and Scope Management Approach

### 1.1 Purpose of the Document
The purpose of this Scope Management Plan (SMP) is to establish a comprehensive framework.

## 2. Scope Definition and Documentation

### 2.1 Project Scope Statement
The Project Scope Statement defines boundaries.`

    const plan = buildLayoutPlan({
      prompt: "Render the full document to a interactive UI Component Report",
      sourceText: source,
    })

    const topLevelCards = plan.nodes.filter(
      (n) => n.component === "Card" && n.id.startsWith("card-chapter")
    )
    expect(topLevelCards.map((n) => n.label)).toEqual([
      "1. Introduction and Scope Management Approach",
      "2. Scope Definition and Documentation",
    ])
    const cover = plan.nodes.find((n) => n.id === "doc-cover")
    const coverSummary = cover?.children?.find((c) => c.id === "cover-summary")
    expect(coverSummary?.sourceText).toMatch(/ADPA/)
    expect(coverSummary?.sourceText).toMatch(/May 15, 2026/)
    expect(coverSummary?.sourceText).toMatch(/Version: 1\.0/)
  })

  test("hierarchical report puts cover before TOC and chapters", () => {
    const source = `# OpenUI Integration with ADPA Systems
Strategic Framework Enhancement
A comprehensive analysis of integrating OpenUI into ADPA.

## 1. Executive Summary
Overview paragraph here.

### 1.1 Scope
Scope details for chapter one.

## 2. Strategic Alignment
Alignment narrative.

### 2.1 Drivers
Key drivers listed here.

## 3. Technical Architecture
Architecture details.

## 4. Business Analysis
ROI discussion.`

    const plan = buildLayoutPlan({
      prompt: "Render the full document with dark theme",
      sourceText: source,
    })

    expect(plan.nodes[0]?.id).toBe("doc-cover")
    const coverHero = plan.nodes[0]?.children?.find((c) => c.id === "cover-hero")
    expect(coverHero?.component).toBe("ReportCoverHero")
    expect(coverHero?.hints?.imageUrl).toMatch(/^\/images\/report-covers\//)
    expect(plan.nodes[0]?.children?.find((c) => c.id === "cover-header")?.label).toMatch(
      /OpenUI Integration/i
    )
    expect(plan.nodes[1]?.id).toBe("doc-toc")
    expect(plan.nodes.some((n) => n.id.startsWith("card-chapter"))).toBe(true)
    expect(plan.nodes.find((n) => n.id === "intro-card")).toBeUndefined()

    const coverSummary = plan.nodes[0]?.children?.find((c) => c.id === "cover-summary")
    const execChapter = plan.nodes.find((n) => n.label?.includes("Executive Summary"))
    const execBody = execChapter?.children?.find((c) => c.component === "TextContent")
    if (coverSummary?.sourceText && execBody?.sourceText) {
      expect(coverSummary.sourceText.length).toBeLessThanOrEqual(500)
      if (execBody.sourceText.length > 80) {
        expect(coverSummary.sourceText.length).toBeLessThan(execBody.sourceText.length)
      }
    }
  })

  test("coverSummary override replaces heuristic blurb", () => {
    const plan = buildLayoutPlan({
      prompt: "Render the full document using the REQUIRED LAYOUT PLAN with cover page",
      sourceText: `# Test Report\nSubtitle line\n\n## 1. Executive Summary\n${"Long body. ".repeat(80)}\n\n## 2. Next Chapter\nMore content.`,
      coverSummary: "Short AI-generated cover teaser only.",
    })
    const coverSummary = plan.nodes
      .find((n) => n.id === "doc-cover")
      ?.children?.find((c) => c.id === "cover-summary")
    expect(coverSummary?.sourceText).toBe("Short AI-generated cover teaser only.")
  })
})

describe("splitBodyIntoContentBlocks", () => {
  test("splits prose, table, and justification tail for §1.2-style sections", () => {
    const body = `Intro paragraph before the table.

| Phase | Approach |
| --- | --- |
| Initiation | Predictive |

**Justification for Hybrid Approach:**
The hybrid model balances governance with agility.`
    const blocks = splitBodyIntoContentBlocks(body)
    expect(blocks.length).toBe(3)
    expect(blocks[0]?.kind).toBe("prose")
    expect(blocks[0]?.text).toMatch(/Intro paragraph/)
    expect(blocks[1]?.kind).toBe("table")
    expect(blocks[2]?.text).toMatch(/Justification for Hybrid Approach/)
  })
})

describe("stripProseDividers and splitProseIntoTwoColumns", () => {
  test("horizontal rule between paragraphs is not a third column", () => {
    const body = `First paragraph with enough characters to qualify for two column layout in the report.

Second paragraph also has enough characters to qualify for two column layout in the report.

---`
    const stripped = stripProseDividers(body)
    const [left, right] = splitProseIntoTwoColumns(stripped)
    expect(left).toMatch(/First paragraph/)
    expect(right).toMatch(/Second paragraph/)
    expect(left).not.toContain("---")
    expect(right).not.toContain("---")
  })

  test("splits on paragraph boundaries when possible", () => {
    const body = "First paragraph with enough text to matter.\n\nSecond paragraph also has substantive content for the right column."
    const [left, right] = splitProseIntoTwoColumns(body.repeat(3))
    expect(left.length).toBeGreaterThan(40)
    expect(right.length).toBeGreaterThan(40)
    expect(left).not.toBe(right)
    expect(left.length + right.length).toBeLessThan(body.repeat(3).length + 20)
  })

  test("single-block prose breaks at sentence boundary near the middle", () => {
    const sentence =
      "The integration addresses current search limitations and improves analyst productivity across the portfolio."
    const body = [sentence, sentence, sentence, sentence, sentence].join(" ")
    const [left, right] = splitProseIntoTwoColumns(body)
    expect(left).toMatch(/[.!?]["')\]]?\s*$/)
    expect(right).toMatch(/^[A-Z]/)
    expect(left + " " + right).toContain(body.slice(0, 40))
    expect(left).not.toMatch(/\bthe\s*$/i)
    expect(right).not.toMatch(/^\s*integration\b/i)
  })

  test("does not split after Dr. or decimal section numbers", () => {
    const sentences = [
      "Dr. Smith leads the architecture workstream.",
      "The program follows PMBOK 7th Ed. guidance for governance.",
      "Stakeholders expect measurable outcomes within the first release cycle.",
      "Section 3.1 outlines the high-level scope and constraints for delivery teams.",
      "Weekly steering reviews track scope, budget, and risk escalation paths.",
      "Sponsors receive a concise status narrative before each gate decision.",
    ]
    const body = sentences.join(" ").repeat(3)
    const [left, right] = splitProseIntoTwoColumns(body)
    expect(left).toMatch(/[.!?]["')\]]?\s*$/)
    expect(right).toMatch(/^[A-Z]/)
    expect(right).not.toMatch(/^\s*Smith\b/)
    expect(`${left} ${right}`).toContain("Section 3.1 outlines")
    expect(left).not.toMatch(/Section 3\.\s*$/)
    expect(right).not.toMatch(/^\s*1 outlines/)
  })

  test("chapter intro two-column children end and start on sentence boundaries", () => {
    const para1 =
      "The ADPA - Morphic AI Integration project aims to enhance the ADPA platform with state-of-the-art AI-powered search capabilities by integrating Morphic AI's technology. This integration addresses the current limitations of ADPA's search functionality, which impacts user productivity and decision-making."
    const para2 =
      "Key benefits include improved search accuracy, faster information retrieval, and a more intuitive user experience. The preferred recommendation is a phased integration approach, mitigating risks through comprehensive testing and stakeholder engagement."
    const source = `## 1. Executive Summary\n\n${para1}\n\n${para2}`

    const plan = buildLayoutPlan({
      prompt: "Render the full document",
      sourceText: source,
    })
    const allNodes = plan.nodes.flatMap(function collect(n): LayoutPlanNode[] {
      return [n, ...(n.children ?? []).flatMap(collect)]
    })
    const twoCol = allNodes.find((n) => n.hints?.twoColumn === "true")
    expect(twoCol?.hints?.left).toBe(para1)
    expect(twoCol?.hints?.right).toBe(para2)
    expect(String(twoCol?.hints?.left)).toMatch(/\.\s*$/)
    expect(String(twoCol?.hints?.right)).toMatch(/^Key benefits/)
  })
})

describe("repairTwoColumnProseInLang", () => {
  test("rewrites adjacent TextContent pair to TwoColumnProse", () => {
    const para1 =
      "The purpose of this Scope Management Plan (SMP) is to establish a comprehensive framework for defining, documenting, validating, and controlling the project scope for the ADPA - Implementation of OpenUI and Auto UI Generation project."
    const para2 =
      "This document serves as a subsidiary plan to the Project Management Plan (PMP) and provides detailed guidance on scope-related processes, roles, responsibilities, and deliverables."
    const source = `## 1. Introduction and Scope Management Approach

### 1.1 Overview of the Scope Management Plan
${para1}

${para2}`
    const plan = buildLayoutPlan({
      prompt: "Render the full document to a interactive UI Component Report",
      sourceText: source,
    })
    const allNodes = plan.nodes.flatMap(function collect(n: LayoutPlanNode): LayoutPlanNode[] {
      return [n, ...(n.children ?? []).flatMap(collect)]
    })
    expect(allNodes.some((n) => n.component === "TwoColumnProse")).toBe(true)

    const badLang = `root = Stack([
  section = Stack([
    CardHeader("1.1 Overview of the Scope Management Plan"),
    TextContent("${para1}", "default"),
    TextContent("${para2}", "default")
  ])
])`
    const fixed = repairTwoColumnProseInLang(badLang, plan)
    expect(fixed).toMatch(/TwoColumnProse\(left=/)
    expect(fixed).not.toMatch(/TextContent\("The purpose of this Scope/)
  })
})

describe("stripDividerNoiseInLang", () => {
  test("removes divider-only TextContent assignments and Stack references", () => {
    const lang = `subSec2_3 = Stack([
  subSec2_3_Header = CardHeader("2.3 Scope Exclusions"),
  sec2_3_Part0 = TextContent("Exclusion text here.", "default"),
  sec2_3_Part1 = Table([Col("A", ["1"])]),
  sec2_3_Part2 = TextContent("---")
])`
    const fixed = stripDividerNoiseInLang(lang)
    expect(fixed).not.toMatch(/sec2_3_Part2/)
    expect(fixed).not.toMatch(/TextContent\("---"/)
    expect(fixed).toMatch(/sec2_3_Part1/)
    expect(fixed).toMatch(/Stack\(\[/)
  })

  test("removes inline TextContent dividers in arrays", () => {
    const lang = `x = Stack([CardHeader("T"), TextContent("body", "default"), TextContent("---", "default")])`
    const fixed = stripDividerNoiseInLang(lang)
    expect(fixed).not.toMatch(/TextContent\("---"/)
    expect(fixed).toMatch(/TextContent\("body"/)
  })
})

describe("pruneUndefinedRefsInLang", () => {
  test("removes undefined ids from Stack and Card child arrays", () => {
    const lang = `ch9_sec1_prose = TwoColumnProse("a", "b")
ch9_sec9_1 = Stack([ch9_sec9_1_header, ch9_sec1_prose], "column", "s")
card_ch9 = Card([ch9_header, ch9_sec9_1, ch9_missing], "card")`
    const fixed = pruneUndefinedRefsInLang(lang)
    expect(fixed).not.toMatch(/ch9_sec9_1_header/)
    expect(fixed).not.toMatch(/ch9_missing/)
    expect(fixed).toMatch(/ch9_sec1_prose/)
    expect(fixed).toMatch(/Stack\(\[ch9_sec1_prose\]/)
  })
})

describe("repairGenuiExecutorLang", () => {
  test("applies two-column repair and divider cleanup", () => {
    const para1 =
      "The purpose of this Scope Management Plan (SMP) is to establish a comprehensive framework for defining, documenting, validating, and controlling the project scope for the ADPA - Implementation of OpenUI and Auto UI Generation project."
    const para2 =
      "This document serves as a subsidiary plan to the Project Management Plan (PMP) and provides detailed guidance on scope-related processes, roles, responsibilities, and deliverables."
    const source = `## 1. Introduction and Scope Management Approach

### 1.1 Overview of the Scope Management Plan
${para1}

${para2}`
    const plan = buildLayoutPlan({
      prompt: "Render the full document to a interactive UI Component Report",
      sourceText: source,
    })
    const badLang = `root = Stack([
  section = Stack([
    CardHeader("1.1 Overview of the Scope Management Plan"),
    TextContent("${para1}", "default"),
    TextContent("${para2}", "default"),
    tail = TextContent("---")
  ])
])`
    const fixed = repairGenuiExecutorLang(badLang, plan)
    expect(fixed).toMatch(/TwoColumnProse\(left=/)
    expect(fixed).not.toMatch(/TextContent\("---"/)
    expect(fixed).not.toMatch(/\btail\b/)
  })
})

describe("validateExecutorLang", () => {
  test("rejects Bullets-only root", () => {
    const result = validateExecutorLang('root = Bullets(items=["a"])')
    expect(result.ok).toBe(false)
    expect(result.issues.join(" ")).toMatch(/forbidden root/i)
  })

  test("accepts Stack root with children", () => {
    const lang = `root = Stack([
  intro = Card([CardHeader(title="Summary"), TextContent(text="Lead", variant="default")]),
  body = Table(columns=["a"], rows=[{a: "1"}])
])`
    const result = validateExecutorLang(lang)
    expect(result.ok).toBe(true)
  })
})
