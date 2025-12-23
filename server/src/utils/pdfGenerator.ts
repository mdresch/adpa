/**
 * PDF Generator Utility
 * Converts Markdown content to PDF using Puppeteer
 */

import puppeteer from "puppeteer"
import { marked } from "marked"
import { logger } from "./logger"

export interface PDFOptions {
  format?: "A4" | "Letter"
  margin?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
  displayHeaderFooter?: boolean
  headerTemplate?: string
  footerTemplate?: string
  printBackground?: boolean
}

/**
 * Convert Markdown to PDF
 */
export async function markdownToPdf(
  markdown: string,
  options: PDFOptions = {}
): Promise<Buffer> {
  let browser = null

  try {
    logger.info("Starting Markdown to PDF conversion")

    // Configure marked with GFM (GitHub Flavored Markdown) for table support
    marked.setOptions({
      gfm: true,
      breaks: false,
      headerIds: false,
      mangle: false
    })

    // Parse Markdown to HTML
    const htmlContent = await marked.parse(markdown)

    // Create full HTML document with styling
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
      margin-top: 30px;
    }
    h2 {
      color: #34495e;
      border-bottom: 1px solid #bdc3c7;
      padding-bottom: 8px;
      margin-top: 25px;
    }
    h3 {
      color: #34495e;
      margin-top: 20px;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #3498db;
      color: white;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f2f2f2;
    }
    code {
      background-color: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    pre {
      background-color: #f4f4f4;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #3498db;
      margin: 20px 0;
      padding-left: 20px;
      color: #555;
    }
    ul, ol {
      margin: 15px 0;
      padding-left: 30px;
    }
    li {
      margin: 8px 0;
    }
    a {
      color: #3498db;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
    `

    // Launch Puppeteer with production-friendly configuration
    // For Railway/production: Use system Chrome if available, otherwise try to download
    const launchOptions: any = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
        "--disable-ipc-flooding-protection",
      ],
    }

    // Try to use system Chrome/Chromium if available (for Railway/production)
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
    } else {
      // Try common system Chrome paths
      const possiblePaths = [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/snap/bin/chromium",
      ]
      
      for (const path of possiblePaths) {
        try {
          const fs = require("fs")
          if (fs.existsSync(path)) {
            launchOptions.executablePath = path
            logger.info(`Using system Chrome at: ${path}`)
            break
          }
        } catch (e) {
          // Continue to next path
        }
      }
    }

    try {
      browser = await puppeteer.launch(launchOptions)
    } catch (launchError: any) {
      // If launch fails and we don't have an executable path, try without it (let Puppeteer download Chrome)
      if (!launchOptions.executablePath && launchError.message.includes("Could not find Chrome")) {
        logger.warn("System Chrome not found, attempting to use Puppeteer's bundled Chrome...")
        delete launchOptions.executablePath
        browser = await puppeteer.launch(launchOptions)
      } else {
        throw launchError
      }
    }

    const page = await browser.newPage()

    // Set content
    await page.setContent(fullHtml, {
      waitUntil: "networkidle0",
    })

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: options.format || "A4",
      margin: options.margin || {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm",
      },
      displayHeaderFooter: options.displayHeaderFooter || false,
      headerTemplate: options.headerTemplate || "",
      footerTemplate: options.footerTemplate || "",
      printBackground: options.printBackground !== false,
    })

    logger.info("PDF generated successfully")
    return Buffer.from(pdfBuffer)
  } catch (error: any) {
    logger.error("Failed to generate PDF:", error)
    throw new Error(`PDF generation failed: ${error.message}`)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Convert HTML to PDF
 */
export async function htmlToPdf(
  html: string,
  options: PDFOptions = {}
): Promise<Buffer> {
  let browser = null

  try {
    logger.info("Starting HTML to PDF conversion")

    // Launch Puppeteer with production-friendly configuration
    // For Railway/production: Use system Chrome if available, otherwise try to download
    const launchOptions: any = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
        "--disable-ipc-flooding-protection",
      ],
    }

    // Try to use system Chrome/Chromium if available (for Railway/production)
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
    } else {
      // Try common system Chrome paths
      const possiblePaths = [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/snap/bin/chromium",
      ]
      
      for (const path of possiblePaths) {
        try {
          const fs = require("fs")
          if (fs.existsSync(path)) {
            launchOptions.executablePath = path
            logger.info(`Using system Chrome at: ${path}`)
            break
          }
        } catch (e) {
          // Continue to next path
        }
      }
    }

    try {
      browser = await puppeteer.launch(launchOptions)
    } catch (launchError: any) {
      // If launch fails and we don't have an executable path, try without it (let Puppeteer download Chrome)
      if (!launchOptions.executablePath && launchError.message.includes("Could not find Chrome")) {
        logger.warn("System Chrome not found, attempting to use Puppeteer's bundled Chrome...")
        delete launchOptions.executablePath
        browser = await puppeteer.launch(launchOptions)
      } else {
        throw launchError
      }
    }

    const page = await browser.newPage()

    // Set content
    await page.setContent(html, {
      waitUntil: "networkidle0",
    })

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: options.format || "A4",
      margin: options.margin || {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm",
      },
      displayHeaderFooter: options.displayHeaderFooter || false,
      headerTemplate: options.headerTemplate || "",
      footerTemplate: options.footerTemplate || "",
      printBackground: options.printBackground !== false,
    })

    logger.info("PDF generated successfully")
    return Buffer.from(pdfBuffer)
  } catch (error: any) {
    logger.error("Failed to generate PDF:", error)
    throw new Error(`PDF generation failed: ${error.message}`)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}
