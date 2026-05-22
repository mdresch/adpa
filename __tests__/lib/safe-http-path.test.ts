import {
  assertRelativeApiPath,
  assertRitualApiPath,
  assertSafePathSegment,
  resolveRitualRequestUrl,
} from "@/lib/safe-http-path"

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

describe("assertRitualApiPath", () => {
  it("allows fixed ritual routes", () => {
    expect(assertRitualApiPath("/phase0/ingest")).toBe("/phase0/ingest")
    expect(assertRitualApiPath("/ledger/rtm")).toBe("/ledger/rtm")
  })

  it("allows research-advice with a safe id segment", () => {
    expect(assertRitualApiPath("/rtm/research-advice/req-1")).toBe(
      "/rtm/research-advice/req-1"
    )
  })

  it("rejects unknown or injection paths", () => {
    expect(() => assertRitualApiPath("/phase0/evil")).toThrow()
    expect(() => assertRitualApiPath("https://evil.example/x")).toThrow()
    expect(() => assertRitualApiPath("/rtm/research-advice/../admin")).toThrow()
  })
})

describe("resolveRitualRequestUrl", () => {
  const prevOrchestrator = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL
  const prevApi = process.env.NEXT_PUBLIC_API_URL

  afterEach(() => {
    if (prevOrchestrator === undefined) {
      delete process.env.NEXT_PUBLIC_ORCHESTRATOR_URL
    } else {
      process.env.NEXT_PUBLIC_ORCHESTRATOR_URL = prevOrchestrator
    }
    if (prevApi === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL
    } else {
      process.env.NEXT_PUBLIC_API_URL = prevApi
    }
  })

  it("builds same-origin path when orchestrator URL is unset", () => {
    delete process.env.NEXT_PUBLIC_ORCHESTRATOR_URL
    process.env.NEXT_PUBLIC_API_URL = "/api"
    expect(resolveRitualRequestUrl("/phase0/ingest")).toBe("/api/Ritual/phase0/ingest")
  })

  it("builds absolute URL from configured orchestrator origin", () => {
    process.env.NEXT_PUBLIC_ORCHESTRATOR_URL = "http://127.0.0.1:5000"
    expect(resolveRitualRequestUrl("/ledger/rtm")).toBe(
      "http://127.0.0.1:5000/api/Ritual/ledger/rtm"
    )
  })
})
