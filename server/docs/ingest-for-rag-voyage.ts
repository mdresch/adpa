// deno-lint-ignore-file no-explicit-any
// Ingests documents for RAG: stores raw doc in Postgres and embeddings in a Vector Bucket index
// Uses Voyage AI for embeddings (optimized for RAG)
// Assumptions:
// - A Postgres table public.documents_raw(id uuid primary key default gen_random_uuid(), title text, content text, metadata jsonb, created_at timestamptz default now()) exists
// - A Vector Bucket named 'embeddings' with an index named 'documents-voyage' (1024 dim, cosine) exists
// - You pass { title, content, metadata?, id? } or an array of such objects
// - Uses Voyage AI via fetch (set VOYAGE_API_KEY secret)

import { createClient } from "npm:@supabase/supabase-js@2.46.2";

interface IngestDoc {
    id?: string;
    title?: string;
    content: string;
    metadata?: Record<string, any>;
}

interface IngestRequest {
    docs: IngestDoc[];
    indexName?: string; // defaults to 'documents-voyage'
    bucket?: string; // defaults to 'embeddings'
    model?: string; // defaults to 'voyage-2'
    upsert?: boolean; // if true, reuses keys to overwrite vectors
}

// Simple text chunking for long inputs
function chunkText(text: string, maxTokensApprox = 1200, overlapApprox = 200): string[] {
    // Approximate tokens with words (very rough). Adjust as needed.
    const words = text.split(/\s+/);
    const chunkSize = maxTokensApprox;
    const overlap = overlapApprox;
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
        const slice = words.slice(i, i + chunkSize).join(" ");
        if (slice.trim().length > 0) chunks.push(slice);
    }
    return chunks.length ? chunks : [text];
}

async function embedTexts(texts: string[], model = "voyage-2"): Promise<number[][]> {
    const apiKey = Deno.env.get("VOYAGE_API_KEY");
    if (!apiKey) throw new Error("Missing VOYAGE_API_KEY");

    const resp = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model,
            input: texts,
            input_type: "document" // Optimized for document storage
        }),
    });

    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Voyage AI embeddings error: ${resp.status} ${err}`);
    }

    const data = await resp.json();
    return data.data.map((d: any) => d.embedding as number[]);
}

console.info("ingest-for-rag function started (Voyage AI)");

Deno.serve(async (req: Request) => {
    try {
        if (req.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: { "Content-Type": "application/json" }
            });
        }

        const {
            docs,
            indexName = "documents-voyage",
            bucket = "embeddings",
            model = "voyage-2",
            upsert = true
        } = (await req.json()) as IngestRequest;

        if (!Array.isArray(docs) || docs.length === 0) {
            return new Response(JSON.stringify({ error: "docs array is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // 1) Store raw documents (one row per doc)
        const toInsert = docs.map((d) => ({
            id: d.id, // let Postgres default if undefined
            title: d.title ?? null,
            content: d.content,
            metadata: d.metadata ?? {},
        }));

        const { data: inserted, error: insertErr } = await supabase
            .from("documents_raw")
            .insert(toInsert)
            .select("id, title");

        if (insertErr) {
            // If upsert desired for raw docs, fallback to upsert
            if (upsert) {
                const { data: upserted, error: upErr } = await supabase
                    .from("documents_raw")
                    .upsert(toInsert, { onConflict: "id" })
                    .select("id, title");
                if (upErr) throw upErr;
            } else {
                throw insertErr;
            }
        }

        // Determine IDs for vector keys
        const rowsForVectors = inserted ?? toInsert;

        // 2) Chunk, embed, and prepare vectors
        const vectorPayload: {
            key: string;
            data: { float32: number[] };
            metadata?: Record<string, any>
        }[] = [];

        for (let i = 0; i < docs.length; i++) {
            const doc = docs[i];
            const rowId = (rowsForVectors[i] as any)?.id ?? doc.id;
            const keyBase = rowId ?? crypto.randomUUID();

            const chunks = chunkText(doc.content);
            const embeddings = await embedTexts(chunks, model);

            for (let c = 0; c < chunks.length; c++) {
                vectorPayload.push({
                    key: `${keyBase}::${c}`,
                    data: { float32: embeddings[c] },
                    metadata: {
                        title: doc.title ?? null,
                        chunk: c,
                        total_chunks: chunks.length,
                        source_id: keyBase,
                        ...doc.metadata,
                    },
                });
            }
        }

        // 3) Write to Vector Bucket index in batches of 500
        const bucketRef = (supabase as any).storage.vectors.from(bucket);
        const idx = bucketRef.index(indexName);

        const BATCH_SIZE = 500;
        for (let i = 0; i < vectorPayload.length; i += BATCH_SIZE) {
            const batch = vectorPayload.slice(i, i + BATCH_SIZE);
            const { error: vecErr } = await idx.putVectors({ vectors: batch });
            if (vecErr) throw vecErr;
        }

        return new Response(
            JSON.stringify({
                ok: true,
                stored_docs: docs.length,
                stored_vectors: vectorPayload.length,
                index: indexName,
                bucket,
                model
            }),
            { headers: { "Content-Type": "application/json", "Connection": "keep-alive" } },
        );
    } catch (e) {
        console.error(e);
        return new Response(
            JSON.stringify({ error: String(e) }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
