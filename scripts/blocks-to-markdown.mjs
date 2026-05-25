#!/usr/bin/env node
/**
 * Convert ADPA-style JSON { blocks: [...] } to Markdown.
 * Usage: node scripts/blocks-to-markdown.mjs <input.json> [output.md]
 */
import fs from "node:fs"

function blockToMarkdown(block) {
  const { type } = block
  const content = block.content

  switch (type) {
    case "heading_1":
      return `# ${content}\n\n`
    case "heading_2":
      return `## ${content}\n\n`
    case "heading_3":
      return `### ${content}\n\n`
    case "heading_4":
      return `#### ${content}\n\n`
    case "heading_5":
      return `##### ${content}\n\n`
    case "heading_6":
      return `###### ${content}\n\n`
    case "paragraph":
      return `${String(content).trim()}\n\n`
    case "horizontal_rule":
      return `---\n\n`
    case "table":
      return `${String(content).trim()}\n\n`
    case "bulleted_list":
      if (Array.isArray(content)) {
        return content.map((item) => `- ${String(item).trim()}`).join("\n") + "\n\n"
      }
      return `${String(content).trim()}\n\n`
    case "numbered_list":
      if (Array.isArray(content)) {
        return (
          content
            .map((item, i) => {
              const text = String(item).trim()
              if (/^\*\*\d+\./.test(text)) return text
              return `${i + 1}. ${text}`
            })
            .join("\n") + "\n\n"
        )
      }
      return `${String(content).trim()}\n\n`
    default:
      if (content == null || content === "") return ""
      return `${String(content).trim()}\n\n`
  }
}

const inputPath = process.argv[2]
const outputPath = process.argv[3] ?? (inputPath === "-" ? "output.md" : inputPath.replace(/\.json$/i, ".md"))

if (!inputPath) {
  console.error("Usage: node scripts/blocks-to-markdown.mjs <input.json|-> [output.md]")
  process.exit(1)
}

const raw =
  inputPath === "-"
    ? fs.readFileSync(0, "utf8")
    : fs.readFileSync(inputPath, "utf8")
const data = JSON.parse(raw)
const blocks = data.blocks ?? data
if (!Array.isArray(blocks)) {
  console.error("Expected { blocks: [...] } or a blocks array")
  process.exit(1)
}

const markdown = blocks.map(blockToMarkdown).join("")
fs.writeFileSync(outputPath, markdown, "utf8")
console.log(`Wrote ${outputPath} (${markdown.length} chars)`)
