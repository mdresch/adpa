/**
 * Tests for Team Agreements Database Schema (TASK-138)
 * 
 * Tests the database structure for team_agreements and team_agreement_adherence_log tables
 */

const db = require('../../lib/db')
import dotenv from 'dotenv'

dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL or POSTGRES_URL must be set in environment variables')
}

describe('Team Agreements Database Schema (TASK-138)', () => {
  let pool: Pool

  beforeAll(() => {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('supabase') || DATABASE_URL.includes('amazonaws')
        ? { rejectUnauthorized: false }
        : false
    })
  })

  afterAll(async () => {
    try { await db.end() } catch (e) {}})

  describe('team_agreements table', () => {
    it('should exist', async () => {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'team_agreements'
        )
      `)
      expect(result.rows[0].exists).toBe(true)
    })

    it('should have correct columns', async () => {
      const result = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'team_agreements'
        ORDER BY ordinal_position
      `)

      const columns = result.rows.map(r => r.column_name)
      
      expect(columns).toContain('id')
      expect(columns).toContain('project_id')
      expect(columns).toContain('title')
      expect(columns).toContain('description')
      expect(columns).toContain('category')
      expect(columns).toContain('agreed_by')
      expect(columns).toContain('facilitated_by')
      expect(columns).toContain('effective_date')
      expect(columns).toContain('review_frequency')
      expect(columns).toContain('next_review_date')
      expect(columns).toContain('status')
      expect(columns).toContain('adherence_score')
      expect(columns).toContain('violations_count')
      expect(columns).toContain('last_violation_date')
      expect(columns).toContain('source_document_id')
      expect(columns).toContain('notes')
      expect(columns).toContain('created_at')
      expect(columns).toContain('updated_at')
      expect(columns).toContain('created_by')
    })

    it('should have id as UUID primary key', async () => {
      const result = await db.query(`
        SELECT 
          c.column_name,
          c.data_type,
          c.is_nullable,
          tc.constraint_type
        FROM information_schema.columns c
        LEFT JOIN information_schema.key_column_usage kcu 
          ON c.table_name = kcu.table_name 
          AND c.column_name = kcu.column_name
        LEFT JOIN information_schema.table_constraints tc 
          ON kcu.constraint_name = tc.constraint_name
        WHERE c.table_name = 'team_agreements' 
          AND c.column_name = 'id'
      `)

      expect(result.rows[0].data_type).toBe('uuid')
      expect(result.rows[0].is_nullable).toBe('NO')
      expect(result.rows[0].constraint_type).toBe('PRIMARY KEY')
    })

    it('should have project_id as foreign key to projects', async () => {
      const result = await db.query(`
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'team_agreements'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'project_id'
      `)

      expect(result.rows.length).toBeGreaterThan(0)
      expect(result.rows[0].foreign_table_name).toBe('projects')
    })

    it('should have category check constraint with valid values', async () => {
      const result = await db.query(`
        SELECT constraint_name, check_clause
        FROM information_schema.check_constraints
        WHERE constraint_name LIKE '%team_agreements%category%'
      `)

      expect(result.rows.length).toBeGreaterThan(0)
      
      const checkClause = result.rows[0].check_clause.toLowerCase()
      expect(checkClause).toContain('working_hours')
      expect(checkClause).toContain('communication')
      expect(checkClause).toContain('decision_making')
      expect(checkClause).toContain('conflict_resolution')
      expect(checkClause).toContain('quality_standards')
      expect(checkClause).toContain('meeting_norms')
      expect(checkClause).toContain('code_of_conduct')
      expect(checkClause).toContain('collaboration_tools')
      expect(checkClause).toContain('response_times')
      expect(checkClause).toContain('knowledge_sharing')
      expect(checkClause).toContain('other')
    })

    it('should have status check constraint with valid values', async () => {
      const result = await db.query(`
        SELECT constraint_name, check_clause
        FROM information_schema.check_constraints
        WHERE constraint_name LIKE '%team_agreements%status%'
      `)

      expect(result.rows.length).toBeGreaterThan(0)
      
      const checkClause = result.rows[0].check_clause.toLowerCase()
      expect(checkClause).toContain('draft')
      expect(checkClause).toContain('active')
      expect(checkClause).toContain('under_review')
      expect(checkClause).toContain('revised')
      expect(checkClause).toContain('deprecated')
    })

    it('should have adherence_score check constraint (1.0 to 10.0)', async () => {
      const result = await db.query(`
        SELECT constraint_name, check_clause
        FROM information_schema.check_constraints
        WHERE constraint_name LIKE '%team_agreements%adherence_score%'
      `)

      expect(result.rows.length).toBeGreaterThan(0)
      const checkClause = result.rows[0].check_clause.toLowerCase()
      expect(checkClause).toContain('1.0')
      expect(checkClause).toContain('10.0')
    })

    it('should have violations_count default to 0', async () => {
      const result = await db.query(`
        SELECT column_default
        FROM information_schema.columns
        WHERE table_name = 'team_agreements'
          AND column_name = 'violations_count'
      `)

      expect(result.rows[0].column_default).toBe('0')
    })

    it('should have agreed_by as JSONB with default empty array', async () => {
      const result = await db.query(`
        SELECT data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'team_agreements'
          AND column_name = 'agreed_by'
      `)

      expect(result.rows[0].data_type).toBe('jsonb')
      expect(result.rows[0].column_default).toContain('[]')
    })
  })

  describe('team_agreement_adherence_log table', () => {
    it('should exist', async () => {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'team_agreement_adherence_log'
        )
      `)
      expect(result.rows[0].exists).toBe(true)
    })

    it('should have correct columns', async () => {
      const result = await db.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'team_agreement_adherence_log'
        ORDER BY ordinal_position
      `)

      const columns = result.rows.map(r => r.column_name)
      
      expect(columns).toContain('id')
      expect(columns).toContain('agreement_id')
      expect(columns).toContain('date_recorded')
      expect(columns).toContain('adherence_score')
      expect(columns).toContain('notes')
      expect(columns).toContain('recorded_by')
      expect(columns).toContain('created_at')
    })

    it('should have agreement_id as foreign key to team_agreements', async () => {
      const result = await db.query(`
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'team_agreement_adherence_log'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'agreement_id'
      `)

      expect(result.rows.length).toBeGreaterThan(0)
      expect(result.rows[0].foreign_table_name).toBe('team_agreements')
    })
  })

  describe('Indexes', () => {
    it('should have indexes on team_agreements', async () => {
      const result = await db.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'team_agreements'
        ORDER BY indexname
      `)

      const indexes = result.rows.map(r => r.indexname)
      
      expect(indexes.some(idx => idx.includes('project'))).toBe(true)
      expect(indexes.some(idx => idx.includes('category'))).toBe(true)
      expect(indexes.some(idx => idx.includes('status'))).toBe(true)
    })

    it('should have indexes on team_agreement_adherence_log', async () => {
      const result = await db.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'team_agreement_adherence_log'
        ORDER BY indexname
      `)

      const indexes = result.rows.map(r => r.indexname)
      
      expect(indexes.some(idx => idx.includes('agreement'))).toBe(true)
      expect(indexes.some(idx => idx.includes('date'))).toBe(true)
    })
  })

  describe('Triggers', () => {
    it('should have updated_at trigger on team_agreements', async () => {
      const result = await db.query(`
        SELECT trigger_name, event_manipulation, action_timing
        FROM information_schema.triggers
        WHERE event_object_table = 'team_agreements'
          AND trigger_name LIKE '%updated_at%'
      `)

      expect(result.rows.length).toBeGreaterThan(0)
      expect(result.rows[0].event_manipulation).toBe('UPDATE')
      expect(result.rows[0].action_timing).toBe('BEFORE')
    })
  })

  describe('Data integrity', () => {
    let testProjectId: string
    let testAgreementId: string

    beforeAll(async () => {
      // Get or create a test project
      const projectResult = await db.query(`
        SELECT id FROM projects LIMIT 1
      `)
      
      if (projectResult.rows.length === 0) {
        // Create a test project
        const newProject = await db.query(`
          INSERT INTO projects (id, name, status, owner_id)
          VALUES (gen_random_uuid(), 'Test Project', 'active', gen_random_uuid())
          RETURNING id
        `)
        testProjectId = newProject.rows[0].id
      } else {
        testProjectId = projectResult.rows[0].id
      }
    })

    it('should insert a team agreement', async () => {
      const result = await db.query(`
        INSERT INTO team_agreements (
          project_id,
          title,
          description,
          category,
          effective_date,
          status
        ) VALUES (
          $1,
          'Test Agreement',
          'This is a test agreement',
          'communication',
          NOW(),
          'active'
        )
        RETURNING id, title, category, status
      `, [testProjectId])

      expect(result.rows.length).toBe(1)
      expect(result.rows[0].title).toBe('Test Agreement')
      expect(result.rows[0].category).toBe('communication')
      expect(result.rows[0].status).toBe('active')
      
      testAgreementId = result.rows[0].id
    })

    it('should reject invalid category', async () => {
      await expect(
        db.query(`
          INSERT INTO team_agreements (
            project_id,
            title,
            description,
            category,
            effective_date,
            status
          ) VALUES (
            $1,
            'Invalid Category',
            'Test',
            'invalid_category',
            NOW(),
            'active'
          )
        `, [testProjectId])
      ).rejects.toThrow()
    })

    it('should reject invalid status', async () => {
      await expect(
        db.query(`
          INSERT INTO team_agreements (
            project_id,
            title,
            description,
            category,
            effective_date,
            status
          ) VALUES (
            $1,
            'Invalid Status',
            'Test',
            'communication',
            NOW(),
            'invalid_status'
          )
        `, [testProjectId])
      ).rejects.toThrow()
    })

    it('should reject adherence_score outside 1.0-10.0 range', async () => {
      await expect(
        db.query(`
          INSERT INTO team_agreements (
            project_id,
            title,
            description,
            category,
            effective_date,
            status,
            adherence_score
          ) VALUES (
            $1,
            'Invalid Score',
            'Test',
            'communication',
            NOW(),
            'active',
            11.0
          )
        `, [testProjectId])
      ).rejects.toThrow()
    })

    it('should insert adherence log entry', async () => {
      const result = await db.query(`
        INSERT INTO team_agreement_adherence_log (
          agreement_id,
          adherence_score,
          notes
        ) VALUES (
          $1,
          8.5,
          'Test adherence log entry'
        )
        RETURNING id, adherence_score, notes
      `, [testAgreementId])

      expect(result.rows.length).toBe(1)
      expect(parseFloat(result.rows[0].adherence_score)).toBe(8.5)
      expect(result.rows[0].notes).toBe('Test adherence log entry')
    })

    afterAll(async () => {
      // Clean up test data
      if (testAgreementId) {
        await db.query('DELETE FROM team_agreement_adherence_log WHERE agreement_id = $1', [testAgreementId])
        await db.query('DELETE FROM team_agreements WHERE id = $1', [testAgreementId])
      }
    })
  })
})

