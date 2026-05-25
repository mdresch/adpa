# GenUI component catalog audit & visual equivalence

**Status:** Living spec (planning + implementation backlog)  
**Audience:** GenUI / layout-plan / prompt work  
**Catalog source:** `getProjectOpenUIComponentNames()` in `lib/openui/projectOpenUILibrary.ts` (61 Lang components as of 2026-05-21)

---

## 1. Why this document exists

ADPA exposes **61** OpenUI Lang components in `projectOpenUILibrary`, but the **layout planner** (`buildLayoutPlan` → `classifySegmentBody`) only assigns a **small subset**. Most reports therefore under-use the catalog and over-use `TextContent` + `Table`.

Goals:

1. **Audit** — cross off every catalog component: wired in planner, prompt-only, or unused.
2. **Placement** — for each component, record *when* source text + user intent justify it (standard governance docs + edge cases).
3. **Visual equivalence** — group components that can present **the same underlying facts** in different shapes.
4. **Variance policy** — first occurrence uses the canonical widget (often `Table`); 2nd+ occurrences in one report rotate among equivalents unless the user locks a type (e.g. “use tables”).

---

## 2. Audit workflow (repeat per release)

| Step | Action | Artifact |
|------|--------|----------|
| 1 | Run `npx tsx -e "import { getProjectOpenUIComponentNames } from './lib/openui/projectOpenUILibrary.ts'; console.log(getProjectOpenUIComponentNames().join('\n'))"` | Current catalog list |
| 2 | For each name, set **Planner** column (§3) | This doc §4 table |
| 3 | Add or extend **fixture** in `__tests__/lib/layoutPlan.test.ts` when planner should assign it | Test + sample markdown in fixture comment |
| 4 | Render fixture through GenUI workspace on a real `docId` | Screenshot / manual checklist |
| 5 | Update **Rotation family** (§5) if a new equivalent is safe | PR + executor prompt in `lib/openui/systemPrompt.ts` |
| 6 | Tick **Edge case doc** row (§6) when validated on a standard document type | Checkbox in §6 |

**Definition of done for a component:** planner assigns it *or* documented as intentionally executor-only / out-of-scope for static reports, with a fixture or explicit exclusion reason.

---

## 3. Planner wiring tiers

| Tier | Meaning | Implementation |
|------|---------|----------------|
| **P0 — Planner** | `classifySegmentBody` or shell builder sets `LayoutPlanNode.component` | `lib/openui/layoutPlan.ts`, `layoutPlanTypes.ts` |
| **P1 — Plan type only** | Name exists on `PlanComponentName` but heuristic never emits it | Extend `classifySegmentBody` |
| **P2 — Catalog + executor** | In `projectOpenUILibrary`; LLM may use if not constrained by layout plan | `systemPrompt.ts`, free-form chat |
| **P3 — Catalog only** | In library; rarely seen in GenUI reports | Future widget or out of scope |
| **P4 — Primitive / compose** | Building blocks (`Col`, `Series`, `TabItem`) not used as segment root | Used inside other Lang, not planned |

**User intent locks (disable rotation):**

- `explicitTableMode` — `/\b(table|tabular|grid|spreadsheet|matrix|register|wbs)\b/i` on prompt
- `explicitCarouselMode` — `/\b(carousel|slides|slide deck|gallery)\b/i`
- `explicitVarietyMode` — `/\b(varied|variety|mix of visuals|different components)\b/i` (strengthen rotation)

**Fidelity locks (never rotate away):**

- Source contains markdown pipe table (`isMarkdownTableBlock`)
- Plan hints: `wbsDictionary`, `attributeTable`, `wideTable`

---

## 4. Full catalog checklist (61 components)

Legend: **Planner** = P0–P4. **Equiv** = rotation family id (§5). **Standard doc** = typical trigger (§6).

| Component | Planner | Equiv | Standard doc / trigger | Notes |
|-----------|---------|-------|------------------------|-------|
| Accordion | P0* | ACC | User asks collapsible / FAQ; long multi-section narrative | *Only when `promptRequestsAccordion` |
| AccordionItem | P4 | ACC | Child of Accordion | |
| AreaChart | P1 | CHART | Metrics over time in prompt | Add when numeric series in source |
| BarChart | P1 | CHART | Status counts, distribution | `toGenUIComponentName(Chart)` |
| Bullets | P0 | LIST | Lists, RAID narratives, outline sections | |
| Button | P3 | — | Interactive actions | Not static report body |
| Buttons | P3 | — | Button groups | |
| Callout | P1 | CALLOUT | Top risk, critical gap, warning | Often executor-added |
| Card | P0 | SHELL | Every chapter / section shell | Via shell builder |
| CardHeader | P0 | SHELL | Section titles | |
| Carousel | P2 | TABULAR | 3–8 peer items (phases, highlights) | **Add P0** — see §5 |
| CheckBoxGroup | P3 | FORM | Settings / forms | Rare in doc GenUI |
| CheckBoxItem | P4 | FORM | | |
| CodeBlock | P2 | CODE | Fenced code in source | Prefer preserve in TextContent or dedicated block |
| Col | P4 | TABLE | Inside `Table([Col(...)])` | |
| Comparison | P0 | TABULAR | In-scope vs out-of-scope, pros/cons columns | |
| DatePicker | P3 | FORM | | |
| Form | P3 | FORM | | |
| FormControl | P4 | FORM | | |
| HorizontalBarChart | P2 | CHART | | |
| Image | P2 | MEDIA | Inline figure URL in source | |
| ImageBlock | P2 | MEDIA | | |
| ImageGallery | P2 | MEDIA | Multiple figures / URLs | vs Carousel for text slides |
| Input | P3 | FORM | | |
| Label | P4 | FORM | | |
| LineChart | P1 | CHART | Trend language | |
| MarkDownRenderer | P3 | — | Legacy / markdown path | |
| Modal | P3 | — | | |
| PieChart | P1 | CHART | Share / composition | |
| Point | P4 | CHART | Chart data point | |
| RadarChart | P2 | CHART | Multi-axis comparison | |
| RadialChart | P2 | CHART | | |
| RadioGroup | P3 | FORM | | |
| RadioItem | P4 | FORM | | |
| ReportCoverHero | P0 | MEDIA | Full-document layout cover image | `layoutPlan` cover hints |
| ScatterChart | P2 | CHART | | |
| ScatterSeries | P4 | CHART | | |
| Select | P3 | FORM | | |
| SelectItem | P4 | FORM | | |
| Separator | P3 | — | Visual divider | |
| Series | P4 | CHART | | |
| SingleStackedBarChart | P2 | CHART | | |
| Slice | P4 | CHART | Pie slice | |
| Slider | P3 | FORM | | |
| Stack | P0 | SHELL | Report root | Always |
| Steps | P1 | LIST | Procedure, numbered process | Extend P0 |
| StepsItem | P4 | LIST | | |
| SwitchGroup | P3 | FORM | | |
| SwitchItem | P4 | FORM | | |
| TabItem | P4 | TABS | | |
| Table | P0 | TABULAR | Pipe tables, registers, WBS, attributes | **Canonical for tabular** |
| TableOfContents | P0 | NAV | 4+ major sections, full report | |
| Tabs | P1 | TABS | Multi-view same topic | Extend P0 |
| Tag | P3 | — | Status chips | |
| TagBlock | P2 | — | | |
| Team | P0 | PEOPLE | Roster, RACI people rows | |
| TextArea | P3 | FORM | | |
| TextCallout | P2 | CALLOUT | | |
| TextContent | P0 | PROSE | Unstructured narrative fallback | **Minimize via uplift** |
| Timeline | P0 | TIME | Dated milestones, schedule lines | |
| TwoColumnProse | P0 | PROSE | Long prose, two-column hint | |

**Coverage snapshot (target vs today):**

| Tier | Count (approx.) | Target |
|------|-----------------|--------|
| P0 today | ~12 roots + shell | 25+ segment types with fixtures |
| P2–P3 | ~35 | Documented + intentional deferral |
| P4 | ~14 | No planner root; compose only |

---

## 5. Visual equivalence families (same input, different presentation)

Use one **canonical** widget for the first matching segment in a report; for the **2nd and 3rd** assignment to the same family (same segment shape, not fidelity-locked tables), rotate in order below.

### TABULAR — registers, small matrices, card-like rows

| Order | Component | When |
|-------|-----------|------|
| 1 | **Table** | Default; user `explicitTableMode`; pipe markdown; WBS/attribute hints |
| 2 | **Carousel** | 3–8 rows, each row reads like a card (title + body); not wide grid |
| 3 | **Bullets** | ≤12 rows, label:value or short lines |
| 4 | **Comparison** | Exactly 2–3 homogeneous columns, few rows |
| 5 | **Tabs** | Distinct categories (e.g. by domain), same row shape per tab |

**Do not rotate:** `wbsDictionary`, `attributeTable`, `wideTable`, `rowCount` ≥ 8.

### LIST — enumerations, requirements, checklists

| Order | Component | When |
|-------|-----------|------|
| 1 | **Bullets** | Default list |
| 2 | **Steps** | Ordered procedure / implementation sequence |
| 3 | **Carousel** | 3–6 items, each item is a “slide” of text |
| 4 | **Accordion** | User asked collapsible; many top-level items |

### TIME — schedule, milestones

| Order | Component | When |
|-------|-----------|------|
| 1 | **Timeline** | Dates / phases detected |
| 2 | **Steps** | Strict sequence without dates |
| 3 | **Carousel** | One milestone per slide |
| 4 | **Table** | Date column + many attributes (only if user wants table) |

### PEOPLE — stakeholders, team

| Order | Component | When |
|-------|-----------|------|
| 1 | **Team** | Name + role patterns |
| 2 | **Table** | Wide roster with many columns |
| 3 | **Carousel** | ≤8 people, bio per person |
| 4 | **Bullets** | Simple name/role list |

### PROSE — narrative blocks

| Order | Component | When |
|-------|-----------|------|
| 1 | **TwoColumnProse** | Long text, two-column eligible |
| 2 | **Card** + **TextContent** | Section in card |
| 3 | **Callout** + excerpt | Key paragraph highlighted |
| 4 | **Bullets** | Split into sentences as list (last resort) |

### CHART — numeric series (future uplift)

| Order | Component | When |
|-------|-----------|------|
| 1 | **BarChart** / **LineChart** / **PieChart** | Extractable numeric series from table or list |
| 2 | **Table** | If chart would mislead |
| 3 | **Bullets** | Few numbers in text |

### MEDIA

| Component | When |
|-----------|------|
| **ReportCoverHero** | Full report cover |
| **ImageGallery** | Multiple image URLs |
| **Image** / **ImageBlock** | Single figure |
| **Carousel** | Text slides, not images |

### NAV / SHELL (no rotation)

`Stack`, `Card`, `CardHeader`, `TableOfContents` — structural; do not rotate.

---

## 6. Standard generated documents → edge cases

Use these document types to stress the full library. Link a real `docId` in dev when validating.

| Document type | Components to prove | Edge case |
|---------------|---------------------|-----------|
| Project charter | Card, CardHeader, Bullets, Table (stakeholders), Team, TextContent, TableOfContents | Accordion only when user asks |
| Schedule / SMP | Timeline, Table (activities), Callout (critical path) | Wide attribute table must stay Table |
| Risk register | Table → 2nd section Carousel or Bullets, Callout | Rotation on 2nd small register |
| RAID / issue log | Table, Bullets, Comparison | |
| WBS dictionary | Table only (no rotation) | `wbsDictionary` hint |
| Status report | Card summary, Bullets wins, Table blockers | |
| Governance gap / compliance | Accordion (if asked), Comparison, Bullets | |
| Requirements list | Bullets → Steps on 2nd list | |
| Executive dashboard prompt | BarChart, Card metrics, Table | Chart uplift |
| “Slides” / “carousel” prompt | Carousel lock | Disables table rotation |
| Dark theme prompt | CSS `genui-report-dark` | Not a component; host theme |

---

## 7. Implementation backlog (ordered)

1. **`applyComponentVariance(plan, flags)`** in `layoutPlan.ts` — occurrence counters per equivalence family; user locks from §3.
2. **Add `Carousel` to `PlanComponentName`** + `isCarouselCandidate()` — before optional table rotation.
3. **Widget uplift pass** — second pass on `typography-fallback` nodes (LIST/TABULAR/PROSE heuristics).
4. **Executor prompt block** — “If `hints.varianceFrom` is set, use that component; preserve all `sourceText`.”
5. **Metrics** — `widgetRatio = widgetNodes / totalNodes` logged in dev when `GENUI_LAYOUT_DEBUG=1`.
6. **Fixtures** — one test per new P0 component; see `__tests__/lib/layoutPlan.test.ts`.
7. **Sync** — `.agents/skills/adpa-genui-workspace/SKILL.md` + §4 in `LESSONS_LEARNED_OPENUI_GENUI_KICKOFF.md`.

---

## 8. LLM executor instruction (template)

Append to layout-plan executor section in `systemPrompt.ts` when variance is enabled:

```text
VISUAL VARIANCE (when layout plan hints include varianceFrom or occurrenceIndex > 1):
- Implement the assigned component exactly; do not substitute Table for Carousel/Bullets/Comparison.
- Preserve 100% of each node's sourceText in the output (no summarization).
- TABULAR family: first segment = Table unless hints forbid; later segments use the planned alternate (Carousel, Bullets, Comparison, Tabs) with the same rows/facts reshaped, not dropped.
- Never alternate away from pipe markdown tables or nodes marked wbsDictionary / attributeTable / wideTable.
- If the user asked for tables/tabular/grid/register/WBS, use Table for every tabular segment.
```

---

## References

- Catalog API: `lib/openui/projectOpenUILibrary.ts` → `getProjectOpenUIComponentNames()`
- Planner: `lib/openui/layoutPlan.ts`, `lib/openui/layoutPlanTypes.ts`
- Prompts: `lib/openui/systemPrompt.ts`, `lib/openui/project-chat-prompts.ts`
- Tests: `__tests__/lib/layoutPlan.test.ts`
- Kickoff lessons: `docs/implementation/LESSONS_LEARNED_OPENUI_GENUI_KICKOFF.md`
- GenUI skill: `.agents/skills/adpa-genui-workspace/SKILL.md`
