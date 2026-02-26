
import { HighImpactEntitiesExtractionService } from './services/highImpactEntitiesExtractionService';
import { aiService } from './services/aiService';
import { logger } from './utils/logger';

// Mock AI Service Response
const mockAIResponse = {
    content: JSON.stringify({
        requirements: [
            {
                title: "Test Requirement",
                description: "This is a test requirement",
                source_document: "Test Doc",
                source_document_id: "doc-123"
            }
        ],
        deliverables: [],
        stakeholders: [],
        resources: [],
        milestones: []
    })
};

// Override aiService.generateWithFallback
(aiService as any).generateWithFallback = async () => {
    return mockAIResponse;
};

// Tracking logs
const loggedMessages: any[] = [];
const originalLoggerInfo = logger.info;
(logger as any).info = (message: string, meta?: any) => {
    loggedMessages.push({ message, meta });
    // originalLoggerInfo.apply(logger, [message, meta]); // Keep it quiet during test
};

async function verify() {
    console.log('--- Verification Started ---');

    const service = new HighImpactEntitiesExtractionService();
    const docs = [
        {
            id: 'doc-123',
            title: 'Test Doc',
            content: 'This is a test requirement in a document content.\nLine 2.\nLine 3.',
            template_name: 'Test Template'
        }
    ];

    const results = await service.extractHighImpactEntitiesWithLocations(docs, 'proj-123', {});

    console.log('Checking results...');
    const requirement = results.requirements[0];

    if (requirement && requirement.entity_markdown_tag === 'h5') {
        console.log('✅ Standardized tag (h5) verified in results.');
    } else {
        console.error('❌ Standardized tag (h5) FAILED in results.', requirement?.entity_markdown_tag);
    }

    console.log('Checking logs...');
    const discoveryLog = loggedMessages.find(log => log.message.includes('Discovered requirement'));

    if (discoveryLog) {
        console.log('✅ Detailed logging verified.');
        console.log('Log Metadata:', JSON.stringify(discoveryLog.meta, null, 2));

        const meta = discoveryLog.meta;
        const requiredFields = [
            'source_document_id',
            'source_text_start',
            'source_text_end',
            'source_line_start',
            'source_line_end',
            'source_context',
            'source_snippet',
            'entity_markdown_tag'
        ];

        const missingFields = requiredFields.filter(field => meta[field] === undefined);

        if (missingFields.length === 0) {
            console.log('✅ All metadata fields present in log.');
        } else {
            console.error('❌ Missing metadata fields in log:', missingFields);
        }

        if (meta.entity_markdown_tag === 'h5') {
            console.log('✅ Tag (h5) verified in log metadata.');
        } else {
            console.error('❌ Tag (h5) FAILED in log metadata:', meta.entity_markdown_tag);
        }

    } else {
        console.error('❌ Detailed logging NOT found in logs.');
    }

    console.log('--- Verification Finished ---');
    process.exit(0);
}

verify().catch(err => {
    console.error('Verification crashed:', err);
    process.exit(1);
});
