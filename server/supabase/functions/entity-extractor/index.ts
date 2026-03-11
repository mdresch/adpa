// Entity Extractor Edge Function - Using Google Gemini API
// Extracts project management entities from documents automatically
// Triggered by database insert on documents table

import { createClient } from "npm:@supabase/supabase-js@2.46.2";

interface EntityExtractionRequest {
    document_id: string;
}

interface ExtractedEntity {
    entity: string;
    type: string;
    score: number;
}

console.info("entity-extractor function started (Gemini AI)");

Deno.serve(async (req: Request) => {
    const startTime = Date.now();

    try {
        console.log("=== Entity extraction request ===");

        if (req.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: { "Content-Type": "application/json" }
            });
        }

        const { document_id } = (await req.json()) as EntityExtractionRequest;

        if (!document_id) {
            return new Response(JSON.stringify({ error: "document_id is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`Processing document: ${document_id}`);

        // Get environment variables
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        // Check for both hyphenated and underscored versions to be safe
        const geminiApiKey = Deno.env.get("GEMINI_API-KEY") || Deno.env.get("GEMINI_API_KEY");

        if (!geminiApiKey) {
            console.error("GEMINI_API-KEY is missing from environment variables");
            throw new Error("GEMINI_API-KEY not set. Please configure in Edge Function settings.");
        } else {
            console.log(`GEMINI_API-KEY found (length: ${geminiApiKey.length})`);
        }

        if (!geminiApiKey) {
            throw new Error("GEMINI_API_KEY not set. Please configure in Edge Function settings.");
        }

        // Initialize Supabase client
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch document content
        const { data: document, error: fetchError } = await supabase
            .from("documents")
            .select("content, title, metadata")
            .eq("id", document_id)
            .single();

        if (fetchError || !document) {
            console.error("Failed to fetch document:", fetchError);
            return new Response(
                JSON.stringify({ error: "Document not found", details: fetchError }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        console.log(`Extracting entities from: ${document.title || 'Untitled'}`);

        // Prepare content for entity extraction
        const contentToAnalyze = `Title: ${document.title || 'N/A'}\n\nContent: ${document.content}`;

        // Call Gemini API for entity extraction
        const entities = await extractEntitiesWithGemini(contentToAnalyze, geminiApiKey);

        console.log(`Extracted ${entities.length} entities`);

        // Store entities in database
        if (entities.length > 0) {
            const entitiesToInsert = entities.map(entity => ({
                document_id,
                entity: entity.entity,
                type: entity.type,
                score: entity.score
            }));

            const { error: insertError } = await supabase
                .from("document_entities")
                .insert(entitiesToInsert);

            if (insertError) {
                console.error("Failed to insert entities:", insertError);
                throw new Error(`Database insert failed: ${insertError.message}`);
            }
        }

        const elapsed = Date.now() - startTime;
        console.log(`Entity extraction completed in ${elapsed}ms`);

        return new Response(
            JSON.stringify({
                success: true,
                document_id,
                entities_extracted: entities.length,
                entities: entities.slice(0, 20), // Return first 20 for response
                elapsed_ms: elapsed
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" }
            }
        );

    } catch (error: any) {
        console.error("Entity extraction error:", error);
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

/**
 * Extract entities using Google Gemini API
 */
async function extractEntitiesWithGemini(
    content: string,
    apiKey: string
): Promise<ExtractedEntity[]> {
    const prompt = `You are an expert at extracting project management entities from documents.

Extract ALL relevant entities from the following document and categorize them.

Entity Types to Extract:
- PROJECT_NAME: Project titles and names
- MILESTONE: Key project milestones and phases
- DELIVERABLE: Specific deliverables, outputs, or products
- RISK: Identified risks or potential issues
- STAKEHOLDER: People, teams, and organizations involved
- RESOURCE: Team members, budget items, equipment, tools
- TASK: Specific tasks and activities
- PHASE: Project phases (planning, execution, closing, etc.)
- TIMELINE: Dates, deadlines, and time periods
- BUDGET_ITEM: Financial items and monetary amounts
- DEPENDENCY: Task or project dependencies
- METRIC: KPIs, success criteria, measurements

Document:
${content.substring(0, 8000)}

Return a JSON array of entities in this exact format:
[
  {"entity": "entity text", "type": "ENTITY_TYPE", "score": 0.95},
  ...
]

Important:
- Extract concrete, specific entities only
- Confidence score should be between 0.0 and 1.0
- Don't extract generic terms
- Focus on entities that provide business value`;

    let retries = 0;
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds

    while (true) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/gemini-flash-latest:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: prompt }]
                        }],
                        generationConfig: {
                            temperature: 0.1,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 8192,
                            responseMimeType: "application/json",
                        }
                    }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();

                // Handle rate limiting (429) specifically
                if (response.status === 429 && retries < maxRetries) {
                    console.warn(`Gemini API rate limit hit (429). Retrying in ${baseDelay * Math.pow(2, retries)}ms...`);
                    await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, retries)));
                    retries++;
                    continue;
                }

                console.error(`Gemini API error (${response.status}):`, errorText);
                throw new Error(`Gemini API request failed: ${response.status}`);
            }

            const data = await response.json();
            console.log("Full Gemini Response:", JSON.stringify(data));

            const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

            console.log("Gemini response received:", generatedText.substring(0, 200));

            // Parse JSON from response
            const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                console.warn("No JSON array found in Gemini response");
                return [];
            }

            const entities = JSON.parse(jsonMatch[0]) as ExtractedEntity[];

            // Validate and clean entities
            return entities
                .filter(e => e.entity && e.type && typeof e.score === 'number')
                .map(e => ({
                    entity: e.entity.trim(),
                    type: e.type.toUpperCase(),
                    score: Math.min(1.0, Math.max(0.0, e.score))
                }))
                .filter(e => e.entity.length > 1); // Filter out single character entities

        } catch (error: any) {
            if (retries < maxRetries && error.message.includes("429")) {
                // Already handled by continue, but safety check for other errors that might mimic
                console.warn(`Retrying after error: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, retries)));
                retries++;
                continue;
            }

            console.error("Gemini API call failed:", error);
            // Return empty array instead of failing completely
            return [];
        }
    }
}
