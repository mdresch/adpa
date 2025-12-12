
import { templateImprovementService } from '../src/services/templateImprovementService';
import { pool, connectDatabase } from '../src/database/connection';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const logFile = path.join(process.cwd(), 'verification.log');

function log(message: string) {
    fs.appendFileSync(logFile, message + '\n');
    console.log(message);
}

async function verifyStaticAnalysis() {
    fs.writeFileSync(logFile, 'Starting verification...\n');
    const testTemplateId = uuidv4(); // Make ID traceable

    try {
        log('0. Connecting to database...');
        await connectDatabase();

        log('1. Creating test template with ID: ' + testTemplateId);

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
            '3a82e0e8-c54d-4f99-b1d7-e651ce101341'
        ]);

        log('2. Running static analysis...');
        await templateImprovementService.analyzeTemplateStatic(testTemplateId);

        log('3. Checking for suggestions...');
        const result = await pool.query(`
            SELECT * FROM template_improvement_suggestions 
            WHERE template_id = $1
        `, [testTemplateId]);

        if (result.rows.length > 0) {
            log('SUCCESS: Static analysis generated suggestions.');
            log('Suggestion Count: ' + result.rows.length);
            log('First Suggestion: ' + JSON.stringify(result.rows[0].suggested_improvements, null, 2));
        } else {
            log('FAILURE: No suggestions generated.');
        }

    } catch (error: any) {
        log('Verification failed: ' + (error.message || error));
        log('Stack: ' + error.stack);
    } finally {
        log('4. Cleaning up...');
        try {
            await pool.query('DELETE FROM template_improvement_suggestions WHERE template_id = $1', [testTemplateId]);
            await pool.query('DELETE FROM templates WHERE id = $1', [testTemplateId]);
            await pool.end();
            log('Cleanup complete.');
        } catch (e: any) {
            log('Cleanup failed: ' + e.message);
        }
    }
}

if (require.main === module) {
    verifyStaticAnalysis();
}
