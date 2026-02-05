#!/usr/bin/env node

/**
 * Create Core Entities Database in Appwrite
 * Parallel experiment to current Supabase implementation
 */

const https = require('https');
const querystring = require('querystring');

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
            name: name,
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

async function setupCoreEntitiesDatabase() {
    try {
        console.log('🚀 Setting up Core Entities Database in Appwrite...\n');

        // Create new database for core entities
        console.log('📋 Creating database: core_entities');
        const database = await makeRequest('/databases', 'POST', {
            databaseId: 'core_entities',
            name: 'Core Entities Experiment',
            enabled: true
        });
        console.log(`✅ Created database: ${database.name} (${database.$id})\n`);

        const databaseId = database.$id;

        // Define core entity collections with their schemas
        const coreEntities = [
            {
                id: 'stakeholders',
                name: 'Stakeholders',
                attributes: [
                    { key: 'name', type: 'string', size: 255, required: true },
                    { key: 'role', type: 'string', size: 255 },
                    { key: 'organization', type: 'string', size: 255 },
                    { key: 'influence', type: 'string', size: 50, default: 'medium' },
                    { key: 'interest', type: 'string', size: 50, default: 'medium' },
                    { key: 'contact_info', type: 'string', size: 500 },
                    { key: 'expectations', type: 'text' },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    { key: 'source_document', type: 'string', size: 500 },
                    { key: 'confidence_score', type: 'double', default: 0.8 }
                ]
            },
            {
                id: 'requirements',
                name: 'Requirements',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'text' },
                    { key: 'type', type: 'string', size: 100, default: 'functional' },
                    { key: 'priority', type: 'string', size: 50, default: 'medium' },
                    { key: 'status', type: 'string', size: 50, default: 'pending' },
                    { key: 'acceptance_criteria', type: 'text' },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    { key: 'source_document', type: 'string', size: 500 },
                    { key: 'confidence_score', type: 'double', default: 0.8 }
                ]
            },
            {
                id: 'risks',
                name: 'Risks',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'text' },
                    { key: 'category', type: 'string', size: 100 },
                    { key: 'probability', type: 'string', size: 50, default: 'medium' },
                    { key: 'impact', type: 'string', size: 50, default: 'medium' },
                    { key: 'mitigation_strategy', type: 'text' },
                    { key: 'status', type: 'string', size: 50, default: 'open' },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    { key: 'source_document', type: 'string', size: 500 },
                    { key: 'confidence_score', type: 'double', default: 0.8 }
                ]
            },
            {
                id: 'milestones',
                name: 'Milestones',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'text' },
                    { key: 'target_date', type: 'datetime' },
                    { key: 'status', type: 'string', size: 50, default: 'pending' },
                    { key: 'deliverables', type: 'text' },
                    { key: 'dependencies', type: 'text' },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    { key: 'source_document', type: 'string', size: 500 },
                    { key: 'confidence_score', type: 'double', default: 0.8 }
                ]
            },
            {
                id: 'deliverables',
                name: 'Deliverables',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'text' },
                    { key: 'type', type: 'string', size: 100 },
                    { key: 'status', type: 'string', size: 50, default: 'pending' },
                    { key: 'due_date', type: 'datetime' },
                    { key: 'acceptance_criteria', type: 'text' },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    { key: 'source_document', type: 'string', size: 500 },
                    { key: 'confidence_score', type: 'double', default: 0.8 }
                ]
            },
            {
                id: 'activities',
                name: 'Activities',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'text' },
                    { key: 'status', type: 'string', size: 50, default: 'pending' },
                    { key: 'start_date', type: 'datetime' },
                    { key: 'end_date', type: 'datetime' },
                    { key: 'assigned_to', type: 'string', size: 255 },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    { key: 'source_document', type: 'string', size: 500 },
                    { key: 'confidence_score', type: 'double', default: 0.8 }
                ]
            },
            {
                id: 'scope_items',
                name: 'Scope Items',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'text' },
                    { key: 'type', type: 'string', size: 100 },
                    { key: 'status', type: 'string', size: 50, default: 'in_scope' },
                    { key: 'priority', type: 'string', size: 50, default: 'medium' },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    { key: 'source_document', type: 'string', size: 500 },
                    { key: 'confidence_score', type: 'double', default: 0.8 }
                ]
            },
            {
                id: 'success_criteria',
                name: 'Success Criteria',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'text' },
                    { key: 'category', type: 'string', size: 100 },
                    { key: 'measurement_method', type: 'text' },
                    { key: 'target_value', type: 'string', size: 255 },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    { key: 'source_document', type: 'string', size: 500 },
                    { key: 'confidence_score', type: 'double', default: 0.8 }
                ]
            },
            {
                id: 'constraints',
                name: 'Constraints',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'text' },
                    { key: 'type', type: 'string', size: 100 },
                    { key: 'impact', type: 'string', size: 50, default: 'medium' },
                    { key: 'mitigation', type: 'text' },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    { key: 'source_document', type: 'string', size: 500 },
                    { key: 'confidence_score', type: 'double', default: 0.8 }
                ]
            },
            {
                id: 'resources',
                name: 'Resources',
                attributes: [
                    { key: 'name', type: 'string', size: 255, required: true },
                    { key: 'type', type: 'string', size: 100, default: 'human' },
                    { key: 'role', type: 'string', size: 255 },
                    { key: 'skills', type: 'text' },
                    { key: 'availability', type: 'string', size: 50 },
                    { key: 'cost_rate', type: 'double' },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    { key: 'source_document', type: 'string', size: 500 },
                    { key: 'confidence_score', type: 'double', default: 0.8 }
                ]
            },
            {
                id: 'technologies',
                name: 'Technologies',
                attributes: [
                    { key: 'name', type: 'string', size: 255, required: true },
                    { key: 'type', type: 'string', size: 100 },
                    { key: 'purpose', type: 'text' },
                    { key: 'version', type: 'string', size: 100 },
                    { key: 'status', type: 'string', size: 50, default: 'planned' },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    { key: 'source_document', type: 'string', size: 500 },
                    { key: 'confidence_score', type: 'double', default: 0.8 }
                ]
            },
            {
                id: 'quality_standards',
                name: 'Quality Standards',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'text' },
                    { key: 'category', type: 'string', size: 100 },
                    { key: 'compliance_level', type: 'string', size: 50, default: 'required' },
                    { key: 'verification_method', type: 'text' },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    { key: 'source_document', type: 'string', size: 500 },
                    { key: 'confidence_score', type: 'double', default: 0.8 }
                ]
            },
            {
                id: 'best_practices',
                name: 'Best Practices',
                attributes: [
                    { key: 'title', type: 'string', size: 500, required: true },
                    { key: 'description', type: 'text' },
                    { key: 'category', type: 'string', size: 100 },
                    { key: 'applicability', type: 'string', size: 50, default: 'recommended' },
                    { key: 'implementation_notes', type: 'text' },
                    { key: 'project_id', type: 'string', size: 255, required: true },
                    { key: 'source_document', type: 'string', size: 500 },
                    { key: 'confidence_score', type: 'double', default: 0.8 }
                ]
            }
        ];

        // Create all collections
        console.log(`📁 Creating ${coreEntities.length} core entity collections...\n`);
        
        for (const entity of coreEntities) {
            await createCollection(databaseId, entity.id, entity.name, entity.attributes);
        }

        console.log('\n🎉 Core Entities Database setup complete!');
        console.log(`📊 Database: ${database.name} (${databaseId})`);
        console.log(`📁 Collections: ${coreEntities.length} core entity types`);
        console.log('\n🚀 Ready for parallel core entities extraction experiment!');

    } catch (error) {
        console.error('❌ Error setting up Core Entities Database:', error.message);
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            console.log('\n💡 This might be due to:');
            console.log('   - Invalid API key');
            console.log('   - API key doesn\'t have database creation permissions');
            console.log('   - Project ID is incorrect');
        }
    }
}

// Execute the function
setupCoreEntitiesDatabase();
