"use client";
import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { EntityPillNodeView } from "./entity-pill-nodeview"

export const EntityPillExtension = Node.create({
  name: "entityPill",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      entityType: { default: null },
      jsonStr: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: "span[data-entity-pill]",
        getAttrs: (node) => ({
          entityType: (node as HTMLElement).getAttribute("data-entity-type"),
          jsonStr: (node as HTMLElement).getAttribute("data-json-str"),
        }),
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-entity-pill": "" })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(EntityPillNodeView)
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          // Serialize back into the raw H8 markdown tag
          state.write(`\n\n######## ${node.attrs.entityType}: ${node.attrs.jsonStr}\n\n`)
        },
        parse: {
          setup(markdownit: any) {
            markdownit.block.ruler.before("paragraph", "entity_pill_block", (state: any, startLine: number, endLine: number, silent: boolean) => {
              const startPos = state.bMarks[startLine] + state.tShift[startLine]
              const startMax = state.eMarks[startLine]
              const firstLineText = state.src.slice(startPos, startMax)

              // Quick check if it starts with the tag
              const match = firstLineText.match(/^########\s+([a-zA-Z0-9_-]+):\s*(.*)$/)
              if (!match) return false
              if (silent) return true

              const entityType = match[1]
              let jsonStr = match[2].trim()
              if (jsonStr.endsWith('\\')) jsonStr = jsonStr.slice(0, -1).trim()

              let currentLine = startLine
              let parsedData = null
              let foundEnd = false

              while (currentLine < endLine) {
                try {
                  parsedData = JSON.parse(jsonStr)
                  foundEnd = true
                  break
                } catch (e) {
                  currentLine++
                  if (currentLine >= endLine) break
                  
                  const pos = state.bMarks[currentLine] + state.tShift[currentLine]
                  const max = state.eMarks[currentLine]
                  let nextLine = state.src.slice(pos, max)
                  if (nextLine.endsWith('\\')) nextLine = nextLine.slice(0, -1)
                  
                  jsonStr += "\n" + nextLine
                }
              }

              if (!foundEnd) return false // Abort if we never found valid JSON

              // We parsed it successfully! Re-stringify it cleanly for the HTML attributes
              const cleanJson = JSON.stringify(parsedData)
              const escapedJson = cleanJson
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&apos;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
              
              const escapedType = entityType
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&apos;")

              const token = state.push("html_block", "", 0)
              token.content = `<span data-entity-pill data-entity-type="${escapedType}" data-json-str="${escapedJson}"></span>`
              
              state.line = currentLine + 1
              return true
            })
          },
        },
      },
    }
  },
})
