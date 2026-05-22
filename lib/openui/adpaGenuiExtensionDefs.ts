/**
 * ADPA-only OpenUI Lang components merged into projectOpenUILibrary.
 * Names must not collide with @openuidev/react-ui/genui-lib (no second Accordion, Table, etc.).
 */

import { BulletsDef } from "./bulletsDef"
import { ComparisonDef } from "./comparisonDef"
import { ReportCoverHeroDef } from "./reportCoverHeroDef"
import { TableOfContentsDef } from "./tableOfContentsDef"
import { TeamDef } from "./teamDef"
import { TimelineDef } from "./timelineDef"

export const ADPA_GENUI_EXTENSION_DEFS = [
  BulletsDef,
  TimelineDef,
  TeamDef,
  ComparisonDef,
  TableOfContentsDef,
  ReportCoverHeroDef,
] as const

export const ADPA_GENUI_EXTENSION_NAMES = [
  "Bullets",
  "Timeline",
  "Team",
  "Comparison",
  "TableOfContents",
  "ReportCoverHero",
] as const
