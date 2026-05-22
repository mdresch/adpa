/**
 * Server-safe OpenUI Lang library for system prompts (no React renderers).
 * Used by Express OpenUIChatService and Next.js buildOpenUISystemPrompt.
 */

import { createLibrary } from "@openuidev/react-lang"
import { openuiLibrary, openuiPromptOptions } from "@openuidev/react-ui/genui-lib"

import {
  ADPA_GENUI_EXTENSION_DEFS,
  ADPA_GENUI_EXTENSION_NAMES,
} from "./adpaGenuiExtensionDefs"

/** Minimum expected GenUI components from genui-lib (regression guard). */
export const OPENUI_BASE_COMPONENT_MIN_COUNT = 40

const baseComponents = Object.values(openuiLibrary.components)

if (baseComponents.length < OPENUI_BASE_COMPONENT_MIN_COUNT) {
  throw new Error(
    `[projectOpenUIPromptLibrary] Expected at least ${OPENUI_BASE_COMPONENT_MIN_COUNT} base GenUI components, got ${baseComponents.length}. Check @openuidev/react-ui/genui-lib install.`
  )
}

export const projectOpenUIPromptLibrary = createLibrary({
  root: openuiLibrary.root ?? "Stack",
  componentGroups: openuiLibrary.componentGroups,
  components: [...baseComponents, ...ADPA_GENUI_EXTENSION_DEFS],
})

const mergedNames = Object.keys(projectOpenUIPromptLibrary.components)

if (!mergedNames.includes("Card") || !mergedNames.includes("Accordion") || !mergedNames.includes("Table")) {
  throw new Error(
    `[projectOpenUIPromptLibrary] Merge missing core GenUI components (Card/Accordion/Table). Keys: ${mergedNames.slice(0, 12).join(", ")}…`
  )
}

for (const name of ADPA_GENUI_EXTENSION_NAMES) {
  if (!mergedNames.includes(name)) {
    throw new Error(`[projectOpenUIPromptLibrary] ADPA extension "${name}" missing after merge.`)
  }
}

export { openuiPromptOptions, openuiLibrary, ADPA_GENUI_EXTENSION_NAMES }
