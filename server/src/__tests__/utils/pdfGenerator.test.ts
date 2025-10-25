/**
 * PDF Generator Tests
 * Tests for Markdown to PDF conversion
 */

import { markdownToPdf, htmlToPdf } from "../../utils/pdfGenerator"

describe("PDF Generator", () => {
  describe("markdownToPdf", () => {
    it("should convert simple markdown to PDF", async () => {
      const markdown = `# Test Report

This is a test report.

## Section 1

Some content here.`

      const pdf = await markdownToPdf(markdown)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
    }, 30000) // Increase timeout for Puppeteer

    it("should convert markdown with tables to PDF", async () => {
      const markdown = `# Financial Report

| Program | Budget | Spent |
|---------|--------|-------|
| Project A | $100,000 | $75,000 |
| Project B | $200,000 | $150,000 |`

      const pdf = await markdownToPdf(markdown)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
    }, 30000)

    it("should convert markdown with lists to PDF", async () => {
      const markdown = `# Action Items

- Item 1
- Item 2
  - Sub-item A
  - Sub-item B
- Item 3`

      const pdf = await markdownToPdf(markdown)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
    }, 30000)

    it("should apply custom options", async () => {
      const markdown = "# Test"

      const pdf = await markdownToPdf(markdown, {
        format: "Letter",
        margin: {
          top: "1in",
          right: "1in",
          bottom: "1in",
          left: "1in",
        },
      })

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
    }, 30000)
  })

  describe("htmlToPdf", () => {
    it("should convert HTML to PDF", async () => {
      const html = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <h1>Test Report</h1>
  <p>This is a test.</p>
</body>
</html>`

      const pdf = await htmlToPdf(html)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
    }, 30000)

    it("should handle complex HTML", async () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Complex Report</title>
  <style>
    body { font-family: Arial; }
    .header { color: blue; }
  </style>
</head>
<body>
  <h1 class="header">Financial Report</h1>
  <table>
    <tr><th>Item</th><th>Value</th></tr>
    <tr><td>Budget</td><td>$100,000</td></tr>
  </table>
</body>
</html>`

      const pdf = await htmlToPdf(html)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
    }, 30000)
  })

  describe("Error Handling", () => {
    it("should handle invalid markdown gracefully", async () => {
      // Even invalid markdown should not crash
      const markdown = "# Test\n\n```\nUnclosed code block"

      const pdf = await markdownToPdf(markdown)

      expect(pdf).toBeInstanceOf(Buffer)
    }, 30000)

    it("should handle empty content", async () => {
      const markdown = ""

      const pdf = await markdownToPdf(markdown)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
    }, 30000)
  })
})
