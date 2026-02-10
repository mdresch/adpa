/**
 * MongoDB Atlas Trigger: Automatic Chunk Embedding Generation
 * 
 * CRITICAL: This MUST be configured as a DATABASE TRIGGER, not a Scheduled Trigger!
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to MongoDB Atlas → App Services (or Realm)
 * 2. Create or select an App Services application
 * 3. Go to Triggers → Add Trigger
 * 4. Configure EXACTLY as follows:
 *    - Trigger Type: DATABASE (NOT Scheduled!)
 *    - Name: chunk-embedding-trigger
 *    - Enabled: Yes
 *    - Skip Catchup Events: Yes
 *    - Event Ordering: Yes
 *    - Cluster Name: [Your Cluster Name]
 *    - Database Name: adpa_rag
 *    - Collection Name: chunks
 *    - Operation Type: Insert
 *    - Full Document: YES (CRITICAL!)
 *    - Document Preimage: No
 * 5. Function: Select "New Function" or use existing
 * 6. Paste this code
 * 7. Go to Values → Create New Value:
 *    - Name: VOYAGE_API_KEY
 *    - Type: Secret
 *    - Value: [Your VoyageAI API Key]
 * 8. Deploy
 */

exports = async function (changeEvent) {
    // Log the entire changeEvent for debugging
    console.log("Trigger fired with changeEvent:", JSON.stringify(changeEvent));

    // Validate changeEvent structure
    if (!changeEvent) {
        console.error("ERROR: changeEvent is null or undefined");
        return;
    }

    // Check if this is actually a database change event
    if (!changeEvent.operationType) {
        console.error("ERROR: Not a database change event. Check trigger type - must be DATABASE trigger, not Scheduled!");
        console.error("Received:", JSON.stringify(changeEvent));
        return;
    }

    // Verify it's an insert operation
    if (changeEvent.operationType !== "insert") {
        console.log(`Skipping ${changeEvent.operationType} operation`);
        return;
    }

    // Get document ID
    if (!changeEvent.documentKey || !changeEvent.documentKey._id) {
        console.error("ERROR: documentKey._id is missing");
        console.error("changeEvent:", JSON.stringify(changeEvent));
        return;
    }

    const docId = changeEvent.documentKey._id;

    // Get full document
    if (!changeEvent.fullDocument) {
        console.error(`ERROR: fullDocument is missing for chunk ${docId}`);
        console.error("Make sure 'Full Document' is enabled in trigger settings!");
        return;
    }

    const fullDocument = changeEvent.fullDocument;
    console.log(`Processing chunk ${docId}`);

    // Skip if embedding already exists
    if (fullDocument.embedding && fullDocument.embedding.length > 0) {
        console.log(`Chunk ${docId} already has embedding (${fullDocument.embedding.length} dimensions), skipping`);
        return;
    }

    // Skip if no content
    if (!fullDocument.content || fullDocument.content.trim().length === 0) {
        console.log(`Chunk ${docId} has no content, skipping`);
        return;
    }

    // Get database connection
    const serviceName = "mongodb-atlas";
    const dbName = "adpa_rag";
    const collectionName = "chunks";

    const db = context.services.get(serviceName).db(dbName);
    const chunksCollection = db.collection(collectionName);

    try {
        // Get VoyageAI API key from App Services Values
        const voyageApiKey = context.values.get("VOYAGE_API_KEY");

        if (!voyageApiKey) {
            throw new Error("VOYAGE_API_KEY not configured in App Services Values");
        }

        console.log(`Calling VoyageAI API for chunk ${docId} (${fullDocument.content.length} chars)`);

        // Call VoyageAI Embeddings API
        const response = await context.http.post({
            url: "https://api.voyageai.com/v1/embeddings",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${voyageApiKey}`
            },
            body: JSON.stringify({
                input: [fullDocument.content],
                model: "voyage-4-large", // 2048 dimensions (updated to match application service)
                inputType: "document"
            })
        });

        // Check HTTP status
        if (response.statusCode !== 200) {
            throw new Error(`VoyageAI API returned status ${response.statusCode}: ${response.body.text()}`);
        }

        // Parse response
        const result = EJSON.parse(response.body.text());

        if (!result.data || !result.data[0] || !result.data[0].embedding) {
            throw new Error(`Invalid response from VoyageAI API: ${JSON.stringify(result)}`);
        }

        const embedding = result.data[0].embedding;

        console.log(`Generated embedding for chunk ${docId} (${embedding.length} dimensions)`);

        // Update chunk with embedding
        const updateResult = await chunksCollection.updateOne(
            { _id: docId },
            {
                $set: {
                    embedding: embedding,
                    embedding_model: "voyage-4-large",
                    embedding_dimensions: embedding.length,
                    embedding_generated_at: new Date()
                }
            }
        );

        console.log(`Successfully updated chunk ${docId} with embedding (matched: ${updateResult.matchedCount}, modified: ${updateResult.modifiedCount})`);

    } catch (error) {
        console.error(`Failed to generate embedding for chunk ${docId}:`, error.message);
        console.error("Error stack:", error.stack);

        // Update chunk with error status
        try {
            await chunksCollection.updateOne(
                { _id: docId },
                {
                    $set: {
                        embedding_error: error.message,
                        embedding_error_at: new Date()
                    }
                }
            );
        } catch (updateError) {
            console.error(`Failed to update error status for chunk ${docId}:`, updateError.message);
        }
    }
};
