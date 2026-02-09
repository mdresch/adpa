#!/usr/bin/env node

/**
 * Setup script for Supabase Vector Buckets RAG infrastructure
 * Creates the vector bucket and index for document embeddings
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const BUCKET_NAME = 'embeddings';
const INDEX_NAME = 'documents-openai';
const DIMENSION = 1536; // OpenAI text-embedding-3-small
const DISTANCE_METRIC = 'cosine';

async function setupVectorBucket() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
        process.exit(1);
    }

    console.log('🚀 Setting up Supabase Vector Bucket for RAG...\n');
    console.log(`📊 Configuration:`);
    console.log(`   Bucket: ${BUCKET_NAME}`);
    console.log(`   Index: ${INDEX_NAME}`);
    console.log(`   Dimension: ${DIMENSION}`);
    console.log(`   Distance Metric: ${DISTANCE_METRIC}\n`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        // Note: Vector Buckets API is in alpha and may require manual setup via Supabase Dashboard
        // This script documents the required configuration

        console.log('⚠️  Vector Buckets are currently in alpha.');
        console.log('📝 Please create the following manually in your Supabase Dashboard:\n');

        console.log('1️⃣  Create Vector Bucket:');
        console.log(`   - Name: ${BUCKET_NAME}`);
        console.log(`   - Go to: Storage → Vector Buckets → New Bucket\n`);

        console.log('2️⃣  Create Index:');
        console.log(`   - Bucket: ${BUCKET_NAME}`);
        console.log(`   - Index Name: ${INDEX_NAME}`);
        console.log(`   - Data Type: float32`);
        console.log(`   - Dimension: ${DIMENSION}`);
        console.log(`   - Distance Metric: ${DISTANCE_METRIC}\n`);

        console.log('3️⃣  Set OpenAI API Key Secret:');
        console.log('   Run: supabase secrets set OPENAI_API_KEY=sk-...\n');

        console.log('✅ Once configured, your RAG ingestion function will be ready!');
        console.log(`🔗 Function URL: ${SUPABASE_URL}/functions/v1/ingest-for-rag\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

setupVectorBucket();
