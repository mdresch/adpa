import {
  coerceReportCoverImageUrl,
  pickReportCoverImage,
  pickReportSectionImage,
  reportCoverPublicUrl,
  REPORT_COVER_FILENAMES,
} from "@/lib/openui/reportCoverImages"

describe("reportCoverImages", () => {
  test("encodes spaces in public URLs", () => {
    expect(reportCoverPublicUrl("lighthouse shield axzure.jpeg")).toBe(
      "/images/report-covers/lighthouse%20shield%20axzure.jpeg"
    )
  })

  test("coerceReportCoverImageUrl rejects partial stream paths", () => {
    expect(coerceReportCoverImageUrl("/images/report-covers/lighthouse%20shield%")).toBe(
      null
    )
    expect(coerceReportCoverImageUrl("/images/report-covers/OIG2%20(3).")).toBe(null)
    expect(
      coerceReportCoverImageUrl(
        reportCoverPublicUrl("lighthouse shield axzure.jpeg")
      )
    ).toBe("/images/report-covers/lighthouse%20shield%20axzure.jpeg")
  })

  test("stable pick for same document id", () => {
    const a = pickReportCoverImage({ seed: "doc-abc-123", prompt: "report" })
    const b = pickReportCoverImage({ seed: "doc-abc-123", prompt: "other prompt" })
    expect(a.filename).toBe(b.filename)
    expect(a.url).toBe(b.url)
  })

  test("azure keyword prefers azure shield asset", () => {
    const pick = pickReportCoverImage({
      seed: "x",
      prompt: "Azure cloud integration architecture",
      documentTitle: "Platform",
    })
    expect(pick.filename).toBe("lighthouse shield axzure.jpeg")
  })

  test("falls back to manifest filenames", () => {
    const pick = pickReportCoverImage({ seed: "fallback-test" })
    expect(REPORT_COVER_FILENAMES).toContain(pick.filename)
    expect(pick.url.startsWith("/images/report-covers/")).toBe(true)
  })

  test("section pick differs from cover for same document id", () => {
    const cover = pickReportCoverImage({ seed: "doc-xyz", prompt: "governance" })
    const section = pickReportSectionImage({
      seed: "doc-xyz::chapter-1",
      sectionTitle: "Executive Summary",
      prompt: "governance",
    })
    expect(section.alt).toMatch(/^Section illustration:/)
    expect(section.filename).not.toBe(cover.filename)
  })
})
