import { createClient } from 'npm:@supabase/supabase-js@2.48.1'
// import { VoyageAIClient } from 'npm:voyageai' // Removed to use fetch


// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const voyageApiKey = Deno.env.get('VOYAGE_API_KEY')

const VOYAGE_MODEL = 'voyage-3'

console.info("query-rag-vectors function started")

Deno.serve(async (req) => {
    // 1. Verify environment
    if (!supabaseUrl || !supabaseServiceRoleKey || !voyageApiKey) {
        return new Response(
            JSON.stringify({ error: 'Missing environment variables' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }

    // 2. Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    // Voyage AI client replaced by direct fetch

    try {
        // 3. Parse request payload
        const { query, topK = 5, filter } = await req.json()

        if (!query) {
            return new Response(
                JSON.stringify({ error: 'No query provided' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        console.log(`Processing query: "${query}" (topK: ${topK})`)

        // 4. Generate Query Embedding (Voyage AI - Direct Fetch)
        const voyageResponse = await fetch('https://api.voyageai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${voyageApiKey}`
            },
            body: JSON.stringify({
                input: query,
                model: VOYAGE_MODEL,
            })
        });

        if (!voyageResponse.ok) {
            const errorText = await voyageResponse.text();
            throw new Error(`Voyage AI API Error (${voyageResponse.status}): ${errorText}`);
        }

        const embeddingData = await voyageResponse.json();
        const queryVector = embeddingData.data?.[0]?.embedding;

        if (!queryVector) {
            throw new Error('Failed to generate embedding for query');
        }

        // 5. Search using Native Pgvector RPC
        console.log(`Searching document_chunks using match_document_chunks RPC...`)

        const { data: searchResults, error: searchError } = await supabase.rpc('match_document_chunks', {
            query_embedding: queryVector,
            match_threshold: 0.5, // Adjust threshold as needed
            match_count: topK,
            filter: filter || {}
        });

        if (searchError) {
            console.error('RPC Error:', searchError);
            throw new Error(`Vector Search RPC Error: ${searchError.message}`);
        }

        // 6. Format Response
        return new Response(
            JSON.stringify({
                results: searchResults
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Unexpected error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})
