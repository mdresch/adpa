import {
  sanitizeOpenUILang,
  sanitizeCardHeaderCalls,
  splitTopLevelLangArgs,
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

  it("preserves valid two-arg CardHeader", () => {
    const input = 'h = CardHeader("BRD", "Cloud Migration Program")'
    expect(sanitizeOpenUILang(input)).toBe(input)
  })

  it("drops mistaken Table caption second arg", () => {
    const input =
      't = Table([Col("A", ["1"]), Col("B", ["2"])], "Table 1: Objectives Table")'
    expect(sanitizeOpenUILang(input)).toBe('t = Table([Col("A", ["1"]), Col("B", ["2"])])')
  })
})

describe("sanitizeCardHeaderCalls", () => {
  it("still works as CardHeader-only helper", () => {
    const input = 'x = CardHeader("A", "B", "C")'
    expect(sanitizeCardHeaderCalls(input)).toBe('x = CardHeader("A", "B")')
  })
})
