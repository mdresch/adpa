declare global {
  interface Window {
    mermaid?: {
      initialize: (config: Record<string, unknown>) => void
      parse: (code: string, options?: Record<string, unknown>) => Promise<unknown>
      render: (id: string, code: string) => Promise<{ svg: string }>
    }
  }
}

const MERMAID_CDN_SCRIPT_ID = "adpa-mermaid-cdn"
const MERMAID_CDN_URL = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"

async function loadMermaidFromCdn() {
  if (window.mermaid) {
    return window.mermaid
  }

  const existingScript = document.getElementById(MERMAID_CDN_SCRIPT_ID) as HTMLScriptElement | null

  if (existingScript) {
    await new Promise<void>((resolve, reject) => {
      if (window.mermaid) {
        resolve()
        return
      }

      existingScript.addEventListener("load", () => resolve(), { once: true })
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Mermaid from CDN")), { once: true })
    })

    if (!window.mermaid) {
      throw new Error("Mermaid CDN script loaded but window.mermaid is unavailable")
    }

    return window.mermaid
  }

  const script = document.createElement("script")
  script.id = MERMAID_CDN_SCRIPT_ID
  script.src = MERMAID_CDN_URL
  script.async = true

  await new Promise<void>((resolve, reject) => {
    script.addEventListener("load", () => resolve(), { once: true })
    script.addEventListener("error", () => reject(new Error("Failed to load Mermaid from CDN")), { once: true })
    document.head.appendChild(script)
  })

  if (!window.mermaid) {
    throw new Error("Mermaid CDN script loaded but window.mermaid is unavailable")
  }

  return window.mermaid
}

export async function loadMermaid() {
  try {
    const mermaidModule = await import("mermaid")
    return mermaidModule.default
  } catch {
    if (typeof window === "undefined") {
      throw new Error("Mermaid is unavailable during server-side rendering")
    }

    return loadMermaidFromCdn()
  }
}

export async function renderMermaidToSvg(code: string, diagramId: string): Promise<string> {
  const mermaid = await loadMermaid()

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    suppressErrorRendering: true,
    theme: document.documentElement.classList.contains("dark") ? "dark" : "default",
  })

  await mermaid.parse(code, { suppressErrors: false })
  const { svg } = await mermaid.render(diagramId, code)
  return svg
}