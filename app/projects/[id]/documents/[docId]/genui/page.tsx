"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FullScreen } from "@openuidev/react-ui";
import { openAIMessageFormat, openAIReadableStreamAdapter } from "@openuidev/react-headless";
import { openuiLibrary, openuiPromptOptions } from "@openuidev/react-ui/genui-lib";

import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { PageTransition } from "@/components/page-transition";
import { AnimatedLayout } from "@/components/animated-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, FileText, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { toast } from "@/lib/notify";
import { CustomAssistantMessage } from "@/components/Chat/AssistantMessage";

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
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const projectId = params.id as string;
  const documentId = params.docId as string;

  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch document details using ADPA's apiClient
  const fetchDoc = async () => {
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
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;

    void fetchDoc();
  }, [projectId, documentId, isAuthenticated, authLoading]);

  if (authLoading || (loading && !doc)) {
    return (
      <div className="h-screen bg-background flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="OpenUI Document Workspace" />
          <main className="flex-1 flex items-center justify-center bg-slate-950/20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground animate-pulse font-medium">
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
      <div className="h-screen bg-background flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Error Loading Workspace" />
          <main className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950/10">
            <AlertCircle className="h-14 w-14 text-destructive mb-4" />
            <h2 className="text-2xl font-bold tracking-tight mb-2 text-foreground">
              Failed to load document context
            </h2>
            <p className="text-sm text-muted-foreground max-w-md text-center mb-6 leading-relaxed">
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

  // Compile system instructions with the dynamic document context embedded
  const baseSystemPrompt = openuiLibrary.prompt(openuiPromptOptions);
  const systemPrompt = `
${baseSystemPrompt}

CRITICAL CONTEXT:
You are assisting the user inside their workspace for the document "${doc.title}".
You MUST ground your answers, charts, forms, and tables in the document's real data:
---
DOCUMENT CONTENT:
${doc.content}

METADATA:
${JSON.stringify(doc.metadata, null, 2)}
---

When generating layout, charts, or tables, use the exact metrics detailed above.
`;

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={`${doc.title} — Generative UI Workspace`} />
        
        <main className="flex-1 flex overflow-hidden">
          <PageTransition className="flex flex-1 overflow-hidden w-full h-full">
            <div className="flex w-full h-full divide-x divide-slate-800">
              
              {/* LEFT PANE: Dynamic Document Viewer */}
              <div className="w-1/2 flex flex-col h-full bg-slate-900/10 dark:bg-slate-950/40">
                <div className="p-6 border-b border-border/60 bg-background/50 backdrop-blur flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
                      Active Context
                    </span>
                    <h2 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
                      {doc.title}
                    </h2>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline" className="text-xs px-2.5 py-0.5">
                      v{doc.version}
                    </Badge>
                    <Badge variant="secondary" className="text-xs px-2.5 py-0.5 uppercase font-semibold">
                      {doc.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto space-y-6">
                  {/* Info block */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-background border border-border/80 shadow-sm">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Word Count</div>
                      <div className="text-lg font-bold text-foreground mt-1">{doc.word_count || "N/A"}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-background border border-border/80 shadow-sm">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Document ID</div>
                      <div className="text-sm font-mono truncate text-foreground mt-1.5" title={doc.id}>
                        {doc.id.substring(0, 8)}...
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-background border border-border/80 shadow-sm">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Created At</div>
                      <div className="text-xs font-medium text-foreground mt-2">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Content viewer block */}
                  <div className="flex flex-col flex-1 bg-background border border-border/80 rounded-3xl shadow-sm overflow-hidden min-h-[300px]">
                    <div className="px-5 py-3.5 border-b border-border/60 bg-muted/20 flex items-center gap-2">
                      <FileText size={16} className="text-primary" />
                      <span className="text-xs font-semibold text-foreground">Extracted Text Content</span>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto leading-relaxed text-sm text-foreground/80 font-sans whitespace-pre-wrap selection:bg-primary/20 select-text">
                      {doc.content || <span className="italic text-muted-foreground">This document has no content body loaded.</span>}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-border/60 bg-background/50 flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                  <span>Project ID: {projectId}</span>
                  <Link href={`/projects/${projectId}/documents/${documentId}/view`} className="text-primary hover:underline flex items-center gap-1 font-semibold">
                    Open Rich Editor &rarr;
                  </Link>
                </div>
              </div>

              {/* RIGHT PANE: OpenUI Interactive Generation Interface */}
              <div className="w-1/2 h-full flex flex-col relative bg-slate-950">
                <FullScreen
                  processMessage={async ({ messages, abortController }) => {
                    return fetch("/api/chat", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        systemPrompt,
                        messages: openAIMessageFormat.toApi(messages),
                      }),
                      signal: abortController.signal,
                    });
                  }}
                  streamProtocol={openAIReadableStreamAdapter()}
                  componentLibrary={openuiLibrary}
                  agentName={`${doc.title} Advisor`}
                  assistantMessage={CustomAssistantMessage}
                />
              </div>

            </div>
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
