import {
  buildCoverBlurb,
  buildCoverBlurbFromSources,
  COVER_SUMMARY_MAX_CHARS,
  extractPreambleTagline,
} from "@/lib/openui/coverSummary"

describe("coverSummary", () => {
  test("buildCoverBlurb caps length and prefers first sentences", () => {
    const long =
      "First sentence about the program. Second sentence adds context. Third sentence continues with more detail. Fourth sentence should not appear on the cover because it exceeds the teaser limit."
    const blurb = buildCoverBlurb(long)
    expect(blurb.length).toBeLessThanOrEqual(COVER_SUMMARY_MAX_CHARS)
    expect(blurb).toMatch(/First sentence/)
    expect(blurb).not.toMatch(/Fourth sentence/)
  })

  test("extractPreambleTagline finds tagline after title block", () => {
    const preamble = `# Resource Management Plan
Enterprise cloud migration

A comprehensive analysis of resource allocation and governance.`
    const tagline = extractPreambleTagline(preamble)
    expect(tagline).toBeDefined()
    expect(tagline!.length).toBeGreaterThanOrEqual(24)
  })

  test("buildCoverBlurbFromSources prefers preamble tagline", () => {
    const blurb = buildCoverBlurbFromSources({
      fullSummary: "A".repeat(900),
      preambleBody: `# Title\nSubtitle\n\nShort tagline for the cover page only.`,
      executiveSummaryBody: "A".repeat(900),
    })
    expect(blurb).toMatch(/Short tagline/)
    expect(blurb.length).toBeLessThanOrEqual(COVER_SUMMARY_MAX_CHARS)
  })
})
