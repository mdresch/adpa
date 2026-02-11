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
import { useEffect, useState, useMemo } from "react";
import { useDebouncedCallback } from "use-debounce";
import { defaultExtensions } from "./extensions";
import { uploadFn } from "./image-upload";
import { createSlashCommand } from "./slash-command";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: true, breaks: true });

interface NovelEditorProps {
  initialValue?: JSONContent | string;
  onChange?: (value: JSONContent, html: string, markdown: string) => void;
  storageKey?: string;
  onFeedback?: () => void;
}

const NovelEditor = ({ initialValue, onChange, storageKey, onFeedback }: NovelEditorProps) => {
  const [initialContent, setInitialContent] = useState<null | JSONContent | string>(null);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [charsCount, setCharsCount] = useState<number | undefined>();

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
            // Assume markdown -> parse to HTML
            const parsedHtml = md.render(initialValue);
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

  if (!initialContent) return null;

  return (
    <div className="relative w-full max-w-screen-lg">
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
