#!/usr/bin/env node

/**
 * GKG Sync CLI Tool
 * 
 * Usage:
 * npm run gkg:bootstrap          # Bootstrap GKG with reference nodes
 * npm run gkg:sync-all           # Sync all projects to GKG
 * npm run gkg:sync-project <id>  # Sync specific project to GKG
 * npm run gkg:status             # Get GKG status
 */

import { gkgSync } from '../src/services/governanceKnowledgeGraphSync';
import { logger } from '../src/utils/logger';

const command = process.argv[2];
const projectId = process.argv[3];

async function main() {
  try {
    switch (command) {
      case 'bootstrap':
        console.log('🚀 Bootstrapping GKG...');
        const bootstrapSuccess = await gkgSync.bootstrapGKG();
        
        if (bootstrapSuccess) {
          console.log('✅ GKG bootstrap completed successfully!');
        } else {
          console.error('❌ GKG bootstrap failed!');
          process.exit(1);
        }
        break;

      case 'sync-all':
        console.log('🔄 Starting bulk sync of all projects to GKG...');
        const syncResult = await gkgSync.syncAllProjects();
        
        console.log(`\n📊 Sync Results:`);
        console.log(`✅ Projects synced: ${syncResult.projectsSynced}`);
        console.log(`📄 Documents synced: ${syncResult.documentsSynced}`);
        console.log(`🔍 Semantic units synced: ${syncResult.semanticUnitsSynced}`);
        console.log(`⏱️  Duration: ${syncResult.duration}ms`);
        
        if (syncResult.errors.length > 0) {
          console.log(`\n⚠️  Errors encountered:`);
          syncResult.errors.forEach(error => console.log(`   - ${error}`));
        }
        
        if (syncResult.success) {
          console.log('\n✅ Bulk sync completed successfully!');
        } else {
          console.log('\n❌ Bulk sync completed with errors!');
          process.exit(1);
        }
        break;

      case 'sync-project':
        if (!projectId) {
          console.error('❌ Project ID is required for sync-project command');
          console.log('Usage: npm run gkg:sync-project <project-id>');
          process.exit(1);
        }

        console.log(`🔄 Syncing project ${projectId} to GKG...`);
        
        // Get project from database (mock implementation)
        const project = await getProjectById(projectId);
        
        if (!project) {
          console.error(`❌ Project ${projectId} not found!`);
          process.exit(1);
        }

        const projectResult = await gkgSync.syncProjectToGKG(project);
        
        console.log(`\n📊 Sync Results for ${project.name}:`);
        console.log(`📄 Documents synced: ${projectResult.documentsSynced}`);
        console.log(`🔍 Semantic units synced: ${projectResult.semanticUnitsSynced}`);
        console.log(`⏱️  Duration: ${projectResult.duration}ms`);
        
        if (projectResult.errors.length > 0) {
          console.log(`\n⚠️  Errors encountered:`);
          projectResult.errors.forEach(error => console.log(`   - ${error}`));
        }
        
        if (projectResult.success) {
          console.log('\n✅ Project sync completed successfully!');
        } else {
          console.log('\n❌ Project sync completed with errors!');
          process.exit(1);
        }
        break;

      case 'status':
        console.log('📊 Getting GKG status...');
        
        const neo4jService = gkgSync['neo4jService'];
        const isConnected = await neo4jService.verifyConnection();
        
        if (!isConnected) {
          console.log('❌ Neo4j connection failed!');
          process.exit(1);
        }

        const [governanceInsights, maturityDistribution, entityTypeDistribution] = await Promise.all([
          neo4jService.getGovernanceInsights(),
          neo4jService.getMaturityDistribution(),
          neo4jService.getEntityTypeDistribution()
        ]);

        console.log('\n📊 GKG Status Report');
        console.log('==================');
        console.log('✅ Neo4j connected successfully');
        
        console.log('\n🏛️ Governance Domain Distribution:');
        governanceInsights.forEach((record: any) => {
          const data = record.toObject();
          console.log(`   ${data.domain}: ${data.projectCount} projects (avg maturity: ${data.avgMaturityLevel?.toFixed(1) || 'N/A'})`);
        });

        console.log('\n📈 Maturity Level Distribution:');
        maturityDistribution.forEach((record: any) => {
          const data = record.toObject();
          console.log(`   ${data.maturityLevel}: ${data.projectCount} projects`);
        });

        console.log('\n🏷️ Top Entity Types:');
        entityTypeDistribution.slice(0, 10).forEach((record: any) => {
          const data = record.toObject();
          console.log(`   ${data.entityType}: ${data.entityCount} instances`);
        });

        console.log('\n✅ GKG status retrieved successfully!');
        break;

      default:
        console.error('❌ Unknown command:', command);
        console.log('\nAvailable commands:');
        console.log('  bootstrap          - Bootstrap GKG with reference nodes');
        console.log('  sync-all           - Sync all projects to GKG');
        console.log('  sync-project <id>  - Sync specific project to GKG');
        console.log('  status             - Get GKG status and statistics');
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Helper function - implement based on your database service
async function getProjectById(projectId: string) {
  // For now, return mock project data
  const mockProjects = [
    {
      id: 'project-1',
      name: 'ADPA Playbook Development',
      description: 'Development of ADPA Program and Framework Playbooks',
      status: 'active',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-30'),
      maturityLevel: 3,
      type: 'ProjectManagement'
    },
    {
      id: 'project-2',
      name: 'RAG Pipeline Implementation',
      description: 'Implementation of advanced RAG pipeline with semantic processing',
      status: 'active',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-08-31'),
      maturityLevel: 2,
      type: 'Technology'
    }
  ];
  
  return mockProjects.find(p => p.id === projectId);
}

// Run the CLI
if (require.main === module) {
  main();
}
