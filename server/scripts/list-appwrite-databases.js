#!/usr/bin/env node

/**
 * List all databases in Appwrite project
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

async function listDatabases() {
    try {
        console.log('📋 Listing all databases in your Appwrite project...\n');
        console.log(`🔗 Project ID: ${APPWRITE_PROJECT_ID}`);
        console.log(`🌐 Endpoint: ${APPWRITE_ENDPOINT}\n`);

        const response = await makeRequest('/databases');
        
        if (response.databases && response.databases.length > 0) {
            console.log(`Found ${response.databases.length} database(s):\n`);
            
            response.databases.forEach((db, index) => {
                console.log(`${index + 1}. ${db.name}`);
                console.log(`   ID: ${db.$id}`);
                console.log(`   Created: ${new Date(db.$createdAt).toLocaleString()}`);
                console.log(`   Updated: ${new Date(db.$updatedAt).toLocaleString()}`);
                
                if (db.$databaseId) {
                    console.log(`   Database ID: ${db.$databaseId}`);
                }
                
                console.log('');
            });

            // Get collections for each database
            console.log('📚 Getting collections for each database...\n');
            
            for (const db of response.databases) {
                try {
                    const collectionsResponse = await makeRequest(`/databases/${db.$id}/collections`);
                    
                    console.log(`🗂️  Collections in "${db.name}":`);
                    
                    if (collectionsResponse.collections && collectionsResponse.collections.length > 0) {
                        collectionsResponse.collections.forEach((collection, index) => {
                            console.log(`   ${index + 1}. ${collection.name} (${collection.$id})`);
                            console.log(`      Documents: ${collection.$totalDocuments || 'Unknown'}`);
                        });
                    } else {
                        console.log('   No collections found');
                    }
                    console.log('');
                    
                } catch (err) {
                    console.log(`   ❌ Error getting collections: ${err.message}`);
                    console.log('');
                }
            }
            
        } else {
            console.log('No databases found in this project.');
        }
        
    } catch (error) {
        console.error('❌ Error listing databases:', error.message);
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            console.log('\n💡 This might be due to:');
            console.log('   - Invalid API key');
            console.log('   - API key doesn\'t have database permissions');
            console.log('   - Project ID is incorrect');
        }
    }
}

// Execute the function
listDatabases();
