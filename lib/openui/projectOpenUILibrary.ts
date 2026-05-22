/**
 * Full OpenUI Lang library for client renderers (prompt library + markdown overrides).
 */

import { createLibrary } from "@openuidev/react-lang"

import {
  MARKDOWN_COMPONENT_OVERRIDES,
  MARKDOWN_OVERRIDE_NAMES,
} from "./markdownComponentOverrides"
import {
  OPENUI_BASE_COMPONENT_MIN_COUNT,
  projectOpenUIPromptLibrary,
} from "./projectOpenUIPromptLibrary"

export { OPENUI_BASE_COMPONENT_MIN_COUNT, openuiPromptOptions, openuiLibrary, ADPA_GENUI_EXTENSION_NAMES } from "./projectOpenUIPromptLibrary"

const overrideNames = new Set<string>(MARKDOWN_OVERRIDE_NAMES)

const baseComponents = Object.values(projectOpenUIPromptLibrary.components).filter(
  (c) => !overrideNames.has(c.name)
)

if (baseComponents.length < OPENUI_BASE_COMPONENT_MIN_COUNT) {
  throw new Error(
    `[projectOpenUILibrary] Expected at least ${OPENUI_BASE_COMPONENT_MIN_COUNT} base GenUI components, got ${baseComponents.length}. Check @openuidev/react-ui/genui-lib install.`
  )
}

export const projectOpenUILibrary = createLibrary({
  root: projectOpenUIPromptLibrary.root ?? "Stack",
  componentGroups: projectOpenUIPromptLibrary.componentGroups,
  components: [...baseComponents, ...MARKDOWN_COMPONENT_OVERRIDES],
})

const mergedNames = Object.keys(projectOpenUILibrary.components)

if (!mergedNames.includes("Card") || !mergedNames.includes("Accordion") || !mergedNames.includes("Table")) {
  throw new Error(
    `[projectOpenUILibrary] Merge missing core GenUI components (Card/Accordion/Table). Keys: ${mergedNames.slice(0, 12).join(", ")}…`
  )
}

for (const name of MARKDOWN_OVERRIDE_NAMES) {
  if (!mergedNames.includes(name)) {
    throw new Error(`[projectOpenUILibrary] Markdown override "${name}" missing after merge.`)
  }
}

/** For tests and agent debugging — full renderer catalog. */
export function getProjectOpenUIComponentNames(): string[] {
  return mergedNames.sort()
}
