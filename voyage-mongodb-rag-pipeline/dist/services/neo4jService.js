"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jService = void 0;
const neo4j = __importStar(require("neo4j-driver"));
const logger_1 = require("../utils/logger");
class Neo4jService {
    constructor(environment) {
        this.config = this.getConfig(environment);
        this.driver = neo4j.driver(this.config.uri, neo4j.auth.basic(this.config.username, this.config.password));
    }
    getConfig(environment) {
        const configs = {
            development: {
                uri: process.env.NEO4J_URI_DEV || 'neo4j://localhost:7687',
                username: process.env.NEO4J_USERNAME_DEV || 'neo4j',
                password: process.env.NEO4J_PASSWORD_DEV || 'password',
                database: process.env.NEO4J_DATABASE_DEV || 'neo4j'
            },
            staging: {
                uri: process.env.NEO4J_URI_STAGING || 'bolt://staging-neo4j:7687',
                username: process.env.NEO4J_USERNAME_STAGING || 'neo4j',
                password: process.env.NEO4J_PASSWORD_STAGING || 'staging-password',
                database: 'staging'
            },
            production: {
                uri: process.env.NEO4J_URI_PROD || 'bolt://prod-neo4j:7687',
                username: process.env.NEO4J_USERNAME_PROD || 'neo4j',
                password: process.env.NEO4J_PASSWORD_PROD || 'prod-password',
                database: 'production'
            }
        };
        return configs[environment];
    }
    async runQuery(query, parameters = {}) {
        const session = this.driver.session({
            database: this.config.database,
            defaultAccessMode: neo4j.session.WRITE
        });
        try {
            logger_1.logger.debug(`Executing Neo4j query: ${query.substring(0, 100)}...`);
            const result = await session.run(query, parameters);
            return result.records;
        }
        catch (error) {
            logger_1.logger.error('Neo4j query error:', error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    async runQueryWithTransaction(queries) {
        const session = this.driver.session({
            database: this.config.database,
            defaultAccessMode: neo4j.session.WRITE
        });
        try {
            const tx = session.beginTransaction();
            const results = [];
            try {
                for (const { query, parameters = {} } of queries) {
                    logger_1.logger.debug(`Executing transaction query: ${query.substring(0, 100)}...`);
                    const result = await tx.run(query, parameters);
                    results.push(result.records);
                }
                await tx.commit();
                return results;
            }
            catch (error) {
                await tx.rollback();
                throw error;
            }
        }
        catch (error) {
            logger_1.logger.error('Neo4j transaction error:', error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    async verifyConnection() {
        try {
            const result = await this.runQuery('RETURN 1 as test');
            return result.length > 0;
        }
        catch (error) {
            logger_1.logger.error('Neo4j connection failed:', error);
            return false;
        }
    }
    async close() {
        await this.driver.close();
    }
    // Graph traversal helpers
    async getProjectGraph(projectId) {
        const query = `
      MATCH (p:Project {id: $projectId})
      OPTIONAL MATCH (p)-[:CONTAINS]->(d:Document)
      OPTIONAL MATCH (p)-[:CONTAINS]->(su:SemanticUnit)
      OPTIONAL MATCH (p)-[:HAS_MATURITY]->(ml:MaturityLevel)
      OPTIONAL MATCH (p)-[:FALLS_UNDER]->(gd:GovernanceDomain)
      OPTIONAL MATCH (su)-[:CONTAINS_ENTITY]->(e:Entity)
      OPTIONAL MATCH (e)-[:IS_TYPE]->(et:EntityType)
      
      RETURN p, d, su, ml, gd, e, et
    `;
        return await this.runQuery(query, { projectId });
    }
    async getEntityRelationships(entityId) {
        const query = `
      MATCH (e:Entity {id: $entityId})
      MATCH (e)-[r]->(related)
      RETURN e, r, related, type(r) as relationshipType
    `;
        return await this.runQuery(query, { entityId });
    }
    async getGovernanceInsights() {
        const query = `
      MATCH (gd:GovernanceDomain)<-[:FALLS_UNDER]-(p:Project)
      OPTIONAL MATCH (p)-[:HAS_MATURITY]->(ml:MaturityLevel)
      RETURN gd.name as domain, 
             count(p) as projectCount,
             avg(ml.level) as avgMaturityLevel,
             collect(p.name) as projects
      ORDER BY projectCount DESC
    `;
        return await this.runQuery(query);
    }
    async getMaturityDistribution() {
        const query = `
      MATCH (p:Project)-[:HAS_MATURITY]->(ml:MaturityLevel)
      RETURN ml.name as maturityLevel, 
             ml.level as level,
             count(p) as projectCount
      ORDER BY level
    `;
        return await this.runQuery(query);
    }
    async getEntityTypeDistribution() {
        const query = `
      MATCH (e:Entity)-[:IS_TYPE]->(et:EntityType)
      RETURN et.name as entityType, 
             count(e) as entityCount
      ORDER BY entityCount DESC
      LIMIT 20
    `;
        return await this.runQuery(query);
    }
}
exports.Neo4jService = Neo4jService;
//# sourceMappingURL=neo4jService.js.map