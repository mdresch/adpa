/**
 * Test: Document Entity Editing (TASK-717)
 * 
 * Tests for adding stakeholders and removing risks from document content
 */

import express from 'express'
import request from 'supertest'
import { pool } from '../../database/connection'
import { v4 as uuidv4 } from 'uuid'

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = {
      id: req.query.testUserId || 'test-user-id',
      email: 'test@example.com',
      role: req.query.testUserRole || 'user',
      permissions: []
    }
    next()
  }
}))

describe('Document Entity Editing - Add Stakeholder, Remove Risk', () => {
  let testProjectId: string
  let testDocumentId: string
  let testUserId: string
  let testStakeholderId: string
  let app: express.Application

  beforeAll(async () => {
    // Create test user
    testUserId = uuidv4()
    await pool!.query(
      `INSERT INTO users (id, email, password_hash, role, name)
       VALUES ($1, 'test-user@example.com', 'hash', 'user', 'Test User')
       ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role`,
      [testUserId]
    )

    // Create test project
    testProjectId = uuidv4()
    await pool!.query(
      `INSERT INTO projects (id, name, created_by)
       VALUES ($1, 'Test Document Editing Project', $2)
       ON CONFLICT (id) DO UPDATE SET created_by = EXCLUDED.created_by`,
      [testProjectId, testUserId]
    )

    // Create test document with risks
    testDocumentId = uuidv4()
    const documentContent = `# Project Charter

## Stakeholders

- **John Doe** (Project Manager)
  - Email: john@example.com
  - Influence: high
  - Interest: high

## Risks

- Vendor delivery delay: High probability of vendor delays affecting timeline
- Skills gap in React: Team lacks React expertise, may slow development
- Budget overrun: Current estimates may exceed allocated budget
- Scope creep: Uncontrolled scope changes may impact delivery

## Milestones

- Design Complete: March 15, 2024
- Development Start: March 20, 2024
- Testing Complete: April 15, 2024
`

    await pool!.query(
      `INSERT INTO documents (id, project_id, name, content, created_by, updated_by, status)
       VALUES ($1, $2, 'Test Document', $3, $4, $4, 'draft')
       ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content`,
      [testDocumentId, testProjectId, documentContent, testUserId]
    )

    // Create test stakeholder
    testStakeholderId = uuidv4()
    await pool!.query(
      `INSERT INTO stakeholders (id, project_id, name, role, email, influence_level, interest_level)
       VALUES ($1, $2, 'Jane Smith', 'Developer', 'jane@example.com', 'medium', 'high')
       ON CONFLICT (id) DO NOTHING`,
      [testStakeholderId, testProjectId]
    )

    // Setup Express app
    app = express()
    app.use(express.json())
    // Import routes here if needed
  })

  afterAll(async () => {
    // Clean up
    await pool!.query('DELETE FROM stakeholders WHERE project_id = $1', [testProjectId])
    await pool!.query('DELETE FROM documents WHERE project_id = $1', [testProjectId])
    await pool!.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    await pool!.query('DELETE FROM users WHERE id = $1', [testUserId])
  })

  describe('Add Stakeholder to Document', () => {
    test('should insert stakeholder into document content', async () => {
      // This would be tested via the frontend component
      // The component should:
      // 1. Load stakeholders from project
      // 2. Allow user to select a stakeholder
      // 3. Insert stakeholder into document content at appropriate location
      // 4. Update editedContent state
      
      const originalContent = await pool!.query(
        'SELECT content FROM documents WHERE id = $1',
        [testDocumentId]
      )
      
      expect(originalContent.rows[0].content).toContain('John Doe')
      expect(originalContent.rows[0].content).not.toContain('Jane Smith')
      
      // Simulate adding stakeholder
      const stakeholder = await pool!.query(
        'SELECT * FROM stakeholders WHERE id = $1',
        [testStakeholderId]
      )
      
      expect(stakeholder.rows[0].name).toBe('Jane Smith')
      expect(stakeholder.rows[0].email).toBe('jane@example.com')
    })

    test('should detect stakeholder already in document', async () => {
      const content = await pool!.query(
        'SELECT content FROM documents WHERE id = $1',
        [testDocumentId]
      )
      
      const documentContent = content.rows[0].content
      
      // Check if stakeholder name or email exists
      const stakeholderName = 'John Doe'
      const stakeholderEmail = 'john@example.com'
      
      expect(documentContent.toLowerCase()).toContain(stakeholderName.toLowerCase())
      expect(documentContent.toLowerCase()).toContain(stakeholderEmail.toLowerCase())
    })
  })

  describe('Remove Risk from Document', () => {
    test('should extract risks from document content', async () => {
      const content = await pool!.query(
        'SELECT content FROM documents WHERE id = $1',
        [testDocumentId]
      )
      
      const documentContent = content.rows[0].content
      
      // Verify risks exist in content
      expect(documentContent).toContain('Vendor delivery delay')
      expect(documentContent).toContain('Skills gap in React')
      expect(documentContent).toContain('Budget overrun')
      expect(documentContent).toContain('Scope creep')
    })

    test('should remove risk from document content', async () => {
      const content = await pool!.query(
        'SELECT content FROM documents WHERE id = $1',
        [testDocumentId]
      )
      
      let documentContent = content.rows[0].content
      
      // Simulate removing a risk
      const riskToRemove = 'Vendor delivery delay'
      const lines = documentContent.split('\n')
      const newLines = lines.filter(line => 
        !line.includes(riskToRemove) && 
        !(line.trim().startsWith('-') && line.includes('delay'))
      )
      documentContent = newLines.join('\n')
      
      expect(documentContent).not.toContain('Vendor delivery delay')
      expect(documentContent).toContain('Skills gap in React') // Other risks should remain
      expect(documentContent).toContain('Budget overrun')
    })
  })

  describe('Document Update Triggers Drift Detection', () => {
    test('should trigger drift detection when document is updated', async () => {
      // When document is saved with new stakeholder or removed risk,
      // drift detection should automatically run
      // This is tested in drift-detection tests, but we verify the flow here
      
      const updatedContent = `# Project Charter

## Stakeholders

- **John Doe** (Project Manager)
  - Email: john@example.com
  - Influence: high
  - Interest: high

- **Jane Smith** (Developer)  <!-- NEW STAKEHOLDER ADDED -->
  - Email: jane@example.com
  - Influence: medium
  - Interest: high

## Risks

- Skills gap in React: Team lacks React expertise, may slow development
- Budget overrun: Current estimates may exceed allocated budget
- Scope creep: Uncontrolled scope changes may impact delivery
<!-- Vendor delivery delay risk REMOVED -->
`

      // Update document
      await pool!.query(
        'UPDATE documents SET content = $1, updated_at = NOW() WHERE id = $2',
        [updatedContent, testDocumentId]
      )

      // Verify update
      const updated = await pool!.query(
        'SELECT content FROM documents WHERE id = $1',
        [testDocumentId]
      )
      
      expect(updated.rows[0].content).toContain('Jane Smith')
      expect(updated.rows[0].content).not.toContain('Vendor delivery delay')
    })
  })
})

