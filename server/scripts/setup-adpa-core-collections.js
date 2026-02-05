#!/usr/bin/env node

/**
 * Create Core Entities Collections in ADPA Appwrite Database
 * Parallel experiment using ADPA database
 */

const https = require('https');

// Appwrite configuration from MCP config
const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '66c35ae90013006e3f71';
const APPWRITE_API_KEY = 'standard_7e662eed5b5bb098603a9cd28a8b926dd1a577d4de28920fc53925bf83ccd681894c773cb9b5dc34edc8dae32946e697f6bd4e6e11a8225ea53803331c061bb9a1125978cbd9b7414efbc7dc8a3a927f08bad73451505f30f46f47e2325b1105dd956ebe77324a9843a97711d800e259911e5003506e4d3ef21dd3f0efdf5929';

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const url = `${APPWRITE_ENDPOINT}${path}`;
        const options = {
            method: method,
            headers: {
                'X-Appwrite-Project': APPWRITE_PROJECT_ID,
                'X-Appwrite-Key': APPWRITE_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(json);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${json.message || body}`));
                    }
                } catch (e) {
                    reject(new Error(`Invalid JSON response: ${body}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function createCollection(databaseId, collectionId, name, attributes) {
    try {
        console.log(`📁 Creating collection: ${name}`);
        
        const collection = await makeRequest(`/databases/${databaseId}/collections`, 'POST', {
            collectionId: collectionId,
            name: `Core ${name}`, // Prefix to distinguish from existing collections
            permissions: [
                "read(\"any\")",
                "create(\"users\")",
                "update(\"users\")",
                "delete(\"users\")"
            ],
            attributes: attributes
        });

        console.log(`✅ Created collection: ${name} (${collection.$id})`);
        return collection;
    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log(`ℹ️  Collection ${name} already exists`);
            return { $id: collectionId };
        }
        throw error;
    }
}

async function setupCoreEntitiesCollections() {
    try {
        console.log('🚀 Setting up Core Entities Collections in ADPA database...\n');

        const databaseId = 'main'; // Use main database (shows as ADPA in UI)

        // Define core entity collections with their schemas
        const coreEntities = [
            {
                id: 'core_stakeholders',
                name: 'Stakeholders',
                attributes: [
                    { key: 'name', type: 'string', size: 255, required: true },
                    { key: 'role', type: 'string', size: 255 },
                    { key: 'organization', type: 'string', size: 255 },
                    { key: 'influence', type: 'string', size: 50, default: 'medium' },
                    { key: 'interest', type: 'string', size: 50, default: 'medium' },
                    { key: 'contact_info', type: 'string', size: 500 },
                    { key: 'expectations', type: 'string', size: 2000 },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    // Location tracking attributes
                    { key: 'source_document_id', type: 'string', size: 255 },
                    { key: 'source_text_start', type: 'integer' },
                    { key: 'source_text_end', type: 'integer' },
                    { key: 'source_line_start', type: 'integer' },
                    { key: 'source_line_end', type: 'integer' },
                    { key: 'source_context', type: 'string', size: 1000 },
                    { key: 'source_snippet', type: 'string', size: 1000 },
                    { key: 'entity_markdown_tag', type: 'string', size: 10, default: 'h5' },
                    { key: 'confidence_score', type: 'double', default: 0.8 },
                    { key: 'extracted_at', type: 'datetime', required: true }
                ]
            },
            {
                id: 'core_requirements',
                name: 'Requirements',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'string', size: 2000 },
                    { key: 'type', type: 'string', size: 100, default: 'functional' },
                    { key: 'priority', type: 'string', size: 50, default: 'medium' },
                    { key: 'status', type: 'string', size: 50, default: 'pending' },
                    { key: 'acceptance_criteria', type: 'string', size: 2000 },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    // Location tracking attributes
                    { key: 'source_document_id', type: 'string', size: 255 },
                    { key: 'source_text_start', type: 'integer' },
                    { key: 'source_text_end', type: 'integer' },
                    { key: 'source_line_start', type: 'integer' },
                    { key: 'source_line_end', type: 'integer' },
                    { key: 'source_context', type: 'string', size: 1000 },
                    { key: 'source_snippet', type: 'string', size: 1000 },
                    { key: 'entity_markdown_tag', type: 'string', size: 10, default: 'h5' },
                    { key: 'confidence_score', type: 'double', default: 0.8 },
                    { key: 'extracted_at', type: 'datetime', required: true }
                ]
            },
            {
                id: 'core_risks',
                name: 'Risks',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'string', size: 2000 },
                    { key: 'category', type: 'string', size: 100 },
                    { key: 'probability', type: 'string', size: 50, default: 'medium' },
                    { key: 'impact', type: 'string', size: 50, default: 'medium' },
                    { key: 'mitigation_strategy', type: 'string', size: 2000 },
                    { key: 'status', type: 'string', size: 50, default: 'open' },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    // Location tracking attributes
                    { key: 'source_document_id', type: 'string', size: 255 },
                    { key: 'source_text_start', type: 'integer' },
                    { key: 'source_text_end', type: 'integer' },
                    { key: 'source_line_start', type: 'integer' },
                    { key: 'source_line_end', type: 'integer' },
                    { key: 'source_context', type: 'string', size: 1000 },
                    { key: 'source_snippet', type: 'string', size: 1000 },
                    { key: 'entity_markdown_tag', type: 'string', size: 10, default: 'h5' },
                    { key: 'confidence_score', type: 'double', default: 0.8 },
                    { key: 'extracted_at', type: 'datetime', required: true }
                ]
            },
            {
                id: 'core_milestones',
                name: 'Milestones',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'string', size: 2000 },
                    { key: 'target_date', type: 'datetime' },
                    { key: 'status', type: 'string', size: 50, default: 'pending' },
                    { key: 'deliverables', type: 'string', size: 2000 },
                    { key: 'dependencies', type: 'string', size: 1000 },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    // Location tracking attributes
                    { key: 'source_document_id', type: 'string', size: 255 },
                    { key: 'source_text_start', type: 'integer' },
                    { key: 'source_text_end', type: 'integer' },
                    { key: 'source_line_start', type: 'integer' },
                    { key: 'source_line_end', type: 'integer' },
                    { key: 'source_context', type: 'string', size: 1000 },
                    { key: 'source_snippet', type: 'string', size: 1000 },
                    { key: 'entity_markdown_tag', type: 'string', size: 10, default: 'h5' },
                    { key: 'confidence_score', type: 'double', default: 0.8 },
                    { key: 'extracted_at', type: 'datetime', required: true }
                ]
            },
            {
                id: 'core_deliverables',
                name: 'Deliverables',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'string', size: 2000 },
                    { key: 'type', type: 'string', size: 100 },
                    { key: 'status', type: 'string', size: 50, default: 'pending' },
                    { key: 'due_date', type: 'datetime' },
                    { key: 'acceptance_criteria', type: 'string', size: 2000 },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    // Location tracking attributes
                    { key: 'source_document_id', type: 'string', size: 255 },
                    { key: 'source_text_start', type: 'integer' },
                    { key: 'source_text_end', type: 'integer' },
                    { key: 'source_line_start', type: 'integer' },
                    { key: 'source_line_end', type: 'integer' },
                    { key: 'source_context', type: 'string', size: 1000 },
                    { key: 'source_snippet', type: 'string', size: 1000 },
                    { key: 'entity_markdown_tag', type: 'string', size: 10, default: 'h5' },
                    { key: 'confidence_score', type: 'double', default: 0.8 },
                    { key: 'extracted_at', type: 'datetime', required: true }
                ]
            },
            {
                id: 'core_activities',
                name: 'Activities',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'string', size: 2000 },
                    { key: 'status', type: 'string', size: 50, default: 'pending' },
                    { key: 'start_date', type: 'datetime' },
                    { key: 'end_date', type: 'datetime' },
                    { key: 'assigned_to', type: 'string', size: 255 },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    // Location tracking attributes
                    { key: 'source_document_id', type: 'string', size: 255 },
                    { key: 'source_text_start', type: 'integer' },
                    { key: 'source_text_end', type: 'integer' },
                    { key: 'source_line_start', type: 'integer' },
                    { key: 'source_line_end', type: 'integer' },
                    { key: 'source_context', type: 'string', size: 1000 },
                    { key: 'source_snippet', type: 'string', size: 1000 },
                    { key: 'entity_markdown_tag', type: 'string', size: 10, default: 'h5' },
                    { key: 'confidence_score', type: 'double', default: 0.8 },
                    { key: 'extracted_at', type: 'datetime', required: true }
                ]
            },
            {
                id: 'core_scope_items',
                name: 'Scope Items',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'string', size: 2000 },
                    { key: 'type', type: 'string', size: 100 },
                    { key: 'status', type: 'string', size: 50, default: 'in_scope' },
                    { key: 'priority', type: 'string', size: 50, default: 'medium' },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    // Location tracking attributes
                    { key: 'source_document_id', type: 'string', size: 255 },
                    { key: 'source_text_start', type: 'integer' },
                    { key: 'source_text_end', type: 'integer' },
                    { key: 'source_line_start', type: 'integer' },
                    { key: 'source_line_end', type: 'integer' },
                    { key: 'source_context', type: 'string', size: 1000 },
                    { key: 'source_snippet', type: 'string', size: 1000 },
                    { key: 'entity_markdown_tag', type: 'string', size: 10, default: 'h5' },
                    { key: 'confidence_score', type: 'double', default: 0.8 },
                    { key: 'extracted_at', type: 'datetime', required: true }
                ]
            },
            {
                id: 'core_success_criteria',
                name: 'Success Criteria',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'string', size: 2000 },
                    { key: 'category', type: 'string', size: 100 },
                    { key: 'measurement_method', type: 'string', size: 1000 },
                    { key: 'target_value', type: 'string', size: 255 },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    // Location tracking attributes
                    { key: 'source_document_id', type: 'string', size: 255 },
                    { key: 'source_text_start', type: 'integer' },
                    { key: 'source_text_end', type: 'integer' },
                    { key: 'source_line_start', type: 'integer' },
                    { key: 'source_line_end', type: 'integer' },
                    { key: 'source_context', type: 'string', size: 1000 },
                    { key: 'source_snippet', type: 'string', size: 1000 },
                    { key: 'entity_markdown_tag', type: 'string', size: 10, default: 'h5' },
                    { key: 'confidence_score', type: 'double', default: 0.8 },
                    { key: 'extracted_at', type: 'datetime', required: true }
                ]
            },
            {
                id: 'core_constraints',
                name: 'Constraints',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'string', size: 2000 },
                    { key: 'type', type: 'string', size: 100 },
                    { key: 'impact', type: 'string', size: 50, default: 'medium' },
                    { key: 'mitigation', type: 'string', size: 2000 },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    // Location tracking attributes
                    { key: 'source_document_id', type: 'string', size: 255 },
                    { key: 'source_text_start', type: 'integer' },
                    { key: 'source_text_end', type: 'integer' },
                    { key: 'source_line_start', type: 'integer' },
                    { key: 'source_line_end', type: 'integer' },
                    { key: 'source_context', type: 'string', size: 1000 },
                    { key: 'source_snippet', type: 'string', size: 1000 },
                    { key: 'entity_markdown_tag', type: 'string', size: 10, default: 'h5' },
                    { key: 'confidence_score', type: 'double', default: 0.8 },
                    { key: 'extracted_at', type: 'datetime', required: true }
                ]
            },
            {
                id: 'core_resources',
                name: 'Resources',
                attributes: [
                    { key: 'name', type: 'string', size: 255, required: true },
                    { key: 'type', type: 'string', size: 100, default: 'human' },
                    { key: 'role', type: 'string', size: 255 },
                    { key: 'skills', type: 'string', size: 1000 },
                    { key: 'availability', type: 'string', size: 50 },
                    { key: 'cost_rate', type: 'double' },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    // Location tracking attributes
                    { key: 'source_document_id', type: 'string', size: 255 },
                    { key: 'source_text_start', type: 'integer' },
                    { key: 'source_text_end', type: 'integer' },
                    { key: 'source_line_start', type: 'integer' },
                    { key: 'source_line_end', type: 'integer' },
                    { key: 'source_context', type: 'string', size: 1000 },
                    { key: 'source_snippet', type: 'string', size: 1000 },
                    { key: 'entity_markdown_tag', type: 'string', size: 10, default: 'h5' },
                    { key: 'confidence_score', type: 'double', default: 0.8 },
                    { key: 'extracted_at', type: 'datetime', required: true }
                ]
            },
            {
                id: 'core_technologies',
                name: 'Technologies',
                attributes: [
                    { key: 'name', type: 'string', size: 255, required: true },
                    { key: 'type', type: 'string', size: 100 },
                    { key: 'purpose', type: 'string', size: 2000 },
                    { key: 'version', type: 'string', size: 100 },
                    { key: 'status', type: 'string', size: 50, default: 'planned' },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    // Location tracking attributes
                    { key: 'source_document_id', type: 'string', size: 255 },
                    { key: 'source_text_start', type: 'integer' },
                    { key: 'source_text_end', type: 'integer' },
                    { key: 'source_line_start', type: 'integer' },
                    { key: 'source_line_end', type: 'integer' },
                    { key: 'source_context', type: 'string', size: 1000 },
                    { key: 'source_snippet', type: 'string', size: 1000 },
                    { key: 'entity_markdown_tag', type: 'string', size: 10, default: 'h5' },
                    { key: 'confidence_score', type: 'double', default: 0.8 },
                    { key: 'extracted_at', type: 'datetime', required: true }
                ]
            },
            {
                id: 'core_quality_standards',
                name: 'Quality Standards',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'string', size: 2000 },
                    { key: 'category', type: 'string', size: 100 },
                    { key: 'compliance_level', type: 'string', size: 50, default: 'required' },
                    { key: 'verification_method', type: 'string', size: 1000 },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    // Location tracking attributes
                    { key: 'source_document_id', type: 'string', size: 255 },
                    { key: 'source_text_start', type: 'integer' },
                    { key: 'source_text_end', type: 'integer' },
                    { key: 'source_line_start', type: 'integer' },
                    { key: 'source_line_end', type: 'integer' },
                    { key: 'source_context', type: 'string', size: 1000 },
                    { key: 'source_snippet', type: 'string', size: 1000 },
                    { key: 'entity_markdown_tag', type: 'string', size: 10, default: 'h5' },
                    { key: 'confidence_score', type: 'double', default: 0.8 },
                    { key: 'extracted_at', type: 'datetime', required: true }
                ]
            },
            {
                id: 'core_best_practices',
                name: 'Best Practices',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'string', size: 2000 },
                    { key: 'category', type: 'string', size: 100 },
                    { key: 'applicability', type: 'string', size: 50, default: 'recommended' },
                    { key: 'implementation_notes', type: 'string', size: 2000 },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    // Location tracking attributes
                    { key: 'source_document_id', type: 'string', size: 255 },
                    { key: 'source_text_start', type: 'integer' },
                    { key: 'source_text_end', type: 'integer' },
                    { key: 'source_line_start', type: 'integer' },
                    { key: 'source_line_end', type: 'integer' },
                    { key: 'source_context', type: 'string', size: 1000 },
                    { key: 'source_snippet', type: 'string', size: 1000 },
                    { key: 'entity_markdown_tag', type: 'string', size: 10, default: 'h5' },
                    { key: 'confidence_score', type: 'double', default: 0.8 },
                    { key: 'extracted_at', type: 'datetime', required: true }
                ]
            }
        ];

        // Create all collections
        console.log(`📁 Creating ${coreEntities.length} core entity collections in ADPA database...\n`);
        
        for (const entity of coreEntities) {
            await createCollection(databaseId, entity.id, entity.name, entity.attributes);
        }

        console.log('\n🎉 Core Entities Collections setup complete!');
        console.log(`📊 Database: ADPA (${databaseId})`);
        console.log(`📁 Collections: ${coreEntities.length} core entity types`);
        console.log('\n🚀 Ready for parallel core entities extraction experiment!');

    } catch (error) {
        console.error('❌ Error setting up Core Entities Collections:', error.message);
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            console.log('\n💡 This might be due to:');
            console.log('   - Invalid API key');
            console.log('   - API key doesn\'t have collection creation permissions');
            console.log('   - Project ID is incorrect');
        }
    }
}

// Execute the function
setupCoreEntitiesCollections();
