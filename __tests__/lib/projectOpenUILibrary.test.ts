jest.mock("@openuidev/react-lang", () => ({
  createLibrary: (cfg: {
    root?: string
    componentGroups?: unknown
    components: Array<{ name: string }>
  }) => {
    const components: Record<string, { name: string }> = {}
    for (const c of cfg.components) {
      components[c.name] = c
    }
    return {
      root: cfg.root,
      componentGroups: cfg.componentGroups,
      components,
      prompt: () => "Use Card, Accordion, Table, Stack, and Bullets.",
    }
  },
}))

jest.mock("@openuidev/react-ui/genui-lib", () => {
  const components: Record<string, { name: string }> = {
    Card: { name: "Card" },
    Accordion: { name: "Accordion" },
    Table: { name: "Table" },
    Stack: { name: "Stack" },
  }
  for (let i = 0; i < 45; i++) {
    components[`GenUI${i}`] = { name: `GenUI${i}` }
  }
  return {
    openuiLibrary: {
      root: "Stack",
      componentGroups: [],
      components,
    },
    openuiPromptOptions: {},
  }
})

const extensionMocks = [
  "Bullets",
  "Timeline",
  "Team",
  "Comparison",
  "TableOfContents",
].map((name) => ({ name }))

jest.mock("@/lib/openui/adpaGenuiExtensionDefs", () => ({
  ADPA_GENUI_EXTENSION_DEFS: extensionMocks,
  ADPA_GENUI_EXTENSION_NAMES: extensionMocks.map((e) => e.name),
}))

import {
  getProjectOpenUIComponentNames,
  OPENUI_BASE_COMPONENT_MIN_COUNT,
  projectOpenUILibrary,
} from "@/lib/openui/projectOpenUILibrary"

describe("projectOpenUILibrary", () => {
  it("includes full GenUI catalog plus Bullets", () => {
    const names = getProjectOpenUIComponentNames()
    expect(names.length).toBeGreaterThanOrEqual(OPENUI_BASE_COMPONENT_MIN_COUNT + 1)
    expect(names).toEqual(
      expect.arrayContaining([
        "Card",
        "Accordion",
        "Table",
        "Stack",
        "Bullets",
        "Timeline",
        "Team",
        "Comparison",
        "TableOfContents",
      ])
    )
  })

  it("generates a system prompt that lists multiple layout components", () => {
    const prompt = projectOpenUILibrary.prompt({})
    expect(prompt).toContain("Card")
    expect(prompt).toContain("Accordion")
    expect(prompt.length).toBeGreaterThan(20)
  })
})
