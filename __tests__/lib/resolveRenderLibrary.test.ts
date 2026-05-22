import { isLegacyReportRootLang } from "@/lib/openui/library"

describe("isLegacyReportRootLang", () => {
  it("detects legacy Report root", () => {
    const lang = `root = Report("Title", "Sub", {}, [s1])`
    expect(isLegacyReportRootLang(lang)).toBe(true)
  })

  it("detects Report root inside openui-lang fence", () => {
    const lang = "```openui-lang\nroot = Report('T', null, {}, [])\n```"
    expect(isLegacyReportRootLang(lang)).toBe(true)
  })

  it("returns false for Stack/Card GenUI roots", () => {
    const lang = `root = Stack([cover, ch1])`
    expect(isLegacyReportRootLang(lang)).toBe(false)
  })

  it("does not treat Report in nested component names as root", () => {
    const lang = `root = Stack([ReportCoverHero("x")])`
    expect(isLegacyReportRootLang(lang)).toBe(false)
  })
})
