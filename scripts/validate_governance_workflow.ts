import 'dotenv/config';
import { MultiStageDocumentProcessor } from '../server/src/modules/multiStageDocumentProcessor';
import { logger } from '../server/src/utils/logger';

async function validateWorkflow() {
    const processor = new MultiStageDocumentProcessor({
        enableParallelProcessing: false,
        enableQualityGates: true,
        enableMonitoring: true,
        maxProcessingTime: 300000,
        defaultRetryAttempts: 1
    });

    const request = {
        request_id: `validate_gov_${Date.now()}`,
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
        }
    };

    console.log('🚀 Starting Governance Playbook Workflow Validation...');
    console.log(`Template ID: ${request.template_id}`);
    console.log(`Project ID: ${request.project_id}`);

    try {
        // We only want to see the STAGES log, not necessarily run the full expensive AI generation 
        // if we haven't configured the API keys. 
        // However, processDocument runs the full pipeline.

        const result = await processor.processDocument(request as any);

        console.log('\n--- WORKFLOW VALIDATION RESULTS ---');
        console.log(`Status: ${result.status.status}`);
        console.log(`Progress: ${result.status.progress}%`);

        result.stages.forEach(stage => {
            console.log(`[Stage] ${stage.stage_type}: ${stage.status} (${stage.execution_time}ms)`);
            if (stage.stage_type === 'context_gathering') {
                const output = stage.output as any;
                console.log(`   - Context Size: ${output.output_data.context_bundle.metadata.total_size} bytes`);
                console.log(`   - Quality Score: ${stage.quality_score}`);
            }
        });

        console.log('\n--- FINAL DOCUMENT PREVIEW ---');
        console.log(result.final_document.content.substring(0, 500) + '...');

    } catch (error: any) {
        console.error('\n❌ Workflow Validation Failed:');
        console.error(error.message);
        if (error.stack) {
            // console.error(error.stack);
        }
    }
}

validateWorkflow();
