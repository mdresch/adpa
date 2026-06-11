import {
  countSingletonDuplicates,
  dedupeSingletonIntegrations,
  pickCanonicalIntegration,
} from "@/lib/integrationSingletons"

describe("integrationSingletons", () => {
  const mongoA = {
    id: "a",
    type: "mongodb",
    name: "MongoDB ADPA Rag",
    is_active: false,
    last_sync: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  }
  const mongoB = {
    id: "b",
    type: "mongodb",
    name: "MongoDB adpa_rag",
    is_active: true,
    last_sync: "2025-06-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
  }
  const mongoC = {
    id: "c",
    type: "mongodb",
    name: "MongoDB Vector Store (legacy)",
    is_active: true,
    last_sync: "2025-05-01T00:00:00.000Z",
    updated_at: "2025-06-01T00:00:00.000Z",
  }

  it("pickCanonicalIntegration prefers active and recent last_sync", () => {
    const canonical = pickCanonicalIntegration([mongoA, mongoB, mongoC], "mongodb")
    expect(canonical?.id).toBe("b")
  })

  it("dedupeSingletonIntegrations keeps one mongodb with canonical display name", () => {
    const deduped = dedupeSingletonIntegrations([mongoA, mongoB, { id: "x", type: "notion", name: "Notion" }, mongoC])
    const mongo = deduped.find((i) => i.type === "mongodb")
    expect(deduped.filter((i) => i.type === "mongodb")).toHaveLength(1)
    expect(mongo?.name).toBe("MongoDB Vector Store")
    expect(mongo?.id).toBe("b")
    expect(deduped.filter((i) => i.type === "notion")).toHaveLength(1)
  })

  it("countSingletonDuplicates reports extra rows", () => {
    expect(countSingletonDuplicates([mongoA], "mongodb")).toBe(0)
    expect(countSingletonDuplicates([mongoA, mongoB, mongoC], "mongodb")).toBe(2)
  })
})
