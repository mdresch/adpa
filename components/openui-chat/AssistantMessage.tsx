"use client";

import React, { useState } from "react";
import { AssistantMessage } from "@openuidev/react-headless";
import { MarkDownRenderer } from "@openuidev/react-ui";
import { Copy, FileText, Code, Volume2, ThumbsUp, ThumbsDown, Check } from "lucide-react";

interface AssistantMessageProps {
  message: AssistantMessage;
  isStreaming: boolean;
}

export const CustomAssistantMessage: React.FC<AssistantMessageProps> = ({ message, isStreaming }) => {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);
  const [speaking, setSpeaking] = useState(false);

  // 1. Copy Response Text
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  // 2. Export Content as Premium PDF Document
  const handleExportPDF = () => {
    if (!message.content) return;
    setExporting(true);

    // Create a temporary hidden iframe for standard styled PDF printing
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

    // Process raw markdown text into readable HTML
    let cleanContent = message.content
      .replace(/<context>[\s\S]*<\/context>/g, "") // Remove generative context tags
      .replace(/<content[^>]*>/g, "") // Remove start component wrappers
      .replace(/<\/content>/g, "") // Remove end component wrappers
      .replace(/\n/g, "<br/>") // Convert linebreaks
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold Markdown
      .replace(/\*(.*?)\*/g, "<em>$1</em>") // Italic Markdown
      .replace(/`([^`]+)`/g, "<code>$1</code>") // Inline code blocks
      .replace(/### (.*?)(<br\/>|$)/g, "<h3>$1</h3>") // H3 Headers
      .replace(/## (.*?)(<br\/>|$)/g, "<h2>$1</h2>") // H2 Headers
      .replace(/# (.*?)(<br\/>|$)/g, "<h1>$1</h1>"); // H1 Headers

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ADPA Governance Report</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: 'Outfit', sans-serif;
              color: #1e293b;
              line-height: 1.6;
              padding: 0;
              margin: 0;
              background: #ffffff;
            }
            .report-container {
              max-width: 100%;
            }
            .header {
              border-bottom: 3px solid #6366f1;
              padding-bottom: 16px;
              margin-bottom: 24px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .logo-title {
              font-size: 22px;
              font-weight: 700;
              color: #0f172a;
              letter-spacing: -0.025em;
            }
            .logo-title span {
              color: #6366f1;
            }
            .meta {
              font-size: 11px;
              color: #64748b;
              text-align: right;
            }
            .content {
              font-size: 14px;
              color: #334155;
            }
            h1, h2, h3 { 
              color: #0f172a; 
              font-weight: 600; 
              margin-top: 28px;
              margin-bottom: 12px;
            }
            h1 { font-size: 22px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
            h2 { font-size: 18px; }
            h3 { font-size: 15px; }
            p { margin-bottom: 16px; }
            code { 
              font-family: monospace; 
              background: #f1f5f9; 
              padding: 2px 4px; 
              border-radius: 4px; 
              font-size: 12px; 
            }
            pre { 
              background: #f8fafc; 
              padding: 16px; 
              border-radius: 8px; 
              font-family: monospace; 
              font-size: 12px; 
              border: 1px solid #e2e8f0; 
              margin: 20px 0; 
              white-space: pre-wrap; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 24px 0; 
            }
            th, td { 
              border: 1px solid #e2e8f0; 
              padding: 12px 14px; 
              text-align: left; 
              font-size: 13px; 
            }
            th { 
              background: #f8fafc; 
              color: #475569; 
              font-weight: 600; 
            }
            .footer {
              border-top: 1px solid #e2e8f0;
              margin-top: 60px;
              padding-top: 16px;
              font-size: 10px;
              color: #94a3b8;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div class="header">
              <div class="logo-title">ADPA<span>.Governance</span></div>
              <div class="meta">
                <strong>Generated Report</strong><br/>
                Date: ${new Date().toLocaleDateString()}<br/>
                Reference: ${message.id || "N/A"}
              </div>
            </div>
            
            <div class="content">
              ${cleanContent}
            </div>
            
            <div class="footer">
              Confidential — Generated by ADPA AI Assistant Workspace | RPAS-CM Baselines Certified
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Trigger Print after loading styles and fonts
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
      setExporting(false);
    }, 600);
  };

  // 3. Text-to-Speech (TTS)
  const handleSpeak = () => {
    if (!message.content) return;
    
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const cleanText = message.content.replace(/<[^>]*>/g, ""); // Strip XML component tags
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => setSpeaking(false);
    
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex gap-4 p-4 border-b border-slate-800 bg-slate-900/20">
      {/* Bot Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
        AI
      </div>

      {/* Message Content */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <span className="text-xs font-semibold tracking-wide text-slate-400">Advisor Response</span>
        
        {/* Toggle between rendered layout and raw components JSON */}
        {showRaw ? (
          <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(message, null, 2)}
          </pre>
        ) : (
          message.content && (
            <MarkDownRenderer
              textMarkdown={message.content}
              className="prose prose-invert prose-slate leading-relaxed text-sm text-slate-200"
            />
          )
        )}

        {/* 🛠️ Utility buttons bar (only show when message is completed) */}
        {!isStreaming && (
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-3">
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-all active:scale-95"
              title="Copy response"
            >
              {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>

            {/* Export PDF button */}
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-all active:scale-95 disabled:opacity-50"
              title="Submit and download PDF report"
            >
              <FileText size={13} className="text-indigo-400" />
              <span>{exporting ? "Submitting..." : "Export PDF"}</span>
            </button>

            {/* View Source/JSON toggle */}
            <button
              onClick={() => setShowRaw(!showRaw)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs transition-all active:scale-95 ${
                showRaw 
                  ? "bg-indigo-950 border-indigo-800 text-indigo-300"
                  : "bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300"
              }`}
              title="Show component JSON structure"
            >
              <Code size={13} />
              <span>{showRaw ? "Show Rendered" : "View JSON"}</span>
            </button>

            {/* Text-To-Speech speak toggle */}
            <button
              onClick={handleSpeak}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs transition-all active:scale-95 ${
                speaking 
                  ? "bg-green-950 border-green-800 text-green-300 animate-pulse"
                  : "bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300"
              }`}
              title="Read aloud"
            >
              <Volume2 size={13} />
              <span>{speaking ? "Stop" : "Speak"}</span>
            </button>

            {/* Divider */}
            <span className="w-px h-4 bg-slate-800 mx-1" />

            {/* Like Feedback */}
            <button
              onClick={() => setFeedback(feedback === "like" ? null : "like")}
              className={`p-1.5 rounded border transition-all active:scale-95 ${
                feedback === "like"
                  ? "bg-blue-950 border-blue-800 text-blue-400"
                  : "bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-400"
              }`}
            >
              <ThumbsUp size={13} />
            </button>

            {/* Dislike Feedback */}
            <button
              onClick={() => setFeedback(feedback === "dislike" ? null : "dislike")}
              className={`p-1.5 rounded border transition-all active:scale-95 ${
                feedback === "dislike"
                  ? "bg-red-950 border-red-800 text-red-400"
                  : "bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-400"
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
