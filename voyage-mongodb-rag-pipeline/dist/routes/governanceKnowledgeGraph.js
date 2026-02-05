"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const governanceKnowledgeGraphSync_1 = require("../services/governanceKnowledgeGraphSync");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
/**
 * Bootstrap GKG with reference nodes
 */
router.post('/bootstrap', async (req, res) => {
    try {
        logger_1.logger.info('Starting GKG bootstrap...');
        const success = await governanceKnowledgeGraphSync_1.gkgSync.bootstrapGKG();
        if (success) {
            res.json({
                success: true,
                message: 'GKG bootstrap completed successfully',
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'GKG bootstrap failed',
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        logger_1.logger.error('GKG bootstrap error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during bootstrap',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * Sync all projects to GKG
 */
router.post('/sync-all', async (req, res) => {
    try {
        logger_1.logger.info('Starting bulk project sync to GKG...');
        const result = await governanceKnowledgeGraphSync_1.gkgSync.syncAllProjects();
        res.json({
            ...result,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Bulk sync error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during bulk sync',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * Sync specific project to GKG
 */
router.post('/sync-project/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        logger_1.logger.info(`Syncing project ${projectId} to GKG...`);
        // Get project from database
        const project = await getProjectById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: `Project ${projectId} not found`,
                timestamp: new Date().toISOString()
            });
        }
        const result = await governanceKnowledgeGraphSync_1.gkgSync.syncProjectToGKG(project);
        res.json({
            ...result,
            projectId,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error(`Project sync error for ${req.params.projectId}:`, error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during project sync',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * Get GKG status and statistics
 */
router.get('/status', async (req, res) => {
    try {
        const neo4jService = governanceKnowledgeGraphSync_1.gkgSync['neo4jService'];
        // Check connection
        const isConnected = await neo4jService.verifyConnection();
        if (!isConnected) {
            return res.status(503).json({
                success: false,
                message: 'Neo4j connection failed',
                timestamp: new Date().toISOString()
            });
        }
        // Get statistics
        const [governanceInsights, maturityDistribution, entityTypeDistribution] = await Promise.all([
            neo4jService.getGovernanceInsights(),
            neo4jService.getMaturityDistribution(),
            neo4jService.getEntityTypeDistribution()
        ]);
        res.json({
            success: true,
            status: {
                connected: true,
                timestamp: new Date().toISOString()
            },
            statistics: {
                governanceInsights: governanceInsights.map(record => record.toObject()),
                maturityDistribution: maturityDistribution.map(record => record.toObject()),
                entityTypeDistribution: entityTypeDistribution.map(record => record.toObject())
            }
        });
    }
    catch (error) {
        logger_1.logger.error('GKG status error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error getting GKG status',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * Get project graph from GKG
 */
router.get('/project/:projectId/graph', async (req, res) => {
    try {
        const { projectId } = req.params;
        const neo4jService = governanceKnowledgeGraphSync_1.gkgSync['neo4jService'];
        const graphData = await neo4jService.getProjectGraph(projectId);
        res.json({
            success: true,
            projectId,
            graph: graphData.map(record => record.toObject()),
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error(`Project graph error for ${req.params.projectId}:`, error);
        res.status(500).json({
            success: false,
            message: 'Internal server error getting project graph',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * Get entity relationships from GKG
 */
router.get('/entity/:entityId/relationships', async (req, res) => {
    try {
        const { entityId } = req.params;
        const neo4jService = governanceKnowledgeGraphSync_1.gkgSync['neo4jService'];
        const relationships = await neo4jService.getEntityRelationships(entityId);
        res.json({
            success: true,
            entityId,
            relationships: relationships.map(record => record.toObject()),
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error(`Entity relationships error for ${req.params.entityId}:`, error);
        res.status(500).json({
            success: false,
            message: 'Internal server error getting entity relationships',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
// Helper function - implement based on your database service
async function getProjectById(projectId) {
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
exports.default = router;
//# sourceMappingURL=governanceKnowledgeGraph.js.map