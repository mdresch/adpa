# MongoDB Atlas Triggers Setup Guide

This directory contains Atlas Trigger configurations for automatic embedding generation.

## Overview

Atlas Triggers automatically generate embeddings for chunks when they are inserted into MongoDB, eliminating the need for manual batch processing.

## Setup Instructions

### 1. Create the Trigger in Atlas

1. **Navigate to Atlas Console**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com)
   - Select your cluster: `adpacluster`
   - Click **Triggers** in the left sidebar

2. **Create New Trigger**
   - Click **Add Trigger**
   - Configure the following settings:

   | Setting | Value |
   |---------|-------|
   | **Trigger Type** | Database |
   | **Name** | `chunk-embedding-trigger` |
   | **Enabled** | ✅ Yes |
   | **Event Ordering** | ✅ Yes (important for consistency) |
   | **Skip Catchup Events** | ✅ Yes (don't process old documents) |
   | **Cluster Name** | `adpacluster` |
   | **Database Name** | `adpa_rag` |
   | **Collection Name** | `chunks` |
   | **Operation Type** | `Insert` |
   | **Full Document** | ✅ Yes |
   | **Document Preimage** | ❌ No |

3. **Add Function Code**
   - In the **Function** section, select **+ New Function**
   - Name: `generateChunkEmbedding`
   - Copy the code from `chunk-embedding-trigger.js`
   - Paste into the function editor
   - Click **Save**

### 2. Configure App Services Values

The trigger needs access to your VoyageAI API key:

1. **Navigate to App Services**
   - In Atlas, click **App Services** (or **Realm**)
   - If you don't have an App Services app, create one:
     - Click **Create a New App**
     - Name: `adpa-embeddings`
     - Link to your cluster

2. **Add Secret Value**
   - Go to **Values** in the left sidebar
   - Click **Create New Value**
   - Configure:
     - **Value Name**: `VOYAGE_API_KEY`
     - **Value Type**: Secret
     - **Value**: Your VoyageAI API key (from `.env`)
   - Click **Save**

### 3. Deploy the Trigger

1. Click **Review Draft & Deploy** (top right)
2. Review changes
3. Click **Deploy**

## Testing the Trigger

### Test with a New Chunk

You can test the trigger by inserting a new chunk:

```javascript
// In MongoDB Atlas Data Explorer or mongosh
use adpa_rag

db.chunks.insertOne({
  document_id: "test-doc-123",
  content: "This is a test chunk to verify the embedding trigger works correctly.",
  chunk_index: 0,
  metadata: {
    source: "test"
  }
})
```

### Verify Embedding Generation

Check if the embedding was added:

```javascript
db.chunks.findOne(
  { document_id: "test-doc-123" },
  { embedding: 1, embedding_model: 1, embedding_generated_at: 1 }
)
```

Expected result:
```javascript
{
  _id: ObjectId("..."),
  embedding: [0.123, -0.456, ...], // Array of 1024 floats
  embedding_model: "voyage-2",
  embedding_generated_at: ISODate("2026-02-07T01:21:00.000Z")
}
```

### Monitor Trigger Logs

1. Go to **Triggers** → `chunk-embedding-trigger`
2. Click **Logs** tab
3. Check for:
   - ✅ Success messages: `Successfully generated embedding for chunk...`
   - ⚠️ Error messages: Check for API key issues or rate limits

## Backfilling Existing Chunks

The trigger only processes **new** chunks. To embed your existing 44,566 chunks, you have two options:

### Option A: Re-insert Chunks (Recommended)
Create a script to copy chunks to a temporary collection and re-insert them:

```bash
cd server/scripts
npm run backfill-embeddings
```

### Option B: Manual Batch Processing
Use the `generate-embeddings.ts` script to process existing chunks in batches.

## Troubleshooting

### Error: "Cannot access member '_id' of undefined"

**Cause**: The trigger's **Full Document** setting is not enabled, or the trigger type is incorrect.

**Solution**:
1. Go to your trigger in Atlas Console
2. Edit the trigger configuration
3. Ensure these settings:
   - ✅ **Operation Type**: `Insert` (not Update or Replace)
   - ✅ **Full Document**: **Enabled** (this is critical!)
   - ✅ **Document Preimage**: Disabled
4. Save and redeploy the trigger
5. Test with a new chunk insertion

### Error: "changeEvent.fullDocument is undefined"

**Cause**: Full Document is not enabled in trigger settings.

**Solution**: Enable **Full Document** in the trigger configuration (see above).

### Trigger Not Firing
- ✅ Verify trigger is **Enabled**
- ✅ Check **Event Ordering** is enabled
- ✅ Ensure cluster name and database name are correct

### Embeddings Not Generated
- ✅ Check `VOYAGE_API_KEY` is set in App Services Values
- ✅ Verify API key is valid (test in Postman/curl)
- ✅ Check trigger logs for error messages
- ✅ Ensure chunks have `content` field with text

### Rate Limiting
VoyageAI has rate limits. If you're processing many chunks:
- Add retry logic with exponential backoff
- Process in smaller batches
- Consider upgrading your VoyageAI plan

## Cost Considerations

**VoyageAI Pricing (voyage-2 model):**
- ~$0.10 per 1M tokens
- Average chunk: ~500 tokens
- 44,566 chunks × 500 tokens = ~22M tokens
- **Estimated cost**: ~$2.20 for full backfill

**MongoDB Atlas:**
- Triggers are included in your cluster tier
- No additional cost for trigger execution

## Next Steps

After setting up the trigger:

1. ✅ Create the vector search index (see main README)
2. ✅ Backfill existing chunks with embeddings
3. ✅ Monitor the MongoDB Analysis Dashboard
4. ✅ Test vector search queries

## Support

For issues or questions:
- MongoDB Atlas Triggers: [Documentation](https://www.mongodb.com/docs/atlas/app-services/triggers/)
- VoyageAI API: [Documentation](https://docs.voyageai.com/)
