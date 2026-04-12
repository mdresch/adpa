/**
 * Security Regression Test: Playbook Ownership Enforcement
 * Ensures that playbooks are only accessible by their creator.
 */

import { playbookService } from '../../services/playbookService';
import { pool, connectDatabase } from '../../database/connection';
import { v4 as uuidv4 } from 'uuid';

describe('Security Regression: Playbook Ownership', () => {
    let userAId: string;
    let userBId: string;
    let projectId: string;
    let playbookAId: string;

    beforeAll(async () => {
        await connectDatabase();

        // Setup User A
        userAId = uuidv4();
        await pool!.query(
            "INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)",
            [userAId, `user-a-${Date.now()}@test.com`, 'hash', 'User A', 'user']
        );

        // Setup User B
        userBId = uuidv4();
        await pool!.query(
            "INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)",
            [userBId, `user-b-${Date.now()}@test.com`, 'hash', 'User B', 'user']
        );

        // Setup Project
        projectId = uuidv4();
        await pool!.query(
            "INSERT INTO projects (id, name, owner_id, framework) VALUES ($1, $2, $3, $4)",
            [projectId, 'Security Test Project', userAId, 'ADPA']
        );

        // User A creates a playbook
        const playbook = await playbookService.createPlaybook({
            project_id: projectId,
            title: 'User A Private Playbook',
            category: 'risk',
            trigger_type: 'manual'
        }, userAId);
        playbookAId = playbook.id;
    });

    afterAll(async () => {
        if (playbookAId) await pool!.query("DELETE FROM operational_playbooks WHERE id = $1", [playbookAId]);
        if (projectId) await pool!.query("DELETE FROM projects WHERE id = $1", [projectId]);
        await pool!.query("DELETE FROM users WHERE id IN ($1, $2)", [userAId, userBId]);
    });

    it('should allow User A to access their own playbook', async () => {
        const playbook = await playbookService.getPlaybookById(playbookAId, userAId);
        expect(playbook).toBeDefined();
        expect(playbook?.id).toBe(playbookAId);
    });

    it('should FORBID User B from accessing User A\'s playbook', async () => {
        const playbook = await playbookService.getPlaybookById(playbookAId, userBId);
        expect(playbook).toBeNull();
    });

    it('should allow access if no userId is provided (system/internal context)', async () => {
        const playbook = await playbookService.getPlaybookById(playbookAId);
        expect(playbook).toBeDefined();
        expect(playbook?.id).toBe(playbookAId);
    });

    it('should FORBID User B from deleting User A\'s playbook', async () => {
        const deleted = await playbookService.deletePlaybook(playbookAId, userBId);
        expect(deleted).toBe(false);
        
        // Verify it still exists
        const playbook = await playbookService.getPlaybookById(playbookAId);
        expect(playbook).toBeDefined();
    });

    it('should ALLOW User A to delete their own playbook', async () => {
        const deleted = await playbookService.deletePlaybook(playbookAId, userAId);
        expect(deleted).toBe(true);
        
        // Verify it is gone
        const playbook = await playbookService.getPlaybookById(playbookAId);
        expect(playbook).toBeNull();
    });
});
