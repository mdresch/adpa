require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});

const indexName = process.env.PINECONE_INDEX_NAME || 'adpa-integrated-embeddings';

async function checkPineconeStats() {
    try {
        console.log('🔍 Checking Pinecone index stats...\n');
        console.log('Index Name:', indexName);
        console.log('API Key:', process.env.PINECONE_API_KEY ? '✅ Set' : '❌ Not set');

        const index = pinecone.index(indexName);

        console.log('\n📊 Fetching index statistics...');
        const stats = await index.describeIndexStats();

        console.log('\n✅ Index Stats:');
        console.log(JSON.stringify(stats, null, 2));

        // Check namespaces
        if (stats.namespaces) {
            console.log('\n📦 Namespaces:');
            for (const [namespace, data] of Object.entries(stats.namespaces)) {
                console.log(`  - ${namespace || '(default)'}: ${data.recordCount || data.vectorCount || 0} vectors`);
            }
        }

        console.log('\n📈 Summary:');
        console.log('  Total Vectors:', stats.totalRecordCount || stats.totalVectorCount || 0);
        console.log('  Dimensions:', stats.dimension || stats.dimensionCount || 'unknown');
        console.log('  Index Fullness:', stats.indexFullness || 0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    }
}

checkPineconeStats();
