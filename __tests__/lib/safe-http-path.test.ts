import { assertRelativeApiPath, assertSafePathSegment } from "@/lib/safe-http-path"

describe("assertRelativeApiPath", () => {
  it("allows same-origin API paths", () => {
    expect(assertRelativeApiPath("/api/v1/openui-chat/threads")).toBe(
      "/api/v1/openui-chat/threads"
    )
  })

  it("rejects absolute and protocol URLs", () => {
    expect(() => assertRelativeApiPath("https://evil.example/api")).toThrow()
    expect(() => assertRelativeApiPath("//evil.example/api")).toThrow()
  })

  it("rejects parent traversal", () => {
    expect(() => assertRelativeApiPath("/api/../admin")).toThrow()
  })
})

describe("assertSafePathSegment", () => {
  it("allows ids and slugs", () => {
    expect(assertSafePathSegment("req-123_abc")).toBe("req-123_abc")
  })

  it("rejects path injection characters", () => {
    expect(() => assertSafePathSegment("../x")).toThrow()
    expect(() => assertSafePathSegment("a/b")).toThrow()
  })
})
