// Proxy Edge Function for RAG document ingestion
// Forwards requests to the Node.js RAG service which has analytics tracking
// This ensures all ingestion goes through a single, consistent path

import { createClient } from "npm:@supabase/supabase-js@2.46.2";

interface IngestDoc {
    id?: string;
    title?: string;
    content: string;
    metadata?: Record<string, any>;
}

interface IngestRequest {
    docs: IngestDoc[];
}

console.info("ingest-for-rag proxy function started");

Deno.serve(async (req: Request) => {
    const startTime = Date.now();

    try {
        console.log("=== New ingestion request ===");

        if (req.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: { "Content-Type": "application/json" }
            });
        }

        const { docs } = (await req.json()) as IngestRequest;

        console.log(`Received ${docs?.length || 0} documents for ingestion`);

        if (!Array.isArray(docs) || docs.length === 0) {
            return new Response(JSON.stringify({ error: "docs array is required and must not be empty" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Get Supabase client for auth and document lookup
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get Node.js backend URL
        const backendUrl = Deno.env.get("BACKEND_URL") || "http://localhost:5000";

        console.log(`Forwarding ${docs.length} documents to Node.js RAG service at ${backendUrl}`);

        const results = [];
        const errors = [];

        // Process each document by calling the Node.js service
        for (const doc of docs) {
            try {
                // If doc has an ID, use it. Otherwise it should be created in the documents table first
                const documentId = doc.id;

                if (!documentId) {
                    console.warn("Document missing ID, skipping:", doc.title);
                    errors.push({
                        document: doc.title || "unknown",
                        error: "Document ID is required"
                    });
                    continue;
                }

                // Call the Node.js RAG service ingest endpoint
                console.log(`Ingesting document ${documentId} via Node.js service...`);

                const response = await fetch(`${backendUrl}/api/rag/ingest/${documentId}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        // Pass through authorization if available
                        ...(req.headers.get("Authorization") && {
                            "Authorization": req.headers.get("Authorization")!
                        })
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Failed to ingest ${documentId}:`, errorText);
                    errors.push({
                        document_id: documentId,
                        title: doc.title,
                        error: errorText
                    });
                    continue;
                }

                const result = await response.json();
                console.log(`✅ Successfully ingested ${documentId}: ${result.chunks} chunks`);

                results.push({
                    document_id: documentId,
                    title: doc.title,
                    chunks: result.chunks,
                    success: true
                });

            } catch (error: any) {
                console.error(`Error processing document:`, error);
                errors.push({
                    document: doc.title || doc.id || "unknown",
                    error: error.message
                });
            }
        }

        const elapsed = Date.now() - startTime;
        console.log(`\n=== Ingestion Summary ===`);
        console.log(`Total documents: ${docs.length}`);
        console.log(`Successful: ${results.length}`);
        console.log(`Failed: ${errors.length}`);
        console.log(`Total time: ${elapsed}ms`);

        return new Response(
            JSON.stringify({
                success: true,
                processed: results.length,
                failed: errors.length,
                total: docs.length,
                results,
                errors: errors.length > 0 ? errors : undefined,
                elapsed_ms: elapsed
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" }
            }
        );

    } catch (error: any) {
        console.error("Ingestion error:", error);
        return new Response(
            JSON.stringify({
                error: error.message || "Internal server error",
                details: error.stack
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
});
