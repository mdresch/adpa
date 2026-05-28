"use client";
import { defaultEditorContent } from "@/lib/editor-content-default";
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  type EditorInstance,
  EditorRoot,
  ImageResizer,
  type JSONContent,
  handleCommandNavigation,
  handleImageDrop,
  handleImagePaste,
} from "novel";
import { useEffect, useState, useMemo, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import { defaultExtensions } from "./extensions";
import { uploadFn } from "./image-upload";
import { createSlashCommand } from "./slash-command";
import { renderEditorMarkdown } from "@/lib/editor/markdown";
import { renderMermaidToSvg } from "@/lib/documents/mermaid-client";
import { isMermaidLanguage, looksLikeMermaidCode, normalizeMermaidMarkdown } from "@/lib/documents/mermaid";

const cleanMarkdown = (content: string): string => {
  if (!content) return "";
  let cleaned = content.trim();

  // Remove common code block wrappers added by AI (e.g., ```markdown ... ```)
  // Matching start and end markers
  const codeBlockRegex = /^```(?:markdown|md)?\n([\s\S]*?)\n```$/i;
  const match = cleaned.match(codeBlockRegex);
  if (match) {
    cleaned = match[1].trim();
  }

  // Remove any non-Markdown wrapper text if AI added explanations at the start
  const mdHeadingStart = cleaned.indexOf("#");
  if (mdHeadingStart > 0 && mdHeadingStart < 100) {
    const lead = cleaned.substring(0, mdHeadingStart).trim();
    if (lead.length < 50) {
      cleaned = cleaned.substring(mdHeadingStart);
    }
  }

  // Remove fenced code blocks that exclusively wrap our H8 entity tags.
  // The LLM sometimes wraps the tags in ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/```(?:json|markdown|md)?\s*\n(#{8}\s+[a-zA-Z0-9_-]+:(?:(?!```)[\s\S])*?)\n\s*```/g, '$1');

  return cleaned;
};

interface NovelEditorProps {
  initialValue?: JSONContent | string;
  onChange?: (value: JSONContent, html: string, markdown: string) => void;
  storageKey?: string;
  onFeedback?: () => void;
  enableInlineMermaid?: boolean;
}

const NovelEditor = ({ initialValue, onChange, storageKey, onFeedback, enableInlineMermaid = true }: NovelEditorProps) => {
  const [initialContent, setInitialContent] = useState<null | JSONContent | string>(null);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [charsCount, setCharsCount] = useState<number | undefined>();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const extensions = useMemo(() => {
    return [...defaultExtensions, createSlashCommand(onFeedback)];
  }, [onFeedback]);

  const debouncedUpdates = useDebouncedCallback(async (editor: EditorInstance) => {
    const json = editor.getJSON();
    const html = editor.getHTML();
    // Get markdown from storage if available
    const markdown = (editor.storage.markdown?.getMarkdown ? editor.storage.markdown.getMarkdown() : "");

    setCharsCount(editor.storage.characterCount.words());

    if (storageKey) {
      window.localStorage.setItem(storageKey, JSON.stringify(json));
    }

    if (onChange) {
      onChange(json, html, markdown);
    }

    setSaveStatus("Saved");
  }, 500);

  useEffect(() => {
    if (initialValue) {
      // Try parsing string as JSON if it looks like it
      if (typeof initialValue === 'string') {
        try {
          const trimmed = initialValue.trim();
          if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && (trimmed.endsWith('}') || trimmed.endsWith(']'))) {
            setInitialContent(JSON.parse(initialValue));
          } else {
            // Assume markdown -> clean and parse to HTML
            const cleanedMarkdown = normalizeMermaidMarkdown(cleanMarkdown(initialValue));
            const parsedHtml = renderEditorMarkdown(cleanedMarkdown);
            setInitialContent(parsedHtml);
          }
        } catch (e) {
          setInitialContent(initialValue);
        }
      } else {
        setInitialContent(initialValue);
      }
      return;
    }

    if (storageKey) {
      const content = window.localStorage.getItem(storageKey);
      if (content) setInitialContent(JSON.parse(content));
      else setInitialContent(defaultEditorContent);
    } else {
      setInitialContent(defaultEditorContent);
    }
  }, [initialValue, storageKey]);

  useEffect(() => {
    if (!enableInlineMermaid) {
      return
    }

    let cancelled = false

    const renderInlineMermaid = async () => {
      const container = containerRef.current
      if (!container) {
        return
      }

      const mermaidNodes = container.querySelectorAll<HTMLElement>("pre code")

      await Promise.all(Array.from(mermaidNodes).map(async (node, index) => {
        const pre = node.closest('pre')
        if (!pre || pre.dataset.mermaidRendered === "true" || pre.dataset.mermaidRendering === "true") {
          return
        }

        const code = node.textContent?.trim()
        const className = `${node.className || ''} ${pre.className || ''}`.trim()
        if (!code || (!isMermaidLanguage(className) && !looksLikeMermaidCode(code))) {
          return
        }

        try {
          pre.dataset.mermaidRendering = "true"
          const svg = await renderMermaidToSvg(code, `novel-mermaid-${index}-${Math.random().toString(36).slice(2, 8)}`)
          if (cancelled) {
            return
          }

          let preview = pre.previousElementSibling as HTMLElement | null
          if (!preview || preview.dataset.mermaidPreview !== 'true') {
            preview = document.createElement('div')
            preview.dataset.mermaidPreview = 'true'
            preview.contentEditable = 'false'
            preview.className = 'adpa-mermaid-preview my-4 overflow-x-auto rounded-lg border border-border bg-background p-4'
            pre.parentElement?.insertBefore(preview, pre)
          }

          preview.innerHTML = svg
          pre.style.display = 'none'
          pre.dataset.mermaidRendered = "true"
          delete pre.dataset.mermaidRendering
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to render Mermaid diagram"
          pre.style.display = ''
          pre.dataset.mermaidRendered = "error"
          pre.title = message
          delete pre.dataset.mermaidRendering
        }
      }))
    }

    if (!initialContent) {
      return
    }

    const container = containerRef.current
    if (!container) {
      return
    }

    const rafId = window.requestAnimationFrame(() => {
      void renderInlineMermaid()
    })

    const observer = new MutationObserver(() => {
      void renderInlineMermaid()
    })

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [enableInlineMermaid, initialContent]);

  if (!initialContent) return null;

  return (
    <div ref={containerRef} className="relative w-full max-w-screen-lg">
      <div className="flex absolute right-5 top-5 z-10 mb-5 gap-2">
        <div className="rounded-lg bg-accent px-2 py-1 text-sm text-muted-foreground">{saveStatus}</div>
        <div className={charsCount ? "rounded-lg bg-accent px-2 py-1 text-sm text-muted-foreground" : "hidden"}>
          {charsCount} Words
        </div>
      </div>
      <EditorRoot>
        <EditorContent
          immediatelyRender={false}
          initialContent={initialContent}
          extensions={extensions}
          className="relative min-h-[500px] w-full max-w-screen-lg border-muted bg-background sm:mb-[calc(20vh)] sm:rounded-lg sm:border sm:shadow-lg"
          editorProps={{
            handleDOMEvents: {
              keydown: (_view: any, event: any) => handleCommandNavigation(event),
            },
            handlePaste: (view: any, event: any) => handleImagePaste(view, event, uploadFn),
            handleDrop: (view: any, event: any, _slice: any, moved: any) => handleImageDrop(view, event, moved, uploadFn),
            attributes: {
              class:
                "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full",
            },
          }}
          onUpdate={({ editor }: { editor: EditorInstance }) => {
            debouncedUpdates(editor);
            setSaveStatus("Unsaved");
          }}
          slotAfter={<ImageResizer />}
        >
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="px-2 text-muted-foreground">No results</EditorCommandEmpty>
            <EditorCommandList>
              {extensions.find(e => e.name === 'slash-command')?.options.suggestion.items().map((item: any) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val: any) => item.command && item.command(val)}
                  className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                  key={item.title}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>
        </EditorContent>
      </EditorRoot>
    </div>
  );
};

export default NovelEditor;
