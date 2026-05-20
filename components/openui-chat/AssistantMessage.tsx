"use client";

import React, { useMemo, useState } from "react";
import { AssistantMessage } from "@openuidev/react-headless";
import { MarkDownRenderer } from "@openuidev/react-ui";
import { openuiLibrary } from "@openuidev/react-ui/genui-lib";
import { Copy, FileText, Code, Volume2, ThumbsUp, ThumbsDown, Check } from "lucide-react";

import { DynamicComponentRenderer } from "./DynamicComponentRenderer";
import {
  extractOpenUILangText,
  looksLikeOpenUILang,
} from "@/lib/openui/library";

interface AssistantMessageProps {
  message: AssistantMessage;
  isStreaming: boolean;
}

export const CustomAssistantMessage: React.FC<AssistantMessageProps> = ({
  message,
  isStreaming,
}) => {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const rawContent = message.content || "";
  const langText = useMemo(() => extractOpenUILangText(rawContent), [rawContent]);
  const isGenUILang = useMemo(
    () => looksLikeOpenUILang(langText),
    [langText]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  const handleExportPDF = () => {
    if (!rawContent) return;
    setExporting(true);

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      setExporting(false);
      return;
    }

    let cleanContent = rawContent
      .replace(/```(?:openui-lang|openui)\s*\n?/gi, "")
      .replace(/```\s*$/g, "")
      .replace(/<context>[\s\S]*<\/context>/g, "")
      .replace(/<content[^>]*>/g, "")
      .replace(/<\/content>/g, "")
      .replace(/\n/g, "<br/>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/### (.*?)(<br\/>|$)/g, "<h3>$1</h3>")
      .replace(/## (.*?)(<br\/>|$)/g, "<h2>$1</h2>")
      .replace(/# (.*?)(<br\/>|$)/g, "<h1>$1</h1>");

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ADPA Governance Report</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: Inter, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; }
            .header { border-bottom: 3px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; }
            .logo-title { font-size: 22px; font-weight: 700; color: #0f172a; }
            .content { font-size: 14px; color: #334155; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <div class="header"><div class="logo-title">ADPA Document Report</div></div>
          <div class="content">${cleanContent}</div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
      setExporting(false);
    }, 600);
  };

  const handleSpeak = () => {
    if (!rawContent) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const cleanText = rawContent.replace(/```[\s\S]*?```/g, "").replace(/<[^>]*>/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex gap-3 px-4 py-4 border-b border-slate-100 bg-white">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 text-sm font-semibold">
        AI
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <span className="text-xs font-semibold tracking-wide text-slate-500">
          Advisor response
        </span>

        {showRaw ? (
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-700">
            {isGenUILang ? langText : JSON.stringify(message, null, 2)}
          </pre>
        ) : isGenUILang ? (
          <div className="genui-lang-render min-w-0 w-full">
            <DynamicComponentRenderer
              response={langText}
              isStreaming={isStreaming}
              library={openuiLibrary}
            />
          </div>
        ) : rawContent ? (
          <MarkDownRenderer
            textMarkdown={rawContent}
            className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700"
          />
        ) : null}

        {!isStreaming && (
          <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50"
              title="Copy response"
            >
              {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              title="Export as PDF"
            >
              <FileText size={13} className="text-violet-600" />
              <span>{exporting ? "Exporting…" : "Export PDF"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRaw(!showRaw)}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                showRaw
                  ? "border-violet-200 bg-violet-50 text-violet-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title={isGenUILang ? "Show OpenUI Lang source" : "Show raw message JSON"}
            >
              <Code size={13} />
              <span>{showRaw ? "Show rendered" : isGenUILang ? "View source" : "View JSON"}</span>
            </button>

            <button
              type="button"
              onClick={handleSpeak}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                speaking
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="Read aloud"
            >
              <Volume2 size={13} />
              <span>{speaking ? "Stop" : "Speak"}</span>
            </button>

            <span className="mx-1 h-4 w-px bg-slate-200" />

            <button
              type="button"
              onClick={() => setFeedback(feedback === "like" ? null : "like")}
              className={`rounded-md border p-1.5 transition-colors ${
                feedback === "like"
                  ? "border-blue-200 bg-blue-50 text-blue-600"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <ThumbsUp size={13} />
            </button>

            <button
              type="button"
              onClick={() => setFeedback(feedback === "dislike" ? null : "dislike")}
              className={`rounded-md border p-1.5 transition-colors ${
                feedback === "dislike"
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <ThumbsDown size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
