/**
 * Pick the OpenUI Lang render library from assistant output.
 * Legacy threads use root = Report(...); newer GenUI uses Stack/Card from genui-lib.
 */

import type { Library } from "@openuidev/react-lang"

import { adpaLibrary } from "./adpaLibrary"
import { isLegacyReportRootLang } from "./library"
import { projectOpenUILibrary } from "./projectOpenUILibrary"

export { isLegacyReportRootLang } from "./library"

/** Report threads need adpaLibrary; GenUI charter/layout threads use projectOpenUILibrary. */
export function resolveOpenUIRenderLibrary(raw: string): Library {
  return isLegacyReportRootLang(raw) ? adpaLibrary : projectOpenUILibrary
}
