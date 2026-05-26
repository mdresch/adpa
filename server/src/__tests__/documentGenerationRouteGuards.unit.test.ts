import { findExistingTemplateDocument, getAIProviderQuotaDetails } from "../utils/documentGenerationRouteGuards"

const makeQuotaError = () => {
  const error = new Error(
    "Failed after 3 attempts. Last error: You exceeded your current quota, please check your plan and billing details.",
  ) as Error & {
    name: string
    lastError?: { statusCode?: number; data?: { error?: { status?: string; message?: string } } }
  }
  error.name = "AI_RetryError"
  error.lastError = {
    statusCode: 429,
    data: {
      error: {
        status: "RESOURCE_EXHAUSTED",
        message:
          "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-2.5-flash",
      },
    },
  }
  return error
}

describe("document generation route guards", () => {
  it("extracts provider quota details from AI retry errors", () => {
    expect(getAIProviderQuotaDetails(makeQuotaError())).toBe(
      "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-2.5-flash",
    )
  })

  it("ignores non-quota provider errors", () => {
    const error = new Error("The provider returned an invalid response") as Error & {
      name: string
      lastError?: { statusCode?: number }
    }
    error.name = "AI_RetryError"
    error.lastError = { statusCode: 500 }

    expect(getAIProviderQuotaDetails(error)).toBeNull()
  })

  it("checks template conflicts with a read-only query", async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [
        {
          id: "b603bc68-20bf-4706-b271-c029e0563777",
          name: "Existing Concept Validation",
          version: 1,
          semantic_version: "1.0.0",
          updated_at: new Date("2026-05-25T00:00:00.000Z"),
        },
      ],
    })

    const existing = await findExistingTemplateDocument(
      { query },
      "3b4f0455-78ba-4b31-836c-5f57ef6cf533",
      "6ce1db50-cd7e-4ab1-9569-5c1e00968d5e",
    )

    expect(existing?.id).toBe("b603bc68-20bf-4706-b271-c029e0563777")
    expect(query).toHaveBeenCalledWith(expect.stringContaining("SELECT"), [
      "3b4f0455-78ba-4b31-836c-5f57ef6cf533",
      "6ce1db50-cd7e-4ab1-9569-5c1e00968d5e",
    ])
    expect(query.mock.calls[0][0]).not.toMatch(/^\s*(INSERT|UPDATE|DELETE)\b/i)
  })
})
