
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

import { initDb, pool } from '../src/database/connection';
import { LessonsLearnedService } from '../src/services/lessonsLearnedService';
import { logger } from '../src/utils/logger';

async function verifyLessonsLearned() {
    try {
        await initDb();
        const service = new LessonsLearnedService();

        // 1. Get a project ID (use first available)
        const projectResult = await pool!.query('SELECT id FROM projects LIMIT 1');
        if (projectResult.rows.length === 0) {
            console.error('No projects found to test with');
            return;
        }
        const projectId = projectResult.rows[0].id;
        const userId = '00000000-0000-0000-0000-000000000000'; // System user or similar

        console.log(`Testing with Project ID: ${projectId}`);

        // 2. Create a lesson with new fields
        const input = {
            project_id: projectId,
            title: 'Test Enhanced Lesson',
            description: 'Testing the new fields: status, severity, phase',
            category: 'Process',
            impact: 'high' as const,
            severity: 'critical' as const,
            status: 'identified' as const,
            phase: 'Execution',
            positive_or_negative: false,
            shared_with_org: true,
            applicable_to: ['Project A', 'Project B'],
            tags: ['test', 'enhancement']
        };

        const created = await service.create(input, userId);
        console.log('Created Lesson:', created);

        if (created.status !== 'identified' || created.severity !== 'critical' || created.phase !== 'Execution') {
            console.error('❌ Failed: New fields not persisted correctly');
        } else {
            console.log('✅ New fields persisted correctly');
        }

        // 3. Update the lesson
        const updated = await service.update(created.id, {
            status: 'documented',
            phase: 'Monitoring',
            ai_analysis: {
                insights: 'AI Insights Test',
                confidence: 0.95,
                suggested_actions: ['Action 1', 'Action 2'],
                categorization: 'Process Improvement'
            }
        }, userId);
        console.log('Updated Lesson:', updated);

        if (updated.status !== 'documented' || updated.phase !== 'Monitoring') {
            console.error('❌ Failed: Update fields not persisted');
        } else {
            console.log('✅ Update fields persisted');
        }

        // 4. Verify AI Analysis (might need a separate query if service doesn't return it directly in updated object, but typically RETURNING * does)
        // Check DB directly for ai_analysis column
        const dbCheck = await pool!.query('SELECT ai_analysis, ai_confidence FROM lessons_learned WHERE id = $1', [created.id]);
        console.log('DB AI Analysis:', dbCheck.rows[0]);

        if (dbCheck.rows[0].ai_analysis && dbCheck.rows[0].ai_analysis.insights === 'AI Insights Test') {
            console.log('✅ AI Analysis persisted correctly');
        } else {
            console.error('❌ Failed: AI Analysis not persisted');
        }

        // Cleanup
        await service.delete(created.id);
        console.log('Cleanup complete');

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await pool!.end();
    }
}

verifyLessonsLearned();
