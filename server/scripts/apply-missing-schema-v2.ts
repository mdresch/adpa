import 'dotenv/config';
import { Pool } from 'pg';

async function applySchema() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🚀 Applying missing schema fixes (Batch 2)...');

        // Enable uuid-ossp
        await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

        const tables = [
            `CREATE TABLE IF NOT EXISTS baselines (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID,
        version INTEGER,
        approval_status VARCHAR(50),
        scope_baseline TEXT,
        technical_baseline TEXT,
        timeline_baseline TEXT,
        cost_baseline NUMERIC,
        resource_baseline TEXT,
        success_criteria TEXT,
        extraction_confidence NUMERIC,
        completeness_score NUMERIC,
        consistency_score NUMERIC,
        clarity_score NUMERIC,
        approved_by UUID,
        approved_at TIMESTAMP WITH TIME ZONE,
        baseline_snapshot_hash TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
      )`,
            `CREATE TABLE IF NOT EXISTS template_variables (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_id UUID,
        name VARCHAR(100),
        description TEXT,
        type VARCHAR(50),
        required BOOLEAN DEFAULT false,
        default_value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS template_structure (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_id UUID,
        sections JSONB,
        hierarchy JSONB,
        complexity_score NUMERIC,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS user_feedback (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        entity_id UUID,
        entity_type VARCHAR(50),
        rating INTEGER,
        comment TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS team_members (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID,
        user_id UUID,
        role VARCHAR(100),
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS template_metadata (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_id UUID,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS user_locale_preferences (
        user_id UUID PRIMARY KEY,
        locale VARCHAR(20),
        timezone VARCHAR(50),
        date_format VARCHAR(50),
        number_format VARCHAR(50),
        metadata JSONB
      )`,
            `CREATE TABLE IF NOT EXISTS user_notification_preferences (
        user_id UUID PRIMARY KEY,
        channels TEXT[],
        frequency VARCHAR(50),
        quiet_hours JSONB,
        metadata JSONB
      )`,
            `CREATE TABLE IF NOT EXISTS user_accessibility_preferences (
        user_id UUID PRIMARY KEY,
        font_size VARCHAR(20),
        contrast VARCHAR(20),
        reduce_motion BOOLEAN,
        metadata JSONB
      )`,
            `CREATE TABLE IF NOT EXISTS user_devices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        device_type VARCHAR(50),
        os VARCHAR(50),
        browser VARCHAR(50),
        last_seen TIMESTAMP WITH TIME ZONE,
        metadata JSONB
      )`,
            `CREATE TABLE IF NOT EXISTS user_security_settings (
        user_id UUID PRIMARY KEY,
        mfa_enabled BOOLEAN DEFAULT false,
        last_password_change TIMESTAMP WITH TIME ZONE,
        allowed_ip_ranges TEXT[],
        metadata JSONB
      )`,
            `CREATE TABLE IF NOT EXISTS user_time_preferences (
        user_id UUID PRIMARY KEY,
        working_hours JSONB,
        meeting_preferences TEXT[],
        metadata JSONB
      )`,
            `CREATE TABLE IF NOT EXISTS user_projects (
        user_id UUID,
        project_id UUID,
        role VARCHAR(100),
        PRIMARY KEY (user_id, project_id)
      )`,
            `CREATE TABLE IF NOT EXISTS user_known_gaps (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        gap_description TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS baseline_drift_findings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID,
        category VARCHAR(100),
        severity VARCHAR(50),
        status VARCHAR(50),
        detected_at TIMESTAMP WITH TIME ZONE,
        resolved_at TIMESTAMP WITH TIME ZONE,
        impact_area VARCHAR(100),
        variance_value NUMERIC,
        variance_units VARCHAR(50),
        description TEXT
      )`,
            `CREATE TABLE IF NOT EXISTS drift_root_causes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID,
        cause_category VARCHAR(100),
        cause_detail TEXT,
        recurring BOOLEAN,
        proposed_actions TEXT,
        owner VARCHAR(100),
        last_updated TIMESTAMP WITH TIME ZONE
      )`,
            `CREATE TABLE IF NOT EXISTS lessons_learned (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID,
        template_id UUID,
        category VARCHAR(100),
        lesson TEXT,
        action_taken TEXT,
        effectiveness NUMERIC,
        date_learned DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS best_practices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID,
        template_id UUID,
        category VARCHAR(100),
        title VARCHAR(255),
        description TEXT,
        effectiveness NUMERIC,
        applicability TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS template_feedback (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_id UUID,
        user_id UUID,
        rating INTEGER,
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS template_improvements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_id UUID,
        improvement_suggestion TEXT,
        status VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS template_dependencies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_id UUID,
        dependency_id UUID,
        dependency_type VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS template_customizations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_id UUID,
        project_id UUID,
        customization_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS template_validation_rules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_id UUID,
        rule_name VARCHAR(100),
        rule_definition TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS template_access_controls (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_id UUID,
        role VARCHAR(50),
        permission VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS template_collaboration (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_id UUID,
        collaborators JSONB,
        history JSONB,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS template_version_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_id UUID,
        version_number VARCHAR(20),
        changes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS template_approval_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_id UUID,
        approver_id UUID,
        status VARCHAR(50),
        comments TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
        ];

        for (const sql of tables) {
            const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
            process.stdout.write(`Creating table ${tableName}... `);
            await pool.query(sql);
            console.log('Done.');
        }

        console.log('✅ Batch 2 schema fixes applied successfully.');

    } catch (err) {
        console.error('❌ Failed to apply Batch 2 schema fixes:', err);
    } finally {
        await pool.end();
    }
}

applySchema();
