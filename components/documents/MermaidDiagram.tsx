"use client"

import { useEffect, useMemo, useState } from "react"
import { renderMermaidToSvg } from "@/lib/documents/mermaid-client"

interface MermaidDiagramProps {
  code: string
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const diagramId = useMemo(
    () => `mermaid-${Math.random().toString(36).slice(2, 10)}`,
    [],
  )

  useEffect(() => {
    let isCancelled = false

    const renderDiagram = async () => {
      try {
        setError(null)
        setSvg(null)

        const renderedSvg = await renderMermaidToSvg(code, diagramId)

        if (!isCancelled) {
          setSvg(renderedSvg)
        }
      } catch (renderError) {
        if (!isCancelled) {
          const message = renderError instanceof Error ? renderError.message : "Failed to render Mermaid diagram"
          setError(message)
        }
      }
    }

    void renderDiagram()

    return () => {
      isCancelled = true
    }
  }, [code, diagramId])

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <p className="mb-2 font-medium text-destructive">Mermaid render failed</p>
        <p className="mb-3 text-muted-foreground">{error}</p>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground">{code}</pre>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="my-4 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Rendering Mermaid diagram...
      </div>
    )
  }

  return (
    <div
      className="my-4 overflow-x-auto rounded-lg border border-border bg-background p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}