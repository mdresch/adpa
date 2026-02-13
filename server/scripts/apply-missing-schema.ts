import 'dotenv/config';
import { Pool } from 'pg';

async function applySchema() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🚀 Applying missing schema fixes...');

        // Enable uuid-ossp
        await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

        // Fix pipeline_executions job_id type if needed, or stick to UUID
        // Actually, if it's already UUID, just leave it and ensure we send valid UUIDs.

        // Create document_history
        console.log('Creating document_history table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS document_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_id UUID,
        project_id UUID,
        created_by UUID,
        status VARCHAR(50),
        quality_score NUMERIC,
        content TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      )
    `);

        // Fix document_chunks
        console.log('Updating document_chunks table...');
        await pool.query('ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS title VARCHAR(255)');
        await pool.query('ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS project_id UUID');
        await pool.query('ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS template_id UUID');

        // Create search_history
        console.log('Creating search_history table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS search_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        query TEXT,
        context_types JSONB,
        filters JSONB,
        user_id UUID,
        project_id UUID,
        template_id UUID,
        results_count INTEGER,
        processing_time INTEGER,
        search_strategy VARCHAR(50),
        relevance_threshold NUMERIC,
        cache_hit BOOLEAN,
        error TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Create search_index
        console.log('Creating search_index table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS search_index (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        content TEXT,
        type VARCHAR(50),
        source VARCHAR(100),
        source_id VARCHAR(255),
        embeddings JSONB,
        keywords TEXT[],
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source, source_id)
      )
    `);

        // Create stage_executions if missing (it appeared in one of the error logs)
        console.log('Creating stage_executions table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS stage_executions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id UUID,
        stage_id VARCHAR(100),
        stage_type VARCHAR(100),
        status VARCHAR(50),
        input_data JSONB,
        output_data JSONB,
        execution_time INTEGER,
        quality_score NUMERIC,
        error_message TEXT,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Create job_execution_logs if missing
        console.log('Creating job_execution_logs table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS job_execution_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id UUID,
        job_type VARCHAR(100),
        queue_name VARCHAR(100),
        status VARCHAR(50),
        priority INTEGER,
        queued_at TIMESTAMP WITH TIME ZONE,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        duration_ms INTEGER,
        success BOOLEAN,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        user_id UUID,
        project_id UUID,
        job_data JSONB,
        result_data JSONB
      )
    `);

        console.log('✅ Schema fixes applied successfully.');

    } catch (err) {
        console.error('❌ Failed to apply schema fixes:', err);
    } finally {
        await pool.end();
    }
}

applySchema();
