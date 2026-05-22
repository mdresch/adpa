import { normalizeMarkdownContent, plainHeaderText } from "@/lib/openui/normalizeMarkdown"

describe("normalizeMarkdownContent", () => {
  test("fixes spaced bold markers", () => {
    expect(normalizeMarkdownContent("** bold **")).toBe("**bold**")
    expect(normalizeMarkdownContent("Cost is ** $1M ** total")).toBe("Cost is **$1M** total")
  })

  test("unescapes lang-style asterisks", () => {
    expect(normalizeMarkdownContent("\\*\\*label\\*\\*")).toBe("**label**")
  })
})

describe("plainHeaderText", () => {
  test("strips markdown heading and bold for CardHeader titles", () => {
    expect(plainHeaderText("## Executive Summary")).toBe("Executive Summary")
    expect(plainHeaderText("** bold ** title")).toBe("bold title")
  })
})
