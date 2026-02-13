import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { connectDatabase } from '../src/database/connection';
import { logger } from '../src/utils/logger';

async function validateWorkflow() {
    // Initialize database connection
    try {
        await connectDatabase();
        console.log('✅ Database connected.');
    } catch (err) {
        console.error('Failed to connect to database:', err);
        process.exit(1);
    }

    const { MultiStageDocumentProcessor } = await import('../src/modules/multiStageDocumentProcessor');

    const processor = new MultiStageDocumentProcessor({
        enableParallelProcessing: false,
        enableQualityGates: true,
        enableMonitoring: true,
        maxProcessingTime: 300000,
        defaultRetryAttempts: 1,
        jobTimeout: 300000,
        maxConcurrentJobs: 5,
        enableMetricsCollection: true,
        enableErrorTracking: true
    } as any);

    const request = {
        request_id: uuidv4(),
        template_id: '3a2d5dc7-7041-4d6b-b0f4-2189c7cbf92b', // Governance Playbook - Master
        project_id: 'ea41dd20-ebd8-4db0-a599-dd6c5049b5f7', // CogniSync
        user_id: '3ff9db0c-f239-4291-a61b-6a2800027106',    // ccb@adpa.com
        context_bundle: {},
        processing_config: {
            enable_ai_enhancement: true,
            enable_methodology_alignment: true,
            quality_thresholds: {
                overall_quality: 0.7
            }
        },
        enhancement_config: {
            ai_insights_enabled: true,
            methodology_alignment_enabled: true,
            content_enhancement_enabled: true,
            variable_optimization_enabled: true,
            structure_optimization_enabled: true,
            enhancement_strategies: []
        },
        quality_config: {
            enable_structure_validation: true,
            enable_content_validation: true,
            enable_methodology_validation: true,
            enable_ai_validation: true,
            quality_gates: [],
            validation_criteria: {}
        }
    };

    console.log('🚀 Starting Governance Playbook Workflow Validation...');
    console.log(`Template ID: ${request.template_id}`);
    console.log(`Project ID: ${request.project_id}`);

    try {
        const result = await processor.processDocument(request as any);

        console.log('\n--- WORKFLOW VALIDATION RESULTS ---');
        console.log(`Status: ${result.status.status}`);
        console.log(`Progress: ${result.status.progress}%`);

        result.stages.forEach(stage => {
            console.log(`[Stage] ${stage.stage_type}: ${stage.status} (${stage.execution_time}ms)`);
        });

        console.log('\n--- FINAL DOCUMENT PREVIEW ---');
        if (result.final_document && result.final_document.content) {
            console.log(result.final_document.content.substring(0, 1000) + '...');
        } else {
            console.log('No document content generated.');
        }

    } catch (error: any) {
        console.error('\n❌ Workflow Validation Failed:');
        console.error(error.message);
        if (error.stack) console.error(error.stack);
    }
}

validateWorkflow();
