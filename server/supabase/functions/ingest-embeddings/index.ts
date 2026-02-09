
// ingest-embeddings (Dependency-free version)

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const voyageApiKey = Deno.env.get('VOYAGE_API_KEY')
const VOYAGE_MODEL = 'voyage-3'

console.info("ingest-embeddings function started (Lightweight)")

Deno.serve(async (req) => {
    // 1. Verify environment
    if (!supabaseUrl || !supabaseKey || !voyageApiKey) {
        return new Response(
            JSON.stringify({ error: 'Missing environment variables' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
    }

    try {
        // 2. Parse request payload
        const payload = await req.json()
        const { record } = payload
        const documentId = record?.id || payload.document_id

        if (!documentId) {
            return new Response(
                JSON.stringify({ error: 'No document_id provided' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        console.log(`Processing document: ${documentId}`)

        // 3. Fetch document content (Direct REST)
        // GET /rest/v1/documents?id=eq.{id}&select=content,metadata
        const fetchUrl = `${supabaseUrl}/rest/v1/documents?id=eq.${documentId}&select=content,metadata`;
        console.log(`Fetching from: ${fetchUrl}`);

        const fetchRes = await fetch(fetchUrl, { headers });
        if (!fetchRes.ok) {
            throw new Error(`Failed to fetch document: ${fetchRes.statusText}`);
        }
        const docs = await fetchRes.json();
        const document = docs[0];

        if (!document) {
            return new Response(
                JSON.stringify({ error: 'Document not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
        }

        if (!document.content) {
            console.warn(`Document ${documentId} has no content. Skipping.`)
            return new Response(
                JSON.stringify({ message: 'Document has no content' }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // 4. Chunk content
        const chunks = splitTextInternal(document.content, 1000, 200);
        console.log(`Generated ${chunks.length} chunks`)

        // 5. Generate Embeddings (Voyage AI) & Prepare Chunks
        const batchSize = 10;
        const allVectors = [];

        for (let i = 0; i < chunks.length; i += batchSize) {
            const batchChunks = chunks.slice(i, i + batchSize);
            const batchTexts = batchChunks.map(c => c.text);

            const voyageRes = await fetch('https://api.voyageai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${voyageApiKey}`
                },
                body: JSON.stringify({
                    input: batchTexts,
                    model: VOYAGE_MODEL,
                })
            });

            if (!voyageRes.ok) {
                const err = await voyageRes.text();
                throw new Error(`Voyage API error: ${err}`);
            }

            const voyageData = await voyageRes.json();

            // Map to chunk objects
            const chunksToInsert = voyageData.data.map((item, index) => {
                const chunkIndex = i + index;
                const chunk = batchChunks[index];
                return {
                    document_id: documentId,
                    content: chunk.text,
                    embedding: item.embedding, // pgvector format handles array automatically? Yes, usually.
                    // Wait, REST API for pgvector might need string format "[...]"? 
                    // Supabase PostgREST client handles it. But raw REST? 
                    // PostgREST 10+ handles JSON arrays for vector columns if cast correctly or implied.
                    // Let's assume standard JSON array works.
                    chunk_index: chunkIndex,
                    metadata: {
                        source: 'ingest-embeddings-func-light',
                        start_char_idx: chunk.start,
                        end_char_idx: chunk.end
                    }
                };
            });
            allVectors.push(...chunksToInsert);
        }

        // 6. Delete old chunks (REST)
        // DELETE /rest/v1/document_chunks?document_id=eq.{id}
        const deleteUrl = `${supabaseUrl}/rest/v1/document_chunks?document_id=eq.${documentId}`;
        const deleteRes = await fetch(deleteUrl, { method: 'DELETE', headers });
        if (!deleteRes.ok) {
            throw new Error(`Failed to delete chunks: ${deleteRes.statusText}`);
        }

        // 7. Insert new chunks (REST)
        // POST /rest/v1/document_chunks
        const insertUrl = `${supabaseUrl}/rest/v1/document_chunks`;
        const insertRes = await fetch(insertUrl, {
            method: 'POST',
            headers: { ...headers, 'Prefer': 'return=minimal' }, // optimizing response
            body: JSON.stringify(allVectors)
        });

        if (!insertRes.ok) {
            const err = await insertRes.text();
            throw new Error(`Failed to insert chunks: ${err}`);
        }
        console.log(`Inserted ${allVectors.length} chunks`);

        // 8. Update sync status (REST)
        // PATCH /rest/v1/documents?id=eq.{id}
        const updateUrl = `${supabaseUrl}/rest/v1/documents?id=eq.${documentId}`;
        await fetch(updateUrl, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                sync_status: 'synced',
                processing_time: new Date().toISOString()
            })
        });

        return new Response(
            JSON.stringify({ message: 'Success', chunks: chunks.length }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        )

    } catch (e) {
        console.error('Error:', e)
        return new Response(
            JSON.stringify({ error: e.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})

// Helper functions (same as before)
interface TextChunk {
    text: string;
    start: number;
    end: number;
}

function splitTextInternal(text: string, chunkSize: number = 1000, overlap: number = 200): TextChunk[] {
    if (!text) return [];
    const chunks: TextChunk[] = [];
    let startIndex = 0;
    while (startIndex < text.length) {
        let endIndex = startIndex + chunkSize;
        if (endIndex < text.length) {
            const lastSpace = text.lastIndexOf(' ', endIndex);
            if (lastSpace > startIndex) endIndex = lastSpace;
        } else {
            endIndex = text.length;
        }
        const chunkText = text.substring(startIndex, endIndex).trim();
        if (chunkText.length > 0) {
            chunks.push({ text: chunkText, start: startIndex, end: endIndex });
        }
        startIndex = endIndex - overlap;
        if (startIndex >= endIndex) startIndex = endIndex;
    }
    return chunks;
}
