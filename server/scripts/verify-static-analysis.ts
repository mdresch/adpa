
import { templateImprovementService } from '../src/services/templateImprovementService';
import { pool } from '../src/database/connection';
import { v4 as uuidv4 } from 'uuid';

async function verifyStaticAnalysis() {
    const testTemplateId = uuidv4();
    try {
        console.log('1. Creating test template...');
        await pool.query(`
            INSERT INTO templates (id, name, description, framework, category, content, variables, is_public, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            testTemplateId,
            'Static Analysis Test Template',
            'A template designed to trigger static analysis suggestions.',
            'Custom',
            'Specification',
            JSON.stringify({
                sections: [
                    { title: 'Introduction', content: '{{intro}}' }
                ]
            }),
            JSON.stringify([]),
            false,
            '3a82e0e8-c54d-4f99-b1d7-e651ce101341' // Use existing admin ID from seed
        ]);

        console.log('2. Running static analysis...');
        // Directly calling the public method we added
        await templateImprovementService.analyzeTemplateStatic(testTemplateId);

        console.log('3. Checking for suggestions...');
        const result = await pool.query(`
            SELECT * FROM template_improvement_suggestions 
            WHERE template_id = $1
        `, [testTemplateId]);

        if (result.rows.length > 0) {
            console.log('SUCCESS: Static analysis generated suggestions.');
            console.log('Suggestion Count:', result.rows.length);
            console.log('First Suggestion:', JSON.stringify(result.rows[0].suggested_improvements, null, 2));
        } else {
            console.error('FAILURE: No suggestions generated.');
        }

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        console.log('4. Cleaning up...');
        await pool.query('DELETE FROM template_improvement_suggestions WHERE template_id = $1', [testTemplateId]);
        await pool.query('DELETE FROM templates WHERE id = $1', [testTemplateId]);
        await pool.end();
    }
}

// Execute
if (require.main === module) {
    verifyStaticAnalysis();
}
