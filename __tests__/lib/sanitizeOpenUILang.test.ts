import {
  sanitizeOpenUILang,
  sanitizeCardHeaderCalls,
  splitTopLevelLangArgs,
  replaceLangNodeAssignment,
} from "@/lib/openui/sanitizeOpenUILang"

describe("splitTopLevelLangArgs", () => {
  it("splits nested arrays", () => {
    expect(splitTopLevelLangArgs('"a", ["x", "y"], "b"')).toEqual(['"a"', '["x", "y"]', '"b"'])
  })
})

describe("sanitizeOpenUILang", () => {
  it("converts named CardHeader to positional and drops third arg", () => {
    const input = 'h = CardHeader(title="Intro", subtitle="Sub", "extra")'
    expect(sanitizeOpenUILang(input)).toBe('h = CardHeader("Intro", "Sub")')
  })

  it("drops mistaken default size on CardHeader", () => {
    const input = 'h = CardHeader("Section", "default", body)'
    expect(sanitizeOpenUILang(input)).toBe('h = CardHeader("Section")')
  })

  it("truncates TextContent to two positionals", () => {
    const input = 't = TextContent("Hello", "default", extraRef)'
    expect(sanitizeOpenUILang(input)).toBe('t = TextContent("Hello", "default")')
  })

  it("converts named TextContent to positional", () => {
    const input = 't = TextContent(text="Hi", size="large")'
    expect(sanitizeOpenUILang(input)).toBe('t = TextContent("Hi", "large")')
  })

  it("does not alter valid Bullets with three args", () => {
    const input = 'b = Bullets(null, "numbered", ["a", "b"])'
    expect(sanitizeOpenUILang(input)).toBe(input)
  })

  it("coalesces excess Bullets positionals into items array", () => {
    const input =
      'section2_1 = Bullets("Scope", "bullet", "Cap A", "Cap B", "Del 1", "Del 2")'
    expect(sanitizeOpenUILang(input)).toBe(
      'section2_1 = Bullets("Scope", "bullet", ["Cap A", "Cap B", "Del 1", "Del 2"])'
    )
  })

  it("converts named Bullets(items=) to three positionals", () => {
    const input = 'b = Bullets(title="List", items=["a", "b"])'
    expect(sanitizeOpenUILang(input)).toBe('b = Bullets("List", "bullet", ["a", "b"])')
  })

  it("preserves valid two-arg CardHeader", () => {
    const input = 'h = CardHeader("BRD", "Cloud Migration Program")'
    expect(sanitizeOpenUILang(input)).toBe(input)
  })

  it("drops mistaken Table caption second arg", () => {
    const input =
      't = Table([Col("A", ["1"]), Col("B", ["2"])], "Table 1: Objectives Table")'
    expect(sanitizeOpenUILang(input)).toBe('t = Table([Col("A", ["1"]), Col("B", ["2"])])')
  })

  it("converts named TwoColumnProse to two positionals", () => {
    const input =
      'section11 = TwoColumnProse(left="Left text", right="Right text")'
    expect(sanitizeOpenUILang(input)).toBe(
      'section11 = TwoColumnProse("Left text", "Right text")'
    )
  })

  it("coalesces excess TwoColumnProse positionals into left and right", () => {
    const input =
      'section11 = TwoColumnProse("a", "b", "c", "d")'
    const out = sanitizeOpenUILang(input)
    expect(out).toMatch(/^section11 = TwoColumnProse\("/)
    expect(out).not.toContain("left=")
  })

  it("converts named TableOfContents to title + entries positionals", () => {
    const input =
      'toc = TableOfContents(title=null, entries=[{title: "One", level: 1}, {title: "Two", level: 1}])'
    expect(sanitizeOpenUILang(input)).toBe(
      'toc = TableOfContents(null, [{title: "One", level: 1}, {title: "Two", level: 1}])'
    )
  })

  it("coalesces per-entry TableOfContents positionals into entries array", () => {
    const input =
      'toc = TableOfContents(null, {title: "A", level: 1}, {title: "B", level: 1})'
    expect(sanitizeOpenUILang(input)).toBe(
      'toc = TableOfContents(null, [{title: "A", level: 1}, {title: "B", level: 1}])'
    )
  })

  it("converts named ReportCoverHero to positionals", () => {
    const input =
      'coverHero = ReportCoverHero(imageUrl="/images/cover.jpeg", alt="Cover")'
    expect(sanitizeOpenUILang(input)).toBe(
      'coverHero = ReportCoverHero("/images/cover.jpeg", "Cover")'
    )
  })

  it("converts Comparison array-only to title + sides positionals", () => {
    const input = `section2_3 = Comparison([
      {name: "In-Scope", attributes: {"Activities": "A", "Deliverables": "B"}},
      {name: "Out-of-Scope", attributes: {"Activities": "C"}}
    ])`
    const out = sanitizeOpenUILang(input)
    expect(out).toContain("section2_3 = Comparison(null, [")
    expect(out).toContain('name: "In-Scope"')
    expect(out).not.toMatch(/sides\s*=/)
  })

  it("converts named Comparison to two positionals", () => {
    const input =
      'c = Comparison(title="2.3 Scope", sides=[{name: "In-Scope", attributes: {x: "y"}}])'
    expect(sanitizeOpenUILang(input)).toBe(
      'c = Comparison("2.3 Scope", [{name: "In-Scope", attributes: {x: "y"}}])'
    )
  })

  it("coalesces per-side Comparison positionals into sides array", () => {
    const input =
      'c = Comparison(null, {name: "A", attributes: {x: "1"}}, {name: "B", attributes: {x: "2"}})'
    expect(sanitizeOpenUILang(input)).toBe(
      'c = Comparison(null, [{name: "A", attributes: {x: "1"}}, {name: "B", attributes: {x: "2"}}])'
    )
  })

  it("coalesces Team member objects into members array", () => {
    const input =
      't = Team(null, {name: "A", role: "PM"}, {name: "B", role: "Sponsor"})'
    expect(sanitizeOpenUILang(input)).toBe(
      't = Team(null, [{name: "A", role: "PM"}, {name: "B", role: "Sponsor"}])'
    )
  })

  it("strips ** and backticks inside quoted Lang strings", () => {
    const input =
      'p = TwoColumnProse("Uses the `Project Management Plan` for **governance**.", "Right")'
    const out = sanitizeOpenUILang(input)
    expect(out).toContain("Project Management Plan")
    expect(out).not.toContain("**")
    expect(out).not.toContain("`")
  })
})

describe("sanitizeCardHeaderCalls", () => {
  it("still works as CardHeader-only helper", () => {
    const input = 'x = CardHeader("A", "B", "C")'
    expect(sanitizeCardHeaderCalls(input)).toBe('x = CardHeader("A", "B")')
  })
})

describe("replaceLangNodeAssignment", () => {
  it("replaces only the requested node assignment with balanced parentheses", () => {
    const input = [
      'section10 = TwoColumnProse("keep", "unchanged")',
      'section1 = TwoColumnProse("old left (with parens)", "old right")',
      'section11 = TwoColumnProse("also", "unchanged")',
    ].join("\n")

    expect(
      replaceLangNodeAssignment(
        input,
        "section1",
        "TwoColumnProse",
        'TwoColumnProse("new left", "new right")'
      )
    ).toBe(
      [
        'section10 = TwoColumnProse("keep", "unchanged")',
        'section1 = TwoColumnProse("new left", "new right")',
        'section11 = TwoColumnProse("also", "unchanged")',
      ].join("\n")
    )
  })
})
