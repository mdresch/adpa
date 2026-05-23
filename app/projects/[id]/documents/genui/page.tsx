"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "@openuidev/react-ui/defaults.css";
import "@openuidev/react-ui/components.css";
import "./genui-workspace.css";
import { FullScreen } from "@openuidev/react-ui";
import {
  openAIMessageFormat,
  openAIReadableStreamAdapter,
  type AssistantMessage as OpenUIAssistantMessage,
} from "@openuidev/react-headless";
import { projectOpenUILibrary } from "@/lib/openui/projectOpenUILibrary";
import { trimTextForGenuiPrompt } from "@/lib/llm/genuiPromptBudget";
import { buildOpenUIGenuiLibraryPrompt, enrichOpenUIApiMessages } from "@/lib/openui/systemPrompt";
import { wantsAiCoverSummary, wantsGenuiReportDarkTheme } from "@/lib/openui/layoutPlan";
import { buildCoverBlurbFromSources } from "@/lib/openui/coverSummary";
import { buildLayoutPlan } from "@/lib/openui/layoutPlan";

import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DocumentPageToolbar,
  type DocumentSummary,
} from "@/components/documents/DocumentPageToolbar";
import {
  Loader2,
  ArrowLeft,
  FileText,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  LayoutTemplate,
} from "lucide-react";
import { GenuiReportExportBarPortal } from "@/components/genui/GenuiReportExportBar";
import { getDocumentChatPrompts } from "@/lib/documents/document-chat-prompts";
import {
  GENUI_RENDER_FULL_DOCUMENT_DARK_PROMPT,
  GENUI_RENDER_FULL_DOCUMENT_PROMPT,
} from "@/lib/documents/genui-prompts";
import { GenuiPromptBridge } from "@/components/genui/GenuiPromptBridge";
import { GenuiReportSurfaceProvider } from "@/components/genui/GenuiReportSurfaceContext";
import { GenuiThreadToolbar } from "@/components/genui/GenuiThreadToolbar";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { toast } from "@/lib/notify";
import { CustomAssistantMessage } from "@/components/Chat/AssistantMessage";
import { useProjectDocumentRouteIds } from "@/lib/documents/use-project-document-route-ids";

interface DocumentData {
  id: string;
  title: string;
  name: string;
  content: string;
  status: string;
  version: number;
  created_at: string;
  word_count?: number;
  metadata?: Record<string, any>;
}

export default function DocumentGenUIWorkspace() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { projectId, documentId } = useProjectDocumentRouteIds();

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [chatSessionKey, setChatSessionKey] = useState(0);
  const [reportDarkTheme, setReportDarkTheme] = useState(false);
  const [pendingRenderPrompt, setPendingRenderPrompt] = useState<string | null>(null);
  const clearPendingRenderPrompt = useCallback(() => setPendingRenderPrompt(null), []);

  useEffect(() => {
    setChatSessionKey(0);
  }, [documentId]);

  useEffect(() => {
    if (!projectId || documentId) return;
    router.replace(`/projects/${projectId}/documents`);
  }, [projectId, documentId, router]);

  useEffect(() => {
    if (!projectId || !isAuthenticated || authLoading) return;
    const fetchDocs = async () => {
      setDocsLoading(true);
      try {
        const res = await apiClient.get<{ documents: DocumentSummary[] }>(
          `/documents/project/${projectId}?limit=100`
        );
        setDocuments(res.documents ?? []);
      } catch (err) {
        console.error("Failed to fetch project documents", err);
      } finally {
        setDocsLoading(false);
      }
    };
    void fetchDocs();
  }, [projectId, isAuthenticated, authLoading]);

  const fetchDoc = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<any>(`/documents/${documentId}`);
      const fetchedDoc = response.document || response.data || response;

      let contentString = "";
      const rawContent = fetchedDoc.content;
      if (typeof rawContent === "string") {
        contentString = rawContent;
      } else if (rawContent && typeof rawContent === "object") {
        contentString =
          rawContent.text ||
          rawContent.markdown ||
          rawContent.content ||
          JSON.stringify(rawContent, null, 2);
      }

      setDoc({
        id: fetchedDoc.id || documentId,
        title: fetchedDoc.title || fetchedDoc.name || "Document",
        name: fetchedDoc.name || fetchedDoc.title || "Document",
        content: contentString,
        status: fetchedDoc.status || "Draft",
        version: fetchedDoc.version || 1,
        created_at: fetchedDoc.created_at || new Date().toISOString(),
        word_count: fetchedDoc.word_count || contentString.split(/\s+/).length,
        metadata: fetchedDoc.metadata || {},
      });
    } catch (err: any) {
      console.error("[WorkspaceFetch] Error loading document context:", err);
      setError(err?.message || "Failed to load document content.");
      toast.error("Failed to load document context from API");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (authLoading || !documentId) return;
    if (!isAuthenticated) return;

    void fetchDoc();
  }, [documentId, isAuthenticated, authLoading, fetchDoc]);

  const handleDocChange = (docId: string) => {
    router.replace(`/projects/${projectId}/documents/genui?docId=${docId}`);
  };

  const handleCopy = async () => {
    if (!doc?.content) return;
    try {
      await navigator.clipboard.writeText(doc.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const selectedSummary = documents.find((d) => d.id === documentId);
  const starterPrompts = useMemo(() => {
    const prompts = getDocumentChatPrompts(
      doc?.title ?? "Document",
      selectedSummary?.template_name
    );
    return prompts.filter(
      (p) =>
        p !== GENUI_RENDER_FULL_DOCUMENT_PROMPT &&
        p !== GENUI_RENDER_FULL_DOCUMENT_DARK_PROMPT
    );
  }, [doc?.title, selectedSummary?.template_name]);

  const conversationStarters = useMemo(
    () => ({
      variant: "short" as const,
      options: starterPrompts.map((prompt) => ({
        displayText: prompt,
        prompt,
      })),
    }),
    [starterPrompts]
  );

  const genuiLayoutPrompt =
    "Render the full document to a interactive UI Component Report";
  const [lastUserLayoutPrompt, setLastUserLayoutPrompt] = useState(genuiLayoutPrompt);

  const renderGenuiAssistantMessage = useCallback(
    (props: { message: OpenUIAssistantMessage; isStreaming: boolean }) => (
      <CustomAssistantMessage
        {...props}
        layoutSourceText={doc?.content}
        layoutPrompt={lastUserLayoutPrompt || genuiLayoutPrompt}
        documentId={documentId ?? undefined}
        reportSurface
      />
    ),
    [doc?.content, documentId, lastUserLayoutPrompt]
  );

  if (authLoading || (loading && !doc)) {
    return (
      <div className="genui-workspace h-screen flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <Header title="OpenUI Document Workspace" />
          <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="genui-muted text-sm animate-pulse font-medium">
                Loading secure workspace environment...
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="genui-workspace h-screen flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <Header title="Error Loading Workspace" />
          <main className="flex-1 flex flex-col items-center justify-center p-6">
            <AlertCircle className="h-14 w-14 text-destructive mb-4" />
            <h2 className="text-2xl font-bold tracking-tight mb-2 text-slate-900">
              Failed to load document context
            </h2>
            <p className="genui-muted text-sm max-w-md text-center mb-6 leading-relaxed">
              {error || "We encountered an issue fetching the requested governance document from the registry."}
            </p>
            <div className="flex gap-3">
              <Button onClick={() => router.push(`/projects/${projectId}/documents`)}>
                <ArrowLeft size={16} className="mr-2" /> Back to Documents
              </Button>
              <Button variant="outline" onClick={fetchDoc}>
                <RefreshCw size={16} className="mr-2" /> Try Again
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const baseSystemPrompt = buildOpenUIGenuiLibraryPrompt({
    documentName: doc.title,
    documentType: doc.template_name ?? doc.document_type,
    projectName: doc.project_name,
  });
  const { text: documentExcerpt, truncated: documentTruncated } = trimTextForGenuiPrompt(
    doc.content ?? ""
  );
  const truncationNote = documentTruncated
    ? "\n[System prompt shows the first portion of the document only (API size limits). The latest user message includes a REQUIRED LAYOUT PLAN with section excerpts — use those for full section text.]\n"
    : "";
  const systemPrompt = `
${baseSystemPrompt}

CRITICAL CONTEXT:
You are assisting the user inside their workspace for the document "${doc.title}".
Ground answers in the document below and in section sourceText from the REQUIRED LAYOUT PLAN on each user turn.
---
DOCUMENT CONTENT (excerpt):
${documentExcerpt}
${truncationNote}
METADATA:
${JSON.stringify(doc.metadata, null, 2)}
---

When generating layout, charts, or tables, use metrics from the excerpt and layout-plan sourceText.
`;

  return (
    <div className="genui-workspace h-screen flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <Header />
        <DocumentPageToolbar
          projectId={projectId}
          mode="genui"
          documents={documents}
          docsLoading={docsLoading}
          selectedDocId={documentId}
          onDocChange={handleDocChange}
          docSelectorDisabled={loading}
        >
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleCopy}
            disabled={!doc?.content || loading}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </DocumentPageToolbar>

        <main className="flex-1 flex overflow-hidden">
          <PageTransition className="flex flex-1 overflow-hidden w-full h-full">
            <div className="flex w-full h-full divide-x divide-slate-200">
              <div className="genui-source-pane flex flex-col h-full">
                <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-indigo-600">
                      Step 1 — Source document
                    </span>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5 truncate">
                      {doc.title}
                    </h2>
                    <p className="genui-muted text-xs mt-1.5 leading-relaxed max-w-md">
                      Read and verify the extracted text here. The AI on the right uses only this content when answering.
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline" className="text-xs px-2.5 py-0.5 border-slate-200 text-slate-700">
                      v{doc.version}
                    </Badge>
                    <Badge variant="secondary" className="text-xs px-2.5 py-0.5 uppercase font-semibold bg-slate-100 text-slate-700">
                      {doc.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="genui-muted text-[10px] uppercase tracking-wider">Word Count</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">{doc.word_count || "N/A"}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="genui-muted text-[10px] uppercase tracking-wider">Document ID</div>
                      <div className="text-sm font-mono truncate text-slate-900 mt-1.5" title={doc.id}>
                        {doc.id.substring(0, 8)}...
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="genui-muted text-[10px] uppercase tracking-wider">Created At</div>
                      <div className="text-xs font-medium text-slate-900 mt-2">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden min-h-[300px]">
                    <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                      <FileText size={16} className="text-indigo-600" />
                      <span className="text-xs font-semibold text-slate-900">Extracted Text Content</span>
                    </div>
                    <div className="genui-body-text p-6 flex-1 overflow-y-auto leading-relaxed text-sm font-sans whitespace-pre-wrap selection:bg-indigo-100 select-text">
                      {doc.content || <span className="genui-muted italic">This document has no content body loaded.</span>}
                    </div>
                  </div>
                </div>

                <div className="genui-muted p-4 border-t border-slate-200 bg-white text-[10px] font-mono">
                  <span>Project ID: {projectId}</span>
                </div>
              </div>

              <div className="genui-advisor-pane flex min-w-0 h-full flex-col min-h-0 relative bg-white border-l border-slate-200">
                <div className="shrink-0 px-5 py-3 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                        <LayoutTemplate className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-700">
                          Step 2 — Component report
                        </span>
                        <p className="text-sm text-slate-900 mt-0.5 font-medium">
                          OpenUI interactive report
                        </p>
                        <p className="genui-muted text-xs mt-1 leading-relaxed">
                          Use a suggested prompt or type below to build cards, tables, timelines, and summaries from the source document. Export PDF, Word, or HTML when the report is ready.
                        </p>
                        {process.env.NEXT_PUBLIC_GENUI_LLM_PROVIDER ? (
                          <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
                            LLM: {process.env.NEXT_PUBLIC_GENUI_LLM_PROVIDER}
                            {" "}
                            (check Network → /api/chat for X-GenUI-Model)
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className={`genui-openui-root flex-1 min-h-0 w-full${reportDarkTheme ? " genui-report-dark" : ""}`}
                >
                  <GenuiReportSurfaceProvider>
                  <FullScreen
                    key={`${documentId}-${chatSessionKey}`}
                    processMessage={async ({ messages, abortController }) => {
                      const rawApiMessages = openAIMessageFormat.toApi(messages);
                      const lastUser = [...rawApiMessages].reverse().find((m) => m.role === "user");
                      const lastPrompt =
                        typeof lastUser?.content === "string"
                          ? lastUser.content
                          : String(lastUser?.content ?? "");
                      setLastUserLayoutPrompt(lastPrompt.trim() || genuiLayoutPrompt);
                      setReportDarkTheme(wantsGenuiReportDarkTheme(lastPrompt));

                      let coverSummary: string | undefined
                      if (wantsAiCoverSummary(lastPrompt)) {
                        const heuristicPlan = buildLayoutPlan({
                          prompt: lastPrompt,
                          sourceText: doc.content,
                          documentId: documentId ?? undefined,
                        })
                        const coverNode = heuristicPlan.nodes.find((n) => n.id === "doc-cover")
                        const fallbackBlurb =
                          coverNode?.children?.find((c) => c.id === "cover-summary")?.sourceText ??
                          buildCoverBlurbFromSources({ fullSummary: doc.content.slice(0, 1200) })
                        try {
                          const coverRes = await fetch("/api/genui/cover-summary", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              documentTitle: doc.title,
                              content: doc.content,
                              fallbackBlurb,
                            }),
                            signal: abortController.signal,
                          })
                          if (coverRes.ok) {
                            const data = (await coverRes.json()) as { summary?: string }
                            if (data.summary?.trim()) {
                              coverSummary = data.summary.trim()
                            }
                          }
                        } catch {
                          /* use heuristic blurb from layout plan */
                        }
                      }

                      const apiMessages = enrichOpenUIApiMessages(rawApiMessages, {
                        layoutSourceText: doc.content,
                        includeSourceInUserMessage: false,
                        documentName: doc.title,
                        projectName: doc.project_name ?? undefined,
                        documentId: documentId ?? undefined,
                        coverSummary,
                      });
                      return fetch("/api/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          systemPrompt,
                          messages: apiMessages,
                        }),
                        signal: abortController.signal,
                      });
                    }}
                    streamProtocol={openAIReadableStreamAdapter()}
                    componentLibrary={projectOpenUILibrary}
                    agentName={`${doc.title} advisor`}
                    welcomeMessage={{
                      title: `Build a report from “${doc.title}”`,
                      description:
                        "Choose a starter or describe the view you need. The report is generated from the source text on the left — not from the open web.",
                      image: (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                          <Sparkles className="h-7 w-7" />
                        </div>
                      ),
                    }}
                    conversationStarters={conversationStarters}
                    assistantMessage={renderGenuiAssistantMessage}
                    threadHeader={
                      <>
                        <GenuiThreadToolbar
                          renderDisabled={!doc.content?.trim() || loading}
                          onRenderDocument={() =>
                            setPendingRenderPrompt(GENUI_RENDER_FULL_DOCUMENT_PROMPT)
                          }
                          onNewReport={() => setChatSessionKey((k) => k + 1)}
                        />
                        <GenuiPromptBridge
                          prompt={pendingRenderPrompt}
                          onSent={clearPendingRenderPrompt}
                        />
                        <GenuiReportExportBarPortal
                          documentTitle={doc.title}
                          sourceMarkdown={doc.content}
                          presentationContext={
                            projectId && documentId
                              ? {
                                  projectId,
                                  documentId,
                                  documentVersion: doc.version,
                                  documentTitle: doc.title,
                                  sourceMarkdown: doc.content,
                                  lastUserLayoutPrompt,
                                }
                              : undefined
                          }
                        />
                      </>
                    }
                  />
                  </GenuiReportSurfaceProvider>
                </div>
                <div
                  className="genui-report-export-anchor shrink-0"
                  data-genui-step="2-export"
                  data-genui-project-id={projectId ?? undefined}
                  data-genui-document-id={documentId ?? undefined}
                  data-genui-document-version={doc?.version}
                  aria-hidden={false}
                />
              </div>
            </div>
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
